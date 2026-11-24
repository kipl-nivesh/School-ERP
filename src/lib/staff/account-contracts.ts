import type { PermissionId } from '../auth/permissions';
import type { VerifiedServerContext } from '../auth/types';

export const STAFF_ACCOUNT_PERMISSIONS = {
  invite: 'security.accounts.create',
  edit: 'security.accounts.update',
  activate: 'security.accounts.suspend',
  deactivate: 'security.accounts.suspend',
  reset: 'security.credentials.reset',
} as const satisfies Record<string, PermissionId>;

export function staffAccountPermission(context: VerifiedServerContext, permission: PermissionId): boolean {
  // The SQL commands additionally enforce provider-signed recent password evidence.
  return context.activeRole.role === 'admin' && context.session.assurance === 'aal2' && !!context.schoolId &&
    context.assignments.some(assignment => assignment.id === context.activeRole.assignmentId &&
      assignment.profileId === context.profileId && assignment.role === 'admin' && assignment.status === 'active' &&
      assignment.permissions.includes(permission));
}

export function staffAccountDetails(form: FormData) {
  const fields = ['name', 'code', 'department', 'phone'] as const;
  if (fields.some(field => form.getAll(field).length > 1)) return null;
  const [name, code, department, phone] = fields.map(field => form.get(field) ?? '');
  if (typeof name !== 'string' || typeof code !== 'string' || typeof department !== 'string' || typeof phone !== 'string') return null;
  const displayName = name.trim();
  if (displayName.length < 2 || displayName.length > 160 || /[\u0000-\u001f\u007f]/u.test(name + department) ||
    !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(code.trim()) || department.trim().length > 100 ||
    !/^[+0-9 ().-]{0,30}$/.test(phone.trim())) return null;
  return { p_name: displayName, p_code: code.trim(), p_department: department.trim(), p_phone: phone.trim() };
}

export function staffAccountEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) ? email : null;
}

export type StaffAccountState = { ok: boolean; message: string; link?: string };
