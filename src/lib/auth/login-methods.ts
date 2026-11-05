import type { AdminPrivilegeTier, LoginMethodId, PinCredentialBinding } from './types';
import { isPrimaryRole } from './roles';
export const LOGIN_METHODS = Object.freeze({
  email_password: Object.freeze({ roles: Object.freeze(['admin', 'teacher', 'accountant'] as const) }),
  student_registration_pin: Object.freeze({ roles: Object.freeze(['student'] as const) }),
  parent_registration_pin: Object.freeze({ roles: Object.freeze(['parent'] as const), guardianReferenceRequired: false,
    initialRelationshipPolicy: 'one-student-one-parent-login' as const }),
});
export function loginMethodForRole(role: unknown): LoginMethodId | null {
  if (!isPrimaryRole(role)) return null;
  return role === 'student' ? 'student_registration_pin' : role === 'parent' ? 'parent_registration_pin' : 'email_password';
}
export const loginRequiresMfa = (tier: AdminPrivilegeTier) => tier === 'super_admin';

/** Post-resolution metadata compatibility ONLY. A true result is NOT PIN authentication. */
export function credentialBindingMatches(method: LoginMethodId, identityProfileId: string, binding: PinCredentialBinding): boolean {
  if (!identityProfileId || !binding.credentialId || binding.status !== 'active' || binding.identityProfileId !== identityProfileId) return false;
  return (method === 'student_registration_pin' && binding.role === 'student' && binding.method === method) ||
    (method === 'parent_registration_pin' && binding.role === 'parent' && binding.method === method);
}
