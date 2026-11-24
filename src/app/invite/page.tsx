'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { acceptInvitation } from './actions';
import type { InvitationActionState } from './actions';
import styles from './invite.module.css';

const initialState: InvitationActionState = { ok: false, message: '', phase: 'idle' };

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function calculateStrength(pw: string) {
  if (!pw) return { score: 0, label: 'None', color: '#e2e8f0' };
  let score = 0;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak (min 12 chars)', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score: 3, label: 'Good', color: '#3b82f6' };
  return { score: 4, label: 'Strong', color: '#10b981' };
}

export default function InvitationPage() {
  const [token, setToken] = useState<string | null>();
  const [mode, setMode] = useState<'setup' | 'accept'>('setup');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [state, formAction, pending] = useActionState(acceptInvitation, initialState);

  useEffect(() => {
    const { hash, pathname, search } = window.location;
    const fragmentTokens = new URLSearchParams(hash.slice(1)).getAll('token');
    const queryTokens = new URLSearchParams(search).getAll('token');
    const tokens = [...fragmentTokens, ...queryTokens];
    const candidate = tokens.length === 1 ? tokens[0] : null;
    if (search || hash) window.history.replaceState(window.history.state, '', pathname);
    const validToken = candidate && /^[0-9a-f]{64}$/.test(candidate) ? candidate : null;
    queueMicrotask(() => setToken(previous => previous === undefined ? validToken : previous));
  }, []);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const passwordsMismatch = confirmation.length > 0 && password !== confirmation;

  if (token === undefined) return <main className={styles.container} aria-busy="true" />;

  if (!token) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div className={styles.brandTitle}>BRIGHTCAMP</div>
          </div>
          <div className={styles.portalBadge}>Staff Onboarding Portal</div>

          <div className={styles.stateCard}>
            <div className={`${styles.stateIconWrap} ${styles.stateIconError}`} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className={styles.stateTitle}>Open Your Staff Invitation</h1>
            <p className={styles.stateText}>
              If you came from the confirmation email, reopen your original invitation and choose Existing / Confirmed Account. Otherwise, open the complete link provided by your school administrator.
            </p>
            <div className={styles.stateBox}>
              <strong>Need assistance?</strong> Contact your school administrator to verify your email address or request a new private invitation link.
            </div>
            <Link href="/login/staff" className={styles.btnSecondary} style={{ width: '100%', marginTop: '8px' }}>
              Back to Staff Sign-in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (state.phase === 'pending_confirmation') {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div className={styles.brandTitle}>BRIGHTCAMP</div>
          </div>
          <div className={styles.portalBadge}>Staff Onboarding Portal</div>

          <div className={styles.stateCard}>
            <div className={`${styles.stateIconWrap} ${styles.stateIconPending}`} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className={styles.stateTitle}>Check Your Inbox</h1>
            <p className={styles.stateText}>
              We sent a verification email to complete your account registration.
            </p>
            <div className={styles.stateBox}>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Open the confirmation email in your inbox.</li>
                <li>Click the <strong>Confirm Email</strong> link.</li>
                <li>Return here to sign in and activate your staff workspace access.</li>
              </ol>
            </div>
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setMode('accept')}
            >
              I Have Confirmed My Email → Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (state.phase === 'accepted') {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div className={styles.brandTitle}>BRIGHTCAMP</div>
          </div>
          <div className={styles.portalBadge}>Staff Onboarding Portal</div>

          <div className={styles.stateCard}>
            <div className={`${styles.stateIconWrap} ${styles.stateIconSuccess}`} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className={styles.stateTitle}>Welcome to BRIGHTCAMP!</h1>
            <p className={styles.stateText}>
              Your staff account has been successfully linked to your school workspace.
            </p>
            <div className={styles.stateBox}>
              Sign in to access your school workspace once your administrator has activated your membership.
            </div>
            <Link href="/login/staff" className={styles.btnPrimary} style={{ width: '100%', marginTop: '8px', textDecoration: 'none' }}>
              Sign In to Staff Portal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className={styles.brandTitle}>BRIGHTCAMP</div>
        </div>
        <div className={styles.portalBadge}>Staff Onboarding Portal</div>

        <div className={styles.header}>
          <h1 className={styles.title}>
            {mode === 'setup' ? 'Set Up Staff Account' : 'Accept Staff Invitation'}
          </h1>
          <p className={styles.subtitle}>
            {mode === 'setup'
              ? 'Create a secure password to complete your staff profile registration.'
              : 'Sign in with your confirmed credentials to activate your school access.'}
          </p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Onboarding mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'setup'}
            className={`${styles.tab} ${mode === 'setup' ? styles.tabActive : ''}`}
            onClick={() => setMode('setup')}
          >
            New Account Setup
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'accept'}
            className={`${styles.tab} ${mode === 'accept' ? styles.tabActive : ''}`}
            onClick={() => setMode('accept')}
          >
            Existing / Confirmed Account
          </button>
        </div>

        {state.message && (
          <div className={state.ok ? styles.alertSuccess : styles.alertError} role="alert">
            {state.message}
          </div>
        )}

        <form action={formAction} className={styles.form} aria-busy={pending}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="intent" value={mode} />

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="invite-email">
              Invited Email Address
              <span className={styles.labelHint}>Must match invitation</span>
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              maxLength={254}
              placeholder="name@school.edu"
              className={styles.input}
              disabled={pending}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="invite-password">
              {mode === 'setup' ? 'Choose Password' : 'Password'}
              {mode === 'setup' && <span className={styles.labelHint}>Min. 12 characters</span>}
            </label>
            <div className={styles.inputWrap}>
              <input
                id="invite-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                maxLength={1024}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'setup' ? 'Create a secure password' : 'Enter your password'}
                className={`${styles.input} ${styles.inputWithToggle}`}
                disabled={pending}
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>

            {mode === 'setup' && password.length > 0 && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthBars}>
                  <div className={styles.strengthBar} style={{ backgroundColor: strength.score >= 1 ? strength.color : '#e2e8f0' }} />
                  <div className={styles.strengthBar} style={{ backgroundColor: strength.score >= 2 ? strength.color : '#e2e8f0' }} />
                  <div className={styles.strengthBar} style={{ backgroundColor: strength.score >= 3 ? strength.color : '#e2e8f0' }} />
                  <div className={styles.strengthBar} style={{ backgroundColor: strength.score >= 4 ? strength.color : '#e2e8f0' }} />
                </div>
                <div className={styles.strengthMeta}>
                  <span>Strength: <strong>{strength.label}</strong></span>
                  <span>{password.length}/12 chars</span>
                </div>
              </div>
            )}
          </div>

          {mode === 'setup' && (
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="invite-confirmation">
                Repeat Password
                {passwordsMatch && <span className={styles.matchValid}>✓ Passwords match</span>}
                {passwordsMismatch && <span className={styles.matchInvalid}>✕ Passwords do not match</span>}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="invite-confirmation"
                  name="confirmation"
                  type={showConfirmation ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  maxLength={1024}
                  value={confirmation}
                  onChange={e => setConfirmation(e.target.value)}
                  placeholder="Repeat your password"
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  disabled={pending}
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowConfirmation(!showConfirmation)}
                  aria-label={showConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  <EyeIcon visible={showConfirmation} />
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={pending || (mode === 'setup' && (password.length < 12 || password !== confirmation))}
          >
            {pending ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <span>{mode === 'setup' ? 'Creating Staff Account…' : 'Accepting Invitation…'}</span>
              </>
            ) : (
              <span>{mode === 'setup' ? 'Set Up New Account' : 'Accept Confirmed Account'}</span>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <span>Already have an active staff session?</span>
          <Link href="/login/staff" className={styles.footerLink}>
            Staff Sign-in
          </Link>
        </div>
      </div>
    </main>
  );
}
