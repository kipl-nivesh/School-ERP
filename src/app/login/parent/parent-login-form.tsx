'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GraduationCap, HeartHandshake, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { sendParentOtp, verifyParentOtp, type ParentActionState } from './actions';
import styles from './parent-login.module.css';

const INITIAL_PARENT_STATE: ParentActionState = {
  phase: 'idle',
  message: '',
};

export function ParentLoginForm() {
  const [sendState, sendAction, sendPending] = useActionState(sendParentOtp, INITIAL_PARENT_STATE);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyParentOtp, INITIAL_PARENT_STATE);
  const [resetCodeStep, setResetCodeStep] = useState(false);

  const activeEmail = sendState.email || verifyState.email;
  const isCodeSent = (sendState.phase === 'code_sent' || verifyState.phase === 'code_sent') && !resetCodeStep;
  const feedbackMessage = verifyState.message || sendState.message;
  const hasError = sendState.phase === 'error' || verifyState.phase === 'error';

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.story} aria-labelledby="parent-welcome">
          <Link href="/" className={styles.brand}>
            <span><GraduationCap size={25} /></span> Brightcamp
          </Link>
          <div className={styles.storyBody}>
            <span className={styles.eyebrow}>
              <HeartHandshake size={15} /> Guardian & Family Portal
            </span>
            <h1 id="parent-welcome">
              Connected with<br /><em>their journey.</em>
            </h1>
            <p>Track academic attendance, view published report cards, manage school fees, and communicate with teachers.</p>
            <div className={styles.art} aria-hidden="true">
              <div className={styles.card}>
                <Users size={48} />
                <span>Family Space</span>
              </div>
            </div>
            <div className={styles.trust}>
              <LockKeyhole size={17} />
              <span>Sign in with a one-time code sent to your verified guardian email.</span>
            </div>
          </div>
          <small>Supporting every student&apos;s potential together.</small>
        </section>

        <section className={styles.panel} aria-labelledby="login-title">
          <Link className={styles.back} href="/">← Public previews</Link>
          <div className={styles.formWrap}>
            <span className={styles.icon}><Users size={26} /></span>
            <span className={styles.kicker}>PARENT & GUARDIAN PORTAL</span>
            <h2 id="login-title">Parent sign-in</h2>
            <p className={styles.subtitle}>
              {isCodeSent
                ? `Enter the verification code sent to ${activeEmail}.`
                : 'Use the guardian email verified by your school.'}
            </p>

            {feedbackMessage && (
              <div className={hasError ? styles.feedback : styles.notice} role="status">
                <span>{feedbackMessage}</span>
              </div>
            )}

            {!isCodeSent ? (
              <form action={sendAction} className={styles.form} aria-busy={sendPending}>
                <label htmlFor="guardian-email">Guardian email</label>
                <input
                  id="guardian-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. parent_a1@brightcamp.test"
                  defaultValue={activeEmail || ''}
                  required
                  disabled={sendPending}
                />
                <button type="submit" disabled={sendPending}>
                  {sendPending ? 'Sending code…' : 'Send one-time code'} <ArrowRight size={17} />
                </button>
              </form>
            ) : (
              <form action={verifyAction} className={styles.form} aria-busy={verifyPending}>
                <input type="hidden" name="email" value={activeEmail || ''} />
                <label htmlFor="guardian-code">One-time code</label>
                <input
                  id="guardian-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 8-digit code"
                  maxLength={10}
                  required
                  disabled={verifyPending}
                  autoFocus
                />
                <button type="submit" disabled={verifyPending}>
                  {verifyPending ? 'Verifying code…' : 'Verify code & Open Portal'} <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setResetCodeStep(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '11px',
                    marginTop: '8px',
                    textAlign: 'center'
                  }}
                >
                  Use a different email address
                </button>
              </form>
            )}

            <div className={styles.footer} style={{ marginTop: '24px' }}>
              <ShieldCheck size={16} />
              <span>Parent credentials never grant student or staff access.</span>
            </div>
          </div>
          <small className={styles.previewNote}>
            Looking for public preview? <Link href="/parent/dashboard" style={{ textDecoration: 'underline' }}>View Parent Preview</Link>
          </small>
        </section>
      </div>
    </main>
  );
}
