'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Check, ClipboardList, Copy, GraduationCap, ShieldCheck, User } from 'lucide-react';
import { saveAdmission, saveCollection, type RecordActionState } from '@/app/staff/record-actions';
import type { AcademicOptions } from '@/lib/services/academic-directory';
import styles from './admissions.module.css';

function Field({
  name,
  label,
  type = 'text',
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={styles.fieldLabel}>
      <span>
        {label}
        {required && <span className={styles.requiredMark}> *</span>}
      </span>
      <input name={name} type={type} required={required} maxLength={254} placeholder={placeholder} />
    </label>
  );
}

export function LiveAdmissionForm({ initialRequestId, options }: { initialRequestId: string; options?: AcademicOptions }) {
  const router = useRouter();
  const [requestId, setRequestId] = useState(initialRequestId);
  const [formKey, setFormKey] = useState(0);
  const [classId, setClassId] = useState('');
  const [copied, setCopied] = useState(false);
  const yearLabels = new Map(options?.years.map(year => [year.id, year.label]));

  const [state, action, pending] = useActionState(
    async (prev: RecordActionState, formData: FormData) => {
      const res = await saveAdmission(prev, formData);
      if (res.ok) {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          setRequestId(crypto.randomUUID());
        }
        setClassId('');
        setFormKey(k => k + 1);
        router.refresh();
      }
      return res;
    },
    { ok: false, message: '' },
  );

  return (
    <form key={formKey} action={action} className={styles.form} aria-busy={pending}>
      <div className={styles.heading}>
        <div className={styles.icon} aria-hidden="true">
          <GraduationCap size={22} />
        </div>
        <div>
          <h2>New Student Admission</h2>
          <p>Enroll a student into an active class and section. Portal activation is managed separately after admission.</p>
        </div>
      </div>

      <input type="hidden" name="requestId" value={requestId} />

      <fieldset className={styles.group}>
        <legend className={styles.groupLegend}>
          <User size={16} aria-hidden="true" /> 1. Student Information
        </legend>
        <div className={styles.fields}>
          <Field name="fullName" label="Full Name" placeholder="e.g. Jothimani" />
          <Field name="dateOfBirth" label="Date of Birth" type="date" />
          <label className={styles.fieldLabel}>
            <span>
              Gender <span className={styles.requiredMark}>*</span>
            </span>
            <select name="gender" required defaultValue="female">
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupLegend}>
          <BookOpen size={16} aria-hidden="true" /> 2. Academic Enrollment
        </legend>
        <div className={styles.fields}>
          {options ? (
            <>
              <label className={styles.fieldLabel}>
                <span>
                  Class <span className={styles.requiredMark}>*</span>
                </span>
                <select required name="classId" value={classId} onChange={event => setClassId(event.target.value)}>
                  <option value="">Choose class</option>
                  {options.classes.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                <span>
                  Section <span className={styles.requiredMark}>*</span>
                </span>
                <select key={classId} required name="sectionId" disabled={!classId} defaultValue="">
                  <option value="">{classId ? 'Choose section' : 'Select a class first'}</option>
                  {options.sections
                    .filter(item => item.classId === classId)
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                        {yearLabels.get(item.yearId) ? ' · ' + yearLabels.get(item.yearId) : ''}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <Field name="classId" label="Class" />
              <Field name="sectionId" label="Section" />
            </>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupLegend}>
          <ShieldCheck size={16} aria-hidden="true" /> 3. Guardian Information
        </legend>
        <div className={styles.fields}>
          <Field name="guardianName" label="Guardian Name" placeholder="Full name of parent or guardian" />
          <Field name="guardianPhone" label="Guardian Phone" type="tel" placeholder="+91 98765 43210" />
          <Field name="guardianEmail" label="Guardian Email (Optional)" type="email" required={false} placeholder="guardian@example.com" />
        </div>
        <p className={styles.help}>Guardian details are stored as an unverified contact. Admission does not create a login credential.</p>
      </fieldset>

      {options && !options.sections.length && (
        <p className={styles.notice} role="status">
          No enrollment sections are available yet. Create an Academic Year, Class, and Section in Academic Management first.
        </p>
      )}

      {state.message && !state.ok && (
        <p className={styles.problem} role="alert">
          {state.message}
        </p>
      )}

      {state.ok && (
        <div className={styles.success} role="status">
          <div>
            <strong>Admission Confirmed</strong>
            {state.admissionNumber ? ` · Registration ID: ${state.admissionNumber}` : ''}
          </div>
          <div className={styles.successActions}>
            {state.admissionNumber && (
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard?.writeText(state.admissionNumber!).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
              >
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                {copied ? 'Copied ID' : 'Copy ID'}
              </button>
            )}
            <a href="#students" data-admin-module="students" className={styles.portalLink}>
              Manage Student Portal Access <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.help}>Fields marked with * are required.</span>
        <button
          type="submit"
          disabled={pending || (!!options && !options.sections.length)}
          className={styles.submitBtn}
        >
          <ClipboardList size={16} aria-hidden="true" />
          {pending ? 'Saving Admission…' : 'Save Admission'}
        </button>
      </div>
    </form>
  );
}

export function LiveCollectionForm() {
  const [state, action, pending] = useActionState(saveCollection, { ok: false, message: '' });
  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <div className={styles.heading}>
        <div>
          <h2>Record a Fee Collection</h2>
        </div>
      </div>
      <div className={styles.fields}>
        <Field name="studentId" label="Student ID" />
        <Field name="invoiceId" label="Invoice ID" />
        <Field name="amountPaise" label="Amount in Paise" type="number" />
        <label className={styles.fieldLabel}>
          <span>
            Payment Method <span className={styles.requiredMark}>*</span>
          </span>
          <select name="paymentMethod">
            {['cash', 'upi', 'card', 'bank_transfer', 'cheque'].map(method => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </label>
        <Field name="transactionReference" label="Transaction Reference" />
        <Field name="idempotencyKey" label="Unique Payment Request Key (8–128 characters)" />
        <Field name="notes" label="Notes" required={false} />
      </div>
      <p className={styles.help}>Reuse the request key if the same payment needs to be retried. Use a new key for each different payment.</p>
      {state.message && (
        <p className={state.ok ? styles.success : styles.problem} role="status">
          {state.message}
        </p>
      )}
      <div className={styles.footer}>
        <span />
        <button type="submit" disabled={pending} className={styles.submitBtn}>
          {pending ? 'Saving…' : 'Record Collection'}
        </button>
      </div>
    </form>
  );
}
