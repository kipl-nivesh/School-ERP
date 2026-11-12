import { staffClient } from '@/lib/staff/server';
import { redirect } from 'next/navigation';
import { selectSchool } from './select-school';
export const dynamic = 'force-dynamic';
export default async function SelectSchoolPage() {
  const client = await staffClient().catch(() => null);
  if (!client) redirect('/login/staff');
  const { data, error } = await client.rpc('list_school_memberships');
  if (error || !Array.isArray(data) || !data.length) redirect('/login/staff');
  return <main style={{ padding: '2rem' }}><h1>Select your school</h1><p>School Admin access requires your verified authenticator.</p>
    {data.map((m: {school_id: string;school_name: string;role_code: string}) => <form key={m.school_id + m.role_code} action={selectSchool}>
      <input type="hidden" name="school" value={m.school_id}/><input type="hidden" name="role" value={m.role_code}/>
      <button type="submit">{m.school_name} — {m.role_code}</button>
    </form>)}</main>;
}
