'use server';
import { staffClient } from '@/lib/staff/server';
import { redirect } from 'next/navigation';
export async function selectSchool(form: FormData) {
  const school = form.get('school'), role = form.get('role');
  if (typeof school !== 'string' || !/^[0-9a-f-]{36}$/i.test(school) || !['admin','teacher','accountant'].includes(String(role))) redirect('/login/staff');
  const { data, error } = await (await staffClient(true)).rpc('select_school_context', { p_school: school, p_role: role });
  if (error || data !== true) redirect('/login/staff');
  redirect('/staff');
}
