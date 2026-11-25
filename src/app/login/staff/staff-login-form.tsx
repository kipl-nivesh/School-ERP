'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Coins,
  Crown,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { INITIAL_STAFF_STATE } from '@/lib/staff/contracts';
import type { StaffRole } from '@/lib/staff/contracts';
import { AuthShell, type AuthTone } from '@/components/auth/auth-shell';
import {
  AuthAlert,
  AuthButton,
  AuthField,
  AuthInput,
  AuthPasswordInput,
} from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import { staffAction, logoutStaff } from './actions';

const ROLE_CONFIG: Record<
  StaffRole,
  {
    readonly label: string;
    readonly tone: AuthTone;
    readonly kicker: string;
    readonly title: string;
    readonly subtitle: string;
    readonly headline: string;
    readonly description: string;
    readonly trustNote: string;
    readonly icon: typeof Crown;
  }
> = {
  admin: {
    label: 'Admin',
    tone: 'admin',
    kicker: 'ADMINISTRATION',
    title: 'Admin sign-in',
    subtitle: 'Sign in with your school administrator account.',
    headline: 'Lead your campus with clarity.',
    description: 'Admissions, staff management, and school operations in one place.',
    trustNote: 'Mandatory MFA for Admins',
    icon: Crown,
  },
  teacher: {
    label: 'Teacher',
    tone: 'teacher',
    kicker: 'FACULTY PORTAL',
    title: 'Teacher sign-in',
    subtitle: 'Access your classes, attendance, homework, and marks.',
    headline: 'Less admin. More teaching.',
    description: 'Everything you need for daily classes and student progress.',
    trustNote: 'School-managed staff access',
    icon: BookOpen,
  },
  accountant: {
    label: 'Accountant',
    tone: 'accountant',
    kicker: 'FINANCE & ACCOUNTS',
    title: 'Accountant sign-in',
    subtitle: 'Manage fee invoices, receipts, and financial reports.',
    headline: 'Precision in every ledger.',
    description: 'Clear tracking for school fees, receipts, and expenses.',
    trustNote: 'Audited finance access',
    icon: Coins,
  },
};

