'use server';

import { redirect } from 'next/navigation';
import { isStaffRole, isStaffUuid } from '@/lib/staff/contracts';
import { listStaffSchoolChoices, loadStaffResolution, staffClient } from '@/lib/staff/server';

export async function selectSchool(form: FormData) {
  const school = form.get('school');
  const role = form.get('role');
  const unavailable = '/staff/select-school?notice=unavailable';
  if (form.getAll('school').length !== 1 || form.getAll('role').length !== 1 ||
    !isStaffUuid(school) || !isStaffRole(role)) redirect(unavailable);

  const schoolId = school.toLowerCase();
  let destination = unavailable;
  try {
    const client = await staffClient(true);
    const choices = await listStaffSchoolChoices(client);
    if (choices.some(choice => choice.schoolId === schoolId && choice.role === role)) {
      const { data, error } = await client.rpc('select_school_context', { p_school: schoolId, p_role: role });
      if (!error && data === true) {
        const access = await loadStaffResolution(client, role);
        if (access.kind === 'authorized' && access.role === role && access.context.schoolId === schoolId) {
          destination = `/staff/${role}`;
        }
      }
    }
  } catch { /* A provider or database failure never confirms the switch. */ }
  redirect(destination);
}
