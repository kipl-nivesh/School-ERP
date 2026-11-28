'use server';

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { isSixDigitPinFormat } from '@/lib/auth/input-contracts';
import { hashPin, verifyPinHash } from '@/lib/auth/pin-service';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ParentActionState = {
  readonly phase: 'idle' | 'code_sent' | 'pin_reset' | 'pin_reset_done' | 'error' | 'success';
  readonly intent?: 'signin' | 'recovery';
  readonly email?: string;
  readonly recoveryToken?: string;
  readonly cooldownSeconds?: number;
  readonly message: string;
};

const pinDenied: ParentActionState = {
  phase: 'error',
  message:
    'Invalid school code, Parent ID, or 6-digit PIN. If multiple guardians share this Student ID, also enter your verified guardian email.',
};

function loadTestConfig() {
  const envTestPath = path.resolve('.env.test.local');
  if (!fs.existsSync(envTestPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envTestPath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function loginParentPin(
  _previous: ParentActionState,
  form: FormData
): Promise<ParentActionState> {
  const config = getSupabasePublicConfiguration();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config.configured || !serviceKey) {
    return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
  }

  const school = field(form, 'schoolCode').toUpperCase();
  const registration = field(form, 'studentId').toUpperCase();
  const pin = typeof form.get('pin') === 'string' ? (form.get('pin') as string) : '';
  const guardianEmail = field(form, 'guardianEmail').toLowerCase();

  if (
    !/^[A-Z0-9_-]{3,20}$/.test(school) ||
    registration.length < 1 ||
    registration.length > 80 ||
    !isSixDigitPinFormat(pin) ||
    (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail))
  ) {
    return pinDenied;
  }

  try {
    const origin = new URL(config.url).origin;
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(input instanceof Request ? input.url : input);
          if (url.origin !== origin) throw new Error('Unexpected Parent authentication origin');
          return fetch(input, { ...init, cache: 'no-store', redirect: 'error' });
        },
      },
    };
    const broker = createClient(config.url, serviceKey, options);
    const lookup = await broker.rpc('begin_parent_pin_attempt', {
      p_school: school,
      p_registration: registration,
      p_guardian_email: guardianEmail || null,
    });
    if (lookup.error) {
      return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
    }

    const eligible = Array.isArray(lookup.data) && lookup.data.length === 1;
    const credential = eligible ? lookup.data[0] : null;
    const matches = await verifyPinHash(
      pin,
      credential?.salt ?? '0'.repeat(32),
      credential?.pin_hash ?? '0'.repeat(64)
    );
    if (
      !credential ||
      !matches ||
      !isStaffUuid(credential.profile_id) ||
      !isStaffUuid(credential.school_id) ||
      !Number.isSafeInteger(credential.credential_version)
    ) {
      return pinDenied;
    }

    const link = await broker.auth.admin.generateLink({
      type: 'magiclink',
      email: credential.email,
    });
    if (
      link.error ||
      link.data.user?.id !== credential.profile_id ||
      !link.data.properties?.hashed_token
    ) {
      return pinDenied;
    }

    const staged = createClient(config.url, config.publishableKey, options);
    const exchange = await staged.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.data.properties.hashed_token,
    });
    const session = exchange.data.session;
    if (exchange.error || !session || exchange.data.user?.id !== credential.profile_id) {
      return pinDenied;
    }

    let attachedToBrowser = false;
    try {
      const verified = await staged.auth.getClaims(session.access_token);
      const claims = verified.data?.claims;
      if (
        verified.error ||
        claims?.iss !== origin + '/auth/v1' ||
        claims.sub !== credential.profile_id ||
        !isStaffUuid(claims.session_id)
      ) {
        return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
      }

      const bound = await broker.rpc('bind_parent_pin_session', {
        p_session: claims.session_id,
        p_profile: credential.profile_id,
        p_school: credential.school_id,
        p_version: credential.credential_version,
      });
      if (bound.error || bound.data !== true) {
        return pinDenied;
      }

      await broker.rpc('reset_parent_pin_attempts', {
        p_school: school,
        p_registration: registration,
        p_profile: credential.profile_id,
        p_guardian_email: guardianEmail || null,
      });

      const client = await createServerSupabaseClient({
        cookieWrites: 'allowed',
        httpOnlyCookies: true,
      });
      const attached = await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (attached.error || attached.data.user?.id !== credential.profile_id) {
        return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
      }
      attachedToBrowser = true;
    } finally {
      if (!attachedToBrowser) await staged.auth.signOut({ scope: 'local' });
    }
  } catch {
    return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
  }

  redirect('/parent/dashboard');
}

