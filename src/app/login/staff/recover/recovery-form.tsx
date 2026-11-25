'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldAlert } from 'lucide-react';
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
import { finishRecovery, requestRecovery } from './actions';

export function RecoveryForm({ code }: { readonly code: string }) {
  const [requested, request, requesting] = useActionState(requestRecovery, { ok: false, message: '' });
  const [finished, finish, finishing] = useActionState(finishRecovery, { ok: false, message: '' });
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (code) window.history.replaceState(null, '', '/login/staff/recover');
  }, [code]);

  return (
    <AuthShell
      tone="security"
      illustration="recovery"
      headline={
        <>
          Recover your
          <br />
          staff credentials.
        </>
      }
      description="Reset your password securely via your verified school email."
      trustNote="MFA-preserving recovery"
      backHref="/login/staff"
      backLabel="Staff sign-in"
      kicker="ACCOUNT RECOVERY"
      title={code ? 'Set a new password' : 'Recover your staff account'}
      subtitle={
        code
          ? 'Choose a strong password (12+ characters) and enter your authenticator code if enrolled.'
          : 'Enter your school email address to receive a recovery link.'
      }
      cardIcon={<KeyRound size={18} />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>Lost your authenticator? Contact your administrator.</span>
          <Link href="/login/staff" className={shellStyles.labelAction}>
            Back to staff sign-in &rarr;
          </Link>
        </div>
      }
    >
      <div className={shellStyles.formStack}>
        {!code ? (
          <form action={request} className={shellStyles.formStack} aria-busy={requesting}>
            <AuthField id="recover-email" label="School email">
              <AuthInput
                id="recover-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="name@school.edu"
                icon={<Mail size={15} />}
                required
                disabled={requesting}
              />
            </AuthField>

            <AuthButton type="submit" loading={requesting} loadingText="Sending recovery email…">
              Send recovery email
              <ArrowRight size={15} aria-hidden="true" />
            </AuthButton>

            {requested.message && (
              <AuthAlert variant={requested.ok ? 'success' : 'error'}>
                {requested.message}
              </AuthAlert>
            )}
          </form>
        ) : (
          <form action={finish} className={shellStyles.formStack} aria-busy={finishing}>
            <input type="hidden" name="code" value={code} />

            <AuthField id="recover-password" label="New password (at least 12 characters)">
              <AuthPasswordInput
                id="recover-password"
                name="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                icon={<LockKeyhole size={15} />}
                showLabel="Show new password"
                hideLabel="Hide new password"
                required
                disabled={finishing || finished.ok}
              />
              <AuthStrengthMeter password={password} />
            </AuthField>

            <AuthField id="recover-confirmation" label="Confirm password">
              <AuthPasswordInput
                id="recover-confirmation"
                name="confirmation"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                placeholder="Re-enter your new password"
                icon={<LockKeyhole size={15} />}
                showLabel="Show password confirmation"
                hideLabel="Hide password confirmation"
                required
                disabled={finishing || finished.ok}
              />
            </AuthField>

            <AuthField id="recover-totp" label="Authenticator code (if enrolled)">
              <AuthInput
                id="recover-totp"
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="000000"
                icon={<KeyRound size={15} />}
                disabled={finishing || finished.ok}
              />
            </AuthField>

            <AuthAlert variant="info">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} aria-hidden="true" />
                An email link cannot remove MFA. Contact your administrator if locked out.
              </span>
            </AuthAlert>

            <AuthButton
              type="submit"
              loading={finishing}
              disabled={finished.ok}
              loadingText="Updating password…"
            >
              Set password and sign out
            </AuthButton>

            {finished.message && (
              <AuthAlert variant={finished.ok ? 'success' : 'error'}>
                {finished.message}
              </AuthAlert>
            )}
          </form>
        )}
      </div>
    </AuthShell>
  );
}
