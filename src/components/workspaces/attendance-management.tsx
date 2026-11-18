'use client';

import { useActionState, useRef, useState } from 'react';
import { filterAttendance } from '@/app/staff/attendance-workspace-actions';
import { saveAcademic } from '@/app/staff/academic-actions';
import { attendanceEntryErrors, attendanceStatuses } from '@/lib/services/attendance-fields';
import type { AttendancePlacement, AttendanceResult } from '@/lib/services/attendance-workspace';
import styles from './academic-management.module.css';
import attendanceStyles from './attendance-management.module.css';

type Draft = { section: string; student: string };

export function AttendanceManagement({ initial, placements, incomplete, canRead, canRoster, canWrite }: {
  initial: AttendanceResult | null; placements: AttendancePlacement[]; incomplete: boolean;
  canRead: boolean; canRoster: boolean; canWrite: boolean;
}) {
  const [result, filter, loading] = useActionState(
    async (previous: AttendanceResult | null, form: FormData) => filterAttendance(previous ?? { kind: 'invalid' }, form), initial,
  );
  const [mode, setMode] = useState(canRead ? 'history' : 'roster');
  const [year, setYear] = useState('');
  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('');
  const [manual, setManual] = useState(false);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Draft>({ section: '', student: '' });
  const entryHeading = useRef<HTMLHeadingElement>(null);
  const useMenus = !!placements.length && !manual;
  const classes = [...new Map(placements.filter(item => !year || item.yearId === year).map(item => [item.classId, item.className]))];
  const years = [...new Map(placements.map(item => [item.yearId, item.year]))];
  const sections = placements.filter(item => (!year || item.yearId === year) && (!classId || item.classId === classId));
  const appliedMode = result?.kind === 'ready' ? result.filters.mode : mode;

  return <>
    {(canRead || canRoster) && <section className={styles.card} aria-labelledby="attendance-read-heading" aria-busy={loading}>
      <h2 id="attendance-read-heading">{appliedMode === 'roster' ? 'Enrollment roster' : 'Attendance history'}</h2>
      <form action={filter} className={styles.controls}>
        <label>View
          <select name="mode" value={mode} onChange={event => setMode(event.target.value)}>
            {canRead && <option value="history">Attendance history</option>}
            {canRoster && <option value="roster">Enrollment roster</option>}
          </select>
        </label>
        {useMenus ? <>
          <label>Academic year<select value={year} onChange={event => {
            setYear(event.target.value); setClassId(''); setSection('');
          }}><option value="">All available years</option>{years.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Class<select value={classId} onChange={event => {
            setClassId(event.target.value); setSection('');
          }}><option value="">All available classes</option>{classes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Section<select name="section" value={section} onChange={event => setSection(event.target.value)} required={mode === 'roster'}>
            <option value="">{mode === 'roster' ? 'Select a section' : 'All sections'}</option>
            {sections.map(item => <option key={item.id} value={item.id}>{item.className} · {item.label} · {item.year}</option>)}
          </select></label>
        </> : <label>Section ID<input name="section" value={section} maxLength={36} required={mode === 'roster'} onChange={event => setSection(event.target.value)} /></label>}
        <label>{mode === 'roster' ? 'Enrollment date' : 'Attendance date'}
          <input name="date" type="date" value={date} required={mode === 'roster'} onChange={event => setDate(event.target.value)} />
        </label>
        <label>{canRoster ? 'Search name or registration number' : 'Student ID'}
          <input name="search" type="search" maxLength={80} value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        {mode === 'history' && <label>Status<select name="status" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {attendanceStatuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select></label>}
        <button disabled={loading}>Apply filters</button>
        {!!placements.length && <button type="button" onClick={() => {
          setManual(!manual); setSection(''); setYear(''); setClassId('');
        }}>{useMenus ? 'Enter section ID' : 'Use placement menus'}</button>}
      </form>
      {incomplete && <p className={styles.help}>Some placements may be missing from the menus. You can use a verified section ID.</p>}
      {useMenus && <p className={styles.help}>Year and class narrow the section menu. Select a section to filter records by placement.</p>}
      {result === null && <p className={styles.notice}>Choose a section and enrollment date to load a roster.</p>}
      {loading && <p role="status">Loading attendance records…</p>}
      {result?.kind === 'denied' && <p role="status">This membership cannot read the requested records.</p>}
      {result?.kind === 'invalid' && <p className={styles.error} role="alert">Check the date, section, status, and search fields.</p>}
      {result?.kind === 'error' && <p className={styles.error} role="alert">Records could not be loaded. Apply the filters again to retry.</p>}
      {result?.kind === 'ready' && <>
        {result.rows.length ? <div className={styles.table} role="region" aria-label={appliedMode === 'roster' ? 'Enrollment roster' : 'Attendance history'} tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Student</th><th scope="col">Section</th><th scope="col">Date</th>
              {appliedMode === 'history' && <th scope="col">Status</th>}
              {appliedMode === 'roster' && canWrite && <th scope="col">Action</th>}
            </tr></thead>
            <tbody>{result.rows.map((row, index) => <tr key={index}>
              <th scope="row">{row.name ?? row.student}{row.registration && <small className={attendanceStyles.secondary}>{row.registration}</small>}</th>
              <td>{placements.find(item => item.id === row.section)?.label ?? row.section}</td>
              <td><time dateTime={row.date}>{row.date}</time></td>
              {appliedMode === 'history' && <td>{row.status ? statusLabel(row.status) : '—'}</td>}
              {appliedMode === 'roster' && canWrite && <td><button type="button" onClick={() => {
                setSelected({ student: row.student, section: row.section });
                entryHeading.current?.focus();
              }}>Select student</button></td>}
            </tr>)}</tbody>
          </table>
        </div> : <p className={styles.notice} role="status">No accessible records match these filters.</p>}
        <form action={filter} className={styles.pager} aria-label="Attendance pagination">
          {Object.entries(result.filters).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <button name="page" value={result.page - 1} disabled={loading || result.page === 1}>Previous</button>
          <span aria-live="polite">Page {result.page}</span>
          <button name="page" value={result.page + 1} disabled={loading || !result.next}>Next</button>
        </form>
      </>}
    </section>}
    {canWrite && <AttendanceEntry selected={selected} placements={placements} heading={entryHeading} />}
  </>;
}

function statusLabel(status: string) {
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function AttendanceEntry({ selected, placements, heading }: {
  selected: Draft; placements: AttendancePlacement[]; heading: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [source, setSource] = useState(selected);
  const [draft, setDraft] = useState(selected);
  if (source !== selected) {
    setSource(selected);
    setDraft(selected);
  }
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const [result, action, pending] = useActionState(async (previous: { ok: boolean; message: string }, form: FormData) => {
    try {
      return await saveAcademic(previous, form);
    } catch {
      return { ok: false, message: 'The save could not be confirmed. Check attendance history before submitting again.' };
    } finally {
      lock.current = false;
    }
  }, { ok: false, message: '' });
  const fieldError = (key: string) => errors[key] && <span id={'attendance-error-' + key} className={styles.error}>{errors[key]}</span>;

  return <section className={styles.card} aria-labelledby="attendance-entry-heading">
    <h2 id="attendance-entry-heading" ref={heading} tabIndex={-1}>Record attendance</h2>
    <p className={styles.help}>The database sets the recording date. The date filter only affects history and roster results. Saving a student again can update that student’s record for the database date.</p>
    <form action={action} noValidate aria-busy={pending} onSubmit={event => {
      if (lock.current || pending) { event.preventDefault(); return; }
      const validation = attendanceEntryErrors(new FormData(event.currentTarget));
      setErrors(validation);
      if (Object.keys(validation).length) event.preventDefault();
      else lock.current = true;
    }}>
      <input type="hidden" name="kind" value="attendance" />
      <fieldset className={styles.controls} disabled={pending}>
        {!!placements.length && <label>Choose a section<select value={placements.some(item => item.id === draft.section) ? draft.section : ''} onChange={event =>
          setDraft({ section: event.target.value, student: '' })}>
          <option value="">Choose or enter a section ID</option>
          {placements.map(item => <option key={item.id} value={item.id}>{item.className} · {item.label} · {item.year}</option>)}
        </select></label>}
        <label>Section ID<input name="section" maxLength={36} required value={draft.section} aria-invalid={!!errors.section}
          aria-describedby={errors.section ? 'attendance-error-section' : undefined}
          onChange={event => setDraft({ section: event.target.value, student: '' })} />{fieldError('section')}</label>
        <label>Student ID<input name="student" maxLength={36} required value={draft.student} aria-invalid={!!errors.student}
          aria-describedby={errors.student ? 'attendance-error-student' : undefined}
          onChange={event => setDraft({ ...draft, student: event.target.value })} />{fieldError('student')}</label>
        <label>Status<select name="status" required value={status} aria-invalid={!!errors.status} aria-describedby={errors.status ? 'attendance-error-status' : undefined}
          onChange={event => setStatus(event.target.value)}>
          <option value="">Select status</option>
          {attendanceStatuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select>{fieldError('status')}</label>
        <label>Remarks (optional)<input name="remarks" maxLength={1000} value={remarks} onChange={event => setRemarks(event.target.value)} />{fieldError('remarks')}</label>
      </fieldset>
      <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save attendance'}</button>
      {Object.keys(errors).length > 0 && <p role="alert" className={styles.error}>Review the highlighted fields.</p>}
      {result.message && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? styles.notice : styles.error}>{result.message}</p>}
    </form>
  </section>;
}
