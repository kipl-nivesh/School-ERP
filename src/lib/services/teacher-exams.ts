import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { staffClient, type getStaffAccess } from '../staff/server';
import { validAttendanceDate } from './attendance-fields';
import { isRecordId } from './management-contracts';
import type { Exam } from './exam-workspace';
import type { TeacherQuery } from './teacher-dashboard';

type Access = NonNullable<Awaited<ReturnType<typeof getStaffAccess>>>;
type Placement = { id: string; school_id: string; name: string; class_id: string; academic_year_id: string; classroom: { name: string }; year: { label: string } };
type Assignment = { school_id: string; teacher_profile_id: string; section_id: string; subject_code: string; placement?: Placement | null };
type Sheet = Exam & { school_id: string };
type Entry = { id: string; school_id: string; marks_sheet_id: string; marks_obtained: number | null;
  student?: { school_id: string; display_name: string; registration_number: string } | null };
const placementJoin = ',placement:sections!teacher_assignments_section_year_school_fkey!inner(id,school_id,name,class_id,academic_year_id,classroom:classes!sections_class_school_fkey!inner(name),year:academic_years!sections_academic_year_school_fkey!inner(label))';
const sheetFields = 'id,school_id,section_id,exam_name,subject_code,exam_date,max_marks,passing_marks,is_published,published_at';
const pageSize = 25;

function parse(input: TeacherQuery) {
  const { year = '', classId = '', section = '', subject = '', search = '', published = '', from = '', to = '', exam = '', page = '1', marksPage = '1' } = input;
  if (typeof year !== 'string' || typeof classId !== 'string' || typeof section !== 'string' || typeof exam !== 'string' ||
      [year, classId, section, exam].some(value => value && !isRecordId(value)) ||
      typeof subject !== 'string' || subject.length > 80 || /[\x00-\x1f\x7f]/.test(subject) ||
      typeof search !== 'string' || search.length > 100 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search.trim()) ||
      typeof published !== 'string' || !['', 'draft', 'published'].includes(published) ||
      typeof from !== 'string' || typeof to !== 'string' || (from && !validAttendanceDate(from)) ||
      (to && !validAttendanceDate(to)) || (from && to && from > to) ||
      typeof page !== 'string' || typeof marksPage !== 'string' || ![page, marksPage].every(value => /^[1-9]\d{0,2}$/.test(value))) return null;
  return { year: year.toLowerCase(), classId: classId.toLowerCase(), section: section.toLowerCase(), subject: subject.trim(),
    search: search.trim(), published, from, to, exam: exam.toLowerCase(), page: Number(page), marksPage: Number(marksPage) };
}

