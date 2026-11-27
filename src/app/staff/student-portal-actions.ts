'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '@/lib/auth/authorization';
import { isSixDigitPinFormat } from '@/lib/auth/input-contracts';
import { hashPin } from '@/lib/auth/pin-service';
import { accountantExportAuthentication } from '@/lib/staff/accountant-export-mfa';
import { isStaffUuid } from '@/lib/staff/contracts';
import { recoveryOrigin } from '@/lib/staff/recovery';
import { getStudentAdminAccess, staffClient } from '@/lib/staff/server';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';

export type StudentPortalActionState = {
  ok: boolean;
  message: string;
  phase?:
    | 'idle'
    | 'reauth_required'
    | 'mfa_challenge'
    | 'invited'
    | 'pending_verification'
    | 'linked'
    | 'activated'
    | 'reset'
    | 'suspended'
    | 'initialized'
    | 'error';
  linkedEmail?: string;
  emailConfirmed?: boolean;
  passwordRequired?: boolean;
  factorId?: string;
};

const operations = {
  link: 'security.accounts.create',
  provision: 'security.accounts.create',
  activate: 'security.accounts.create',
  initialize: 'security.accounts.create',
  reset: 'security.credentials.reset',
  suspend: 'security.accounts.suspend',
} as const;

type IdentityInspection = {
  authorized?: boolean;
  student_found?: boolean;
  mfa_fresh?: boolean;
  enrollment_status?: string;
  portal_access_status?: string;
  identity_linked?: boolean;
  linked_email?: string | null;
  linked_email_confirmed?: boolean;
  candidate_status?: string | null;
};

const candidateErrors: Record<string, { message: string }> = {
  invalid_email: { message: 'Enter a valid student email address.' },
  inactive_enrollment: { message: 'Student must have an active enrollment before portal access can be provisioned.' },
  student_not_pending: { message: 'This student already has a linked identity or is no longer pending activation.' },
  conflict_staff: { message: 'This email belongs to a staff account and cannot be linked to a student.' },
  conflict_guardian: { message: 'This email belongs to a guardian account and cannot be linked to a student.' },
  conflict_student: { message: 'This email is already linked to another student.' },
  conflict_other_role: { message: 'This account already holds another school role and cannot be linked to a student.' },
  unavailable: { message: 'This email account is unavailable or restricted for student portal linking.' },
  inactive_profile: { message: 'This user profile is inactive or requires a credential reset before linking.' },
  rate_limited: { message: 'Invitation rate limit reached (max 3 per student per hour). Please wait before sending another email.' },
};

export async function inspectStudentPortalAction(student: string): Promise<IdentityInspection | null> {
  if (!isStaffUuid(student)) return null;
  try {
    const access = await getStudentAdminAccess();
    if (!access || !evaluatePermission(access.context, 'students.read', Date.now()).allowed) return null;
    const client = await staffClient();
    const res = await client.rpc('inspect_student_identity_status', { p_student: student, p_email: null });
    if (res.error || !res.data) return null;
    return res.data as IdentityInspection;
  } catch {
    return null;
  }
}

