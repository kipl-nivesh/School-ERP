import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';

const datasets = {
  years: { table: 'academic_years', search: 'label', fields: ['label', 'starts_on', 'ends_on', 'id'] },
  classes: { table: 'classes', search: 'name', fields: ['name', 'id'] },
  sections: { table: 'sections', search: 'name', fields: ['name', 'class_id', 'academic_year_id', 'id'] },
  assignments: { table: 'teacher_assignments', search: 'subject_code', fields: ['subject_code', 'teacher_profile_id', 'section_id', 'valid_from', 'valid_until', 'id'] },
} as const;
export type AcademicList = keyof typeof datasets;
export type AcademicPage = { kind: 'denied' | 'error' | 'invalid' } |
  { kind: 'ready'; rows: string[][]; search: string; placement: string; page: number; next: boolean };

async function academicAccess() {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || !evaluatePermission(access.context, 'academics.manage', Date.now()).allowed) return null;
  return access.context.schoolId;
}

export async function readAssignmentStaffOptions() {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school || !evaluatePermission(access.context, 'academics.manage', Date.now()).allowed ||
      !evaluatePermission(access.context, 'staff.read', Date.now()).allowed) return [];
  try {
    const { data, error } = await (await staffClient()).from('staff_profiles')
      .select('profile_id,school_id,display_name,employee_code').eq('school_id', school).eq('is_active', true)
      .order('display_name').order('profile_id').limit(100);
    if (error) return [];
    return (data ?? []).filter(row => row.school_id === school).map(row => ({
      id: row.profile_id, label: [row.display_name, row.employee_code].filter(Boolean).join(' · '),
    }));
  } catch { return []; }
}

export async function readAcademicPage(kind: unknown, form = new FormData()): Promise<AcademicPage> {
  const school = await academicAccess();
  if (!school) return { kind: 'denied' };
  if (typeof kind !== 'string' || !Object.hasOwn(datasets, kind)) return { kind: 'invalid' };
  const config = datasets[kind as AcademicList];
  const term = form.get('search') ?? '';
  const pageInput = form.get('page') ?? '1';
  const placement = form.get('placement') ?? '';
  const placementColumn = kind === 'sections' ? 'class_id' : kind === 'assignments' ? 'section_id' : null;
  if (typeof term !== 'string' || term.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(term.trim()) ||
      typeof pageInput !== 'string' || !/^[1-9]\d{0,3}$/.test(pageInput) || Number(pageInput) > 1000 ||
      typeof placement !== 'string' || (placement && (!placementColumn || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(placement))) ||
      ['search', 'page', 'placement'].some(field => form.getAll(field).length > 1)) return { kind: 'invalid' };

  const search = term.trim();
  const page = Number(pageInput);
  const offset = (page - 1) * 25;
  try {
    const client = await staffClient();
    let query = client.from(config.table).select(['school_id', ...config.fields].join(','))
      .eq('school_id', school).order(config.search).order('id').range(offset, offset + 25);
    if (search) query = query.ilike(config.search, '%' + search + '%');
    if (placement && placementColumn) query = query.eq(placementColumn, placement);
    const result = await query.overrideTypes<Record<string, unknown>[], { merge: false }>();
    if (result.error || result.data?.some(row => row.school_id !== school)) return { kind: 'error' };
    const rows = result.data ?? [];
    return { kind: 'ready', rows: rows.slice(0, 25).map(row => config.fields.map(field => String(row[field] ?? '—'))),
      search, placement, page, next: rows.length > 25 && page < 1000 };
  } catch {
    return { kind: 'error' };
  }
}

type PlacementOption = { id: string; label: string };
export type AcademicOptions = { years: PlacementOption[]; classes: PlacementOption[]; sections: (PlacementOption & { classId: string; yearId: string })[]; partial: boolean };
export async function readAcademicOptions(scope: 'academics' | 'homework' | 'marks' | 'admissions' = 'academics'): Promise<AcademicOptions> {
  const unavailable: AcademicOptions = { years: [], classes: [], sections: [], partial: true };
  const access = scope !== 'academics' ? await getStaffAccess('admin') : null;
  const allowed = (permission: 'marks.read' | 'homework.read' | 'homework.write' | 'students.read' | 'academics.manage' | 'admissions.write') =>
    !!access && evaluatePermission(access.context, permission, Date.now()).allowed;
  const school = scope === 'academics' ? await academicAccess() :
    (scope === 'marks' ? allowed('marks.read') : scope === 'admissions' ? allowed('admissions.write') : allowed('homework.read') || allowed('homework.write')) &&
    (allowed('students.read') || allowed('academics.manage'))
      ? access?.context.schoolId : null;
  if (!school) return unavailable;
  try {
    const client = await staffClient();
    const [years, classes, sections] = await Promise.all([
      client.from('academic_years').select('school_id,id,label').eq('school_id', school).order('label').order('id').limit(101),
      client.from('classes').select('school_id,id,name').eq('school_id', school).order('name').order('id').limit(101),
      client.from('sections').select('school_id,id,name,class_id,academic_year_id').eq('school_id', school).order('name').order('id').limit(101),
    ]);
    const visible = <T extends { school_id: string }>(rows: T[] | null) =>
      (rows ?? []).filter(row => row.school_id === school).slice(0, 100);
    return {
      years: visible(years.data).map(row => ({ id: row.id, label: row.label })),
      classes: visible(classes.data).map(row => ({ id: row.id, label: row.name })),
      sections: visible(sections.data).map(row => ({ id: row.id, label: row.name, classId: row.class_id, yearId: row.academic_year_id })),
      partial: [years, classes, sections].some(result => result.error || (result.data?.length ?? 0) > 100),
    };
  } catch {
    return unavailable;
  }
}
