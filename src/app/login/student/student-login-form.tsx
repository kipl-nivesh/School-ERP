'use client';

import { useActionState } from 'react';
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Hash,
  LockKeyhole,
  ShieldCheck,
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
import { loginStudent, type StudentActionState } from './actions';

const INITIAL_STUDENT_STATE: StudentActionState = {
  phase: 'idle',
  message: '',
};

export function StudentLoginForm({ liveAuthEnabled = true }: { liveAuthEnabled?: boolean }) {
  const [state, action, pending] = useActionState(loginStudent, INITIAL_STUDENT_STATE);

  return (
    <AuthShell
      tone="student"
      illustration="student"
      headline={
        <>
          Your classes.
          <br />
          Your achievements.
        </>
      }
      description={liveAuthEnabled ? 'Check your timetable, homework, attendance, and exam results.' : 'A preview of the Student sign-in experience.'}
      trustNote="6-digit Student PIN"
      backHref="/login"
      backLabel="Switch portal"
      activePortal="student"
      kicker="STUDENT PORTAL"
      title="Student sign-in"
      subtitle={liveAuthEnabled ? 'Enter your school code, Student ID, and six-digit PIN.' : 'Student sign-in is not available in this release.'}
      cardIcon={<GraduationCap size={18} />}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
            <ShieldCheck size={14} color="#2563eb" aria-hidden="true" />
            <span>Forgot PIN? Contact your school office.</span>
          </span>
        </div>
      }
    >
      <div className={shellStyles.formStack}>
        {!liveAuthEnabled && (
          <AuthAlert variant="info" title="Student portal preview">
            This preview does not accept credentials or open student records.
          </AuthAlert>
        )}

        <form action={liveAuthEnabled ? action : undefined} className={shellStyles.formStack} aria-busy={pending}>
          <AuthField id="school-code" label="School Code">
            <AuthInput
              id="school-code"
              name="schoolCode"
              type="text"
              autoComplete="organization"
              maxLength={20}
              placeholder="Your school’s code"
              icon={<Building2 size={15} />}
              required
              disabled={!liveAuthEnabled || pending}
            />
          </AuthField>

          <AuthField id="student-id" label="Student ID">
            <AuthInput
              id="student-id"
              name="studentId"
              type="text"
              autoComplete="username"
              maxLength={80}
              placeholder="Your admission or registration number"
              icon={<Hash size={15} />}
              required
              disabled={!liveAuthEnabled || pending}
            />
          </AuthField>

          <AuthField id="student-pin" label="6-digit Student PIN">
            <AuthPasswordInput
              id="student-pin"
              name="pin"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              autoComplete="current-password"
              placeholder="••••••"
              icon={<LockKeyhole size={15} />}
              showLabel="Show PIN"
              hideLabel="Hide PIN"
              required
              disabled={!liveAuthEnabled || pending}
            />
          </AuthField>

          <AuthButton
            type="submit"
            disabled={!liveAuthEnabled}
            loading={pending}
            loadingText="Verifying securely…"
          >
            {liveAuthEnabled ? 'Open Student Portal' : 'Student sign-in unavailable'}
            <ArrowRight size={15} aria-hidden="true" />
          </AuthButton>

          {state.message && (
            <AuthAlert variant="error" role="alert">
              {state.message}
            </AuthAlert>
          )}
        </form>
      </div>
    </AuthShell>
  );
}
