'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck } from 'lucide-react';
import { loginStudent, INITIAL_STUDENT_STATE } from './actions';
import styles from './student-login.module.css';

export function StudentLoginForm({ liveAuthEnabled }: { liveAuthEnabled: boolean }) {
  const [state, action, pending] = useActionState(loginStudent, INITIAL_STUDENT_STATE);
  const [showPin, setShowPin] = useState(false);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.story} aria-labelledby="student-welcome">
          <Link href="/" className={styles.brand}>
            <span><GraduationCap size={25} /></span> Brightcamp
          </Link>
          <div className={styles.storyBody}>
            <span className={styles.eyebrow}>
              <BookOpen size={15} /> Student Learning Space
            </span>
            <h1 id="student-welcome">
              Your classes.<br /><em>Your achievements.</em>
            </h1>
            <p>Check your timetable, review homework, track attendance, and celebrate learning goals.</p>
            <div className={styles.art} aria-hidden="true">
              <div className={styles.card}>
                <GraduationCap size={48} />
                <span>Student Hub</span>
              </div>
            </div>
            <div className={styles.trust}>
              <LockKeyhole size={17} />
              <span>Independent 6-digit Student PIN. Keep it private.</span>
            </div>
          </div>
          <small>Designed for curious minds.</small>
        </section>

        <section className={styles.panel} aria-labelledby="login-title">
          <Link className={styles.back} href="/">← Public previews</Link>
          <div className={styles.formWrap}>
            <span className={styles.icon}><GraduationCap size={26} /></span>
            <span className={styles.kicker}>STUDENT PORTAL</span>
            <h2 id="login-title">Student sign-in</h2>
            <p className={styles.subtitle}>Enter your School Code, Student ID and 15-digit PIN.</p>

            {!liveAuthEnabled && (
              <div className={styles.notice} role="status">
                <strong>Local review mode</strong>
                <span>Live PIN verification is disabled. Credentials will not be submitted to a live server.</span>
              </div>
            )}

            <form action={liveAuthEnabled ? action : undefined} className={styles.form} aria-busy={pending}>
              <label htmlFor="school-code">School Code</label>
              <input
                id="school-code"
                name="schoolCode"
                type="text"
                autoComplete="organization"
                maxLength={30}
                required
                placeholder="e.g. BRIGHTCAMP"
                disabled={!liveAuthEnabled || pending}
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
                disabled={!liveAuthEnabled || pending}
              />
              <small className={styles.hint}>Issued on your school admission card.</small>

              <label htmlFor="student-pin">15-digit Student PIN</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="student-pin"
                  name="pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]{15}"
                  minLength={15}
                  maxLength={15}
                  autoComplete="current-password"
                  placeholder="•••••••••••••••"
                  required
                  disabled={!liveAuthEnabled || pending}
                  style={{ width: '100%', paddingRight: '2.5rem', letterSpacing: showPin ? 'normal' : '0.25em' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(prev => !prev)}
                  disabled={!liveAuthEnabled || pending}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small className={styles.hint}>Never share your Student PIN with other students.</small>

              <button type="submit" disabled={!liveAuthEnabled || pending}>
                {pending ? 'Verifying securely…' : 'Open Student Portal'}
                <ArrowRight size={17} />
              </button>

              {state.message && (
                <p className={styles.feedback} role="alert">
                  {state.message}
                </p>
              )}
            </form>

            <p className={styles.support}>
              Forgot your PIN? Contact the school office with your parent or guardian for help. Online PIN recovery is unavailable.
            </p>

            <div className={styles.footer}>
              <ShieldCheck size={16} />
              <span>Student credentials only authenticate student accounts.</span>
            </div>
          </div>
          <small className={styles.previewNote}>
            Looking for public preview? <Link href="/student/dashboard" style={{ textDecoration: 'underline' }}>View Student Preview</Link>
          </small>
        </section>
      </div>
    </main>
  );
}
