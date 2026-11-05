# Step 15 — Security & Schema Findings Register

**Date:** 2026-11-05  
**Review Type:** Option A — Full Local SQL Audit and Review Only  
**Safety Protocol:** STRICT SAFETY BOUNDARY — No SQL Execution, No Remote Connection, No Migrations Applied.

---

## Findings Summary

| Finding ID | Title | Severity | Status |
| :--- | :--- | :--- | :--- |
| **F-01** | Hardcoded Project Issuer URL in `is_native_staff_request()` | MEDIUM | Documented Constraint (Preserved) |
| **F-02** | Dependency on Internal Supabase Auth Tables (`auth.sessions`, `auth.mfa_factors`) | MEDIUM | Documented Target Requirement |
| **F-03** | Direct Native Supabase Auth MFA Lifecycle vs. Application Approval Table | MEDIUM | Documented Architectural Boundary |
| **F-04** | Super Admin Bootstrap & Approval Creation Workflows Deferred | LOW | Documented Operator Requirement |
| **F-05** | Absence of Financial Ledger Tables in Prepared Schema | INFORMATIONAL | Verified Scope Boundary |
| **F-06** | School Domain Tables Default-Deny (Zero Ordinary Policies) | INFORMATIONAL | Verified Defense-in-Depth |
| **F-07** | Relationship Verification Invariant Requires Application Transaction | LOW | Documented Application Responsibility |
| **F-08** | Non-Idempotent Migration Scripts Requiring Clean Target | LOW | Verified Transactional Integrity |
| **F-09** | Text Length and Collation Checks on Sensitive Domain Identifiers | INFORMATIONAL | Verified Positive Security Control |
| **F-10** | Audit Log Tamper-Resistance Boundaries (Application vs. DB Superuser) | INFORMATIONAL | Documented Trust Boundary |
| **F-11** | Universal AAL2 Enforcement on Super Admin Context Activation | INFORMATIONAL | Verified Positive Security Control |

---

## Detailed Findings

### Finding F-01: Hardcoded Project Issuer URL in `is_native_staff_request()`
- **Severity:** MEDIUM
- **Affected File & Line Range:** `supabase/migrations/20261105000300_staff_security.sql`, lines 9–14
- **Problem:** `public.is_native_staff_request()` contains a hardcoded issuer check:
  `select coalesce(auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1' ...`
- **Security or Functional Impact:** If migrations are executed on an instance other than the designated development project (e.g. local Supabase CLI, preview environment, or production replacement), `auth.jwt()->>'iss'` will not match the hardcoded string, causing `is_native_staff_request()` to evaluate to `false`. This fails closed by blocking all staff authentication and metadata reads.
- **Evidence:** Line 11: `auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'`. Migration comment: `-- Native issuer pinned to this owner-designated development project. Review before any other target.`
- **Proposed Correction:** Maintain the pinned issuer for the designated development project (`yedvkcwkflhbqumjwknh`). For multi-environment portability in future steps, parameterize the issuer via database configuration or environment substitution prior to execution.
- **Whether Corrected Locally:** Preserved as designed; logged as an environment dependency.
- **Verification Performed:** Static validation in `verify-step14-sql.mjs` and `verify-step15-sql.mjs`; cross-checked with `.env.example`.
- **Residual Risk:** Portability failure if applied to an uncoordinated project URL.
- **Whether Live Testing is Required:** Yes, upon deployment to an isolated target.

---

### Finding F-02: Dependency on Internal Supabase Auth Tables (`auth.sessions`, `auth.mfa_factors`)
- **Severity:** MEDIUM
- **Affected File & Line Range:** `supabase/migrations/20261105000300_staff_security.sql`, lines 21–25, line 53
- **Problem:** The SQL functions `staff_session_is_live()` and `consume_staff_mfa_enrollment_approval()` query internal GoTrue tables (`auth.sessions`, `auth.users`, and `auth.mfa_factors`).
- **Security or Functional Impact:** While standard Supabase exposes `auth.users`, `auth.sessions` and `auth.mfa_factors` are managed by the GoTrue engine. If upstream Supabase alters column types or schema conventions in a future major update, these definer functions could break.
- **Evidence:** Lines 22–24: `select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id::text=auth.jwt()->>'session_id' ...`; Line 53: `from auth.mfa_factors where user_id=auth.uid() and status='verified'`.
- **Proposed Correction:** Document target engine requirements. Before running migrations on any hosted Supabase instance, verify that the GoTrue version matches expected schema definitions (`auth.sessions.id`, `auth.users.banned_until`, `auth.mfa_factors.status`).
- **Whether Corrected Locally:** Documented as a target-state prerequisite; no DDL change warranted as this avoids application policy recursion.
- **Verification Performed:** GoTrue documentation and public schema review.
- **Residual Risk:** GoTrue schema drift across major Supabase platform updates.
- **Whether Live Testing is Required:** Yes, schema introspection on isolated target.

