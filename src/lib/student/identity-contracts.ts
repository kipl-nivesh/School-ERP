import 'server-only';

import { validAttendanceDate } from '../services/attendance-fields';

/** A lookup locator only. The selected school has no authority until the provider identity is bound. */
export function studentLoginLocator(schoolCode: unknown, registration: unknown) {
  if (typeof schoolCode !== 'string' || typeof registration !== 'string' ||
      !/^[A-Z0-9_-]{2,30}$/.test(schoolCode) || registration.length < 1 || registration.length > 128 ||
      registration !== registration.trim() || /[\p{Cc}\p{Cf}]/u.test(registration)) return null;
  return { schoolCode, registration };
}

export type StudentBinding = {
  studentId: string; schoolId: string; profileId: string;
  displayName: string; registration: string; schoolName: string;
  activeStudent: boolean; activeSchool: boolean; activeProfile: boolean;
  activePortal: boolean; studentMembership: boolean; staffMembership: boolean; entitled: boolean;
};

export type StudentSessionEvidence = {
  profileId: string; studentId: string; schoolId: string; expiresAt: number;
  credentialVersion: number; revoked: boolean;
};

/** The caller must independently verify provider evidence and load complete, trusted database rows.
 * This function neither verifies tokens nor establishes a session.
 */
export function resolveStudentIdentity(session: StudentSessionEvidence, candidates: readonly StudentBinding[],
  currentCredentialVersion: number, now: number) {
  const binding = candidates[0];
  if (candidates.length !== 1 || !binding || !session.profileId || !session.studentId || !session.schoolId ||
      session.revoked !== false || !Number.isSafeInteger(now) || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= now ||
      !Number.isSafeInteger(currentCredentialVersion) || currentCredentialVersion < 1 || session.credentialVersion !== currentCredentialVersion ||
      binding.profileId !== session.profileId || binding.studentId !== session.studentId || binding.schoolId !== session.schoolId ||
      binding.activeStudent !== true || binding.activeSchool !== true || binding.activeProfile !== true ||
      binding.activePortal !== true || binding.studentMembership !== true || binding.staffMembership !== false) return null;
  return {
    studentId: binding.studentId, schoolId: binding.schoolId,
    profile: { displayName: binding.displayName, registration: binding.registration, schoolName: binding.schoolName, status: 'active' } as const,
  };
}

/** Existing dashboard authorization retains its separate entitlement requirement. */
export function resolveStudentBinding(session: StudentSessionEvidence, candidates: readonly StudentBinding[],
  currentCredentialVersion: number, now: number) {
  return candidates[0]?.entitled === true ? resolveStudentIdentity(session, candidates, currentCredentialVersion, now) : null;
}

export type EnrollmentCandidate = {
  studentId: string; schoolId: string; sectionId: string; academicYearId: string;
  validFrom: string; validUntil: string | null;
};

export function selectCurrentStudentEnrollment(scope: { studentId: string; schoolId: string },
  candidates: readonly EnrollmentCandidate[], databaseDate: string) {
  if (!validAttendanceDate(databaseDate) || candidates.some(row => row.studentId !== scope.studentId || row.schoolId !== scope.schoolId ||
      !row.sectionId || !row.academicYearId || !validAttendanceDate(row.validFrom) ||
      (row.validUntil !== null && (!validAttendanceDate(row.validUntil) || row.validUntil < row.validFrom)))) return { kind: 'unavailable' } as const;
  const current = candidates.filter(row => row.validFrom <= databaseDate && (row.validUntil === null || row.validUntil >= databaseDate));
  if (current.length === 0) return { kind: 'none' } as const;
  if (current.length !== 1) return { kind: 'ambiguous' } as const;
  const { sectionId, academicYearId } = current[0];
  return { kind: 'current', sectionId, academicYearId } as const;
}

export type StudentPinCredentialRecord = {
  readonly credentialId: string;
  readonly studentId: string;
  readonly schoolId: string;
  readonly profileId: string;
  readonly salt: string;
  readonly pinHash: string;
  readonly algorithm: 'pbkdf2-sha256';
  readonly status: 'active' | 'locked' | 'revoked';
  readonly failedAttempts: number;
  readonly lockedUntil: number | null;
  readonly expiresAt: number | null;
  readonly credentialVersion: number;
};

