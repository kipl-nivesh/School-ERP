# Step 16A — Local Security Hardening, SQL Migration Corrections & Database Preflight

**Date:** 2026-11-05  
**Agent:** Google Antigravity  
**Project:** Single School ERP  
**Execution Mode:** LOCAL-ONLY SECURITY HARDENING  
**Safety Protocol:** STRICT SAFETY BOUNDARY — Absolutely Zero SQL Execution, Zero Database Connections, Zero Migrations Applied, Zero Deployments, Zero Git Operations. Step 16B has not started.

---

## 1. Executive Summary

**LOCAL SECURITY HARDENING AND PREFLIGHT AUDIT COMPLETE.**

In Step 16A, an in-depth security hardening review and preflight validation were conducted across the PostgreSQL database migrations, staff authorization logic, session context lifecycle, Supabase Auth MFA integration boundaries, and database integrity constraints.

### Key Outcomes:
1. **Migrations Preserved with Baseline Integrity:** All three migrations were audited and confirmed syntactically valid and structurally sound. No arbitrary or destructive modifications were made. All three files match their Step 15 baseline SHA-256 hashes.
2. **Staff Authorization & AAL2 Boundaries Hardened:** Verified that Super Admin is strictly an Admin tier and never a sixth role. Active Super Admin access strictly requires an active, unexpired Admin membership and verified AAL2 MFA across all staff contexts.
3. **Session Context Lifecycle Verified:** Audit of `public.activate_staff_context()` and `public.role_contexts` confirmed that revoked contexts cannot be revived in the same provider session (`WHERE revoked_at IS NULL` fail-closed semantics). Stale authorization versions and expired contexts are denied immediately.
4. **Direct Native MFA REST API Boundary Identified as UNRESOLVED:** Supabase Auth (GoTrue) does not provide a pre-enrollment or factor-creation blocking hook. Application Server Actions cannot prevent direct HTTP calls to Supabase Auth's `/auth/v1/factors` REST endpoints. In accordance with strict safety instructions, **this issue is recorded as UNRESOLVED**, and the **live Super Admin MFA lifecycle is marked BLOCKED**.
5. **Feature Flags Preserved:** `STAFF_AUTH_REQUESTS_ENABLED=false` and `LIVE_AUTHENTICATION_ENABLED=false` remain strictly disabled. All five public fictional dashboards remain untouched.
6. **New Test Suite Added:** Created `verification/verify-step16a-security.mjs` containing **28 deterministic regression tests**, all passing.

---

## 2. Exact Files Inspected and Modified

### Files Inspected:
- `supabase/migrations/20261105000100_identity_foundation.sql`
- `supabase/migrations/20261105000200_school_domain.sql`
- `supabase/migrations/20261105000300_staff_security.sql`
- `src/lib/staff/contracts.ts`
- `src/lib/staff/server.ts`
- `src/app/login/staff/actions.ts`
- `src/app/login/staff/staff-login-form.tsx`
- `src/lib/auth/authorization.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/auth/index.ts`
- `src/lib/supabase/config.ts`
- `src/lib/supabase/server.ts`
- `src/proxy.ts`
- `supabase/tests/step-14-rls-plan.json`
- `supabase/STEP-14-REVIEW.md`
- `supabase/STEP-15-MIGRATION-AUDIT.md`
- `supabase/STEP-15-FINDINGS.md`
- `supabase/STEP-15-APPLICATION-READINESS.md`
- `STEP-14-REPORT.md`
- `STEP-15-REPORT.md`
- All five public dashboard pages under `src/app/(dashboard)/`

### Files Created:
- `supabase/STEP-16A-SECURITY-FINDINGS.md` — Comprehensive security findings register (SEC-01 through SEC-10).
- `supabase/STEP-16A-MIGRATION-PREFLIGHT.md` — Database migration preflight, invariant enforcement matrix, and rollback protocol.
- `verification/verify-step16a-security.mjs` — 28 automated offline regression and preflight checks.
- `STEP-16A-REPORT.md` — This official report.

### Files Modified:
- *None.* Existing application code, dashboard implementations, and migration SQL files were preserved without modification.

---

## 3. Migration SHA-256 Hashes

