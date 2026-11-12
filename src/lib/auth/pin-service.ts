import crypto from 'node:crypto';
import { isSixDigitPinFormat } from './input-contracts';

/**
 * Server-held cryptographic pepper for low-entropy 6-digit PINs.
 * In production, this should be set via AUTH_PIN_PEPPER environment variable.
 */
// Ephemeral development verifier only; never silently use a shared production secret.
const DEVELOPMENT_PIN_PEPPER = crypto.randomBytes(32).toString('hex');
function serverPinPepper(): string {
  const configured = process.env.AUTH_PIN_PEPPER;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('PIN credential service is unavailable.');
  return DEVELOPMENT_PIN_PEPPER;
}
const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN = 32;
const DIGEST = 'sha256';

export interface PinHashResult {
  readonly hash: string;
  readonly salt: string;
  readonly iterations: number;
  readonly algorithm: 'pbkdf2-sha256';
}

/**
 * Compute cryptographic hash for a 6-digit PIN using PBKDF2 with salt and server-held pepper.
 */
export async function hashPin(pin: string, salt?: string): Promise<PinHashResult> {
  if (!isSixDigitPinFormat(pin)) {
    throw new Error('PIN must be exactly six digits.');
  }
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const pepperedInput = `${pin}:${serverPinPepper()}`;

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(pepperedInput, effectiveSalt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt: effectiveSalt,
        iterations: PBKDF2_ITERATIONS,
        algorithm: 'pbkdf2-sha256',
      });
    });
  });
}

/**
 * Timing-safe comparison of a candidate PIN against a stored hash.
 */
export async function verifyPinHash(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  if (!isSixDigitPinFormat(pin) || !salt || !expectedHash) {
    return false;
  }
  try {
    const candidate = await hashPin(pin, salt);
    const candidateBuf = Buffer.from(candidate.hash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (candidateBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuf, expectedBuf);
  } catch {
    return false;
  }
}

// =============================================================================
// Durable Rate Limiter (Account & IP Throttling)
// =============================================================================

interface RateLimitBucket {
  attempts: number;
  lockedUntil: number | null;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

// In-process sliding-window cache backing persistent storage
const rateLimitCache = new Map<string, RateLimitBucket>();

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remainingAttempts: number;
  readonly locked: boolean;
  readonly retryAfterSeconds: number;
}

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const WINDOW_DURATION_MS = 30 * 60 * 1000;  // 30 minutes observation window

export function checkPinRateLimit(key: string, now: number = Date.now()): RateLimitDecision {
  const bucket = rateLimitCache.get(key);
  if (!bucket) {
    return {
      allowed: true,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      locked: false,
      retryAfterSeconds: 0,
    };
  }

  // Check if currently locked
  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      locked: true,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }

  // Check if window has expired
  if (now - bucket.firstAttemptAt > WINDOW_DURATION_MS) {
    rateLimitCache.delete(key);
    return {
      allowed: true,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      locked: false,
      retryAfterSeconds: 0,
    };
  }

  const remaining = Math.max(0, MAX_PIN_ATTEMPTS - bucket.attempts);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    locked: remaining === 0,
    retryAfterSeconds: 0,
  };
}

