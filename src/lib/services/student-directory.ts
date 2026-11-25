import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStudentAdminAccess, staffClient } from '../staff/server';

export const studentStatuses = ['active', 'inactive', 'withdrawn'] as const;
export type StudentStatus = typeof studentStatuses[number];
export type DirectoryFilters = { search: string; status: string; classId: string; sectionId: string; page: number };
type Section = { id: string; name: string; class_id: string; school_id: string; classroom: { name: string; school_id: string } | null; year: { label: string; school_id: string } | null };
type Student = {
  id: string; display_name: string; registration_number: string; enrollment_status: StudentStatus; school_id: string; profile_id: string | null; portal_access_status: string;
  enrollment: { school_id: string; section: Section | null }[];
};
type StudentPortalOperation = 'link' | 'activate' | 'initialize' | 'reset' | 'suspend';
type StudentRow = { id: string; name: string; registration: string; status: StudentStatus; identityLinked?: boolean; portalStatus?: string; className?: string; sectionName?: string; year?: string };
type SectionOption = { id: string; name: string; classId: string; className: string; year?: string };
export type DirectoryResult =
  | { kind: 'denied' | 'error' | 'invalid' }
  | { kind: 'ready'; filters: DirectoryFilters; rows: StudentRow[]; options: SectionOption[]; moreOptions: boolean; hasNext: boolean; portalOperations?: StudentPortalOperation[] };

const pageSize = 25;
const maxPage = 1000;
const optionLimit = 200;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const optionFields = 'id,name,class_id,school_id,classroom:classes!sections_class_school_fkey(name,school_id),year:academic_years!sections_academic_year_school_fkey(label,school_id)';

function parseFilters(form: FormData): DirectoryFilters | null {
  const fields = ['search', 'status', 'classId', 'sectionId', 'page'] as const;
  const entries = fields.map(field => form.get(field) ?? '');
  if (entries.some(value => typeof value !== 'string') || fields.some(field => form.getAll(field).length > 1)) return null;
  const [searchInput, status, classId, sectionId, pageInput] = entries as string[];
  const search = searchInput.trim();
  // Keep PostgREST logical and LIKE syntax out of the user-supplied operand.
  if (searchInput.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search) ||
      (status && !studentStatuses.some(value => value === status)) ||
      (classId && !uuid.test(classId)) || (sectionId && !uuid.test(sectionId)) ||
      (pageInput && !/^[1-9][0-9]{0,3}$/.test(pageInput))) return null;
  const page = Number(pageInput || 1);
  if (page > maxPage) return null;
  return { search, status, classId: classId.toLowerCase(), sectionId: sectionId.toLowerCase(), page };
}

export async function readStudentDirectory(form: FormData = new FormData(), scope: 'students' | 'admissions' = 'students'): Promise<DirectoryResult> {
  const access = await getStudentAdminAccess();
  const schoolId = access?.context.schoolId;
  if (!schoolId || !access || !evaluatePermission(access.context, 'students.read', Date.now()).allowed) return { kind: 'denied' };
  if (scope === 'admissions' && !evaluatePermission(access.context, 'admissions.read', Date.now()).allowed) return { kind: 'denied' };
  const filters = parseFilters(form);
  if (!filters) return { kind: 'invalid' };

  try {
    const client = await staffClient();
    const catalog = await client.from('sections').select(optionFields).eq('school_id', schoolId)
      .order('name').order('id').limit(optionLimit + 1).overrideTypes<Section[], { merge: false }>();
    if (catalog.error) return { kind: 'error' };
    const options = (catalog.data ?? []).slice(0, optionLimit).flatMap(section =>
      section.school_id === schoolId && section.classroom?.school_id === schoolId ? [{
        id: section.id, name: section.name, classId: section.class_id, className: section.classroom.name,
        year: section.year?.school_id === schoolId ? section.year.label : undefined,
      }] : []);
    if ((filters.classId && !options.some(option => option.classId === filters.classId)) ||
        (filters.sectionId && !options.some(option => option.id === filters.sectionId &&
          (!filters.classId || option.classId === filters.classId)))) return { kind: 'invalid' };

    const joined = !!(filters.classId || filters.sectionId);
    const match = joined ? '!inner' : '';
    const enrollmentFields = 'enrollment:enrollments!enrollments_student_school_fkey' + match +
      '(school_id,section:sections!enrollments_section_year_school_fkey' + match + '(' + optionFields + '))';
    const today = new Date().toISOString().slice(0, 10);
    const start = (filters.page - 1) * pageSize;
    let query = client.from('students').select('id,display_name,registration_number,enrollment_status,school_id,profile_id,portal_access_status,' + enrollmentFields)
      .eq('school_id', schoolId)
      .eq('enrollment.school_id', schoolId)
      .lte('enrollment.valid_from', today)
      .or('valid_until.is.null,valid_until.gte.' + today, { referencedTable: 'enrollment' })
      .order('valid_from', { referencedTable: 'enrollment', ascending: false })
      .order('id', { referencedTable: 'enrollment' })
      .limit(1, { referencedTable: 'enrollment' })
      .order('registration_number').order('id').range(start, start + pageSize);
    if (filters.search) {
      const pattern = '"%' + filters.search + '%"';
      query = query.or('display_name.ilike.' + pattern + ',registration_number.ilike.' + pattern);
    }
    if (filters.status) query = query.eq('enrollment_status', filters.status);
    if (filters.classId) query = query.eq('enrollment.section.class_id', filters.classId);
    if (filters.sectionId) query = query.eq('enrollment.section.id', filters.sectionId);

    const result = await query.overrideTypes<Student[], { merge: false }>();
    if (result.error || result.data?.some(student => student.school_id !== schoolId)) return { kind: 'error' };
    const students = result.data ?? [];
    const rows = students.slice(0, pageSize).map(student => {
      const enrollment = student.enrollment.find(entry => entry.school_id === schoolId && entry.section?.school_id === schoolId);
      const section = enrollment?.section;
      return {
        id: student.id, name: student.display_name, registration: student.registration_number, status: student.enrollment_status, identityLinked: !!student.profile_id, portalStatus: student.portal_access_status,
        className: section?.classroom?.school_id === schoolId ? section.classroom.name : undefined,
        sectionName: section?.name,
        year: section?.year?.school_id === schoolId ? section.year.label : undefined,
      };
    });
    const portalOperations: StudentPortalOperation[] = [];
    if (evaluatePermission(access.context, 'security.accounts.create', Date.now()).allowed &&
        evaluatePermission(access.context, 'admissions.write', Date.now()).allowed) portalOperations.push('link', 'activate', 'initialize');
    if (evaluatePermission(access.context, 'security.credentials.reset', Date.now()).allowed) portalOperations.push('reset');
    if (evaluatePermission(access.context, 'security.accounts.suspend', Date.now()).allowed) portalOperations.push('suspend');
    return { kind: 'ready', filters, rows, options, portalOperations, moreOptions: (catalog.data?.length ?? 0) > optionLimit,
      hasNext: students.length > pageSize && filters.page < maxPage };
  } catch {
    return { kind: 'error' };
  }
}
