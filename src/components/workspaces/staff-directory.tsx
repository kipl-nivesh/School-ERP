'use client';

import { startTransition, useActionState, useState } from 'react';
import { filterStaffDirectory } from '@/app/staff/staff-directory-actions';
import { manageStaffAccount } from '@/app/staff/staff-account-actions';
import type { StaffAccountState } from '@/lib/staff/account-contracts';
import type { StaffDirectoryResult, StaffEntry } from '@/lib/services/staff-directory';
import styles from './student-directory.module.css';

const initialChange: StaffAccountState = { ok: false, message: '' };

function DetailsFields({ row }: { row?: StaffEntry }) {
  return <>
    <label>Full name<input name="name" required minLength={2} maxLength={160} defaultValue={row?.name} /></label>
    <label>Employee ID<input name="code" required maxLength={40} defaultValue={row?.code ?? ''} /></label>
    <label>Department<input name="department" maxLength={100} defaultValue={row?.department ?? ''} /></label>
    <label>Phone<input name="phone" type="tel" maxLength={30} defaultValue={row?.phone ?? ''} /></label>
  </>;
}

function AddStaff() {
  const [state, action, pending] = useActionState(manageStaffAccount, initialChange);
  const [open, setOpen] = useState(false);
  return <div>
    <button type="button" aria-expanded={open} aria-controls="staff-add-form" onClick={() => setOpen(!open)}>Add Staff</button>
    <div id="staff-add-form" hidden={!open}>
    <form action={action} className={styles.filters} aria-busy={pending}>
      <DetailsFields />
      <label>Email address<input name="email" required type="email" maxLength={254} /></label>
      <label>Role<select name="role"><option value="teacher">Teacher</option><option value="accountant">Accountant</option></select></label>
      <label>School access<select name="active"><option value="true">Active after setup</option><option value="false">Inactive after setup</option></select></label>
      <button disabled={pending} name="intent" value="invite">{pending ? 'Creating invitation…' : 'Create staff invitation'}</button>
    </form>
    {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    {state.link && <label>Private setup link<input readOnly value={state.link} onFocus={event => event.target.select()} /></label>}
    </div>
  </div>;
}

function StaffControls({ row, result, reload }: {
  row: StaffEntry; result: Extract<StaffDirectoryResult, { kind: 'ready' }>; reload: () => void;
}) {
  const [state, action, pending] = useActionState(async (previous: StaffAccountState, form: FormData) => {
    const next = await manageStaffAccount(previous, form);
    if (next.ok && !next.link) reload();
    return next;
  }, initialChange);
  if (!row.membership || (row.status !== 'active' && row.status !== 'inactive') ||
      (!result.canEdit && !result.canSuspend && !result.canReset)) return null;
  return <>
    {result.canEdit && <details>
      <summary>Edit staff details</summary>
      <form action={action} className={styles.filters} aria-busy={pending}>
        <input name="membership" type="hidden" value={row.membership} />
        <DetailsFields row={row} />
        <button disabled={pending} name="intent" value="edit">Save details</button>
      </form>
    </details>}
    <form action={action} aria-busy={pending}>
      <input name="membership" type="hidden" value={row.membership} />
      {result.canSuspend && <button disabled={pending} name="intent" value={row.status === 'active' ? 'deactivate' : 'activate'}>
        {row.status === 'active' ? 'Deactivate school access' : 'Activate school access'}
      </button>}
      {result.canReset && row.status === 'active' && <button disabled={pending} name="intent" value="reset">Prepare password reset</button>}
    </form>
    {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    {state.link && <label>Staff recovery page<input readOnly value={state.link} onFocus={event => event.target.select()} /></label>}
  </>;
}

export function StaffDirectory({ initial }: { initial: StaffDirectoryResult }) {
  const [result, action, pending] = useActionState(filterStaffDirectory, initial);
  if (result.kind === 'denied') return <p role="status" className={styles.notice}>Staff directory access is unavailable for this membership.</p>;
  const filters = result.kind === 'ready' ? result : initial.kind === 'ready' ? initial : null;
  const reload = () => {
    if (!filters) return;
    const form = new FormData();
    for (const key of ['search', 'status', 'role', 'page'] as const) form.set(key, String(filters[key]));
    startTransition(() => action(form));
  };

  return <section className={styles.directory} aria-label="Staff directory" aria-busy={pending}>
    {filters?.canInvite && <AddStaff />}
    <form action={action} className={styles.filters}>
      <label>Search name, email, employee ID or department
        <input type="search" name="search" maxLength={80} defaultValue={filters?.search} />
      </label>
      <label>Account status<select name="status" defaultValue={filters?.status}>
        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select></label>
      <label>Role<select name="role" defaultValue={filters?.role}>
        <option value="">All roles</option><option value="teacher">Teacher</option><option value="accountant">Accountant</option>
      </select></label>
      <button disabled={pending}>Apply filters</button>
    </form>
    {pending && <p role="status" className={styles.notice}>Loading staff records…</p>}
    {result.kind === 'invalid' && <p role="alert" className={styles.problem}>Check the filters and try again.</p>}
    {result.kind === 'error' && <p role="alert" className={styles.problem}>Staff records could not be loaded. Apply filters again to retry.</p>}
    {result.kind === 'ready' && <>
      {result.rows.length ? <div className={styles.tableRegion} role="region" aria-label="Staff records" tabIndex={0}>
        <table>
          <caption className="sr-only">Staff accounts, page {result.page}</caption>
          <thead><tr><th scope="col">Staff member</th><th scope="col">Role</th><th scope="col">Department</th><th scope="col">Account status</th><th scope="col">Manage</th></tr></thead>
          <tbody>{result.rows.map((row, index) => <tr key={row.membership ?? index}>
            <th scope="row">{row.name}<span className={styles.secondary}>{row.email ?? '—'} · {row.code ?? 'No employee ID'}</span></th>
            <td>{row.role ?? 'Unassigned'}</td>
            <td>{row.department ?? '—'}</td>
            <td><span className={styles.status} data-status={row.status}>{row.status}</span></td>
            <td><StaffControls row={row} result={result} reload={reload} /></td>
          </tr>)}</tbody>
        </table>
      </div> : <p role="status" className={styles.notice}>No staff profiles match these filters.</p>}
      <form action={action} className={styles.pagination} aria-label="Staff directory pagination">
        <input type="hidden" name="search" value={result.search} />
        <input type="hidden" name="status" value={result.status} />
        <input type="hidden" name="role" value={result.role} />
        <button name="page" value={result.page - 1} disabled={pending || result.page <= 1}>Previous</button>
        <span aria-live="polite">Page {result.page}</span>
        <button name="page" value={result.page + 1} disabled={pending || !result.hasNext}>Next</button>
      </form>
    </>}
  </section>;
}
