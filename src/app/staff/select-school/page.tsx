import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2 } from 'lucide-react';
import { listStaffSchoolChoices, staffClient } from '@/lib/staff/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthAlert } from '@/components/auth/auth-primitives';
import shellStyles from '@/components/auth/auth-shell.module.css';
import { selectSchool } from './select-school';

export const dynamic = 'force-dynamic';

export default async function SelectSchoolPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const client = await staffClient().catch(() => null);
  if (!client) redirect('/login/staff?notice=unavailable');
  const choices = await listStaffSchoolChoices(client);
  if (!choices.length) redirect('/login/staff?notice=no_access');
  const { notice } = await searchParams;

  return (
    <AuthShell
      tone="admin"
      illustration="campus"
      headline={
        <>
          Select your school
          <br />
          &amp; active role.
        </>
      }
      description="Choose the school workspace you want to open."
      trustNote="School-managed access"
      backHref="/staff"
      backLabel="Staff workspace"
      kicker="WORKSPACE SELECTION"
      title="Select your school and role"
      subtitle="School Admin access requires your verified authenticator."
      cardIcon={<Building2 size={18} />}
      footer={
        <Link href="/staff" className={shellStyles.labelAction}>
          Return to Staff workspace &rarr;
        </Link>
      }
    >
      <div className={shellStyles.formStack}>
        {notice === 'unavailable' && (
          <AuthAlert variant="error" role="alert">
            School and role selection could not be confirmed.
          </AuthAlert>
        )}

        <div style={{ display: 'grid', gap: '8px' }}>
          {choices.map(({ schoolId, schoolName, role }) => (
            <form key={`${schoolId}:${role}`} action={selectSchool}>
              <input type="hidden" name="school" value={schoolId} />
              <input type="hidden" name="role" value={role} />
              <button
                type="submit"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '11px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
                className="hover:border-indigo-300 hover:bg-slate-50"
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    {schoolName}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>
                    Role: {role}
                  </span>
                </div>
                <ArrowRight size={15} color="#64748b" aria-hidden="true" />
              </button>
            </form>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