async function ensureFreshAdminMfa(
  client: Awaited<ReturnType<typeof staffClient>>,
  form: FormData,
): Promise<{ fresh: true } | { fresh: false; state: StudentPortalActionState }> {
  const claims = await client.auth.getClaims();
  const jwt = claims.data?.claims;
  if (claims.error || !jwt) {
    return {
      fresh: false,
      state: {
        ok: false,
        phase: 'reauth_required',
        passwordRequired: true,
        message: 'Session verification failed. Sign in again to continue.',
      },
    };
  }
  const amr = Array.isArray(jwt.amr) ? jwt.amr : [];
  const authTimes = accountantExportAuthentication(amr, Date.now());
  if (authTimes.passwordAt === null) {
    return {
      fresh: false,
      state: {
        ok: false,
        phase: 'reauth_required',
        passwordRequired: true,
        message:
          'For security, student identity linking and credential changes require a recent sign-in (within 10 minutes). Sign in again with your password and authenticator.',
      },
    };
  }
  if (authTimes.freshMfa) {
    return { fresh: true };
  }

  const factors = await client.auth.mfa.listFactors();
  const verified = factors.data?.totp.filter(factor => factor.status === 'verified') ?? [];
  if (factors.error || !verified.length) {
    return {
      fresh: false,
      state: {
        ok: false,
        phase: 'reauth_required',
        passwordRequired: true,
        message: 'Verified authenticator factor unavailable. Sign in again to continue.',
      },
    };
  }

  const factorId = form.get('factorId');
  const mfaCode = form.get('mfaCode');
  if (!isStaffUuid(factorId) || !verified.some(f => f.id === factorId)) {
    return {
      fresh: false,
      state: {
        ok: false,
        phase: 'mfa_challenge',
        factorId: verified[0].id,
        message: 'Enter your 6-digit authenticator code to confirm this sensitive student portal action.',
      },
    };
  }

  if (typeof mfaCode !== 'string' || !/^\d{6}$/.test(mfaCode)) {
    return {
      fresh: false,
      state: {
        ok: false,
        phase: 'mfa_challenge',
        factorId,
        message: 'Enter a valid 6-digit authenticator code.',
      },
    };
  }

  const verification = await client.auth.mfa.challengeAndVerify({ factorId, code: mfaCode });
  if (verification.error) {
    return {
      fresh: false,
      state: {
        ok: false,
        phase: 'mfa_challenge',
        factorId,
        message: 'Authenticator code verification failed. Try the current code from your authenticator app.',
      },
    };
  }

  return { fresh: true };
}

