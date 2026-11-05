'use server';
import { redirect } from 'next/navigation';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { staffClient, staffRequestsEnabled, loadStaffResolution } from '@/lib/staff/server';
import { GENERIC_STAFF_ERROR, STAFF_PENDING_MESSAGE, isStaffRole, performStaffLogin, safeStaffDestination } from '@/lib/staff/contracts';
import type { StaffActionState } from '@/lib/staff/contracts';

export async function loginStaff(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  const enabled = staffRequestsEnabled();
  let client: Awaited<ReturnType<typeof staffClient>> | undefined;
  const getClient = async () => client ??= await staffClient(true);
  const result = await performStaffLogin({ email: form.get('email'), password: form.get('password'), role: form.get('role'), next: form.get('next') }, {
    enabled, configured: getSupabasePublicConfiguration().configured,
    signIn: async (email, password) => { const r = await (await getClient()).auth.signInWithPassword({ email, password }); return !r.error && !!r.data.user; },
    resolve: async role => loadStaffResolution(await getClient(), role),
    activate: async role => { const r = await (await getClient()).rpc('activate_staff_context', { requested_role: role }); return !r.error && r.data === true; },
    factor: async () => { const r = await (await getClient()).auth.mfa.listFactors(); if (r.error) throw new Error('Factor lookup failed'); return r.data.totp.find(f => f.status === 'verified')?.id ?? null; },
  });
  if (result.phase === 'authorized') redirect(result.destination);
  return result;
}

export async function enrollStaffMfa(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!staffRequestsEnabled()) return { phase: 'error', message: STAFF_PENDING_MESSAGE };
  const role = form.get('role');
  if (!isStaffRole(role)) return { phase: 'error', message: GENERIC_STAFF_ERROR };
  try {
    const client = await staffClient(true);
    if ((await loadStaffResolution(client, role)).kind !== 'mfa_required') return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const factors = await client.auth.mfa.listFactors();
    if (factors.error || factors.data.all.some(f => f.status === 'verified')) return { phase: 'error', message: GENERIC_STAFF_ERROR };
    // One-use independent approval is required; no application endpoint creates approvals.
    const approval = await client.rpc('consume_staff_mfa_enrollment_approval');
    if (approval.error || approval.data !== true) return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const r = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Brightcamp staff authenticator' });
    if (r.error || r.data.type !== 'totp') return { phase: 'error', message: GENERIC_STAFF_ERROR };
    // Installed SDK returns an SVG data-URI prefix; encode only the SVG payload for image display.
    const svg = r.data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, '');
    if (!svg.trimStart().startsWith('<svg') || svg.length > 1_000_000) return { phase: 'error', message: GENERIC_STAFF_ERROR };
    // Enrollment QR is transient user-facing secret material: never log, persist or capture in tests.
    return { phase: 'mfa', message: 'Scan with your authenticator, then enter its current code.', factorId: r.data.id,
      qrDataUri: 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64') };
  } catch { return { phase: 'error', message: GENERIC_STAFF_ERROR }; }
}

export async function verifyStaffMfa(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!staffRequestsEnabled()) return { phase: 'error', message: STAFF_PENDING_MESSAGE };
  const role = form.get('role'), factorId = form.get('factorId'), code = form.get('code');
  if (!isStaffRole(role) || typeof factorId !== 'string' || factorId.length > 128 || typeof code !== 'string' || code.length !== 6 || !/^[0-9]{6}$/.test(code)) return { phase: 'error', message: GENERIC_STAFF_ERROR };
  let destination: string | null = null;
  try {
    const client = await staffClient(true);
    if ((await loadStaffResolution(client, role)).kind !== 'mfa_required') return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const factors = await client.auth.mfa.listFactors();
    if (factors.error || !factors.data.all.some(f => f.id === factorId && f.factor_type === 'totp')) return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const verification = await client.auth.mfa.challengeAndVerify({ factorId, code });
    if (verification.error) return { phase: 'mfa', message: GENERIC_STAFF_ERROR, factorId };
    let access = await loadStaffResolution(client, role);
    if (access.kind === 'context_required') {
      const activation = await client.rpc('activate_staff_context', { requested_role: role });
      if (!activation.error && activation.data === true) access = await loadStaffResolution(client, role);
    }
    if (access.kind === 'authorized') destination = safeStaffDestination(form.get('next'), role);
  } catch { /* Generic denial; never expose provider, cookie or database details. */ }
  if (destination) redirect(destination);
  return { phase: 'error', message: GENERIC_STAFF_ERROR };
}

export async function logoutStaff(): Promise<void> {
  if (!staffRequestsEnabled()) redirect('/login/staff');
  let complete = false;
  try {
    const client = await staffClient(true);
    const revoked = await client.rpc('revoke_staff_context');
    if (!revoked.error && revoked.data === true) {
      const result = await client.auth.signOut({ scope: 'local' });
      complete = !result.error;
    }
  } catch { /* Local context revocation must succeed before claiming logout. */ }
  redirect(complete ? '/login/staff' : '/login/staff?notice=unavailable');
}

export async function staffAction(previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  const intent = form.get('intent');
  if (intent === 'enroll') return enrollStaffMfa(previous, form);
  if (intent === 'verify') return verifyStaffMfa(previous, form);
  return loginStaff(previous, form);
}
