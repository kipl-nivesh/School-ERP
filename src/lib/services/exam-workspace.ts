import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { isRecordId } from './management-contracts';

export type Exam = {
  id: string; section_id: string; exam_name: string; subject_code: string;
  exam_date: string; max_marks: number; passing_marks: number; is_published: boolean; published_at: string | null;
};
type Score = { id: string; student_id: string; marks_obtained: number; exam: Exam; studentName?: string; registration?: string };
type Filters = Record<'mode' | 'search' | 'exam' | 'section' | 'classId' | 'year' | 'published', string>;
export type ExamPage = { kind: 'denied' | 'error' | 'invalid' } | {
  kind: 'exams' | 'results'; exams: Exam[]; scores: Score[]; filters: Filters; page: number; next: boolean;
};
type ScopedExam = Exam & { school_id: string; placement?: { school_id: string } };
const examFields = 'id,school_id,section_id,exam_name,subject_code,exam_date,max_marks,passing_marks,is_published,published_at';

function projectExam(row: ScopedExam): Exam {
  const { id, section_id, exam_name, subject_code, exam_date, max_marks, passing_marks, is_published, published_at } = row;
  return { id, section_id, exam_name, subject_code, exam_date, max_marks, passing_marks, is_published, published_at };
}

export async function readExams(form = new FormData()): Promise<ExamPage> {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school || !evaluatePermission(access.context, 'marks.read', Date.now()).allowed) return { kind: 'denied' };
  const students = evaluatePermission(access.context, 'students.read', Date.now()).allowed;
  const placements = students || evaluatePermission(access.context, 'academics.manage', Date.now()).allowed;
  const names = ['mode', 'search', 'exam', 'section', 'classId', 'year', 'published', 'page'];
  const values = names.map(name => form.get(name) ?? '');
  if (values.some(value => typeof value !== 'string') || names.some(name => form.getAll(name).length > 1)) return { kind: 'invalid' };
  const [view, term, exam, section, classId, year, published, rawPage] = values as string[];
  const mode = view || 'exams';
  const results = mode === 'results';
  const search = term.trim();
  const page = Number(rawPage || 1);
  if (!['exams', 'results'].includes(mode) || term.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search) ||
      [exam, section, classId, year].some(value => value && !isRecordId(value)) ||
      !['', 'yes', 'no'].includes(published) || (rawPage && !/^[1-9]\d{0,3}$/.test(rawPage)) || page > 1000 ||
      (results && search && !students && !isRecordId(search))) return { kind: 'invalid' };
  if ((classId || year) && !placements) return { kind: 'denied' };

  const filters = { mode, search, exam, section, classId, year, published };
  const offset = (page - 1) * 25;
  const join = classId || year ? ',placement:sections!marks_sheets_section_school_fkey!inner(school_id)' : '';
  const scoped = (row: ScopedExam) => row.school_id === school && (!join || row.placement?.school_id === school);
  try {
    const client = await staffClient();
    const prefix = results ? 'exam.' : '';
    const selection = results
      ? 'id,school_id,student_id,marks_obtained,exam:marks_sheets!marks_entries_sheet_school_fkey!inner(' + examFields + join + ')' +
        (students ? ',student:students!marks_entries_student_school_fkey' + (search ? '!inner' : '') + '(school_id,display_name,registration_number)' : '')
      : examFields + join;
    let query = client.from(results ? 'marks_entries' : 'marks_sheets').select(selection).eq('school_id', school);
    if (results) query = query.eq('exam.school_id', school);
    if (join) query = query.eq(prefix + 'placement.school_id', school);
    if (exam) query = query.eq(results ? 'marks_sheet_id' : 'id', exam);
    if (section) query = query.eq(prefix + 'section_id', section);
    if (classId) query = query.eq(prefix + 'placement.class_id', classId);
    if (year) query = query.eq(prefix + 'placement.academic_year_id', year);
    if (published) query = query.eq(prefix + 'is_published', published === 'yes');
    if (search) {
      const pattern = '"%' + search + '%"';
      if (!results) query = query.or('exam_name.ilike.' + pattern + ',subject_code.ilike.' + pattern);
      else if (students) query = query.or('display_name.ilike.' + pattern + ',registration_number.ilike.' + pattern, { referencedTable: 'student' });
      else query = query.eq('student_id', search);
    }
    query = (results ? query.order('marks_sheet_id') : query.order('exam_date', { ascending: false })).order('id').range(offset, offset + 25);
    if (!results) {
      const result = await query.overrideTypes<ScopedExam[], { merge: false }>();
      const rows = result.data ?? [];
      if (result.error || rows.some(row => !scoped(row))) return { kind: 'error' };
      return { kind: 'exams', exams: rows.slice(0, 25).map(projectExam), scores: [], filters, page, next: rows.length > 25 && page < 1000 };
    }
    const result = await query.overrideTypes<{
      id: string; school_id: string; student_id: string; marks_obtained: number; exam: ScopedExam | null;
      student?: { school_id: string; display_name: string; registration_number: string } | null;
    }[], { merge: false }>();
    const rows = result.data ?? [];
    if (result.error || rows.some(row => row.school_id !== school || !row.exam || !scoped(row.exam) ||
        (row.student && row.student.school_id !== school))) return { kind: 'error' };
    const scores = rows.slice(0, 25).flatMap(row => row.exam ? [{
      id: row.id, student_id: row.student_id, marks_obtained: row.marks_obtained, exam: projectExam(row.exam),
      studentName: students ? row.student?.display_name : undefined, registration: students ? row.student?.registration_number : undefined,
    }] : []);
    return { kind: 'results', exams: [], scores, filters, page, next: rows.length > 25 && page < 1000 };
  } catch {
    return { kind: 'error' };
  }
}
