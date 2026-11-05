# Step 15 — Full SQL Migration Audit, RLS Security Review & Database Readiness

**Date:** 2026-11-05  
**Environment / IDE:** Google Antigravity (Migrated from Codex after Step 14)  
**Selected Mode:** OPTION A — FULL LOCAL SQL AUDIT AND REVIEW ONLY  
**Safety Protocol:** STRICT SAFETY BOUNDARY — Absolutely No SQL Execution, No Remote Connection, No Migrations Applied, No Secrets Used, No Deployment, No Git Operations.

---

## 1. Executive Summary

**LOCAL AUDIT AND SECURITY REVIEW COMPLETE.** The three prepared Supabase PostgreSQL database migrations were audited line-by-line, statement-by-statement, table-by-table, and function-by-function.

The schema design provides a hardened, default-deny foundation for the Single School ERP system:
- **18 application tables** declared with explicit primary keys, foreign keys, and check constraints.
- **Default-Deny Enforced:** All 18 tables enable and force Row Level Security (`FORCE ROW LEVEL SECURITY`). Ordinary table grants are strictly revoked from `public`, `anon`, and `authenticated`.
- **4 Self-Scoped Metadata SELECT Policies:** Only authenticated staff callers with verified, live provider sessions can read their own profile, memberships, tier, and session context. Zero write policies exist on any table.
- **Complete Domain Isolation:** All 12 school domain tables (`students`, `guardians`, `enrollments`, etc.) have zero allowing policies, completely preventing data exposure until domain-specific policies are integrated.
- **Anti-Recursion Session Validation:** `public.staff_session_is_live()` directly verifies the caller's session against `auth.sessions` and `auth.users`, avoiding recursive application policy evaluation.
- **Student-Parent Invariant Enforced:** Strict 1:1 singleton relationship enforced via a partial unique index on `parent_login_identities(student_id) where login_eligible` and non-null single-student binding.
- **Audit Immutability:** `public.audit_events` updates, deletes, and truncates are blocked by database triggers raising exceptions.

**Migration Readiness Status:** **A. READY FOR SEPARATELY AUTHORIZED MIGRATION APPLICATION**.
*(No SQL was executed, no database contacted, no migrations applied, no live RLS verified, and production release remains unapproved).*

---

## 2. Exact Migrations Audited

The three unapplied migration files audited in exact sequence:

1. **`supabase/migrations/20261105000100_identity_foundation.sql`**
   - **SHA-256 Hash:** `3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c`
   - **Scope:** 5 identity tables (`roles`, `profiles`, `user_roles`, `admin_privileges`, `role_contexts`), seed of 5 fixed role codes, RLS enabled/forced, ordinary grants revoked.
2. **`supabase/migrations/20261105000200_school_domain.sql`**
   - **SHA-256 Hash:** `dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e`
   - **Scope:** 12 domain tables (`school_configuration`, `staff_profiles`, `academic_years`, `classes`, `sections`, `students`, `guardians`, `student_guardian_relationships`, `parent_login_identities`, `enrollments`, `teacher_assignments`, `audit_events`), partial unique index `parent_login_one_eligible_student`, RLS enabled/forced, ordinary grants revoked.
3. **`supabase/migrations/20261105000300_staff_security.sql`**
   - **SHA-256 Hash:** `0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9`
   - **Scope:** 1 approval table (`staff_mfa_enrollment_approvals`), `user_roles.permissions` array with 45-permission check constraint, `app_private` schema, 5 definer and 2 invoker functions, 4 self-metadata policies, 5 audit/invalidation triggers.

---

## 3. Table-by-Table Findings (All 18 Tables)

