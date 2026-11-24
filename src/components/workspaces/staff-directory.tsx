'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { filterStaffDirectory } from '@/app/staff/staff-directory-actions';
import { manageStaffAccount } from '@/app/staff/staff-account-actions';
import type { StaffAccountState } from '@/lib/staff/account-contracts';
import type { StaffDirectoryResult, StaffEntry } from '@/lib/services/staff-directory';
import styles from './staff-directory.module.css';

const initialChange: StaffAccountState = { ok: false, message: '' };

function DetailsFields({ row }: { row?: StaffEntry }) {
  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor={row ? `edit-name-${row.membership}` : 'add-name'}>
          Full name
        </label>
        <input
          id={row ? `edit-name-${row.membership}` : 'add-name'}
          name="name"
          required
          minLength={2}
          maxLength={160}
          defaultValue={row?.name}
          placeholder="e.g. Sarah Jenkins"
          className={styles.formInput}
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor={row ? `edit-code-${row.membership}` : 'add-code'}>
          Employee ID
        </label>
        <input
          id={row ? `edit-code-${row.membership}` : 'add-code'}
          name="code"
          required
          maxLength={40}
          defaultValue={row?.code ?? ''}
          placeholder="e.g. TCH-2026-001"
          className={styles.formInput}
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor={row ? `edit-dept-${row.membership}` : 'add-dept'}>
          Department
        </label>
        <input
          id={row ? `edit-dept-${row.membership}` : 'add-dept'}
          name="department"
          maxLength={100}
          defaultValue={row?.department ?? ''}
          placeholder="e.g. Science & Mathematics"
          className={styles.formInput}
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor={row ? `edit-phone-${row.membership}` : 'add-phone'}>
          Phone number
        </label>
        <input
          id={row ? `edit-phone-${row.membership}` : 'add-phone'}
          name="phone"
          type="tel"
          maxLength={30}
          defaultValue={row?.phone ?? ''}
          placeholder="e.g. +1 (555) 019-2834"
          className={styles.formInput}
        />
      </div>
    </>
  );
}

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(manageStaffAccount, initialChange);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    if (state.link) {
      navigator.clipboard.writeText(state.link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-add-staff-title">
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="modal-add-staff-title" className={styles.modalTitle}>
              Add New Staff Member
            </h2>
            <p className={styles.modalSubtitle}>
              Create a private invitation link for a new teacher or accountant.
            </p>
          </div>
          <button type="button" className={styles.btnClose} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {state.ok && state.link ? (
          <div className={styles.successBox}>
            <h3 className={styles.successTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Staff Invitation Created
            </h3>
            <p className={styles.noticeText}>
              Send this private link to the staff member’s email address. The link remains active for 7 days.
            </p>
            <div className={styles.copyBox}>
              <input
                readOnly
                value={state.link}
                onFocus={e => e.target.select()}
                className={styles.copyInput}
                aria-label="Invitation Link"
              />
              <button type="button" className={styles.btnCopy} onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              style={{ marginTop: '8px', alignSelf: 'flex-end' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form action={action} className={styles.modalForm} aria-busy={pending}>
            <div className={styles.formRow}>
              <DetailsFields />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="add-email">
                Email address
              </label>
              <input
                id="add-email"
                name="email"
                required
                type="email"
                maxLength={254}
                placeholder="teacher@brightcamp.edu"
                className={styles.formInput}
                disabled={pending}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="add-role">
                  Staff Role
                </label>
                <select id="add-role" name="role" className={styles.formSelect} disabled={pending}>
                  <option value="teacher">Teacher</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="add-active">
                  School access
                </label>
                <select id="add-active" name="active" className={styles.formSelect} disabled={pending}>
                  <option value="true">Active after setup</option>
                  <option value="false">Inactive after setup</option>
                </select>
              </div>
            </div>

            {state.message && !state.ok && (
              <p className={styles.problem} role="alert">
                {state.message}
              </p>
            )}

            <button type="submit" disabled={pending} name="intent" value="invite" className={styles.btnSubmit}>
              {pending ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  <span>Creating invitation…</span>
                </>
              ) : (
                'Create Staff Invitation'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function DeactivateConfirmModal({
  isOpen,
  staffName,
  onClose,
  onConfirm,
  pending,
}: {
  isOpen: boolean;
  staffName: string;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="confirm-deactivate-title">
      <div className={styles.confirmDialog}>
        <h3 id="confirm-deactivate-title" className={styles.confirmTitle}>
          Deactivate School Access?
        </h3>
        <p className={styles.confirmText}>
          Are you sure you want to deactivate school access for <strong>{staffName}</strong>? They will be immediately blocked from accessing their staff dashboard and classes until reactivated.
        </p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className={styles.btnConfirmDanger} onClick={onConfirm} disabled={pending}>
            {pending ? 'Deactivating…' : 'Confirm Deactivation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffControls({
  row,
  result,
  reload,
}: {
  row: StaffEntry;
  result: Extract<StaffDirectoryResult, { kind: 'ready' }>;
  reload: () => void;
}) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [copiedReset, setCopiedReset] = useState(false);

  const [state, action, pending] = useActionState(async (previous: StaffAccountState, form: FormData) => {
    const next = await manageStaffAccount(previous, form);
    if (next.ok && !next.link) reload();
    return next;
  }, initialChange);

  if (!row.membership || (row.status !== 'active' && row.status !== 'inactive') ||
      (!result.canEdit && !result.canSuspend && !result.canReset)) return null;

  const handleConfirmDeactivate = () => {
    const form = new FormData();
    form.set('membership', row.membership!);
    form.set('intent', 'deactivate');
    startTransition(async () => {
      await action(form);
      setShowDeactivateConfirm(false);
    });
  };

  const handleCopyResetLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedReset(true);
      setTimeout(() => setCopiedReset(false), 3000);
    });
  };

  return (
    <div className={styles.actionsGroup}>
      {result.canEdit && (
        <details className={styles.editDetailsBox}>
          <summary className={styles.btnAction} style={{ display: 'inline-flex' }}>
            Edit details
          </summary>
          <form action={action} className={styles.modalForm} style={{ marginTop: '10px' }} aria-busy={pending}>
            <input name="membership" type="hidden" value={row.membership} />
            <DetailsFields row={row} />
            <button disabled={pending} name="intent" value="edit" className={styles.btnSubmit}>
              {pending ? 'Saving…' : 'Save Details'}
            </button>
          </form>
        </details>
      )}

      {result.canSuspend && (
        <>
          {row.status === 'active' ? (
            <button
              type="button"
              disabled={pending}
              className={`${styles.btnAction} ${styles.btnActionDanger}`}
              onClick={() => setShowDeactivateConfirm(true)}
            >
              Deactivate
            </button>
          ) : (
            <form action={action} style={{ display: 'inline' }} aria-busy={pending}>
              <input name="membership" type="hidden" value={row.membership} />
              <button
                disabled={pending}
                name="intent"
                value="activate"
                className={`${styles.btnAction} ${styles.btnActionSuccess}`}
              >
                {pending ? 'Activating…' : 'Activate'}
              </button>
            </form>
          )}

          <DeactivateConfirmModal
            isOpen={showDeactivateConfirm}
            staffName={row.name}
            onClose={() => setShowDeactivateConfirm(false)}
            onConfirm={handleConfirmDeactivate}
            pending={pending}
          />
        </>
      )}

      {result.canReset && row.status === 'active' && (
        <form action={action} style={{ display: 'inline' }} aria-busy={pending}>
          <input name="membership" type="hidden" value={row.membership} />
          <button disabled={pending} name="intent" value="reset" className={styles.btnAction}>
            {pending ? 'Preparing…' : 'Reset Password'}
          </button>
        </form>
      )}

      {state.message && (
        <p className={state.ok ? styles.notice : styles.problem} role={state.ok ? 'status' : 'alert'} style={{ width: '100%', margin: '4px 0 0' }}>
          {state.message}
        </p>
      )}

      {state.link && (
        <div className={styles.copyBox} style={{ width: '100%', marginTop: '6px' }}>
          <input readOnly value={state.link} className={styles.copyInput} onFocus={e => e.target.select()} aria-label="Recovery Link" />
          <button type="button" className={styles.btnCopy} onClick={() => handleCopyResetLink(state.link!)}>
            {copiedReset ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

export function StaffDirectory({ initial }: { initial: StaffDirectoryResult }) {
  const [result, action, pending] = useActionState(filterStaffDirectory, initial);
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (result.kind === 'denied') {
    return <p role="status" className={styles.problem}>Staff directory access is unavailable for this membership.</p>;
  }

  const filters = result.kind === 'ready' ? result : initial.kind === 'ready' ? initial : null;
  const reload = () => {
    if (!filters) return;
    const form = new FormData();
    for (const key of ['search', 'status', 'role', 'page'] as const) {
      form.set(key, String(filters[key]));
    }
    startTransition(() => action(form));
  };

  return (
    <section className={styles.container} aria-label="Staff directory" aria-busy={pending}>
      <div className={styles.headerRow}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Staff Directory</h1>
          <p className={styles.subtitle}>
            Manage teachers, accountants, and staff school memberships.
          </p>
        </div>
        {filters?.canInvite && (
          <button type="button" className={styles.btnAddStaff} onClick={() => setIsAddOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Staff
          </button>
        )}
      </div>

      {filters?.canInvite && isAddOpen && (
        <AddStaffModal onClose={() => { setIsAddOpen(false); reload(); }} />
      )}

      <form action={action} className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="filter-search">
            Search
          </label>
          <input
            id="filter-search"
            type="search"
            name="search"
            maxLength={80}
            defaultValue={filters?.search}
            placeholder="Search by name, email, employee ID or department…"
            className={styles.filterInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="filter-status">
            Account Status
          </label>
          <select id="filter-status" name="status" defaultValue={filters?.status} className={styles.filterSelect}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="filter-role">
            Role
          </label>
          <select id="filter-role" name="role" defaultValue={filters?.role} className={styles.filterSelect}>
            <option value="">All roles</option>
            <option value="teacher">Teacher</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>

        <button type="submit" disabled={pending} className={styles.btnFilter}>
          {pending ? 'Filtering…' : 'Apply Filters'}
        </button>
      </form>

      {pending && <p role="status" className={styles.notice}>Loading staff records…</p>}
      {result.kind === 'invalid' && <p role="alert" className={styles.problem}>Check the filters and try again.</p>}
      {result.kind === 'error' && <p role="alert" className={styles.problem}>Staff records could not be loaded. Apply filters again to retry.</p>}

      {result.kind === 'ready' && (
        <>
          {result.rows.length ? (
            <div className={styles.tableCard}>
              <div className={styles.tableRegion} role="region" aria-label="Staff records" tabIndex={0}>
                <table className={styles.table}>
                  <caption className="sr-only">Staff accounts, page {result.page}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.th}>Staff member</th>
                      <th scope="col" className={styles.th}>Role</th>
                      <th scope="col" className={styles.th}>Department</th>
                      <th scope="col" className={styles.th}>Account status</th>
                      <th scope="col" className={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, index) => {
                      const statusClass =
                        row.status === 'active'
                          ? styles.badgeActive
                          : row.status === 'revoked'
                          ? styles.badgeRevoked
                          : styles.badgeInactive;

                      return (
                        <tr key={row.membership ?? index} className={styles.tr}>
                          <th scope="row" className={styles.td}>
                            <div className={styles.staffName}>{row.name}</div>
                            <div className={styles.staffMeta}>
                              {row.email ?? '—'} · {row.code ?? 'No employee ID'}
                            </div>
                          </th>
                          <td className={styles.td}>
                            <span className={styles.roleTag}>{row.role ?? 'Unassigned'}</span>
                          </td>
                          <td className={styles.td}>{row.department ?? '—'}</td>
                          <td className={styles.td}>
                            <span className={`${styles.badge} ${statusClass}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <StaffControls row={row} result={result} reload={reload} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p role="status" className={styles.notice}>No staff profiles match these filters.</p>
          )}

          <form action={action} className={styles.paginationBar} aria-label="Staff directory pagination">
            <input type="hidden" name="search" value={result.search} />
            <input type="hidden" name="status" value={result.status} />
            <input type="hidden" name="role" value={result.role} />
            <button
              name="page"
              value={result.page - 1}
              disabled={pending || result.page <= 1}
              className={styles.btnPage}
            >
              Previous
            </button>
            <span aria-live="polite">Page {result.page}</span>
            <button
              name="page"
              value={result.page + 1}
              disabled={pending || !result.hasNext}
              className={styles.btnPage}
            >
              Next
            </button>
          </form>
        </>
      )}
    </section>
  );
}
