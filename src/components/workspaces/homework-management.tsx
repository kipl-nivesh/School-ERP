'use client';

import { useActionState, useId, useRef, useState } from 'react';
import { saveAcademic } from '@/app/staff/academic-actions';
import { manageAcademicRecord } from '@/app/staff/management-actions';
import { filterHomework } from '@/app/staff/homework-workspace-actions';
import { homeworkErrors } from '@/lib/services/homework-fields';
import type { AcademicOptions } from '@/lib/services/academic-directory';
import type { HomeworkPage, HomeworkRow } from '@/lib/services/homework-workspace';
import styles from './academic-management.module.css';
import homework from './homework-management.module.css';

type Identifiers = { create: string; edit: string };
const states = { active: 'Active', closed: 'Closed' };

export function HomeworkManagement({ initial, options, identifiers }: {
  initial?: HomeworkPage; options: AcademicOptions; identifiers?: Identifiers;
}) {
  const [selection, select] = useState<{ row: HomeworkRow; key: string }>();
  const editor = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  return <>
    {initial && <HomeworkDirectory initial={initial} options={options} onEdit={identifiers ? row => {
      if (busy) return;
      select({ row, key: crypto.randomUUID() });
      requestAnimationFrame(() => editor.current?.focus());
    } : undefined} busy={busy} />}
    {identifiers && <>
      <HomeworkForm requestId={identifiers.create} options={options} />
      <section ref={editor} tabIndex={-1} aria-label="Homework editor">
        <HomeworkForm key={selection?.key ?? identifiers.edit} requestId={selection?.key ?? identifiers.edit}
          row={selection?.row} options={options} editing onBusy={setBusy} />
      </section>
    </>}
  </>;
}