export type StudentPinVerificationResult =
  | { readonly valid: true; readonly credentialVersion: number }
  | { readonly valid: false; readonly reason: 'locked' | 'revoked' | 'expired' | 'invalid_hash' | 'invalid_version' | 'missing_credential' };

/**
 * Pure credential state verifier. Enforces credential status, expiry, PBKDF2 hash,
 * lock window, and positive version.
 */
export function verifyStudentPinCredentialRecord(
  credential: StudentPinCredentialRecord | null | undefined,
  candidatePinHash: string,
  now: number,
): StudentPinVerificationResult {
  if (!credential) return { valid: false, reason: 'missing_credential' };
  if (!Number.isSafeInteger(credential.credentialVersion) || credential.credentialVersion < 1) {
    return { valid: false, reason: 'invalid_version' };
  }
  if (credential.status === 'revoked') {
    return { valid: false, reason: 'revoked' };
  }
  if (credential.status === 'locked' || (credential.lockedUntil !== null && credential.lockedUntil > now)) {
    return { valid: false, reason: 'locked' };
  }
  if (credential.expiresAt !== null && credential.expiresAt <= now) {
    return { valid: false, reason: 'expired' };
  }
  if (!candidatePinHash || credential.pinHash !== candidatePinHash) {
    return { valid: false, reason: 'invalid_hash' };
  }
  return { valid: true, credentialVersion: credential.credentialVersion };
}

/**
 * Rotation contract: increments credential version and clears lockout,
 * ensuring all previously issued sessions with old credential versions fail binding.
 */
export function rotateStudentPinCredentialRecord(
  current: StudentPinCredentialRecord,
  newSalt: string,
  newPinHash: string,
): StudentPinCredentialRecord {
  return {
    ...current,
    salt: newSalt,
    pinHash: newPinHash,
    credentialVersion: current.credentialVersion + 1,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

/**
 * Revocation contract: transitions status to revoked, instantly invalidating
 * credential verification and preventing any future session binding.
 */
export function revokeStudentPinCredentialRecord(
  current: StudentPinCredentialRecord,
): StudentPinCredentialRecord {
  return {
    ...current,
    status: 'revoked',
  };
}

export type StudentSessionIssuanceRequirements = {
  readonly studentId: string;
  readonly schoolId: string;
  readonly profileId: string;
  readonly binding: StudentBinding;
  readonly credentialResult: StudentPinVerificationResult;
  readonly expiresAt: number;
  readonly now: number;
};

/**
 * Validates prerequisites for native Supabase session issuance for a Student.
 * Enforces verified PIN evidence, active profile/school/student/portal,
 * no staff membership, active entitlement, and unexpired session window.
 */
export function validateStudentSessionIssuanceRequirements(
  req: StudentSessionIssuanceRequirements,
): { readonly eligible: true; readonly scope: StudentSessionEvidence } | { readonly eligible: false; readonly reason: string } {
  if (!req.credentialResult.valid) {
    return { eligible: false, reason: `credential_${req.credentialResult.reason}` };
  }
  if (req.binding.studentId !== req.studentId || req.binding.schoolId !== req.schoolId || req.binding.profileId !== req.profileId) {
    return { eligible: false, reason: 'identity_mismatch' };
  }
  if (req.binding.staffMembership !== false) {
    return { eligible: false, reason: 'staff_membership_forbidden' };
  }
  if (req.binding.activeStudent !== true || req.binding.activeSchool !== true || req.binding.activeProfile !== true ||
      req.binding.activePortal !== true || req.binding.studentMembership !== true || req.binding.entitled !== true) {
    return { eligible: false, reason: 'inactive_or_unentitled' };
  }
  if (!Number.isSafeInteger(req.expiresAt) || req.expiresAt <= req.now) {
    return { eligible: false, reason: 'expired_session_window' };
  }
  return {
    eligible: true,
    scope: {
      profileId: req.profileId,
      studentId: req.studentId,
      schoolId: req.schoolId,
      expiresAt: req.expiresAt,
      credentialVersion: req.credentialResult.credentialVersion,
      revoked: false,
    },
  };
}