export async function readTeacherExams(access: Access, input: TeacherQuery) {
  const { context } = access;
  const school = context.schoolId;
  const teacher = context.profileId;
  const now = Date.now();
  if (access.role !== 'teacher' || !school || !evaluatePermission(context, 'dashboard.teacher.view', now).allowed ||
      !evaluatePermission(context, 'marks.read', now).allowed) return { kind: 'denied' } as const;
  const identities = evaluatePermission(context, 'students.read', now).allowed;
  const filters = parse(input);
  if (!filters || (!identities && (filters.year || filters.classId))) return { kind: 'invalid' } as const;
  try {
    const client = await staffClient();
    const validAssignment = (row: Assignment) => row.school_id === school && row.teacher_profile_id === teacher &&
      (!identities || (row.placement?.school_id === school && row.placement.id === row.section_id));
    const assignments = () => {
      let query = client.from('teacher_assignments').select('school_id,teacher_profile_id,section_id,subject_code' + (identities ? placementJoin : ''))
        .eq('school_id', school).eq('teacher_profile_id', teacher);
      if (identities) query = query.eq('placement.school_id', school);
      if (filters.year) query = query.eq('placement.academic_year_id', filters.year);
      if (filters.classId) query = query.eq('placement.class_id', filters.classId);
      return query;
    };
    const catalog = await assignments().order('section_id').order('subject_code').order('id').limit(201)
      .overrideTypes<Assignment[], { merge: false }>();
    if (catalog.error || !catalog.data || !catalog.data.every(validAssignment)) return { kind: 'error' } as const;
    const options = [...new Map(catalog.data.slice(0, 200).map(row =>
      [JSON.stringify([row.section_id, row.subject_code]), { section: row.section_id, subject: row.subject_code, placement: row.placement }])).values()];
    const selection = { options, filters, identities, moreOptions: catalog.data.length > 200 };
    if (!filters.section || !filters.subject) return { kind: 'select', ...selection } as const;

    const authorize = async () => {
      const result = await assignments().eq('section_id', filters.section).eq('subject_code', filters.subject)
        .limit(1).overrideTypes<Assignment[], { merge: false }>();
      if (result.error) throw new Error('Assignment unavailable');
      return result.data?.find(row => validAssignment(row) && row.section_id === filters.section && row.subject_code === filters.subject);
    };
    const scope = await authorize();
    if (!scope) return { kind: 'unassigned', ...selection } as const;
    // RLS independently verifies school and section. The exact pair adds the Teacher's subject boundary.
    const sheets = (fields: string, options?: { head: true; count: 'exact' }) => client.from('marks_sheets')
      .select(fields, options).eq('school_id', school).eq('section_id', scope.section_id).eq('subject_code', scope.subject_code);
    const validSheet = (row: Sheet) => row.school_id === school && row.section_id === scope.section_id && row.subject_code === scope.subject_code;
    const count = () => sheets('id', { head: true, count: 'exact' });
    const cutoff = new Date(now).toISOString().slice(0, 10);
    let directory = sheets(sheetFields);
    if (filters.search) directory = directory.ilike('exam_name', '%' + filters.search + '%');
    if (filters.published) directory = directory.eq('is_published', filters.published === 'published');
    if (filters.from) directory = directory.gte('exam_date', filters.from);
    if (filters.to) directory = directory.lte('exam_date', filters.to);
    const offset = (filters.page - 1) * pageSize;
    const [list, detail, counts] = await Promise.all([
      directory.order('exam_date', { ascending: false }).order('id').range(offset, offset + pageSize)
        .overrideTypes<Sheet[], { merge: false }>(),
      filters.exam ? sheets(sheetFields).eq('id', filters.exam).maybeSingle().overrideTypes<Sheet, { merge: false }>() : null,
      Promise.all([count(), count().gte('exam_date', cutoff), count().lt('exam_date', cutoff),
        count().eq('is_published', true), count().eq('is_published', false)]),
    ]);
    if (list.error || !list.data || !list.data.every(validSheet) || detail?.error ||
        (detail?.data && (!validSheet(detail.data) || detail.data.id !== filters.exam)) ||
        counts.some(row => row.error || row.count === null)) return { kind: 'error' } as const;

    const exam = detail?.data;
    const marksOffset = (filters.marksPage - 1) * pageSize;
    const entries = exam ? await client.from('marks_entries').select(
      'id,school_id,marks_sheet_id,marks_obtained,exam:marks_sheets!marks_entries_sheet_school_fkey!inner(id)' +
      (identities ? ',student:students!marks_entries_student_school_fkey(school_id,display_name,registration_number)' : ''),
    ).eq('school_id', school).eq('marks_sheet_id', exam.id)
      .eq('exam.school_id', school).eq('exam.section_id', scope.section_id).eq('exam.subject_code', scope.subject_code)
      .order('id').range(marksOffset, marksOffset + pageSize)
      .overrideTypes<Entry[], { merge: false }>() : null;
    const unavailable = !!entries && (entries.error || !entries.data || entries.data.some(row =>
      row.school_id !== school || row.marks_sheet_id !== exam?.id || (row.student && row.student.school_id !== school)));
    // Recheck subject access before returning any data. This is not an atomic database policy check.
    if (!await authorize()) return { kind: 'unassigned', ...selection } as const;
    const project = ({ id, section_id, exam_name, subject_code, exam_date, max_marks, passing_marks, is_published, published_at }: Sheet): Exam =>
      ({ id, section_id, exam_name, subject_code, exam_date, max_marks, passing_marks, is_published, published_at });
    const marks = unavailable ? [] : (entries?.data ?? []).slice(0, pageSize).map(row => {
      const score = row.marks_obtained;
      const valid = typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= (exam?.max_marks ?? 0);
      return { id: row.id, name: identities ? row.student?.display_name : undefined,
        registration: identities ? row.student?.registration_number : undefined,
        score: valid ? score : null, passed: valid && exam ? score >= exam.passing_marks : null };
    });
    return { kind: 'ready', ...selection, placement: scope.placement, cutoff,
      counts: counts.map(row => row.count ?? 0), rows: list.data.slice(0, pageSize).map(project),
      next: list.data.length > pageSize && filters.page < 999,
      detail: exam ? project(exam) : null, detailDenied: !!filters.exam && !exam,
      marks, marksUnavailable: !!unavailable, marksNext: !unavailable && (entries?.data?.length ?? 0) > pageSize && filters.marksPage < 999 } as const;
  } catch {
    return { kind: 'error' } as const;
  }
}
