'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Mail,
  UserPlus,
} from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthInput,
  AuthPasswordInput,
  AuthStrengthMeter,
} from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import { acceptInvitation, type InvitationActionState } from './actions';

const initialState: InvitationActionState = { ok: false, message: '', phase: 'idle' };

export default function InvitationPage() {
  const [token, setToken] = useState<string | null>();
  const [mode, setMode] = useState<'setup' | 'accept'>('setup');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const [state, formAction, pending] = useActionState(acceptInvitation, initialState);

  useEffect(() => {
    const { hash, pathname, search } = window.location;
    const fragmentTokens = new URLSearchParams(hash.slice(1)).getAll('token');
    const queryTokens = new URLSearchParams(search).getAll('token');
    const tokens = [...fragmentTokens, ...queryTokens];
    const candidate = tokens.length === 1 ? tokens[0] : null;
    if (search || hash) window.history.replaceState(window.history.state, '', pathname);
    const validToken = candidate && /^[0-9a-f]{64}$/.test(candidate) ? candidate : null;
    queueMicrotask(() => setToken((previous) => (previous === undefined ? validToken : previous)));
  }, []);

  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const passwordsMismatch = confirmation.length > 0 && password !== confirmation;

  if (token === undefined) {
    return (
      <AuthShell
        tone="security"
        illustration="recovery"
        headline={
          <>
            Activate your
            <br />
            staff workspace.
          </>
        }
        description="Complete your invitation setup to join your school workspace."
        trustNote="Private staff invitation"
        backHref="/login/staff"
        backLabel="Staff sign-in"
        kicker="STAFF ONBOARDING"
        title="Validating invitation…"
        subtitle="Please wait while we prepare your onboarding session."
        cardIcon={<UserPlus size={18} />}
      >
        <div aria-busy="true" className={shellStyles.hint}>
          Checking invitation token…
        </div>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell
        tone="security"
        illustration="recovery"
        headline={
          <>
            Activate your
            <br />
            staff workspace.
          </>
        }
        description="Open the complete private invitation link from your administrator."
        trustNote="Private staff invitation"
        backHref="/login/staff"
        backLabel="Staff sign-in"
        kicker="STAFF ONBOARDING"
        title="Open your staff invitation"
        subtitle="A valid private invitation link is required to continue."
        cardIcon={<AlertCircle size={18} />}
      >
        <div className={shellStyles.formStack}>
          <AuthAlert variant="warning" title="Invitation token missing">
            If you came from a confirmation email, reopen your original invitation link and choose{' '}
            <strong>Existing / Confirmed</strong>. Otherwise, open the complete link provided by your school administrator.
          </AuthAlert>

          <Link href="/login/staff" className={shellStyles.btnSecondary} style={{ textDecoration: 'none' }}>
            Back to Staff Sign-in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (state.phase === 'pending_confirmation') {
    return (
      <AuthShell
        tone="security"
        illustration="recovery"
        headline={
          <>
            Confirm your
            <br />
            school email.
          </>
        }
        description="Verify your inbox link to finish activating your staff account."
        trustNote="Email ownership verification"
        backHref="/login/staff"
        backLabel="Staff sign-in"
        kicker="STAFF ONBOARDING"
        title="Check your inbox"
        subtitle="We sent a verification email to complete your registration."
        cardIcon={<Mail size={18} />}
      >
        <div className={shellStyles.formStack}>
          <AuthAlert variant="info" title="Next steps">
            <ol style={{ margin: '4px 0 0', paddingLeft: '1.1rem', display: 'grid', gap: '4px' }}>
              <li>Open the confirmation email in your inbox.</li>
              <li>Click the <strong>Confirm Email</strong> link.</li>
              <li>Return here to sign in and activate your access.</li>
            </ol>
          </AuthAlert>

          <AuthButton type="button" onClick={() => setMode('accept')}>
            I Have Confirmed My Email &rarr; Sign In
          </AuthButton>
        </div>
      </AuthShell>
    );
  }

  if (state.phase === 'accepted') {
    return (
      <AuthShell
        tone="parent"
        illustration="campus"
        headline={
          <>
            Welcome to
            <br />
            Brightcamp.
          </>
        }
        description="Your staff account is verified and ready."
        trustNote="Account activated"
        backHref="/login/staff"
        backLabel="Staff sign-in"
        kicker="STAFF ONBOARDING"
        title="Welcome to Brightcamp!"
        subtitle="Your staff account has been linked to your school workspace."
        cardIcon={<CheckCircle2 size={18} />}
      >
        <div className={shellStyles.formStack}>
          <AuthAlert variant="success" title="Account linked">
            Sign in to access your school workspace once your administrator activates your membership.
          </AuthAlert>

          <Link href="/login/staff" className={shellStyles.btnPrimary} style={{ textDecoration: 'none' }}>
            Sign In to Staff Portal
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      tone="admin"
      illustration="recovery"
      headline={
        <>
          Activate your
          <br />
          staff workspace.
        </>
      }
      description="Create a password or sign in to accept your school invitation."
      trustNote="Private staff invitation"
      backHref="/login/staff"
      backLabel="Staff sign-in"
      kicker="STAFF ONBOARDING"
      title={mode === 'setup' ? 'Set up staff account' : 'Accept staff invitation'}
      subtitle={
        mode === 'setup'
          ? 'Create a secure password to complete your registration.'
          : 'Sign in with your confirmed credentials to activate access.'
      }
      cardIcon={<UserPlus size={18} />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>Already have an active staff session?</span>
          <Link href="/login/staff" className={shellStyles.labelAction}>
            Staff Sign-in &rarr;
          </Link>
        </div>
      }
    >
      <div className={shellStyles.formStack}>
        <div
          className={shellStyles.roleTabs}
          style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
          role="tablist"
          aria-label="Onboarding mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'setup'}
            className={`${shellStyles.roleTab} ${mode === 'setup' ? shellStyles.roleTabActive : ''}`}
            onClick={() => setMode('setup')}
          >
            New Account Setup
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'accept'}
            className={`${shellStyles.roleTab} ${mode === 'accept' ? shellStyles.roleTabActive : ''}`}
            onClick={() => setMode('accept')}
          >
            Existing / Confirmed
          </button>
        </div>

        {state.message && (
          <AuthAlert variant={state.ok ? 'success' : 'error'} role="alert">
            {state.message}
          </AuthAlert>
        )}

        <form action={formAction} className={shellStyles.formStack} aria-busy={pending}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="intent" value={mode} />

          <AuthField id="invite-email" label="Invited email address">
            <AuthInput
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              maxLength={254}
              placeholder="name@school.edu"
              icon={<Mail size={15} />}
              disabled={pending}
            />
          </AuthField>

          <AuthField
            id="invite-password"
            label={mode === 'setup' ? 'Choose password' : 'Password'}
            hint={mode === 'setup' ? 'Minimum 12 characters.' : undefined}
          >
            <AuthPasswordInput
              id="invite-password"
              name="password"
              required
              autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
              maxLength={1024}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'setup' ? 'Create a secure password' : 'Enter your password'}
              icon={<LockKeyhole size={15} />}
              showLabel="Show password"
              hideLabel="Hide password"
              disabled={pending}
            />
            {mode === 'setup' && password.length > 0 && <AuthStrengthMeter password={password} />}
          </AuthField>

          {mode === 'setup' && (
            <AuthField
              id="invite-confirmation"
              label="Repeat password"
              action={
                passwordsMatch ? (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669' }}>
                    Passwords match
                  </span>
                ) : passwordsMismatch ? (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#dc2626' }}>
                    Passwords do not match
                  </span>
                ) : undefined
              }
            >
              <AuthPasswordInput
                id="invite-confirmation"
                name="confirmation"
                required
                autoComplete="new-password"
                maxLength={1024}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Repeat your password"
                icon={<LockKeyhole size={15} />}
                showLabel="Show password confirmation"
                hideLabel="Hide password confirmation"
                disabled={pending}
              />
            </AuthField>
          )}

          <AuthButton
            type="submit"
            loading={pending}
            disabled={mode === 'setup' && (password.length < 12 || password !== confirmation)}
            loadingText={mode === 'setup' ? 'Creating Staff Account…' : 'Accepting Invitation…'}
          >
            {mode === 'setup' ? 'Set Up New Account' : 'Accept Confirmed Account'}
          </AuthButton>
        </form>
      </div>
    </AuthShell>
  );
}
