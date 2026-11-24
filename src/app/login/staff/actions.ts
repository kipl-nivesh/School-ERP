'use server';
import { redirect } from 'next/navigation';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { staffClient, staffRequestsEnabled, loadStaffResolution, readStaffSchoolChoices } from '@/lib/staff/server';
import { GENERIC_STAFF_ERROR, STAFF_PENDING_MESSAGE, isStaffRole, performStaffLogin, safeStaffDestination } from '@/lib/staff/contracts';
import type { StaffActionState } from '@/lib/staff/contracts';
import { isTotpSetupSecret, normalizeTotpQr, parseTotpSetup } from '@/lib/staff/mfa-setup';

const STAFF_REAUTHENTICATION: StaffActionState = {
  phase: 'error',
  message: 'Your staff session could not be confirmed. Sign in again to continue.',
};

function isInvalidSession(error?: { name?: string; code?: string } | null) {
  const code = error?.code;
  return error?.name === 'AuthSessionMissingError' || code === 'session_not_found' || code === 'session_expired' ||
    code === 'bad_jwt' || code === 'refresh_token_not_found' || code === 'refresh_token_already_used';
}

function enrollmentFailure(stage: 'list_factors' | 'enroll' | 'setup_data', error?: { name?: string; code?: string }): StaffActionState {
  const code = error?.code;
  const sessionInvalid = isInvalidSession(error);
  const safeCode = sessionInvalid ? 'invalid_session' : code === 'unauthorized_missing_api_key' ||
    code === 'UNAUTHORIZED_MISSING_API_KEY' || code === 'mfa_totp_enroll_not_enabled' ||
    code === 'over_request_rate_limit' || code === 'too_many_enrolled_mfa_factors' ? code : 'unknown';
  console.warn('Staff MFA setup failed', { stage, code: safeCode });
  if (sessionInvalid) return STAFF_REAUTHENTICATION;
  return {
    phase: 'mfa',
    mfaError: true,
    message: 'Authenticator setup could not be completed. Try again or contact your school administrator if the problem continues.',
  };
}

export async function loginStaff(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  const enabled = staffRequestsEnabled();
  let client: Awaited<ReturnType<typeof staffClient>> | undefined;
  let needsContext = false;
  const getClient = async () => client ??= await staffClient(true);
  const result = await performStaffLogin({ email: form.get('email'), password: form.get('password'), role: form.get('role'), next: form.get('next') }, {
    enabled, configured: getSupabasePublicConfiguration().configured,
    signIn: async (email, password) => { const r = await (await getClient()).auth.signInWithPassword({ email, password }); return !r.error && !!r.data.user; },
    resolve: async role => {
      const resolution = await loadStaffResolution(await getClient(), role);
      needsContext = resolution.kind === 'context_required';
      return resolution;
    },
    activate: async role => {
      try {
        const c = await getClient();
        const choices = (await readStaffSchoolChoices(c)).filter(choice => choice.role === role);
        if (choices.length === 1) {
          const { data, error } = await c.rpc('select_school_context', { p_school: choices[0].schoolId, p_role: role });
          return !error && data === true;
        }
      } catch { /* context selection failed */ }
      return false;
    },
    factor: async () => { const r = await (await getClient()).auth.mfa.listFactors(); if (r.error) throw new Error('Factor lookup failed'); return r.data.totp.find(f => f.status === 'verified')?.id ?? null; },
  });
  if (result.phase === 'authorized') redirect(result.destination);
  if (needsContext) redirect('/staff/select-school');
  return result;
}

