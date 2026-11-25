'use client';

import { useActionState, useId, useState } from 'react';
import { filterAcademicRecords } from '@/app/staff/academic-directory-actions';
import { updateAcademicLifecycle } from '@/app/staff/management-actions';
import type { AcademicList, AcademicOptions, AcademicPage } from '@/lib/services/academic-directory';
import styles from './academic-management.module.css';

const labels = {
  years: { title: 'Academic years', search: 'Search academic-year label', columns: ['Academic year', 'Starts', 'Ends', 'Year ID'] },
  classes: { title: 'Class directory', search: 'Search class name', columns: ['Class', 'Class ID'] },
  sections: { title: 'Section directory', search: 'Search section name', columns: ['Section', 'Class', 'Academic year', 'Section ID'] },
  assignments: { title: 'Teaching assignments', search: 'Search subject code', columns: ['Subject code', 'Teacher profile ID', 'Section', 'Valid from', 'Valid until'] },
} as const;

type StaffOption = { id: string; label: string };

function AcademicRowEditor({ kind, row, staff }: { kind: Exclude<AcademicList, 'years'>; row: string[]; staff: StaffOption[] }) {
  const [state, action, pending] = useActionState(updateAcademicLifecycle, { ok: false, message: '' });
  const [replace, setReplace] = useState(false);
  const listId = useId();
  const assignment = kind === 'assignments';
  return <details>
    <summary>{assignment ? 'End or reassign' : 'Edit name'}</summary>
    <form action={action} aria-busy={pending} className={styles.controls}>
      <input type="hidden" name="id" value={row.at(-1)} />
      <input type="hidden" name="expected" value={assignment ? row[4] === '—' ? '' : row[4] : row[0]} />
      <input type="hidden" name="kind" value={assignment ? replace ? 'replace_assignment' : 'end_assignment' :
        kind === 'classes' ? 'rename_class' : 'rename_section'} />
      <fieldset disabled={pending || state.ok}>
        {assignment ? <>
          <label>Change<select value={replace ? 'replace' : 'end'} onChange={event => setReplace(event.target.value === 'replace')}>
            <option value="end">End assignment</option><option value="replace">Reassign section and subject</option>
          </select></label>
          <label>Effective date<input name="effective" type="date" required /></label>
          {replace && <label>Replacement Teacher profile<input name="replacement" list={listId} maxLength={36} required />
            <datalist id={listId}>{staff.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</datalist>
          </label>}
          <p>Use a future effective date. Historical attendance, homework and marks are retained.</p>
        </> : <label>Name<input name="name" maxLength={80} defaultValue={row[0]} required /></label>}
        <button type="submit">{pending ? 'Saving…' : 'Save change'}</button>
      </fieldset>
      {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    </form>
  </details>;
}

export function AcademicDirectory({ kind, initial, options, staff = [] }: {
  kind: AcademicList; initial: AcademicPage; options: AcademicOptions; staff?: StaffOption[];
}) {
  const [result, action, pending] = useActionState(filterAcademicRecords, initial);
  const [search, setSearch] = useState('');
  const [placement, setPlacement] = useState('');
  const config = labels[kind];
  const id = useId();
  const facet = kind === 'sections' ? options.classes : kind === 'assignments' ? options.sections.map(section => ({
    id: section.id, label: placementName(section.id, options),
  })) : [];
  if (result.kind === 'denied') return <p role="status">This membership cannot read {config.title.toLowerCase()}.</p>;

  const cell = (value: string, index: number) => {
    if (kind === 'sections' && index === 1) return options.classes.find(item => item.id === value)?.label ?? value;
    if (kind === 'sections' && index === 2) return options.years.find(item => item.id === value)?.label ?? value;
    if (kind === 'assignments' && index === 2) return placementName(value, options);
    return value;
  };

  return <section className={styles.card} aria-labelledby={id} aria-busy={pending}>
    <h2 id={id}>{config.title}</h2>
    <form action={action} className={styles.controls}>
      <input type="hidden" name="dataset" value={kind} />
      <label>{config.search}<input type="search" name="search" maxLength={80} value={search} onChange={event => setSearch(event.target.value)} /></label>
      {!!facet.length && <label>{kind === 'sections' ? 'Class' : 'Section'}<select name="placement" value={placement} onChange={event => setPlacement(event.target.value)}>
        <option value="">All</option>
        {facet.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>}
      <button disabled={pending}>Apply filters</button>
    </form>
    {pending && <p role="status">Loading {config.title.toLowerCase()}…</p>}
    {!pending && result.kind === 'invalid' && <p role="alert" className={styles.error}>Check your filters. Search accepts letters, numbers, spaces, periods, apostrophes, and hyphens.</p>}
    {!pending && result.kind === 'error' && <p role="alert" className={styles.error}>Records could not be loaded. Apply filters again to retry.</p>}
    {result.kind === 'ready' && <>
      {result.rows.length ? <div className={styles.table} role="region" aria-label={config.title + ' table'} tabIndex={0}>
        <table>
          <thead><tr>{config.columns.map(column => <th scope="col" key={column}>{column}</th>)}
            {kind !== 'years' && <th scope="col">Actions</th>}</tr></thead>
          <tbody>{result.rows.map(row => <tr key={row.at(-1)}>{row.slice(0, config.columns.length).map((value, index) =>
            index === 0 ? <th key={index} scope="row">{cell(value, index)}</th> : <td key={index}>{cell(value, index)}</td>)}
            {kind !== 'years' && <td><AcademicRowEditor kind={kind} row={row} staff={staff} /></td>}</tr>)}</tbody>
        </table>
      </div> : <p role="status" className={styles.notice}>No accessible records match these filters.</p>}
      <form action={action} className={styles.pager} aria-label={config.title + ' pagination'}>
        <input type="hidden" name="dataset" value={kind} /><input type="hidden" name="search" value={result.search} />
        <input type="hidden" name="placement" value={result.placement} />
        <button name="page" value={result.page - 1} disabled={pending || result.page === 1}>Previous</button>
        <span aria-live="polite">Page {result.page}</span>
        <button name="page" value={result.page + 1} disabled={pending || !result.next}>Next</button>
      </form>
    </>}
  </section>;
}

function placementName(id: string, options: AcademicOptions) {
  const section = options.sections.find(option => option.id === id);
  if (!section) return id;
  const classroom = options.classes.find(option => option.id === section.classId);
  const year = options.years.find(option => option.id === section.yearId);
  return [classroom?.label, section.label, year?.label].filter(Boolean).join(' · ');
}

