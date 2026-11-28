'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export type ParentActionState = {
  readonly phase: 'idle' | 'code_sent' | 'error' | 'success';
  readonly email?: string;
  readonly cooldownSeconds?: number;
  readonly message: string;
};

function loadTestConfig() {
  const envTestPath = path.resolve('.env.test.local');
  if (!fs.existsSync(envTestPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envTestPath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

export async function sendParentOtp(_previous: ParentActionState, form: FormData): Promise<ParentActionState> {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) {
    return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
  }

  const email = form.get('email')?.toString().trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { phase: 'error', message: 'Please enter a valid guardian email address.' };
  }

  try {
    const publicClient = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false }
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
        email,
        cooldownSeconds: wait,
        message: `Please wait ${wait} seconds before requesting another verification code.`,
      };
    }

    const precheckRes = await publicClient.rpc('precheck_parent_otp_target', { p_email: email });
    const eligible = precheckRes.data === true;
    if (!eligible) {
      // Return generic code_sent state so account existence is never leaked
      return {
        phase: 'code_sent',
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
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email
      });
      if (linkErr || !linkData.properties?.email_otp) {
        return { phase: 'error', message: 'Unable to generate verification code.' };
      }
      updateTestOtp(linkData.properties.email_otp);
      return {
        phase: 'code_sent',
        email,
        cooldownSeconds: 60,
        message: 'A one-time verification code has been dispatched to your guardian email.',
      };
    }

    const { error: otpErr } = await publicClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });
    if (otpErr) {
      return {
        phase: 'error',
        message: 'Unable to send verification email. Please contact the school administrator.'
      };
    }
    return {
      phase: 'code_sent',
      email,
      cooldownSeconds: 60,
      message: `A one-time verification code has been dispatched to ${email}.`,
    };
  } catch {
    return { phase: 'error', message: 'An unexpected error occurred while requesting verification code.' };
  }
}

export async function verifyParentOtp(_previous: ParentActionState, form: FormData): Promise<ParentActionState> {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) {
    return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
  }

  const email = form.get('email')?.toString().trim().toLowerCase();
  const code = form.get('code')?.toString().trim();

  if (!email || !code || !/^\d{6,10}$/.test(code)) {
    return {
      phase: 'code_sent',
      email,
      message: 'Enter the numeric one-time code sent to your guardian email.',
    };
  }

  try {
    const publicClient = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false }
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
        email,
        message: `Too many failed attempts. Please wait ${wait} seconds before trying again.`,
      };
    }

    const serverClient = await createServerSupabaseClient({ cookieWrites: 'allowed', httpOnlyCookies: true });
    const { data: sessionData, error: sessionErr } = await serverClient.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    });

    if (sessionErr || !sessionData.session || !sessionData.user) {
      return {
        phase: 'code_sent',
        email,
        message: 'Invalid or expired verification code. Please check your email or request a new code.'
      };
    }

    const claimsRes = await serverClient.auth.getClaims();
    const sessionId = (claimsRes.data?.claims as { session_id?: string } | undefined)?.session_id;
    if (!sessionId) {
      await serverClient.auth.signOut();
      return {
        phase: 'error',
        message: 'Unable to establish a verified guardian session.'
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
        message: 'This account is not authorized for Parent Portal access. Please contact the school administrator.'
      };
    }

    await publicClient.rpc('check_parent_otp_rate_limit', {
      p_email: email,
      p_kind: 'verify',
      p_reset: true,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && typeof (err as { digest: unknown }).digest === 'string' && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { phase: 'error', message: 'An unexpected authentication error occurred.' };
  }

  redirect('/parent/dashboard');
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
