'use client';

import { useActionState, useState } from 'react';
import { manageStudentPortal } from '@/app/staff/student-portal-actions';

type Intent = 'link' | 'activate' | 'initialize' | 'reset' | 'suspend';

export function StudentPortalControls({ student, permissions }: { student: string; permissions: readonly Intent[] }) {
  const [intent, setIntent] = useState<Intent>(permissions[0] ?? 'activate');
  const [state, action, pending] = useActionState(manageStudentPortal, { ok: false, message: '' });
  if (!permissions.length) return null;
  return <form action={action} aria-busy={pending}>
    <fieldset disabled={pending}>
      <legend>Student portal access</legend>
      <input type="hidden" name="student" value={student} />
      <label>Action
        <select name="intent" value={intent} onChange={event => setIntent(event.target.value as Intent)}>
          {permissions.includes('link') && <option value="link">Link verified Student identity</option>}
          {permissions.includes('activate') && <option value="activate">Activate or reactivate</option>}
          {permissions.includes('initialize') && <option value="initialize">Initialize portal entitlement</option>}
          {permissions.includes('reset') && <option value="reset">Reset PIN</option>}
          {permissions.includes('suspend') && <option value="suspend">Suspend access</option>}
        </select>
      </label>
      {intent === 'link' && <label>Verified Student email
        <input type="email" name="email" autoComplete="off" maxLength={254} required />
      </label>}
      {intent === 'link' && <p>Confirm the email belongs to this Student before linking it.</p>}
      {(intent === 'activate' || intent === 'reset') && <label>New six-digit PIN
        <input type="password" name="pin" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required />
      </label>}
      {intent === 'initialize' && <p>Initialize access for a linked Student with an active portal. Existing trial dates are preserved.</p>}
      {intent === 'suspend' && <p>Suspension ends existing Student sessions.</p>}
      <button type="submit">{pending ? 'Saving…' : 'Update portal access'}</button>
    </fieldset>
    {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
