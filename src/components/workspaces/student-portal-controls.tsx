'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Lock, Mail, RefreshCw, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import {
  inspectStudentPortalAction,
  manageStudentPortal,
  type StudentPortalActionState,
} from '@/app/staff/student-portal-actions';
import styles from './student-directory.module.css';

type Intent = 'link' | 'activate' | 'initialize' | 'reset' | 'suspend';

const initialState: StudentPortalActionState = { ok: false, message: '' };

function MfaChallengeField({ factorId, pending }: { factorId?: string; pending: boolean }) {
  if (!factorId) return null;
  return (
    <div className={styles.portalFieldsRow}>
      <input type="hidden" name="factorId" value={factorId} />
      <label className={styles.fieldLabel}>
        Authenticator Verification Code <span className={styles.requiredMark}>*</span>
        <input
          type="text"
          name="mfaCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="6-digit authenticator code"
          required
          disabled={pending}
        />
      </label>
    </div>
  );
}

export function StudentPortalControls({
  student,
  enrollmentStatus,
  identityLinked,
  portalStatus,
  permissions,
  onUpdated,
}: {
  student: string;
  enrollmentStatus: string;
  identityLinked: boolean;
  portalStatus: string;
  permissions: readonly Intent[];
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: StudentPortalActionState, formData: FormData) => {
      const res = await manageStudentPortal(prev, formData);
      if (
        res.ok &&
        (res.phase === 'linked' ||
          res.phase === 'activated' ||
          res.phase === 'reset' ||
          res.phase === 'suspended' ||
          res.phase === 'initialized')
      ) {
        setTimeout(() => {
          router.refresh();
          onUpdated?.();
        }, 0);
      }
      return res;
    },
    initialState,
  );
  const [email, setEmail] = useState('');
  const [inspectedEmail, setInspectedEmail] = useState<string | null>(null);
  const [inspectedConfirmed, setInspectedConfirmed] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'reset' | 'suspend' | 'initialize'>('reset');

  useEffect(() => {
    let cancelled = false;
    inspectStudentPortalAction(student).then(info => {
      if (cancelled || !info) return;
      if (info.linked_email) setInspectedEmail(info.linked_email);
      if (typeof info.linked_email_confirmed === 'boolean') setInspectedConfirmed(info.linked_email_confirmed);
    });
    return () => {
      cancelled = true;
    };
  }, [student, identityLinked, portalStatus]);

  const linkedEmail = state.linkedEmail ?? inspectedEmail;
  const emailConfirmed = state.emailConfirmed ?? inspectedConfirmed;

  if (!permissions.length) {
    return (
      <p className={styles.portalHint}>
        Your current role does not have permission to manage student portal credentials.
      </p>
    );
  }

  const step1Done = identityLinked || state.phase === 'linked' || portalStatus === 'active';
  const step2Done = portalStatus === 'active' || state.phase === 'activated';

  return (
    <div className={styles.portalWorkspace}>
      {/* Activation Progress Stepper */}
      <ol className={styles.stepper} aria-label="Student portal activation progress">
        <li className={styles.stepItem} data-state={step1Done ? 'complete' : state.phase === 'invited' || state.phase === 'pending_verification' ? 'pending' : 'current'}>
          <span className={styles.stepIndex}>{step1Done ? <CheckCircle2 size={14} aria-hidden="true" /> : '1'}</span>
          <div>
            <strong>Identity &amp; Email Verification</strong>
            <span>{step1Done ? (linkedEmail ? `Verified (${linkedEmail})` : 'Verified identity linked') : state.phase === 'invited' || state.phase === 'pending_verification' ? 'Awaiting inbox confirmation' : 'Invite or link verified email'}</span>
          </div>
        </li>
        <li className={styles.stepItem} data-state={step2Done ? 'complete' : step1Done ? 'current' : 'upcoming'}>
          <span className={styles.stepIndex}>{step2Done ? <CheckCircle2 size={14} aria-hidden="true" /> : '2'}</span>
          <div>
            <strong>PIN Setup &amp; Activation</strong>
            <span>{step2Done ? '6-digit PIN active' : 'Assign 6-digit PIN to activate'}</span>
          </div>
        </li>
        <li className={styles.stepItem} data-state={step2Done ? 'complete' : 'upcoming'}>
          <span className={styles.stepIndex}>{step2Done ? <ShieldCheck size={14} aria-hidden="true" /> : '3'}</span>
          <div>
            <strong>Portal Status</strong>
            <span>{portalStatus === 'active' ? 'Active & ready for sign-in' : portalStatus.replaceAll('_', ' ')}</span>
          </div>
        </li>
      </ol>

      {enrollmentStatus !== 'active' && (
        <p className={styles.problem} role="status">
          Student enrollment is currently <strong>{enrollmentStatus}</strong>. Only actively enrolled students can be provisioned or activated.
        </p>
      )}

      {/* Stage 1: Pending Identity Linking */}
      {!step1Done && permissions.includes('link') && enrollmentStatus === 'active' && (
        <form action={action} className={styles.portalForm} aria-busy={pending}>
          <input type="hidden" name="student" value={student} />
          <input type="hidden" name="intent" value="provision" />
          <div className={styles.portalFormHeader}>
            <Mail size={16} aria-hidden="true" />
            <div>
              <h4>Provision &amp; Link Student Identity</h4>
              <p>Enter the student&apos;s personal email. If no account exists yet, a verification email will be sent. Staff, guardian, and other student emails are blocked.</p>
            </div>
          </div>
          <div className={styles.portalFieldsRow}>
            <label className={styles.fieldLabel}>
              Student Email Address <span className={styles.requiredMark}>*</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@example.com"
                autoComplete="off"
                maxLength={254}
                required
                disabled={pending}
              />
            </label>
          </div>
          <MfaChallengeField factorId={state.factorId} pending={pending} />
          <div className={styles.portalActionsRow}>
            <button type="submit" className={styles.primaryBtn} disabled={pending || !email.trim()}>
              <UserCheck size={16} aria-hidden="true" />
              {pending ? 'Checking…' : state.phase === 'invited' || state.phase === 'pending_verification' ? 'Check & Link Verified Identity' : 'Send Verification or Link'}
            </button>
            {(state.phase === 'invited' || state.phase === 'pending_verification') && (
              <button
                type="submit"
                name="resend"
                value="true"
                className={styles.secondaryBtn}
                disabled={pending || !email.trim()}
              >
                <RefreshCw size={15} aria-hidden="true" />
                Resend Verification Email
              </button>
            )}
          </div>
        </form>
      )}

      {/* Stage 2: Linked Identity -> Set 6-digit PIN & Activate (or Reactivate if Suspended) */}
      {step1Done && !step2Done && permissions.includes('activate') && enrollmentStatus === 'active' && (
        <form action={action} className={styles.portalForm} aria-busy={pending}>
          <input type="hidden" name="student" value={student} />
          <input type="hidden" name="intent" value="activate" />
          <div className={styles.portalFormHeader}>
            <KeyRound size={16} aria-hidden="true" />
            <div>
              <h4>{portalStatus === 'suspended' ? 'Reactivate Student Portal' : 'Set Six-Digit PIN & Activate Portal'}</h4>
              <p>
                {linkedEmail ? `Linked verified email: ${linkedEmail}. ` : 'Verified identity linked. '}
                Assign a six-digit numeric PIN for student portal login.
              </p>
            </div>
          </div>
          <div className={styles.portalFieldsRow}>
            <label className={styles.fieldLabel}>
              New Six-Digit PIN <span className={styles.requiredMark}>*</span>
              <input
                type="password"
                name="pin"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="6 digits (e.g. 482910)"
                required
                disabled={pending}
              />
            </label>
          </div>
          <MfaChallengeField factorId={state.factorId} pending={pending} />
          <div className={styles.portalActionsRow}>
            <button type="submit" className={styles.primaryBtn} disabled={pending}>
              <ShieldCheck size={16} aria-hidden="true" />
              {pending ? 'Activating…' : portalStatus === 'suspended' ? 'Reactivate & Save PIN' : 'Activate Portal & Save PIN'}
            </button>
          </div>
        </form>
      )}

      {/* Stage 3: Active Portal -> Reset PIN / Suspend / Initialize Entitlement */}
      {step2Done && (
        <div className={styles.portalActiveBox}>
          <div className={styles.portalMetaRow}>
            <span className={styles.portalBadge} data-portal="active">Portal Active</span>
            {linkedEmail && (
              <span className={styles.linkedEmailChip}>
                {linkedEmail} {emailConfirmed ? '· Verified' : ''}
              </span>
            )}
          </div>

          <div className={styles.modeSwitch} role="tablist" aria-label="Active student portal actions">
            {permissions.includes('reset') && (
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'reset'}
                className={activeMode === 'reset' ? styles.modeBtnActive : styles.modeBtn}
                onClick={() => setActiveMode('reset')}
              >
                <KeyRound size={14} aria-hidden="true" /> Reset PIN
              </button>
            )}
            {permissions.includes('suspend') && (
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'suspend'}
                className={activeMode === 'suspend' ? styles.modeBtnActive : styles.modeBtn}
                onClick={() => setActiveMode('suspend')}
              >
                <ShieldAlert size={14} aria-hidden="true" /> Suspend Access
              </button>
            )}
            {permissions.includes('initialize') && (
              <button
                type="button"
                role="tab"
                aria-selected={activeMode === 'initialize'}
                className={activeMode === 'initialize' ? styles.modeBtnActive : styles.modeBtn}
                onClick={() => setActiveMode('initialize')}
              >
                <RefreshCw size={14} aria-hidden="true" /> Entitlement
              </button>
            )}
          </div>

          {activeMode === 'reset' && permissions.includes('reset') && (
            <form action={action} className={styles.portalForm} aria-busy={pending}>
              <input type="hidden" name="student" value={student} />
              <input type="hidden" name="intent" value="reset" />
              <label className={styles.fieldLabel}>
                New Six-Digit PIN <span className={styles.requiredMark}>*</span>
                <input
                  type="password"
                  name="pin"
                  inputMode="numeric"
                  autoComplete="new-password"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter new 6-digit PIN"
                  required
                  disabled={pending}
                />
              </label>
              <MfaChallengeField factorId={state.factorId} pending={pending} />
              <p className={styles.portalHint}>Resetting the PIN immediately revokes all active student sessions.</p>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending ? 'Updating PIN…' : 'Update PIN & Revoke Sessions'}
              </button>
            </form>
          )}

          {activeMode === 'suspend' && permissions.includes('suspend') && (
            <form action={action} className={styles.portalForm} aria-busy={pending}>
              <input type="hidden" name="student" value={student} />
              <input type="hidden" name="intent" value="suspend" />
              <MfaChallengeField factorId={state.factorId} pending={pending} />
              <p className={styles.portalHint}>
                Suspending portal access immediately revokes active student sessions and blocks sign-in until reactivated.
              </p>
              <button type="submit" className={styles.dangerBtn} disabled={pending}>
                {pending ? 'Suspending…' : 'Suspend Student Portal Access'}
              </button>
            </form>
          )}

          {activeMode === 'initialize' && permissions.includes('initialize') && (
            <form action={action} className={styles.portalForm} aria-busy={pending}>
              <input type="hidden" name="student" value={student} />
              <input type="hidden" name="intent" value="initialize" />
              <p className={styles.portalHint}>
                Ensure portal entitlement is initialized for this student. Existing trial dates are preserved.
              </p>
              <button type="submit" className={styles.secondaryBtn} disabled={pending}>
                {pending ? 'Checking…' : 'Initialize Portal Entitlement'}
              </button>
            </form>
          )}
        </div>
      )}

      {state.passwordRequired && (
        <div className={styles.problem} role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span>{state.message}</span>
          <Link href="/login/staff?role=admin" className={styles.primaryBtn} style={{ textDecoration: 'none' }}>
            <Lock size={15} aria-hidden="true" /> Re-authenticate Admin Session
          </Link>
        </div>
      )}

      {state.factorId && !state.ok && (
        <div className={styles.notice} role="status">
          <strong>Fresh Authenticator Verification Required:</strong> {state.message}
        </div>
      )}

      {state.message && !state.passwordRequired && !state.factorId && (
        <p className={state.ok ? styles.successBanner : styles.problem} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      )}
    </div>
  );
}
