import 'server-only';
import type { PortalCallback } from './portal-auth-adapter';
import { createPortalAuthenticationAdapter } from './portal-auth-adapter';
import type { TrustedParentLookupSnapshot } from './parent-identity';
import { resolveInitialParent } from './parent-identity';
import type { ParentRelationship } from '../parent/dashboard-repository';
import { validateGuardianRelationship } from '../parent/dashboard-repository';

// =============================================================================
// Standard Generic Security Messages — NEVER leak account existence
// =============================================================================
export const PORTAL_GENERIC_ERROR = 'Authentication failed. Please check your credentials or contact the school office.';
export const PORTAL_DISABLED_MESSAGE = 'Portal sign-in is currently unavailable.';
export const PORTAL_RATE_LIMIT_ERROR = 'Too many failed login attempts. Please wait before trying again.';
export const PORTAL_SECURITY_BLOCK_ERROR = 'Authentication blocked for security. Please contact the administrator.';

// =============================================================================
// 1. CSRF & PKCE State Interface and Verification
// =============================================================================

export interface PortalAuthState {
  readonly transactionId: string;
  readonly state: string;
  readonly codeVerifier: string;
  readonly role: 'student' | 'parent';
  readonly schoolId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly consumed: boolean;
}

export function verifyCsrfAndStateCorrelation(
  storedState: PortalAuthState | null | undefined,
  callback: PortalCallback,
  cookieStateToken: string | null | undefined,
  now: number = Date.now(),
): { readonly valid: true; readonly state: PortalAuthState } | { readonly valid: false; readonly reason: string } {
  if (!storedState) return { valid: false, reason: 'missing_stored_state' };
  if (storedState.consumed) return { valid: false, reason: 'state_already_consumed' };
  if (storedState.expiresAt <= now) return { valid: false, reason: 'state_expired' };
  if (storedState.transactionId !== callback.transactionId) return { valid: false, reason: 'transaction_id_mismatch' };
  if (storedState.state !== callback.state) return { valid: false, reason: 'state_token_mismatch' };
  if (!cookieStateToken || cookieStateToken !== storedState.state) return { valid: false, reason: 'csrf_cookie_mismatch' };
  return { valid: true, state: storedState };
}

// =============================================================================
// 2. Persistent Rate Limiting Contracts (Backing public.auth_rate_limits)
// =============================================================================

export interface PersistentRateLimitRecord {
  readonly key: string;
  readonly bucket: string;
  readonly attemptCount: number;
  readonly lockedUntil: number | null;
  readonly firstAttemptAt: number;
  readonly lastAttemptAt: number;
}

export interface RateLimitCheckResult {
  readonly allowed: boolean;
  readonly remainingAttempts: number;
  readonly locked: boolean;
  readonly retryAfterSeconds: number;
}

/**
 * Pure rate limit evaluator backed by persistent storage schema (migration 6).
 * Enforces maximum failed attempts and lockout duration across distributed instances.
 */
export function evaluatePersistentRateLimit(
  record: PersistentRateLimitRecord | null | undefined,
  maxAttempts: number = 5,
  windowDurationMs: number = 30 * 60 * 1000,
  now: number = Date.now(),
): RateLimitCheckResult {
  if (!record) {
    return { allowed: true, remainingAttempts: maxAttempts, locked: false, retryAfterSeconds: 0 };
  }
  // Check active lockout
  if (record.lockedUntil !== null && record.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      locked: true,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }
  // Check if observation window expired
  if (now - record.firstAttemptAt > windowDurationMs) {
    return { allowed: true, remainingAttempts: maxAttempts, locked: false, retryAfterSeconds: 0 };
  }
  const remaining = Math.max(0, maxAttempts - record.attemptCount);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    locked: remaining === 0,
    retryAfterSeconds: 0,
  };
}

// =============================================================================
// 3. Parent Recovery Protection Contracts
// =============================================================================

export interface ParentRecoveryAttempt {
  readonly recoverySessionId: string;
  readonly registration: string;
  readonly schoolId: string;
  readonly guardianProfileId: string;
  readonly amr: readonly string[];
  readonly recoveryClaim: boolean;
}

/**
 * Strict evaluation of Parent recovery attempt.
 * Enforces that recovery sessions CANNOT bypass guardian identity and relationship verification.
 */
