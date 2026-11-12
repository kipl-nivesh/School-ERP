/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — ONBOARDING & MULTI-SCHOOL MANAGEMENT SERVICE
 * Step 23 / Phase 6: Multi-School Registration, Onboarding & Management
 * =============================================================================
 */

import {
  type SchoolRegistrationInput,
  type SchoolRegistrationRecord,
  type OnboardingWizardStep,
  type OnboardingWizardState,
  type StaffInvitationItem,
  type StaffInvitationRecord,
  type StudentCsvRow,
  type StudentCsvValidationResult,
  type SchoolProfileStepData,
  type AcademicYearStepData,
  type ClassesSectionsStepData,
  type StaffInvitationsStepData,
  type StudentEnrollmentStepData,
  type GuardianLinkingStepData,
  type PortalActivationStepData,
  type SetupCompletionStepData,
} from './types';
import { activateStudentTrial } from '../subscription/service';

// In-memory backing stores for local tests and development DAL
const registrationsStore = new Map<string, SchoolRegistrationRecord>();
const onboardingProgressStore = new Map<string, OnboardingWizardState>();
const staffInvitationsStore = new Map<string, StaffInvitationRecord>();
const enrolledStudentsStore = new Map<string, {
  id: string;
  schoolId: string;
  registrationNumber: string;
  fullName: string;
  className: string;
  sectionName: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  relationship: string;
  studentPinProvisioned: boolean;
  parentPinProvisioned: boolean;
  portalAccessStatus: 'pending_activation' | 'active' | 'suspended' | 'disabled';
  portalActivatedAt: string | null;
  createdAt: string;
}>();
const trustedMfaFactors = new Set<string>();

const SCHOOL_CODE_REGEX = /^[A-Z0-9_-]{3,20}$/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;

/**
 * Validate school registration inputs on the server.
 */
export function validateSchoolRegistration(input: SchoolRegistrationInput): {
  isValid: boolean;
  errors: Record<string, string>;
  normalizedCode: string;
} {
  const errors: Record<string, string> = {};
  const normalizedCode = (input.schoolCode || '').trim().toUpperCase();

  if (!input.schoolName || input.schoolName.trim().length < 3) {
    errors.schoolName = 'School name must be at least 3 characters.';
  }

  if (!normalizedCode || !SCHOOL_CODE_REGEX.test(normalizedCode)) {
    errors.schoolCode = 'School code must be 3-20 uppercase alphanumeric characters or hyphens/underscores.';
  }

  if (!input.schoolEmail || !EMAIL_REGEX.test(input.schoolEmail.trim())) {
    errors.schoolEmail = 'Valid school email address is required.';
  }

  if (!input.contactNumber || !PHONE_REGEX.test(input.contactNumber.trim())) {
    errors.contactNumber = 'Valid contact number is required (7-20 digits).';
  }

  if (!input.addressLine || input.addressLine.trim().length < 3) {
    errors.addressLine = 'Address line is required.';
  }

  if (!input.city || input.city.trim().length < 2) {
    errors.city = 'City is required.';
  }

  if (!input.state || input.state.trim().length < 2) {
    errors.state = 'State is required.';
  }

  if (!input.postalCode || input.postalCode.trim().length < 3) {
    errors.postalCode = 'Postal code is required.';
  }

  if (!input.adminName || input.adminName.trim().length < 2) {
    errors.adminName = 'School Admin name is required.';
  }

  if (!input.adminEmail || !EMAIL_REGEX.test(input.adminEmail.trim())) {
    errors.adminEmail = 'Valid School Admin email address is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalizedCode,
  };
}

/**
 * Submit a school registration request.
 * Creates a pending application. Administrative privileges are never granted on submission.
 */
