'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getStudentAdminAccess, staffClient } from '@/lib/staff/server';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';

export type ParentAdminActionState = {
  ok: boolean;
  message: string;
};

export type AdminParentChildItem = {
  relationship_id: string;
  student_id: string;
  student_name: string;
  registration_number: string;
  relationship_status: 'verified' | 'pending' | 'revoked';
  academic_access: boolean;
  fee_access: boolean;
  relationship_version: number;
};

export type AdminParentAccountItem = {
  guardian_id: string;
  profile_id: string | null;
  display_name: string;
  email: string | null;
  email_confirmed: boolean;
  account_status: string;
  membership_status: string;
  children: AdminParentChildItem[];
};

const reasonMessages: Record<string, string> = {
  unauthorized: 'Admin MFA session and account provisioning permissions are required.',
  inactive_student: 'The selected student must have an active enrollment.',
  invalid_name: 'Enter a guardian name between 2 and 160 characters.',
  invalid_email: 'Enter a valid guardian email address.',
  account_not_found: 'No verified guardian account exists for this email yet.',
  unavailable: 'This email account is unavailable or restricted.',
  role_conflict: 'This email belongs to a Staff or Student account and cannot be linked as a Parent.',
  email_unconfirmed: 'The guardian must confirm their invitation email before their account can be linked.',
  not_found: 'The requested guardian or relationship record could not be found.',
  invalid_status: 'Invalid relationship or account status.',
};

async function requireAdminMfa(permission: string) {
  const access = await getStudentAdminAccess();
  if (!access || access.role !== 'admin' || !access.context.schoolId) {
    return null;
  }
  if (!evaluatePermission(access.context, permission, Date.now()).allowed) {
    return null;
  }
  const client = await staffClient();
  const claims = await client.auth.getClaims();
  if (claims.error || (claims.data?.claims as { aal?: string } | undefined)?.aal !== 'aal2') {
    return null;
  }
  return { access, client };
}

export async function inviteOrLinkParentAction(
  _prev: ParentAdminActionState,
  form: FormData,
): Promise<ParentAdminActionState> {
  const studentId = form.get('studentId')?.toString().trim() ?? '';
  const guardianName = form.get('guardianName')?.toString().trim() ?? '';
  const email = form.get('email')?.toString().trim().toLowerCase() ?? '';
  const academicAccess = form.get('academicAccess') === 'on';
  const feeAccess = form.get('feeAccess') === 'on';

  if (!isStaffUuid(studentId)) {
    return { ok: false, message: 'Select a valid active student.' };
  }
  if (guardianName.length < 2 || guardianName.length > 160) {
    return { ok: false, message: reasonMessages.invalid_name };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: reasonMessages.invalid_email };
  }
  if (!academicAccess && !feeAccess) {
    return { ok: false, message: 'Grant at least one access purpose (Academic or Fee).' };
  }

  const admin = await requireAdminMfa('security.accounts.create');
  if (!admin || !evaluatePermission(admin.access.context, 'admissions.write', Date.now()).allowed) {
    return { ok: false, message: reasonMessages.unauthorized };
  }

  const inspectRes = await admin.client.rpc('inspect_parent_candidate_email', { p_email: email });
  const inspectData = inspectRes.data as { authorized?: boolean; status?: string } | null;
  if (inspectRes.error || !inspectData?.authorized) {
    return { ok: false, message: reasonMessages.unauthorized };
  }

  if (inspectData.status === 'conflict_other_role' || inspectData.status === 'conflict_student') {
    return { ok: false, message: reasonMessages.role_conflict };
  }
  if (inspectData.status === 'unavailable' || inspectData.status === 'inactive_profile') {
    return { ok: false, message: reasonMessages.unavailable };
  }
  if (inspectData.status === 'unconfirmed') {
    return { ok: false, message: 'Invitation already sent; waiting for the guardian to confirm their email before linking.' };
  }

  if (inspectData.status === 'not_found') {
    const config = getSupabasePublicConfiguration();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!config.configured || !serviceKey) {
      return { ok: false, message: 'Parent invitation service is not configured.' };
    }
    const serviceClient = createClient(config.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: inviteErr } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { role: 'parent', full_name: guardianName },
    });
    if (inviteErr) {
      return { ok: false, message: 'Unable to send parent invitation email. Verify the email address and try again.' };
    }
    revalidatePath('/staff/admin');
    return {
      ok: true,
      message: `Invitation dispatched to ${email}. Once the guardian confirms their email, click Link Guardian to activate child access.`,
    };
  }

  const linkRes = await admin.client.rpc('admin_provision_parent_link', {
    p_student: studentId,
    p_guardian_name: guardianName,
    p_email: email,
    p_academic_access: academicAccess,
    p_fee_access: feeAccess,
  });
  const linkData = linkRes.data as { ok?: boolean; reason?: string } | null;
  if (linkRes.error || !linkData?.ok) {
    return { ok: false, message: reasonMessages[linkData?.reason ?? ''] ?? 'Unable to link guardian account.' };
  }

  revalidatePath('/staff/admin');
  return {
    ok: true,
    message: `Verified guardian ${guardianName} (${email}) linked successfully.`,
  };
}

