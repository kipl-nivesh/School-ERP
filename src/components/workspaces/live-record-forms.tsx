'use client';
import { useActionState, useState } from 'react';
import { saveAdmission, saveCollection } from '@/app/staff/record-actions';
import type { AcademicOptions } from '@/lib/services/academic-directory';

function Field({ name, label, type = 'text', required = true }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required}
    maxLength={254} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>;
}

export function LiveAdmissionForm({ initialRequestId, options }: { initialRequestId: string; options?: AcademicOptions }) {
  const [state, action, pending] = useActionState(saveAdmission, { ok: false, message: '' });
  const [requestId] = useState(initialRequestId);
  const [classId, setClassId] = useState('');
  const yearLabels = new Map(options?.years.map(year => [year.id, year.label]));
  return <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold">Admit a student</h2>
    <input type="hidden" name="requestId" value={requestId} />
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="fullName" label="Student name" /><Field name="dateOfBirth" label="Date of birth" type="date" />
      <label>Gender<select name="gender" required className="m-2 rounded border p-2"><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
      {options ? <>
        <label>Class<select required name="classId" value={classId} onChange={event => setClassId(event.target.value)}>
          <option value="">Choose class</option>
          {options.classes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label>Section<select key={classId} required name="sectionId" disabled={!classId}>
          <option value="">Choose section</option>
          {options.sections.filter(item => item.classId === classId).map(item =>
            <option key={item.id} value={item.id}>{item.label}{yearLabels.get(item.yearId) ? ' · ' + yearLabels.get(item.yearId) : ''}</option>)}
        </select></label>
      </> : <><Field name="classId" label="Class ID" /><Field name="sectionId" label="Section ID" /></>}
      <Field name="guardianName" label="Guardian name" /><Field name="guardianPhone" label="Guardian phone" type="tel" />
      <Field name="guardianEmail" label="Guardian email" type="email" required={false} />
    </div>
    <p className="text-sm text-slate-600">Guardian details are stored as an unverified contact. Admission does not create a login.</p>
    {options && !options.sections.length && <p role="status">No accessible enrollment sections are available.</p>}
    <button disabled={pending || state.ok || (!!options && !options.sections.length)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save admission'}</button>
    {state.ok && <p>Admission saved. Reload this page to start a different admission.</p>}
    <p role="status">{state.message}</p>
  </form>;
}

export function LiveCollectionForm() {
  const [state, action, pending] = useActionState(saveCollection, { ok: false, message: '' });
  return <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold">Record a fee collection</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="studentId" label="Student ID" /><Field name="invoiceId" label="Invoice ID" />
      <Field name="amountPaise" label="Amount in paise" type="number" />
      <label>Payment method<select name="paymentMethod" className="m-2 rounded border p-2">{['cash','upi','card','bank_transfer','cheque'].map(method => <option key={method}>{method}</option>)}</select></label>
      <Field name="transactionReference" label="Transaction reference" /><Field name="idempotencyKey" label="Unique payment request key (8–128 characters)" />
      <Field name="notes" label="Notes" required={false} />
    </div>
    <p className="text-sm text-slate-600">Reuse the request key if the same payment needs to be retried. Use a new key for each different payment.</p>
    <button disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Record collection'}</button>
    <p role="status">{state.message}</p>
  </form>;
}