---

### Finding F-03: Direct Native Supabase Auth MFA Lifecycle vs. Application Approval Table
- **Severity:** MEDIUM
- **Affected File & Line Range:** `supabase/migrations/20261105000300_staff_security.sql`, lines 32–44, 45–73; `src/app/login/staff/actions.ts`, lines 23–45
- **Problem:** The application enforces that Super Admins must consume a short-lived independent approval (`staff_mfa_enrollment_approvals`) via `consume_staff_mfa_enrollment_approval()` before enrolling a TOTP factor via `enrollStaffMfa()`. However, the Supabase Auth API natively exposes direct factor enrollment endpoints (`/auth/v1/factors`) to any bearer of an authenticated JWT.
- **Security or Functional Impact:** Direct HTTP calls to Supabase Auth's REST endpoints could theoretically enroll an MFA factor without consuming a database approval row unless restricted at the provider level.
- **Evidence:** `STEP-14-REVIEW.md` line 29: "These application checks do not govern direct calls to Supabase Auth's MFA endpoints."
- **Proposed Correction:** Deploy Supabase Auth Hooks (e.g. `mfa_verification_attempt` or pre-enrollment hooks) or configure provider MFA settings once live integration is separately authorized.
- **Whether Corrected Locally:** Documented as an integration gate; cannot be resolved purely by PostgreSQL application table DDL.
- **Verification Performed:** Code and architectural review.
- **Residual Risk:** Direct API factor enrollment bypass until Auth Hooks are deployed.
- **Whether Live Testing is Required:** Yes, with genuine JWT sessions in an isolated environment.

---

### Finding F-04: Super Admin Bootstrap & Approval Creation Workflows Deferred
- **Severity:** LOW
- **Affected File & Line Range:** `supabase/migrations/20261105000300_staff_security.sql`, lines 31–44
- **Problem:** The schema defines `staff_mfa_enrollment_approvals` and `consume_staff_mfa_enrollment_approval()`, but provides zero endpoints or SQL functions for *creating* approval rows or onboarding the initial Super Admin.
- **Security or Functional Impact:** This is an intentional security boundary: normal users cannot issue approvals. However, a newly initialized database will lack an initial Super Admin until an out-of-band operator ceremony runs.
- **Evidence:** Line 31: `-- Approval creation is deliberately absent: independently reviewed operator workflow required.`
- **Proposed Correction:** Formulate the official operator CLI/bootstrap script in a subsequent authorized step.
- **Whether Corrected Locally:** Confirmed intentional; no change to migration.
- **Verification Performed:** Cross-referenced with `docs/architecture/SUPER-ADMIN-BOOTSTRAP-PLAN.md`.
- **Residual Risk:** Operational dependency on operator onboarding ceremony.
- **Whether Live Testing is Required:** Yes.

---

### Finding F-05: Absence of Financial Ledger Tables in Prepared Schema
- **Severity:** INFORMATIONAL
- **Affected File & Line Range:** `supabase/migrations/20261105000200_school_domain.sql`
- **Problem:** The prepared schema contains no financial ledger, invoice, payment, or fee tables.
- **Security or Functional Impact:** Financial integrity contracts in `src/lib/auth/authorization.ts` enforce immutable integer-paise math in memory, but no persistent tables exist yet in the database.
- **Evidence:** `supabase/STEP-14-REVIEW.md` line 21: "No financial write path or ledger is introduced; existing financial-integrity contracts remain unchanged."
- **Proposed Correction:** Retain as explicit scope distinction; financial tables will be introduced in subsequent domain milestone.
- **Whether Corrected Locally:** Verified and documented.
- **Verification Performed:** Table catalog inspection in `verify-step15-sql.mjs`.
- **Residual Risk:** None.
- **Whether Live Testing is Required:** No.

---

### Finding F-06: School Domain Tables Default-Deny (Zero Ordinary Policies)
- **Severity:** INFORMATIONAL
- **Affected File & Line Range:** `supabase/migrations/20261105000200_school_domain.sql`, lines 75–110
- **Problem:** All 12 school domain tables enable and force RLS and revoke all grants. No allowing policies exist.
- **Security or Functional Impact:** Zero risk of data leakage. Ordinary clients cannot query student, teacher, or class records until domain policies are implemented.
- **Evidence:** `20261105000200_school_domain.sql` line 111: `-- Domain reads/writes remain default-deny until verified purpose/assignment/context policies exist.`
- **Proposed Correction:** Maintain default-deny baseline.
- **Whether Corrected Locally:** Confirmed.
- **Verification Performed:** Static assertions in `verify-step14-sql.mjs` and `verify-step15-sql.mjs`.
- **Residual Risk:** None (secure fail-closed).
- **Whether Live Testing is Required:** No.