| # | Table Name | Migration | PK Type | FK Dependencies | Unique Constraints | RLS / Grants | Audit Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `roles` | `00100` | `code text` | None | PK | Forced / Revoked | **PASS** |
| 2 | `profiles` | `00100` | `id uuid` | `auth.users(id)` | PK | Forced / Self SELECT only | **PASS** |
| 3 | `user_roles` | `00100` | `id uuid` | `profiles`, `roles` | `(profile_id, role_code)`, `(id, profile_id, role_code)` | Forced / Self SELECT only | **PASS** |
| 4 | `admin_privileges` | `00100` | `profile_id uuid` | `user_roles(profile_id, role_code)` | PK | Forced / Self SELECT only | **PASS** |
| 5 | `role_contexts` | `00100` | `id uuid` | `profiles`, `roles`, `user_roles(id, profile_id, role_code)` | PK | Forced / Self SELECT only | **PASS** |
| 6 | `school_configuration` | `00200` | `id boolean` | None | PK (Singleton `check (id)`) | Forced / Revoked | **PASS** |
| 7 | `staff_profiles` | `00200` | `profile_id uuid` | `profiles(id)` | PK | Forced / Revoked | **PASS** |
| 8 | `academic_years` | `00200` | `id uuid` | None | `label` | Forced / Revoked | **PASS** |
| 9 | `classes` | `00200` | `id uuid` | None | `name` | Forced / Revoked | **PASS** |
| 10 | `sections` | `00200` | `id uuid` | `classes(id)`, `academic_years(id)` | `(class_id, academic_year_id, name)`, `(id, academic_year_id)` | Forced / Revoked | **PASS** |
| 11 | `students` | `00200` | `id uuid` | `profiles(id)` (nullable) | `registration_number` (collate "C"), `profile_id` | Forced / Revoked | **PASS** |
| 12 | `guardians` | `00200` | `id uuid` | `profiles(id)` (nullable) | `(id, profile_id)`, `profile_id` | Forced / Revoked | **PASS** |
| 13 | `student_guardian_relationships` | `00200` | `id uuid` | `students(id)`, `guardians(id)` | `(id, student_id, guardian_id)` | Forced / Revoked | **PASS** |
| 14 | `parent_login_identities` | `00200` | `profile_id uuid` | `user_roles`, `guardians(id, profile_id)`, `student_guardian_relationships` | `guardian_id`, partial unique `(student_id) WHERE login_eligible` | Forced / Revoked | **PASS** |
| 15 | `enrollments` | `00200` | `id uuid` | `students(id)`, `academic_years(id)`, `sections(id, academic_year_id)` | PK | Forced / Revoked | **PASS** |
| 16 | `teacher_assignments` | `00200` | `id uuid` | `staff_profiles(profile_id)`, `sections(id, academic_year_id)` | PK | Forced / Revoked | **PASS** |
| 17 | `audit_events` | `00200` | `id uuid` | None (append-only) | PK | Forced / Revoked (Immutable) | **PASS** |
| 18 | `staff_mfa_enrollment_approvals` | `00300` | `profile_id uuid` | `profiles(id)` (target and approver) | PK | Forced / Revoked | **PASS** |

---

## 4. Migration Dependency Findings

- **Topological Integrity:** Migration `00100` defines identity primitives; `00200` introduces domain tables referencing `profiles` and `user_roles`; `00300` adds staff security, permissions array constraint, definer functions, triggers, and self-metadata policies. Zero circular or missing references exist.
- **PostgreSQL Version Assumptions:** Built-in `gen_random_uuid()` requires PostgreSQL 13+. Supabase utilizes PostgreSQL 15/16. Standard collation `"C"` and POSIX regex classes `[:cntrl:]` are standard.
- **Transaction Atomicity:** All three migration files begin with `begin;` and end with `commit;`. A failure on any statement rolls back the entire migration file.
- **Target Schema Assumptions:** Non-idempotent design deliberately fails if target tables already exist, preventing silent partial migrations against dirty schemas.

---

## 5. RLS and Database Grant Findings

- **Forced RLS:** Every table executes `ALTER TABLE public.<name> FORCE ROW LEVEL SECURITY`. This subjects table owners to RLS policies.
- **Ordinary Grants Revoked:** `REVOKE ALL ON TABLE ... FROM public, anon, authenticated` is applied across all 18 tables.
- **Schema Protection:** `REVOKE CREATE ON SCHEMA public FROM public, anon, authenticated` blocks untrusted object creation.
- **Self-Scope SELECT Policies:** Exactly 4 policies exist in the entire schema (`profiles_self_metadata`, `memberships_self_metadata`, `tier_self_metadata`, `contexts_current_session`). Each demands `public.staff_session_is_live() AND profile_id = auth.uid()`.
- **Zero Ordinary Writes:** There are zero INSERT, UPDATE, or DELETE policies for authenticated users on any table.

---

## 6. Security-Definer and Trigger Findings

