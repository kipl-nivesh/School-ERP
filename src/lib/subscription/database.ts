import 'server-only';
import { staffClient } from '../staff/server';
export async function getPersistedSubscriptionAccess(studentId: string) {
  const { data, error } = await (await staffClient()).rpc('get_student_subscription_access', { p_student_id: studentId });
  if (error || !data?.length) throw new Error('Subscription access unavailable');
  return data[0];
}
export async function activatePersistedStudent(studentId: string) {
  const { data, error } = await (await staffClient(true)).rpc('activate_school_student', { p_student: studentId });
  if (error || !data) throw new Error('Activation denied');
  return data;
}
// No application payment-success or extension endpoint: only future verified settlement
// processing may invoke the existing immutable/idempotent database extension transaction.