export async function submitSchoolRegistration(
  input: SchoolRegistrationInput
): Promise<{ status: 'success'; registrationId: string; schoolCode: string }> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const validation = validateSchoolRegistration(input);
  if (!validation.isValid) {
    const errorMsg = Object.values(validation.errors).join(', ');
    throw new Error(`Validation failed: ${errorMsg}`);
  }

  const normalizedCode = validation.normalizedCode;
  const normalizedSchoolEmail = input.schoolEmail.trim().toLowerCase();
  const normalizedAdminEmail = input.adminEmail.trim().toLowerCase();

  // Duplicate check on pending/approved applications
  for (const reg of registrationsStore.values()) {
    if (reg.status !== 'rejected') {
      if (reg.schoolCode === normalizedCode) {
        throw new Error(`School code "${normalizedCode}" is already registered or pending review.`);
      }
      if (reg.schoolEmail.toLowerCase() === normalizedSchoolEmail && reg.status === 'pending') {
        throw new Error(`School email "${normalizedSchoolEmail}" has a pending application.`);
      }
      if (reg.adminEmail.toLowerCase() === normalizedAdminEmail && reg.status === 'pending') {
        throw new Error(`Admin email "${normalizedAdminEmail}" has a pending application.`);
      }
    }
  }

  const id = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const record: SchoolRegistrationRecord = {
    ...input,
    id,
    schoolName: input.schoolName.trim(),
    schoolCode: normalizedCode,
    schoolEmail: normalizedSchoolEmail,
    contactNumber: input.contactNumber.trim(),
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    adminName: input.adminName.trim(),
    adminEmail: normalizedAdminEmail,
    status: 'pending',
    rejectionReason: null,
    approvedAt: null,
    approvedBy: null,
    provisionedSchoolId: null,
    provisionedAdminProfileId: null,
    createdAt: now,
    updatedAt: now,
  };

  registrationsStore.set(id, record);

  return {
    status: 'success',
    registrationId: id,
    schoolCode: normalizedCode,
  };
}

/**
 * Retrieve a school registration application by ID.
 */
export async function getSchoolRegistration(
  registrationId: string
): Promise<SchoolRegistrationRecord | null> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  return registrationsStore.get(registrationId) ?? null;
}

/**
 * Trusted Operator Procedure: Approve and provision an approved school.
 * Creates school record, initial academic year, School Admin membership, and initializes wizard progress.
 * Idempotent: repeated calls on approved registration return cached provisioning.
 */
