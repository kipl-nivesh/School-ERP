import 'server-only';
import { resolveStudentBinding, selectCurrentStudentEnrollment } from './identity-contracts';
import type { EnrollmentCandidate, StudentBinding, StudentSessionEvidence } from './identity-contracts';
import type { StudentDashboardData, StudentDashboardResult, StudentPanel, StudentProfile } from './dashboard-model';
import { validAttendanceDate } from '../services/attendance-fields';

type School = { school_id: string };
type Own = School & { student_id: string };
type Section = School & { section_id: string };
type Exam = Section & { id: string; exam_name: string; subject_code: string; exam_date: string; is_published: boolean; max_marks: number };
export type StudentDashboardProjection = {
  databaseDate: string;
  enrollments: EnrollmentCandidate[];
  placement: (Section & { class_name: string; section_name: string; academic_year_id: string; academic_year: string }) | null;
  attendance: (Own & { present: number; absent: number; late: number; excused: number }) | null;
  timetable: (Section & { day_of_week: string; start_time: string; end_time: string; subject_code: string; room_number: string })[] | null;
  homework: (Section & { title: string; subject_code: string; due_date: string; status: string })[] | null;
  /** A separately authorized schedule projection. The marks publication flag is not a schedule visibility field. */
  examSchedule: Omit<Exam, 'is_published' | 'max_marks'>[] | null;
  results: (Own & { exam: Exam; marks_obtained: number | null })[] | null;
  announcements: (School & { title: string; content: string; target_audience: string; published_at: string; expires_at: string | null })[] | null;
  invoices: (Own & { invoice_number: string; title: string; due_date: string; amount_paise: number; paid_paise: number })[] | null;
  receipts: (Own & { receipt_number: string; payment_date: string; amount_paise: number; status: string })[] | null;
};
type VerifiedStudentRequest = { role: 'student'; session: StudentSessionEvidence; bindings: StudentBinding[]; currentCredentialVersion: number };
type StudentDashboardRepository = {
  /** Future request-bound verifier must check the real provider token, session liveness and database-backed binding. */
  verifyRequest(): Promise<VerifiedStudentRequest | null>;
  /** Future provider must use a verified user session and a restricted, RLS-authorized projection. */
  read(scope: Readonly<{ schoolId: string; studentId: string }>): Promise<StudentDashboardProjection | null>;
};

const unavailable = { kind: 'unavailable' } as const;
const ready = <T>(data: T): StudentPanel<T> => ({ kind: 'ready', data });
const isCount = (value: number) => Number.isSafeInteger(value) && value >= 0;

function scopedRows<T>(rows: T[] | null, valid: (row: T) => boolean): T[] | null {
  return rows && rows.every(valid) ? rows : null;
}

function projectRows<T, R>(rows: T[] | null, valid: (row: T) => boolean, project: (row: T) => R): StudentPanel<R[]> {
  return rows && rows.every(valid) ? ready(rows.map(project)) : unavailable;
}

/** The production entry is deliberately unwired while native Student Auth and RLS remain unverified. */
export async function readStudentDashboard(): Promise<StudentDashboardResult> {
  return unavailable;
}

/** Server-only adapter seam. The repository must be supplied by trusted server composition. */
export function createStudentDashboardReader(repository: StudentDashboardRepository) {
  return async (): Promise<StudentDashboardResult> => {
    try {
      const access = await repository.verifyRequest();
      if (!access || access.role !== 'student') return unavailable;
      const now = Date.now();
      const binding = resolveStudentBinding(access.session, access.bindings, access.currentCredentialVersion, now);
      if (!binding) return unavailable;
      const scope = { schoolId: binding.schoolId, studentId: binding.studentId };
      const source = await repository.read(scope);
      if (!source || access.session.expiresAt <= Date.now() || !validAttendanceDate(source.databaseDate) ||
          source.enrollments.some(row => row.schoolId !== scope.schoolId || row.studentId !== scope.studentId)) return unavailable;

      return { kind: 'ready', data: projectStudentDashboard(scope, binding.profile, source, now, 'students') };
    } catch {
      return unavailable;
    }
  };
}

