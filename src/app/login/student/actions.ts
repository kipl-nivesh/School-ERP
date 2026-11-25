'use server';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { isSixDigitPinFormat } from '@/lib/auth/input-contracts';
import { verifyPinHash } from '@/lib/auth/pin-service';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { studentPortalRequestsEnabled } from '@/lib/student/request-policy';

export type StudentActionState = {
  readonly phase: 'idle' | 'error' | 'success';
  readonly message: string;
};

const denied = { phase: 'error', message: 'Invalid school code, student ID, or PIN. Check your details and try again.' } as const;
const unavailable = { phase: 'error', message: 'Student sign-in is currently unavailable.' } as const;

function reportStudentAuthFailure(stage: string, code?: string) {
  if (process.env.STUDENT_AUTH_DIAGNOSTICS === 'true') {
    const safeCode = code && /^[a-zA-Z0-9_]{1,40}$/.test(code) ? code : 'unknown';
    console.warn('Student authentication failed', { stage, code: safeCode });
  }
}

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function loginStudent(_previous: StudentActionState, form: FormData): Promise<StudentActionState> {
  const config = getSupabasePublicConfiguration();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!studentPortalRequestsEnabled() || !config.configured || !serviceKey) {
    reportStudentAuthFailure('configuration');
    return unavailable;
  }

  const school = field(form, 'schoolCode').toUpperCase();
  const registration = field(form, 'studentId').toUpperCase();
  const pin = field(form, 'pin');
  if (!/^[A-Z0-9_-]{3,20}$/.test(school) || registration.length < 1 || registration.length > 80 ||
      !isSixDigitPinFormat(pin)) return denied;

  let stage = 'client';
  try {
    const origin = new URL(config.url).origin;
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input);
        if (url.origin !== origin) throw new Error('Unexpected Student authentication origin');
        return fetch(input, { ...init, cache: 'no-store', redirect: 'error' });
      } },
    };
    const broker = createClient(config.url, serviceKey, options);
    stage = 'pin_lookup';
    const lookup = await broker.rpc('begin_student_pin_attempt', { p_school: school, p_registration: registration });
    if (lookup.error) {
      reportStudentAuthFailure(stage, lookup.error.code);
      return unavailable;
    }
    const eligible = Array.isArray(lookup.data) && lookup.data.length === 1;
    const credential = eligible ? lookup.data[0] : null;
    // Keep the work comparable for absent, suspended and throttled credentials.
    const matches = await verifyPinHash(pin, credential?.salt ?? '0'.repeat(32), credential?.pin_hash ?? '0'.repeat(64));
    if (!credential || !matches || !isStaffUuid(credential.profile_id) || !isStaffUuid(credential.student_id) ||
        !isStaffUuid(credential.school_id) || !Number.isSafeInteger(credential.credential_version)) return denied;

    stage = 'provider_issue';
    const link = await broker.auth.admin.generateLink({ type: 'magiclink', email: credential.email });
    if (link.error || link.data.user?.id !== credential.profile_id || !link.data.properties?.hashed_token) {
      reportStudentAuthFailure(stage, link.error?.code);
      return denied;
    }
    // Stage provider authentication without setting browser cookies until the
    // database confirms this native session belongs to the verified credential.
    const staged = createClient(config.url, config.publishableKey, options);
    stage = 'provider_exchange';
    const exchange = await staged.auth.verifyOtp({ type: 'magiclink', token_hash: link.data.properties.hashed_token });
    const session = exchange.data.session;
    if (exchange.error || !session || exchange.data.user?.id !== credential.profile_id) {
      reportStudentAuthFailure(stage, exchange.error?.code);
      return denied;
    }
    let attachedToBrowser = false;
    try {
      stage = 'provider_claims';
      const verified = await staged.auth.getClaims(session.access_token);
      const claims = verified.data?.claims;
      if (verified.error || claims?.iss !== origin + '/auth/v1' || claims.sub !== credential.profile_id ||
          !isStaffUuid(claims.session_id)) {
        reportStudentAuthFailure(stage, verified.error?.code);
        return unavailable;
      }
      stage = 'session_binding';
      const bound = await broker.rpc('bind_student_pin_session', {
        p_session: claims.session_id, p_student: credential.student_id, p_profile: credential.profile_id,
        p_school: credential.school_id, p_version: credential.credential_version,
      });
      if (bound.error || bound.data !== true) {
        reportStudentAuthFailure(stage, bound.error?.code);
        return denied;
      }
      stage = 'portal_scope';
      const portal = await staged.rpc('read_student_portal_identity');
      if (portal.error || !Array.isArray(portal.data) || portal.data.length !== 1) {
        reportStudentAuthFailure(stage, portal.error?.code);
        return denied;
      }
      const client = await createServerSupabaseClient({ cookieWrites: 'allowed', httpOnlyCookies: true });
      stage = 'session_cookie';
      const attached = await client.auth.setSession({
        access_token: session.access_token, refresh_token: session.refresh_token,
      });
      if (attached.error || attached.data.user?.id !== credential.profile_id) {
        reportStudentAuthFailure(stage, attached.error?.code);
        return unavailable;
      }
      attachedToBrowser = true;
    } finally {
      if (!attachedToBrowser) await staged.auth.signOut({ scope: 'local' });
    }
  } catch {
    reportStudentAuthFailure(stage);
    return unavailable;
  }
  redirect('/student/dashboard');
}

export async function logoutStudent() {
  const client = await createServerSupabaseClient({ cookieWrites: 'allowed', httpOnlyCookies: true });
  await client.rpc('revoke_student_portal_session');
  await client.auth.signOut({ scope: 'local' });
  redirect('/login/student');
}