- **Search Path Isolation:** All 5 `SECURITY DEFINER` functions (`staff_session_is_live`, `consume_staff_mfa_enrollment_approval`, `activate_staff_context`, `revoke_staff_context`, `invalidate_staff_contexts`) and both `SECURITY INVOKER` functions (`is_native_staff_request`, `reject_audit_change`) explicitly set `search_path = ''` to prevent search path hijacking.
- **Ownership:** All security definer functions are explicitly altered: `OWNER TO postgres`.
- **Execution Grants:** Definer functions needed by the client have public/anon execute revoked and are granted exclusively to `authenticated`. Private trigger functions (`invalidate_staff_contexts`, `reject_audit_change`) have all execute rights revoked from public, anon, and authenticated.
- **Audit Immutability:** Triggers `audit_events_immutable` (`BEFORE UPDATE OR DELETE`) and `audit_events_no_truncate` (`BEFORE TRUNCATE`) reject changes with exception `'Audit events are append-only'`.
- **Context Invalidation:** Updates to `profiles` (account status, credential reset flag, authorization version), `user_roles`, or `admin_privileges` fire triggers that revoke all active session contexts and increment `authorization_version`. No infinite trigger loop occurs.

---

## 7. Super Admin and MFA Findings

- **Tier Model:** Super Admin is strictly an elevated tier within the `admin` role, enforced by `admin_privileges(profile_id, role_code)` foreign key referencing `user_roles(profile_id, 'admin')`.
- **Mandatory AAL2:** `activate_staff_context()` enforces `auth.jwt()->>'aal' is not distinct from 'aal2'` for any active Super Admin.
- **Approval Consumption:** `consume_staff_mfa_enrollment_approval()` requires an unconsumed, 10-minute approval row issued by an independent active Super Admin (`profile_id <> approved_by`).
- **Deferred Lifecycle APIs:** Direct native Supabase Auth MFA endpoints (`/auth/v1/factors`) are not governed by application DDL. Auth Hooks and provider-wide settings are documented as live integration requirements.

---

## 8. Student–Parent Singleton Findings

- **Partial Unique Index:** `parent_login_one_eligible_student` on `parent_login_identities(student_id) where login_eligible` guarantees that at most one active parent login identity can exist per student.
- **Identity Binding:** `profile_id uuid primary key` and `student_id uuid not null` in `parent_login_identities` ensure each parent login identity links to exactly one student.
- **Composite Foreign Keys:** Canonical bindings `(guardian_id, profile_id) references public.guardians(id, profile_id)` and `(relationship_id, student_id, guardian_id) references public.student_guardian_relationships(id, student_id, guardian_id)` prevent identity swapping or mismatched relationship binding.
- **Scope Distinction:** Verification status (`relationship_status = 'verified'`) and active account status must be enforced by transactional application code.

---

## 9. Staff Application / Schema Consistency

- **Column Alignment:** `src/lib/staff/server.ts` queries exactly `profiles`, `user_roles`, `admin_privileges`, and `role_contexts` with matching column names (`account_status`, `credential_reset_required`, `authorization_version`, `permissions`, etc.).
- **RPC Signatures:** `staff_session_is_live`, `activate_staff_context({ requested_role: role })`, `revoke_staff_context()`, and `consume_staff_mfa_enrollment_approval()` match identically between TypeScript and SQL.
- **Permission Catalog:** All 45 permissions in `src/lib/auth/permissions.ts` match the PostgreSQL `CHECK` constraint array on `user_roles.permissions`.
- **Role Alignment:** Bounded to the 5 primary roles; staff contexts restricted to `admin`, `teacher`, `accountant`.

---

## 10. Audit and Financial Integrity Boundaries

- **Audit Events:** Immutability triggers prevent update, deletion, or truncation by application users.
- **Financial Integrity:** The prepared schema contains zero financial ledger tables. Financial integrity contracts in `src/lib/auth/authorization.ts` enforce immutable integer-paise math and settled-only reporting in memory; database tables will be introduced in a future domain milestone.

---

## 11. Findings Fixed Locally

