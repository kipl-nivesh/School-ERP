import 'server-only';

import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
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
  'Timezone & Regional Notice: The database currently records and evaluates attendance and date records using the database server date (current_date, UTC). School-specific timezone configuration is not currently supported in the database schema. Future backend migrations must add a verified IANA timezone column (e.g. timezone text default \'Asia/Kolkata\') to public.schools and update date-deriving RPCs to use (now() at time zone s.timezone)::date.';

const ACADEMIC_NOTICE =
  'Academic Year Lifecycle Notice: New academic year provisioning is managed through onboarding. Year rollover, activation toggles, and deletion procedures are disabled to prevent orphan records across enrollments, fees, and marks.';

interface SchoolRow {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'suspended' | 'onboarding';
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

  const canWriteSettings = false;

  try {
    const client = await staffClient();
    const [schoolRes, settingsRes, yearsRes] = await Promise.all([
      client.from('schools').select('id,code,name,status,created_at,updated_at').eq('id', schoolId).maybeSingle<SchoolRow>(),
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
    const today = new Date().toISOString().slice(0, 10);

    const profile: SchoolProfile = {
      id: schoolData.id,
      code: schoolData.code,
      name: schoolData.name,
      displayName: settingsData?.display_name || schoolData.name,
      status: schoolData.status,
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
