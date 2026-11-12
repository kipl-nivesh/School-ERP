import 'server-only';
import { createServerSupabaseClient } from '../supabase/server';
import { getSupabasePublicConfiguration } from '../supabase/config';
import { evaluateDashboardAccess } from '../auth/authorization';
import { isStaffRole, resolveStaffAuthorization } from './contracts';
import type { StaffRole, StaffResolution, StaffSchoolSnapshot, VerifiedStaffProvider } from './contracts';

export function staffRequestsEnabled(): boolean {
  return process.env.STAFF_AUTH_REQUESTS_ENABLED === 'true' &&
    process.env.NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK !== 'true' && process.env.VERCEL_ENV !== 'preview';
}
export async function staffClient(writable = false) {
  if (!staffRequestsEnabled()) throw new Error('Staff provider requests are disabled during local review.');
  return createServerSupabaseClient({ cookieWrites: writable ? 'allowed' : 'read-only', httpOnlyCookies: true });
}
type StaffClient = Awaited<ReturnType<typeof staffClient>>;

async function verifiedProvider(client: StaffClient): Promise<VerifiedStaffProvider | null> {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) return null;
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims) return null;
  const claims = data.claims;
  const user = await client.auth.getUser();
  const now = Date.now();
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const password = amr.find((a: unknown) => !!a && typeof a === 'object' && 'method' in a && a.method === 'password') as { timestamp?: unknown } | undefined;
  if (user.error || !user.data.user?.email_confirmed_at || user.data.user.id !== claims.sub ||
    claims.iss !== config.url.replace(/\/$/, '') + '/auth/v1' || claims.role !== 'authenticated' ||
    !(claims.aud === 'authenticated' || Array.isArray(claims.aud) && claims.aud.includes('authenticated')) ||
    typeof claims.session_id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(claims.session_id) ||
    typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now ||
    typeof password?.timestamp !== 'number' || !Number.isSafeInteger(password.timestamp) || password.timestamp < 0 || password.timestamp * 1000 > now ||
    (claims.aal !== 'aal1' && claims.aal !== 'aal2')) return null;
  const live = await client.rpc('staff_session_is_live');
  if (live.error || live.data !== true) return null;
  // SDK verification, Auth identity and live server-side session are required before this evidence exists.
  return { profileId: user.data.user.id, sessionId: claims.session_id, expiresAt: claims.exp * 1000,
    authenticatedAt: password.timestamp * 1000, verifiedAt: now, assurance: claims.aal, reauthenticatedAt: null } as VerifiedStaffProvider;
}

export async function loadStaffResolution(client: StaffClient, requestedRole?: StaffRole): Promise<StaffResolution> {
  try {
    const provider = await verifiedProvider(client);
    if (!provider) return { kind: 'denied' };
    const tenant = await client.rpc('current_school_id');
    if (tenant.error) return { kind: 'denied' };
    if (typeof tenant.data !== 'string' || !tenant.data) {
      if (!requestedRole) return { kind: 'denied' };
      const memberships = await client.rpc('list_school_memberships');
      if (memberships.error || !Array.isArray(memberships.data) || !memberships.data.some(m => m.role_code === requestedRole)) return { kind: 'denied' };
      return requestedRole === 'admin' && provider.assurance !== 'aal2' ? { kind: 'mfa_required' } : { kind: 'context_required' };
    }
    const school = await client.from('schools').select('id,status').eq('id', tenant.data).maybeSingle();
    if (school.error || school.data?.status !== 'active') return { kind: 'denied' };
    const [p, memberships, context] = await Promise.all([
      client.from('profiles').select('id,account_status,credential_reset_required,authorization_version').eq('id', provider.profileId).maybeSingle(),
      client.from('user_roles').select('id,profile_id,role_code,membership_status,valid_from,valid_until,permissions').eq('profile_id', provider.profileId).eq('school_id', tenant.data),
      client.from('role_contexts').select('id,profile_id,role_code,assignment_id,context_version,authorization_version,expires_at,revoked_at').eq('id', provider.sessionId).eq('profile_id', provider.profileId).eq('school_id', tenant.data).maybeSingle(),
    ]);
    if (p.error || memberships.error || context.error || !p.data || !memberships.data) return { kind: 'denied' };
    const role = requestedRole ?? context.data?.role_code;
    if (!isStaffRole(role)) return { kind: 'denied' };
    // These are protected self-scope DB rows, not form input or user_metadata.
    // Super Admin permanently removed; privilege is null in School Admin architecture.
    const snapshot: StaffSchoolSnapshot = { profile: p.data, memberships: memberships.data, privilege: null, context: context.data };
    const resolution = resolveStaffAuthorization(provider, snapshot, role, Date.now());
    return resolution.kind === 'authorized'
      ? { ...resolution, context: { ...resolution.context, schoolId: tenant.data } }
      : resolution;
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
