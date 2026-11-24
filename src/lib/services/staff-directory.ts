import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { STAFF_ACCOUNT_PERMISSIONS, staffAccountPermission } from '../staff/account-contracts';

export type StaffEntry = {
  membership: string | null; name: string; email: string | null; code: string | null;
  department: string | null; phone: string | null; role: string | null; status: string;
};
export type StaffDirectoryResult = { kind: 'denied' | 'invalid' | 'error' } |
  { kind: 'ready'; rows: StaffEntry[]; search: string; status: string; role: string; page: number; hasNext: boolean;
    canInvite: boolean; canEdit: boolean; canSuspend: boolean; canReset: boolean };

export async function readStaffDirectory(form = new FormData()): Promise<StaffDirectoryResult> {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || !evaluatePermission(access.context, 'staff.read', Date.now()).allowed) return { kind: 'denied' };
  const names = ['search', 'status', 'role', 'page'];
  const entries = names.map(name => form.get(name) ?? '');
  if (names.some(name => form.getAll(name).length > 1) || entries.some(value => typeof value !== 'string')) return { kind: 'invalid' };
  const [term, status, role, rawPage] = entries as string[];
  const search = term.trim();
  const page = Number(rawPage || 1);
  if (term.length > 80 || !['', 'active', 'inactive'].includes(status) || !['', 'teacher', 'accountant'].includes(role) ||
    (rawPage && !/^[1-9]\d{0,3}$/.test(rawPage)) || page > 1000) return { kind: 'invalid' };

  try {
    const client = await staffClient();
    const result = await client.rpc('list_managed_school_staff', { p_search: search, p_status: status, p_role: role, p_offset: (page - 1) * 25 });
    if (result.error || !Array.isArray(result.data)) return { kind: 'error' };
    const rows = result.data.slice(0, 25).map(row => ({
      membership: row.membership_id, name: row.display_name, email: row.email, code: row.employee_code,
      department: row.department, phone: row.phone, role: row.role_code, status: row.account_status,
    }));
    const allowed = (intent: keyof typeof STAFF_ACCOUNT_PERMISSIONS) => staffAccountPermission(access.context, STAFF_ACCOUNT_PERMISSIONS[intent]);
    return {
      kind: 'ready', rows, search, status, role, page, hasNext: result.data.length > 25 && page < 1000,
      canInvite: allowed('invite') && staffAccountPermission(access.context, 'security.roles.assign'),
      canEdit: allowed('edit'), canSuspend: allowed('deactivate'), canReset: allowed('reset'),
    };
  } catch {
    return { kind: 'error' };
  }
}
