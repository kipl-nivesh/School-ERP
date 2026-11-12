'use client';
import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { acceptInvitation } from './actions';
export default function InvitationPage() {
  const tokenInput = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(acceptInvitation, { message: '' });
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (value && /^[0-9a-f]{64}$/.test(value) && tokenInput.current) { tokenInput.current.value = value; window.history.replaceState(null, '', window.location.pathname); }
  }, []);
  return <main style={{ padding: '2rem' }}><h1>Accept staff invitation</h1><p>Enter the credentials for your confirmed invited account. If you are already signed in with that account, leave both fields blank.</p>
    <form action={action} className="grid max-w-md gap-3">
      <input ref={tokenInput} type="hidden" name="token" defaultValue=""/>
      <label>Email <input name="email" type="email" autoComplete="username" maxLength={254} /></label>
      <label>Password <input name="password" type="password" autoComplete="current-password" maxLength={1024} /></label>
      <button disabled={pending}>Accept invitation</button><p role="status">{state.message}</p>
    </form>
    <Link href="/staff/select-school">Select your school</Link>
  </main>;
}
