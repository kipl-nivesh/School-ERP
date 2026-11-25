'use client';

import { useActionState } from 'react';
import { saveTeacherAnnouncement } from '@/app/staff/teacher-announcement-actions';

export function TeacherAnnouncementForm({ school, id, archive = false }: { school: string; id: string; archive?: boolean }) {
  const [state, action, pending] = useActionState(saveTeacherAnnouncement, { ok: false, message: '' });
  return <form action={action} aria-busy={pending}>
    <input type="hidden" name="school" value={school} />
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="intent" value={archive ? 'archive' : 'publish'} />
    <fieldset disabled={pending || state.ok}>
      {!archive && <>
        <label>Title<input name="title" required minLength={3} maxLength={200} /></label>
        <label>Message<textarea name="content" required minLength={5} maxLength={5000} /></label>
      </>}
      <button type="submit">{pending ? 'Saving…' : archive ? 'Archive this announcement' : 'Publish to school staff'}</button>
    </fieldset>
    {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