- **Lint Warning Resolved:** Removed an unused destructuring variable in `verification/verify-step15-sql.mjs`, ensuring clean exit 0 on `eslint .`.
- **Test Hardening Added:** Created `verification/verify-step15-sql.mjs` containing **35 comprehensive static checks** covering migration sequence, table uniqueness, FK integrity, RLS/grants, parent singleton index, definer security, trigger immutability, permission catalog, and baseline SHA-256 hashes.
- **Migrations Preserved:** No destructive edits were necessary; existing SQL files are syntactically and architecturally sound.

---

## 12. Remaining Risks

1. **Target Portability (F-01):** The project URL (`https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1`) is pinned in `is_native_staff_request()`. Must be reviewed before executing against any other environment.
2. **Internal GoTrue Schema Stability (F-02):** Direct references to `auth.sessions`, `auth.mfa_factors`, and `auth.users.banned_until` require target schema compatibility review.
3. **Provider Direct MFA API Lifecycle (F-03):** Supabase Auth native endpoints require Auth Hooks to enforce approval consumption provider-wide.
4. **Super Admin Initial Onboarding (F-04):** Initial Super Admin bootstrap and approval generation require an out-of-band operator ceremony.

---

## 13. Exact Verification Commands and Results

| Command | Status | Result / Details |
| :--- | :--- | :--- |
| `node verification/verify-step14-sql.mjs` | **PASS** | 30 static SQL checks passed |
| `node verification/verify-step15-sql.mjs` | **PASS** | **35 comprehensive static audit checks passed** |
| `node verification/verify-staff-auth.mjs` | **PASS** | 82 mocked staff security groups passed |
| `node verification/verify-supabase-config.mjs` | **PASS** | 25 offline configuration/static migration checks passed |
| `node verification/verify-auth-foundation.mjs` | **PASS** | 81 Step 12 deterministic contract groups passed |
| `node verification/verify-auth-contracts.mjs` | **PASS** | 44 deterministic authorization contract groups passed |
| `node verification/verify-admin-data.mjs` | **PASS** | Fictional admin dashboard mock data verified |
| `node verification/verify-teacher-data.mjs` | **PASS** | Fictional teacher dashboard mock data verified |
| `node verification/verify-student-data.mjs` | **PASS** | Fictional student dashboard mock data verified |
| `node verification/verify-parent-data.mjs` | **PASS** | Fictional parent dashboard mock data verified |
| `node verification/verify-accountant-data.mjs` | **PASS** | Fictional accountant dashboard mock data verified |
| `npm.cmd run lint` | **PASS** | Exit code 0, zero errors, zero warnings |
| `npm.cmd run typecheck` | **PASS** | Exit code 0, TypeScript 6.0.3 strictly passed |
| `npm.cmd run build` | **PASS** | Exit code 0, Next.js 16.4.5 webpack production build passed |

---

## 14. Readiness Decision

### **OPTION A: READY FOR SEPARATELY AUTHORIZED MIGRATION APPLICATION**

The local SQL audit is complete. All 18 application tables, constraints, definer functions, triggers, and self-metadata policies are verified. The exact SQL files are ready for separate explicit owner approval and controlled execution against an isolated database target.

---

## 15. Next Actions Requiring Separate Approval

1. Authorize application of migrations `20261105000100`, `20261105000200`, and `20261105000300` against an isolated target database.
2. Review target GoTrue schema compatibility (`auth.sessions`, `auth.mfa_factors`, `auth.users`).
3. Authorize the first Super Admin bootstrap ceremony and independent approval creation CLI.
4. Execute the 20 live integration scenarios in `supabase/tests/step-14-rls-plan.json`.
5. Authorize any enabling of `STAFF_AUTH_REQUESTS_ENABLED` or live authentication switches.

---

## 16. Confirmation of No SQL Execution

**CONFIRMED.** Absolutely zero SQL statements were executed against any database (hosted Supabase, local PostgreSQL, or containerized databases). Zero migrations were pushed, applied, or reset. No SQL Editor queries were run.

---

## 17. Confirmation of No External Mutation

**CONFIRMED.** No remote database connection was established. No Auth users or school records were created or modified. No passwords, PINs, or session tokens were generated. No service-role or secret keys were used. No deployment was executed. No Git commands (`commit`, `push`, `branch`) were run.

---

## 18. Confirmation Step 16 Has Not Started

**CONFIRMED.** Step 16 has not started. All activities in this session were strictly bounded to Step 15 Option A (Local SQL Migration Audit, RLS Security Review, and Database Readiness).
