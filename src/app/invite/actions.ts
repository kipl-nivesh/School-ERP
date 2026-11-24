'use server';

import { staffWorkspaceWritesEnabled } from '@/lib/services/staff-workspace-policy';
import { staffClient, staffRequestsEnabled } from '@/lib/staff/server';
import { validateStaffInput } from '@/lib/staff/contracts';
import { staffAccountEmail } from '@/lib/staff/account-contracts';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { recoveryOrigin } from '@/lib/staff/recovery';

export type InvitationActionState = {
  ok?: boolean;
  message: string;
  phase?: 'idle' | 'pending_confirmation' | 'accepted' | 'error';
};

const GENERIC_FAILURE: InvitationActionState = {
  ok: false,
  message: 'Unable to complete setup. Use the invited email, confirm it in your inbox, and reopen your original invitation.',
  phase: 'error',
};

export async function acceptInvitation(_state: InvitationActionState, form: FormData): Promise<InvitationActionState> {
  if (!staffRequestsEnabled()) {
    return { ok: false, message: 'Staff onboarding requests are currently disabled.', phase: 'error' };
  }

  const token = form.get('token');
  const emailInput = form.get('email');
  const password = form.get('password');
  const confirmation = form.get('confirmation');
  const intent = form.get('intent');

  // Reject multiple submissions of the same key
  if (['token', 'email', 'password', 'confirmation', 'intent'].some(name => form.getAll(name).length > 1)) {
    return { ok: false, message: 'Invalid submission format. Please try again.', phase: 'error' };
  }
  if (intent !== 'setup' && intent !== 'accept') return GENERIC_FAILURE;

  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    return {
      ok: false,
      message: 'This invitation link is missing or has an invalid authorization token. Please use the complete link provided by your administrator.',
      phase: 'error',
    };
  }

  try {
    const client = await staffClient(true);
    const email = emailInput ? staffAccountEmail(emailInput) : null;
    const user = email ? null : await client.auth.getUser();
    const target = email ?? user?.data.user?.email;

    if (!target) {
      return { ok: false, message: 'Please enter the email address where you received the invitation.', phase: 'error' };
    }

    const managed = await client.rpc('managed_staff_invitation_matches', { p_token: token, p_email: target });

    if (intent === 'setup') {
      if (!email) {
        return { ok: false, message: 'Please enter a valid email address.', phase: 'error' };
      }

      if (managed?.error) {
        return { ok: false, message: 'Unable to verify invitation details at this time. Please try again or contact your administrator.', phase: 'error' };
      }

      if (managed?.data !== true) {
        return {
          ok: false,
          message: 'No pending invitation matches this email address and invitation link. Ensure you entered the exact email address where you were invited.',
          phase: 'error',
        };
      }

      if (typeof password !== 'string' || password.length < 12) {
        return { ok: false, message: 'Password must be at least 12 characters long.', phase: 'error' };
      }

      if (password !== confirmation) {
        return { ok: false, message: 'Passwords do not match. Please verify both password fields.', phase: 'error' };
      }

      if (!validateStaffInput(email, password, 'teacher')) {
        return { ok: false, message: 'Password contains unsupported characters or exceeds allowed length.', phase: 'error' };
      }

      const origin = recoveryOrigin(process.env.AUTH_APP_ORIGIN, process.env.NODE_ENV === 'production');
      const config = getSupabasePublicConfiguration();

      if (!origin || !config.configured) {
        return GENERIC_FAILURE;
      }

      const settings = await fetch(new URL('/auth/v1/settings', config.url), {
        headers: { apikey: config.publishableKey },
        cache: 'no-store',
        redirect: 'error',
      });
      const auth = settings.ok ? await settings.json() : null;
      if (auth?.external?.email !== true || auth.disable_signup !== false || auth.mailer_autoconfirm !== false) {
        return {
          ok: false,
          message: 'New-account email confirmation is unavailable. Ask your school to check its staff setup configuration.',
          phase: 'error',
        };
      }

      const setup = await client.auth.signUp({
        email,
        password,
        // The recipient reopens their original invitation after confirming.
        options: { emailRedirectTo: origin + '/invite' },
      });

      if (setup.data.session) {
        await client.auth.signOut({ scope: 'local' });
        return {
          ok: false,
          message: 'Email confirmation is required for staff setup. Ask the school to check its authentication configuration.',
          phase: 'error',
        };
      }

      if (setup.error) {
        if (setup.error.code === 'user_already_exists' || setup.error.code === 'email_exists') {
          return {
            ok: false,
            message: 'An account with this email already exists. Choose "Sign in with existing account" to accept this invitation with your password.',
            phase: 'error',
          };
        }
        return {
          ok: false,
          message: 'Unable to register the account. Check your details or try again later.',
          phase: 'error',
        };
      }

      return {
        ok: true,
        message: 'Check your inbox for an account confirmation email. After confirming, reopen the original invitation and choose Accept confirmed account. If you already have an account, use its existing password.',
        phase: 'pending_confirmation',
      };
    }

    // Intent === 'accept'
    if ((managed?.error || managed?.data !== true) && !staffWorkspaceWritesEnabled()) {
      return {
        ok: false,
        message: 'No pending invitation found for this email address and link. Please check the invitation link or contact your school administrator.',
        phase: 'error',
      };
    }

    if (emailInput || password) {
      if (!email || !validateStaffInput(email, password, 'teacher') || typeof password !== 'string') {
        return { ok: false, message: 'Please enter a valid email and password.', phase: 'error' };
      }
      const signIn = await client.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        return { ok: false, message: 'Incorrect email or password. Please verify your credentials.', phase: 'error' };
      }
      if (!signIn.data.user?.email_confirmed_at) {
        return {
          ok: false,
          message: 'Your email address is not confirmed yet. Please check your inbox and click the verification link.',
          phase: 'error',
        };
      }
    }

    const result = await client.rpc('accept_staff_invitation', { p_token: token });
    if (result.error?.code === '23505') {
      return {
        ok: false,
        message: 'This email or employee ID is already registered at the school. Ask your administrator to review the invitation.',
        phase: 'error',
      };
    }
    if (result.error || result.data !== true) {
      return GENERIC_FAILURE;
    }

    return {
      ok: true,
      message: 'Invitation accepted. Sign in to your staff workspace when your school access is active.',
      phase: 'accepted',
    };
  } catch {
    return GENERIC_FAILURE;
  }
}