export function StaffLoginForm({
  requestsEnabled,
  notice,
  initialRole = 'admin',
}: {
  readonly requestsEnabled: boolean;
  readonly notice?: string;
  readonly initialRole?: StaffRole;
}) {
  const [state, action, pending] = useActionState(staffAction, INITIAL_STAFF_STATE);
  const [role, setRole] = useState<StaffRole>(initialRole);
  const activeConfig = ROLE_CONFIG[role];
  const RoleIcon = activeConfig.icon;
  const isMfaPhase = state.phase === 'mfa';

  return (
    <AuthShell
      tone={isMfaPhase ? 'security' : activeConfig.tone}
      illustration={isMfaPhase ? 'recovery' : role}
      headline={isMfaPhase ? 'Verify your authenticator.' : activeConfig.headline}
      description={
        isMfaPhase
          ? 'Enter the code from your school-authorized authenticator app.'
          : activeConfig.description
      }
      trustNote={activeConfig.trustNote}
      backHref="/login"
      backLabel="Switch portal"
      activePortal="staff"
      kicker={isMfaPhase ? 'SECURITY CHECK' : activeConfig.kicker}
      title={isMfaPhase ? 'One more security check' : activeConfig.title}
      subtitle={
        isMfaPhase
          ? 'Use your authenticator app to continue.'
          : activeConfig.subtitle
      }
      cardIcon={isMfaPhase ? <ShieldCheck size={18} /> : <RoleIcon size={18} />}
      footer={
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/register/school" className={shellStyles.labelAction}>
              Register a new school &rarr;
            </Link>
            <form action={logoutStaff}>
              <button
                type="submit"
                className={shellStyles.btnGhost}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                End staff session
              </button>
            </form>
          </div>
        </>
      }
    >
      <div className={shellStyles.formStack}>
        {!requestsEnabled && (
          <AuthAlert variant="info" title="Local review mode">
            Sign-in requests are disabled. Credentials are not sent to a live server.
          </AuthAlert>
        )}

        {notice === 'no_access' && (
          <AuthAlert variant="warning" title="Access notice" role="alert">
            No active school membership found. Contact your school administrator.
          </AuthAlert>
        )}

        {notice === 'unavailable' && (
          <AuthAlert variant="warning" title="Session notice" role="alert">
            Your previous session could not be confirmed. Please sign in again.
          </AuthAlert>
        )}

        <form action={requestsEnabled ? action : undefined} className={shellStyles.formStack} aria-busy={pending}>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="next" value={`/staff/${role}`} />

          <div className={shellStyles.field}>
            <span className={shellStyles.label} id="staff-role-label">
              Workspace
            </span>
            <div className={shellStyles.roleTabs} role="group" aria-labelledby="staff-role-label">
              {(['admin', 'teacher', 'accountant'] as const).map((option) => {
                const OptIcon = ROLE_CONFIG[option].icon;
                const active = role === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={pending || isMfaPhase}
                    onClick={() => setRole(option)}
                    aria-pressed={active}
                    className={`${shellStyles.roleTab} ${active ? shellStyles.roleTabActive : ''}`}
                  >
                    <OptIcon size={14} aria-hidden="true" />
                    <span>{ROLE_CONFIG[option].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!isMfaPhase ? (
            <>
              <AuthField id="staff-email" label="School email">
                <AuthInput
                  id="staff-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  maxLength={254}
                  placeholder="name@school.edu"
                  icon={<Mail size={15} />}
                  required
                  disabled={!requestsEnabled || pending}
                />
              </AuthField>

              <AuthField
                id="staff-password"
                label="Password"
                action={
                  <Link href="/login/staff/recover" className={shellStyles.labelAction}>
                    Forgot password?
                  </Link>
                }
              >
                <AuthPasswordInput
                  id="staff-password"
                  name="password"
                  autoComplete="current-password"
                  maxLength={1024}
                  placeholder="Enter your password"
                  icon={<LockKeyhole size={15} />}
                  showLabel="Show password"
                  hideLabel="Hide password"
                  required
                  disabled={!requestsEnabled || pending}
                />
              </AuthField>

              <AuthButton
                type="submit"
                name="intent"
                value="password"
                disabled={!requestsEnabled}
                loading={pending}
                loadingText="Checking securely…"
              >
                Continue to {activeConfig.label} workspace
                <ArrowRight size={15} aria-hidden="true" />
              </AuthButton>
            </>
          ) : (
            <>
              {state.qrDataUri?.startsWith('data:image/svg+xml;base64,') && (
                <div className={shellStyles.qrBox}>
                  <div className={shellStyles.qrFrame}>
                    <Image
                      unoptimized
                      src={state.qrDataUri}
                      alt="Authenticator enrollment QR code. Keep it private."
                      width={176}
                      height={176}
                    />
                  </div>
                  {state.secret && (
                    <div style={{ textAlign: 'center' }}>
                      <span className={shellStyles.hint} style={{ display: 'block' }}>
                        Manual setup key
                      </span>
                      <code className={shellStyles.secretCode}>{state.secret}</code>
                    </div>
                  )}
                </div>
              )}

              {state.factorId ? (
                <>
                  <input name="factorId" type="hidden" value={state.factorId} />
                  {state.qrDataUri && <input name="qrDataUri" type="hidden" value={state.qrDataUri} />}
                  {state.secret && <input name="secret" type="hidden" value={state.secret} />}

                  <AuthField id="staff-code" label="6-digit authenticator code">
                    <AuthInput
                      id="staff-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      minLength={6}
                      maxLength={6}
                      placeholder="000000"
                      icon={<KeyRound size={15} />}
                      required
                      disabled={!requestsEnabled || pending}
                    />
                  </AuthField>

                  {!state.qrDataUri && state.secret && (
                    <div style={{ textAlign: 'center' }}>
                      <span className={shellStyles.hint} style={{ display: 'block' }}>
                        Manual setup key
                      </span>
                      <code className={shellStyles.secretCode}>{state.secret}</code>
                    </div>
                  )}

                  <AuthButton
                    type="submit"
                    name="intent"
                    value="verify"
                    disabled={!requestsEnabled}
                loading={pending}
                    loadingText="Verifying…"
                  >
                    Verify authenticator
                  </AuthButton>
                </>
              ) : (
                <AuthButton
                  type="submit"
                  name="intent"
                  value="enroll"
                  disabled={!requestsEnabled}
                loading={pending}
                  loadingText="Preparing authenticator…"
                >
                  Set up authenticator
                </AuthButton>
              )}
            </>
          )}

          {state.message && (
            <AuthAlert variant={state.phase === 'error' || state.mfaError ? 'error' : 'info'}>
              {state.message}
            </AuthAlert>
          )}
        </form>
      </div>
    </AuthShell>
  );
}
