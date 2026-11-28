import 'server-only';
import { cache } from 'react';
import { isStaffUuid } from '@/lib/staff/contracts';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validAttendanceDate } from '@/lib/services/attendance-fields';
import { selectCurrentStudentEnrollment } from './identity-contracts';
import { projectStudentDashboard, type StudentDashboardProjection } from './dashboard-repository';
import type { StudentDashboardResult } from './dashboard-model';
import { studentPortalRequestsEnabled } from './request-policy';
import type { StudentWorkspaceKey } from './student-workspace';

type Identity = {
  school_id: string; student_id: string; school_name: string; display_name: string;
  registration_number: string; database_date: string;
};
type OwnRow = { id: string; school_id: string; student_id: string };
type Attendance = OwnRow & { attendance_date: string; status: 'present' | 'absent' | 'late' | 'excused' };
type Enrollment = OwnRow & { section_id: string; academic_year_id: string; valid_from: string; valid_until: string | null };
type Placement = { id: string; school_id: string; name: string; academic_year_id: string; class_id: string;
  classroom: { school_id: string; name: string } | null; year: { school_id: string; label: string } | null };
type Exam = NonNullable<StudentDashboardProjection['examSchedule']>[number] & { is_published: boolean; max_marks: number; passing_marks: number };
type Schedule = { id: string; school_id: string; section_id: string; title: string; subject_code: string;
  exam_date: string; starts_at: string | null; ends_at: string | null; venue: string | null; status: string };
type Material = { id: string; school_id: string; student_id: string | null; section_id: string | null; class_id: string | null;
  audience: string; title: string; kind: string; status: string };
type Entry = OwnRow & { marks_sheet_id: string; marks_obtained: number | null; exam: Exam };

const rowLimit = 500;
const unavailable = { kind: 'unavailable' } as const;

export const getStudentPortalAccess = cache(async () => {
  if (!studentPortalRequestsEnabled()) return null;
  try {
    const client = await createServerSupabaseClient({ cookieWrites: 'read-only', httpOnlyCookies: true });
    // The RPC checks the native JWT, database session, exact role context,
    // active credential version, school membership and Student entitlement.
    const session = await client.auth.getClaims();
    if (session.error || !session.data?.claims) return null;
    const result = await client.rpc('read_student_portal_identity');
    if (result.error || !Array.isArray(result.data) || result.data.length !== 1) return null;
    const identity: Partial<Identity> | null = result.data[0];
    if (!identity || !isStaffUuid(identity.student_id) || !isStaffUuid(identity.school_id) ||
        typeof identity.database_date !== 'string' || !validAttendanceDate(identity.database_date) ||
        typeof identity.display_name !== 'string' || typeof identity.school_name !== 'string' ||
        typeof identity.registration_number !== 'string') return null;
    const verified: Identity = {
      student_id: identity.student_id, school_id: identity.school_id, school_name: identity.school_name,
      display_name: identity.display_name, registration_number: identity.registration_number, database_date: identity.database_date,
    };
    return { client, identity: verified };
  } catch {
    return null;
  }
});

function reportStudentRead(stage: string, error?: { code?: string } | null) {
  if (process.env.STUDENT_AUTH_DIAGNOSTICS === 'true') {
    const code = error?.code && /^[a-zA-Z0-9_]{1,40}$/.test(error.code) ? error.code : 'unknown';
    console.warn('Student dashboard read unavailable', { stage, code });
  }
}

function complete<T>(stage: string, result: { data: T[] | null; error: { code?: string } | null }) {
  if (!result.error && result.data && result.data.length <= rowLimit) return result.data;
  reportStudentRead(stage, result.error);
  return null;
}

export async function readLiveStudentDashboard(
  access: NonNullable<Awaited<ReturnType<typeof getStudentPortalAccess>>>
): Promise<StudentDashboardResult> {
  return readLiveStudentModule(access, 'all');
}

