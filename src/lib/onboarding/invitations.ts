import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { staffClient, getStaffAccess } from '../staff/server';
export interface InvitationMailer {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}
/** The caller supplies a configured transport. Step 24C never configures production mail. */
export async function issueAndDeliverInvitation(input: { email: string; name: string; role: 'teacher' | 'accountant' }, mailer: InvitationMailer, origin: string) {
  const url = new URL(origin);
  if (!input.email.endsWith('@example.invalid')) throw new Error('Disposable test recipients only');
  if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.username || url.password) throw new Error('Disposable local invitation delivery only');
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || access.context.session.assurance !== 'aal2') throw new Error('Access denied');
  const token = randomBytes(32).toString('hex');
  const client = await staffClient(true);
  const result = await client.rpc('issue_staff_invitation', { p_email: input.email, p_name: input.name, p_role: input.role, p_token_hash: createHash('sha256').update(token).digest('hex') });
  if (result.error || !result.data) throw new Error('Invitation unavailable');
  try {
    // Fragment avoids putting the bearer token into HTTP request/referrer logs.
    await mailer.send({ to: input.email, subject: 'School staff invitation', text: `Accept your invitation: ${url.origin}/invite#token=${token}` });
  } catch {
    await client.rpc('revoke_staff_invitation', { p_id: result.data });
    throw new Error('Invitation delivery failed; retry through the administrator.');
  }
  return { invitationId: result.data };
}
