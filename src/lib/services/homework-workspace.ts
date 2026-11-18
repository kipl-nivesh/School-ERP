import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { isRecordId } from './management-contracts';

export type HomeworkRow = {
  id: string; section_id: string; title: string; description: string; subject_code: string;
  due_date: string; assigned_date: string; max_points: number; status: 'active' | 'closed'; revision: number;
};
export type HomeworkFilters = Record<'search' | 'subject' | 'status' | 'year' | 'classId' | 'section', string>;
export type HomeworkPage = { kind: 'denied' | 'invalid' | 'error' } |
  { kind: 'ready'; rows: HomeworkRow[]; page: number; next: boolean; filters: HomeworkFilters };

export async function readHomework(form = new FormData()): Promise<HomeworkPage> {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school || !evaluatePermission(access.context, 'homework.read', Date.now()).allowed) return { kind: 'denied' };
  const names = ['search', 'subject', 'status', 'year', 'classId', 'section', 'page'];
  const values = names.map(name => form.get(name) ?? '');
  if (values.some(value => typeof value !== 'string') || names.some(name => form.getAll(name).length > 1)) return { kind: 'invalid' };
  const [term, subjectInput, status, year, classId, section, rawPage] = values as string[];
  const search = term.trim();
  const subject = subjectInput.trim();
  const page = Number(rawPage || 1);
  if (term.length > 80 || !/^[\p{L}\p{N}\p{M} .'-]*$/u.test(search) ||
      subjectInput.length > 80 || /[\x00-\x1f\x7f]/.test(subject) ||
      !['', 'active', 'closed'].includes(status) || [year, classId, section].some(value => value && !isRecordId(value)) ||
      (rawPage && !/^[1-9]\d{0,3}$/.test(rawPage)) || page > 1000) return { kind: 'invalid' };
  const placementAccess = ['students.read', 'academics.manage'].some(permission =>
    evaluatePermission(access.context, permission, Date.now()).allowed);
  if ((year || classId) && !placementAccess) return { kind: 'denied' };
  try {
    const offset = (page - 1) * 25;
    const join = year || classId ? ',placement:sections!homework_section_school_fkey!inner(school_id)' : '';
    let query = (await staffClient()).from('homework_assignments')
      .select('school_id,id,section_id,title,description,subject_code,due_date,assigned_date,max_points,status,revision' + join)
      .eq('school_id', school).order('due_date', { ascending: false }).order('id').range(offset, offset + 25);
    if (year || classId) query = query.eq('placement.school_id', school);
    if (year) query = query.eq('placement.academic_year_id', year);
    if (classId) query = query.eq('placement.class_id', classId);
    if (section) query = query.eq('section_id', section);
    if (status) query = query.eq('status', status);
    if (subject) query = query.eq('subject_code', subject);
    if (search) query = query.ilike('title', '%' + search + '%');
    const result = await query.overrideTypes<(HomeworkRow & { school_id: string; placement?: { school_id: string } })[], { merge: false }>();
    if (result.error || result.data?.some(row => row.school_id !== school ||
        ((year || classId) && row.placement?.school_id !== school))) return { kind: 'error' };
    const rows = result.data ?? [];
    return { kind: 'ready', page, next: rows.length > 25 && page < 1000, filters: { search, subject, status, year, classId, section },
      rows: rows.slice(0, 25).map(({ id, section_id, title, description, subject_code, due_date, assigned_date, max_points, status, revision }) =>
        ({ id, section_id, title, description, subject_code, due_date, assigned_date, max_points, status, revision })) };
  } catch {
    return { kind: 'error' };
  }
}
