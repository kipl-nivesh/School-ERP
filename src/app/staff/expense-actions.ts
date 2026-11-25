'use server';

import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { validAttendanceDate } from '@/lib/services/attendance-fields';
import { isRecordId } from '@/lib/services/management-contracts';
import { getStaffAccess, staffClient } from '@/lib/staff/server';

export async function saveStaffExpense(_state: { ok: boolean; message: string }, form: FormData) {
  const failed = { ok: false, message: 'Expense change could not be confirmed. Check access and the current draft status.' };
  const value = (key: string) => {
    const field = form.get(key);
    return typeof field === 'string' ? field.trim() : '';
  };
  const school = value('school'), id = value('id'), intent = value('intent'), revision = value('revision');
  if (!isRecordId(school) || !isRecordId(id) || !['create','edit','submit','cancel','approve'].includes(intent) ||
      (intent !== 'create' && !/^[1-9]\d{0,8}$/.test(revision))) return failed;
  const writing = intent === 'create' || intent === 'edit';
  const amount = value('amount'), date = value('date');
  if (writing && (!/^[1-9]\d{0,15}$/.test(amount) || !Number.isSafeInteger(Number(amount)) ||
      !validAttendanceDate(date))) return failed;
  const role = intent === 'approve' ? 'admin' : 'accountant';
  try {
    const access = await getStaffAccess(role);
    if (access?.role !== role || access.context.schoolId !== school ||
        !evaluatePermission(access.context, 'expenses.write', Date.now()).allowed) return failed;
    const { data, error } = await (await staffClient(true)).rpc('manage_staff_expense_draft', {
      p_school: school, p_id: id, p_intent: intent, p_revision: intent === 'create' ? null : Number(revision),
      p_category: writing ? value('category') : null, p_payee: writing ? value('payee') : null,
      p_amount: writing ? Number(amount) : null, p_date: writing ? date : null,
      p_method: writing ? value('method') : null, p_description: writing ? value('description') : null,
    });
    if (error?.code === '40001') return { ok: false, message: 'The draft changed. Reload before retrying.' };
    if (error || data !== id) return failed;
    revalidatePath('/staff/admin');
    revalidatePath('/staff/accountant');
    const messages: Record<string, string> = { create: 'Draft saved.', edit: 'Draft updated.',
      submit: 'Submitted for school Admin approval.', cancel: 'Draft cancelled.', approve: 'Expense approved and posted to the ledger.' };
    return { ok: true, message: messages[intent] };
  } catch { return failed; }
}
