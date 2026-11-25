import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { staffClient, type getStaffAccess } from '../staff/server';
import { attendanceId, attendanceStatuses, validAttendanceDate } from './attendance-fields';
import type { TeacherQuery } from './teacher-dashboard';

type Access = NonNullable<Awaited<ReturnType<typeof getStaffAccess>>>;
type Placement = { id: string; name: string; class_id: string; academic_year_id: string; classroom: { name: string }; year: { label: string } };
type Identity = { display_name: string; registration_number: string };
type RecordRow = { id: string; school_id: string; student_id: string; section_id: string; attendance_date: string; status: string; remarks: string | null; student?: Identity | null };
type Enrollment = { id: string; school_id: string; student_id: string; student: Identity | null };

const scope = 'assignment:teacher_assignments!teacher_assignments_section_year_school_fkey!inner(school_id,teacher_profile_id)';
const placementFields = 'id,name,class_id,academic_year_id,classroom:classes!sections_class_school_fkey!inner(name),year:academic_years!sections_academic_year_school_fkey!inner(label),' + scope;
const recordFields = 'id,school_id,student_id,section_id,attendance_date,status,remarks';
const pageSize = 25;

function filtersFrom(query: TeacherQuery) {
  const { section = '', year = '', classId = '', date = '', status = '', page = '1', rosterPage = '1' } = query;
  if (typeof section !== 'string' || typeof year !== 'string' || typeof classId !== 'string' ||
      [section, year, classId].some(value => value && !attendanceId.test(value)) ||
      typeof date !== 'string' || (date && !validAttendanceDate(date)) ||
      typeof status !== 'string' || (status && !attendanceStatuses.some(value => value === status)) ||
      typeof page !== 'string' || typeof rosterPage !== 'string' ||
      ![page, rosterPage].every(value => /^[1-9]\d{0,2}$/.test(value))) return null;
  return { section: section.toLowerCase(), year: year.toLowerCase(), classId: classId.toLowerCase(),
    date, status, page: Number(page), rosterPage: Number(rosterPage) };
}

