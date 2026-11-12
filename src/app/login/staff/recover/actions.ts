'use server';
import { staffClient, staffRequestsEnabled } from '@/lib/staff/server';
import { completeRecovery, recoveryOrigin, RECOVERY_FAILURE } from '@/lib/staff/recovery';

const field = (form: FormData, name: string) => typeof form.get(name) === 'string' ? String(form.get(name)) : '';
export async function requestRecovery(_state: { ok: boolean; message: string }, form: FormData) {
  const origin = recoveryOrigin(process.env.AUTH_APP_ORIGIN, process.env.NODE_ENV === 'production');
  if (!staffRequestsEnabled() || !origin) return { ok: false, message: 'Account recovery is not configured. Contact your administrator.' };
  const email = field(form, 'email').trim();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: 'Enter a valid email address.' };
  try { await (await staffClient(true)).auth.resetPasswordForEmail(email, { redirectTo: origin + '/login/staff/recover' }); }
  catch { /* Same response for nonexistent accounts, provider throttling and delivery failures. */ }
  return { ok: true, message: 'If recovery is available for that account, check its email. Open the link in this browser.' };
}

export async function finishRecovery(_state: { ok: boolean; message: string }, form: FormData) {
  if (!staffRequestsEnabled()) return { ok: false, message: RECOVERY_FAILURE };
  try {
    const client = await staffClient(true);
    return await completeRecovery({ code: field(form,'code'), password: field(form,'password'), confirmation: field(form,'confirmation'), totp: field(form,'totp') }, {
      exchange: async code => {
        let recovery = false;
        const { data: { subscription } } = client.auth.onAuthStateChange(event => {
          if (event === 'PASSWORD_RECOVERY') recovery = true;
        });
        try {
          const result = await client.auth.exchangeCodeForSession(code);
          if (result.error) throw new Error('Recovery exchange denied');
          return { userId: result.data.user?.id ?? null, recovery };
        } finally { subscription.unsubscribe(); }
      },
      confirmedUser: async () => { const r = await client.auth.getUser(); return !r.error && r.data.user?.email_confirmed_at ? r.data.user.id : null; },
      staffScope: async () => {
        const r = await client.rpc('staff_recovery_scope');
        return !r.error && r.data?.eligible === true && typeof r.data.requires_mfa === 'boolean' ? { requiresMfa: r.data.requires_mfa } : null;
      },
      factors: async () => {
        const r = await client.auth.mfa.listFactors(); if (r.error) throw new Error('Factor lookup denied');
        return r.data.all.map(f => ({ id: f.id, type: f.factor_type, verified: f.status === 'verified' }));
      },
      verifyFactor: async (factorId, code) => !(await client.auth.mfa.challengeAndVerify({ factorId, code })).error,
      updatePassword: async password => !(await client.auth.updateUser({ password })).error,
      signOut: async scope => !(await client.auth.signOut({ scope })).error,
    });
  } catch { return { ok: false, message: RECOVERY_FAILURE }; }
}