export async function readLiveStudentModule(
  access: NonNullable<Awaited<ReturnType<typeof getStudentPortalAccess>>>,
  workspace: StudentWorkspaceKey | 'all'
): Promise<StudentDashboardResult> {
  const { client, identity } = access;
  const scope = { schoolId: identity.school_id, studentId: identity.student_id };
  const school = scope.schoolId;
  const student = scope.studentId;
  const today = identity.database_date;
  const historyStart = new Date(today + 'T00:00:00Z');
  historyStart.setUTCDate(historyStart.getUTCDate() - 364);
  const own = (row: Pick<OwnRow, 'school_id' | 'student_id'>) => row.school_id === school && row.student_id === student;

  const isAll = workspace === 'all';
  const needEnrollment =
    isAll ||
    workspace === 'overview' ||
    workspace === 'profile' ||
    workspace === 'timetable' ||
    workspace === 'homework' ||
    workspace === 'exams' ||
    workspace === 'materials';
  const needPlacement = needEnrollment;
  const needTimetable = isAll || workspace === 'profile' || workspace === 'timetable';
  const needHomework = isAll || workspace === 'overview' || workspace === 'homework';
  const needExams = isAll || workspace === 'overview' || workspace === 'exams';
  const needMarks = isAll || workspace === 'overview' || workspace === 'exams';
  const needAttendance = isAll || workspace === 'overview' || workspace === 'attendance';
  const needAnnouncements = isAll || workspace === 'overview' || workspace === 'announcements';
  const needFees = isAll || workspace === 'overview' || workspace === 'fees';
  const needMaterials = isAll || workspace === 'materials';

  try {
    let enrollments: ReturnType<typeof selectCurrentStudentEnrollment> extends infer _ ? {
      schoolId: string; studentId: string; sectionId: string; academicYearId: string;
      validFrom: string; validUntil: string | null;
    }[] : never = [];
    let enrollment: ReturnType<typeof selectCurrentStudentEnrollment> = { kind: 'none' };

    if (needEnrollment) {
      const enrollmentResult = await client.from('enrollments')
        .select('id,school_id,student_id,section_id,academic_year_id,valid_from,valid_until')
        .eq('school_id', school).eq('student_id', student)
        .lte('valid_from', today).or('valid_until.is.null,valid_until.gte.' + today)
        .limit(2).overrideTypes<Enrollment[], { merge: false }>();
      if (enrollmentResult.error || !enrollmentResult.data?.every(own)) {
        reportStudentRead('enrollment', enrollmentResult.error);
        return unavailable;
      }
      enrollments = enrollmentResult.data.map(row => ({
        schoolId: row.school_id, studentId: row.student_id, sectionId: row.section_id, academicYearId: row.academic_year_id,
        validFrom: row.valid_from, validUntil: row.valid_until,
      }));
      enrollment = selectCurrentStudentEnrollment(scope, enrollments, today);
    }

    const academic = async () => {
      if (!needEnrollment || enrollment.kind !== 'current') {
        return { currentClassId: null, placement: null, timetable: null, homework: null, examSchedule: null };
      }
      const section = enrollment.sectionId;
      const [placementResult, timetableResult, homeworkResult, scheduleResult] = await Promise.all([
        needPlacement
          ? client.from('sections').select('id,school_id,name,academic_year_id,class_id,classroom:classes!sections_class_school_fkey(school_id,name),year:academic_years!sections_academic_year_school_fkey(school_id,label)')
              .eq('school_id', school).eq('id', section).eq('academic_year_id', enrollment.academicYearId)
              .maybeSingle().overrideTypes<Placement, { merge: false }>()
          : Promise.resolve({ data: null, error: null }),
        needTimetable
          ? client.from('timetable_slots').select('school_id,section_id,day_of_week,start_time,end_time,subject_code,room_number')
              .eq('school_id', school).eq('section_id', section).limit(rowLimit + 1)
              .overrideTypes<NonNullable<StudentDashboardProjection['timetable']>, { merge: false }>()
          : Promise.resolve({ data: [], error: null }),
        needHomework
          ? client.from('homework_assignments').select('school_id,section_id,title,subject_code,due_date,status,description')
              .eq('school_id', school).eq('section_id', section).eq('status', 'active').order('due_date').order('id').limit(rowLimit + 1)
              .overrideTypes<NonNullable<StudentDashboardProjection['homework']>, { merge: false }>()
          : Promise.resolve({ data: [], error: null }),
        needExams
          ? client.from('student_exam_schedule').select('id,school_id,section_id,title,subject_code,exam_date,starts_at,ends_at,venue,status')
              .eq('school_id', school).eq('section_id', section).eq('status', 'published').gte('exam_date', today)
              .order('exam_date').order('starts_at').order('id').limit(rowLimit + 1).overrideTypes<Schedule[], { merge: false }>()
          : Promise.resolve({ data: [], error: null }),
      ]);
      const row = placementResult.data;
      const placement = !placementResult.error && row && row.school_id === school && row.id === section &&
        row.classroom && row.classroom.school_id === school && row.year && row.year.school_id === school
        ? { school_id: school, section_id: section, academic_year_id: row.academic_year_id,
          class_name: row.classroom.name, section_name: row.name, academic_year: row.year.label } : null;
      if (needPlacement && !placement) reportStudentRead('placement', placementResult.error);

      const schedule = needExams ? complete('schedule', scheduleResult) : [];
      const examSchedule = schedule?.every(item => item.status === 'published' && item.school_id === school && item.section_id === section)
        ? schedule.map(item => ({ ...item, exam_name: item.title, starts_at: item.starts_at ?? undefined,
          ends_at: item.ends_at ?? undefined, venue: item.venue ?? undefined })) : null;
      return {
        currentClassId: placement && row ? row.class_id : null,
        placement,
        timetable: needTimetable ? complete('timetable', timetableResult) : null,
        homework: needHomework ? complete('homework', homeworkResult) : null,
        examSchedule,
      };
    };

    const [academicData, marksResult, attendanceResult, announcementsResult, invoicesResult, receiptsResult, materialsResult] = await Promise.all([
      academic(),
      needMarks
        ? client.from('marks_entries').select('id,school_id,student_id,marks_sheet_id,marks_obtained,exam:marks_sheets!marks_entries_sheet_school_fkey!inner(id,school_id,section_id,exam_name,subject_code,exam_date,is_published,max_marks,passing_marks)')
            .eq('school_id', school).eq('student_id', student).eq('exam.is_published', true)
            .order('id').limit(rowLimit + 1).overrideTypes<Entry[], { merge: false }>()
        : Promise.resolve({ data: [], error: null }),
      needAttendance
        ? client.from('attendance_records').select('id,school_id,student_id,attendance_date,status')
            .eq('school_id', school).eq('student_id', student).gte('attendance_date', historyStart.toISOString().slice(0, 10)).lte('attendance_date', today)
            .order('attendance_date', { ascending: false }).order('id').limit(rowLimit + 1)
            .overrideTypes<Attendance[], { merge: false }>()
        : Promise.resolve({ data: [], error: null }),
      needAnnouncements
        ? client.from('announcements').select('school_id,title,content,target_audience,published_at,expires_at')
            .eq('school_id', school).in('target_audience', ['all', 'students']).order('published_at', { ascending: false })
            .limit(rowLimit + 1).overrideTypes<NonNullable<StudentDashboardProjection['announcements']>, { merge: false }>()
        : Promise.resolve({ data: [], error: null }),
      needFees
        ? client.from('fee_invoices').select('school_id,student_id,invoice_number,title,due_date,amount_paise,paid_paise,status')
            .eq('school_id', school).eq('student_id', student).order('due_date').order('id')
            .limit(rowLimit + 1).overrideTypes<NonNullable<StudentDashboardProjection['invoices']>, { merge: false }>()
        : Promise.resolve({ data: [], error: null }),
      needFees
        ? client.from('fee_payments').select('id,school_id,student_id,receipt_number,payment_date,amount_paise,status')
            .eq('school_id', school).eq('student_id', student).in('status', ['settled', 'refunded'])
            .order('payment_date', { ascending: false }).order('id').limit(rowLimit + 1)
            .overrideTypes<NonNullable<StudentDashboardProjection['receipts']>, { merge: false }>()
        : Promise.resolve({ data: [], error: null }),
      needMaterials
        ? client.from('student_portal_materials').select('id,school_id,student_id,section_id,class_id,audience,title,kind,status')
            .eq('school_id', school).eq('status', 'published').order('updated_at', { ascending: false }).order('id')
            .limit(rowLimit + 1).overrideTypes<Material[], { merge: false }>()
        : Promise.resolve({ data: [], error: null }),
    ]);
    const marks = needMarks ? complete('marks', marksResult) : null;
    const results = marks?.every(row => own(row) && row.exam?.school_id === school &&
      row.exam.id === row.marks_sheet_id && row.exam.is_published === true && validAttendanceDate(row.exam.exam_date))
      ? marks.sort((a, b) => b.exam.exam_date.localeCompare(a.exam.exam_date) || a.id.localeCompare(b.id)) : null;
    const rows = needAttendance ? complete('attendance', attendanceResult) : null;
    const totals = { present: 0, absent: 0, late: 0, excused: 0 };
    const attendance = rows?.every(row => own(row) && Object.hasOwn(totals, row.status) && validAttendanceDate(row.attendance_date))
      ? { school_id: school, student_id: student, ...rows.reduce((counts, row) => {
        counts[row.status]++;
        return counts;
      }, totals), history: rows.slice(0, 60).map(row => ({ date: row.attendance_date, status: row.status })) } : null;
    const profile = {
      displayName: identity.display_name, registration: identity.registration_number, schoolName: identity.school_name, status: 'active',
    } as const;
    const materials = needMaterials ? complete('materials', materialsResult) : null;
    const materialsVisible = materials && materials.every(row => isStaffUuid(row.id) && row.school_id === school &&
      row.status === 'published' && (row.audience === 'school' ||
        (row.audience === 'student' && row.student_id === student) ||
        (row.audience === 'class' && !!academicData.currentClassId && row.class_id === academicData.currentClassId) ||
        (row.audience === 'section' && enrollment.kind === 'current' && row.section_id === enrollment.sectionId)));
    const dashboard = projectStudentDashboard(scope, profile, {
      databaseDate: today, enrollments, ...academicData, attendance, results,
      announcements: needAnnouncements ? complete('announcements', announcementsResult) : null,
      invoices: needFees ? complete('invoices', invoicesResult) : null,
      receipts: needFees ? complete('receipts', receiptsResult) : null,
    }, Date.now(), 'students', true);
    return { kind: 'ready', data: { ...dashboard, materials: materials && materialsVisible
      ? { kind: 'ready', data: materials.map(({ id, title, kind }) => ({ id, title, kind })) }
      : { kind: 'unavailable' } } };
  } catch {
    return unavailable;
  }
}
