'use server';

import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { isRecordId } from '@/lib/services/management-contracts';
import { getStaffAccess, staffClient } from '@/lib/staff/server';

const mark = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export async function saveDraftMark(_previous: { ok: boolean; message: string }, form: FormData) {
  const denied = { ok: false, message: 'The mark could not be saved. Check the assignment and exam status.' };
  const school = form.get('school'), exam = form.get('exam'), student = form.get('student');
  const score = form.get('score'), expected = form.get('expected');
  if (typeof school !== 'string' || !isRecordId(school) || typeof exam !== 'string' || !isRecordId(exam) ||
      typeof student !== 'string' || !isRecordId(student) || typeof score !== 'string' || !mark.test(score) ||
      typeof expected !== 'string' || (expected !== '' && !mark.test(expected))) {
    return { ok: false, message: 'Enter a nonnegative mark with at most two decimal places.' };
  }
  try {
    const access = await getStaffAccess('teacher');
    if (access?.role !== 'teacher' || access.context.schoolId !== school ||
        !['marks.write', 'marks.read', 'students.read'].every(permission =>
          evaluatePermission(access.context, permission, Date.now()).allowed)) return denied;
    const { data, error } = await (await staffClient(true)).rpc('save_teacher_draft_mark', {
      p_school: school, p_exam: exam, p_student: student,
      p_score: Number(score), p_expected: expected === '' ? null : Number(expected),
    });
    if (error?.code === '40001') return { ok: false, message: 'Another change was saved. Reload the exam before retrying.' };
    if (error?.code === '22023') return { ok: false, message: 'The mark exceeds the exam maximum or is invalid.' };
    if (error || typeof data !== 'string' || !isRecordId(data)) return denied;
    revalidatePath('/staff/teacher');
    return { ok: true, message: 'Draft mark saved.' };
  } catch { return denied; }
}
