'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { filterAdmissionEnrollments, filterStudentDirectory } from '@/app/staff/student-directory-actions';
import type { DirectoryResult } from '@/lib/services/student-directory';
import styles from './student-directory.module.css';

const statusLabels = { active: 'Active', inactive: 'Inactive', withdrawn: 'Withdrawn' };

export function StudentDirectory({ initial, admissions = false }: { initial: DirectoryResult; admissions?: boolean }) {
  const [result, action, pending] = useActionState(admissions ? filterAdmissionEnrollments : filterStudentDirectory, initial);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string>();
  const detailId = useId();
  const detailPanel = useRef<HTMLElement>(null);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const catalog = result.kind === 'ready' ? result : initial.kind === 'ready' ? initial : null;
  const options = catalog?.options ?? [];
  const classes = [...new Map(options.map(option => [option.classId, option.className])).entries()]
    .sort(([, first], [, second]) => first.localeCompare(second));
  const detail = result.kind === 'ready' && result.rows.find(row => row.id === selected);
  useEffect(() => {
    if (detail) detailPanel.current?.focus();
  }, [detail]);

  if (result.kind === 'denied') return <p className={styles.notice} role="status">Your current membership does not have permission to read these records.</p>;

  return <div className={styles.directory} aria-busy={pending}>
    <form action={action} className={styles.filters}>
      <label>Search by name or registration number
        <input name="search" type="search" maxLength={80} value={search} onChange={event => setSearch(event.target.value)} />
      </label>
      <label>Class
        <select name="classId" value={classId} onChange={event => { setClassId(event.target.value); setSectionId(''); }}>
          <option value="">All available classes</option>
          {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <label>Section
        <select name="sectionId" value={sectionId} onChange={event => setSectionId(event.target.value)}>
          <option value="">All available sections</option>
          {options.filter(option => !classId || option.classId === classId).map(option =>
            <option key={option.id} value={option.id}>{[option.className, option.name, option.year].filter(Boolean).join(' · ')}</option>)}
        </select>
      </label>
      <label>Status
        <select name="status" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button disabled={pending} onClick={() => setSelected(undefined)}><Search size={16} aria-hidden="true" /> Apply filters</button>
    </form>

    {catalog?.moreOptions && <p className={styles.notice}>The filter menu shows the first 200 available sections. Name, registration number, and status searches still cover the directory.</p>}
    {pending && <p className={styles.notice} role="status">Loading student records…</p>}
    {!pending && result.kind === 'invalid' && <p className={styles.problem} role="alert">Check the selected filters. Search accepts letters, numbers, spaces, periods, apostrophes, and hyphens.</p>}
    {!pending && result.kind === 'error' && <p className={styles.problem} role="alert">Student records could not be loaded. Apply the filters again to retry.</p>}
    {result.kind === 'ready' && <>
      {result.rows.length ? <div className={styles.tableRegion} role="region" aria-label="Student records" tabIndex={0}>
        <table>
          <caption className="sr-only">Student directory, page {result.filters.page}</caption>
          <thead><tr><th scope="col">Student</th><th scope="col">Class / section</th><th scope="col">Status</th></tr></thead>
          <tbody>{result.rows.map(row => <tr key={row.id}>
            <th scope="row">
              <button type="button" className={styles.student} aria-expanded={selected === row.id}
                aria-controls={selected === row.id ? detailId : undefined}
                onClick={event => {
                  detailTrigger.current = event.currentTarget;
                  setSelected(selected === row.id ? undefined : row.id);
                }}>{row.name}</button>
              <span className={styles.secondary}>{row.registration}</span>
            </th>
            <td>{[row.className, row.sectionName].filter(Boolean).join(' · ') || 'Unavailable'}</td>
            <td><span className={styles.status} data-status={row.status}>{statusLabels[row.status]}</span></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className={styles.notice} role="status">No accessible students match these filters.</p>}
      {detail && <section ref={detailPanel} tabIndex={-1} className={styles.detail} id={detailId} aria-labelledby={detailId + '-heading'}>
        <div className={styles.detailHeader}>
          <h2 id={detailId + '-heading'}>{detail.name}</h2>
          <button type="button" className={styles.student} onClick={() => {
            setSelected(undefined);
            detailTrigger.current?.focus();
          }}>Close details</button>
        </div>
        <dl>
          <div><dt>Registration number</dt><dd>{detail.registration}</dd></div>
          <div><dt>Enrollment status</dt><dd>{statusLabels[detail.status]}</dd></div>
          <div><dt>Class</dt><dd>{detail.className ?? 'Unavailable'}</dd></div>
          <div><dt>Section</dt><dd>{detail.sectionName ?? 'Unavailable'}</dd></div>
          <div><dt>Academic year</dt><dd>{detail.year ?? 'Unavailable'}</dd></div>
        </dl>
      </section>}
      <form action={action} className={styles.pagination} aria-label="Student directory pagination">
        <input type="hidden" name="search" value={result.filters.search} />
        <input type="hidden" name="status" value={result.filters.status} />
        <input type="hidden" name="classId" value={result.filters.classId} />
        <input type="hidden" name="sectionId" value={result.filters.sectionId} />
        <button name="page" value={result.filters.page - 1} disabled={pending || result.filters.page <= 1} onClick={() => setSelected(undefined)}>
          <ArrowLeft size={16} aria-hidden="true" /> Previous
        </button>
        <span aria-live="polite">Page {result.filters.page}</span>
        <button name="page" value={result.filters.page + 1} disabled={pending || !result.hasNext} onClick={() => setSelected(undefined)}>
          Next <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
    </>}
  </div>;
}
