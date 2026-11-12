'use client';
import { useActionState, useState } from 'react';
import { saveAcademic } from '@/app/staff/academic-actions';

export function LiveAcademicForm({ kind, requestId }: { kind: 'attendance' | 'homework'; requestId: string }) {
  const [id] = useState(requestId);
  const [state, action, pending] = useActionState(saveAcademic, { ok: false, message: '' });
  const fields = kind === 'attendance'
    ? [{ name: 'student', label: 'Student ID', type: 'text' }, { name: 'remarks', label: 'Remarks', type: 'text' }]
    : [{ name: 'subject', label: 'Assigned subject code', type: 'text' }, { name: 'title', label: 'Title', type: 'text' },
      { name: 'description', label: 'Instructions', type: 'text' }, { name: 'due', label: 'Due date', type: 'date' }, { name: 'points', label: 'Maximum points', type: 'number' }];
  return <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold">{kind === 'attendance' ? 'Record today’s attendance' : 'Assign homework'}</h2>
    <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
    <div className="grid gap-4 sm:grid-cols-2">
      {[{ name: 'section', label: 'Section ID', type: 'text' }, ...fields].map(field => <label key={field.name} className="block text-sm font-medium">
        {field.label}<input {...field} required={field.name !== 'remarks'} maxLength={field.name === 'description' ? 10000 : 200}
          className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
      </label>)}
      {kind === 'attendance' && <label>Status<select name="status" className="m-2 rounded border p-2">
        {['present','absent','late','excused'].map(status => <option key={status}>{status}</option>)}
      </select></label>}
    </div>
    <button disabled={pending || (kind === 'homework' && state.ok)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
    <p role="status">{state.message}{kind === 'homework' && state.ok ? ' Reload to create another assignment.' : ''}</p>
  </form>;
}
