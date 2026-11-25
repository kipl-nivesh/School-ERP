'use server';

import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { validAttendanceDate } from '@/lib/services/attendance-fields';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getStudentAdminAccess, staffClient } from '@/lib/staff/server';

export async function saveStudentPublication(_previous: { ok: boolean; message: string }, form: FormData) {
  const failed = { ok: false, message: 'Publication could not be saved. Check your permissions, audience and entries.' };
  const text = (name: string) => {
    const entry = form.get(name);
    return typeof entry === 'string' ? entry.trim() : '';
  };
  const kind = text('publication');
  const status = text('status');
  const id = text('id');
  const access = await getStudentAdminAccess();
  if (!access?.context.schoolId || !['exam','material'].includes(kind) ||
      !['draft','published','archived'].includes(status) || (id && !isStaffUuid(id))) return failed;
  const now = Date.now();
  if (kind === 'exam' ? !evaluatePermission(access.context, 'marks.publish', now).allowed :
      !evaluatePermission(access.context, 'academics.manage', now).allowed ||
      !evaluatePermission(access.context, 'documents.read', now).allowed) return failed;

  const section = text('section');
  const classroom = text('classroom');
  const title = text('title');
  const subject = text('subject');
  const date = text('date');
  const start = text('start');
  const end = text('end');
  const venue = text('venue');
  const audience = text('audience');
  const registration = text('registration');
  const materialKind = text('materialKind');
  const content = text('content');
  if (!id && (!title || title.length > 160 || status === 'archived')) return failed;
  if (!id && kind === 'exam' && (!isStaffUuid(section) || !subject || subject.length > 30 ||
      !validAttendanceDate(date) || venue.length > 160 || !!start !== !!end ||
      (start && (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start)))) return failed;
  if (!id && kind === 'material' && (!['school','class','section','student'].includes(audience) ||
      !['document','study_material'].includes(materialKind) || !content || content.length > 20000 ||
      (audience === 'section' && !isStaffUuid(section)) ||
      (audience === 'class' && !isStaffUuid(classroom)) ||
      (audience === 'student' && (!registration || registration.length > 80)))) return failed;

  try {
    const client = await staffClient();
    const scope = { p_id: id || null, p_school: access.context.schoolId, p_title: title || null, p_status: status,
      p_section: isStaffUuid(section) ? section : null };
    const result = kind === 'exam' ? await client.rpc('manage_student_exam_schedule', {
      ...scope, p_subject: subject || null, p_date: date || null, p_start: start || null, p_end: end || null, p_venue: venue || null,
    }) : await client.rpc('manage_student_portal_material', {
      ...scope, p_class: isStaffUuid(classroom) ? classroom : null, p_registration: registration || null, p_audience: audience || null, p_kind: materialKind || null, p_content: content || null,
    });
    if (result.error || result.data !== true) return failed;
    revalidatePath('/staff/admin');
    return { ok: true, message: 'Publication saved.' };
  } catch {
    return failed;
  }
}
