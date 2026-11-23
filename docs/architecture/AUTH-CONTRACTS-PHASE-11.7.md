# Phase 11.7 Student and Parent Authentication Contracts & Blocker Analysis

## 1. Executive Summary & Objective

Phase 11.7 establishes rigorous, offline-verifiable application-side authentication contracts for Student and Parent portals, audits local database migration contracts, prevents recovery session misuse, preserves Staff authentication and School Admin AAL2/TOTP isolation, and identifies fundamental SQL helper incompatibilities at the database boundary.

In accordance with strict safety rules:
- **Production Supabase project (`yedvkcwkflhbqumjwknh`) and disposable project (`etlahjbwylasudkuqozc`) are untouched.** No remote database connections or queries were made.
- **Zero database writes or migration executions.**
- **No live authentication or operational ERP writes enabled.** Public Student sign-in (`/login/student`) and Parent sign-in (`/login/parent`) actions remain strictly disabled (`phase: 'error', message: '... sign-in is currently unavailable.'`).
- **Demo lock and preview dashboards remain intact.**

---

## 2. Student Authentication Audit & Foundations

### 2.1 Credential Verification & PBKDF2 Architecture
Student authentication relies on Student ID + 6-digit PIN. Foundations in `src/lib/auth/pin-service.ts` and `src/lib/student/identity-contracts.ts` implement:
1. **Cryptographic Algorithm:** PBKDF2 with HMAC-SHA256, 100,000 iterations, 32-byte derived key length.
2. **Salt & Pepper:** Unique 16-byte cryptographically random salt per credential; combined with a server-held pepper (`AUTH_PIN_PEPPER`).
3. **Timing Attack Resistance:** Constant-time comparison using `crypto.timingSafeEqual` and dummy hash computation (`hashPin('000000', '0000000000000000')`) when a candidate is missing, ensuring equalized response times.
4. **Rate Limiting:** Durable sliding-window rate limiting on account key (`student:${schoolCode}:${studentId}`) and client IP (`ip:${clientIp}`), enforcing a maximum of 5 attempts, a 15-minute lockout window (`LOCKOUT_DURATION_MS = 900,000`), and a 30-minute observation window.

### 2.2 Local Migration Audit (`pin_credentials`)
Inspection of `supabase/migrations/20261105000600_pin_authentication_and_rate_limiting.sql` revealed:
- The table `public.pin_credentials` defines: `id`, `profile_id`, `credential_namespace` ('student', 'parent'), `student_id`, `pin_hash`, `salt`, `iterations`, `algorithm`, `status` ('active', 'locked', 'revoked'), `failed_attempts`, `locked_until`, `expires_at`, `created_at`, `updated_at`.
- **CRITICAL SCHEMA GAP / BLOCKER:** `public.pin_credentials` lacks a `credential_version` column.
- Application-side contracts (`StudentSessionEvidence`, `resolveStudentIdentity`) require `credentialVersion: number` and `session.credentialVersion === currentCredentialVersion`.
- **Rotation Contract:** In Phase 11.7, `rotateStudentPinCredentialRecord` formally models credential rotation: increments `credentialVersion`, regenerates salt and hash, and resets lockout counters. Any active session retaining the previous `credentialVersion` is immediately denied.
- **Revocation Contract:** `revokeStudentPinCredentialRecord` transitions status to `'revoked'`. `verifyStudentPinCredentialRecord` immediately rejects revoked credentials, preventing any session issuance or binding.

### 2.3 Secure Native Supabase Session Issuance Requirements
A standalone Keycloak token or client-supplied assertion cannot authorize Student portal access. Native session issuance requirements:
1. **Exchange Seam:** Server-side atomic exchange verifying format, durable rate limits, and PBKDF2 verifier against active credential record.
2. **Identity Binding:** The session must be bound to:
   - `studentId`, `schoolId`, `profileId`, `credentialVersion`.
   - Student profile active, school active, student active, portal active, entitlement active.
   - `studentMembership === true` AND `staffMembership === false` (strictly preventing Staff privilege leakage or cross-role confusion).
