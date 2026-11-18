import 'server-only';
import { isBoundProviderSubject } from '../auth/parent-identity';
import type { ProviderSubject } from '../auth/parent-identity';
import { validAttendanceDate } from '../services/attendance-fields';
import { projectStudentDashboard } from '../student/dashboard-repository';
import type { StudentDashboardProjection } from '../student/dashboard-repository';
import type { ParentDashboardResult } from './dashboard-model';

export type ParentRelationship = {
  id: string;
  guardianId: string;
  schoolId: string;
  studentSchoolId: string;
  studentId: string;
  studentName: string;
  registration: string;
  status: 'verified' | 'pending' | 'revoked';
  studentActive: boolean;
  validFrom: number;
  validUntil: number | null;
  version: number;
  currentVersion: number;
  academicAccess: boolean;
  feeAccess: boolean;
};

export type GuardianRelationshipDecision =
  | { readonly valid: true; readonly academic: boolean; readonly fees: boolean }
  | { readonly valid: false; readonly reason: 'unverified_status' | 'foreign_school' | 'inactive_student' | 'expired' | 'stale_version' | 'no_access_purpose' };

/**
 * Validates active guardian-child relationship for the exact school and child,
 * enforcing separate academic and finance purposes.
 */
export function validateGuardianRelationship(
  link: ParentRelationship,
  activeSchoolId: string,
  now: number,
  permissions: readonly string[],
): GuardianRelationshipDecision {
  if (link.status !== 'verified') return { valid: false, reason: 'unverified_status' };
  if (!link.schoolId || link.schoolId !== activeSchoolId || link.studentSchoolId !== activeSchoolId) {
    return { valid: false, reason: 'foreign_school' };
  }
  if (link.studentActive !== true) return { valid: false, reason: 'inactive_student' };
  if (!Number.isSafeInteger(link.validFrom) || link.validFrom > now ||
      (link.validUntil !== null && (!Number.isSafeInteger(link.validUntil) || link.validUntil <= now))) {
    return { valid: false, reason: 'expired' };
  }
  if (!Number.isSafeInteger(link.version) || link.version <= 0 || link.version !== link.currentVersion) {
    return { valid: false, reason: 'stale_version' };
  }
  const academic = link.academicAccess === true && permissions.includes('children.academics.read');
  const fees = link.feeAccess === true && permissions.includes('children.fees.read');
  if (!academic && !fees) return { valid: false, reason: 'no_access_purpose' };
  return { valid: true, academic, fees };
}

export type VerifiedParentDashboardRequest = {
  role: 'parent';
  provider: ProviderSubject;
  profileId: string;
  sessionId: string;
  expiresAt: number;
  live: boolean;
  profileActive: boolean;
  schoolId: string;
  schoolName: string;
  activeSchoolContext: boolean;
  /** Global Staff membership evidence for this Auth user, including other schools. */
  staffMembership: boolean;
  guardian: { id: string; profileId: string; displayName: string };
  permissions: readonly string[];
  relationships: readonly ParentRelationship[];
};

type ChildScope = Readonly<{
  schoolId: string;
  studentId: string;
  profileId: string;
  sessionId: string;
  relationshipId: string;
  relationshipVersion: number;
  academic: boolean;
  fees: boolean;
}>;
type ParentDashboardRepository = {
  /** Validate the real request session, canonical guardian, effective permissions and complete current link set. */
  verifyRequest(): Promise<VerifiedParentDashboardRequest | null>;
  /** Recheck link, session, context and purposes on the scoped user-session read under RLS. */
  readChild(scope: ChildScope): Promise<(StudentDashboardProjection & { schoolId: string; studentId: string }) | null>;
};

const unavailable = { kind: 'unavailable' } as const;
const validTime = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** No production reader until verified Parent sessions and RLS are available. */
export async function readParentDashboard(): Promise<ParentDashboardResult> {
  return unavailable;
}

export function createParentDashboardReader(repository: ParentDashboardRepository) {
  return async (requestedChild?: unknown): Promise<ParentDashboardResult> => {
    try {
      if (requestedChild !== undefined && (typeof requestedChild !== 'string' || !requestedChild || requestedChild.length > 128)) {
        return unavailable;
      }
      const access = await repository.verifyRequest();
      const now = Date.now();
      if (!access || access.role !== 'parent' || !isBoundProviderSubject(access.provider) || !access.sessionId ||
          !access.profileId || access.live !== true || access.profileActive !== true ||
          !validTime(access.expiresAt) || access.expiresAt <= now || !access.schoolId || !access.schoolName ||
          access.activeSchoolContext !== true || access.staffMembership !== false || !access.permissions.includes('dashboard.parent.view') ||
          !access.guardian.id || !access.guardian.displayName ||
          access.guardian.profileId !== access.profileId) return unavailable;

      const links = access.relationships;
      if (links.some(link => !link.id || link.guardianId !== access.guardian.id || !link.schoolId ||
          link.schoolId !== link.studentSchoolId || !link.studentId || !validTime(link.validFrom) ||
          (link.validUntil !== null && (!validTime(link.validUntil) || link.validUntil <= link.validFrom)))) return unavailable;

      const current = links.filter(link => link.schoolId === access.schoolId && link.status === 'verified' &&
        link.validFrom <= now && (link.validUntil === null || link.validUntil > now));
      if (new Set(links.map(link => link.id)).size !== links.length ||
          new Set(current.map(link => link.studentId)).size !== current.length ||
          current.some(link => !Number.isSafeInteger(link.version) || link.version <= 0 || link.version !== link.currentVersion)) {
        return unavailable;
      }

      const eligible = current.filter(link => link.studentActive === true && !!link.studentName && !!link.registration &&
        ((link.academicAccess === true && access.permissions.includes('children.academics.read')) ||
          (link.feeAccess === true && access.permissions.includes('children.fees.read'))));
      if (!eligible.length) return unavailable;
      const overview = {
        parentName: access.guardian.displayName,
        children: eligible.map(link => ({ id: link.id, name: link.studentName })),
      };
      if (requestedChild === undefined && eligible.length > 1) return { kind: 'choose-child', ...overview };
      const child = requestedChild === undefined ? eligible[0] : eligible.find(link => link.id === requestedChild);
      if (!child) return unavailable;

      const academic = child.academicAccess === true && access.permissions.includes('children.academics.read');
      const fees = child.feeAccess === true && access.permissions.includes('children.fees.read');
      const scope = { schoolId: access.schoolId, studentId: child.studentId, profileId: access.profileId,
        sessionId: access.sessionId, relationshipId: child.id, relationshipVersion: child.version, academic, fees };
      const source = await repository.readChild(scope);
      const observedAt = Date.now();
      if (!source || source.schoolId !== scope.schoolId || source.studentId !== scope.studentId ||
          access.expiresAt <= observedAt || (child.validUntil !== null && child.validUntil <= observedAt) ||
          !validAttendanceDate(source.databaseDate) || (academic && source.enrollments.some(
            row => row.schoolId !== scope.schoolId || row.studentId !== scope.studentId))) return unavailable;

      const data = projectStudentDashboard(scope, {
        displayName: child.studentName, registration: child.registration, schoolName: access.schoolName, status: 'active',
      }, {
        ...source,
        ...(!academic && { enrollments: [], placement: null, attendance: null, timetable: null, homework: null,
          examSchedule: null, results: null, announcements: null }),
        ...(!fees && { invoices: null, receipts: null }),
      }, observedAt, 'parents');

      if (!academic) data.placement = unavailable;
      return { kind: 'ready', ...overview, selectedChild: child.id, data };
    } catch {
      return unavailable;
    }
  };
}
