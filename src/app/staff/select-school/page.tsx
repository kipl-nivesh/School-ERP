import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listStaffSchoolChoices, staffClient } from '@/lib/staff/server';
import { selectSchool } from './select-school';

export const dynamic = 'force-dynamic';
export default async function SelectSchoolPage({ searchParams }: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const client = await staffClient().catch(() => null);
  if (!client) redirect('/login/staff?notice=unavailable');
  const choices = await listStaffSchoolChoices(client);
  if (!choices.length) redirect('/login/staff?notice=no_access');
  const { notice } = await searchParams;
  return <main style={{ padding: '2rem' }}>
    <h1>Select your school and role</h1>
    <p>School Admin access requires your verified authenticator.</p>
    {notice === 'unavailable' && <p role="alert">School and role selection could not be confirmed.</p>}
    {choices.map(({ schoolId, schoolName, role }) => <form key={schoolId + ':' + role} action={selectSchool}>
      <input type="hidden" name="school" value={schoolId} />
      <input type="hidden" name="role" value={role} />
      <button type="submit">{schoolName} — {role}</button>
    </form>)}
    <Link href="/staff">Return to Staff workspace</Link>
  </main>;
}
