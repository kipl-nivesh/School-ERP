'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { manageAcademicRecord } from '@/app/staff/management-actions';
import type { AcademicOptions } from '@/lib/services/academic-directory';
import { managementForms, type ManagementKind } from '@/lib/services/management-contracts';
import styles from './academic-management.module.css';

function fieldLabel(kind: ManagementKind, field: string): string {
  if (kind === 'class' && field === 'name') return 'Class Name';
  if (kind === 'section' && field === 'name') return 'Section Name';
  const map: Record<string, string> = {
    label: 'Academic Year Name (e.g. 2026-2027)',
    startsOn: 'Start Date',
    endsOn: 'End Date',
    classId: 'Class',
    yearId: 'Academic Year',
    teacherId: 'Teacher',
    sectionId: 'Section',
    validFrom: 'Effective From',
    validUntil: 'Effective Until (Optional)',
    revision: 'Current Revision (0 for new slot)',
    subject: 'Subject Name or Code',
    period: 'Period Number',
    start: 'Start Time',
    end: 'End Time',
    due: 'Due Date',
    points: 'Maximum Points',
    title: 'Title',
    description: 'Description',
    day: 'Day of Week',
    status: 'Status',
  };
  return map[field] ?? field;
}

export function LiveManagementForm({
  kind,
  requestId,
  recordId,
  options,
  staff,
  inModal = false,
  onSuccess,
  onCancel,
}: {
  kind: ManagementKind;
  requestId: string;
  recordId: string;
  options?: AcademicOptions;
  staff?: { id: string; label: string }[];
  inModal?: boolean;
  onSuccess?: (message: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [request, setRequest] = useState(requestId);
  const [target, setTarget] = useState(recordId);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(
    async (prev: { ok: boolean; message: string }, formData: FormData) => {
      const res = await manageAcademicRecord(prev, formData);
      if (res.ok) {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          setRequest(crypto.randomUUID());
          setTarget(crypto.randomUUID());
        }
        setFormKey(k => k + 1);
        router.refresh();
        onSuccess?.(res.message);
      }
      return res;
    },
    { ok: false, message: '' },
  );
  const definition = managementForms[kind];

  const choices: Record<string, { id: string; label: string }[] | undefined> = {
    classId: options?.classes,
    yearId: options?.years,
    teacherId: staff,
    sectionId: options?.sections.map(section => ({
      id: section.id,
      label: [
        options.classes.find(entry => entry.id === section.classId)?.label,
        section.label,
        options.years.find(entry => entry.id === section.yearId)?.label,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  };

  const formContent = (
    <form key={formKey} action={action} className="space-y-4" aria-busy={pending}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="requestId" value={request} />
      {kind === 'homework' || kind === 'timetable' ? (
        <label className={styles.fieldLabel}>
          Record ID
          <input name="recordId" required defaultValue={kind === 'homework' ? '' : target} />
        </label>
      ) : (
        <input type="hidden" name="recordId" value={target} />
      )}

      <div className={styles.formGrid}>
        {definition.fields.map(field => {
          const items = choices[field];
          const label = fieldLabel(kind, field);
          const isRequired = field !== 'validUntil';
          return (
            <label key={field} className={styles.fieldLabel}>
              <span>
                {label}
                {isRequired && <span style={{ color: '#b91c1c' }}> *</span>}
              </span>
              {items ? (
                <select name={field} required={isRequired} defaultValue="">
                  <option value="" disabled>
                    Select {label.toLowerCase()}
                  </option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : field === 'day' ? (
                <select name={field}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <option key={day}>{day}</option>
                  ))}
                </select>
              ) : field === 'status' ? (
                <select name={field}>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <input
                  name={field}
                  required={isRequired}
                  maxLength={field === 'description' ? 10000 : 254}
                  type={
                    ['due', 'validFrom', 'validUntil', 'startsOn', 'endsOn'].includes(field)
                      ? 'date'
                      : ['start', 'end'].includes(field)
                        ? 'time'
                        : ['revision', 'points', 'period'].includes(field)
                          ? 'number'
                          : 'text'
                  }
                  defaultValue={field === 'revision' && kind === 'timetable' ? '0' : undefined}
                />
              )}
            </label>
          );
        })}
      </div>

      {state.message && !state.ok && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      {state.message && state.ok && !inModal && (
        <p className={styles.success} role="status">
          {state.message}
        </p>
      )}

      <div className={inModal ? styles.modalFooter : 'flex items-center gap-3'}>
        {inModal && onCancel && (
          <button type="button" className={styles.secondaryBtn} onClick={onCancel} disabled={pending}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending} className={styles.primaryBtn}>
          {pending ? 'Saving…' : `Save ${definition.title.replace('Create ', '').replace('Assign ', '')}`}
        </button>
      </div>
    </form>
  );

  if (inModal) return formContent;

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-base font-bold text-slate-900">{definition.title}</summary>
      <div className="mt-4">{formContent}</div>
    </details>
  );
}