/** Projects a restricted, already-authorized snapshot and checks its row scope again. */
export function projectStudentDashboard(
  scope: Readonly<{ schoolId: string; studentId: string }>,
  profile: StudentProfile,
  source: StudentDashboardProjection,
  now: number,
  audience: 'students' | 'parents',
): StudentDashboardData {
  const enrollment = selectCurrentStudentEnrollment(scope, source.enrollments, source.databaseDate);
  const school = (row: School) => row.school_id === scope.schoolId;
  const own = (row: Own) => school(row) && row.student_id === scope.studentId;
  const section = (row: Section) => school(row) && enrollment.kind === 'current' && row.section_id === enrollment.sectionId;
  const placement = source.placement;
  const placementView: StudentDashboardData['placement'] = enrollment.kind !== 'current' ? { kind: enrollment.kind } :
    placement && section(placement) && placement.academic_year_id === enrollment.academicYearId
      ? { kind: 'current', data: { classroom: placement.class_name, section: placement.section_name, academicYear: placement.academic_year } }
      : { kind: 'unavailable' };
  const academic = (row: Section) => placementView.kind === 'current' && section(row);
  const day = new Date(source.databaseDate + 'T00:00:00Z').getUTCDay();
  const weekday = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day];

  const listedExams = scopedRows(source.examSchedule, academic)?.filter(row => row.exam_date >= source.databaseDate) ?? null;
  const examView = (row: Pick<Exam, 'exam_name' | 'subject_code' | 'exam_date'>) =>
    ({ title: row.exam_name, subject: row.subject_code, date: row.exam_date });
  const publishedResults = scopedRows(source.results, row => own(row) && academic(row.exam))?.filter(row => row.exam.is_published === true && row.marks_obtained !== null) ?? null;
  const attendance = source.attendance;
  const invoices = projectRows(source.invoices, row => own(row) && isCount(row.amount_paise) && isCount(row.paid_paise) &&
    row.paid_paise <= row.amount_paise, row => ({
    number: row.invoice_number, title: row.title, due: row.due_date, amountPaise: row.amount_paise, paidPaise: row.paid_paise,
  }));
  const receipts = projectRows(scopedRows(source.receipts, own)?.filter(row => row.status === 'settled') ?? null,
    row => own(row) && isCount(row.amount_paise), row => ({ number: row.receipt_number, date: row.payment_date, amountPaise: row.amount_paise }));
  return {
    profile, databaseDate: source.databaseDate, placement: placementView,
    attendance: attendance && own(attendance) && [attendance.present, attendance.absent, attendance.late, attendance.excused].every(isCount)
      ? ready({ present: attendance.present, absent: attendance.absent, late: attendance.late, excused: attendance.excused }) : unavailable,
    timetable: placementView.kind === 'current' ? projectRows(scopedRows(source.timetable, academic)?.filter(row => row.day_of_week === weekday)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)) ?? null, academic,
    row => ({ subject: row.subject_code, start: row.start_time, end: row.end_time, room: row.room_number })) : unavailable,
    homework: placementView.kind === 'current' ? projectRows(scopedRows(source.homework, academic)?.filter(row => row.status === 'active') ?? null, academic,
      row => ({ title: row.title, subject: row.subject_code, due: row.due_date })) : unavailable,
    exams: placementView.kind === 'current' ? projectRows(listedExams, academic, examView) : unavailable,
    results: placementView.kind === 'current' ? projectRows(publishedResults, row => own(row) && academic(row.exam) &&
      typeof row.marks_obtained === 'number' && Number.isFinite(row.marks_obtained) && row.marks_obtained >= 0 &&
      row.marks_obtained <= row.exam.max_marks, row => ({ ...examView(row.exam), score: row.marks_obtained!, maximum: row.exam.max_marks })) : unavailable,
    announcements: projectRows(scopedRows(source.announcements, school)?.filter(row => ['all', audience].includes(row.target_audience) &&
      Date.parse(row.published_at) <= now && (!row.expires_at || Date.parse(row.expires_at) > now)) ?? null, school,
      row => ({ title: row.title, content: row.content })),
    fees: invoices.kind === 'ready' && receipts.kind === 'ready' ? ready({ invoices: invoices.data, receipts: receipts.data }) : unavailable,
  };
}
