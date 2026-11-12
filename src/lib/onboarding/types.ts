/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — MULTI-SCHOOL ONBOARDING & MANAGEMENT TYPES
 * Step 23 / Phase 6: Multi-School Registration, Onboarding & Management
 * =============================================================================
 */

export interface SchoolRegistrationInput {
  schoolName: string;
  schoolCode: string;
  schoolEmail: string;
  contactNumber: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  adminName: string;
  adminEmail: string;
}

export interface SchoolRegistrationRecord extends SchoolRegistrationInput {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  provisionedSchoolId: string | null;
  provisionedAdminProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface SchoolProfileStepData {
  schoolName: string;
  schoolCode: string;
  schoolEmail: string;
  contactNumber: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  website?: string;
}

export interface AcademicYearStepData {
  label: string; // e.g. "2026-27"
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD
}

export interface ClassSectionItem {
  className: string;
  sections: string[]; // e.g. ["A", "B"]
}

export interface ClassesSectionsStepData {
  classes: ClassSectionItem[];
}

export interface StaffInvitationItem {
  displayName: string;
  email: string;
  roleCode: 'teacher' | 'accountant';
}

export interface StaffInvitationsStepData {
  invitations: StaffInvitationItem[];
}

export interface EnrolledStudentItem {
  registrationNumber: string;
  fullName: string;
  className: string;
  sectionName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface StudentEnrollmentStepData {
  students: EnrolledStudentItem[];
}

export interface GuardianLinkItem {
  studentRegistrationNumber: string;
  guardianName: string;
  contactNumber: string;
  email?: string;
  relationship: 'Father' | 'Mother' | 'Guardian' | 'Other';
}

export interface GuardianLinkingStepData {
  guardians: GuardianLinkItem[];
}

export interface PortalActivationStepData {
  activatedStudentRegistrationNumbers: string[];
  activateAll: boolean;
}

export interface SetupCompletionStepData {
  isReady: boolean;
  notes?: string;
  completedAt?: string;
  summary: {
    totalClasses: number;
    totalSections: number;
    totalStaff: number;
    totalStudents: number;
    totalGuardians: number;
    activatedStudents: number;
  };
}

export interface OnboardingWizardState {
  schoolId: string;
  currentStep: OnboardingWizardStep;
  completedSteps: number[];
  step1Profile: SchoolProfileStepData;
  step2AcademicYear: AcademicYearStepData;
  step3ClassesSections: ClassesSectionsStepData;
  step4StaffInvitations: StaffInvitationsStepData;
  step5StudentEnrollment: StudentEnrollmentStepData;
  step6GuardianLinking: GuardianLinkingStepData;
  step7PortalActivation: PortalActivationStepData;
  step8SetupCompletion: SetupCompletionStepData;
  isCompleted: boolean;
  completedAt: string | null;
  updatedAt: string;
}

export interface StaffInvitationRecord {
  id: string;
  schoolId: string;
  email: string;
  displayName: string;
  roleCode: 'teacher' | 'accountant';
  invitationToken: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface StudentCsvRow {
  registrationNumber: string;
  fullName: string;
  className: string;
  sectionName: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  relationship?: string;
}

export interface StudentCsvValidationResult {
  isValid: boolean;
  errors: Array<{ row: number; column?: string; message: string }>;
  validRows: StudentCsvRow[];
}
