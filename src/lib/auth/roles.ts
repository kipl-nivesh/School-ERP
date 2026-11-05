import { roles as previewRoles } from '../../config/roles';

/** Reuse the existing five-role catalog without changing preview navigation. */
export const PRIMARY_ROLES = Object.freeze([...previewRoles]);
export type PrimaryRole = (typeof PRIMARY_ROLES)[number];
export function isPrimaryRole(value: unknown): value is PrimaryRole {
  return typeof value === 'string' && PRIMARY_ROLES.some(role => role === value);
}