export async function readTeacherAttendance(access: Access, input: TeacherQuery) {
  const { context } = access;
  const school = context.schoolId;
  const teacher = context.profileId;
  const now = Date.now();
  if (access.role !== 'teacher' || !school || !evaluatePermission(context, 'dashboard.teacher.view', now).allowed) {
    return { kind: 'denied' } as const;
  }
  const canRead = evaluatePermission(context, 'attendance.read', now).allowed;
  const canWrite = evaluatePermission(context, 'attendance.write', now).allowed;
  const identities = evaluatePermission(context, 'students.read', now).allowed;
  if (!canRead && !canWrite) return { kind: 'denied' } as const;
  const filters = filtersFrom(input);
  if (!filters || (!identities && (filters.classId || filters.year))) return { kind: 'invalid' } as const;

  try {
    const client = await staffClient();
    const placements = () => client.from('sections').select(placementFields)
      .eq('school_id', school).eq('assignment.school_id', school).eq('assignment.teacher_profile_id', teacher);
    const assignments = () => client.from('teacher_assignments').select('section_id')
      .eq('school_id', school).eq('teacher_profile_id', teacher);
    let picked: Placement | null = null;
    if (filters.section) {
      // Assignment RLS checks the active assignment using the database current_date.
      const assigned = await assignments().eq('section_id', filters.section).limit(1);
      if (assigned.error) return { kind: 'error' } as const;
      if (assigned.data?.length !== 1 || assigned.data[0].section_id !== filters.section) return { kind: 'unassigned' } as const;
      if (identities) {
        const selected = await placements().eq('id', filters.section).maybeSingle().overrideTypes<Placement, { merge: false }>();
        if (selected.error) return { kind: 'error' } as const;
        picked = selected.data;
        if (!picked || picked.id !== filters.section || (filters.year && picked.academic_year_id !== filters.year) ||
            (filters.classId && picked.class_id !== filters.classId)) return { kind: 'unassigned' } as const;
      }
    }

    const catalog = identities ? await placements().order('name').order('id').limit(201).overrideTypes<Placement[], { merge: false }>() : null;
    if (catalog?.error) return { kind: 'error' } as const;
    const attendanceSection = 'placement:sections!attendance_section_school_fkey!inner(school_id,class_id,academic_year_id,' + scope + ')';
    const records = (fields: string, options?: { head: true; count: 'exact' }) => {
      // Without students.read, section and identity relationships are intentionally omitted.
      // The existing attendance SELECT policies still intersect active Teacher assignment and enrollment.
      let query = client.from('attendance_records').select(fields + (identities ? ',' + attendanceSection : ''), options)
        .eq('school_id', school);
      if (identities) query = query.eq('placement.school_id', school).eq('placement.assignment.school_id', school)
        .eq('placement.assignment.teacher_profile_id', teacher);
      if (filters.section) query = query.eq('section_id', filters.section);
      if (filters.year) query = query.eq('placement.academic_year_id', filters.year);
      if (filters.classId) query = query.eq('placement.class_id', filters.classId);
      if (filters.date) query = query.eq('attendance_date', filters.date);
      return query;
    };
    const pageStart = (filters.page - 1) * pageSize;
    const rosterStart = (filters.rosterPage - 1) * pageSize;
    const studentFields = ',student:students!attendance_student_school_fkey(display_name,registration_number)';
    const rosterDate = filters.date || new Date(now).toISOString().slice(0, 10);
    let historyQuery = records(identities ? recordFields + studentFields : 'id,school_id,section_id,attendance_date,status');
    if (filters.status) historyQuery = historyQuery.eq('status', filters.status);

    const [history, statusCounts, assignedSections, roster] = await Promise.all([
      canRead ? historyQuery.order('attendance_date', { ascending: false }).order('id')
        .range(pageStart, pageStart + pageSize).overrideTypes<RecordRow[], { merge: false }>() : null,
      canRead ? Promise.all(attendanceStatuses.map(status => records('id', { head: true, count: 'exact' }).eq('status', status))) : null,
      identities ? client.from('sections').select('id,' + scope, { head: true, count: 'exact' })
        .eq('school_id', school).eq('assignment.school_id', school).eq('assignment.teacher_profile_id', teacher) : null,
      identities && picked && ((canRead && filters.date) || (canWrite && !filters.date)) ? client.from('enrollments').select(
        'id,school_id,student_id,student:students!enrollments_student_school_fkey(display_name,registration_number),' +
        'placement:sections!enrollments_section_year_school_fkey!inner(school_id,' + scope + ')',
      ).eq('school_id', school).eq('section_id', picked.id).eq('placement.school_id', school)
        .eq('placement.assignment.school_id', school).eq('placement.assignment.teacher_profile_id', teacher)
        .lte('valid_from', rosterDate).or('valid_until.is.null,valid_until.gte.' + rosterDate)
        .order('student_id').order('id').range(rosterStart, rosterStart + pageSize).overrideTypes<Enrollment[], { merge: false }>() : null,
    ]);
    if (history?.error || roster?.error || assignedSections?.error ||
        (assignedSections && assignedSections.count === null) ||
        statusCounts?.some(result => result.error || result.count === null) ||
        history?.data?.some(row => row.school_id !== school) || roster?.data?.some(row => row.school_id !== school)) {
      return { kind: 'error' } as const;
    }
    const members = (roster?.data ?? []).slice(0, pageSize);
    const recorded = members.length && filters.date ? await records(recordFields)
      .in('student_id', members.map(row => row.student_id)).overrideTypes<RecordRow[], { merge: false }>() : null;
    if (recorded?.error || recorded?.data?.some(row => row.school_id !== school)) return { kind: 'error' } as const;
    const recordByStudent = new Map((recorded?.data ?? []).map(row => [row.student_id, row]));
    const historyRows = (history?.data ?? []).slice(0, pageSize).map(row => ({
      id: row.id, date: row.attendance_date, section: row.section_id, status: row.status,
      remarks: identities && row.student ? row.remarks : null,
      name: identities ? row.student?.display_name : undefined,
      registration: identities ? row.student?.registration_number : undefined,
    }));
    return {
      kind: 'ready', filters, canRead, canWrite, identities, picked,
      placements: (catalog?.data ?? []).slice(0, 200),
      morePlacements: (catalog?.data?.length ?? 0) > 200,
      assignedSections: assignedSections?.count ?? null,
      counts: statusCounts?.map(result => result.count ?? 0) ?? null,
      history: historyRows,
      next: (history?.data?.length ?? 0) > pageSize && filters.page < 999,
      writeStudents: !filters.date && canWrite ? members.flatMap(row => row.student ?
        [{ id: row.student_id, name: row.student.display_name, registration: row.student.registration_number }] : []) : [],
      roster: filters.date && roster ? members.map(row => ({
        id: row.id, name: row.student?.display_name, registration: row.student?.registration_number,
        status: recordByStudent.get(row.student_id)?.status, remarks: row.student ? recordByStudent.get(row.student_id)?.remarks : null,
      })) : null,
      rosterNext: (roster?.data?.length ?? 0) > pageSize && filters.rosterPage < 999,
    } as const;
  } catch {
    return { kind: 'error' } as const;
  }
}
