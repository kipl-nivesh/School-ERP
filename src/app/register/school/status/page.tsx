import Link from 'next/link';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { registrationStatus } from '@/lib/onboarding/database';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthAlert } from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import { ApplicantMfa } from './mfa-form';

export const dynamic = 'force-dynamic';

export default async function RegistrationStatus({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const validId = Boolean(id && /^[0-9a-f-]{36}$/i.test(id));
  const status = validId && id ? await registrationStatus(id).catch(() => null) : null;

  return (
    <AuthShell
      tone="security"
      illustration="recovery"
      headline={
        <>
          School registration
          <br />
          &amp; MFA setup.
        </>
      }
      description="Confirm your school application status and enroll your authenticator."
      trustNote="Founding admin MFA check"
      backHref="/register/school"
      backLabel="School registration"
      kicker="REGISTRATION STATUS"
      title="Registration & MFA status"
      subtitle="Verify your application and complete authenticator enrollment."
      cardIcon={<ShieldCheck size={18} />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>Already verified?</span>
          <Link href="/login/staff?role=admin" className={shellStyles.labelAction}>
            Proceed to Admin sign-in &rarr;
          </Link>
        </div>
      }
    >
      <div className={shellStyles.formStack}>
        {!validId ? (
          <AuthAlert variant="error" title="Missing reference" role="alert">
            A valid registration reference is required to view this status page.
          </AuthAlert>
        ) : !status ? (
          <AuthAlert variant="warning" title="Authentication required">
            Sign in with the confirmed applicant account to view this registration. Local authentication may be disabled.
          </AuthAlert>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '11px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
                  Application status
                </span>
                <strong style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                  {status.status}
                </strong>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: status.status === 'pending' ? '#fef3c7' : '#d1fae5',
                  color: status.status === 'pending' ? '#b45309' : '#047857',
                }}
              >
                {status.status === 'pending' ? <Clock size={13} /> : <CheckCircle2 size={13} />}
                <span>{status.status === 'pending' ? 'MFA Setup Pending' : status.status}</span>
              </span>
            </div>

            {status.status === 'pending' && id && <ApplicantMfa registration={id} />}
          </>
        )}
      </div>
    </AuthShell>
  );
}