export async function sendParentOtp(
  _previous: ParentActionState,
  form: FormData
): Promise<ParentActionState> {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) {
    return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
  }

  const intent = form.get('intent')?.toString() === 'recovery' ? 'recovery' : 'signin';
  const email = form.get('email')?.toString().trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { phase: 'error', intent, message: 'Please enter a valid guardian email address.' };
  }

  try {
    const publicClient = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rateRes = await publicClient.rpc('check_parent_otp_rate_limit', {
      p_email: email,
      p_kind: 'send',
      p_reset: false,
    });
    const rateRow = Array.isArray(rateRes.data) ? rateRes.data[0] : null;
    if (rateRow && rateRow.allowed === false) {
      const wait = Number(rateRow.retry_after_seconds || 60);
      return {
        phase: 'code_sent',
        intent,
        email,
        cooldownSeconds: wait,
        message: `Please wait ${wait} seconds before requesting another verification code.`,
      };
    }

    const precheckRes = await publicClient.rpc('precheck_parent_otp_target', { p_email: email });
    const eligible = precheckRes.data === true;

    if (!eligible) {
      return {
        phase: 'code_sent',
        intent,
        email,
        cooldownSeconds: 60,
        message: 'If this email is registered as an active verified guardian, a one-time code has been dispatched.',
      };
    }

    const testConfig = loadTestConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || testConfig.SUPABASE_SERVICE_ROLE_KEY;
    // Strictly disposable-only guard: never activate on Vercel or non-disposable Supabase projects
    const isDisposableHost =
      !process.env.VERCEL &&
      process.env.VERCEL_ENV !== 'production' &&
      config.url === 'https://etlahjbwylasudkuqozc.supabase.co';
    const isAutomatedTestMode = isDisposableHost && process.env.AUTO_TEST_MODE === '1';

    if (isAutomatedTestMode && serviceRoleKey) {
      const adminClient = createClient(config.url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkErr || !linkData.properties?.email_otp) {
        return { phase: 'error', intent, message: 'Unable to generate verification code.' };
      }
      updateTestOtp(linkData.properties.email_otp);
      return {
        phase: 'code_sent',
        intent,
        email,
        cooldownSeconds: 60,
        message: 'A one-time verification code has been dispatched to your guardian email.',
      };
    }

    const { error: otpErr } = await publicClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpErr) {
      return {
        phase: 'error',
        intent,
        message: 'Unable to send verification email. Please contact the school administrator.',
      };
    }
    return {
      phase: 'code_sent',
      intent,
      email,
      cooldownSeconds: 60,
      message: `A one-time verification code has been dispatched to ${email}.`,
    };
  } catch {
    return { phase: 'error', intent, message: 'An unexpected error occurred while requesting verification code.' };
  }
}

export async function verifyParentOtp(
  _previous: ParentActionState,
  form: FormData
): Promise<ParentActionState> {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) {
    return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
  }

  const intent = form.get('intent')?.toString() === 'recovery' ? 'recovery' : 'signin';
  const email = form.get('email')?.toString().trim().toLowerCase();
  const code = form.get('code')?.toString().trim();

  if (!email || !code || !/^\d{6,10}$/.test(code)) {
    return {
      phase: 'code_sent',
      intent,
      email,
      message: 'Enter the numeric one-time code sent to your guardian email.',
    };
  }

  try {
    const publicClient = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rateRes = await publicClient.rpc('check_parent_otp_rate_limit', {
      p_email: email,
      p_kind: 'verify',
      p_reset: false,
    });
    const rateRow = Array.isArray(rateRes.data) ? rateRes.data[0] : null;
    if (rateRow && rateRow.allowed === false) {
      const wait = Number(rateRow.retry_after_seconds || 60);
      return {
        phase: 'code_sent',
        intent,
        email,
        message: `Too many failed attempts. Please wait ${wait} seconds before trying again.`,
      };
    }

    const serverClient = await createServerSupabaseClient({
      cookieWrites: 'allowed',
      httpOnlyCookies: true,
    });
    const { data: sessionData, error: sessionErr } = await serverClient.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (sessionErr || !sessionData.session || !sessionData.user) {
      return {
        phase: 'code_sent',
        intent,
        email,
        message: 'Invalid or expired verification code. Please check your email or request a new code.',
      };
    }

    const claimsRes = await serverClient.auth.getClaims();
    const sessionId = (claimsRes.data?.claims as { session_id?: string } | undefined)?.session_id;
    if (!sessionId) {
      await serverClient.auth.signOut();
      return {
        phase: 'error',
        intent,
        message: 'Unable to establish a verified guardian session.',
      };
    }

    await publicClient.rpc('check_parent_otp_rate_limit', {
      p_email: email,
      p_kind: 'verify',
      p_reset: true,
    });

    if (intent === 'recovery') {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const issued = await serverClient.rpc('issue_parent_pin_recovery_token', {
        p_session: sessionId,
        p_token_hash: tokenHash,
      });
      if (issued.error || issued.data !== true) {
        await serverClient.auth.signOut();
        return {
          phase: 'error',
          intent: 'recovery',
          message: 'This account is not authorized for Parent PIN recovery.',
        };
      }
      return {
        phase: 'pin_reset',
        intent: 'recovery',
        email,
        recoveryToken: rawToken,
        message: 'Email verified. Choose your new 6-digit Parent PIN below.',
      };
    }

    const bindRes = await serverClient.rpc('bind_parent_portal_session', {
      p_session: sessionId,
      p_profile: sessionData.user.id,
    });

    if (bindRes.error || bindRes.data !== true) {
      await serverClient.auth.signOut();
      return {
        phase: 'error',
        intent,
        message: 'This account is not authorized for Parent Portal access. Please contact the school administrator.',
      };
    }
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err;
    }
    return { phase: 'error', intent, message: 'An unexpected authentication error occurred.' };
  }

  redirect('/parent/dashboard');
}

