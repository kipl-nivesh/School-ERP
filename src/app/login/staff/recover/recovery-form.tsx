'use client';
import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { finishRecovery, requestRecovery } from './actions';

export function RecoveryForm({ code }: { code: string }) {
  const [requested, request, requesting] = useActionState(requestRecovery, { ok: false, message: '' });
  const [finished, finish, finishing] = useActionState(finishRecovery, { ok: false, message: '' });
  useEffect(() => { if (code) window.history.replaceState(null, '', '/login/staff/recover'); }, [code]);
  const inputStyle = 'mt-1 block w-full rounded-lg border border-slate-300 p-2';
  return <main className="mx-auto max-w-md space-y-6 p-6">
    <h1 className="text-2xl font-bold">Recover your staff account</h1>
    {!code ? <form action={request} className="space-y-4">
      <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required className={inputStyle} /></label>
      <button disabled={requesting} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Send recovery email</button>
      <p role="status">{requested.message}</p>
    </form> : <form action={finish} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <label>New password (at least 12 characters)<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className={inputStyle} /></label>
      <label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required className={inputStyle} /></label>
      <label>Authenticator code, if enrolled<input name="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" className={inputStyle} /></label>
      <p>If you have lost your authenticator, contact your administrator. An email link cannot remove MFA.</p>
      <button disabled={finishing || finished.ok} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Set password and sign out</button>
      <p role="status">{finished.message}</p>
      <p>If this attempt fails, request a new email before trying again.</p>
    </form>}
    <Link href="/login/staff">Back to staff sign-in</Link>
  </main>;
}
