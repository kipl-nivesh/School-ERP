'use client';
import { useActionState } from 'react';
import Image from 'next/image';
import { applicantMfa } from './actions';
export function ApplicantMfa({ registration }: { registration: string }) {
  const [state, action, pending] = useActionState(applicantMfa, { message: '' });
  return <form action={action}><input type="hidden" name="registration" value={registration}/><p role="status">{state.message}</p>
    {state.qr && <Image src={state.qr} width={200} height={200} alt="Authenticator setup code" unoptimized/>}
    {state.factor ? <><input type="hidden" name="factor" value={state.factor}/><label>Authenticator code <input name="code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6}/></label><button name="intent" value="verify" disabled={pending}>Verify authenticator</button></>
      : <button name="intent" value="enroll" disabled={pending}>Set up authenticator</button>}
  </form>;
}
