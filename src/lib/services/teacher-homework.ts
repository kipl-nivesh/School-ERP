import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { staffClient, type getStaffAccess } from '../staff/server';
import { validAttendanceDate } from './attendance-fields';
import { isRecordId } from './management-contracts';
import type { TeacherQuery } from './teacher-dashboard';
import type { HomeworkRow } from './homework-workspace';
import type { AcademicOptions } from './academic-directory';

type Access = NonNullable<Awaited<ReturnType<typeof getStaffAccess>>>;
type Placement = { id: string; name: string; class_id: string; academic_year_id: string; classroom: { name: string }; year: { label: string } };
type Assignment = { section_id: string; subject_code: string };
type Row = HomeworkRow & { school_id: string; teacher_profile_id: string };

const pageSize = 25;
const scope = 'assignment:teacher_assignments!teacher_assignments_section_year_school_fkey!inner(school_id,teacher_profile_id)';
const placementFields = 'id,name,class_id,academic_year_id,classroom:classes!sections_class_school_fkey!inner(name),year:academic_years!sections_academic_year_school_fkey!inner(label),' + scope;
const fields = 'id,school_id,teacher_profile_id,section_id,title,description,subject_code,due_date,assigned_date,max_points,status,revision';

function parse(input: TeacherQuery) {
  const { search = '', subject = '', status = '', year = '', classId = '', section = '', detail = '', from = '', to = '', page = '1' } = input;
  if (typeof search !== 'string' || search.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search.trim()) ||
      typeof subject !== 'string' || subject.length > 80 || /[\x00-\x1f\x7f]/.test(subject) ||
      typeof status !== 'string' || !['', 'active', 'closed'].includes(status) ||
      typeof year !== 'string' || typeof classId !== 'string' || typeof section !== 'string' || typeof detail !== 'string' ||
      [year, classId, section, detail].some(v => v && !isRecordId(v)) ||
      typeof from !== 'string' || typeof to !== 'string' ||
      (from && !validAttendanceDate(from)) || (to && !validAttendanceDate(to)) || (from && to && from > to) ||
      typeof page !== 'string' || !/^[1-9]\d{0,2}$/.test(page)) return null;
  return { search: search.trim(), subject: subject.trim(), status, year: year.toLowerCase(),
    classId: classId.toLowerCase(), section: section.toLowerCase(), detail: detail.toLowerCase(), from, to, page: Number(page) };
}

function publicRow({ id, section_id, title, description, subject_code, due_date, assigned_date, max_points, status, revision }: Row): HomeworkRow {
  return { id, section_id, title, description, subject_code, due_date, assigned_date, max_points, status, revision };
}

