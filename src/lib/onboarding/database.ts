import 'server-only';
import { staffClient, getStaffAccess } from '../staff/server';
import { validateSchoolRegistration } from './service';
import type { SchoolRegistrationInput } from './types';

/** Native session clients only. No privileged API key and no in-memory fallback. */
export async function submitRegistration(input: SchoolRegistrationInput) {
  if (!validateSchoolRegistration(input).isValid || Object.values(input).some(v => typeof v !== 'string' || v.length > 500)) throw new Error('Invalid registration');
  const client = await staffClient(true);
  const { data, error } = await client.rpc('submit_school_registration', {
    p_school_name: input.schoolName, p_school_code: input.schoolCode, p_school_email: input.schoolEmail,
    p_contact_number: input.contactNumber, p_address_line: input.addressLine, p_city: input.city,
    p_state: input.state, p_postal_code: input.postalCode, p_admin_name: input.adminName, p_admin_email: input.adminEmail,
  });
  if (error || !data) throw new Error('Registration unavailable');
  return data as { registration_id: string; school_code: string };
}
export async function registrationStatus(id: string) {
  const { data, error } = await (await staffClient()).rpc('registration_status', { p_registration: id });
  if (error) throw new Error('Registration unavailable');
  return data;
}
/** Deliberately no public Server Action: operator identity is checked in PostgreSQL. */
export async function reviewRegistration(id: string, approve: boolean, reason?: string) {
  const { data, error } = await (await staffClient(true)).rpc('review_school_registration', { p_registration: id, p_approve: approve, p_reason: reason ?? null });
  if (error) throw new Error('Review denied');
  return data;
}
export async function getOnboarding() {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId) throw new Error('Access denied');
  const client = await staffClient();
  const { data, error } = await client.from('school_onboarding_progress').select('current_step,completed_steps,step_data,is_completed').eq('school_id', access.context.schoolId).maybeSingle();
  if (error) throw new Error('Onboarding unavailable');
  return data;
}
export async function saveOnboarding(step: number, payload: unknown) {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || access.context.session.assurance !== 'aal2') throw new Error('Access denied');
  if (!Number.isInteger(step) || step < 1 || step > 8 || !payload || typeof payload !== 'object' || JSON.stringify(payload).length > 200000) throw new Error('Invalid step');
  const { data, error } = await (await staffClient(true)).rpc('save_school_onboarding', { p_step: step, p_data: payload });
  if (error || !data) throw new Error('Unable to save. Verify required records and account activation prerequisites.');
  return data;
}
export async function verifyGuardian(registration: string, guardianId: string, email: string) {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || access.context.session.assurance !== 'aal2') throw new Error('Access denied');
  const result = await (await staffClient(true)).rpc('verify_school_guardian', { p_registration: registration, p_guardian: guardianId, p_email: email });
  if (result.error || result.data !== true) throw new Error('Guardian verification unavailable');
  return true;
}