export async function updateParentRelationshipAction(
  _prev: ParentAdminActionState,
  form: FormData,
): Promise<ParentAdminActionState> {
  const relationshipId = form.get('relationshipId')?.toString().trim() ?? '';
  const status = form.get('status')?.toString().trim() ?? '';
  const academicAccess = form.get('academicAccess') === 'on';
  const feeAccess = form.get('feeAccess') === 'on';

  if (!isStaffUuid(relationshipId)) {
    return { ok: false, message: 'Invalid relationship identifier.' };
  }
  const admin = await requireAdminMfa('security.accounts.update');
  if (!admin || !evaluatePermission(admin.access.context, 'admissions.write', Date.now()).allowed) {
    return { ok: false, message: reasonMessages.unauthorized };
  }

  const res = await admin.client.rpc('admin_update_guardian_relationship', {
    p_relationship: relationshipId,
    p_status: status,
    p_academic_access: academicAccess,
    p_fee_access: feeAccess,
  });
  const data = res.data as { ok?: boolean; reason?: string } | null;
  if (res.error || !data?.ok) {
    return { ok: false, message: reasonMessages[data?.reason ?? ''] ?? 'Unable to update relationship.' };
  }

  revalidatePath('/staff/admin');
  return { ok: true, message: 'Guardian relationship updated.' };
}

export async function setParentAccountStatusAction(
  _prev: ParentAdminActionState,
  form: FormData,
): Promise<ParentAdminActionState> {
  const profileId = form.get('profileId')?.toString().trim() ?? '';
  const status = form.get('status')?.toString().trim() ?? '';

  if (!isStaffUuid(profileId) || (status !== 'active' && status !== 'suspended')) {
    return { ok: false, message: 'Invalid parent account request.' };
  }
  const perm = status === 'suspended' ? 'security.accounts.suspend' : 'security.accounts.update';
  const admin = await requireAdminMfa(perm);
  if (!admin) {
    return { ok: false, message: reasonMessages.unauthorized };
  }

  const res = await admin.client.rpc('admin_set_parent_account_status', {
    p_profile: profileId,
    p_status: status,
  });
  const data = res.data as { ok?: boolean; reason?: string } | null;
  if (res.error || !data?.ok) {
    return { ok: false, message: reasonMessages[data?.reason ?? ''] ?? 'Unable to update parent account status.' };
  }

  revalidatePath('/staff/admin');
  return {
    ok: true,
    message: status === 'suspended'
      ? 'Parent access suspended and active sessions revoked.'
      : 'Parent access reactivated.',
  };
}
