'use server';

import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { validAttendanceDate } from '@/lib/services/attendance-fields';
import { isRecordId } from '@/lib/services/management-contracts';
import { getStaffAccess, staffClient } from '@/lib/staff/server';

export async function saveFeeConfiguration(_previous: { ok: boolean; message: string }, form: FormData) {
  const fail = { ok: false, message: 'Fee change could not be confirmed. Check the school, enrollment and current record.' };
  const get = (key: string) => {
    const values = form.getAll(key);
    return values.length === 1 && typeof values[0] === 'string' ? values[0].trim() : '';
  };
  const kind = get('kind'), school = get('school'), id = get('id'), due = get('due');
  const edit = kind === 'edit';
  if (!['create', 'edit', 'assign'].includes(kind) || !isRecordId(school) || !isRecordId(id) || !validAttendanceDate(due)) return fail;
  try {
    const access = await getStaffAccess('accountant');
    if (access?.role !== 'accountant' || access.context.schoolId !== school ||
        !evaluatePermission(access.context, 'fees.write', Date.now()).allowed) return fail;
    const client = await staffClient(true);
    let result;
    if (kind === 'assign') {
      const student = get('student');
      if (!isRecordId(student)) return fail;
      result = await client.rpc('assign_school_fee', { p_school: school, p_structure: id, p_student: student, p_due: due });
    } else {
      const amount = get('amount'), expected = get('expected'), expectedDue = get('expectedDue');
      const classId = get('classId');
      if (!/^[1-9]\d{0,15}$/.test(amount) || !Number.isSafeInteger(Number(amount))) return fail;
      if (edit && (!/^[1-9]\d{0,15}$/.test(expected) || !Number.isSafeInteger(Number(expected)) || !validAttendanceDate(expectedDue))) return fail;
      if (!edit && !isRecordId(classId)) return fail;
      result = await client.rpc('configure_school_fee', {
        p_school: school, p_id: id, p_class: edit ? null : classId,
        p_category: edit ? null : get('category'), p_frequency: edit ? null : get('frequency'),
        p_amount: Number(amount), p_due: due, p_expected_amount: edit ? Number(expected) : null,
        p_expected_due: edit ? expectedDue : null,
      });
    }
    if (result.error?.code === '40001') return { ok: false, message: 'Another change was saved. Reload before retrying.' };
    if (result.error || typeof result.data !== 'string' || !isRecordId(result.data) ||
        (kind !== 'assign' && result.data !== id)) return fail;
    revalidatePath('/staff/accountant');
    return { ok: true, message: kind === 'assign' ? 'Fee invoice confirmed in the ledger.' : 'Fee structure saved.' };
  } catch { return fail; }
}
