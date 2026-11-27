'use client';

import { useActionState, useCallback, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Layers, Plus, Search, Users, X } from 'lucide-react';
import { filterAcademicRecords } from '@/app/staff/academic-directory-actions';
import { updateAcademicLifecycle } from '@/app/staff/management-actions';
import type { AcademicList, AcademicOptions, AcademicPage } from '@/lib/services/academic-directory';
import type { ManagementKind } from '@/lib/services/management-contracts';
import { LiveManagementForm } from './live-management-form';
import styles from './academic-management.module.css';

const labels = {
  years: {
    tab: 'Academic Years',
    title: 'Academic Years',
    createLabel: 'Create Academic Year',
    createKind: 'academic_year' as ManagementKind,
    search: 'Search academic year',
    columns: ['Academic Year', 'Start Date', 'End Date'],
    empty: 'No academic years registered yet. Create an academic year to begin setting up sections.',
  },
  classes: {
    tab: 'Classes',
    title: 'Classes',
    createLabel: 'Create Class',
    createKind: 'class' as ManagementKind,
    search: 'Search class name',
    columns: ['Class Name'],
    empty: 'No classes registered yet. Create a class such as Class 10.',
  },
  sections: {
    tab: 'Sections',
    title: 'Sections',
    createLabel: 'Create Section',
    createKind: 'section' as ManagementKind,
    search: 'Search section name',
    columns: ['Section', 'Class', 'Academic Year'],
    empty: 'No sections registered yet. Create a section linked to a class and academic year.',
  },
  assignments: {
    tab: 'Teaching Assignments',
    title: 'Teaching Assignments',
    createLabel: 'Assign Teacher',
    createKind: 'assignment' as ManagementKind,
    search: 'Search subject',
    columns: ['Subject', 'Teacher', 'Section', 'Effective From', 'Effective Until'],
    empty: 'No teaching assignments registered yet.',
  },
} as const;

type StaffOption = { id: string; label: string };

