import 'server-only';
import { createServerSupabaseClient } from '../supabase/server';
import { getSupabasePublicConfiguration } from '../supabase/config';
import { evaluateDashboardAccess } from '../auth/authorization';
import { isStaffRole, isStaffUuid, resolveStaffAuthorization } from './contracts';
import type { StaffRole, StaffResolution, StaffSchoolSnapshot, VerifiedStaffProvider } from './contracts';

import { staffRequestsEnabled } from './request-policy';
export { staffRequestsEnabled };
export async function staffClient(writable = false) {
  if (!staffRequestsEnabled()) throw new Error('Staff provider requests are disabled during local review.');
  return createServerSupabaseClient({ cookieWrites: writable ? 'allowed' : 'read-only', httpOnlyCookies: true });
}
type StaffClient = Awaited<ReturnType<typeof staffClient>>;

async function verifiedProvider(client: StaffClient): Promise<(VerifiedStaffProvider & { readonly verifiedTotp: boolean }) | null> {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) return null;
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims) return null;
  const claims = data.claims;
  const now = Date.now();
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const methods = amr.filter(entry => entry !== null && typeof entry === 'object');
  const password = methods.find(entry => entry.method === 'password');
  if (!isStaffUuid(claims.sub) || amr.some(entry => {
    const method = typeof entry === 'string' ? entry : entry?.method;
    return method === 'recovery' || method === 'password_recovery';
  }) ||
    claims.iss !== config.url.replace(/\/$/, '') + '/auth/v1' || claims.role !== 'authenticated' ||
    !(claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.includes('authenticated')) ||
    !isStaffUuid(claims.session_id) ||
    typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now ||
    typeof password?.timestamp !== 'number' || !Number.isSafeInteger(password.timestamp) || password.timestamp < 0 || password.timestamp * 1000 > now ||
    (claims.aal !== 'aal1' && claims.aal !== 'aal2')) return null;
  const user = await client.auth.getUser();
  if (user.error || !user.data.user?.email_confirmed_at || user.data.user.id !== claims.sub) return null;
  const live = await client.rpc('staff_session_is_live');
  if (live.error || live.data !== true || claims.exp * 1000 <= Date.now()) return null;
  const verifiedTotp = user.data.user.factors?.some(factor => factor.factor_type === 'totp' && factor.status === 'verified') === true &&
    claims.aal === 'aal2' && methods.some(entry => entry.method === 'totp' &&
    Number.isSafeInteger(entry.timestamp) && entry.timestamp >= 0 && entry.timestamp * 1000 <= now);
  // SDK verification, Auth identity and live server-side session are required before this evidence exists.
  return { profileId: user.data.user.id, sessionId: claims.session_id, expiresAt: claims.exp * 1000,
    authenticatedAt: password.timestamp * 1000, verifiedAt: now, assurance: claims.aal, reauthenticatedAt: null, verifiedTotp } as VerifiedStaffProvider & { verifiedTotp: boolean };
}

type StaffSchoolChoice = { schoolId: string; schoolName: string; role: StaffRole };
async function readStaffSchoolChoices(client: StaffClient): Promise<StaffSchoolChoice[]> {
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

export async function loadStaffResolution(client: StaffClient, requestedRole?: StaffRole): Promise<StaffResolution> {
  try {
    const provider = await verifiedProvider(client);
    if (!provider) return { kind: 'denied' };
    const tenant = await client.rpc('current_school_id');
    if (tenant.error) return { kind: 'denied' };
    if (tenant.data === null) {
      if (!requestedRole || !(await readStaffSchoolChoices(client)).some(choice => choice.role === requestedRole)) return { kind: 'denied' };
      return requestedRole === 'admin' && !provider.verifiedTotp ? { kind: 'mfa_required' } : { kind: 'context_required' };
    }
    if (!isStaffUuid(tenant.data)) return { kind: 'denied' };
    const school = await client.from('schools').select('id,status,name').eq('id', tenant.data).maybeSingle();
    if (school.error || school.data?.status !== 'active' || school.data.id !== tenant.data) return { kind: 'denied' };
    const [p, memberships, context] = await Promise.all([
      client.from('profiles').select('id,account_status,credential_reset_required,authorization_version').eq('id', provider.profileId).maybeSingle(),
      client.from('user_roles').select('id,profile_id,role_code,membership_status,valid_from,valid_until,permissions,school_id').eq('profile_id', provider.profileId).eq('school_id', tenant.data),
      client.from('role_contexts').select('id,profile_id,role_code,assignment_id,context_version,authorization_version,expires_at,revoked_at,school_id').eq('id', provider.sessionId).eq('profile_id', provider.profileId).eq('school_id', tenant.data).maybeSingle(),
    ]);
    if (p.error || memberships.error || context.error || !p.data || !memberships.data || memberships.data.some(row => row.school_id !== tenant.data) ||
      (context.data && context.data.school_id !== tenant.data)) return { kind: 'denied' };
    const role = requestedRole ?? context.data?.role_code;
    if (!isStaffRole(role)) return { kind: 'denied' };
    // These are protected self-scope DB rows, not form input or user_metadata.
    // Super Admin permanently removed; privilege is null in School Admin architecture.
    const snapshot: StaffSchoolSnapshot = { profile: p.data, memberships: memberships.data, privilege: null, context: context.data };
    const resolution = resolveStaffAuthorization(provider, snapshot, role, Date.now());
    if (role === 'admin' && !provider.verifiedTotp &&
      (resolution.kind === 'authorized' || resolution.kind === 'context_required')) return { kind: 'mfa_required' };
    if (resolution.kind !== 'authorized') return resolution;
    const activeRole = await client.rpc('current_active_role');
    if (activeRole.error || activeRole.data !== role ||
      Math.min(resolution.context.session.expiresAt, resolution.context.activeRole.expiresAt) <= Date.now()) return { kind: 'denied' };
    return { ...resolution, schoolName: school.data.name, context: { ...resolution.context, schoolId: tenant.data } };
  } catch { return { kind: 'denied' }; }
}

export async function getStaffAccess(target?: StaffRole): Promise<Extract<StaffResolution, { kind: 'authorized' }> | null> {
  if (!staffRequestsEnabled()) return null;
  try {
    const result = await loadStaffResolution(await staffClient());
    if (result.kind !== 'authorized' || target && !evaluateDashboardAccess(result.context, target, Date.now()).allowed) return null;
    return result;
  } catch { return null; }
}
