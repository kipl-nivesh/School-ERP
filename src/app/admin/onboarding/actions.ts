'use server';
import { staffWorkspaceWritesEnabled } from '@/lib/services/staff-workspace-policy';
import { saveOnboarding, verifyGuardian } from '@/lib/onboarding/database';
import { staffClient, getStaffAccess } from '@/lib/staff/server';
export async function persistOnboarding(step: number, data: unknown) {
  if (!staffWorkspaceWritesEnabled()) return { ok: false, message: "Onboarding changes are unavailable during read-only recovery." };
  try { await saveOnboarding(step, data); return { ok: true, message: 'Saved to the school database.' }; }
  catch { return { ok: false, message: 'Unable to save. Check required records or contact your school administrator.' }; }
}
export async function bindStudentIdentity(form: FormData) {
  if (!staffWorkspaceWritesEnabled()) throw new Error("Identity changes are unavailable during read-only recovery.");
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || access.context.session.assurance !== 'aal2') throw new Error('Access denied');
  const registration = form.get('registration'), email = form.get('email');
  if (typeof registration !== 'string' || registration.length > 128 || typeof email !== 'string' || email.length > 254) throw new Error('Invalid input');
  const result = await (await staffClient(true)).rpc('bind_school_student_identity', { p_registration: registration, p_email: email });
  if (result.error || result.data !== true) throw new Error('Identity binding unavailable');
}
export async function verifyGuardianIdentity(form: FormData) {
  if (!staffWorkspaceWritesEnabled()) throw new Error("Identity changes are unavailable during read-only recovery.");
  const registration = form.get('registration'), guardian = form.get('guardian'), email = form.get('email');
  if (typeof registration !== 'string' || registration.length > 128 || typeof guardian !== 'string' || !/^[0-9a-f-]{36}$/i.test(guardian) || typeof email !== 'string' || email.length > 254) throw new Error('Invalid input');
  await verifyGuardian(registration, guardian, email);
}