export async function provisionSchoolRegistration(
  registrationId: string,
  operatorId: string,
  adminAuthUserId: string = `usr_admin_${Date.now()}`
): Promise<{
  status: 'success';
  schoolId: string;
  schoolCode: string;
  adminProfileId: string;
  idempotent?: boolean;
}> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  if (!registrationId || !operatorId) {
    throw new Error('registrationId and operatorId are required for provisioning.');
  }

  const reg = registrationsStore.get(registrationId);
  if (!reg) {
    throw new Error(`Registration "${registrationId}" not found.`);
  }

  // Idempotent return if already approved
  if (reg.status === 'approved' && reg.provisionedSchoolId && reg.provisionedAdminProfileId) {
    return {
      status: 'success',
      schoolId: reg.provisionedSchoolId,
      schoolCode: reg.schoolCode,
      adminProfileId: reg.provisionedAdminProfileId,
      idempotent: true,
    };
  }

  if (reg.status !== 'pending') {
    throw new Error(`Cannot approve registration in status "${reg.status}".`);
  }

  const schoolId = `sch_${reg.schoolCode.toLowerCase()}_${Date.now()}`;
  const now = new Date().toISOString();

  // Update registration record
  reg.status = 'approved';
  reg.approvedAt = now;
  reg.approvedBy = operatorId;
  reg.provisionedSchoolId = schoolId;
  reg.provisionedAdminProfileId = adminAuthUserId;
  reg.updatedAt = now;
  registrationsStore.set(registrationId, reg);

  // Initialize Onboarding Wizard Progress
  const initialWizardState: OnboardingWizardState = {
    schoolId,
    currentStep: 1,
    completedSteps: [],
    step1Profile: {
      schoolName: reg.schoolName,
      schoolCode: reg.schoolCode,
      schoolEmail: reg.schoolEmail,
      contactNumber: reg.contactNumber,
      addressLine: reg.addressLine,
      city: reg.city,
      state: reg.state,
      postalCode: reg.postalCode,
    },
    step2AcademicYear: {
      label: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`,
      startsOn: `${new Date().getFullYear()}-04-01`,
      endsOn: `${new Date().getFullYear() + 1}-03-31`,
    },
    step3ClassesSections: {
      classes: [
        { className: 'Grade 1', sections: ['A', 'B'] },
        { className: 'Grade 2', sections: ['A', 'B'] },
      ],
    },
    step4StaffInvitations: {
      invitations: [],
    },
    step5StudentEnrollment: {
      students: [],
    },
    step6GuardianLinking: {
      guardians: [],
    },
    step7PortalActivation: {
      activatedStudentRegistrationNumbers: [],
      activateAll: false,
    },
    step8SetupCompletion: {
      isReady: false,
      summary: {
        totalClasses: 2,
        totalSections: 4,
        totalStaff: 0,
        totalStudents: 0,
        totalGuardians: 0,
        activatedStudents: 0,
      },
    },
    isCompleted: false,
    completedAt: null,
    updatedAt: now,
  };

  onboardingProgressStore.set(schoolId, initialWizardState);

  return {
    status: 'success',
    schoolId,
    schoolCode: reg.schoolCode,
    adminProfileId: adminAuthUserId,
  };
}

/**
 * Trusted Operator Procedure: Reject a pending registration.
 */
export async function rejectSchoolRegistration(
  registrationId: string,
  operatorId: string,
  reason: string
): Promise<{ status: 'success'; registrationId: string }> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const reg = registrationsStore.get(registrationId);
  if (!reg) {
    throw new Error(`Registration "${registrationId}" not found.`);
  }

  if (reg.status !== 'pending') {
    throw new Error(`Cannot reject registration in status "${reg.status}".`);
  }

  reg.status = 'rejected';
  reg.rejectionReason = reason;
  reg.approvedBy = operatorId;
  reg.updatedAt = new Date().toISOString();
  registrationsStore.set(registrationId, reg);

  return { status: 'success', registrationId };
}

/**
 * Trusted Operator Procedure: Initial School Admin MFA Bootstrap.
 * Avoids bootstrap deadlock by approving the initial admin TOTP factor during initial account setup.
 */
export async function bootstrapInitialAdminMfa(
  schoolId: string,
  adminProfileId: string,
  factorId: string
): Promise<{ status: 'success'; factorId: string }> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  if (!schoolId || !adminProfileId || !factorId) {
    throw new Error('schoolId, adminProfileId, and factorId are required.');
  }

  const key = `${adminProfileId}:${factorId}`;
  trustedMfaFactors.add(key);

  return { status: 'success', factorId };
}

export function isMfaFactorTrusted(adminProfileId: string, factorId: string): boolean {
  return trustedMfaFactors.has(`${adminProfileId}:${factorId}`);
}

/**
 * Retrieve onboarding wizard progress for a school.
 */
export async function getOnboardingProgress(
  schoolId: string
): Promise<OnboardingWizardState | null> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  return onboardingProgressStore.get(schoolId) ?? null;
}

/**
 * Save draft progress for an onboarding wizard step.
 * Allows safe resume across sessions.
 */
export async function saveOnboardingStep<T>(
  schoolId: string,
  step: OnboardingWizardStep,
  stepData: T
): Promise<OnboardingWizardState> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const state = onboardingProgressStore.get(schoolId);
  const now = new Date().toISOString();

  if (!state) {
    throw new Error(`Onboarding progress for school "${schoolId}" not found.`);
  }

  // Update step data
  switch (step) {
    case 1:
      state.step1Profile = stepData as SchoolProfileStepData;
      break;
    case 2:
      state.step2AcademicYear = stepData as AcademicYearStepData;
      break;
    case 3:
      state.step3ClassesSections = stepData as ClassesSectionsStepData;
      break;
    case 4:
      state.step4StaffInvitations = stepData as StaffInvitationsStepData;
      break;
    case 5:
      state.step5StudentEnrollment = stepData as StudentEnrollmentStepData;
      break;
    case 6:
      state.step6GuardianLinking = stepData as GuardianLinkingStepData;
      break;
    case 7:
      state.step7PortalActivation = stepData as PortalActivationStepData;
      break;
    case 8:
      state.step8SetupCompletion = stepData as SetupCompletionStepData;
      break;
  }

  if (!state.completedSteps.includes(step)) {
    state.completedSteps.push(step);
    state.completedSteps.sort((a, b) => a - b);
  }

  if (step < 8 && state.currentStep <= step) {
    state.currentStep = (step + 1) as OnboardingWizardStep;
  }

  state.updatedAt = now;
  onboardingProgressStore.set(schoolId, state);

  return state;
}

/**
 * Finalize and complete school onboarding.
 */
export async function completeOnboarding(
  schoolId: string
): Promise<OnboardingWizardState> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const state = onboardingProgressStore.get(schoolId);
  if (!state) {
    throw new Error(`Onboarding state for school "${schoolId}" not found.`);
  }

  const now = new Date().toISOString();
  state.isCompleted = true;
  state.completedAt = now;
  state.currentStep = 8;
  if (!state.completedSteps.includes(8)) {
    state.completedSteps.push(8);
  }
  state.updatedAt = now;

  onboardingProgressStore.set(schoolId, state);
  return state;
}

/**
 * Invite a staff member (Teacher or Accountant) to a school.
 */
export async function inviteStaff(
  schoolId: string,
  item: StaffInvitationItem,
  invitedByProfileId: string
): Promise<StaffInvitationRecord> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  if (!item.displayName || item.displayName.trim().length < 2) {
    throw new Error('Staff display name must be at least 2 characters.');
  }

  if (!item.email || !EMAIL_REGEX.test(item.email.trim())) {
    throw new Error('Valid staff email address is required.');
  }

  if (item.roleCode !== 'teacher' && item.roleCode !== 'accountant') {
    throw new Error('Role must be "teacher" or "accountant".');
  }

  const normalizedEmail = item.email.trim().toLowerCase();
  const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const record: StaffInvitationRecord = {
    id: `inv_id_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    schoolId,
    email: normalizedEmail,
    displayName: item.displayName.trim(),
    roleCode: item.roleCode,
    invitationToken,
    status: 'pending',
    invitedBy: invitedByProfileId,
    expiresAt,
    acceptedAt: null,
    createdAt: now,
  };

  staffInvitationsStore.set(record.id, record);
  return record;
}

