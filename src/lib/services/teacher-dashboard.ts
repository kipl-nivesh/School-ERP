import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { staffClient, getStaffAccess } from '../staff/server';

type Access = NonNullable<Awaited<ReturnType<typeof getStaffAccess>>>;
export type TeacherQuery = Record<string, string | string[] | undefined>;
type Section = {
  id: string; name: string; class_id: string; academic_year_id: string;
  classroom: { name: string }; year: { label: string };
  assignment: { subject_code: string }[];
};
type Student = { id: string; display_name: string; registration_number: string; enrollment_status: string };
type Period = {
  id: string; day_of_week: string; period_number: number; start_time: string; end_time: string;
  subject_code: string; section: Section;
};

const pageSize = 25;
const assignmentJoin = 'assignment:teacher_assignments!teacher_assignments_section_year_school_fkey!inner(school_id,teacher_profile_id,subject_code)';
const sectionFields = 'id,name,class_id,academic_year_id,classroom:classes!sections_class_school_fkey!inner(name,school_id),year:academic_years!sections_academic_year_school_fkey!inner(label,school_id),' + assignmentJoin;
const rosterJoin = 'placement:enrollments!enrollments_student_school_fkey!inner(school_id,section_id,valid_from,valid_until,section:sections!enrollments_section_year_school_fkey!inner(school_id,' + assignmentJoin + '))';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function parseQuery(input: TeacherQuery) {
  const { year = '', classId = '', section = '', detail = '', page = '1', rosterPage = '1' } = input;
  if ([year, classId, section, detail].some(value => typeof value !== 'string' || (value && !uuid.test(value))) ||
      [page, rosterPage].some(value => typeof value !== 'string' || !/^[1-9][0-9]{0,2}$/.test(value))) return null;
  return {
    year: (year as string).toLowerCase(), classId: (classId as string).toLowerCase(),
    section: (section as string).toLowerCase(), detail: (detail as string).toLowerCase(),
    page: Number(page), rosterPage: Number(rosterPage),
  };
}

function requireCount(result: { error: unknown; count: number | null }) {
  if (result.error || result.count === null) throw new Error('Count unavailable');
  return result.count;
}

