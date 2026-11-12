'use server';
import { createHash, randomBytes } from 'node:crypto';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { recoveryOrigin } from '@/lib/staff/recovery';

type InvitationState = { message: string; link?: string; id?: string };

export async function manageInvitation(_state: InvitationState, form: FormData): Promise<InvitationState> {
  const failed = { message: 'Invitation could not be changed. Check your access and the invitation details.' };
  try {
    const access = await getStaffAccess('admin');
    if (!access?.context.schoolId || access.context.session.assurance !== 'aal2') return failed;
    const client = await staffClient(true);
    if (form.get('intent') === 'revoke') {
      const id = form.get('id');
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return failed;
      const result = await client.rpc('revoke_staff_invitation', { p_id: id });
      return !result.error && result.data === true ? { message: 'Invitation revoked.' } : failed;
    }
    const email = form.get('email'), name = form.get('name'), role = form.get('role');
    if (typeof email !== 'string' || email.length > 254 || typeof name !== 'string' || name.length > 160 ||
        (role !== 'teacher' && role !== 'accountant')) return failed;
    const origin = recoveryOrigin(process.env.AUTH_APP_ORIGIN, process.env.NODE_ENV === 'production');
    if (!origin) return { message: 'The school application URL must be configured before invitations can be issued.' };
    const token = randomBytes(32).toString('hex');
    const result = await client.rpc('issue_staff_invitation', {
      p_email: email, p_name: name, p_role: role, p_token_hash: createHash('sha256').update(token).digest('hex'),
    });
    if (result.error || typeof result.data !== 'string') return failed;
    return { message: 'Invitation created. Share the link privately with the invited staff member.', link: origin + '/invite#token=' + token, id: result.data };
  } catch { return failed; }
}
