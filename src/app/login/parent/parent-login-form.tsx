'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Hash,
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
  AuthPasswordInput,
} from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import {
  completeParentPinRecovery,
  loginParentPin,
  sendParentOtp,
  verifyParentOtp,
  type ParentActionState,
} from './actions';

const INITIAL_PARENT_STATE: ParentActionState = {
  phase: 'idle',
  message: '',
};

type AuthMode = 'pin' | 'recovery' | 'otp';

export function ParentLoginForm({ liveAuthEnabled = false }: { liveAuthEnabled?: boolean }) {
  const [mode, setMode] = useState<AuthMode>('pin');
  const [showGuardianEmail, setShowGuardianEmail] = useState(false);

  const [pinState, pinAction, pinPending] = useActionState(loginParentPin, INITIAL_PARENT_STATE);
  const [sendState, sendAction, sendPending] = useActionState(sendParentOtp, INITIAL_PARENT_STATE);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyParentOtp, INITIAL_PARENT_STATE);
  const [resetState, resetAction, resetPending] = useActionState(completeParentPinRecovery, INITIAL_PARENT_STATE);

  const [resetCodeStep, setResetCodeStep] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const activeIntent = mode === 'recovery' ? 'recovery' : 'signin';
  const activeEmail = verifyState.email || sendState.email;
  const isRecoveryPinStep =
    mode === 'recovery' &&
    resetState.phase !== 'pin_reset_done' &&
    (verifyState.phase === 'pin_reset' || resetState.phase === 'pin_reset') &&
    Boolean(resetState.recoveryToken || verifyState.recoveryToken);
  const recoveryToken = resetState.recoveryToken || verifyState.recoveryToken || '';
  const effectiveMode: AuthMode =
    mode === 'recovery' && resetState.phase === 'pin_reset_done' ? 'pin' : mode;
  const isCodeSent =
    effectiveMode !== 'pin' &&
    !isRecoveryPinStep &&
    (sendState.phase === 'code_sent' || verifyState.phase === 'code_sent') &&
    !resetCodeStep;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const feedbackMessage =
    effectiveMode === 'pin'
      ? resetState.phase === 'pin_reset_done'
        ? resetState.message
        : pinState.message
      : isRecoveryPinStep
        ? resetState.message || verifyState.message
        : verifyState.message || sendState.message;

  const hasError =
    effectiveMode === 'pin'
      ? pinState.phase === 'error'
      : sendState.phase === 'error' ||
        verifyState.phase === 'error' ||
        resetState.phase === 'error';

  const title =
    effectiveMode === 'pin'
      ? 'Parent sign-in'
      : isRecoveryPinStep
        ? 'Set new Parent PIN'
        : isCodeSent
          ? 'Enter verification code'
          : effectiveMode === 'recovery'
            ? 'Forgot Parent PIN'
            : 'Verified email OTP sign-in';

  const subtitle =
    effectiveMode === 'pin'
      ? liveAuthEnabled
        ? 'Enter your school code, linked Student ID, and 6-digit Parent PIN.'
        : 'Parent sign-in is not available in this release.'
      : isRecoveryPinStep
        ? 'Choose a new 6-digit Parent PIN for your guardian account.'
        : isCodeSent
          ? `Enter the one-time code sent to ${activeEmail}.`
          : effectiveMode === 'recovery'
            ? 'Verify your guardian email with a one-time code to set or reset your 6-digit Parent PIN.'
            : 'Sign in with a one-time verification code sent to your verified guardian email.';

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
      description={
        liveAuthEnabled
          ? 'Follow attendance, report cards, and school fees in one place.'
          : 'A preview of the Parent sign-in experience.'
      }
      trustNote="6-digit Parent PIN"
      backHref="/login"
      backLabel="Switch portal"
      activePortal="parent"
      kicker="PARENT & GUARDIAN"
      title={title}
      subtitle={subtitle}
      cardIcon={<Users size={18} />}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
            <ShieldCheck size={14} color="#059669" aria-hidden="true" />
            <span>Guardian-scoped access only.</span>
          </span>
          {effectiveMode === 'pin' ? (
            <button
              type="button"
              onClick={() => {
                setMode('otp');
                setResetCodeStep(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#047857',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign in with email OTP
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('pin');
                setResetCodeStep(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#047857',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={13} aria-hidden="true" /> Back to Parent PIN sign-in
            </button>
          )}
        </div>
      }
    >
      <div className={shellStyles.formStack}>
        {!liveAuthEnabled && (
          <AuthAlert variant="info" title="Parent portal preview">
            This preview does not accept credentials or open guardian records.
          </AuthAlert>
        )}
        {feedbackMessage && (
          <AuthAlert variant={hasError ? 'error' : 'info'} role={hasError ? 'alert' : 'status'}>
            {feedbackMessage}
          </AuthAlert>
        )}

        {effectiveMode === 'pin' && (
          <form
            action={liveAuthEnabled ? pinAction : undefined}
            className={shellStyles.formStack}
            aria-busy={pinPending}
          >
            <AuthField id="parent-school-code" label="School Code">
              <AuthInput
                id="parent-school-code"
                name="schoolCode"
                type="text"
                autoComplete="organization"
                maxLength={20}
                placeholder="e.g. BRIGHTCAMP"
                icon={<Building2 size={15} />}
                required
                disabled={!liveAuthEnabled || pinPending}
              />
            </AuthField>

            <AuthField id="parent-student-id" label="Parent ID (Student Registration ID)">
              <AuthInput
                id="parent-student-id"
                name="studentId"
                type="text"
                autoComplete="username"
                maxLength={80}
                placeholder="e.g. 20260001"
                icon={<Hash size={15} />}
                required
                disabled={!liveAuthEnabled || pinPending}
              />
            </AuthField>

            <AuthField id="parent-pin" label="6-Digit Parent PIN">
              <AuthPasswordInput
                id="parent-pin"
                name="pin"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={6}
                pattern="\d{6}"
                placeholder="Enter 6-digit Parent PIN"
                icon={<LockKeyhole size={15} />}
                required
                disabled={!liveAuthEnabled || pinPending}
              />
            </AuthField>

            <div>
              <button
                type="button"
                onClick={() => setShowGuardianEmail((prev) => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#475569',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {showGuardianEmail
                  ? 'Hide verified guardian email'
                  : 'Multiple guardians share this Student ID? Enter guardian email'}
              </button>
            </div>

            {showGuardianEmail && (
              <AuthField id="parent-disambig-email" label="Verified Guardian Email">
                <AuthInput
                  id="parent-disambig-email"
                  name="guardianEmail"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="guardian@example.com"
                  icon={<Mail size={15} />}
                  disabled={!liveAuthEnabled || pinPending}
                />
              </AuthField>
            )}

            <AuthButton type="submit" disabled={!liveAuthEnabled || pinPending}>
              {pinPending ? 'Signing in…' : 'Sign in to Parent Portal'}
              {!pinPending && <ArrowRight size={16} aria-hidden="true" />}
            </AuthButton>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setMode('recovery');
                  setResetCodeStep(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#047857',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Forgot Parent PIN?
              </button>
            </div>
          </form>
        )}

        {effectiveMode !== 'pin' && isRecoveryPinStep && (
          <form
            action={liveAuthEnabled ? resetAction : undefined}
            className={shellStyles.formStack}
            aria-busy={resetPending}
          >
            <input type="hidden" name="recoveryToken" value={recoveryToken} />
            <AuthField id="new-parent-pin" label="New 6-Digit Parent PIN">
              <AuthPasswordInput
                id="new-parent-pin"
                name="pin"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                pattern="\d{6}"
                placeholder="Enter 6 digits (e.g. 042819)"
                icon={<LockKeyhole size={15} />}
                required
                disabled={!liveAuthEnabled || resetPending}
              />
            </AuthField>
            <AuthField id="confirm-parent-pin" label="Confirm 6-Digit Parent PIN">
              <AuthPasswordInput
                id="confirm-parent-pin"
                name="confirmPin"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                pattern="\d{6}"
                placeholder="Re-enter 6-digit PIN"
                icon={<KeyRound size={15} />}
                required
                disabled={!liveAuthEnabled || resetPending}
              />
            </AuthField>
            <AuthButton type="submit" disabled={!liveAuthEnabled || resetPending}>
              {resetPending ? 'Saving PIN…' : 'Save new Parent PIN'}
              {!resetPending && <ArrowRight size={16} aria-hidden="true" />}
            </AuthButton>
          </form>
        )}

        {effectiveMode !== 'pin' && !isRecoveryPinStep && !isCodeSent && (
          <form
            action={liveAuthEnabled ? sendAction : undefined}
            onSubmit={() => {
              setResetCodeStep(false);
              setCooldown(60);
            }}
            className={shellStyles.formStack}
            aria-busy={sendPending}
          >
            <input type="hidden" name="intent" value={activeIntent} />
            <AuthField id="parent-email" label="Verified Guardian Email">
              <AuthInput
                id="parent-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="parent@example.com"
                icon={<Mail size={15} />}
                required
                disabled={!liveAuthEnabled || sendPending}
              />
            </AuthField>
            <AuthButton type="submit" disabled={!liveAuthEnabled || sendPending}>
              {sendPending ? 'Sending verification code…' : 'Send verification code'}
              {!sendPending && <ArrowRight size={16} aria-hidden="true" />}
            </AuthButton>
          </form>
        )}

        {effectiveMode !== 'pin' && !isRecoveryPinStep && isCodeSent && (
          <div className={shellStyles.formStack}>
            <form
              action={liveAuthEnabled ? verifyAction : undefined}
              className={shellStyles.formStack}
              aria-busy={verifyPending}
            >
              <input type="hidden" name="intent" value={activeIntent} />
              <input type="hidden" name="email" value={activeEmail || ''} />
              <AuthField id="parent-otp" label="One-time verification code">
                <AuthInput
                  id="parent-otp"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  placeholder="Enter verification code"
                  icon={<KeyRound size={15} />}
                  required
                  disabled={!liveAuthEnabled || verifyPending}
                />
              </AuthField>
              <AuthButton type="submit" disabled={!liveAuthEnabled || verifyPending}>
                {verifyPending
                  ? 'Verifying code…'
                  : mode === 'recovery'
                    ? 'Verify code & set PIN'
                    : 'Verify and sign in'}
                {!verifyPending && <LockKeyhole size={15} aria-hidden="true" />}
              </AuthButton>
            </form>

            <form
              action={liveAuthEnabled ? sendAction : undefined}
              onSubmit={() => setCooldown(60)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
            >
              <input type="hidden" name="intent" value={activeIntent} />
              <input type="hidden" name="email" value={activeEmail || ''} />
              <button
                type="button"
                onClick={() => setResetCodeStep(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#475569',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Use another email
              </button>
              <button
                type="submit"
                disabled={sendPending || cooldown > 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: cooldown > 0 ? '#94a3b8' : '#047857',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: cooldown > 0 ? 'default' : 'pointer',
                }}
              >
                <RefreshCw size={13} aria-hidden="true" />
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </form>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