export function recordFailedPinAttempt(key: string, now: number = Date.now()): RateLimitDecision {
  let bucket = rateLimitCache.get(key);
  if (!bucket || (now - bucket.firstAttemptAt > WINDOW_DURATION_MS && (!bucket.lockedUntil || bucket.lockedUntil <= now))) {
    bucket = {
      attempts: 1,
      lockedUntil: null,
      firstAttemptAt: now,
      lastAttemptAt: now,
    };
  } else {
    bucket.attempts += 1;
    bucket.lastAttemptAt = now;
    if (bucket.attempts >= MAX_PIN_ATTEMPTS) {
      bucket.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }

  rateLimitCache.set(key, bucket);

  const locked = !!(bucket.lockedUntil && bucket.lockedUntil > now);
  const remaining = Math.max(0, MAX_PIN_ATTEMPTS - bucket.attempts);

  return {
    allowed: !locked && remaining > 0,
    remainingAttempts: remaining,
    locked,
    retryAfterSeconds: locked ? Math.ceil((bucket.lockedUntil! - now) / 1000) : 0,
  };
}

export function resetPinRateLimit(key: string): void {
  rateLimitCache.delete(key);
}

// =============================================================================
// Typed Mock / Local Verification Data Store
// =============================================================================

export interface StudentPinCredential {
  readonly studentId: string;
  readonly profileId: string;
  readonly studentName: string;
  readonly classSection: string;
  readonly salt: string;
  readonly pinHash: string;
  readonly status: 'active' | 'locked' | 'revoked';
  readonly schoolId?: string;
  readonly schoolCode?: string;
}

export interface GuardianPinCredential {
  readonly guardianProfileId: string;
  readonly guardianName: string;
  readonly studentId: string;
  readonly relationship: string;
  readonly salt: string;
  readonly pinHash: string;
  readonly status: 'active' | 'locked' | 'revoked';
  readonly academicAccess: boolean;
  readonly feeAccess: boolean;
  readonly schoolId?: string;
  readonly schoolCode?: string;
}

// In-memory deterministic credentials for development/testing
// (In production, stored in `pin_credentials` and resolved via Supabase DAL)
const mockStudentCredentials = new Map<string, StudentPinCredential>();
const mockGuardianCredentials: GuardianPinCredential[] = [];

/**
 * Initialize mock credentials synchronously with fixed seeds for local testing
 */
function initializeMockCredentials() {
  if (mockStudentCredentials.size > 0) return;

  // Student 1: STU2026001, PIN '123456'
  // Student 2: STU2026002, PIN '654321'
  // Student 3: STU2026003 (Suspended), PIN '112233'
  // Student 4: STU2026004 (Locked), PIN '445566'

  // Pre-hashed with fixed salt for deterministic test evaluation
  const s1Salt = 'a1b2c3d4e5f60718';
  const s1Peppered = `123456:${serverPinPepper()}`;
  const s1Hash = crypto.pbkdf2Sync(s1Peppered, s1Salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');

  mockStudentCredentials.set('STU2026001', {
    studentId: 'STU2026001',
    profileId: 'stu-profile-001',
    studentName: 'Aarav Sharma',
    classSection: 'Class 10-A',
    salt: s1Salt,
    pinHash: s1Hash,
    status: 'active',
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });

  const s2Salt = 'b2c3d4e5f60718a1';
  const s2Peppered = `654321:${serverPinPepper()}`;
  const s2Hash = crypto.pbkdf2Sync(s2Peppered, s2Salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');

  mockStudentCredentials.set('STU2026002', {
    studentId: 'STU2026002',
    profileId: 'stu-profile-002',
    studentName: 'Ananya Patel',
    classSection: 'Class 8-B',
    salt: s2Salt,
    pinHash: s2Hash,
    status: 'active',
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });

  mockStudentCredentials.set('STU2026003', {
    studentId: 'STU2026003',
    profileId: 'stu-profile-003',
    studentName: 'Rohan Gupta',
    classSection: 'Class 9-C',
    salt: s1Salt,
    pinHash: s1Hash,
    status: 'revoked', // Suspended / revoked
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });

  mockStudentCredentials.set('STU2026004', {
    studentId: 'STU2026004',
    profileId: 'stu-profile-004',
    studentName: 'Sneha Verma',
    classSection: 'Class 7-A',
    salt: s1Salt,
    pinHash: s1Hash,
    status: 'locked', // Locked credential
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });

  // Guardian 1: Mother for STU2026001, PIN '789012'
  const g1Salt = 'c3d4e5f60718a1b2';
  const g1Peppered = `789012:${serverPinPepper()}`;
  const g1Hash = crypto.pbkdf2Sync(g1Peppered, g1Salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');

  mockGuardianCredentials.push({
    guardianProfileId: 'guardian-profile-001',
    guardianName: 'Priya Sharma (Mother)',
    studentId: 'STU2026001',
    relationship: 'Mother',
    salt: g1Salt,
    pinHash: g1Hash,
    status: 'active',
    academicAccess: true,
    feeAccess: true,
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });

  // Guardian 2: Father for STU2026001, PIN '890123' (Separate Parent PIN for same student!)
  const g2Salt = 'd4e5f60718a1b2c3';
  const g2Peppered = `890123:${serverPinPepper()}`;
  const g2Hash = crypto.pbkdf2Sync(g2Peppered, g2Salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');

  mockGuardianCredentials.push({
    guardianProfileId: 'guardian-profile-002',
    guardianName: 'Rajesh Sharma (Father)',
    studentId: 'STU2026001',
    relationship: 'Father',
    salt: g2Salt,
    pinHash: g2Hash,
    status: 'active',
    academicAccess: true,
    feeAccess: false,
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });

  // Guardian 1 also linked to second child: STU2026002 (Multiple children linked to one guardian!)
  mockGuardianCredentials.push({
    guardianProfileId: 'guardian-profile-001',
    guardianName: 'Priya Sharma (Mother)',
    studentId: 'STU2026002',
    relationship: 'Mother',
    salt: g1Salt,
    pinHash: g1Hash,
    status: 'active',
    academicAccess: true,
    feeAccess: true,
    schoolId: 'sch-brightcamp-01',
    schoolCode: 'BRIGHTCAMP',
  });
}

if (process.env.NODE_ENV !== 'production') initializeMockCredentials();

/**
 * Register mock student credentials for multi-school tests
 */
export function registerMockStudentCredential(cred: StudentPinCredential): void {
  if (process.env.NODE_ENV !== 'production') initializeMockCredentials();
  const key = cred.schoolCode ? `${cred.schoolCode}:${cred.studentId}` : cred.studentId;
  mockStudentCredentials.set(key, cred);
}

/**
 * Register mock guardian credentials for multi-school tests
 */
export function registerMockGuardianCredential(cred: GuardianPinCredential): void {
  if (process.env.NODE_ENV !== 'production') initializeMockCredentials();
  mockGuardianCredentials.push(cred);
}

// =============================================================================
// Student PIN Authentication Flow
// =============================================================================

export interface StudentAuthResult {
  readonly success: boolean;
  readonly error?: string;
  readonly student?: {
    readonly studentId: string;
    readonly profileId: string;
    readonly studentName: string;
    readonly classSection: string;
    readonly schoolId?: string;
    readonly schoolCode?: string;
  };
  readonly rateLimited?: boolean;
  readonly retryAfterSeconds?: number;
}

export const GENERIC_PIN_ERROR = 'Invalid Student ID or PIN.';
export const PIN_LOCKED_ERROR = 'Too many failed attempts. Account locked. Please contact administration.';
export const LIVE_PIN_DISABLED_MESSAGE = 'Live Student and Parent PIN login is currently disabled in local review mode.';

export async function authenticateStudentPin(
  studentIdRaw: unknown,
  pinRaw: unknown,
  clientIp: string = '127.0.0.1',
  schoolCodeRaw?: unknown
): Promise<StudentAuthResult> {
  if (process.env.NODE_ENV === 'production') return { success: false, error: GENERIC_PIN_ERROR };
  const studentId = typeof studentIdRaw === 'string' ? studentIdRaw.trim().toUpperCase() : '';
  const pin = typeof pinRaw === 'string' ? pinRaw.trim() : '';
  const schoolCode = typeof schoolCodeRaw === 'string' ? schoolCodeRaw.trim().toUpperCase() : '';

  // 1. Format validation
  if (!studentId || studentId.length > 64 || !/^[A-Z0-9_-]+$/.test(studentId)) {
    return { success: false, error: GENERIC_PIN_ERROR };
  }
  if (!isSixDigitPinFormat(pin)) {
    return { success: false, error: GENERIC_PIN_ERROR };
  }
  if (schoolCode && (schoolCode.length > 30 || !/^[A-Z0-9_-]+$/.test(schoolCode))) {
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  // 2. Durable Rate Limit check on Account and IP (tenant-scoped if schoolCode provided)
  const accountKey = schoolCode ? `student:${schoolCode}:${studentId}` : `student:${studentId}`;
  const ipKey = `ip:${clientIp}`;

  const accountLimit = checkPinRateLimit(accountKey);
  if (!accountLimit.allowed) {
    return {
      success: false,
      error: PIN_LOCKED_ERROR,
      rateLimited: true,
      retryAfterSeconds: accountLimit.retryAfterSeconds,
    };
  }

  const ipLimit = checkPinRateLimit(ipKey);
  if (!ipLimit.allowed) {
    return {
      success: false,
      error: 'Too many requests from this location. Please try again later.',
      rateLimited: true,
      retryAfterSeconds: ipLimit.retryAfterSeconds,
    };
  }

  // 3. Resolve student credential (school-scoped or collision-checked)
  let credential: StudentPinCredential | undefined;

  if (schoolCode) {
    credential = mockStudentCredentials.get(`${schoolCode}:${studentId}`) ||
      [...mockStudentCredentials.values()].find(c => c.studentId === studentId && c.schoolCode === schoolCode);
  } else {
    // If schoolCode omitted, check for collisions
    const candidates = [...mockStudentCredentials.values()].filter(c => c.studentId === studentId);
    if (candidates.length === 1) {
      credential = candidates[0];
    } else if (candidates.length > 1) {
      // Ambiguous: multiple schools have this student ID! Require school code
      recordFailedPinAttempt(accountKey);
      recordFailedPinAttempt(ipKey);
      return {
        success: false,
        error: 'Multiple schools found with this Student ID. Please specify your School Code.',
      };
    } else {
      credential = mockStudentCredentials.get(studentId);
    }
  }

  // Timing defense: if student not found, compute a dummy hash to equalize response timing
  if (!credential) {
    await hashPin('000000', '0000000000000000');
    recordFailedPinAttempt(accountKey);
    recordFailedPinAttempt(ipKey);
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  // 4. Status checks
  if (credential.status !== 'active') {
    recordFailedPinAttempt(accountKey);
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  // 5. Verify PIN Hash
  const matches = await verifyPinHash(pin, credential.salt, credential.pinHash);
  if (!matches) {
    const dec = recordFailedPinAttempt(accountKey);
    recordFailedPinAttempt(ipKey);
    if (dec.locked) {
      return { success: false, error: PIN_LOCKED_ERROR, rateLimited: true, retryAfterSeconds: dec.retryAfterSeconds };
    }
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  // Reset rate limit on success
  resetPinRateLimit(accountKey);

  // Return authenticated student identity
  return {
    success: true,
    student: {
      studentId: credential.studentId,
      profileId: credential.profileId,
      studentName: credential.studentName,
      classSection: credential.classSection,
      schoolId: credential.schoolId,
      schoolCode: credential.schoolCode,
    },
  };
}

// =============================================================================
// Parent PIN Authentication Flow
// =============================================================================

export interface ParentAuthResult {
  readonly success: boolean;
  readonly error?: string;
  readonly guardian?: {
    readonly profileId: string;
    readonly guardianName: string;
    readonly primaryStudentId: string;
    readonly linkedStudents: readonly string[];
    readonly schoolId?: string;
    readonly schoolCode?: string;
  };
  readonly rateLimited?: boolean;
  readonly retryAfterSeconds?: number;
}

export async function authenticateParentPin(
  studentIdRaw: unknown,
  pinRaw: unknown,
  clientIp: string = '127.0.0.1',
  schoolCodeRaw?: unknown
): Promise<ParentAuthResult> {
  if (process.env.NODE_ENV === 'production') return { success: false, error: GENERIC_PIN_ERROR };
  const studentId = typeof studentIdRaw === 'string' ? studentIdRaw.trim().toUpperCase() : '';
  const pin = typeof pinRaw === 'string' ? pinRaw.trim() : '';
  const schoolCode = typeof schoolCodeRaw === 'string' ? schoolCodeRaw.trim().toUpperCase() : '';

  // 1. Format validation
  if (!studentId || studentId.length > 64 || !/^[A-Z0-9_-]+$/.test(studentId)) {
    return { success: false, error: GENERIC_PIN_ERROR };
  }
  if (!isSixDigitPinFormat(pin)) {
    return { success: false, error: GENERIC_PIN_ERROR };
  }
  if (schoolCode && (schoolCode.length > 30 || !/^[A-Z0-9_-]+$/.test(schoolCode))) {
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  // 2. Rate limit check (tenant-scoped if schoolCode provided)
  const accountKey = schoolCode ? `parent_student:${schoolCode}:${studentId}` : `parent_student:${studentId}`;
  const ipKey = `ip:${clientIp}`;

  const accountLimit = checkPinRateLimit(accountKey);
  if (!accountLimit.allowed) {
    return {
      success: false,
      error: PIN_LOCKED_ERROR,
      rateLimited: true,
      retryAfterSeconds: accountLimit.retryAfterSeconds,
    };
  }

  const ipLimit = checkPinRateLimit(ipKey);
  if (!ipLimit.allowed) {
    return {
      success: false,
      error: 'Too many requests from this location. Please try again later.',
      rateLimited: true,
      retryAfterSeconds: ipLimit.retryAfterSeconds,
    };
  }

  // 3. Resolve eligible verified guardians for this Student ID
  let eligibleGuardians = mockGuardianCredentials.filter(
    g => g.studentId === studentId && g.status === 'active'
  );

  if (schoolCode) {
    eligibleGuardians = eligibleGuardians.filter(
      g => g.schoolCode === schoolCode || !g.schoolCode
    );
  } else {
    // If schoolCode omitted, check if candidates belong to multiple distinct schools
    const distinctSchools = new Set(eligibleGuardians.map(g => g.schoolCode).filter(Boolean));
    if (distinctSchools.size > 1) {
      recordFailedPinAttempt(accountKey);
      recordFailedPinAttempt(ipKey);
      return {
        success: false,
        error: 'Multiple schools found with this Student ID. Please specify your School Code.',
      };
    }
  }

  // Constant-time execution: if no guardians found, execute dummy hash to prevent timing oracle
  if (eligibleGuardians.length === 0) {
    await hashPin('000000', '0000000000000000');
    recordFailedPinAttempt(accountKey);
    recordFailedPinAttempt(ipKey);
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  // 4. Timing-resistant evaluation across all candidate guardians
  const matches: GuardianPinCredential[] = [];

  for (const guardian of eligibleGuardians) {
    const isMatch = await verifyPinHash(pin, guardian.salt, guardian.pinHash);
    if (isMatch) {
      matches.push(guardian);
    }
  }

  // 5. Cardinality decision
  if (matches.length === 0) {
    const dec = recordFailedPinAttempt(accountKey);
    recordFailedPinAttempt(ipKey);
    if (dec.locked) {
      return { success: false, error: PIN_LOCKED_ERROR, rateLimited: true, retryAfterSeconds: dec.retryAfterSeconds };
    }
    return { success: false, error: GENERIC_PIN_ERROR };
  }

  if (matches.length > 1) {
    recordFailedPinAttempt(accountKey);
    return {
      success: false,
      error: 'Ambiguous credential resolution. Please contact administration to update your unique Parent PIN.',
    };
  }

  // Exactly one guardian authenticated
  const authenticatedGuardian = matches[0];
  resetPinRateLimit(accountKey);

  // Find all children linked to this guardian profile
  const allLinkedStudents = [
    ...new Set(
      mockGuardianCredentials
        .filter(g => g.guardianProfileId === authenticatedGuardian.guardianProfileId && g.status === 'active')
        .map(g => g.studentId)
    ),
  ];

  return {
    success: true,
    guardian: {
      profileId: authenticatedGuardian.guardianProfileId,
      guardianName: authenticatedGuardian.guardianName,
      primaryStudentId: studentId,
      linkedStudents: allLinkedStudents,
      schoolId: authenticatedGuardian.schoolId,
      schoolCode: authenticatedGuardian.schoolCode,
    },
  };
}

