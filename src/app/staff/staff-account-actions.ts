'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { recoveryOrigin } from '@/lib/staff/recovery';
import { isStaffUuid } from '@/lib/staff/contracts';
import { STAFF_ACCOUNT_PERMISSIONS, staffAccountDetails, staffAccountEmail, staffAccountPermission } from '@/lib/staff/account-contracts';
import type { StaffAccountState } from '@/lib/staff/account-contracts';

const denied = { ok: false, message: 'The change was not confirmed. Check your school access and permissions, then sign in with your authenticator again if needed.' };
const invalid = { ok: false, message: 'Check the required staff details and try again.' };

export async function manageStaffAccount(_previous: StaffAccountState, form: FormData): Promise<StaffAccountState> {
  const intent = form.get('intent');
  if (typeof intent !== 'string' || !Object.hasOwn(STAFF_ACCOUNT_PERMISSIONS, intent) || form.getAll('intent').length !== 1) return invalid;
  const operation = intent as keyof typeof STAFF_ACCOUNT_PERMISSIONS;
  const details = operation === 'invite' || operation === 'edit' ? staffAccountDetails(form) : null;
  if ((operation === 'invite' || operation === 'edit') && !details) return invalid;

  try {
    const admin = await getStaffAccess('admin');
    if (!admin || !staffAccountPermission(admin.context, STAFF_ACCOUNT_PERMISSIONS[operation])) return denied;
    const client = await staffClient(true);
    const origin = recoveryOrigin(process.env.AUTH_APP_ORIGIN, process.env.NODE_ENV === 'production');
    if (operation === 'invite') {
      const email = staffAccountEmail(form.get('email')), role = form.get('role'), active = form.get('active');
      if (!details || !email || (role !== 'teacher' && role !== 'accountant') || (active !== 'true' && active !== 'false') ||
        ['email', 'role', 'active'].some(key => form.getAll(key).length !== 1)) return invalid;
      if (!origin) return { ok: false, message: 'The school application URL must be configured before issuing invitations.' };
      const token = randomBytes(32).toString('hex');
      const issued = await client.rpc('issue_managed_staff_invitation', {
        ...details, p_email: email, p_role: role, p_active: active === 'true',
        p_token_hash: createHash('sha256').update(token).digest('hex'),
      });
      if (issued.error?.code === '23505') return { ok: false, message: 'An account or pending invitation already uses that email or employee ID.' };
      if (issued.error || typeof issued.data !== 'string') return denied;
      return { ok: true, message: 'Invitation created. Send this private link to the staff member’s verified email address.', link: origin + '/invite#token=' + token };
    }

    const membership = form.get('membership');
    if (!isStaffUuid(membership) || form.getAll('membership').length !== 1) return invalid;
    if (operation === 'reset' && !origin) return { ok: false, message: 'The school application URL must be configured before sharing recovery links.' };
    const result = await client.rpc('manage_school_staff', { p_membership: membership, p_intent: operation, ...details });
    if (result.error?.code === '23505') return { ok: false, message: 'That employee ID is already assigned or reserved.' };
    if (result.error || result.data !== true) return denied;
    if (operation === 'reset') return { ok: true, message: 'Share this recovery page with the staff member. They request a private reset email in their own browser.', link: origin + '/login/staff/recover' };
    revalidatePath('/staff/[role]', 'page');
    revalidatePath('/admin/dashboard');
    return { ok: true, message: operation === 'edit' ? 'Staff details saved.' : operation === 'activate' ? 'School access activated.' : 'School access deactivated.' };
  } catch {
    return denied;
  }
}