export async function completeParentPinRecovery(
  _previous: ParentActionState,
  form: FormData
): Promise<ParentActionState> {
  const recoveryToken = field(form, 'recoveryToken');
  const pin = typeof form.get('pin') === 'string' ? (form.get('pin') as string) : '';
  const confirmPin = typeof form.get('confirmPin') === 'string' ? (form.get('confirmPin') as string) : '';

  if (!/^[0-9a-f]{64}$/.test(recoveryToken)) {
    return {
      phase: 'error',
      intent: 'recovery',
      message: 'Your PIN recovery session has expired. Please verify your email again.',
    };
  }
  if (!isSixDigitPinFormat(pin)) {
    return {
      phase: 'pin_reset',
      intent: 'recovery',
      recoveryToken,
      message: 'Parent PIN must be exactly 6 numeric digits (leading zeros supported).',
    };
  }
  if (pin !== confirmPin) {
    return {
      phase: 'pin_reset',
      intent: 'recovery',
      recoveryToken,
      message: 'PIN confirmation does not match.',
    };
  }

  try {
    const serverClient = await createServerSupabaseClient({
      cookieWrites: 'allowed',
      httpOnlyCookies: true,
    });
    const claimsRes = await serverClient.auth.getClaims();
    const sessionId = (claimsRes.data?.claims as { session_id?: string } | undefined)?.session_id;
    if (!sessionId || !isStaffUuid(sessionId)) {
      return {
        phase: 'error',
        intent: 'recovery',
        message: 'Your PIN recovery session has expired. Please verify your email again.',
      };
    }

    const { hash, salt } = await hashPin(pin);
    const tokenHash = crypto.createHash('sha256').update(recoveryToken).digest('hex');
    const res = await serverClient.rpc('complete_parent_pin_recovery', {
      p_session: sessionId,
      p_token_hash: tokenHash,
      p_hash: hash,
      p_salt: salt,
    });
    await serverClient.auth.signOut({ scope: 'local' });

    if (res.error || res.data !== true) {
      return {
        phase: 'error',
        intent: 'recovery',
        message: 'Unable to update Parent PIN. Please verify your guardian email again.',
      };
    }

    return {
      phase: 'pin_reset_done',
      message:
        'Your 6-digit Parent PIN is now active and previous sessions have been signed out. Sign in with your School Code, Parent ID, and new PIN.',
    };
  } catch {
    return {
      phase: 'error',
      intent: 'recovery',
      message: 'PIN recovery is currently unavailable.',
    };
  }
}

export async function logoutParent() {
  try {
    const serverClient = await createServerSupabaseClient({ cookieWrites: 'allowed', httpOnlyCookies: true });
    await serverClient.rpc('revoke_parent_portal_session');
    await serverClient.auth.signOut();
  } catch {
    // Ignore errors during sign-out cleanup
  }
  redirect('/login/parent');
}

function updateTestOtp(otp: string) {
  try {
    const envPath = path.resolve('.env.test.local');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('LATEST_PARENT_OTP=')) {
        content = content.replace(/LATEST_PARENT_OTP=.*/, `LATEST_PARENT_OTP=${otp}`);
      } else {
        content += `\nLATEST_PARENT_OTP=${otp}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
    }
  } catch {
    // Ignore test storage errors
  }
}
