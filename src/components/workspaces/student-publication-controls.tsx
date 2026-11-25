'use client';

import { useActionState, useState } from 'react';
import { saveStudentPublication } from '@/app/staff/student-publication-actions';

type Publication = { id: string; title: string; status: string; detail: string };

function StatusForm({ kind, record }: { kind: 'exam' | 'material'; record: Publication }) {
  const [result, action, pending] = useActionState(saveStudentPublication, { ok: false, message: '' });
  return <form action={action} className="flex flex-wrap gap-3">
    <input type="hidden" name="publication" value={kind} />
    <input type="hidden" name="id" value={record.id} />
    {record.status !== 'archived' && <>
      <button disabled={pending} name="status" value={record.status === 'draft' ? 'published' : 'draft'}>
        {record.status === 'draft' ? 'Publish' : 'Unpublish'}
      </button>
      <button disabled={pending} name="status" value="archived">Archive</button>
    </>}
    {result.message && <p role={result.ok ? 'status' : 'alert'}>{result.message}</p>}
  </form>;
}

export function StudentPublicationControls({ kind, records, sections, classes }: {
  kind: 'exam' | 'material'; records: Publication[]; sections: { id: string; label: string }[]; classes: { id: string; label: string }[];
}) {
  const [audience, setAudience] = useState('section');
  const [result, action, pending] = useActionState(saveStudentPublication, { ok: false, message: '' });
  return <section className="space-y-4">
    <h2>{kind === 'exam' ? 'Publish Student exam schedules' : 'Publish Student documents and study materials'}</h2>
    <form action={action} className="grid gap-3" aria-busy={pending}>
      <input type="hidden" name="publication" value={kind} />
      <label>Title<input name="title" maxLength={160} required /></label>
      {kind === 'exam' ? <>
        <label>Subject code<input name="subject" maxLength={30} required /></label>
        <label>Exam date<input name="date" type="date" required /></label>
        <label>Start time<input name="start" type="time" /></label>
        <label>End time<input name="end" type="time" /></label>
        <label>Venue<input name="venue" maxLength={160} /></label>
      </> : <>
        <label>Type<select name="materialKind"><option value="document">Document</option><option value="study_material">Study material</option></select></label>
        <label>Audience<select name="audience" value={audience} onChange={event => setAudience(event.target.value)}>
          <option value="school">Whole school</option><option value="class">Entire class</option>
          <option value="section">One section</option><option value="student">Individual Student</option>
        </select></label>
        {audience === 'class' && <label>Class<select name="classroom" required>
          <option value="">Choose class</option>{classes.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
        </select></label>}
        {audience === 'student' && <label>Student registration number<input name="registration" maxLength={80} required /></label>}
        <label>Content<textarea name="content" maxLength={20000} required /></label>
      </>}
      {(kind === 'exam' || audience === 'section') && <label>Class and section<select name="section" required>
        <option value="">Choose section</option>{sections.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
      </select></label>}
      <button disabled={pending} type="submit" name="status" value="draft">{pending ? 'Saving…' : 'Save draft'}</button>
      {result.message && <p role={result.ok ? 'status' : 'alert'}>{result.message}</p>}
    </form>
    {records.length ? <ul className="grid gap-4">{records.map(row => <li key={row.id}>
      <strong>{row.title}</strong><p>{row.detail} · {row.status}</p><StatusForm kind={kind} record={row} />
    </li>)}</ul> : <p>No publications yet.</p>}
  </section>;
}
