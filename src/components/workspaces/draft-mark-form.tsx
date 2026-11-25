'use client';

import { useActionState } from 'react';
import { saveDraftMark } from '@/app/staff/draft-mark-actions';

export function DraftMarkForm({ school, exam, student, score, max, label }: {
  school: string; exam: string; student: string; score: number | null; max: number; label: string;
}) {
  const [state, action, pending] = useActionState(saveDraftMark, { ok: false, message: '' });
  return <form action={action} aria-busy={pending}>
    <input type="hidden" name="school" value={school} />
    <input type="hidden" name="exam" value={exam} />
    <input type="hidden" name="student" value={student} />
    <input type="hidden" name="expected" value={score ?? ''} />
    <input aria-label={`Draft mark for ${label}`} name="score" type="number" min="0" max={max}
      step="0.01" required defaultValue={score ?? ''} disabled={pending} />
    <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save draft mark'}</button>
    {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
  </form>;
}
