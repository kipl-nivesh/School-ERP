'use server';

import { evaluatePermission } from '@/lib/auth/authorization';
import { isSixDigitPinFormat } from '@/lib/auth/input-contracts';
import { hashPin } from '@/lib/auth/pin-service';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getStudentAdminAccess, staffClient } from '@/lib/staff/server';

const operations = {
  link: 'security.accounts.create',
  activate: 'security.accounts.create',
  initialize: 'security.accounts.create',
  reset: 'security.credentials.reset',
  suspend: 'security.accounts.suspend',
} as const;

export async function manageStudentPortal(_previous: { ok: boolean; message: string }, form: FormData) {
  const denied = { ok: false, message: 'The change could not be confirmed. Check the Student’s enrollment, account linkage and portal status.' };
  const student = form.get('student');
  const intent = form.get('intent');
  if (!isStaffUuid(student) || typeof intent !== 'string' || !Object.hasOwn(operations, intent)) return denied;
  const permission = operations[intent as keyof typeof operations];
  const access = await getStudentAdminAccess();
  if (!access || !evaluatePermission(access.context, permission, Date.now()).allowed) return denied;
  if (intent === 'link') {
    const email = form.get('email');
    if (!evaluatePermission(access.context, 'admissions.write', Date.now()).allowed ||
        typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email.trim())) return denied;
    try {
      const client = await staffClient();
      const linked = await client.rpc('link_pending_student_identity', { p_student: student, p_email: email.trim() });
      if (linked.error || linked.data !== true) return denied;
      return { ok: true, message: 'Verified identity linked. Refresh the Student record to set a PIN.' };
    } catch {
      return denied;
    }
  }
  if (intent === 'initialize') {
    if (!evaluatePermission(access.context, 'admissions.write', Date.now()).allowed) return denied;
    try {
      const client = await staffClient();
      const activated = await client.rpc('activate_school_student', { p_student: student });
      if (activated.error || activated.data?.student_id !== student) return denied;
      return { ok: true, message: 'Student portal entitlement initialized. Existing trial dates were preserved.' };
    } catch {
      return denied;
    }
  }
  const pin = form.get('pin');
  if (intent !== 'suspend' && (typeof pin !== 'string' || !isSixDigitPinFormat(pin) ||
      (process.env.AUTH_PIN_PEPPER?.length ?? 0) < 32)) {
    return { ok: false, message: 'Enter a new six-digit PIN. Contact support if the credential service is unavailable.' };
  }
  try {
    const client = await staffClient();
    const credential = intent !== 'suspend' && typeof pin === 'string' ? await hashPin(pin) : null;
    const result = await client.rpc('manage_student_portal_pin', {
      p_student: student, p_intent: intent, p_hash: credential?.hash ?? null, p_salt: credential?.salt ?? null,
    });
    if (result.error || result.data !== true) return denied;
    return { ok: true, message: 'Student portal access updated. Previous Student sessions have been revoked.' };
  } catch {
    return denied;
  }
}
