import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';

export type StaffEntry = { name: string; code: string | null; department: string | null; active: boolean };
export type StaffDirectoryResult = { kind: 'denied' | 'invalid' | 'error' } |
  { kind: 'ready'; rows: StaffEntry[]; search: string; status: string; page: number; hasNext: boolean };

export async function readStaffDirectory(form = new FormData()): Promise<StaffDirectoryResult> {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school || !evaluatePermission(access.context, 'staff.read', Date.now()).allowed) return { kind: 'denied' };
  const names = ['search', 'status', 'page'];
  const entries = names.map(name => form.get(name) ?? '');
  if (names.some(name => form.getAll(name).length > 1) || entries.some(value => typeof value !== 'string')) return { kind: 'invalid' };
  const [term, status, rawPage] = entries as string[];
  const search = term.trim();
  const page = Number(rawPage || 1);
  if (term.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search) ||
      !['', 'active', 'inactive'].includes(status) || (rawPage && !/^[1-9]\d{0,3}$/.test(rawPage)) || page > 1000) {
    return { kind: 'invalid' };
  }
  try {
    const client = await staffClient();
    const offset = (page - 1) * 25;
    let query = client.from('staff_profiles').select('school_id,display_name,employee_code,department,is_active')
      .eq('school_id', school).order('display_name').order('profile_id').range(offset, offset + 25);
    if (status) query = query.eq('is_active', status === 'active');
    if (search) {
      const pattern = '"%' + search + '%"';
      query = query.or('display_name.ilike.' + pattern + ',employee_code.ilike.' + pattern + ',department.ilike.' + pattern);
    }
    const result = await query;
    if (result.error || result.data?.some(row => row.school_id !== school)) return { kind: 'error' };
    const records = result.data ?? [];
    const rows = records.slice(0, 25).map(row => ({
      name: row.display_name, code: row.employee_code, department: row.department, active: row.is_active,
    }));
    return { kind: 'ready', rows, search, status, page, hasNext: records.length > 25 && page < 1000 };
  } catch {
    return { kind: 'error' };
  }
}