3. **Cross-School Identity Isolation:** If identical student IDs exist across multiple schools (multi-tenant collision), explicit school code is mandated; students cannot authenticate across school boundaries.
4. **Session Window:** Session expiry is bounded by the lesser of the JWT expiration and live database session expiration (`Math.min(exp * 1000, live.expiresAt)`).

---

## 3. Parent Authentication Audit & Foundations

### 3.1 Guardian Identity Verification
Parent authentication foundations in `src/lib/auth/parent-identity.ts` and `src/lib/parent/dashboard-repository.ts` mandate:
1. **Verified Guardian Principal:** Authenticated provider subject must map to a canonical guardian profile in the school (`guardian.profileId === session.profileId`).
2. **Active Profile & School Context:** The guardian profile must be active, with an active school context (`activeSchoolContext === true`) and no staff membership (`staffMembership === false`).
3. **Dashboard Permission:** Access requires the explicit permission `dashboard.parent.view`.

### 3.2 Active Parent-Child Relationship Contracts
Parent-child relationships (`student_guardian_relationships` in migration `20261105000200` and `20261111002000`) must satisfy:
1. **Status:** Must be `'verified'`. Pending (`'pending'`) or revoked (`'revoked'`) relationships are immediately rejected.
2. **School Binding:** The relationship `schoolId` and `studentSchoolId` must strictly match the active session `schoolId`. Foreign-school children are denied even if linked to the same guardian.
3. **Active Student:** The linked student must be active (`studentActive === true`).
4. **Temporal Validity:** `validFrom <= now` and `(validUntil === null || validUntil > now)`. Expired relationships fail closed.
5. **Relationship Versioning:** `version === currentVersion` with positive integer version. Stale or altered relationship records fail closed.

### 3.3 Separation of Academic and Finance Permissions
In strict compliance with migration 20 (`parent_access_purposes.sql`):
1. **Dual-Key Authorization:** Access to child data requires BOTH the relationship flag AND the authenticated parent permission:
   - Academic: `relationship.academicAccess === true` AND `permissions.includes('children.academics.read')`.
   - Finance: `relationship.feeAccess === true` AND `permissions.includes('children.fees.read')`.
2. **Panel Withholding:**
   - Academic-only guardian: Fee panel reports `kind: 'unavailable'`, completely withholding invoices and receipts.
   - Fee-only guardian: Academic panels (placement, attendance, timetable, homework, exams, results, announcements) report `kind: 'unavailable'`.
   - Neither purpose granted: Relationship is ineligible; request fails closed (`kind: 'unavailable'`).
3. **Multi-Child Resolution:** When a guardian has multiple verified children in the school, the dashboard returns `kind: 'choose-child'`. Only when an eligible child is specifically selected does the reader query and project that child's scoped data.

---

## 4. Shared Authentication Contracts & Database Incompatibilities

### 4.1 SQL Helper Incompatibilities
A detailed audit of the local SQL migrations revealed critical incompatibilities between Staff context helpers and Student/Parent authentication:

