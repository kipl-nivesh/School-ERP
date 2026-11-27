'use client';

import { useActionState, useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Search, X } from 'lucide-react';
import { filterAdmissionEnrollments, filterStudentDirectory } from '@/app/staff/student-directory-actions';
import type { DirectoryResult } from '@/lib/services/student-directory';
import styles from './student-directory.module.css';
import { StudentPortalControls } from './student-portal-controls';

const statusLabels = { active: 'Active', inactive: 'Inactive', withdrawn: 'Withdrawn' };
const portalLabels: Record<string, string> = {
  active: 'Active',
  pending_activation: 'Pending activation',
  suspended: 'Suspended',
  disabled: 'Disabled',
};

function CopyRegistrationButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copyBtn}
      aria-label={`Copy registration number ${value}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function StudentDirectory({ initial, admissions = false }: { initial: DirectoryResult; admissions?: boolean }) {
  const [result, action, pending] = useActionState(admissions ? filterAdmissionEnrollments : filterStudentDirectory, initial);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string>();
  const detailId = useId();
  const filterFormRef = useRef<HTMLFormElement>(null);
  const detailPanel = useRef<HTMLElement>(null);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const catalog = result.kind === 'ready' ? result : initial.kind === 'ready' ? initial : null;
  const options = catalog?.options ?? [];
  const classes = [...new Map(options.map(option => [option.classId, option.className])).entries()].sort(([, first], [, second]) =>
    first.localeCompare(second),
  );
  const detail = result.kind === 'ready' && result.rows.find(row => row.id === selected);

  useEffect(() => {
    if (detail) detailPanel.current?.focus();
  }, [detail]);

  const handleRefresh = useCallback(() => {
    filterFormRef.current?.requestSubmit();
  }, []);

  if (result.kind === 'denied') {
    return (
      <p className={styles.notice} role="status">
        Your current membership does not have permission to read these records.
      </p>
    );
  }

  return (
    <div className={styles.directory} aria-busy={pending}>
      <form ref={filterFormRef} action={action} className={styles.filters}>
        <label>
          Search by name or registration ID
          <input
            name="search"
            type="search"
            placeholder="Student name or BC-..."
            maxLength={80}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </label>
        <label>
          Class
          <select
            name="classId"
            value={classId}
            onChange={event => {
              setClassId(event.target.value);
              setSectionId('');
            }}
          >
            <option value="">All classes</option>
            {classes.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section
          <select name="sectionId" value={sectionId} onChange={event => setSectionId(event.target.value)}>
            <option value="">All sections</option>
            {options
              .filter(option => !classId || option.classId === classId)
              .map(option => (
                <option key={option.id} value={option.id}>
                  {[option.className, option.name, option.year].filter(Boolean).join(' · ')}
                </option>
              ))}
          </select>
        </label>
        <label>
          Enrollment status
          <select name="status" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending}>
          <Search size={16} aria-hidden="true" /> Apply filters
        </button>
      </form>

      {catalog?.moreOptions && (
        <p className={styles.notice}>
          The filter menu shows the first 200 available sections. Name, registration number, and status searches still cover the full directory.
        </p>
      )}
      {pending && (
        <p className={styles.notice} role="status">
          Loading student records…
        </p>
      )}
      {!pending && result.kind === 'invalid' && (
        <p className={styles.problem} role="alert">
          Check the selected filters. Search accepts letters, numbers, spaces, periods, apostrophes, and hyphens.
        </p>
      )}
      {!pending && result.kind === 'error' && (
        <p className={styles.problem} role="alert">
          Student records could not be loaded. Apply the filters again to retry.
        </p>
      )}
      {result.kind === 'ready' && (
        <>
          {result.rows.length ? (
            <div className={styles.tableRegion} role="region" aria-label="Student records" tabIndex={0}>
              <table>
                <caption className="sr-only">Student directory, page {result.filters.page}</caption>
                <thead>
                  <tr>
                    <th scope="col">Student &amp; Registration ID</th>
                    <th scope="col">Class / Section</th>
                    <th scope="col">Enrollment</th>
                    {!admissions && <th scope="col">Portal Access</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map(row => (
                    <tr key={row.id} data-selected={selected === row.id}>
                      <th scope="row">
                        <button
                          type="button"
                          className={styles.student}
                          aria-expanded={selected === row.id}
                          aria-controls={selected === row.id ? detailId : undefined}
                          onClick={event => {
                            detailTrigger.current = event.currentTarget;
                            setSelected(selected === row.id ? undefined : row.id);
                          }}
                        >
                          {row.name}
                        </button>
                        <div className={styles.regRow}>
                          <span className={styles.secondary} title={row.registration}>
                            {row.registration}
                          </span>
                          <CopyRegistrationButton value={row.registration} />
                        </div>
                      </th>
                      <td>{[row.className, row.sectionName, row.year].filter(Boolean).join(' · ') || 'Unassigned'}</td>
                      <td>
                        <span className={styles.status} data-status={row.status}>
                          {statusLabels[row.status]}
                        </span>
                      </td>
                      {!admissions && (
                        <td>
                          <span className={styles.portalBadge} data-portal={row.portalStatus ?? 'pending_activation'}>
                            {portalLabels[row.portalStatus ?? 'pending_activation'] ?? row.portalStatus?.replaceAll('_', ' ')}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.notice} role="status">
              No accessible students match these filters.
            </p>
          )}

          {detail && (
            <section
              ref={detailPanel}
              tabIndex={-1}
              className={styles.detail}
              id={detailId}
              aria-labelledby={detailId + '-heading'}
            >
              <div className={styles.detailHeader}>
                <h3 id={detailId + '-heading'}>{detail.name}</h3>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setSelected(undefined);
                    detailTrigger.current?.focus();
                  }}
                >
                  <X size={15} aria-hidden="true" /> Close details
                </button>
              </div>

              <div className={styles.detailSections}>
                <div className={styles.detailCard}>
                  <h4>Student Information</h4>
                  <dl>
                    <div>
                      <dt>Registration Number</dt>
                      <dd className={styles.regRow}>
                        <span>{detail.registration}</span>
                        <CopyRegistrationButton value={detail.registration} />
                      </dd>
                    </div>
                    <div>
                      <dt>Enrollment Status</dt>
                      <dd>
                        <span className={styles.status} data-status={detail.status}>
                          {statusLabels[detail.status]}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.detailCard}>
                  <h4>Academic Enrollment</h4>
                  <dl>
                    <div>
                      <dt>Class</dt>
                      <dd>{detail.className ?? 'Unavailable'}</dd>
                    </div>
                    <div>
                      <dt>Section</dt>
                      <dd>{detail.sectionName ?? 'Unavailable'}</dd>
                    </div>
                    <div>
                      <dt>Academic Year</dt>
                      <dd>{detail.year ?? 'Unavailable'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {!admissions && result.portalOperations && (
                <div className={styles.portalSection}>
                  <h4 className={styles.portalSectionTitle}>Student Portal Access &amp; Identity Provisioning</h4>
                  <StudentPortalControls
                    key={detail.id}
                    student={detail.id}
                    enrollmentStatus={detail.status}
                    identityLinked={!!detail.identityLinked}
                    portalStatus={detail.portalStatus ?? 'pending_activation'}
                    permissions={result.portalOperations}
                    onUpdated={handleRefresh}
                  />
                </div>
              )}
            </section>
          )}

          <form action={action} className={styles.pagination} aria-label="Student directory pagination">
            <input type="hidden" name="search" value={result.filters.search} />
            <input type="hidden" name="status" value={result.filters.status} />
            <input type="hidden" name="classId" value={result.filters.classId} />
            <input type="hidden" name="sectionId" value={result.filters.sectionId} />
            <button
              type="submit"
              name="page"
              value={result.filters.page - 1}
              disabled={pending || result.filters.page <= 1}
              onClick={() => setSelected(undefined)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Previous
            </button>
            <span aria-live="polite">Page {result.filters.page}</span>
            <button
              type="submit"
              name="page"
              value={result.filters.page + 1}
              disabled={pending || !result.hasNext}
              onClick={() => setSelected(undefined)}
            >
              Next <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
