'use client';

import { useActionState, useState } from 'react';
import { filterStaffDirectory } from '@/app/staff/staff-directory-actions';
import type { StaffDirectoryResult } from '@/lib/services/staff-directory';
import styles from './student-directory.module.css';

export function StaffDirectory({ initial }: { initial: StaffDirectoryResult }) {
  const [result, action, pending] = useActionState(filterStaffDirectory, initial);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  if (result.kind === 'denied') return <p role="status" className={styles.notice}>Staff directory access is unavailable for this membership.</p>;

  return <section className={styles.directory} aria-label="Staff directory" aria-busy={pending}>
    <form action={action} className={styles.filters}>
      <label>Search name, employee code or department
        <input type="search" name="search" maxLength={80} value={search} onChange={event => setSearch(event.target.value)} />
      </label>
      <label>Profile status<select name="status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select></label>
      <button disabled={pending}>Apply filters</button>
    </form>
    {pending && <p role="status" className={styles.notice}>Loading staff records…</p>}
    {result.kind === 'invalid' && <p role="alert" className={styles.problem}>Check the filters. Search accepts letters, numbers, spaces, periods, apostrophes, and hyphens.</p>}
    {result.kind === 'error' && <p role="alert" className={styles.problem}>Staff records could not be loaded. Apply filters again to retry.</p>}
    {result.kind === 'ready' && <>
      {result.rows.length ? <div className={styles.tableRegion} role="region" aria-label="Staff records" tabIndex={0}>
        <table>
          <caption className="sr-only">Staff profiles, page {result.page}</caption>
          <thead><tr><th scope="col">Staff member</th><th scope="col">Department</th><th scope="col">Profile status</th></tr></thead>
          <tbody key={JSON.stringify([result.page, result.search, result.status])}>{result.rows.map((row, index) => <tr key={index}>
            <th scope="row"><details>
              <summary className={styles.student}>{row.name}<span className={styles.secondary}>{row.code ?? 'No employee code'}</span></summary>
              <dl className={styles.detail}>
                <dt>Employee code</dt><dd>{row.code ?? 'Unavailable'}</dd>
                <dt>Department</dt><dd>{row.department ?? 'Unavailable'}</dd>
                <dt>Profile status</dt><dd>{row.active ? 'Active' : 'Inactive'}</dd>
                <dt>Membership role and status</dt><dd>Unavailable in the staff directory</dd>
              </dl>
            </details></th>
            <td>{row.department ?? '—'}</td>
            <td><span className={styles.status} data-status={row.active ? 'active' : 'inactive'}>{row.active ? 'Active' : 'Inactive'}</span></td>
          </tr>)}</tbody>
        </table>
      </div> : <p role="status" className={styles.notice}>No staff profiles match these filters.</p>}
      <form action={action} className={styles.pagination} aria-label="Staff directory pagination">
        <input type="hidden" name="search" value={result.search} />
        <input type="hidden" name="status" value={result.status} />
        <button name="page" value={result.page - 1} disabled={pending || result.page <= 1}>Previous</button>
        <span aria-live="polite">Page {result.page}</span>
        <button name="page" value={result.page + 1} disabled={pending || !result.hasNext}>Next</button>
      </form>
    </>}
  </section>;
}
