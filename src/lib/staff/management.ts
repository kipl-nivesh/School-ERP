/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — STAFF MANAGEMENT SERVICE
 * Step 23 / Phase 6: Multi-School Staff Management
 * =============================================================================
 */

export interface SchoolStaffMember {
  profileId: string;
  schoolId: string;
  displayName: string;
  email: string;
  roleCode: 'teacher' | 'accountant';
  status: 'active' | 'suspended' | 'revoked';
  assignedSections: Array<{
    assignmentId: string;
    sectionId: string;
    className: string;
    sectionName: string;
    subjectCode?: string;
  }>;
  createdAt: string;
}

const staffStore = new Map<string, SchoolStaffMember>();
const teacherAssignmentsStore = new Map<string, {
  id: string;
  schoolId: string;
  teacherProfileId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectCode?: string;
}>();

/**
 * List all authorized staff members for a specific school.
 * Enforces verified school boundaries.
 */
export async function listSchoolStaff(schoolId: string): Promise<SchoolStaffMember[]> {
  if (!schoolId) {
    throw new Error('schoolId is required to list school staff.');
  }

  const results: SchoolStaffMember[] = [];
  for (const member of staffStore.values()) {
    if (member.schoolId === schoolId) {
      // populate assigned sections
      const assignments = Array.from(teacherAssignmentsStore.values())
        .filter(a => a.schoolId === schoolId && a.teacherProfileId === member.profileId)
        .map(a => ({
          assignmentId: a.id,
          sectionId: a.sectionId,
          className: a.className,
          sectionName: a.sectionName,
          subjectCode: a.subjectCode,
        }));

      results.push({
        ...member,
        assignedSections: assignments,
      });
    }
  }

  return results;
}

/**
 * Register or update staff profile for a school.
 */
export async function registerStaffMember(
  schoolId: string,
  profileId: string,
  displayName: string,
  email: string,
  roleCode: 'teacher' | 'accountant'
): Promise<SchoolStaffMember> {
  const key = `${schoolId}:${profileId}:${roleCode}`;
  const now = new Date().toISOString();

  const member: SchoolStaffMember = {
    profileId,
    schoolId,
    displayName,
    email: email.toLowerCase(),
    roleCode,
    status: 'active',
    assignedSections: [],
    createdAt: now,
  };

  staffStore.set(key, member);
  return member;
}

/**
 * Update staff membership status (e.g. suspend or reactivate).
 * Suspended staff fail closed immediately at authentication boundary.
 */
export async function updateStaffMembershipStatus(
  schoolId: string,
  profileId: string,
  roleCode: 'teacher' | 'accountant',
  newStatus: 'active' | 'suspended' | 'revoked'
): Promise<SchoolStaffMember> {
  const key = `${schoolId}:${profileId}:${roleCode}`;
  const member = staffStore.get(key);

  if (!member || member.schoolId !== schoolId) {
    throw new Error(`Staff member "${profileId}" not found in school "${schoolId}".`);
  }

  member.status = newStatus;
  staffStore.set(key, member);
  return member;
}

/**
 * Assign a teacher to a section and subject.
 */
export async function assignTeacherToSection(
  schoolId: string,
  teacherProfileId: string,
  sectionId: string,
  className: string,
  sectionName: string,
  subjectCode?: string
): Promise<{ assignmentId: string }> {
  const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  teacherAssignmentsStore.set(assignmentId, {
    id: assignmentId,
    schoolId,
    teacherProfileId,
    sectionId,
    className,
    sectionName,
    subjectCode,
  });

  return { assignmentId };
}

/**
 * Remove a teacher assignment.
 */
export async function removeTeacherAssignment(
  schoolId: string,
  assignmentId: string
): Promise<boolean> {
  const asgn = teacherAssignmentsStore.get(assignmentId);
  if (!asgn || asgn.schoolId !== schoolId) {
    return false;
  }
  teacherAssignmentsStore.delete(assignmentId);
  return true;
}

/**
 * Reset staff store for tests.
 */
export function resetStaffTestStore(): void {
  staffStore.clear();
  teacherAssignmentsStore.clear();
}
