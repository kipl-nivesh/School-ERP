import 'server-only';
import { isBoundProviderSubject, resolveInitialParent } from './parent-identity';
import type { ProviderSubject, TrustedParentLookupSnapshot } from './parent-identity';
import { resolveStudentIdentity } from '../student/identity-contracts';
import type { StudentBinding, StudentSessionEvidence } from '../student/identity-contracts';
import type { VerifiedParentDashboardRequest } from '../parent/dashboard-repository';

type PortalRole = 'student' | 'parent';
type AuthRead = {
  getClaims(): Promise<{ data: { claims: unknown } | null; error: unknown }>;
  getUser(): Promise<{ data: { user: { id: string } | null } | null; error: unknown }>;
};
type LiveSession = {
  profileId: string; sessionId: string; role: PortalRole; schoolId: string; expiresAt: number; revoked: boolean;
  /** Trusted lookup must check Staff membership across all schools for this Auth user. */
  staffMembership: boolean;
};
type SessionPolicy = {
  issuer: string;
  /** Request-bound adapter must bind all returned attributes to the provider session under RLS. */
  readLiveSession(profileId: string, sessionId: string): Promise<LiveSession | null>;
};
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
declare const verifiedSession: unique symbol;
export type VerifiedPortalSession = Omit<LiveSession, 'revoked' | 'staffMembership'> & { readonly [verifiedSession]: true };

function httpsIssuer(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.href === value;
  } catch { return false; }
}

/** Accepts the request-bound Supabase Auth SDK. A Keycloak token alone cannot satisfy this boundary. */
export async function verifyPortalSupabaseSession(
  auth: AuthRead, policy: SessionPolicy, role: PortalRole, now: () => number = Date.now,
): Promise<VerifiedPortalSession | null> {
  try {
    if ((role !== 'student' && role !== 'parent') || !httpsIssuer(policy.issuer)) return null;
    const result = await auth.getClaims();
    if (result.error || !result.data?.claims || typeof result.data.claims !== 'object') return null;
    const claims = result.data.claims as Record<string, unknown>;
    const { sub, session_id: sessionId, exp } = claims;
    if (claims.iss !== policy.issuer || claims.role !== 'authenticated' ||
        !(claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.includes('authenticated')) ||
        typeof sub !== 'string' || !uuid.test(sub) || typeof sessionId !== 'string' || !uuid.test(sessionId) ||
        typeof exp !== 'number' || !Number.isSafeInteger(exp * 1000) || !Number.isSafeInteger(exp) || exp * 1000 <= now()) return null;
    const amr = Array.isArray(claims.amr) ? claims.amr : [];
    if (amr.some(entry => {
      const method = typeof entry === 'string' ? entry : (entry as { method?: string })?.method;
      return method === 'recovery' || method === 'password_recovery' || method === 'otp_recovery';
    }) || claims.recovery === true || claims.type === 'recovery') return null;
    const claimRole = (claims.app_metadata as Record<string, unknown> | undefined)?.role ||
      (claims.user_metadata as Record<string, unknown> | undefined)?.role;
    if (typeof claimRole === 'string' && claimRole !== role && claimRole !== 'authenticated') return null;
    const account = await auth.getUser();
    if (account.error || account.data?.user?.id !== sub) return null;
    const live = await policy.readLiveSession(sub, sessionId);
    if (!live || live.profileId !== sub || live.sessionId !== sessionId || live.role !== role || live.revoked !== false || live.staffMembership !== false ||
        !uuid.test(live.schoolId) || !Number.isSafeInteger(live.expiresAt) || live.expiresAt <= now() || exp * 1000 <= now()) return null;
    return { profileId: sub, sessionId, schoolId: live.schoolId, role, expiresAt: Math.min(exp * 1000, live.expiresAt) } as VerifiedPortalSession;
  } catch { return null; }
}

type StudentProviderBinding = {
  provider: ProviderSubject;
  /** Provider-verified PIN flow evidence, never a browser AMR value. */
  method: 'student-pin';
  sessionId: string;
  scope: StudentSessionEvidence;
  candidates: readonly StudentBinding[];
  currentCredentialVersion: number;
};

