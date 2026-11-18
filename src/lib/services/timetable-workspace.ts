import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { isRecordId } from './management-contracts';
import { timetableDays } from './timetable-fields';

export type TimetablePlacement = { id: string; label: string; classId: string; classroom: string; yearId: string; year: string };
export type TimetableAssignment = { id: string; section: string; teacher: string; subject: string; from: string; until: string | null };
export type TimetableSlot = { id: string; revision: number; section: string; day: string; period: number; start: string; end: string; subject: string; teacher: string; teacherName?: string; room: string };
export type TimetableResult = { kind: 'invalid' | 'denied' | 'error' } |
  { kind: 'ready'; rows: TimetableSlot[]; page: number; next: boolean; filters: { section: string; day: string; search: string } };

async function timetableAccess() {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId) return null;
  const allowed = (permission: 'academics.manage' | 'students.read' | 'staff.read') =>
    evaluatePermission(access.context, permission, Date.now()).allowed;
  const manage = allowed('academics.manage');
  return { school: access.context.schoolId, read: manage || allowed('students.read'), manage, staff: allowed('staff.read') };
}

export async function readTimetable(form = new FormData()): Promise<TimetableResult> {
  const access = await timetableAccess();
  if (!access?.read) return { kind: 'denied' };
  const names = ['section', 'day', 'search', 'page'];
  const fields = names.map(name => form.get(name) ?? '');
  if (fields.some(value => typeof value !== 'string') || names.some(name => form.getAll(name).length > 1)) return { kind: 'invalid' };
  const [section, day, term, rawPage] = fields as string[];
  const search = term.trim();
  const page = Number(rawPage || 1);
  if ((section && !isRecordId(section)) || (day && !timetableDays.some(value => value === day)) ||
      term.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search) ||
      (rawPage && !/^[1-9]\d{0,3}$/.test(rawPage)) || page > 1000) return { kind: 'invalid' };

  try {
    const client = await staffClient();
    const offset = (page - 1) * 25;
    const teacher = access.staff ? ',teacher:staff_profiles!timetable_teacher_fkey(display_name,school_id)' : '';
    let query = client.from('timetable_slots').select('id,school_id,revision,section_id,day_of_week,period_number,start_time,end_time,subject_code,teacher_profile_id,room_number' + teacher)
      .eq('school_id', access.school).order('start_time').order('day_of_week').order('id').range(offset, offset + 25);
    if (section) query = query.eq('section_id', section);
    if (day) query = query.eq('day_of_week', day);
    if (search) {
      const pattern = '"%' + search + '%"';
      query = query.or('subject_code.ilike.' + pattern + ',room_number.ilike.' + pattern);
    }
    const result = await query.overrideTypes<{
      id: string; school_id: string; revision: number; section_id: string; day_of_week: string; period_number: number;
      start_time: string; end_time: string; subject_code: string; teacher_profile_id: string; room_number: string;
      teacher?: { display_name: string; school_id: string } | null;
    }[], { merge: false }>();
    if (result.error || result.data?.some(row => row.school_id !== access.school)) return { kind: 'error' };
    const rows = result.data ?? [];
    return { kind: 'ready', page, filters: { section, day, search }, next: rows.length > 25 && page < 1000,
      rows: rows.slice(0, 25).map(row => ({
        id: row.id, revision: row.revision, section: row.section_id, day: row.day_of_week, period: row.period_number,
        start: row.start_time, end: row.end_time, subject: row.subject_code, teacher: row.teacher_profile_id,
        teacherName: row.teacher?.school_id === access.school ? row.teacher.display_name : undefined, room: row.room_number,
      })) };
  } catch {
    return { kind: 'error' };
  }
}

export async function readTimetableOptions() {
  const access = await timetableAccess();
  const unavailable = { placements: [] as TimetablePlacement[], assignments: [] as TimetableAssignment[], incomplete: true };
  if (!access?.read) return unavailable;
  try {
    const client = await staffClient();
    const [placements, assignments] = await Promise.all([
      client.from('sections').select('id,school_id,name,class_id,academic_year_id,classroom:classes!sections_class_school_fkey(name,school_id),year:academic_years!sections_academic_year_school_fkey(label,school_id)')
        .eq('school_id', access.school).order('name').order('id').limit(101).overrideTypes<{
          id: string; school_id: string; name: string; class_id: string; academic_year_id: string;
          classroom: { name: string; school_id: string } | null; year: { label: string; school_id: string } | null;
        }[], { merge: false }>(),
      access.manage ? client.from('teacher_assignments').select('id,school_id,section_id,teacher_profile_id,subject_code,valid_from,valid_until')
        .eq('school_id', access.school).order('valid_from', { ascending: false }).order('id').limit(101) : null,
    ]);
    const sections = placements.error ? [] : placements.data ?? [];
    const candidates = assignments?.error ? [] : assignments?.data ?? [];
    return {
      incomplete: !!(placements.error || assignments?.error || sections.length > 100 || candidates.length > 100),
      placements: sections.slice(0, 100).flatMap(row => row.school_id === access.school &&
        row.classroom?.school_id === access.school && row.year?.school_id === access.school ? [{
          id: row.id, label: row.name, classId: row.class_id, classroom: row.classroom.name, yearId: row.academic_year_id, year: row.year.label,
        }] : []),
      assignments: candidates.slice(0, 100).flatMap(row => row.school_id === access.school ? [{
        id: row.id, section: row.section_id, teacher: row.teacher_profile_id, subject: row.subject_code,
        from: row.valid_from, until: row.valid_until,
      }] : []),
    };
  } catch {
    return unavailable;
  }
}