export async function manageStudentPortal(
  _previous: StudentPortalActionState,
  form: FormData,
): Promise<StudentPortalActionState> {
  const denied: StudentPortalActionState = {
    ok: false,
    phase: 'error',
    message: 'The change could not be confirmed. Verify your Admin authenticator (MFA) session and permissions.',
  };
  const student = form.get('student');
  const intent = form.get('intent');
  if (!isStaffUuid(student) || typeof intent !== 'string' || !Object.hasOwn(operations, intent)) return denied;

  const permission = operations[intent as keyof typeof operations];
  const access = await getStudentAdminAccess();
  if (!access || !evaluatePermission(access.context, permission, Date.now()).allowed) return denied;

  const client = await staffClient(true);

  if (intent !== 'initialize') {
    const freshCheck = await ensureFreshAdminMfa(client, form);
    if (!freshCheck.fresh) return freshCheck.state;
  }

  if (intent === 'link' || intent === 'provision') {
    const emailInput = form.get('email');
    const resend = form.get('resend') === 'true';
    if (
      !evaluatePermission(access.context, 'admissions.write', Date.now()).allowed ||
      typeof emailInput !== 'string' ||
      emailInput.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())
    ) {
      return { ok: false, phase: 'error', message: 'Enter a valid student email address.' };
    }
    const email = emailInput.trim().toLowerCase();

    try {
      const inspectionRes = await client.rpc('inspect_student_identity_status', {
        p_student: student,
        p_email: email,
      });
      if (inspectionRes.error || !inspectionRes.data) return denied;
      const inspection = inspectionRes.data as IdentityInspection;
      if (!inspection.authorized) return denied;
      if (!inspection.student_found) {
        return { ok: false, phase: 'error', message: 'Student record could not be found in this school.' };
      }

      const status = inspection.candidate_status;
      if (status && Object.hasOwn(candidateErrors, status)) {
        return { ok: false, phase: 'error', message: candidateErrors[status].message };
      }

      if (status === 'ready_to_link') {
        const linked = await client.rpc('link_pending_student_identity', { p_student: student, p_email: email });
        if (linked.error || linked.data !== true) return denied;
        revalidatePath('/staff/[role]', 'page');
        return {
          ok: true,
          phase: 'linked',
          linkedEmail: email,
          emailConfirmed: true,
          message: 'Verified student identity linked. Set a six-digit PIN below to activate portal access.',
        };
      }

      if (status === 'not_found' || (status === 'unconfirmed' && resend)) {
        const config = getSupabasePublicConfiguration();
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!config.configured || !serviceKey) {
          return {
            ok: false,
            phase: 'error',
            message: 'Student invitation service is not configured. Contact support.',
          };
        }
        const origin = recoveryOrigin(process.env.AUTH_APP_ORIGIN, process.env.NODE_ENV === 'production');
        const serviceAdmin = createClient(config.url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const invited = await serviceAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: origin ? `${origin}/login/student` : undefined,
          data: { portal_role: 'student', student_id: student },
        });
        if (invited.error) {
          await client.rpc('record_student_identity_invitation', { p_student: student, p_email: email, p_status: 'failed' });
          const isRateLimit = invited.error.status === 429 || invited.error.code === 'over_email_send_rate_limit';
          return {
            ok: false,
            phase: 'error',
            message: isRateLimit
              ? 'Email sending rate limit reached. Please wait a few minutes and try again.'
              : 'Unable to send the verification email. Verify email delivery configuration and try again.',
          };
        }
        const recorded = await client.rpc('record_student_identity_invitation', { p_student: student, p_email: email, p_status: 'sent' });
        if (recorded.error || recorded.data !== true) {
          return {
            ok: false,
            phase: 'error',
            message: 'Invitation audit logging failed or rate limit reached.',
          };
        }
        revalidatePath('/staff/[role]', 'page');
        return {
          ok: true,
          phase: status === 'unconfirmed' ? 'pending_verification' : 'invited',
          linkedEmail: email,
          emailConfirmed: false,
          message:
            status === 'unconfirmed'
              ? `Verification email re-sent to ${email}. Once the student confirms their email, click "Check & Link Verified Identity".`
              : `Verification email sent to ${email}. Once the student confirms their email, click "Check & Link Verified Identity".`,
        };
      }

      if (status === 'unconfirmed') {
        return {
          ok: false,
          phase: 'pending_verification',
          linkedEmail: email,
          emailConfirmed: false,
          message: `Verification email was sent to ${email}, but the address is not confirmed yet. Ask the student to confirm their inbox link, or resend verification.`,
        };
      }

      return denied;
    } catch {
      return denied;
    }
  }

  if (intent === 'initialize') {
    if (!evaluatePermission(access.context, 'admissions.write', Date.now()).allowed) return denied;
    try {
      const activated = await client.rpc('activate_school_student', { p_student: student });
      if (activated.error || activated.data?.student_id !== student) {
        return {
          ok: false,
          phase: 'error',
          message: 'Entitlement initialization failed. Ensure the student has an active enrollment and verified linked identity.',
        };
      }
      revalidatePath('/staff/[role]', 'page');
      return {
        ok: true,
        phase: 'initialized',
        message: 'Student portal entitlement initialized. Existing trial dates were preserved.',
      };
    } catch {
      return denied;
    }
  }

  const pin = form.get('pin');
  if (
    intent !== 'suspend' &&
    (typeof pin !== 'string' || !isSixDigitPinFormat(pin) || (process.env.AUTH_PIN_PEPPER?.length ?? 0) < 32)
  ) {
    return {
      ok: false,
      phase: 'error',
      message: 'Enter a valid six-digit PIN (digits only). Contact support if the credential service is unavailable.',
    };
  }

  try {
    const credential = intent !== 'suspend' && typeof pin === 'string' ? await hashPin(pin) : null;
    const result = await client.rpc('manage_student_portal_pin', {
      p_student: student,
      p_intent: intent,
      p_hash: credential?.hash ?? null,
      p_salt: credential?.salt ?? null,
    });
    if (result.error || result.data !== true) {
      return {
        ok: false,
        phase: 'error',
        message:
          intent === 'activate'
            ? 'Activation failed. Ensure a verified student identity is linked, enrollment is active, and your MFA session is fresh.'
            : 'Portal update failed. Verify the student portal status and your fresh Admin MFA session.',
      };
    }
    revalidatePath('/staff/[role]', 'page');
    const phase = intent === 'activate' ? 'activated' : intent === 'reset' ? 'reset' : 'suspended';
    const message =
      intent === 'activate'
        ? 'Student portal activated and six-digit PIN saved.'
        : intent === 'reset'
          ? 'Student PIN updated. Previous student sessions have been revoked.'
          : 'Student portal access suspended and active sessions revoked.';
    return { ok: true, phase, message };
  } catch {
    return denied;
  }
}