---

### Finding F-07: Relationship Verification Invariant Requires Application Transaction
- **Severity:** LOW
- **Affected File & Line Range:** `supabase/migrations/20261105000200_school_domain.sql`, lines 42–53
- **Problem:** `parent_login_identities` enforces foreign keys and the singleton partial unique index, but foreign keys cannot validate that `student_guardian_relationships.relationship_status = 'verified'`.
- **Security or Functional Impact:** A direct database write could theoretically set `login_eligible = true` for a relationship that is still `'pending'` or `'revoked'`.
- **Evidence:** Foreign key can only reference unique columns `(id, student_id, guardian_id)`, not non-unique status columns.
- **Proposed Correction:** Ensure that application provisioning actions verify `relationship_status === 'verified'` within their database transactions.
- **Whether Corrected Locally:** Documented as transactional application invariant.
- **Verification Performed:** Constraint analysis.
- **Residual Risk:** Minimal; protected by application DAL and lack of direct write policies.
- **Whether Live Testing is Required:** Yes, during future parent provisioning test suite.

---

### Finding F-08: Non-Idempotent Migration Scripts Requiring Clean Target
- **Severity:** LOW
- **Affected File & Line Range:** All 3 migrations
- **Problem:** The migration files do not use `CREATE TABLE IF NOT EXISTS` or `CREATE OR REPLACE FUNCTION`.
- **Security or Functional Impact:** If run against a database where partial objects exist, the migration will abort and roll back.
- **Evidence:** Migration review notes in `STEP-14-REVIEW.md`.
- **Proposed Correction:** Maintain transactional non-idempotent design. Target database must be verified clean before migration.
- **Whether Corrected Locally:** Confirmed intentional.
- **Verification Performed:** Syntax review.
- **Residual Risk:** None if target is clean.
- **Whether Live Testing is Required:** Yes.

---

### Finding F-09: Text Length and Collation Checks on Sensitive Domain Identifiers
- **Severity:** INFORMATIONAL
- **Affected File & Line Range:** `supabase/migrations/20261105000200_school_domain.sql`, lines 24, 27
- **Problem:** None; positive security control.
- **Security or Functional Impact:** `students.registration_number` uses `collate "C"` to prevent Unicode collation trickery, length bounds (1–128), and regex rejection of ASCII control characters (`!~ '[[:cntrl:]]'`).
- **Evidence:** Line 27: `check (length(registration_number) between 1 and 128 and registration_number !~ '[[:cntrl:]]')`.
- **Proposed Correction:** Maintain.
- **Whether Corrected Locally:** Confirmed.
- **Verification Performed:** Static validation in `verify-step15-sql.mjs`.
- **Residual Risk:** None.
- **Whether Live Testing is Required:** No.

---

### Finding F-10: Audit Log Tamper-Resistance Boundaries
- **Severity:** INFORMATIONAL
- **Affected File & Line Range:** `supabase/migrations/20261105000300_staff_security.sql`, lines 85–94
- **Problem:** Application roles cannot alter `public.audit_events`, but PostgreSQL superusers / infrastructure owners (`BYPASSRLS`) retain database-level capabilities.
- **Security or Functional Impact:** Tamper-resistance is effective against application-level compromise, but infrastructure operators remain a trust boundary.
- **Evidence:** Triggers `audit_events_immutable` and `audit_events_no_truncate`.
- **Proposed Correction:** Document that database administrative credentials must be restricted.
- **Whether Corrected Locally:** Documented.
- **Verification Performed:** Trigger inspection.
- **Residual Risk:** Superuser trust boundary.
- **Whether Live Testing is Required:** No.

---

### Finding F-11: Universal AAL2 Enforcement on Super Admin Context Activation
- **Severity:** INFORMATIONAL
- **Affected File & Line Range:** `supabase/migrations/20261105000300_staff_security.sql`, lines 111–115
- **Problem:** None; positive security control.
- **Security or Functional Impact:** If a user possesses active Super Admin privileges, `activate_staff_context()` demands `aal2` assurance regardless of the role context being activated (Admin, Teacher, or Accountant).
- **Evidence:** Lines 111–115: `if exists(select 1 from public.admin_privileges where profile_id=p.id and privilege_status='active') then if auth.jwt()->>'aal' is distinct from 'aal2' ... then return false; end if; end if;`.
- **Proposed Correction:** Maintain.
- **Whether Corrected Locally:** Confirmed.
- **Verification Performed:** Static validation and cross-check with `src/lib/staff/contracts.ts`.
- **Residual Risk:** None.
- **Whether Live Testing is Required:** Yes, during future genuine AAL2 testing.
