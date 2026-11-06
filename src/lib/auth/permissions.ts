import type { PrimaryRole } from './roles';

export const PERMISSIONS = Object.freeze([
  'dashboard.admin.view', 'dashboard.teacher.view', 'dashboard.student.view',
  'dashboard.parent.view', 'dashboard.accountant.view',
  'school.settings.read', 'school.settings.write', 'admissions.read', 'admissions.write',
  'students.read', 'staff.read', 'academics.manage', 'attendance.read', 'attendance.write',
  'homework.read', 'homework.write', 'marks.read', 'marks.write', 'marks.publish',
  'fees.read', 'fees.write', 'payments.read', 'payments.record', 'expenses.read',
  'expenses.write', 'receipts.read', 'reports.read', 'reports.export',
  'announcements.read', 'announcements.write', 'documents.read', 'audit.read',
  'children.academics.read', 'children.fees.read',
  'security.accounts.create', 'security.accounts.update', 'security.accounts.suspend',
  'security.credentials.reset', 'security.sessions.revoke', 'security.roles.assign',
  'security.roles.revoke', 'security.permissions.assign', 'security.permissions.revoke',
] as const);
export type PermissionId = (typeof PERMISSIONS)[number];
export type SecurityPermission = Extract<PermissionId, `security.${string}`>;
export function isPermissionId(value: unknown): value is PermissionId {
  return typeof value === 'string' && PERMISSIONS.some(permission => permission === value);
}
export const isSecurityPermission = (permission: PermissionId): permission is SecurityPermission => permission.startsWith('security.');

const adminPermissions: readonly PermissionId[] = PERMISSIONS.filter(p =>
  !p.startsWith('children.') &&
  (!p.startsWith('dashboard.') || p === 'dashboard.admin.view'));
const ceilings: Readonly<Record<PrimaryRole, readonly PermissionId[]>> = Object.freeze({
  admin: Object.freeze(adminPermissions),
  teacher: Object.freeze(['dashboard.teacher.view', 'students.read', 'attendance.read', 'attendance.write',
    'homework.read', 'homework.write', 'marks.read', 'marks.write', 'reports.read',
    'announcements.read', 'announcements.write', 'documents.read'] as const),
  student: Object.freeze(['dashboard.student.view', 'students.read', 'attendance.read',
    'homework.read', 'homework.write', 'marks.read', 'announcements.read', 'documents.read'] as const),
  parent: Object.freeze(['dashboard.parent.view', 'children.academics.read', 'children.fees.read',
    'announcements.read', 'documents.read', 'receipts.read'] as const),
  accountant: Object.freeze(['dashboard.accountant.view', 'fees.read', 'fees.write', 'payments.read',
    'payments.record', 'expenses.read', 'expenses.write', 'receipts.read', 'reports.read',
    'reports.export', 'announcements.read', 'documents.read', 'audit.read'] as const),
});

/** A ceiling is not a grant. Ordinary roles also require an explicit active membership grant. */
export function getPermissionCeiling(role: PrimaryRole): readonly PermissionId[] {
  return ceilings[role];
}
