import type { PrimaryRole } from './roles';

export type FamilyRole = Extract<PrimaryRole, 'student' | 'parent'>;
export interface RegistrationNumberPolicy {
  readonly status: 'school-approved';
  readonly policyId: string;
  readonly maximumLength: number;
  /** Reviewed server configuration only; never supplied by a login request. */
  readonly acceptsExactValue: (value: string) => boolean;
}
export type RegistrationInputResult =
  | { readonly accepted: true; readonly value: string; readonly policyId: string }
  | { readonly accepted: false; readonly reason: 'invalid_registration' | 'registration_policy_unconfirmed' };

/** Conservative transport ceiling, NOT a school registration-number format. No trimming or folding. */
export function normalizeRegistrationNumber(value: unknown, policy?: RegistrationNumberPolicy): RegistrationInputResult {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128 || /[^\x21-\x7e]/.test(value)) {
    return { accepted: false, reason: 'invalid_registration' };
  }
  if (!policy || policy.status !== 'school-approved' || !policy.policyId ||
    !Number.isSafeInteger(policy.maximumLength) || policy.maximumLength < 1 || policy.maximumLength > 128 ||
    typeof policy.acceptsExactValue !== 'function') return { accepted: false, reason: 'registration_policy_unconfirmed' };
  try {
    if (value.length > policy.maximumLength || policy.acceptsExactValue(value) !== true) return { accepted: false, reason: 'invalid_registration' };
  } catch { return { accepted: false, reason: 'registration_policy_unconfirmed' }; }
  return { accepted: true, value, policyId: policy.policyId };
}

/** Format ONLY. Never converts, trims, returns, logs or stores the supplied PIN. */
export function isSixDigitPinFormat(value: unknown): boolean {
  return typeof value === 'string' && value.length === 6 && /^[0-9]{6}$/.test(value);
}
export type FamilyInputResult =
  | { readonly accepted: true; readonly role: FamilyRole; readonly registration: string; readonly policyId: string }
  | { readonly accepted: false; readonly reason: 'unknown_role' | 'invalid_pin_format' | 'invalid_registration' | 'registration_policy_unconfirmed' };
export function assessFamilyLoginInput(role: unknown, registration: unknown, pin: unknown, policy?: RegistrationNumberPolicy): FamilyInputResult {
  if (role !== 'student' && role !== 'parent') return { accepted: false, reason: 'unknown_role' };
  if (!isSixDigitPinFormat(pin)) return { accepted: false, reason: 'invalid_pin_format' };
  const result = normalizeRegistrationNumber(registration, policy);
  return result.accepted ? { accepted: true, role, registration: result.value, policyId: result.policyId } : result;
}
