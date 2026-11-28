import 'server-only';
import { cache } from 'react';
import { createServerSupabaseClient } from '../supabase/server';
import { getSupabasePublicConfiguration } from '../supabase/config';
import { evaluateDashboardAccess } from '../auth/authorization';
import { isStaffRole, isStaffUuid, resolveStaffAuthorization } from './contracts';
import type { StaffRole, StaffResolution, StaffSchoolSnapshot, VerifiedStaffProvider } from './contracts';
import { accountantExportAuthentication } from './accountant-export-mfa';

import { staffRequestsEnabled } from './request-policy';
export { staffRequestsEnabled };
export async function staffClient(writable = false) {
  if (!staffRequestsEnabled()) throw new Error('Staff provider requests are disabled during local review.');
  return createServerSupabaseClient({ cookieWrites: writable ? 'allowed' : 'read-only', httpOnlyCookies: true });
}
type StaffClient = Awaited<ReturnType<typeof staffClient>>;

type ProviderEvidence = VerifiedStaffProvider & { readonly verifiedTotp: boolean; readonly freshPasswordTotpAt: number | null };

async function readValidClaims(client: StaffClient) {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) return null;
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims) return null;
  const claims = data.claims;
  const now = Date.now();
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const methods = amr.filter(entry => entry !== null && typeof entry === 'object');
  const passwordEntry = methods.find(entry => (entry as { method?: string })?.method === 'password');
  const hasPasswordMethod = amr.some(entry => entry === 'password' || (typeof entry === 'object' && entry !== null && (entry as { method?: string })?.method === 'password'));
  const passwordTimestamp = typeof (passwordEntry as { timestamp?: unknown })?.timestamp === 'number' && Number.isSafeInteger((passwordEntry as { timestamp: number }).timestamp)
    ? (passwordEntry as { timestamp: number }).timestamp
    : (typeof claims.iat === 'number' && Number.isSafeInteger(claims.iat) ? claims.iat : Math.floor(now / 1000));
  const CLOCK_TOLERANCE_MS = 60_000;
  if (!isStaffUuid(claims.sub) || amr.some(entry => {
    const method = typeof entry === 'string' ? entry : (entry as { method?: string })?.method;
    return method === 'recovery' || method === 'password_recovery';
  }) ||
    claims.iss !== config.url.replace(/\/$/, '') + '/auth/v1' || claims.role !== 'authenticated' ||
    !(claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.includes('authenticated')) ||
    !isStaffUuid(claims.session_id) ||
    typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now ||
    !hasPasswordMethod || passwordTimestamp < 0 || passwordTimestamp * 1000 > now + CLOCK_TOLERANCE_MS ||
    (claims.aal !== 'aal1' && claims.aal !== 'aal2')) return null;
  return { claims, now, amr, passwordTimestamp, CLOCK_TOLERANCE_MS };
}

function buildProviderEvidence(
  parsed: NonNullable<Awaited<ReturnType<typeof readValidClaims>>>,
  user: Awaited<ReturnType<StaffClient['auth']['getUser']>>,
  live: Awaited<ReturnType<StaffClient['rpc']>>,
): ProviderEvidence | null {
  const { claims, now, amr, passwordTimestamp, CLOCK_TOLERANCE_MS } = parsed;
  if (user.error || !user.data.user?.email_confirmed_at || user.data.user.id !== claims.sub) return null;
  if (live.error || live.data !== true || claims.exp * 1000 <= Date.now()) return null;
  const hasTotpAmr = amr.some(entry => {
    if (typeof entry === 'string') return entry === 'totp' || entry === 'mfa';
    if (typeof entry === 'object' && entry !== null) {
      const e = entry as { method?: string; timestamp?: unknown };
      const isTotp = e.method === 'totp' || e.method === 'mfa';
      const validTs = typeof e.timestamp === 'number' && Number.isSafeInteger(e.timestamp) && e.timestamp >= 0 && e.timestamp * 1000 <= now + CLOCK_TOLERANCE_MS;
      return isTotp && (e.timestamp === undefined || validTs);
    }
    return false;
  });
  const verifiedTotp = user.data.user.factors?.some(factor => factor.factor_type === 'totp' && factor.status === 'verified') === true &&
    claims.aal === 'aal2' && hasTotpAmr;
  const authTimeMs = Math.min(passwordTimestamp * 1000, now);
  const accountantEvidence = accountantExportAuthentication(amr, now);
  // SDK verification, Auth identity and live server-side session are required before this evidence exists.
  return { profileId: user.data.user.id, sessionId: claims.session_id, expiresAt: claims.exp * 1000,
    authenticatedAt: authTimeMs, verifiedAt: now, assurance: claims.aal, reauthenticatedAt: null, verifiedTotp,
    freshPasswordTotpAt: verifiedTotp && accountantEvidence.freshMfa ? accountantEvidence.passwordAt : null } as ProviderEvidence;
}

async function verifiedProvider(client: StaffClient): Promise<ProviderEvidence | null> {
  const parsed = await readValidClaims(client);
  if (!parsed) return null;
  const [user, live] = await Promise.all([
    client.auth.getUser(),
    client.rpc('staff_session_is_live'),
  ]);
  return buildProviderEvidence(parsed, user, live);
}

