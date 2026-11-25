'use client';

import { useActionState } from 'react';
import Image from 'next/image';
import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthInput,
} from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import { applicantMfa } from './actions';

export function ApplicantMfa({ registration }: { readonly registration: string }) {
  const [state, action, pending] = useActionState(applicantMfa, { message: '' });

  return (
    <form action={action} className={shellStyles.formStack} aria-busy={pending}>
      <input type="hidden" name="registration" value={registration} />

      {state.message && (
        <AuthAlert variant="info" role="status">
          {state.message}
        </AuthAlert>
      )}

      {state.qr?.startsWith('data:image/svg+xml;base64,') && (
        <div className={shellStyles.qrBox}>
          <div className={shellStyles.qrFrame}>
            <Image
              src={state.qr}
              width={192}
              height={192}
              alt="Authenticator setup code"
              unoptimized
            />
          </div>
          <span className={shellStyles.hint} style={{ textAlign: 'center' }}>
            Scan this QR code with Google Authenticator, 1Password, or Microsoft Authenticator.
          </span>
        </div>
      )}

      {state.factor ? (
        <>
          <input type="hidden" name="factor" value={state.factor} />
          <AuthField
            id="applicant-mfa-code"
            label="Authenticator code"
            hint="Enter the 6-digit code shown in your authenticator app."
          >
            <AuthInput
              id="applicant-mfa-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              icon={<KeyRound size={16} />}
              aria-describedby="applicant-mfa-code-hint"
              required
              disabled={pending}
            />
          </AuthField>

          <AuthButton
            type="submit"
            name="intent"
            value="verify"
            loading={pending}
            loadingText="Verifying authenticator…"
          >
            Verify authenticator
          </AuthButton>
        </>
      ) : (
        <AuthButton
          type="submit"
          name="intent"
          value="enroll"
          loading={pending}
          loadingText="Generating authenticator…"
        >
          <ShieldCheck size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} aria-hidden="true" />
          Set up authenticator
        </AuthButton>
      )}
    </form>
  );
}