export function bindStudentPortalSession(session: VerifiedPortalSession, evidence: StudentProviderBinding | null,
  expectedKeycloakIssuer: string, now = Date.now()) {
  if (session.role !== 'student' || !evidence || evidence.method !== 'student-pin' || evidence.sessionId !== session.sessionId ||
      !httpsIssuer(expectedKeycloakIssuer) || !isBoundProviderSubject(evidence.provider) || evidence.provider.issuer !== expectedKeycloakIssuer ||
      evidence.scope.profileId !== session.profileId || evidence.scope.schoolId !== session.schoolId || session.expiresAt <= now) return null;
  const scoped = { ...evidence.scope, expiresAt: Math.min(session.expiresAt, evidence.scope.expiresAt) };
  const identity = resolveStudentIdentity(scoped, evidence.candidates, evidence.currentCredentialVersion, now);
  return identity ? { session: scoped, identity } : null;
}

/** The initial Student locator selects exactly one eligible Parent, with no session issuance. */
export function matchParentLoginBinding(session: VerifiedPortalSession, lookup: { schoolId: string; snapshot: TrustedParentLookupSnapshot } | null,
  registration: string, provider: ProviderSubject, now = Date.now()): boolean {
  if (session.role !== 'parent' || session.expiresAt <= now || lookup?.schoolId !== session.schoolId ||
      !isBoundProviderSubject(provider)) return false;
  const binding = resolveInitialParent(lookup.snapshot, registration, now);
  return binding.kind === 'resolved_contract' && binding.profileId === session.profileId &&
    binding.provider.issuer === provider.issuer && binding.provider.subject === provider.subject;
}

/** The snapshot loader must derive the canonical provider identity and relationship rows under the user's RLS session. */
export function bindParentPortalSession(session: VerifiedPortalSession, request: VerifiedParentDashboardRequest | null,
  provider: ProviderSubject, now = Date.now()): VerifiedParentDashboardRequest | null {
  if (session.role !== 'parent' || !request || request.role !== 'parent' || !isBoundProviderSubject(provider) ||
      request.provider.issuer !== provider.issuer || request.provider.subject !== provider.subject ||
      request.live !== true || request.profileActive !== true || request.activeSchoolContext !== true ||
      request.staffMembership !== false ||
      request.schoolId !== session.schoolId || request.profileId !== session.profileId || request.sessionId !== session.sessionId ||
      request.guardian.profileId !== session.profileId || !request.guardian.id || !Number.isSafeInteger(request.expiresAt) ||
      Math.min(session.expiresAt, request.expiresAt) <= now) return null;
  return { ...request, expiresAt: Math.min(session.expiresAt, request.expiresAt) };
}

export type PortalSqlCompatibilityReport = {
  readonly compatible: false;
  readonly role: 'student' | 'parent';
  readonly blockers: readonly string[];
};

/**
 * Documents and verifies the architectural incompatibilities between Staff-only
 * school-context SQL helpers (migrations 3, 10, 18, 20) and Student/Parent authentication.
 */
export function checkPortalSqlHelperCompatibility(role: 'student' | 'parent'): PortalSqlCompatibilityReport {
  return {
    compatible: false,
    role,
    blockers: [
      'current_school_id() requires public.staff_session_is_live() which mandates password AMR method and staff issuer.',
      'staff_session_is_live() verifies auth.users.email_confirmed_at, which does not exist for Student ID + PIN sessions.',
      'current_active_role() and current_role_has_permission() fail closed (return NULL or false) when current_school_id() is NULL.',
      'parent_student_purpose() (migration 20) evaluates to false because current_school_id() returns NULL for non-staff sessions.',
      'get_student_subscription_access() raises SQL exception 42501 (Access denied) when current_school_id() is NULL.',
      'pin_credentials table (migration 6) lacks credential_version column required for versioned session revocation and rotation.',
    ],
  };
}
