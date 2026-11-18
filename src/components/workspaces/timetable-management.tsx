'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { filterTimetable } from '@/app/staff/timetable-workspace-actions';
import { manageAcademicRecord } from '@/app/staff/management-actions';
import { isRecordId, managementPayload } from '@/lib/services/management-contracts';
import { timetableDays, timetableErrors, timetableFailure } from '@/lib/services/timetable-fields';
import type { TimetableAssignment, TimetablePlacement, TimetableResult, TimetableSlot } from '@/lib/services/timetable-workspace';
import styles from './academic-management.module.css';
import schedule from './timetable-management.module.css';

type RequestIds = { requestId: string; recordId: string };
type Draft = RequestIds & { slot?: TimetableSlot };

export function TimetableManagement({ initial, placements, assignments, incomplete, identifiers }: {
  initial: TimetableResult; placements: TimetablePlacement[]; assignments: TimetableAssignment[];
  incomplete: boolean; identifiers?: RequestIds;
}) {
  const [result, action, pending] = useActionState(filterTimetable, initial);
  const [draft, setDraft] = useState<Draft | undefined>(identifiers);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState('');
  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('');
  const [day, setDay] = useState('');
  const [search, setSearch] = useState('');
  const editHeading = useRef<HTMLHeadingElement>(null);
  const sections = placements.filter(item => (!year || item.yearId === year) && (!classId || item.classId === classId));
  const years = [...new Map(placements.map(item => [item.yearId, item.year]))];
  const classes = [...new Map(placements.filter(item => !year || item.yearId === year).map(item => [item.classId, item.classroom]))];
  const visibleDays = result.kind === 'ready' ? timetableDays.filter(value => !result.filters.day || result.filters.day === value) : [];
  const ready = result.kind === 'ready' ? result : null;

  function openSlot(slot: TimetableSlot) {
    if (!identifiers || saving) return;
    setDraft({ slot, recordId: slot.id, requestId: crypto.randomUUID() });
    editHeading.current?.focus();
  }

  return <>
    <section className={styles.card} aria-labelledby="weekly-timetable" aria-busy={pending}>
      <h2 id="weekly-timetable">Weekly timetable</h2>
      {result.kind === 'denied' ? <p role="status">This membership cannot read the timetable.</p> : <>
        <form action={action} className={styles.controls}>
          {!!placements.length && <>
            <label>Academic year<select value={year} onChange={event => { setYear(event.target.value); setClassId(''); setSection(''); }}>
              <option value="">All available years</option>{years.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>
            <label>Class<select value={classId} onChange={event => { setClassId(event.target.value); setSection(''); }}>
              <option value="">All available classes</option>{classes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>
          </>}
          <label>Section ID or placement
            <input name="section" value={section} list="timetable-filter-sections" maxLength={36} onChange={event => setSection(event.target.value)} />
            <datalist id="timetable-filter-sections">{sections.map(item => <option key={item.id} value={item.id}>{placementLabel(item)}</option>)}</datalist>
          </label>
          <label>School day<select name="day" value={day} onChange={event => setDay(event.target.value)}>
            <option value="">Entire week</option>{timetableDays.map(value => <option key={value}>{value}</option>)}
          </select></label>
          <label>Search subject code or room<input type="search" name="search" value={search} maxLength={80} onChange={event => setSearch(event.target.value)} /></label>
          <button disabled={pending}>Apply filters</button>
        </form>
        <p className={styles.help}>Year and class narrow the section suggestions. Choose a section to scope the schedule. Each page shows up to 25 slots.</p>
        {pending && <p role="status">Loading timetable…</p>}
        {!pending && result.kind === 'invalid' && <p className={styles.error} role="alert">Check the section, day, or search term.</p>}
        {!pending && result.kind === 'error' && <p className={styles.error} role="alert">The timetable could not be loaded. Apply filters again to retry.</p>}
        {ready && <>
          {!ready.rows.length ? <p className={styles.notice} role="status">No accessible timetable slots match these filters.</p> :
            <div className={schedule.week}>
              {visibleDays.map(value => {
                const rows = ready.rows.filter(item => item.day === value);
                return <section key={value} className={schedule.day} aria-label={value}>
                  <h3>{value}</h3>
                  {rows.length ? <ul>{rows.map(slot => <li key={slot.id}>
                    <strong>{slot.subject}</strong>
                    <span>{slot.start}–{slot.end} · Period {slot.period}</span>
                    <span>{placementLabel(placements.find(item => item.id === slot.section)) || slot.section}</span>
                    <span>Room {slot.room}</span>
                    <span>{slot.teacherName ?? ('Teacher ID: ' + slot.teacher)}</span>
                    {identifiers && <button type="button" disabled={saving} aria-label={'Edit ' + slot.subject + ' on ' + value + ', period ' + slot.period} onClick={() => openSlot(slot)}>Edit slot</button>}
                  </li>)}</ul> : <p>No slots on this page.</p>}
                </section>;
              })}
            </div>}
          <form className={styles.pager} action={action} aria-label="Timetable pagination">
            {Object.entries(ready.filters).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
            <button name="page" value={ready.page - 1} disabled={pending || ready.page === 1}>Previous</button>
            <span aria-live="polite">Page {ready.page}</span>
            <button name="page" value={ready.page + 1} disabled={pending || !ready.next}>Next</button>
          </form>
        </>}
      </>}
    </section>
    {draft && <section className={styles.card} aria-labelledby="timetable-edit-heading">
      <h2 id="timetable-edit-heading" tabIndex={-1} ref={editHeading}>{draft.slot ? 'Edit timetable slot' : 'Save a timetable slot'}</h2>
      <SlotForm key={draft.requestId} draft={draft} placements={placements} assignments={assignments} incomplete={incomplete} onBusy={setSaving}
        onNew={() => setDraft({ recordId: crypto.randomUUID(), requestId: crypto.randomUUID() })} />
    </section>}
  </>;
}

function placementLabel(item?: TimetablePlacement) {
  return item ? [item.classroom, item.label, item.year].join(' · ') : '';
}

const labels: Record<string, string> = {
  day: 'Day', sectionId: 'Section ID or placement', teacherId: 'Teacher profile ID', subject: 'Subject code',
  period: 'Period', start: 'Start time', end: 'End time', room: 'Room', revision: 'Revision',
};

function SlotForm({ draft, placements, assignments, incomplete, onBusy, onNew }: {
  draft: Draft; placements: TimetablePlacement[]; assignments: TimetableAssignment[]; incomplete: boolean;
  onBusy: (busy: boolean) => void; onNew: () => void;
}) {
  const slot = draft.slot;
  const [recordId, setRecordId] = useState(draft.recordId);
  const [fields, setFields] = useState<Record<string, string>>({
    sectionId: slot?.section ?? '', teacherId: slot?.teacher ?? '', subject: slot?.subject ?? '', day: slot?.day ?? '',
    period: slot ? String(slot.period) : '', start: slot?.start ?? '', end: slot?.end ?? '', room: slot?.room ?? '',
    revision: String(slot?.revision ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [result, action, pending] = useActionState(async (previous: { ok: boolean; message: string }, form: FormData) => {
    try { return await manageAcademicRecord(previous, form); }
    catch { return { ok: false, message: timetableFailure({}) }; }
    finally { lock.current = false; onBusy(false); }
  }, { ok: false, message: '' });
  useEffect(() => {
    if (result.message || Object.keys(errors).length) feedback.current?.focus();
  }, [result, errors]);
  const available = assignments.filter(item => item.section === fields.sectionId);

  return <form action={action} noValidate aria-busy={pending} onSubmit={event => {
    if (lock.current || pending || result.ok) { event.preventDefault(); return; }
    const payload = managementPayload('timetable', new FormData(event.currentTarget));
    const invalid = timetableErrors(payload ?? fields);
    if (!isRecordId(recordId.trim())) invalid.recordId = 'Enter a valid slot ID.';
    setErrors(invalid);
    if (!payload || Object.keys(invalid).length) event.preventDefault();
    else { lock.current = true; onBusy(true); }
  }}>
    <input type="hidden" name="kind" value="timetable" />
    <input type="hidden" name="requestId" value={draft.requestId} />
    <fieldset disabled={pending || result.ok} className={styles.controls}>
      <label>Slot ID<input name="recordId" value={recordId} maxLength={36} onChange={event => setRecordId(event.target.value)}
        aria-invalid={!!errors.recordId} aria-describedby={errors.recordId ? id + 'recordId' : undefined} required />
        {errors.recordId && <span className={styles.error} id={id + 'recordId'}>{errors.recordId}</span>}
      </label>
      {Object.entries(labels).map(([field, label]) => {
        const props = {
          name: field, value: fields[field], required: true, 'aria-invalid': !!errors[field],
          'aria-describedby': errors[field] ? id + field : undefined,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;
            setFields(current => ({ ...current, [field]: value }));
          },
        };
        return <label key={field}>{label}
          {field === 'day' ? <select {...props}><option value="">Select a school day</option>{timetableDays.map(day => <option key={day}>{day}</option>)}</select> :
            <input {...props} list={field === 'sectionId' ? id + 'sections' : undefined}
              type={field === 'period' || field === 'revision' ? 'number' : 'text'}
              placeholder={field === 'start' || field === 'end' ? 'HH:MM' : undefined} />}
          {errors[field] && <span className={styles.error} id={id + field}>{errors[field]}</span>}
        </label>;
      })}
      <datalist id={id + 'sections'}>{placements.map(item => <option key={item.id} value={item.id}>{placementLabel(item)}</option>)}</datalist>
      {!!available.length && <label>Fill from a teaching assignment
        <select value="" onChange={event => {
          const assignment = available.find(item => item.id === event.target.value);
          if (assignment) setFields(current => ({ ...current, teacherId: assignment.teacher, subject: assignment.subject }));
        }}><option value="">Choose an assignment</option>
          {available.map(item => <option key={item.id} value={item.id}>{item.subject} · {item.teacher} · {item.from}{item.until ? '–' + item.until : ' onward'}</option>)}
        </select>
      </label>}
    </fieldset>
    <p className={styles.help}>Use revision 0 for new slots and the current revision for edits. The server verifies assignment eligibility and detects overlaps.</p>
    {incomplete && <p className={styles.help}>The suggestion lists may be incomplete. You can enter verified section and teacher IDs.</p>}
    <div className={schedule.actions}>
      <button type="submit" disabled={pending || result.ok}>{pending ? 'Saving…' : 'Save slot'}</button>
      <button type="button" disabled={pending} onClick={onNew}>New slot</button>
    </div>
    {(result.message || Object.keys(errors).length > 0) && <p ref={feedback} tabIndex={-1} role={result.ok ? 'status' : 'alert'}
      className={result.ok ? styles.notice : styles.error}>{Object.keys(errors).length ? 'Review the highlighted fields.' : result.message}</p>}
  </form>;
}
