'use server';
import { revalidatePath } from 'next/cache';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { evaluatePermission } from '@/lib/auth/authorization';
import { isManagementKind, isRecordId, managementPayload } from '@/lib/services/management-contracts';
import { validAttendanceDate } from '@/lib/services/attendance-fields';

export async function manageAcademicRecord(_state: { ok: boolean; message: string }, form: FormData) {
  const fail = { ok: false, message: 'Save failed. Check your permissions, record IDs, current revision and values. No success was confirmed.' };
  const kind = form.get('kind'), id = form.get('recordId'), requestId = form.get('requestId');
  if (typeof kind !== 'string' || !isManagementKind(kind) || typeof id !== 'string' || !isRecordId(id) || typeof requestId !== 'string' || !isRecordId(requestId)) return fail;
  const payload = managementPayload(kind, form);
  if (!payload) return fail;
  try {
    const access = await getStaffAccess();
    if (!access || !access.context.schoolId || !evaluatePermission(access.context, kind === 'homework' ? 'homework.write' : 'academics.manage', Date.now()).allowed ||
      (kind !== 'homework' && access.role !== 'admin')) return fail;
    const result = await (await staffClient(true)).rpc('manage_academics', { p_request: requestId, p_kind: kind, p_id: id, p_data: payload });
    if (result.error || result.data?.id !== id) return fail;
    revalidatePath('/staff/[role]', 'page');
    return { ok: true, message: 'Record saved. Reload to start another change.' };
  } catch { return fail; }
}

export async function updateAcademicLifecycle(_state: { ok: boolean; message: string }, form: FormData) {
  const fail = { ok: false, message: 'The change was not saved. Check access and the effective date, then reload the record.' };
  const kind = form.get('kind'), id = form.get('id'), expected = form.get('expected');
  const name = form.get('name'), replacement = form.get('replacement'), effective = form.get('effective');
  if (typeof id !== 'string' || !isRecordId(id) || typeof expected !== 'string' || expected.length > 80) return fail;
  const rename = kind === 'rename_class' || kind === 'rename_section';
  if (rename) {
    if (typeof name !== 'string' || !name.trim() || name.length > 80) return fail;
  } else if ((kind !== 'end_assignment' && kind !== 'replace_assignment') ||
    typeof effective !== 'string' || !validAttendanceDate(effective) ||
    (kind === 'replace_assignment' && (typeof replacement !== 'string' || !isRecordId(replacement)))) return fail;
  try {
    const access = await getStaffAccess('admin');
    const school = access?.context.schoolId;
    if (access?.role !== 'admin' || !school || !evaluatePermission(access.context, 'academics.manage', Date.now()).allowed) return fail;
    const { data, error } = await (await staffClient(true)).rpc('update_academic_lifecycle', {
      p_school: school, p_kind: kind, p_id: id, p_expected: expected,
      p_name: rename ? name : null, p_replacement: kind === 'replace_assignment' ? replacement : null,
      p_effective: rename ? null : effective,
    });
    if (error?.code === '40001') return { ok: false, message: 'This record changed. Reload before retrying.' };
    if (error || data !== id) return fail;
    revalidatePath('/staff/admin');
    return { ok: true, message: 'Academic change saved. Reload the directory before making another change.' };
  } catch { return fail; }
}
