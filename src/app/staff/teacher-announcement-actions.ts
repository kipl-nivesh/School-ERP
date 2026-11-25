'use server';

import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { isRecordId } from '@/lib/services/management-contracts';
import { getStaffAccess, staffClient } from '@/lib/staff/server';

export async function saveTeacherAnnouncement(_previous: { ok: boolean; message: string }, form: FormData) {
  const fail = { ok: false, message: 'The staff announcement change was not confirmed.' };
  const school = form.get('school'), id = form.get('id'), intent = form.get('intent');
  const title = form.get('title'), content = form.get('content');
  if (typeof school !== 'string' || !isRecordId(school) || typeof id !== 'string' || !isRecordId(id) ||
    (intent !== 'publish' && intent !== 'archive')) return fail;
  if (intent === 'publish' && (typeof title !== 'string' || title.trim().length < 3 || title.length > 200 ||
    typeof content !== 'string' || content.trim().length < 5 || content.length > 5000)) return fail;
  try {
    const access = await getStaffAccess('teacher');
    if (access?.role !== 'teacher' || access.context.schoolId !== school ||
        !evaluatePermission(access.context, 'announcements.write', Date.now()).allowed) return fail;
    const { data, error } = await (await staffClient(true)).rpc('manage_teacher_staff_announcement', {
      p_school: school, p_id: id, p_intent: intent,
      p_title: intent === 'publish' ? title : null, p_content: intent === 'publish' ? content : null,
    });
    if (error || data !== id) return fail;
    revalidatePath('/staff/teacher');
    return { ok: true, message: intent === 'publish' ? 'Staff announcement published.' : 'Staff announcement archived.' };
  } catch { return fail; }
}