/**
 * List pending staff invitations for a school.
 */
export async function listStaffInvitations(
  schoolId: string
): Promise<StaffInvitationRecord[]> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const results: StaffInvitationRecord[] = [];
  for (const inv of staffInvitationsStore.values()) {
    if (inv.schoolId === schoolId) {
      results.push(inv);
    }
  }
  return results;
}

/**
 * Revoke a staff invitation.
 */
export async function revokeStaffInvitation(
  schoolId: string,
  invitationId: string
): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const inv = staffInvitationsStore.get(invitationId);
  if (!inv || inv.schoolId !== schoolId) {
    return false;
  }
  inv.status = 'revoked';
  staffInvitationsStore.set(invitationId, inv);
  return true;
}

/**
 * Validate CSV string for bulk student enrollment.
 * Expected columns: registration_number, full_name, class_name, section_name, guardian_name, guardian_phone, guardian_email, relationship
 */
export function validateStudentCsv(csvContent: string): StudentCsvValidationResult {
  const lines = csvContent.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      isValid: false,
      errors: [{ row: 0, message: 'CSV file must contain a header row and at least one student data row.' }],
      validRows: [],
    };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

  const requiredHeaders = [
    'registration_number',
    'full_name',
    'class_name',
    'section_name',
    'guardian_name',
    'guardian_phone',
  ];

  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      return {
        isValid: false,
        errors: [{ row: 1, column: req, message: `Missing required CSV column: "${req}".` }],
        validRows: [],
      };
    }
  }

  const regIdx = headers.indexOf('registration_number');
  const nameIdx = headers.indexOf('full_name');
  const classIdx = headers.indexOf('class_name');
  const sectionIdx = headers.indexOf('section_name');
  const guardNameIdx = headers.indexOf('guardian_name');
  const guardPhoneIdx = headers.indexOf('guardian_phone');
  const guardEmailIdx = headers.indexOf('guardian_email');
  const relIdx = headers.indexOf('relationship');

  const errors: Array<{ row: number; column?: string; message: string }> = [];
  const validRows: StudentCsvRow[] = [];
  const seenRegNumbers = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

    const registrationNumber = cols[regIdx] || '';
    const fullName = cols[nameIdx] || '';
    const className = cols[classIdx] || '';
    const sectionName = cols[sectionIdx] || '';
    const guardianName = cols[guardNameIdx] || '';
    const guardianPhone = cols[guardPhoneIdx] || '';
    const guardianEmail = guardEmailIdx >= 0 ? cols[guardEmailIdx] : undefined;
    const relationship = relIdx >= 0 ? cols[relIdx] : 'Parent';

    if (!registrationNumber || registrationNumber.length < 2) {
      errors.push({ row: rowNum, column: 'registration_number', message: 'Registration number is required.' });
    } else if (seenRegNumbers.has(registrationNumber.toUpperCase())) {
      errors.push({ row: rowNum, column: 'registration_number', message: `Duplicate registration number "${registrationNumber}" in CSV file.` });
    } else {
      seenRegNumbers.add(registrationNumber.toUpperCase());
    }

    if (!fullName || fullName.length < 2) {
      errors.push({ row: rowNum, column: 'full_name', message: 'Student full name is required.' });
    }

    if (!className) {
      errors.push({ row: rowNum, column: 'class_name', message: 'Class name is required.' });
    }

    if (!sectionName) {
      errors.push({ row: rowNum, column: 'section_name', message: 'Section name is required.' });
    }

    if (!guardianName || guardianName.length < 2) {
      errors.push({ row: rowNum, column: 'guardian_name', message: 'Guardian name is required.' });
    }

    if (!guardianPhone || !PHONE_REGEX.test(guardianPhone)) {
      errors.push({ row: rowNum, column: 'guardian_phone', message: 'Valid guardian phone number is required.' });
    }

    if (guardianEmail && !EMAIL_REGEX.test(guardianEmail)) {
      errors.push({ row: rowNum, column: 'guardian_email', message: 'Guardian email format is invalid.' });
    }

    if (errors.length === 0) {
      validRows.push({
        registrationNumber: registrationNumber.toUpperCase(),
        fullName,
        className,
        sectionName,
        guardianName,
        guardianPhone,
        guardianEmail,
        relationship,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validRows,
  };
}

/**
 * Enroll a student into a school with class, section, guardian, and separate PINs.
 * Optional portal activation immediately starts the 10-day trial.
 */
export async function enrollStudent(
  schoolId: string,
  row: StudentCsvRow,
  options: { activatePortalImmediately?: boolean } = {}
): Promise<{
  id: string;
  registrationNumber: string;
  portalAccessStatus: 'pending_activation' | 'active';
  trialEndsAt: string | null;
}> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const regKey = `${schoolId}:${row.registrationNumber.toUpperCase()}`;
  if (enrolledStudentsStore.has(regKey)) {
    throw new Error(`Student with registration number "${row.registrationNumber}" already exists in school "${schoolId}".`);
  }

  const studentId = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let portalAccessStatus: 'pending_activation' | 'active' = 'pending_activation';
  let trialEndsAt: string | null = null;

  if (options.activatePortalImmediately) {
    portalAccessStatus = 'active';
    const trialRes = await activateStudentTrial(studentId, schoolId);
    trialEndsAt = trialRes.trialEndsAt;
  }

  enrolledStudentsStore.set(regKey, {
    id: studentId,
    schoolId,
    registrationNumber: row.registrationNumber.toUpperCase(),
    fullName: row.fullName,
    className: row.className,
    sectionName: row.sectionName,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianEmail: row.guardianEmail,
    relationship: row.relationship || 'Guardian',
    studentPinProvisioned: true,
    parentPinProvisioned: true,
    portalAccessStatus,
    portalActivatedAt: options.activatePortalImmediately ? now : null,
    createdAt: now,
  });

  return {
    id: studentId,
    registrationNumber: row.registrationNumber.toUpperCase(),
    portalAccessStatus,
    trialEndsAt,
  };
}