| Migration File | Old SHA-256 (Step 15 Baseline) | New SHA-256 (Step 16A) | Status |
| :--- | :--- | :--- | :---: |
| `supabase/migrations/20261105000100_identity_foundation.sql` | `3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c` | `3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c` | **MATCH (Unchanged)** |
| `supabase/migrations/20261105000200_school_domain.sql` | `dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e` | `dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e` | **MATCH (Unchanged)** |
| `supabase/migrations/20261105000300_staff_security.sql` | `0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9` | `0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9` | **MATCH (Unchanged)** |

---

## 4. Security Findings & Classification

| ID | Title | Severity | Status | Summary |
| :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | Direct Native Supabase Auth MFA REST Endpoint Exposure | **HIGH** | **UNRESOLVED / BLOCKED** | GoTrue exposes `/auth/v1/factors` directly. Application Server Actions cannot block direct REST enrollment. Live Super Admin MFA lifecycle is **BLOCKED**. |
| **SEC-02** | Stale Context Reactivation Semantics in SQL `ON CONFLICT` | **MEDIUM** | **RESOLVED (By Design)** | `WHERE revoked_at IS NULL` prevents reviving revoked contexts in the same session. Re-authentication required for fresh session. |
| **SEC-03** | Super Admin Dashboard Access Exception in `activate_staff_context()` | **LOW** | **JUSTIFIED / PRESERVED** | Bounded exception allows active Super Admin with active Admin role and AAL2 to access `/admin/dashboard`. Matches application contract. |
| **SEC-04** | Hardcoded Project URL in `is_native_staff_request()` | **MEDIUM** | **DOCUMENTED REQUIREMENT** | Issuer pinned to `https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1`. Environment prerequisite for execution. |
| **SEC-05** | Direct Dependencies on GoTrue Internal Tables | **MEDIUM** | **DOCUMENTED REQUIREMENT** | Definer queries rely on `auth.sessions`, `auth.mfa_factors`, and `auth.users.banned_until`. Target compatibility prerequisite. |
| **SEC-06** | Temporal Non-Overlap Invariants (Enrollments & Teacher Assignments) | **LOW** | **APPLICATION RESPONSIBILITY** | Without `btree_gist`, date range exclusions must be validated in application transactions. |
| **SEC-07** | Relationship Status Verification on `parent_login_identities` | **LOW** | **APPLICATION RESPONSIBILITY** | Foreign keys validate referential match; validating `relationship_status === 'verified'` is an application transaction responsibility. |
| **SEC-08** | Approval Slot Singleton in `staff_mfa_enrollment_approvals` | **INFO** | **DOCUMENTED ARCHITECTURE** | `profile_id uuid primary key` enforces 1 active approval slot per user; historical audits preserved in `audit_events`. |
| **SEC-09** | Potential PostgreSQL Default `PUBLIC` EXECUTE Privileges on New Functions | **LOW** | **HARDENED** | All 7 functions explicitly revoke execute from `public` and `anon`; `app_private` functions revoke from `authenticated`. |
| **SEC-10** | Absence of Financial Persistence Schema | **INFO** | **SCOPE BOUNDARY** | Financial calculations remain in memory contracts; ledger tables will be defined in a future domain milestone. |

---

## 5. Security Decisions and Rationale

1. **Live Super Admin MFA Marked BLOCKED (SEC-01):**  
   We refuse to invent non-existent Supabase Auth Hooks or claim that application-level checks secure direct provider endpoints. Because Supabase Auth natively accepts direct factor enrollment requests from any authenticated AAL1 bearer, live Super Admin MFA cannot be guaranteed provider-wide without an API gateway or custom JWT hook. Live authentication remains disabled.
2. **Context Revocation Immutability (SEC-02):**  
   `activate_staff_context()` uses `ON CONFLICT (id) DO UPDATE ... WHERE public.role_contexts.revoked_at is null;`. When a context is revoked, this update condition fails closed (`FOUND = false`), preventing reviving a revoked context in the same provider session. This enforces a strict re-authentication boundary.
3. **Super Admin Module Exception Preserved (SEC-03):**  
   The exception in `activate_staff_context()` allowing active Super Admins with active Admin role and AAL2 to view the Admin dashboard (even with an empty permissions array) was preserved because it directly mirrors the application contract in `src/lib/auth/authorization.ts` line 60 and is tightly guarded.
4. **Zero Destructive Migration Rewriting:**  
   The three migration files are clean, strictly ordered, enforce default-deny RLS across all 18 tables, and revoke ordinary grants. They were preserved with their historical Step 15 hashes.

---

## 6. Offline Verification Tests Executed

