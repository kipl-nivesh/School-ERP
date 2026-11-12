'use client';
import { useActionState } from 'react';
import { manageInvitation } from '@/app/staff/invitation-actions';

export function LiveInvitationForm() {
  const [state, action, pending] = useActionState(manageInvitation, { message: '' });
  return <details className="rounded-2xl border border-slate-200 bg-white p-5">
    <summary>Staff invitations</summary>
    <form action={action} className="grid gap-3 py-4">
      <label>Name <input name="name" required maxLength={160} /></label>
      <label>Email <input name="email" type="email" required maxLength={254} /></label>
      <label>Role <select name="role"><option value="teacher">Teacher</option><option value="accountant">Accountant</option></select></label>
      <button disabled={pending}>Create invitation</button>
    </form>
    {state.link && <label>Private invitation link <input className="block w-full" readOnly value={state.link} /></label>}
    <form action={action} className="grid gap-3 py-4">
      <input type="hidden" name="intent" value="revoke" />
      <label>Invitation ID <input key={state.id} name="id" required defaultValue={state.id} /></label>
      <button disabled={pending}>Revoke invitation</button>
    </form>
    <p role="status">{state.message}</p>
  </details>;
}