export async function enrollStaffMfa(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!staffRequestsEnabled()) return { phase: 'error', message: STAFF_PENDING_MESSAGE };
  const role = form.get('role');
  if (!isStaffRole(role)) return { phase: 'error', message: GENERIC_STAFF_ERROR };
  let stage: 'session' | 'list_factors' | 'enroll' | 'setup_data' = 'session';
  try {
    const client = await staffClient(true);
    const resolution = await loadStaffResolution(client, role);
    if (resolution.kind === 'denied') return STAFF_REAUTHENTICATION;
    if (resolution.kind !== 'mfa_required') return { phase: 'error', message: GENERIC_STAFF_ERROR };
    stage = 'list_factors';
    const factors = await client.auth.mfa.listFactors();
    if (factors.error) return enrollmentFailure(stage, factors.error);
    const verifiedTotp = factors.data.totp.find(factor => factor.status === 'verified');
    if (verifiedTotp) return { phase: 'mfa', message: 'Verify your school-authorized authenticator to continue.', factorId: verifiedTotp.id };
    if (factors.data.all.some(factor => factor.status === 'verified')) return enrollmentFailure(stage);
    // Clean up any stale unverified factors from previous incomplete enrollment attempts
    if (factors.data?.all) {
      for (const factor of factors.data.all) {
        if (factor.status === 'unverified') {
          const { error } = await client.auth.mfa.unenroll({ factorId: factor.id }).catch(() => ({ error: null }));
          if (error && isInvalidSession(error)) return enrollmentFailure(stage, error);
        }
      }
    }
    stage = 'enroll';
    const r = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Brightcamp staff authenticator' });
    if (r.error) return enrollmentFailure(stage, r.error);
    stage = 'setup_data';
    const setup = parseTotpSetup(r.data);
    if (!setup) return enrollmentFailure(stage);
    // Enrollment QR is transient user-facing secret material: never log, persist or capture in tests.
    return {
      phase: 'mfa',
      message: 'Scan with your authenticator, or enter the secret key manually below:',
      ...setup,
    };
  } catch {
    return stage === 'session' ? STAFF_REAUTHENTICATION : enrollmentFailure(stage);
  }
}

export async function verifyStaffMfa(_previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!staffRequestsEnabled()) return { phase: 'error', message: STAFF_PENDING_MESSAGE };
  const role = form.get('role'), factorId = form.get('factorId'), code = form.get('code');
  if (!isStaffRole(role) || typeof factorId !== 'string' || factorId.length > 128 || typeof code !== 'string' || code.length !== 6 || !/^[0-9]{6}$/.test(code)) return { phase: 'error', message: GENERIC_STAFF_ERROR };
  let destination: string | null = null;
  const qrDataUri = form.get('qrDataUri')?.toString();
  const secret = form.get('secret')?.toString();
  try {
    const client = await staffClient(true);
    const resolution = await loadStaffResolution(client, role);
    if (resolution.kind === 'denied') return STAFF_REAUTHENTICATION;
    if (resolution.kind !== 'mfa_required') return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const factors = await client.auth.mfa.listFactors();
    if (isInvalidSession(factors.error)) return STAFF_REAUTHENTICATION;
    if (factors.error || !factors.data.all.some(f => f.id === factorId && f.factor_type === 'totp')) return { phase: 'error', message: GENERIC_STAFF_ERROR };
    const verification = await client.auth.mfa.challengeAndVerify({ factorId, code });
    if (isInvalidSession(verification.error)) return STAFF_REAUTHENTICATION;
    if (verification.error) {
      return {
        phase: 'mfa',
        message: 'Invalid authenticator code. Please check your app and try again.',
        factorId,
        qrDataUri: normalizeTotpQr(qrDataUri),
        secret: isTotpSetupSecret(secret) ? secret : undefined,
      };
    }
    let access = await loadStaffResolution(client, role);
    if (access.kind === 'context_required') {
      const choices = (await readStaffSchoolChoices(client)).filter(choice => choice.role === role);
      if (choices.length === 1) {
        const { data, error } = await client.rpc('select_school_context', { p_school: choices[0].schoolId, p_role: role });
        if (!error && data === true) {
          access = await loadStaffResolution(client, role);
        }
      }
    }
    if (access.kind === 'authorized') {
      destination = safeStaffDestination(form.get('next'), role);
    } else if (access.kind === 'context_required') {
      destination = '/staff/select-school';
    }
  } catch { /* Generic denial; never expose provider, cookie or database details. */ }
  if (destination) redirect(destination);
  return { phase: 'error', message: GENERIC_STAFF_ERROR };
}

export async function logoutStaff(): Promise<void> {
  if (!staffRequestsEnabled()) redirect('/login/staff');
  let complete = false;
  try {
    const client = await staffClient(true);
    let contextRevoked = false;
    try {
      const revoked = await client.rpc('revoke_staff_context');
      contextRevoked = !revoked.error && revoked.data === true;
    } catch { /* Still attempt native sign-out if the application RPC is unavailable. */ }
    const result = await client.auth.signOut({ scope: 'local' });
    complete = contextRevoked && !result.error;
  } catch { /* Never claim complete revocation after a provider failure. */ }
  redirect(complete ? '/login/staff' : '/login/staff?notice=unavailable');
}

export async function staffAction(previous: StaffActionState, form: FormData): Promise<StaffActionState> {
  const intent = form.get('intent');
  if (intent === 'enroll') return enrollStaffMfa(previous, form);
  if (intent === 'verify') return verifyStaffMfa(previous, form);
  return loginStaff(previous, form);
}