| Test Command | Checks Passed | Result / Details |
| :--- | :---: | :--- |
| `node verification/verify-step16a-security.mjs` | **28** | **PASS** — Staff auth, AAL2, stale/expired/revoked context rejection, parent singleton simulation, definer search paths, dashboard preservation. |
| `node verification/verify-step15-sql.mjs` | **35** | **PASS** — Full static migration audit suite, table catalog, FK references, RLS enable/force. |
| `node verification/verify-step14-sql.mjs` | **30** | **PASS** — Step 14 SQL baseline assertions. |
| `node verification/verify-staff-auth.mjs` | **82** | **PASS** — Mocked SDK and database staff security checks. |
| `node verification/verify-supabase-config.mjs` | **25** | **PASS** — Offline configuration validation and static checks. |
| `node verification/verify-auth-foundation.mjs` | **81** | **PASS** — Step 12 deterministic authentication contract groups. |
| `node verification/verify-auth-contracts.mjs` | **44** | **PASS** — Deterministic authorization contract groups. |
| Dashboard mock data scripts (5 scripts) | **5** | **PASS** — Admin, Teacher, Student, Parent, Accountant fictional data verified. |
| `npx.cmd eslint .` | Whole project | **PASS (0 errors, 0 warnings)** |
| `npm.cmd run typecheck` | Whole project | **PASS (TypeScript 6.0.3 strictly clean)** |
| `npm.cmd run build` | Next.js production | **PASS (Webpack production build exited with code 0)** |

---

## 7. Live Tests Status

### **ALL LIVE TESTS: NOT RUN — REQUIRES SEPARATE AUTHORIZATION**

The 20 integration scenarios in `supabase/tests/step-14-rls-plan.json` (`R01` through `R20`), including live RLS denial, multi-role data isolation, concurrent parent eligibility races, and genuine provider MFA verification, remain **NOT RUN**.

No synthetic accounts, real JWTs, or database connections were utilized.

---

## 8. Confirmations of Strict Safety Boundaries

1. **Confirmation of No SQL Execution:**  
   **CONFIRMED.** Absolutely zero SQL statements were executed against any database (hosted Supabase, local PostgreSQL, or containerized databases). Zero migrations were pushed, applied, or reset.
2. **Confirmation of No Database Connection:**  
   **CONFIRMED.** No network requests to `https://yedvkcwkflhbqumjwknh.supabase.co` or any PostgreSQL port occurred.
3. **Confirmation of No Secrets or Real Credentials Used:**  
   **CONFIRMED.** No service-role keys, database passwords, real PINs, or live auth tokens were read, generated, or stored.
4. **Confirmation of No Git or Deployment Operations:**  
   **CONFIRMED.** No git commit, push, pull, merge, rebase, checkout, or branch switch was executed. No deployment was initiated.
5. **Confirmation of Disabled Authentication:**  
   **CONFIRMED.** `STAFF_AUTH_REQUESTS_ENABLED=false` and `LIVE_AUTHENTICATION_ENABLED=false` remain strictly off.
6. **Confirmation Step 16B Has Not Started:**  
   **CONFIRMED.** Step 16B has not been initiated.

---

## 9. Readiness Decision

### **OUTCOME: A — READY FOR SEPARATELY AUTHORIZED ISOLATED MIGRATION**

The offline schema preflight and security hardening review confirm that the three migrations are structurally sound, completely default-deny, and ready for execution against an **isolated test database** once separately authorized by the owner.

### Critical Operational Constraints:
- **Isolated Target Only:** Migrations must never be applied to production without prior isolated proof.
- **Super Admin Live MFA Remains BLOCKED:** Live staff authentication must remain disabled until a provider-wide MFA lifecycle mechanism (e.g. API gateway or Custom Access Token Hook) is approved and deployed.
- **Student/Parent Live PIN Auth Remains Disabled:** The six-digit remote PIN security model is not yet approved.

---

## 10. Next Steps Requiring Explicit Owner Authorization

1. Review `supabase/STEP-16A-SECURITY-FINDINGS.md` and approve the proposed API Gateway / JWT Hook design for SEC-01.
2. Explicitly authorize connection to a designated isolated development/staging Supabase instance.
3. Apply migrations `20261105000100`, `20261105000200`, and `20261105000300` against that isolated target.
4. Execute the 20 live integration tests in `supabase/tests/step-14-rls-plan.json` with synthetic test accounts.
5. Authorize the operator ceremony for initial Super Admin bootstrap and approval row issuance.
