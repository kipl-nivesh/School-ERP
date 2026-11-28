import 'server-only';

import { revalidatePath } from 'next/cache';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, getStudentAdminAccess, staffClient } from '../staff/server';
import {
  formatSchoolDateDDMMYYYY,
  formatSchoolTime12h,
  getTimezoneOffsetLabel,
  isValidIanaTimezone,
  schoolCalendarDate,
} from '../timezone/school-timezone';
import {
  type AcademicYearSetting,
  type SchoolProfile,
  type SchoolSettingsPage,
  type SecuritySettings,
  type SettingsActionResult,
  type SettingsTab,
} from './school-settings-fields';

export * from './school-settings-fields';

const TIMEZONE_NOTICE =
  'School-local dates, attendance, admission-year IDs, and overdue fee calculations are evaluated using the school’s verified IANA timezone. Actual event timestamps remain stored in UTC.';

const ACADEMIC_NOTICE =
  'Academic Year Lifecycle Notice: Academic years can be provisioned in the Academic Management workspace. Year rollover, activation toggles, and deletion procedures are disabled to prevent orphan records across enrollments, fees, and marks.';

interface SchoolRow {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'suspended' | 'onboarding';
  timezone: string | null;
  timezone_verified: boolean;
  timezone_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AcademicYearRow {
  school_id: string;
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
}

interface SchoolSettingsRow {
  school_id: string;
  display_name: string | null;
}

export async function readSchoolSettingsWorkspace(tab: SettingsTab = 'profile'): Promise<SchoolSettingsPage> {
  const access = await getStaffAccess('admin');
  const schoolId = access?.context.schoolId;
  if (!access || !schoolId) {
    return { kind: 'denied', reason: 'Active school administration session required.' };
  }

  const allowed = (permission: string) => evaluatePermission(access.context, permission, Date.now()).allowed;
  const canReadSettings = allowed('school.settings.read');
  if (!canReadSettings) {
    return { kind: 'denied', reason: 'You do not have permission to view school settings.' };
  }

  const canWriteSettings =
    allowed('school.settings.write') && access.context.session.assurance === 'aal2';

  try {
    const client = await staffClient();
    const [schoolRes, settingsRes, yearsRes] = await Promise.all([
      client
        .from('schools')
        .select('id,code,name,status,timezone,timezone_verified,timezone_verified_at,created_at,updated_at')
        .eq('id', schoolId)
        .maybeSingle<SchoolRow>(),
      client.from('school_settings').select('school_id,display_name').eq('school_id', schoolId).maybeSingle<SchoolSettingsRow>(),
      client.from('academic_years').select('school_id,id,label,starts_on,ends_on').eq('school_id', schoolId).order('starts_on', { ascending: false }).overrideTypes<AcademicYearRow[], { merge: false }>(),
    ]);

    if (schoolRes.error || schoolRes.data?.id !== schoolId || settingsRes.error || yearsRes.error ||
      (settingsRes.data && settingsRes.data.school_id !== schoolId) ||
      yearsRes.data?.some(year => year.school_id !== schoolId)) {
      return { kind: 'error', message: 'Unable to retrieve school profile information.' };
    }

    const schoolData = schoolRes.data;
    const settingsData = settingsRes.data;
    const yearsData = yearsRes.data ?? [];
    const now = new Date();
    const verifiedTz =
      schoolData.timezone_verified && isValidIanaTimezone(schoolData.timezone)
        ? schoolData.timezone
        : null;
    const today = schoolCalendarDate(now, verifiedTz) ?? now.toISOString().slice(0, 10);

    const profile: SchoolProfile = {
      id: schoolData.id,
      code: schoolData.code,
      name: schoolData.name,
      displayName: settingsData?.display_name || schoolData.name,
      status: schoolData.status,
      timezone: schoolData.timezone,
      timezoneVerified: Boolean(verifiedTz),
      timezoneVerifiedAt: schoolData.timezone_verified_at,
      schoolLocalDate: verifiedTz ? formatSchoolDateDDMMYYYY(now, verifiedTz) : null,
      schoolLocalTime: verifiedTz ? formatSchoolTime12h(now, verifiedTz) : null,
      timezoneOffsetLabel: verifiedTz ? getTimezoneOffsetLabel(now, verifiedTz) : 'Unverified',
      createdAt: schoolData.created_at,
      updatedAt: schoolData.updated_at,
    };

    const academicYears: AcademicYearSetting[] = yearsData.map(y => ({
      id: y.id,
      label: y.label,
      startsOn: y.starts_on,
      endsOn: y.ends_on,
      isCurrent: y.starts_on <= today && today <= y.ends_on,
    }));

    const activeAssignment = access.context.assignments.find(a => a.id === access.context.activeRole.assignmentId);
    const permissions = activeAssignment?.permissions ?? [];

    const security: SecuritySettings = {
      role: access.role,
      schoolId: access.context.schoolId,
      schoolCode: schoolData.code,
      permissions,
      hasRecentPassword: false,
      assuranceLevel: access.context.session.assurance,
      sessionExpiresAt: access.context.session.expiresAt,
    };

    return {
      kind: 'ready',
      profile,
      academicYears,
      security,
      activeTab: tab,
      canWriteSettings,
      timezoneNotice: TIMEZONE_NOTICE,
      academicNotice: ACADEMIC_NOTICE,
    };
  } catch {
    return { kind: 'error', message: 'An unexpected error occurred while loading school configuration.' };
  }
}

export async function updateSchoolProfileName(form: FormData): Promise<SettingsActionResult> {
  void form;
  return { ok: false, message: 'School settings changes are unavailable during read-only recovery.' };
}

export async function updateSchoolTimezone(form: FormData): Promise<SettingsActionResult> {
  const access = await getStudentAdminAccess();
  const schoolId = access?.context.schoolId;
  if (
    !access ||
    access.role !== 'admin' ||
    !schoolId ||
    !evaluatePermission(access.context, 'school.settings.write', Date.now()).allowed
  ) {
    return { ok: false, message: 'Fresh Admin MFA and school.settings.write permission are required.' };
  }

  const client = await staffClient();
  const claims = await client.auth.getClaims();
  if (claims.error || (claims.data?.claims as { aal?: string } | undefined)?.aal !== 'aal2') {
    return { ok: false, message: 'Fresh Admin MFA (AAL2) is required to update the school timezone.' };
  }

  const timezone = form.get('timezone')?.toString().trim() ?? '';
  const verify = form.get('verify') !== 'false';
  if (!isValidIanaTimezone(timezone)) {
    return { ok: false, message: 'Enter a valid IANA timezone identifier (for example, Asia/Kolkata).' };
  }

  const res = await client.rpc('admin_update_school_timezone', {
    p_timezone: timezone,
    p_verify: verify,
  });
  const data = res.data as { ok?: boolean; reason?: string; timezone?: string; verified?: boolean } | null;
  if (res.error || !data?.ok) {
    return {
      ok: false,
      message:
        data?.reason === 'invalid_timezone'
          ? 'The selected timezone is not a supported IANA timezone.'
          : 'Unable to update school timezone.',
    };
  }

  revalidatePath('/staff/admin');
  revalidatePath('/staff/accountant');
  return {
    ok: true,
    message: `School timezone updated to ${data.timezone} (${data.verified ? 'verified' : 'unverified'}).`,
  };
}