export function evaluateParentRecoveryAttempt(
  attempt: ParentRecoveryAttempt,
  snapshot: TrustedParentLookupSnapshot,
  relationships: readonly ParentRelationship[],
  now: number = Date.now(),
): { readonly allowed: true } | { readonly allowed: false; readonly reason: string } {
  // 1. Recovery tokens CANNOT grant direct portal session
  if (attempt.recoveryClaim || attempt.amr.includes('recovery') || attempt.amr.includes('password_recovery')) {
    return { allowed: false, reason: 'recovery_token_cannot_bypass_portal_auth' };
  }
  // 2. Initial parent lookup must resolve single active guardian
  const initial = resolveInitialParent(snapshot, attempt.registration, now);
  if (initial.kind !== 'resolved_contract' || initial.profileId !== attempt.guardianProfileId) {
    return { allowed: false, reason: 'unverified_guardian_identity' };
  }
  // 3. Must possess at least one verified active relationship for this school
  const validLink = relationships.find(r =>
    r.guardianId && r.schoolId === attempt.schoolId &&
    validateGuardianRelationship(r, attempt.schoolId, now, ['children.academics.read', 'children.fees.read']).valid
  );
  if (!validLink) {
    return { allowed: false, reason: 'no_verified_relationship' };
  }
  return { allowed: true };
}

// =============================================================================
// 4. Server-Side Portal Route Service
// =============================================================================

export interface PortalRouteServiceDependencies {
  readonly adapter: ReturnType<typeof createPortalAuthenticationAdapter>;
  readonly checkRateLimit: (key: string) => Promise<RateLimitCheckResult>;
  readonly recordFailedAttempt: (key: string) => Promise<void>;
  readonly resetRateLimit: (key: string) => Promise<void>;
  readonly readAuthState: (transactionId: string) => Promise<PortalAuthState | null>;
  readonly consumeAuthState: (transactionId: string) => Promise<boolean>;
  readonly issueSessionCookie: (sessionId: string, expiresAt: number) => Promise<boolean>;
  readonly clearSessionCookie: () => Promise<void>;
  readonly liveAuthEnabled?: boolean;
  readonly now?: () => number;
}

export interface PortalRouteResult {
  readonly success: boolean;
  readonly message: string;
  readonly destination?: string;
  readonly blocked?: boolean;
}

export function createPortalRouteService(deps: PortalRouteServiceDependencies) {
  const liveEnabled = deps.liveAuthEnabled ?? false;
  const now = deps.now ?? Date.now;

  async function handleCallback(
    role: 'student' | 'parent',
    callback: PortalCallback,
    csrfCookieToken?: string,
  ): Promise<PortalRouteResult> {
    // 1. Live Login Gating: Gated fail-closed
    if (!liveEnabled) {
      return { success: false, message: PORTAL_DISABLED_MESSAGE };
    }

    const rateLimitKey = `${role}:${callback?.transactionId || 'unknown'}`;

    // 2. Persistent Rate Limit Check
    const rateCheck = await deps.checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed || rateCheck.locked) {
      return { success: false, message: PORTAL_RATE_LIMIT_ERROR };
    }

    // 3. CSRF & State Verification
    const storedState = callback?.transactionId ? await deps.readAuthState(callback.transactionId) : null;
    const stateCheck = verifyCsrfAndStateCorrelation(storedState, callback, csrfCookieToken, now());
    if (!stateCheck.valid) {
      await deps.recordFailedAttempt(rateLimitKey);
      return { success: false, message: PORTAL_GENERIC_ERROR };
    }

    // 4. State Replay Protection (Consume state)
    const consumed = await deps.consumeAuthState(callback.transactionId);
    if (!consumed) {
      await deps.recordFailedAttempt(rateLimitKey);
      return { success: false, message: PORTAL_GENERIC_ERROR };
    }

    // 5. Invoke Server-Only Portal Adapter
    const completion = role === 'student'
      ? await deps.adapter.completeStudent(callback)
      : await deps.adapter.completeParent(callback);

    // 6. Handle Security Block (Revocation compensation failed)
    if (completion.kind === 'blocked') {
      await deps.recordFailedAttempt(rateLimitKey);
      await deps.clearSessionCookie();
      return {
        success: false,
        message: PORTAL_SECURITY_BLOCK_ERROR,
        blocked: true,
      };
    }

    // 7. Handle Normal Denial
    if (completion.kind === 'denied') {
      await deps.recordFailedAttempt(rateLimitKey);
      return { success: false, message: PORTAL_GENERIC_ERROR };
    }

    // 8. Handle Success: Reset rate limits, issue cookie, return destination
    await deps.resetRateLimit(rateLimitKey);
    const sessionExpiry = completion.session.expiresAt;
    const issued = await deps.issueSessionCookie(completion.session.sessionId, sessionExpiry);
    if (!issued) {
      await deps.clearSessionCookie();
      return { success: false, message: PORTAL_GENERIC_ERROR };
    }

    return {
      success: true,
      message: 'Authentication successful.',
      destination: role === 'student' ? '/student/dashboard' : '/parent/dashboard',
    };
  }

  return {
    handleStudentCallback: (callback: PortalCallback, csrfCookieToken?: string) =>
      handleCallback('student', callback, csrfCookieToken),
    handleParentCallback: (callback: PortalCallback, csrfCookieToken?: string) =>
      handleCallback('parent', callback, csrfCookieToken),
  };
}
