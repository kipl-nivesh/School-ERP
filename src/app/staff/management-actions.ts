'use server';
import { revalidatePath } from 'next/cache';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { evaluatePermission } from '@/lib/auth/authorization';
import { isManagementKind, isRecordId, managementPayload } from '@/lib/services/management-contracts';

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