export async function readTeacherHomework(access: Access, input: TeacherQuery) {
  const { context } = access;
  const school = context.schoolId;
  const teacher = context.profileId;
  const now = Date.now();
  if (access.role !== 'teacher' || !school || !evaluatePermission(context, 'dashboard.teacher.view', now).allowed) return { kind: 'denied' } as const;
  const canRead = evaluatePermission(context, 'homework.read', now).allowed;
  const canWrite = false;
  const canReadPlacement = evaluatePermission(context, 'students.read', now).allowed;
  if (!canRead && !canWrite) return { kind: 'denied' } as const;
  const filters = parse(input);
  if (!filters || (!canReadPlacement && (filters.year || filters.classId))) return { kind: 'invalid' } as const;
  try {
    const client = await staffClient();
    const assignments = () => client.from('teacher_assignments').select('section_id,subject_code').eq('school_id', school)
      .eq('teacher_profile_id', teacher);
    if (canRead && filters.section) {
      const found = await assignments().eq('section_id', filters.section).limit(1);
      if (found.error) return { kind: 'error' } as const;
      if (found.data?.[0]?.section_id !== filters.section) return { kind: 'unassigned' } as const;
    }
    const cutoff = new Date(now).toISOString().slice(0, 10);
    const join = ',placement:sections!homework_section_school_fkey!inner(school_id,class_id,academic_year_id,' + scope + ')';
    const records = (columns: string, options?: { head: true; count: 'exact' }) => {
      // When section labels are restricted, homework SELECT RLS still verifies the active assignment.
      let query = client.from('homework_assignments').select(columns + (canReadPlacement ? join : ''), options).eq('school_id', school);
      if (canReadPlacement) query = query.eq('placement.school_id', school).eq('placement.assignment.school_id', school)
        .eq('placement.assignment.teacher_profile_id', teacher);
      return query;
    };
    const count = () => records('id', { head: true, count: 'exact' });
    let directory = records(fields);
    if (filters.year) directory = directory.eq('placement.academic_year_id', filters.year);
    if (filters.classId) directory = directory.eq('placement.class_id', filters.classId);
    if (filters.section) directory = directory.eq('section_id', filters.section);
    if (filters.subject) directory = directory.eq('subject_code', filters.subject);
    if (filters.status) directory = directory.eq('status', filters.status);
    if (filters.search) directory = directory.ilike('title', '%' + filters.search + '%');
    if (filters.from) directory = directory.gte('due_date', filters.from);
    if (filters.to) directory = directory.lte('due_date', filters.to);
    const offset = (filters.page - 1) * pageSize;
    const [catalog, assignmentCatalog, list, detail, counts] = await Promise.all([
      canReadPlacement ? client.from('sections').select(placementFields).eq('school_id', school)
        .eq('assignment.school_id', school).eq('assignment.teacher_profile_id', teacher)
        .order('name').order('id').limit(201).overrideTypes<Placement[], { merge: false }>() : null,
      canWrite ? assignments().order('section_id').order('subject_code').order('id').limit(201)
        .overrideTypes<Assignment[], { merge: false }>() : null,
      canRead ? directory.order('due_date', { ascending: false }).order('id').range(offset, offset + pageSize)
        .overrideTypes<Row[], { merge: false }>() : null,
      canRead && filters.detail ? records(fields).eq('id', filters.detail).maybeSingle().overrideTypes<Row, { merge: false }>() : null,
      canRead ? Promise.all([count(), count().eq('status', 'active'), count().eq('status', 'closed'),
        count().eq('status', 'active').gte('due_date', cutoff), count().eq('status', 'active').lt('due_date', cutoff)]) : null,
    ]);
    if ([catalog, assignmentCatalog, list, detail].some(value => value?.error) ||
        counts?.some(row => row.error || row.count === null) || list?.data?.some(row => row.school_id !== school) ||
        (detail?.data && (detail.data.school_id !== school || detail.data.id !== filters.detail))) return { kind: 'error' } as const;

    let editable = false;
    if (canWrite && detail?.data?.teacher_profile_id === teacher) {
      const authorized = await assignments().eq('section_id', detail.data.section_id).eq('subject_code', detail.data.subject_code).limit(1);
      if (authorized.error) return { kind: 'error' } as const;
      editable = authorized.data?.some(row => row.section_id === detail.data?.section_id && row.subject_code === detail.data?.subject_code) ?? false;
    }
    const placements = (catalog?.data ?? []).slice(0, 200);
    const options: AcademicOptions = {
      sections: placements.map(row => ({ id: row.id, label: row.name, yearId: row.academic_year_id, classId: row.class_id })),
      years: [...new Map(placements.map(row => [row.academic_year_id, { id: row.academic_year_id, label: row.year.label }])).values()],
      classes: [...new Map(placements.map(row => [row.class_id, { id: row.class_id, label: row.classroom.name }])).values()],
      partial: (catalog?.data?.length ?? 0) > 200 || (assignmentCatalog?.data?.length ?? 0) > 200,
    };
    const writeChoices = [...new Map((assignmentCatalog?.data ?? []).slice(0, 200).map(row =>
      [JSON.stringify([row.section_id, row.subject_code]), { section: row.section_id, subject: row.subject_code }])).values()];
    return { kind: 'ready', canRead, canReadPlacement, options, filters, writeChoices, editable, cutoff,
      counts: counts?.map(row => row.count ?? 0) ?? null,
      rows: (list?.data ?? []).slice(0, pageSize).map(publicRow),
      next: (list?.data?.length ?? 0) > pageSize && filters.page < 999,
      detail: detail?.data ? publicRow(detail.data) : null, detailDenied: !!filters.detail && !detail?.data } as const;
  } catch {
    return { kind: 'error' } as const;
  }
}
