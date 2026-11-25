'use client';
import { useActionState, useState } from 'react';
import { manageAcademicRecord } from '@/app/staff/management-actions';
import type { AcademicOptions } from '@/lib/services/academic-directory';
import { managementForms, type ManagementKind } from '@/lib/services/management-contracts';

const labels: Record<string,string> = { classId:'Class ID',yearId:'Academic year ID',teacherId:'Teacher profile ID',sectionId:'Section ID',validFrom:'Valid from',validUntil:'Valid until (optional)',revision:'Current revision (0 for a new timetable slot)',subject:'Subject code',period:'Period number',start:'Start time',end:'End time',due:'Due date',points:'Maximum points' };
export function LiveManagementForm({ kind, requestId, recordId, options, staff }: {
  kind: ManagementKind; requestId: string; recordId: string;
  options?: AcademicOptions; staff?: { id: string; label: string }[];
}) {
  const [request] = useState(requestId);
  const [target] = useState(recordId);
  const [state, action, pending] = useActionState(manageAcademicRecord, { ok:false,message:'' });
  const definition = managementForms[kind];
  const choices = {
    classId: options?.classes, yearId: options?.years,
    sectionId: options?.sections.map(section => ({
      id: section.id,
      label: [options.classes.find(entry => entry.id === section.classId)?.label,
        section.label, options.years.find(entry => entry.id === section.yearId)?.label].filter(Boolean).join(' · '),
    })),
  };
  return <details className="rounded-2xl border border-slate-200 bg-white p-5">
    <summary className="cursor-pointer text-lg font-semibold">{definition.title}</summary>
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="requestId" value={request} />
      {kind === 'homework' || kind === 'timetable' ? <label className="block">Record ID<input name="recordId" required defaultValue={kind === 'homework' ? '' : target} className="block w-full rounded border p-2" /></label> : <input type="hidden" name="recordId" value={target} />}
      <div className="grid gap-4 sm:grid-cols-2">{definition.fields.map(field => {
        const items = field === 'classId' || field === 'yearId' || field === 'sectionId' ? choices[field] : undefined;
        return <label key={field} className="block text-sm font-medium">
        {labels[field] || field}
        {items ? <select name={field} required defaultValue="" className="block rounded border p-2">
          <option value="" disabled>Select {labels[field]}</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select> : field === 'day' ? <select name={field} className="block rounded border p-2">{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=><option key={day}>{day}</option>)}</select> :
          field === 'status' ? <select name={field} className="block rounded border p-2"><option>active</option><option>closed</option></select> :
          <input name={field} required={field !== 'validUntil'} maxLength={field === 'description' ? 10000 : 254}
            list={field === 'teacherId' && staff?.length ? target + '-staff' : undefined}
            type={['due','validFrom','validUntil'].includes(field) ? 'date' : ['start','end'].includes(field) ? 'time' : ['revision','points','period'].includes(field) ? 'number' : 'text'}
            defaultValue={field === 'revision' && kind === 'timetable' ? '0' : undefined} className="mt-1 block w-full rounded border p-2" />}
      </label>})}</div>
      {staff?.length && kind === 'assignment' ? <datalist id={target + '-staff'}>
        {staff.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </datalist> : null}
      <button disabled={pending || state.ok} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
      <p role="status">{state.message}</p>
    </form>
  </details>;
}