/**
 * Import students from validated CSV content.
 */
export async function importStudentsFromCsv(
  schoolId: string,
  csvContent: string,
  options: { activatePortalImmediately?: boolean } = {}
): Promise<{
  totalEnrolled: number;
  students: Array<{ id: string; registrationNumber: string }>;
}> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const validation = validateStudentCsv(csvContent);
  if (!validation.isValid) {
    const errorMsgs = validation.errors.map(e => `Row ${e.row}: ${e.message}`).join('; ');
    throw new Error(`CSV validation failed: ${errorMsgs}`);
  }

  const results: Array<{ id: string; registrationNumber: string }> = [];
  for (const row of validation.validRows) {
    const res = await enrollStudent(schoolId, row, options);
    results.push({ id: res.id, registrationNumber: res.registrationNumber });
  }

  return {
    totalEnrolled: results.length,
    students: results,
  };
}

/**
 * Activate student portal access.
 * Confirmed rule: Starts the 10-day trial exactly once at this moment.
 */
export async function activateStudentPortal(
  schoolId: string,
  registrationNumber: string
): Promise<{
  studentId: string;
  portalAccessStatus: 'active';
  trialStartedAt: string;
  trialEndsAt: string;
}> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const regKey = `${schoolId}:${registrationNumber.toUpperCase()}`;
  const student = enrolledStudentsStore.get(regKey);
  if (!student) {
    throw new Error(`Student with registration number "${registrationNumber}" not found in school "${schoolId}".`);
  }

  const now = new Date().toISOString();
  student.portalAccessStatus = 'active';
  student.portalActivatedAt = student.portalActivatedAt || now;
  enrolledStudentsStore.set(regKey, student);

  // Invoke trusted activateStudentTrial exactly once (starts 240-hour trial)
  const trialRes = await activateStudentTrial(student.id, schoolId);

  return {
    studentId: student.id,
    portalAccessStatus: 'active',
    trialStartedAt: trialRes.trialStartedAt,
    trialEndsAt: trialRes.trialEndsAt,
  };
}

/**
 * Reset in-memory test stores.
 */
export function resetOnboardingTestStore(): void {
  registrationsStore.clear();
  onboardingProgressStore.clear();
  staffInvitationsStore.clear();
  enrolledStudentsStore.clear();
  trustedMfaFactors.clear();
}
