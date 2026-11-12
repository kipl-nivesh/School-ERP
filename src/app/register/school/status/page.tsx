import { registrationStatus } from '@/lib/onboarding/database';
import { ApplicantMfa } from './mfa-form';
export const dynamic = 'force-dynamic';
export default async function RegistrationStatus({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return <main><h1>Registration status</h1><p>A valid registration reference is required.</p></main>;
  const status = await registrationStatus(id).catch(() => null);
  if (!status) return <main><h1>Registration status</h1><p>Sign in with the confirmed applicant account to view this registration. Local authentication may be disabled.</p></main>;
  return <main style={{ padding: '2rem' }}><h1>Registration status</h1><p>{status.status}</p>{status.status === 'pending' && <ApplicantMfa registration={id}/>}</main>;
}
