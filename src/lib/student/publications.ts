import 'server-only';
import { evaluatePermission } from '@/lib/auth/authorization';
import { getStudentAdminAccess, staffClient } from '@/lib/staff/server';

export async function readAdminStudentPublications() {
  const access = await getStudentAdminAccess();
  if (!access?.context.schoolId) return null;
  const school = access.context.schoolId;
  const now = Date.now();
  const allowed = (permission: 'marks.publish' | 'academics.manage' | 'documents.read') =>
    evaluatePermission(access.context, permission, now).allowed;
  const canSchedule = allowed('marks.publish');
  const canPublishMaterials = allowed('academics.manage') && allowed('documents.read');
  if (!canSchedule && !canPublishMaterials) return null;

  try {
    const client = await staffClient();
    const [sections, exams, materials] = await Promise.all([
      client.from('sections')
        .select('id,school_id,name,classroom:classes!sections_class_school_fkey(id,name,school_id),year:academic_years!sections_academic_year_school_fkey(label,school_id)')
        .eq('school_id', school).order('name').order('id').limit(150)
        .overrideTypes<{ id: string; school_id: string; name: string;
          classroom: { id: string; name: string; school_id: string } | null; year: { label: string; school_id: string } | null }[], { merge: false }>(),
      canSchedule ? client.from('student_exam_schedule').select('id,school_id,title,exam_date,status').eq('school_id', school)
        .order('updated_at', { ascending: false }).order('id').limit(100) : null,
      canPublishMaterials ? client.from('student_portal_materials').select('id,school_id,title,kind,audience,status').eq('school_id', school)
        .order('updated_at', { ascending: false }).order('id').limit(100) : null,
    ]);
    return {
      classes: [...new Map((sections.data ?? []).flatMap(row => row.school_id === school && row.classroom?.school_id === school
        ? [[row.classroom.id, { id: row.classroom.id, label: row.classroom.name }] as const] : [])).values()],
      sections: (sections.data ?? []).flatMap(row => row.school_id === school && row.classroom?.school_id === school && row.year?.school_id === school
        ? [{ id: row.id, label: [row.classroom.name, row.name, row.year.label].join(' · ') }] : []),
      exams: !canSchedule ? undefined : exams?.error ? null : (exams?.data ?? []).filter(row => row.school_id === school)
        .map(row => ({ id: row.id, title: row.title, status: row.status, detail: row.exam_date })),
      materials: !canPublishMaterials ? undefined : materials?.error ? null : (materials?.data ?? []).filter(row => row.school_id === school)
        .map(row => ({ id: row.id, title: row.title, status: row.status, detail: row.kind.replaceAll('_', ' ') + ' · ' + row.audience })),
    };
  } catch {
    return { classes: [], sections: [], exams: canSchedule ? null : undefined, materials: canPublishMaterials ? null : undefined };
  }
}
