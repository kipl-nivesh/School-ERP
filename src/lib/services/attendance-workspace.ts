import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { attendanceId, attendanceStatuses, validAttendanceDate } from './attendance-fields';

export type AttendancePlacement = { id: string; label: string; classId: string; className: string; yearId: string; year: string };
export type AttendanceRecord = { student: string; section: string; name?: string; registration?: string; date: string; status?: string };
export type AttendanceResult = { kind: 'denied' | 'error' | 'invalid' } |
  { kind: 'ready'; rows: AttendanceRecord[]; page: number; next: boolean; filters: Record<'mode' | 'section' | 'date' | 'status' | 'search', string> };

async function accessForAttendance() {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school) return null;
  const allowed = (permission: 'attendance.read' | 'attendance.write' | 'students.read' | 'academics.manage') =>
    evaluatePermission(access.context, permission, Date.now()).allowed;
  return { school, history: allowed('attendance.read'), write: allowed('attendance.write'),
    students: allowed('students.read'), catalog: allowed('students.read') || allowed('academics.manage') };
}

export async function readAttendancePlacements() {
  const access = await accessForAttendance();
  const unavailable = { placements: [] as AttendancePlacement[], incomplete: true };
  if (!access || !access.catalog || !(access.history || access.write)) return unavailable;
  try {
    const result = await (await staffClient()).from('sections').select(
      'id,name,school_id,class_id,academic_year_id,classroom:classes!sections_class_school_fkey(name,school_id),year:academic_years!sections_academic_year_school_fkey(label,school_id)',
    ).eq('school_id', access.school).order('name').order('id').limit(101).overrideTypes<{
      id: string; name: string; school_id: string; class_id: string; academic_year_id: string;
      classroom: { name: string; school_id: string } | null; year: { label: string; school_id: string } | null;
    }[], { merge: false }>();
    if (result.error || result.data?.some(row => row.school_id !== access.school)) return unavailable;
    const rows = result.data ?? [];
    return { incomplete: rows.length > 100, placements: rows.slice(0, 100).flatMap(row =>
      row.classroom?.school_id === access.school && row.year?.school_id === access.school
        ? [{ id: row.id, label: row.name, classId: row.class_id, className: row.classroom.name,
          yearId: row.academic_year_id, year: row.year.label }] : []) };
  } catch {
    return unavailable;
  }
}

type AttendanceDataRow = {
  school_id: string; student_id: string; section_id: string; attendance_date?: string; status?: string;
  student: { school_id: string; display_name: string; registration_number: string } | null;
};

export async function readAttendance(form = new FormData()): Promise<AttendanceResult> {
  const access = await accessForAttendance();
  if (!access) return { kind: 'denied' };
  const fields = ['mode', 'section', 'date', 'status', 'search', 'page'] as const;
  const input = fields.map(field => form.get(field) ?? '');
  if (input.some(value => typeof value !== 'string') || fields.some(field => form.getAll(field).length > 1)) return { kind: 'invalid' };
  const [modeInput, section, date, status, term, rawPage] = input as string[];
  const mode = modeInput || 'history';
  const roster = mode === 'roster';
  if (!roster && mode !== 'history') return { kind: 'invalid' };
  if (roster ? !access.students || !(access.history || access.write) : !access.history) return { kind: 'denied' };
  const search = term.trim();
  const page = Number(rawPage || 1);
  if ((section && !attendanceId.test(section)) || (date && !validAttendanceDate(date)) ||
      (roster && (!section || !date || status)) ||
      (status && !attendanceStatuses.some(value => value === status)) ||
      term.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search) ||
      (search && !access.students && !attendanceId.test(search)) ||
      (rawPage && !/^[1-9]\d{0,3}$/.test(rawPage)) || page > 1000) return { kind: 'invalid' };

  try {
    const client = await staffClient();
    const start = (page - 1) * 25;
    const relation = roster ? 'enrollments_student_school_fkey' : 'attendance_student_school_fkey';
    const embed = access.students
      ? ',student:students!' + relation + (roster || search ? '!inner' : '') + '(school_id,display_name,registration_number)'
      : '';
    let query = client.from(roster ? 'enrollments' : 'attendance_records')
      .select('school_id,student_id,section_id' + (roster ? '' : ',attendance_date,status') + embed)
      .eq('school_id', access.school);
    if (section) query = query.eq('section_id', section);
    if (roster) query = query.lte('valid_from', date).or('valid_until.is.null,valid_until.gte.' + date).order('student_id');
    else {
      if (date) query = query.eq('attendance_date', date);
      if (status) query = query.eq('status', status);
      query = query.order('attendance_date', { ascending: false });
    }
    if (search && access.students) {
      const pattern = '"%' + search + '%"';
      query = query.or('display_name.ilike.' + pattern + ',registration_number.ilike.' + pattern, { referencedTable: 'student' });
    } else if (search) query = query.eq('student_id', search);

    const result = await query.order('id').range(start, start + 25).overrideTypes<AttendanceDataRow[], { merge: false }>();
    if (result.error || result.data?.some(row => row.school_id !== access.school)) return { kind: 'error' };
    const rows = result.data ?? [];
    return {
      kind: 'ready', page, next: rows.length > 25 && page < 1000, filters: { mode, section, date, status, search },
      rows: rows.slice(0, 25).map(row => ({
        student: row.student_id, section: row.section_id, date: roster ? date : row.attendance_date ?? '',
        status: row.status, name: row.student?.school_id === access.school ? row.student.display_name : undefined,
        registration: row.student?.school_id === access.school ? row.student.registration_number : undefined,
      })),
    };
  } catch {
    return { kind: 'error' };
  }
}
