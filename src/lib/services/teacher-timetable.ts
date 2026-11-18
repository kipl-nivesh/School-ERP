import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { staffClient, type getStaffAccess } from '../staff/server';
import { timetableDays } from './timetable-fields';
import { isRecordId } from './management-contracts';
import type { TeacherQuery } from './teacher-dashboard';

type Access = NonNullable<Awaited<ReturnType<typeof getStaffAccess>>>;
type Slot = {
  id: string; school_id: string; teacher_profile_id: string; section_id: string;
  day_of_week: string; period_number: number; start_time: string; end_time: string; subject_code: string; room_number: string;
  placement: { school_id: string; class_id: string; academic_year_id: string; name: string;
    classroom: { name: string }; year: { label: string } };
};
const pageSize = 25;
// The schema allows six days and at most ten distinct periods per teacher per day.
const weeklyLimit = timetableDays.length * 10;
const assignment = 'assignment:teacher_assignments!teacher_assignments_section_year_school_fkey!inner(school_id,teacher_profile_id)';
const placement = 'placement:sections!timetable_section_school_fkey!inner(school_id,class_id,academic_year_id,name,' +
  'classroom:classes!sections_class_school_fkey!inner(name),year:academic_years!sections_academic_year_school_fkey!inner(label),' + assignment + ')';
const fields = 'id,school_id,teacher_profile_id,section_id,day_of_week,period_number,start_time,end_time,subject_code,room_number,' + placement;

function filtersFrom(input: TeacherQuery) {
  const { view = 'week', year = '', classId = '', section = '', subject = '', day = '', detail = '', page = '1' } = input;
  if (typeof view !== 'string' || !['week', 'day', 'list'].includes(view) ||
      typeof year !== 'string' || typeof classId !== 'string' || typeof section !== 'string' || typeof detail !== 'string' ||
      [year, classId, section, detail].some(value => value && !isRecordId(value)) ||
      typeof subject !== 'string' || subject.length > 80 || /[\x00-\x1f\x7f]/.test(subject) ||
      typeof day !== 'string' || (day && !timetableDays.some(value => value === day)) ||
      typeof page !== 'string' || !/^[1-9]\d{0,2}$/.test(page)) return null;
  return { view, year: year.toLowerCase(), classId: classId.toLowerCase(), section: section.toLowerCase(), subject: subject.trim(),
    day: day || (view === 'day' ? timetableDays[0] : ''), detail: detail.toLowerCase(), page: Number(page) };
}

function seconds(time: string) {
  const [hours, minutes, seconds = '0'] = time.split(':');
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function overlaps(slots: Slot[]) {
  const flagged = new Map<string, { teacher: true; section: boolean }>();
  for (const [offset, first] of slots.entries()) {
    for (const second of slots.slice(offset + 1)) {
      if (first.day_of_week !== second.day_of_week || seconds(first.start_time) >= seconds(second.end_time) ||
          seconds(second.start_time) >= seconds(first.end_time)) continue;
      for (const slot of [first, second]) {
        flagged.set(slot.id, { teacher: true, section: first.section_id === second.section_id || !!flagged.get(slot.id)?.section });
      }
    }
  }
  return flagged;
}

export async function readTeacherTimetable(access: Access, input: TeacherQuery) {
  const { context } = access;
  const school = context.schoolId;
  const teacher = context.profileId;
  const now = Date.now();
  if (access.role !== 'teacher' || !school || !evaluatePermission(context, 'dashboard.teacher.view', now).allowed ||
      !evaluatePermission(context, 'students.read', now).allowed) return { kind: 'denied' } as const;
  const filters = filtersFrom(input);
  if (!filters) return { kind: 'invalid' } as const;
  try {
    const client = await staffClient();
    const scoped = () => client.from('timetable_slots').select(fields)
      .eq('school_id', school).eq('teacher_profile_id', teacher).eq('placement.school_id', school)
      .eq('placement.assignment.school_id', school).eq('placement.assignment.teacher_profile_id', teacher)
      .order('start_time').order('day_of_week').order('period_number').order('id');
    if (filters.section) {
      const assigned = await client.from('teacher_assignments').select('section_id').eq('school_id', school)
        .eq('teacher_profile_id', teacher).eq('section_id', filters.section).limit(1);
      if (assigned.error) return { kind: 'error' } as const;
      if (assigned.data?.[0]?.section_id !== filters.section) return { kind: 'unassigned' } as const;
    }
    let filtered = scoped();
    if (filters.year) filtered = filtered.eq('placement.academic_year_id', filters.year);
    if (filters.classId) filtered = filtered.eq('placement.class_id', filters.classId);
    if (filters.section) filtered = filtered.eq('section_id', filters.section);
    if (filters.subject) filtered = filtered.eq('subject_code', filters.subject);
    if (filters.day) filtered = filtered.eq('day_of_week', filters.day);
    const offset = (filters.page - 1) * pageSize;
    const limit = filters.view === 'list' ? pageSize : weeklyLimit;
    const [wholeWeek, result] = await Promise.all([
      scoped().limit(weeklyLimit + 1).overrideTypes<Slot[], { merge: false }>(),
      (filters.view === 'list' ? filtered.range(offset, offset + pageSize) : filtered.limit(weeklyLimit + 1))
        .overrideTypes<Slot[], { merge: false }>(),
    ]);
    const scopedRow = (row: Slot) => row.school_id === school && row.teacher_profile_id === teacher &&
      row.placement?.school_id === school && timetableDays.some(day => day === row.day_of_week);
    if (wholeWeek.error || result.error || !wholeWeek.data || !result.data || wholeWeek.data.length > weeklyLimit ||
        !wholeWeek.data.every(scopedRow) || !result.data.every(scopedRow) ||
        (filters.view !== 'list' && result.data.length > weeklyLimit)) return { kind: 'error' } as const;

    const conflicts = overlaps(wholeWeek.data);
    const present = (row: Slot) => ({
      id: row.id, className: row.placement.classroom.name, sectionName: row.placement.name,
      year: row.placement.year.label, subject: row.subject_code, day: row.day_of_week,
      period: row.period_number, start: row.start_time, end: row.end_time, room: row.room_number,
      conflict: conflicts.get(row.id),
    });
    const detail = wholeWeek.data.find(row => row.id === filters.detail);
    const options = {
      year: [...new Map(wholeWeek.data.map(row => [row.placement.academic_year_id, row.placement.year.label]))],
      classId: [...new Map(wholeWeek.data.map(row => [row.placement.class_id, row.placement.classroom.name]))],
      section: [...new Map(wholeWeek.data.map(row => [row.section_id, row.placement.classroom.name + ' / ' + row.placement.name]))],
      subject: [...new Set(wholeWeek.data.map(row => row.subject_code))].sort().map(value => [value, value] as const),
    };
    return { kind: 'ready', filters, options, rows: result.data.slice(0, limit).map(present),
      next: filters.view === 'list' && result.data.length > pageSize && filters.page < 999,
      detail: detail ? present(detail) : null, detailDenied: !!filters.detail && !detail } as const;
  } catch {
    return { kind: 'error' } as const;
  }
}