function HomeworkDirectory({ initial, options, onEdit, busy }: {
  initial: HomeworkPage; options: AcademicOptions; onEdit?: (row: HomeworkRow) => void; busy: boolean;
}) {
  const [result, action, pending] = useActionState(filterHomework, initial);
  const [filters, setFilters] = useState({ search: '', subject: '', status: '', year: '', classId: '', section: '' });
  const sections = options.sections.filter(item =>
    (!filters.year || item.yearId === filters.year) && (!filters.classId || item.classId === filters.classId));
  const field = (name: keyof typeof filters) => ({
    name, value: filters[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFilters(current => ({ ...current, [name]: value, ...(name === 'year' || name === 'classId' ? { section: '' } : {}) }));
    },
  });
  const labelFor = (sectionId: string) => {
    const section = options.sections.find(item => item.id === sectionId);
    return section ? [options.classes.find(item => item.id === section.classId)?.label, section.label,
      options.years.find(item => item.id === section.yearId)?.label].filter(Boolean).join(' · ') : sectionId;
  };
  if (result.kind === 'denied') return <p role="status">This membership cannot read the requested homework records.</p>;

  return <section className={styles.card} aria-labelledby="homework-directory" aria-busy={pending}>
    <h2 id="homework-directory">Homework directory</h2>
    <form action={action} className={styles.controls}>
      <label>Search title<input {...field('search')} type="search" maxLength={80} /></label>
      <label>Subject code<input {...field('subject')} maxLength={80} /></label>
      <label>Status<select {...field('status')}><option value="">All statuses</option>
        {Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {!!options.years.length && <label>Academic year<select {...field('year')}><option value="">All years</option>
        {options.years.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select></label>}
      {!!options.classes.length && <label>Class<select {...field('classId')}><option value="">All classes</option>
        {options.classes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select></label>}
      <label>Section ID or placement<input {...field('section')} maxLength={36} list="homework-directory-sections" />
        <datalist id="homework-directory-sections">{sections.map(item => <option key={item.id} value={item.id}>{labelFor(item.id)}</option>)}</datalist>
      </label>
      <button disabled={pending}>Apply filters</button>
    </form>
    {pending && <p role="status">Loading homework…</p>}
    {!pending && result.kind === 'invalid' && <p className={styles.error} role="alert">Check the search and filter values.</p>}
    {!pending && result.kind === 'error' && <p className={styles.error} role="alert">Homework could not be loaded. Apply filters to try again.</p>}
    {result.kind === 'ready' && <>
      {result.rows.length ? <div className={styles.table} role="region" aria-label="Homework records" tabIndex={0}>
        <table><thead><tr><th scope="col">Homework</th><th scope="col">Placement</th><th scope="col">Due</th><th scope="col">Status</th></tr></thead>
          <tbody>{result.rows.map(row => <tr key={row.id}>
            <th scope="row"><details>
              <summary>{row.title}</summary>
              <div className={homework.detail}>
                <p>{row.description || 'No instructions recorded.'}</p>
                <dl><dt>Subject</dt><dd>{row.subject_code}</dd><dt>Maximum points</dt><dd>{row.max_points}</dd>
                  <dt>Assigned date</dt><dd>{row.assigned_date}</dd><dt>Homework ID</dt><dd>{row.id}</dd>
                  <dt>Revision</dt><dd>{row.revision}</dd></dl>
                {onEdit && <button type="button" disabled={busy} onClick={() => onEdit(row)}>Edit homework</button>}
              </div>
            </details></th>
            <td>{labelFor(row.section_id)}</td><td><time dateTime={row.due_date}>{row.due_date}</time></td>
            <td><span className={homework.status} data-state={row.status}>{states[row.status]}</span></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className={styles.notice} role="status">No accessible homework matches these filters.</p>}
      <form action={action} className={styles.pager} aria-label="Homework pagination">
        {Object.entries(result.filters).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <button name="page" value={result.page - 1} disabled={pending || result.page === 1}>Previous</button>
        <span aria-live="polite">Page {result.page}</span>
        <button name="page" value={result.page + 1} disabled={pending || !result.next}>Next</button>
      </form>
    </>}
  </section>;
}

const labels: Record<string, string> = {
  section: 'Section ID or placement', subject: 'Subject code', title: 'Title', description: 'Instructions', due: 'Due date',
  points: 'Maximum points', recordId: 'Homework ID', revision: 'Current revision', status: 'Status',
};

export function HomeworkForm({ requestId, options, editing = false, row, onBusy, assignedSubjects }: {
  requestId: string; options: AcademicOptions; editing?: boolean; row?: HomeworkRow; onBusy?: (busy: boolean) => void;
  assignedSubjects?: { section: string; subject: string }[];
}) {
  const [draft, setDraft] = useState<Record<string, string>>(row ? {
    recordId: row.id, revision: String(row.revision), title: row.title, description: row.description,
    due: row.due_date, points: String(row.max_points), status: row.status,
  } : {});
  const [year, setYear] = useState('');
  const [classId, setClassId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const id = useId();
  const [state, action, pending] = useActionState(async (previous: { ok: boolean; message: string }, form: FormData) => {
    try {
      return await (editing ? manageAcademicRecord : saveAcademic)(previous, form);
    } catch {
      return { ok: false, message: 'The save could not be confirmed. Check homework records before submitting again.' };
    } finally { lock.current = false; onBusy?.(false); }
  }, { ok: false, message: '' });
  const names = editing ? ['recordId', 'revision', 'title', 'description', 'due', 'points', 'status'] :
    ['section', 'subject', 'title', 'description', 'due', 'points'];
  const sections = options.sections.filter(item => (!year || item.yearId === year) && (!classId || item.classId === classId));

  return <details open={row ? true : undefined} className={styles.card}>
    <summary>{editing ? 'Edit, close or reopen homework' : 'Create homework'}</summary>
    <form action={action} noValidate aria-busy={pending} onSubmit={event => {
      if (lock.current || pending || state.ok) { event.preventDefault(); return; }
      const values = new FormData(event.currentTarget);
      const invalid = homeworkErrors(values, editing, row?.assigned_date);
      setErrors(invalid);
      if (Object.keys(invalid).length) { event.preventDefault(); return; }
      const status = values.get('status');
      if (editing && status !== row?.status &&
          !window.confirm(status === 'closed' ? 'Close this homework assignment?' : 'Save this homework assignment as Active?')) {
        event.preventDefault();
        return;
      }
      lock.current = true;
      onBusy?.(true);
    }}>
      <input type="hidden" name="kind" value="homework" />
      <input type="hidden" name={editing ? 'requestId' : 'id'} value={requestId} />
      <fieldset disabled={pending || state.ok} className={styles.controls}>
        {!editing && !!options.years.length && <label>Academic year<select value={year} onChange={event => {
          setYear(event.target.value); setDraft(current => ({ ...current, section: '', subject: assignedSubjects ? '' : current.subject }));
        }}><option value="">All available years</option>{options.years.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        {!editing && !!options.classes.length && <label>Class<select value={classId} onChange={event => {
          setClassId(event.target.value); setDraft(current => ({ ...current, section: '', subject: assignedSubjects ? '' : current.subject }));
        }}><option value="">All available classes</option>{options.classes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        {names.map(name => {
          const props = { name, value: draft[name] ?? '', 'aria-invalid': !!errors[name],
            'aria-describedby': errors[name] ? id + name : undefined,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
              const value = event.target.value;
              setDraft(current => ({ ...current, [name]: value, ...(assignedSubjects && name === 'section' ? { subject: '' } : {}) }));
            } };
          return <label key={name} className={name === 'description' ? homework.instructions : undefined}>{labels[name]}
            {name === 'description' ? <textarea {...props} className={homework.textarea} rows={4} maxLength={10000} /> :
              name === 'status' ? <select {...props}><option value="">Select status</option>
                {Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> :
              assignedSubjects && name === 'section' ? <select {...props}>
                <option value="">Choose an assigned section</option>
                {[...new Set(assignedSubjects.map(choice => choice.section))].filter(section =>
                  (!year && !classId) || sections.some(option => option.id === section)).map(section => {
                  const option = sections.find(item => item.id === section);
                  const label = option ? [options.classes.find(item => item.id === option.classId)?.label, option.label,
                    options.years.find(item => item.id === option.yearId)?.label].filter(Boolean).join(' · ') : section;
                  return <option key={section} value={section}>{label}</option>;
                })}
              </select> : assignedSubjects && name === 'subject' ? <select {...props}>
                <option value="">Choose an assigned subject</option>
                {assignedSubjects.filter(choice => choice.section === draft.section).map(choice =>
                  <option key={choice.subject}>{choice.subject}</option>)}
              </select> : <input {...props} readOnly={!!assignedSubjects && (name === 'recordId' || name === 'revision')} list={name === 'section' ? id + 'sections' : undefined}
                type={name === 'due' ? 'date' : name === 'points' || name === 'revision' ? 'number' : 'text'} />}
            {errors[name] && <span id={id + name} className={styles.error}>{errors[name]}</span>}
          </label>;
        })}
        {!editing && !assignedSubjects && <datalist id={id + 'sections'}>{sections.map(item => <option key={item.id} value={item.id}>
          {[options.classes.find(value => value.id === item.classId)?.label, item.label,
            options.years.find(value => value.id === item.yearId)?.label].filter(Boolean).join(' · ')}
        </option>)}</datalist>}
      </fieldset>
      {editing && <p className={styles.help}>Use the latest revision and keep the current fields when only changing status. Reload the directory if the revision has changed.</p>}
      {!editing && options.partial && <p className={styles.help}>{assignedSubjects
        ? 'The assignment selector shows up to 200 section and subject assignments.'
        : 'Some sections may be absent from the suggestions. You can enter a verified section ID.'}</p>}
      {state.ok ? <button type="button" onClick={() => window.location.reload()}>Reload homework</button> :
        <button type="submit" disabled={pending}>{pending ? 'Saving…' : editing ? 'Save homework changes' : 'Create homework'}</button>}
      {Object.keys(errors).length > 0 && <p role="alert" className={styles.error}>Review the highlighted fields.</p>}
      {state.message && <p role={state.ok ? 'status' : 'alert'} className={state.ok ? styles.notice : styles.error}>{state.message}</p>}
    </form>
  </details>;
}