export type StaffSchoolChoice = { schoolId: string; schoolName: string; role: StaffRole };
export async function readStaffSchoolChoices(client: StaffClient): Promise<StaffSchoolChoice[]> {
  const { data, error } = await client.rpc('list_school_memberships');
  if (error || !Array.isArray(data)) return [];
  const choices = new Map<string, StaffSchoolChoice>();
  for (const row of data) {
    if (!isStaffUuid(row?.school_id) || typeof row.school_name !== 'string' || !isStaffRole(row.role_code)) continue;
    const schoolId = row.school_id.toLowerCase();
    choices.set(schoolId + ':' + row.role_code, { schoolId, schoolName: row.school_name, role: row.role_code });
  }
  return [...choices.values()];
}

export async function listStaffSchoolChoices(client: StaffClient): Promise<StaffSchoolChoice[]> {
  try {
    const provider = await verifiedProvider(client);
    return provider ? (await readStaffSchoolChoices(client)).filter(choice => choice.role !== 'admin' || provider.verifiedTotp) : [];
  } catch { return []; }
}

export async function loadStaffResolution(client: StaffClient, requestedRole?: StaffRole, studentAdministration = false): Promise<StaffResolution> {
  try {
    const parsed = await readValidClaims(client);
    if (!parsed) return { kind: 'denied' };
    const profileId = parsed.claims.sub;
    const sessionId = parsed.claims.session_id;
    const [user, live, tenant, activeRole, p, context] = await Promise.all([
      client.auth.getUser(),
      client.rpc('staff_session_is_live'),
      client.rpc('current_school_id'),
      client.rpc('current_active_role'),
      client.from('profiles').select('id,account_status,credential_reset_required,authorization_version').eq('id', profileId).maybeSingle(),
      client.from('role_contexts').select('id,profile_id,role_code,assignment_id,context_version,authorization_version,expires_at,revoked_at,school_id').eq('id', sessionId).eq('profile_id', profileId).maybeSingle(),
    ]);
    const provider = buildProviderEvidence(parsed, user, live);
    if (!provider || tenant.error) return { kind: 'denied' };
    if (tenant.data === null) {
      if (!requestedRole || !(await readStaffSchoolChoices(client)).some(choice => choice.role === requestedRole)) return { kind: 'denied' };
      return requestedRole === 'admin' && !provider.verifiedTotp ? { kind: 'mfa_required' } : { kind: 'context_required' };
    }
    if (!isStaffUuid(tenant.data)) return { kind: 'denied' };
    const [school, memberships] = await Promise.all([
      client.from('schools').select('id,status,name').eq('id', tenant.data).maybeSingle(),
      client.from('user_roles').select('id,profile_id,role_code,membership_status,valid_from,valid_until,permissions,school_id').eq('profile_id', provider.profileId).eq('school_id', tenant.data),
    ]);
    if (school.error || school.data?.status !== 'active' || school.data.id !== tenant.data) return { kind: 'denied' };
    if (p.error || memberships.error || context.error || !p.data || !memberships.data || memberships.data.some(row => row.school_id !== tenant.data) ||
      (context.data && context.data.school_id !== tenant.data)) return { kind: 'denied' };
    const role = requestedRole ?? context.data?.role_code;
    if (!isStaffRole(role)) return { kind: 'denied' };
    // These are protected self-scope DB rows, not form input or user_metadata.
    // Super Admin permanently removed; privilege is null in School Admin architecture.
    const snapshot: StaffSchoolSnapshot = { profile: p.data, memberships: memberships.data, privilege: null, context: context.data };
    const useFreshEvidence = role === 'accountant' || (role === 'admin' && studentAdministration);
    const resolution = resolveStaffAuthorization(useFreshEvidence
      ? { ...provider, reauthenticatedAt: provider.freshPasswordTotpAt } : provider, snapshot, role, Date.now());
    if (role === 'admin' && !provider.verifiedTotp &&
      (resolution.kind === 'authorized' || resolution.kind === 'context_required')) return { kind: 'mfa_required' };
    if (resolution.kind !== 'authorized') return resolution;
    if (activeRole.error || activeRole.data !== role ||
      Math.min(resolution.context.session.expiresAt, resolution.context.activeRole.expiresAt) <= Date.now()) return { kind: 'denied' };
    return { ...resolution, schoolName: school.data.name, context: { ...resolution.context, schoolId: tenant.data } };
  } catch { return { kind: 'denied' }; }
}

const getCachedStaffAccess = cache(async (target?: StaffRole): Promise<Extract<StaffResolution, { kind: 'authorized' }> | null> => {
  if (!staffRequestsEnabled()) return null;
  try {
    const result = await loadStaffResolution(await staffClient());
    if (result.kind !== 'authorized' || target && !evaluateDashboardAccess(result.context, target, Date.now()).allowed) return null;
    return result;
  } catch { return null; }
});

export async function getStaffAccess(target?: StaffRole): Promise<Extract<StaffResolution, { kind: 'authorized' }> | null> {
  return getCachedStaffAccess(target);
}

/** Only Student administration opts into fresh native Admin credentials here. */
export async function getStudentAdminAccess(): Promise<Extract<StaffResolution, { kind: 'authorized' }> | null> {
  try {
    const result = await loadStaffResolution(await staffClient(), 'admin', true);
    return result.kind === 'authorized' && evaluateDashboardAccess(result.context, 'admin', Date.now()).allowed ? result : null;
  } catch {
    return null;
  }
}

// Share an authorization snapshot only within one Accountant server render.
// Server Actions continue to load fresh evidence through getStaffAccess.
export const getAccountantRenderAccess = cache(() => getStaffAccess('accountant'));