function AcademicRowEditor({
  kind,
  row,
  staff,
  onSaved,
}: {
  kind: Exclude<AcademicList, 'years'>;
  row: string[];
  staff: StaffOption[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: { ok: boolean; message: string }, formData: FormData) => {
      const res = await updateAcademicLifecycle(prev, formData);
      if (res.ok) {
        setOpen(false);
        router.refresh();
        onSaved();
      }
      return res;
    },
    { ok: false, message: '' },
  );
  const [replace, setReplace] = useState(false);
  const assignment = kind === 'assignments';

  return (
    <>
      <button type="button" className={styles.secondaryBtn} onClick={() => setOpen(true)}>
        {assignment ? 'End / Reassign' : 'Rename'}
      </button>
      {open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={assignment ? 'Update teaching assignment' : 'Rename record'}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>{assignment ? 'Update Teaching Assignment' : kind === 'classes' ? 'Rename Class' : 'Rename Section'}</h3>
              <button type="button" className={styles.secondaryBtn} onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <form action={action} aria-busy={pending} className="space-y-4">
              <input type="hidden" name="id" value={row.at(-1)} />
              <input type="hidden" name="expected" value={assignment ? (row[4] === '—' ? '' : row[4]) : row[0]} />
              <input
                type="hidden"
                name="kind"
                value={
                  assignment
                    ? replace
                      ? 'replace_assignment'
                      : 'end_assignment'
                    : kind === 'classes'
                      ? 'rename_class'
                      : 'rename_section'
                }
              />
              {assignment ? (
                <div className={styles.formGrid}>
                  <label className={styles.fieldLabel}>
                    Action
                    <select value={replace ? 'replace' : 'end'} onChange={event => setReplace(event.target.value === 'replace')}>
                      <option value="end">End assignment</option>
                      <option value="replace">Reassign section and subject</option>
                    </select>
                  </label>
                  <label className={styles.fieldLabel}>
                    Effective Date
                    <input name="effective" type="date" required />
                  </label>
                  {replace && (
                    <label className={styles.fieldLabel}>
                      Replacement Teacher
                      <select name="replacement" required defaultValue="">
                        <option value="" disabled>
                          Select replacement teacher
                        </option>
                        {staff.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <p className={styles.help}>Use a future effective date. Historical attendance, homework, and marks are retained.</p>
                </div>
              ) : (
                <label className={styles.fieldLabel}>
                  {kind === 'classes' ? 'Class Name' : 'Section Name'}
                  <input name="name" maxLength={80} defaultValue={row[0]} required />
                </label>
              )}
              {state.message && !state.ok && (
                <p role="alert" className={styles.error}>
                  {state.message}
                </p>
              )}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={pending}>
                  {pending ? 'Saving…' : 'Save Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function AcademicDirectory({
  kind,
  initial,
  options,
  staff = [],
  createIds,
}: {
  kind: AcademicList;
  initial: AcademicPage;
  options: AcademicOptions;
  staff?: StaffOption[];
  createIds?: { requestId: string; recordId: string };
}) {
  const [result, action, pending] = useActionState(filterAcademicRecords, initial);
  const [search, setSearch] = useState('');
  const [placement, setPlacement] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState('');
  const filterFormRef = useRef<HTMLFormElement>(null);
  const config = labels[kind];
  const id = useId();

  const facet =
    kind === 'sections'
      ? options.classes
      : kind === 'assignments'
        ? options.sections.map(section => ({
            id: section.id,
            label: placementName(section.id, options),
          }))
        : [];

  const handleRefresh = useCallback(() => {
    filterFormRef.current?.requestSubmit();
  }, []);

  if (result.kind === 'denied') {
    return (
      <p role="status" className={styles.notice}>
        This membership cannot read {config.title.toLowerCase()}.
      </p>
    );
  }

  const cell = (value: string, index: number) => {
    if (kind === 'sections' && index === 1) return options.classes.find(item => item.id === value)?.label ?? value;
    if (kind === 'sections' && index === 2) return options.years.find(item => item.id === value)?.label ?? value;
    if (kind === 'assignments' && index === 1) return staff.find(item => item.id === value)?.label ?? value;
    if (kind === 'assignments' && index === 2) return placementName(value, options);
    return value;
  };

  return (
    <section className={styles.card} aria-labelledby={id} aria-busy={pending}>
      <div className={styles.cardHeader}>
        <h3 id={id}>{config.title}</h3>
        {createIds && (
          <button type="button" className={styles.primaryBtn} onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" /> {config.createLabel}
          </button>
        )}
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          <span>{toast}</span>
          <button type="button" className={styles.secondaryBtn} onClick={() => setToast('')} aria-label="Dismiss notification">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {createOpen && createIds && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={config.createLabel}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>{config.createLabel}</h3>
              <button type="button" className={styles.secondaryBtn} onClick={() => setCreateOpen(false)} aria-label="Close">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <LiveManagementForm
              kind={config.createKind}
              requestId={createIds.requestId}
              recordId={createIds.recordId}
              options={options}
              staff={staff}
              inModal
              onCancel={() => setCreateOpen(false)}
              onSuccess={message => {
                setCreateOpen(false);
                setToast(message);
                handleRefresh();
              }}
            />
          </div>
        </div>
      )}

      <form ref={filterFormRef} action={action} className={styles.controls}>
        <input type="hidden" name="dataset" value={kind} />
        <label>
          {config.search}
          <input type="search" name="search" maxLength={80} placeholder={config.search + '…'} value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        {!!facet.length && (
          <label>
            {kind === 'sections' ? 'Filter by Class' : 'Filter by Section'}
            <select name="placement" value={placement} onChange={event => setPlacement(event.target.value)}>
              <option value="">All</option>
              {facet.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className={styles.primaryBtn} disabled={pending}>
          <Search size={16} aria-hidden="true" /> Apply Filters
        </button>
      </form>

      {pending && (
        <p role="status" className={styles.notice}>
          Loading {config.title.toLowerCase()}…
        </p>
      )}
      {!pending && result.kind === 'invalid' && (
        <p role="alert" className={styles.error}>
          Check your filters. Search accepts letters, numbers, spaces, periods, apostrophes, and hyphens.
        </p>
      )}
      {!pending && result.kind === 'error' && (
        <p role="alert" className={styles.error}>
          Records could not be loaded. Apply filters again to retry.
        </p>
      )}
      {result.kind === 'ready' && (
        <>
          {result.rows.length ? (
            <div className={styles.table} role="region" aria-label={config.title + ' table'} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    {config.columns.map(column => (
                      <th scope="col" key={column}>
                        {column}
                      </th>
                    ))}
                    {kind !== 'years' && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map(row => (
                    <tr key={row.at(-1)}>
                      {row.slice(0, config.columns.length).map((value, index) =>
                        index === 0 ? (
                          <th key={index} scope="row">
                            {cell(value, index)}
                          </th>
                        ) : (
                          <td key={index}>{cell(value, index)}</td>
                        ),
                      )}
                      {kind !== 'years' && (
                        <td>
                          <AcademicRowEditor kind={kind} row={row} staff={staff} onSaved={handleRefresh} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p role="status" className={styles.notice}>
              {config.empty}
            </p>
          )}

          <form action={action} className={styles.pager} aria-label={config.title + ' pagination'}>
            <input type="hidden" name="dataset" value={kind} />
            <input type="hidden" name="search" value={result.search} />
            <input type="hidden" name="placement" value={result.placement} />
            <button type="submit" name="page" value={result.page - 1} className={styles.secondaryBtn} disabled={pending || result.page === 1}>
              <ArrowLeft size={15} aria-hidden="true" /> Previous
            </button>
            <span aria-live="polite" className={styles.help}>
              Page {result.page}
            </span>
            <button type="submit" name="page" value={result.page + 1} className={styles.secondaryBtn} disabled={pending || !result.next}>
              Next <ArrowRight size={15} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </section>
  );
}

export function AcademicWorkspace({
  pages,
  options,
  staff,
  identifiers,
}: {
  pages: Record<AcademicList, AcademicPage>;
  options: AcademicOptions;
  staff: StaffOption[];
  identifiers: Record<AcademicList, { requestId: string; recordId: string }>;
}) {
  const [activeTab, setActiveTab] = useState<AcademicList>('years');

  const tabs: { id: AcademicList; label: string; icon: typeof Calendar }[] = [
    { id: 'years', label: labels.years.tab, icon: Calendar },
    { id: 'classes', label: labels.classes.tab, icon: BookOpen },
    { id: 'sections', label: labels.sections.tab, icon: Layers },
    { id: 'assignments', label: labels.assignments.tab, icon: Users },
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.tabBar}>
        <nav className={styles.tabs} aria-label="Academic management sections">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? styles.tabBtnActive : styles.tabBtn}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <AcademicDirectory
        key={activeTab}
        kind={activeTab}
        initial={pages[activeTab]}
        options={options}
        staff={staff}
        createIds={identifiers[activeTab]}
      />
    </div>
  );
}

function placementName(id: string, options: AcademicOptions) {
  const section = options.sections.find(option => option.id === id);
  if (!section) return id;
  const classroom = options.classes.find(option => option.id === section.classId);
  const year = options.years.find(option => option.id === section.yearId);
  return [classroom?.label, section.label, year?.label].filter(Boolean).join(' · ');
}
