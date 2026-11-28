'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  ArrowRight,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthInput,
} from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import { sendParentOtp, verifyParentOtp, type ParentActionState } from './actions';

const INITIAL_PARENT_STATE: ParentActionState = {
  phase: 'idle',
  message: '',
};

export function ParentLoginForm({ liveAuthEnabled = false }: { liveAuthEnabled?: boolean }) {
  const [sendState, sendAction, sendPending] = useActionState(sendParentOtp, INITIAL_PARENT_STATE);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyParentOtp, INITIAL_PARENT_STATE);
  const [resetCodeStep, setResetCodeStep] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const activeEmail = verifyState.email || sendState.email;
  const isCodeSent = (sendState.phase === 'code_sent' || verifyState.phase === 'code_sent') && !resetCodeStep;
  const feedbackMessage = verifyState.message || sendState.message;
  const hasError = sendState.phase === 'error' || verifyState.phase === 'error';

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  return (
    <AuthShell
      tone="parent"
      illustration="parent"
      headline={
        <>
          Connected with
          <br />
          their journey.
        </>
      }
      description={liveAuthEnabled ? 'Follow attendance, report cards, and school fees in one place.' : 'A preview of the Parent sign-in experience.'}
      trustNote="Verified guardian email"
      backHref="/login"
      backLabel="Switch portal"
      activePortal="parent"
      kicker="PARENT & GUARDIAN"
      title={isCodeSent ? 'Enter verification code' : 'Parent sign-in'}
      subtitle={
        isCodeSent
          ? `Enter the one-time code sent to ${activeEmail}.`
          : liveAuthEnabled ? 'Use the guardian email verified by your school.' : 'Parent sign-in is not available in this release.'
      }
      cardIcon={<Users size={18} />}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
            <ShieldCheck size={14} color="#059669" aria-hidden="true" />
            <span>Guardian-scoped access only.</span>
          </span>
        </div>
      }
    >
      <div className={shellStyles.formStack}>
        {!liveAuthEnabled && <AuthAlert variant="info" title="Parent portal preview">
          This preview does not send verification codes or open guardian records.
        </AuthAlert>}
        {feedbackMessage && (
          <AuthAlert variant={hasError ? 'error' : 'info'} role={hasError ? 'alert' : 'status'}>
            {feedbackMessage}
          </AuthAlert>
        )}

        {!isCodeSent ? (
          <form
            action={liveAuthEnabled ? sendAction : undefined}
            onSubmit={() => {
              setResetCodeStep(false);
              setCooldown(60);
            }}
            className={shellStyles.formStack}
            aria-busy={sendPending}
          >
            <AuthField
              id="guardian-email"
              label="Guardian email"
              hint="We will send a one-time verification code to this address."
            >
              <AuthInput
                id="guardian-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="parent@example.com"
                defaultValue={activeEmail || ''}
                icon={<Mail size={15} />}
                aria-describedby="guardian-email-hint"
                required
                disabled={!liveAuthEnabled || sendPending}
              />
            </AuthField>

            <AuthButton
              type="submit"
              disabled={!liveAuthEnabled}
              loading={sendPending}
              loadingText="Sending code…"
            >
              {liveAuthEnabled ? 'Send one-time code' : 'Parent sign-in unavailable'}
              <ArrowRight size={15} aria-hidden="true" />
            </AuthButton>
          </form>
        ) : (
          <div className={shellStyles.formStack}>
            <form action={liveAuthEnabled ? verifyAction : undefined} className={shellStyles.formStack} aria-busy={verifyPending}>
              <input type="hidden" name="email" value={activeEmail || ''} />

              <AuthField id="guardian-code" label="One-time verification code">
                <AuthInput
                  id="guardian-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6–8 digit code"
                  maxLength={10}
                  icon={<KeyRound size={15} />}
                  required
                  disabled={!liveAuthEnabled || verifyPending}
                  autoFocus
                />
              </AuthField>

              <AuthButton
                type="submit"
                disabled={!liveAuthEnabled}
                loading={verifyPending}
                loadingText="Verifying code…"
              >
                Verify code &amp; Open Portal
                <ArrowRight size={15} aria-hidden="true" />
              </AuthButton>
            </form>

            <form
              action={liveAuthEnabled ? sendAction : undefined}
              onSubmit={() => {
                setResetCodeStep(false);
                setCooldown(60);
              }}
            >
              <input type="hidden" name="email" value={activeEmail || ''} />
              <AuthButton
                type="submit"
                variant="ghost"
                disabled={!liveAuthEnabled || sendPending || verifyPending || cooldown > 0}
                loading={sendPending}
                loadingText="Resending code…"
              >
                <RefreshCw size={14} aria-hidden="true" />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
              </AuthButton>
            </form>

            <AuthButton
              type="button"
              variant="ghost"
              onClick={() => setResetCodeStep(true)}
              disabled={!liveAuthEnabled || verifyPending || sendPending}
            >
              <LockKeyhole size={14} aria-hidden="true" />
              Use a different email address
            </AuthButton>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