export async function readTeacherDashboard(access: Access, input: TeacherQuery) {
  const { context } = access;
  const school = context.schoolId;
  const teacher = context.profileId;
  const now = Date.now();
  if (access.role !== 'teacher' || !school || !evaluatePermission(context, 'dashboard.teacher.view', now).allowed ||
      !evaluatePermission(context, 'students.read', now).allowed) return { kind: 'denied' } as const;
  const filters = parseQuery(input);
  if (!filters) return { kind: 'invalid' } as const;
  try {
    const client = await staffClient();
    // Assignment RLS independently constrains validity using the database date.
    // Use the same date representation as the existing enrollment directory.
    const today = new Date(now).toISOString().slice(0, 10);
    const validity = 'valid_until.is.null,valid_until.gte.' + today;
    const sections = () => client.from('sections').select(sectionFields)
      .eq('school_id', school).eq('assignment.school_id', school).eq('assignment.teacher_profile_id', teacher)
      .eq('classroom.school_id', school).eq('year.school_id', school);
    const activeStudents = (columns: string, options?: { head: true; count: 'exact' }) =>
      client.from('students').select(columns, options).eq('school_id', school).eq('placement.school_id', school)
        .lte('placement.valid_from', today).or(validity, { referencedTable: 'placement' })
        .eq('placement.section.school_id', school).eq('placement.section.assignment.school_id', school)
        .eq('placement.section.assignment.teacher_profile_id', teacher);

    let directory = sections().order('name').order('id');
    if (filters.year) directory = directory.eq('academic_year_id', filters.year);
    if (filters.classId) directory = directory.eq('class_id', filters.classId);
    if (filters.section) directory = directory.eq('id', filters.section);
    const offset = (filters.page - 1) * pageSize;
    const sectionJoin = 'section:sections!timetable_section_school_fkey!inner(' + sectionFields + ')';
    const countSections = 'section:sections!sections_class_school_fkey!inner(school_id,' + assignmentJoin + ')';
    const [rowsResult, optionsResult, classResult, sectionResult, studentsResult, periodsResult, detailResult] = await Promise.all([
      directory.range(offset, offset + pageSize).overrideTypes<Section[], { merge: false }>(),
      sections().order('name').order('id').limit(201).overrideTypes<Section[], { merge: false }>(),
      client.from('classes').select('id,' + countSections, { head: true, count: 'exact' })
        .eq('school_id', school).eq('section.school_id', school)
        .eq('section.assignment.school_id', school).eq('section.assignment.teacher_profile_id', teacher),
      client.from('sections').select('id,' + assignmentJoin, { head: true, count: 'exact' })
        .eq('school_id', school).eq('assignment.school_id', school).eq('assignment.teacher_profile_id', teacher),
      activeStudents('id,' + rosterJoin, { head: true, count: 'exact' }),
      client.from('timetable_slots').select('id,day_of_week,period_number,start_time,end_time,subject_code,' + sectionJoin)
        .eq('school_id', school).eq('teacher_profile_id', teacher).eq('section.school_id', school)
        .eq('section.assignment.school_id', school).eq('section.assignment.teacher_profile_id', teacher)
        .eq('section.classroom.school_id', school).eq('section.year.school_id', school)
        .order('day_of_week').order('period_number').order('id').limit(61).overrideTypes<Period[], { merge: false }>(),
      filters.detail ? sections().eq('id', filters.detail).maybeSingle().overrideTypes<Section, { merge: false }>() : null,
    ]);
    if (rowsResult.error || optionsResult.error || periodsResult.error || detailResult?.error ||
        !rowsResult.data || !optionsResult.data || !periodsResult.data || periodsResult.data.length > 60) {
      return { kind: 'error' } as const;
    }
    const details = detailResult?.data;
    const sectionsOnPage = rowsResult.data.slice(0, pageSize);
    const sectionCounts = await Promise.all(sectionsOnPage.map(async row =>
      requireCount(await activeStudents('id,' + rosterJoin, { head: true, count: 'exact' }).eq('placement.section_id', row.id))));
    const rosterOffset = (filters.rosterPage - 1) * pageSize;
    const roster = details ? await activeStudents('id,display_name,registration_number,enrollment_status,' + rosterJoin)
      .eq('placement.section_id', details.id).order('registration_number').order('id')
      .range(rosterOffset, rosterOffset + pageSize).overrideTypes<Student[], { merge: false }>() : null;
    if (roster?.error) return { kind: 'error' } as const;
    const detailCount = details ? requireCount(await activeStudents('id,' + rosterJoin, { head: true, count: 'exact' })
      .eq('placement.section_id', details.id)) : null;

    return {
      kind: 'ready', filters, classCount: requireCount(classResult), sectionCount: requireCount(sectionResult),
      studentCount: requireCount(studentsResult), periods: periodsResult.data,
      options: optionsResult.data.slice(0, 200), moreOptions: optionsResult.data.length > 200,
      rows: sectionsOnPage.map((row, index) => ({ ...row, studentCount: sectionCounts[index] })),
      hasNext: rowsResult.data.length > pageSize && filters.page < 999,
      detailDenied: !!filters.detail && !details,
      detail: details && {
        section: details, studentCount: detailCount,
        students: (roster?.data ?? []).slice(0, pageSize).map(({ registration_number, display_name, enrollment_status, id }) =>
          ({ id, registration_number, display_name, enrollment_status })),
        hasNext: (roster?.data?.length ?? 0) > pageSize && filters.rosterPage < 999,
      },
    } as const;
  } catch {
    return { kind: 'error' } as const;
  }
}

