'use server';
import { staffWorkspaceWritesEnabled } from '@/lib/services/staff-workspace-policy';
import { staffClient, staffRequestsEnabled } from '@/lib/staff/server';
import { validateStaffInput } from '@/lib/staff/contracts';
import { staffAccountEmail } from '@/lib/staff/account-contracts';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { recoveryOrigin } from '@/lib/staff/recovery';

export async function acceptInvitation(_state: { message: string }, form: FormData) {
  const failed = { message: 'Unable to complete setup. Use the invited email, confirm it in your inbox, and reopen your original invitation.' };
  if (!staffRequestsEnabled()) return failed;
  const token = form.get('token'), emailInput = form.get('email'), password = form.get('password');
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token) ||
    ['token', 'email', 'password', 'intent'].some(name => form.getAll(name).length > 1)) return failed;

  try {
    const client = await staffClient(true);
    const email = emailInput ? staffAccountEmail(emailInput) : null;
    const user = email ? null : await client.auth.getUser();
    const target = email ?? user?.data.user?.email;
    const managed = target ? await client.rpc('managed_staff_invitation_matches', { p_token: token, p_email: target }) : null;

    if (form.get('intent') === 'setup') {
      if (!email || managed?.error || managed?.data !== true ||
        !validateStaffInput(email, password, 'teacher') || typeof password !== 'string' || password.length < 12 ||
        password !== form.get('confirmation')) return failed;
      const origin = recoveryOrigin(process.env.AUTH_APP_ORIGIN, process.env.NODE_ENV === 'production');
      const config = getSupabasePublicConfiguration();
      if (!origin || !config.configured) return failed;
      const settings = await fetch(new URL('/auth/v1/settings', config.url), {
        headers: { apikey: config.publishableKey }, cache: 'no-store', redirect: 'error',
      });
      const auth = settings.ok ? await settings.json() : null;
      if (auth?.external?.email !== true || auth.disable_signup !== false || auth.mailer_autoconfirm !== false) {
        return { message: 'New-account email confirmation is unavailable. Ask your school to check its staff setup configuration.' };
      }
      const setup = await client.auth.signUp({ email, password, options: { emailRedirectTo: origin + '/invite' } });
      if (setup.data.session) {
        await client.auth.signOut({ scope: 'local' });
        return { message: 'Email confirmation is required for staff setup. Ask the school to check its authentication configuration.' };
      }
      if (setup.error) return failed;
      return { message: 'Check your inbox for an account confirmation email. After confirming, reopen the original invitation and choose Accept confirmed account. If you already have an account, use its existing password.' };
    }

    if ((managed?.error || managed?.data !== true) && !staffWorkspaceWritesEnabled()) return failed;
    if (emailInput || password) {
      if (!email || !validateStaffInput(email, password, 'teacher') || typeof password !== 'string') return failed;
      const signIn = await client.auth.signInWithPassword({ email, password });
      if (signIn.error || !signIn.data.user?.email_confirmed_at) return failed;
    }
    const result = await client.rpc('accept_staff_invitation', { p_token: token });
    if (result.error?.code === '23505') return { message: 'This email or employee ID is already registered at the school. Ask your administrator to review the invitation.' };
    if (result.error || result.data !== true) return failed;
    return { message: 'Invitation accepted. Sign in to the invited workspace when your school access is active.' };
  } catch { return failed; }
}