| SQL Routine | Source Migration | Implementation Constraint | Impact on Student / Parent |
| :--- | :--- | :--- | :--- |
| `public.current_school_id()` | `20261106001000` (10) | Calls `public.staff_session_is_live()`. | Evaluates to `NULL` for all non-staff sessions. |
| `public.staff_session_is_live()` | `20261105000300` (3) | Calls `public.is_native_staff_request()` and checks `auth.users.email_confirmed_at is not null`. | Evaluates to `FALSE` because Student/Parent sessions do not use email/password auth. |
| `public.is_native_staff_request()` | `20261105000300` (3) | Requires `auth.jwt()->'amr'` method to contain `{"method": "password"}` and specific staff issuer. | Evaluates to `FALSE` for Student PIN or Parent OTP/OIDC sessions. |
| `public.current_active_role()` | `20261111001800` (18) | Requires `public.current_school_id() = rc.school_id`. | Evaluates to `NULL` because `current_school_id()` is `NULL`. |
| `public.current_role_has_permission()` | `20261111001800` (18) | Requires `public.current_school_id() is not null`. | Evaluates to `FALSE` because `current_school_id()` is `NULL`. |
| `public.parent_student_purpose()` | `20261111002000` (20) | Requires `current_active_role() = 'parent'` AND `current_school_id() is not null`. | Evaluates to `FALSE` for all Parent queries, causing restrictive RLS policies to deny all rows. |
| `public.get_student_subscription_access()` | `20261111002000` (20) | Starts with `school:=public.current_school_id(); if school is null then raise exception 'Access denied' using errcode='42501';`. | Throws exception `42501 Access denied` on any Student or Parent invocation. |

### 4.2 Architectural Decision
1. **No Synthetic Bypass:** The application must NOT fabricate password AMR claims, spoof Staff session headers, or synthesize SQL context to circumvent `current_school_id()`.
2. **Preserve Staff MFA & Authorization:** Staff authentication (School Admin AAL2/TOTP, Teacher, Accountant) remains completely isolated and intact.
3. **Keep Portal Login Disabled:** Actual Student and Parent login actions in `src/app/login/student/actions.ts` and `src/app/login/parent/actions.ts` remain disabled until an approved, dedicated portal context mechanism (separate from Staff liveness) is designed and migrated.

---

## 5. Recovery-Only Session Misuse Prevention

In Supabase GoTrue, password recovery and OTP recovery links issue tokens where `amr` contains `{"method": "recovery"}` or `{"method": "password_recovery"}` or `{"method": "otp_recovery"}`.
- In `src/lib/auth/portal-session.ts`, `verifyPortalSupabaseSession` now explicitly inspects `claims.amr` and rejects any token containing recovery methods, or with `recovery === true` / `type === 'recovery'`.
- Recovery tokens cannot be misused to enter Student or Parent portal sessions.

---

## 6. Offline Verification Suite

A dedicated verification test suite `verification/verify-portal-auth-contracts.mjs` was created and executed alongside the full existing regression suite. All 183 tests pass cleanly.

Test coverage areas:
1. **Invalid Student PIN evidence:** Rejects empty, malformed, non-6-digit PIN, mismatched hash, invalid version, locked credential, revoked credential, expired credential.
2. **Expired and revoked sessions:** Rejects expired tokens, expired live sessions, revoked live sessions, revoked credential versions, rotated PIN sessions.
3. **Wrong user roles:** Rejects Student session requesting Parent role, Parent session requesting Student role, Staff roles entering portal session verifier, candidates with staff membership.
4. **Foreign-school records:** Rejects cross-school student binding, cross-school enrollments, foreign homework/results/receipts in projection, foreign-school child links for guardians.
5. **Unauthorized Student access:** Rejects unentitled students, inactive students/schools/profiles/portals, student ID collisions without school code.
6. **Invalid guardian-child relationships:** Rejects pending relationships, missing IDs, guardian profile mismatches, inactive students, non-existent child IDs.
7. **Revoked parent-child relationships:** Rejects revoked relationships, expired custody windows (`validUntil <= now`), stale relationship versions.
8. **Missing academic or finance permissions:** Enforces dual-key flags and permissions, verifies panel withholding for single-purpose guardians, rejects zero-purpose guardians.
9. **Unauthorized school context:** Rejects inactive school context, mismatched school ID, documents SQL helper incompatibilities.
10. **Recovery-only session misuse:** Rejects tokens containing recovery AMR methods or recovery markers.
11. **Staff MFA regression protection:** Verifies Admin AAL1 denial, Admin AAL2/TOTP enforcement, Teacher/Accountant isolation.
