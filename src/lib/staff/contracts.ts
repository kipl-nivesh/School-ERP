import { evaluateDashboardAccess } from '../auth/authorization';
import { isPermissionId } from '../auth/permissions';
import type { RoleAssignment, VerifiedServerContext } from '../auth/types';
export const STAFF_ROLES = ['admin', 'teacher', 'accountant'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const GENERIC_STAFF_ERROR = 'Unable to complete staff sign-in. Check your details or contact the school administrator.';
export const STAFF_PENDING_MESSAGE = 'Staff sign-in is not available in this local review. No authentication request was sent.';
export const isStaffRole = (v: unknown): v is StaffRole => STAFF_ROLES.some(r => r === v);
export function validateStaffInput(email: unknown, password: unknown, role: unknown): boolean {
  return typeof email === 'string' && email.length <= 254 && email === email.trim() && !/[\x00-\x20\x7f]/.test(email) &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && typeof password === 'string' && password.length > 0 && password.length <= 1024 &&
    !/[\x00\r\n]/.test(password) && isStaffRole(role);
}
export function safeStaffDestination(value: unknown, role: StaffRole): string {
  return value === '/staff' || value === `/staff/${role}` ? value : '/staff';
}
export type StaffActionState = { readonly phase: 'idle' | 'error' | 'mfa'; readonly message: string; readonly factorId?: string; readonly qrDataUri?: string };
export const INITIAL_STAFF_STATE: StaffActionState = { phase: 'idle', message: '' };

declare const providerVerified: unique symbol;
export interface VerifiedStaffProvider {
  readonly [providerVerified]: true;
  readonly profileId: string; readonly sessionId: string; readonly expiresAt: number;
  readonly authenticatedAt: number; readonly verifiedAt: number; readonly assurance: 'aal1' | 'aal2';
}
export interface StaffSchoolSnapshot {
  readonly profile: { readonly id: string; readonly account_status: string; readonly credential_reset_required: boolean; readonly authorization_version: number } | null;
  readonly memberships: readonly { readonly id: string; readonly profile_id: string; readonly role_code: string; readonly membership_status: string; readonly valid_from: string; readonly valid_until: string | null; readonly permissions: readonly string[] }[];
  readonly privilege: { readonly profile_id: string; readonly tier: string; readonly privilege_status: string } | null;
  readonly context: { readonly id: string; readonly profile_id: string; readonly role_code: string; readonly assignment_id: string; readonly context_version: number; readonly authorization_version: number; readonly expires_at: string; readonly revoked_at: string | null } | null;
}
export type StaffResolution = { readonly kind: 'denied' } | { readonly kind: 'mfa_required' } |
  { readonly kind: 'context_required' } | { readonly kind: 'authorized'; readonly context: VerifiedServerContext; readonly role: StaffRole };

/** Pure mapping over assumed trusted SDK + DB evidence, never request JSON. Server adapter owns provenance. */
export function resolveStaffAuthorization(provider: VerifiedStaffProvider | null, school: StaffSchoolSnapshot | null, role: StaffRole, now: number): StaffResolution {
  const deny: StaffResolution = { kind: 'denied' };
  const p = school?.profile;
  if (!provider || !p || !isStaffRole(role) || !Number.isSafeInteger(now) || now < 0 || !provider.sessionId ||
    provider.profileId !== p.id || provider.expiresAt <= now || provider.authenticatedAt > now || provider.verifiedAt > now ||
    provider.verifiedAt < provider.authenticatedAt || !Number.isSafeInteger(provider.expiresAt) ||
    !Number.isSafeInteger(provider.authenticatedAt) || !Number.isSafeInteger(provider.verifiedAt) ||
    p.account_status !== 'active' || p.credential_reset_required !== false || !Number.isSafeInteger(p.authorization_version) || p.authorization_version < 1 ||
    !Array.isArray(school?.memberships)) return deny;
  const assignments: RoleAssignment[] = [];
  for (const m of school.memberships) {
    if (!m || !m.id || m.profile_id !== p.id || !Array.isArray(m.permissions) || m.permissions.some((v: unknown) => !isPermissionId(v)) ||
      !['admin','teacher','student','parent','accountant'].includes(m.role_code) || !['active','revoked'].includes(m.membership_status)) return deny;
    assignments.push({ id: m.id, profileId: m.profile_id, role: m.role_code as RoleAssignment['role'], status: m.membership_status as RoleAssignment['status'],
      validFrom: Date.parse(m.valid_from), validUntil: m.valid_until === null ? null : Date.parse(m.valid_until), permissions: m.permissions.filter(isPermissionId) });
  }
  if (new Set(assignments.map(m => m.id)).size !== assignments.length) return deny;
  const live = (m: RoleAssignment) => m.status === 'active' && Number.isFinite(m.validFrom) && m.validFrom <= now &&
    (m.validUntil === null || Number.isFinite(m.validUntil) && m.validUntil > now);
  const membership = assignments.find(m => m.role === role && live(m));
  if (!membership) return deny;
  const tier = school.privilege;
  if (tier && (tier.profile_id !== p.id || tier.tier !== 'super_admin' || !['pending','active','revoked'].includes(tier.privilege_status))) return deny;
  if (tier?.privilege_status === 'pending') return deny;
  const privileged = tier?.privilege_status === 'active';
  if (privileged && !assignments.some(m => m.role === 'admin' && live(m))) return deny;
  if (privileged && provider.assurance !== 'aal2') return { kind: 'mfa_required' };
  if (provider.assurance !== 'aal1' && provider.assurance !== 'aal2') return deny;
  const c = school.context;
  if (!c) return { kind: 'context_required' };
  if (c.id !== provider.sessionId || c.profile_id !== p.id || c.role_code !== role || c.assignment_id !== membership.id || c.revoked_at !== null ||
    c.authorization_version !== p.authorization_version || !Number.isSafeInteger(c.context_version) || c.context_version < 1 ||
    !Number.isFinite(Date.parse(c.expires_at)) || Date.parse(c.expires_at) <= now) return deny;
  // The nominal cast is restricted to already verified adapter evidence; not a JSON parser.
  const context = { source: 'verified-server-session', profileId: p.id, accountStatus: 'active', credentialResetRequired: false,
    authorizationVersion: p.authorization_version, currentAuthorizationVersion: p.authorization_version,
    session: { id: provider.sessionId, profileId: p.id, authenticatedAt: provider.authenticatedAt, verifiedAt: provider.verifiedAt,
      expiresAt: provider.expiresAt, revoked: false, assurance: provider.assurance, reauthenticatedAt: null },
    activeRole: { sessionId: provider.sessionId, profileId: p.id, role, assignmentId: membership.id, version: c.context_version,
      currentVersion: c.context_version, expiresAt: Math.min(provider.expiresAt, Date.parse(c.expires_at)), revoked: false },
    assignments, superAdminPrivilege: privileged ? { tier: 'super_admin', profileId: p.id, status: 'active', validFrom: 0, validUntil: null } : null,
  } as unknown as VerifiedServerContext;
  return evaluateDashboardAccess(context, role, now).allowed ? { kind: 'authorized', context, role } : deny;
}

export interface StaffFlowDependencies {
  readonly enabled: boolean; readonly configured: boolean;
  signIn(email: string, password: string): Promise<boolean>;
  resolve(role: StaffRole): Promise<StaffResolution>;
  activate(role: StaffRole): Promise<boolean>;
  factor(): Promise<string | null>;
}
export async function performStaffLogin(input: { email: unknown; password: unknown; role: unknown; next: unknown }, deps: StaffFlowDependencies): Promise<StaffActionState | { readonly phase: 'authorized'; readonly destination: string }> {
  if (!validateStaffInput(input.email, input.password, input.role)) return { phase: 'error', message: GENERIC_STAFF_ERROR };
  if (!deps.enabled || !deps.configured) return { phase: 'error', message: STAFF_PENDING_MESSAGE };
  try {
    if (!await deps.signIn(input.email as string, input.password as string)) return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const role = input.role as StaffRole;
    let result = await deps.resolve(role);
    if (result.kind === 'mfa_required') return { phase: 'mfa', message: 'Verify your school-authorized authenticator to continue.', factorId: await deps.factor() ?? undefined };
    if (result.kind === 'context_required' && await deps.activate(role)) result = await deps.resolve(role);
    return result.kind === 'authorized' ? { phase: 'authorized', destination: safeStaffDestination(input.next, role) } : { phase: 'error', message: GENERIC_STAFF_ERROR };
  } catch { return { phase: 'error', message: GENERIC_STAFF_ERROR }; }
}
