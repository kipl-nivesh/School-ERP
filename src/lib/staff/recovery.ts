export const RECOVERY_FAILURE = 'Recovery could not be completed. Request a new recovery email or contact your administrator.';
export function recoveryOrigin(value: string | undefined, production: boolean): string | null {
  if (!value || value !== value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (url.protocol !== 'https:' && (production || url.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}
export interface RecoveryDependencies {
  exchange(code: string): Promise<{ userId: string | null; recovery: boolean }>;
  confirmedUser(): Promise<string | null>;
  staffScope(): Promise<{ requiresMfa: boolean } | null>;
  factors(): Promise<readonly { id: string; type: string; verified: boolean }[]>;
  verifyFactor(id: string, code: string): Promise<boolean>;
  updatePassword(password: string): Promise<boolean>;
  signOut(scope: 'local' | 'global'): Promise<boolean>;
}
/** A current session alone is insufficient: every attempt redeems a fresh PKCE recovery code. */
export async function completeRecovery(input: { code: string; password: string; confirmation: string; totp: string }, deps: RecoveryDependencies) {
  if (!/^[a-zA-Z0-9_-]{16,256}$/.test(input.code) || input.password.length < 12 || input.password.length > 1024 ||
    /[\x00\r\n]/.test(input.password) || input.password !== input.confirmation) return { ok: false, message: RECOVERY_FAILURE };
  let exchanged = false;
  let updated = false;
  try {
    exchanged = true;
    const evidence = await deps.exchange(input.code);
    if (!evidence.recovery || !evidence.userId || await deps.confirmedUser() !== evidence.userId) return { ok: false, message: RECOVERY_FAILURE };
    const scope = await deps.staffScope();
    if (!scope) return { ok: false, message: RECOVERY_FAILURE };
    const verified = (await deps.factors()).filter(f => f.verified);
    if (scope.requiresMfa && !verified.length) return { ok: false, message: RECOVERY_FAILURE };
    if (verified.length) {
      const factor = verified.find(f => f.type === 'totp');
      if (!factor || !/^[0-9]{6}$/.test(input.totp) || !await deps.verifyFactor(factor.id, input.totp)) return { ok: false, message: RECOVERY_FAILURE };
    }
    if (!await deps.updatePassword(input.password)) return { ok: false, message: RECOVERY_FAILURE };
    updated = true;
    if (!await deps.signOut('global')) return { ok: false, message: 'Password changed, but session revocation could not be confirmed. Contact your administrator.' };
    return { ok: true, message: 'Password changed. Sign in again. Existing school restrictions still apply.' };
  } catch {
    return { ok: false, message: updated ? 'Password changed, but session revocation could not be confirmed. Contact your administrator.' : RECOVERY_FAILURE };
  } finally {
    if (exchanged) { try { await deps.signOut('local'); } catch { /* Never report a provider error detail. */ } }
  }
}
