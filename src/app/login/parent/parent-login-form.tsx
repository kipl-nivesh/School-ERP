'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, GraduationCap, HeartHandshake, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { loginParent, INITIAL_PARENT_STATE } from './actions';
import styles from './parent-login.module.css';

export function ParentLoginForm({ liveAuthEnabled }: { liveAuthEnabled: boolean }) {
  const [state, action, pending] = useActionState(loginParent, INITIAL_PARENT_STATE);
  const [showPin, setShowPin] = useState(false);

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
              <span>Sign in with your child&apos;s Student ID + your unique Parent PIN.</span>
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
            <p className={styles.subtitle}>Enter your child&apos;s Student ID and your secret Parent PIN.</p>

            {!liveAuthEnabled && (
              <div className={styles.notice} role="status">
                <strong>Local review mode</strong>
                <span>Live Parent PIN verification is disabled. Credentials will not be submitted to a live server.</span>
              </div>
            )}

            <form action={action} className={styles.form} aria-busy={pending}>
              <label htmlFor="school-code">School Code <span style={{ fontWeight: 400, opacity: 0.7 }}>(Optional)</span></label>
              <input
                id="school-code"
                name="schoolCode"
                type="text"
                autoComplete="organization"
                maxLength={30}
                placeholder="e.g. BRIGHTCAMP"
                disabled={pending}
              />

              <label htmlFor="student-id">Student ID</label>
              <input
                id="student-id"
                name="studentId"
                type="text"
                autoComplete="username"
                maxLength={64}
                placeholder="e.g. STU2026001"
                required
                disabled={pending}
              />
              <small className={styles.hint}>Enter any verified child&apos;s ID if you have multiple children.</small>

              <label htmlFor="parent-pin">Six-digit Parent PIN</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="parent-pin"
                  name="pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  autoComplete="current-password"
                  placeholder="••••••"
                  required
                  disabled={pending}
                  style={{ width: '100%', paddingRight: '2.5rem', letterSpacing: showPin ? 'normal' : '0.25em' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(prev => !prev)}
                  tabIndex={-1}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className={styles.hint}>This PIN is unique to you and never shared with the student.</small>

              <button type="submit" disabled={pending}>
                {pending ? 'Verifying securely…' : 'Access Family Portal'}
                <ArrowRight size={17} />
              </button>

              {state.message && (
                <p className={styles.feedback} role="alert">
                  {state.message}
                </p>
              )}
            </form>

            <p className={styles.support}>
              Multiple guardians? Each parent/guardian receives an independent secret PIN. If multiple children attend, all linked children appear after sign-in.
            </p>

            <div className={styles.footer}>
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
