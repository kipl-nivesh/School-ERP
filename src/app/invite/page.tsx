'use client';

import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { acceptInvitation } from './actions';

export default function InvitationPage() {
  const tokenInput = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(acceptInvitation, { message: '' });
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (value && /^[0-9a-f]{64}$/.test(value) && tokenInput.current) {
      tokenInput.current.defaultValue = value;
      tokenInput.current.value = value;
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  return <main style={{ padding: '2rem' }}>
    <h1>Accept staff invitation</h1>
    <p>For a new account, choose a password of at least 12 characters and confirm your email. Reopen the original invitation to accept with your confirmed account.</p>
    <form action={action} className="grid max-w-md gap-3">
      <input ref={tokenInput} type="hidden" name="token" defaultValue="" />
      <label>Invited email <input name="email" type="email" autoComplete="username" maxLength={254} /></label>
      <label>Password <input name="password" type="password" autoComplete="new-password" maxLength={1024} /></label>
      <label>Repeat password for new account setup <input name="confirmation" type="password" autoComplete="new-password" maxLength={1024} /></label>
      <button name="intent" value="setup" disabled={pending}>Set up new account</button>
      <button name="intent" value="accept" disabled={pending}>Accept confirmed account</button>
      <p role="status">{pending ? 'Working…' : state.message}</p>
    </form>
    <Link href="/login/staff">Staff sign-in</Link>
  </main>;
}
