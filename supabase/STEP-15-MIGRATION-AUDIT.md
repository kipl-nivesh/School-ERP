# Step 15 — Full SQL Migration Audit and RLS Security Review

**Date:** 2026-11-05  
**Review Type:** Option A — Full Local SQL Audit and Review Only  
**Safety Protocol:** STRICT SAFETY BOUNDARY — Absolutely No SQL Execution, No Remote Connection, No Migrations Applied.

---

## 1. Executive Summary

This audit performs an exhaustive, local-only architectural and security review of the three prepared PostgreSQL database migrations for the Single School ERP system:
1. `supabase/migrations/20261105000100_identity_foundation.sql` (Baseline SHA-256: `3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c`)
2. `supabase/migrations/20261105000200_school_domain.sql` (Baseline SHA-256: `dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e`)
3. `supabase/migrations/20261105000300_staff_security.sql` (Baseline SHA-256: `0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9`)

The schema comprises **18 application tables**, **4 self-scoped SELECT metadata policies**, **5 `SECURITY DEFINER` functions**, **2 `SECURITY INVOKER` functions**, **5 table triggers**, and **1 private schema (`app_private`)**.

### Primary Findings
- **Zero Syntax / Dependency Errors:** All table declarations, foreign keys, compound references, and trigger bindings resolve cleanly in topological order.
- **Default-Deny Enforced:** All 18 tables enable and force RLS (`FORCE ROW LEVEL SECURITY`). Ordinary grants (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) are strictly revoked from `public`, `anon`, and `authenticated`.
- **Zero Domain Leakage:** All 12 school domain tables have zero allowing policies, completely isolating school data until explicit purpose-scoped policies are defined.
- **Anti-Recursion Session Verification:** The live session helper (`public.staff_session_is_live()`) directly checks `auth.sessions` and `auth.users` rather than policy-protected application tables, completely preventing recursive policy loops.
- **Student-Parent Invariant Enforced:** The singleton rule (at most one active login-eligible Parent per Student, exactly one Student per Parent identity) is enforced at the database level via a partial unique index and composite primary/foreign keys.
- **Audit Immutability:** `public.audit_events` is protected against `UPDATE`, `DELETE`, and `TRUNCATE` operations via private triggers.

---

## 2. Migration Dependency and Order Audit

The migrations execute in strict sequential order:
$$\text{00100\_identity\_foundation} \longrightarrow \text{00200\_school\_domain} \longrightarrow \text{00300\_staff\_security}$$

### Dependency Verification Matrix
| Migration | Objects Created | Dependencies | Order Validity |
| :--- | :--- | :--- | :--- |
| `20261105000100` | 5 tables (`roles`, `profiles`, `user_roles`, `admin_privileges`, `role_contexts`), 5 role seeds | External: `auth.users(id)` | **VALID** (Requires Supabase Auth `auth.users`) |
| `20261105000200` | 12 tables (`school_configuration`, `staff_profiles`, `academic_years`, `classes`, `sections`, `students`, `guardians`, `student_guardian_relationships`, `parent_login_identities`, `enrollments`, `teacher_assignments`, `audit_events`), 4 indexes | Tables in `00100` (`profiles`, `user_roles`) | **VALID** (All referenced tables exist) |
| `20261105000300` | 1 table (`staff_mfa_enrollment_approvals`), 1 column addition (`user_roles.permissions`), 1 schema (`app_private`), 7 functions, 5 triggers, 4 RLS policies | Tables in `00100`, `00200`; External: `auth.sessions`, `auth.users`, `auth.mfa_factors` | **VALID** (Requires Supabase Auth internal tables) |

### Key Structural Observations
1. **Transaction Boundaries:** Each migration file is explicitly wrapped in `begin;` and `commit;`. A failure on any statement rolls back the entire file atomically.
2. **Non-Idempotent by Design:** Statements use standard DDL (`create table`, `create function`) without `IF NOT EXISTS`. This prevents silent partial migrations against non-empty schemas.
3. **Extensions:** Uses PostgreSQL built-in `gen_random_uuid()` (standard in PostgreSQL 13+) and `collate "C"`. No external extensions (e.g. `pgcrypto`) are required.

---

## 3. Table-by-Table Schema Audit (18 Tables)

### Table 1: `public.roles`
- **Migration:** `20261105000100_identity_foundation.sql`
- **Purpose:** Canonical enumeration of the 5 fixed primary roles.
- **Primary Key:** `code text primary key check (code in ('admin', 'teacher', 'student', 'parent', 'accountant'))`
- **Foreign Keys:** None.
- **Unique Constraints:** PK.
- **Check Constraints:** Bounded to exactly 5 role codes.
- **Nullability:** Primary key non-null.
- **Indexes:** PK index on `code`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked from `public`, `anon`, `authenticated`.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Migration seed only (5 rows inserted during migration).
- **Security Concerns:** None. Hardcoded check constraint prevents creation of unauthorized roles (e.g., sixth role).
- **Audit Result:** **PASS**.

### Table 2: `public.profiles`
- **Migration:** `20261105000100_identity_foundation.sql`
- **Purpose:** Core school identity bound 1:1 to a Supabase `auth.users` record.
- **Primary Key:** `id uuid primary key references auth.users(id) on delete restrict`
- **Foreign Keys:** `auth.users(id) on delete restrict`.
- **Unique Constraints:** PK.
- **Check Constraints:** `account_status in ('invited', 'active', 'suspended', 'disabled')`, `authorization_version > 0`.
- **Nullability:** All columns `NOT NULL` (except `created_at` which has default `now()`).
- **Indexes:** PK index on `id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** `SELECT` granted to `authenticated` in `00300`. `INSERT`, `UPDATE`, `DELETE` revoked.
- **Existing Policies:** `profiles_self_metadata` (`SELECT` where `public.staff_session_is_live() and id = auth.uid()`).
- **Data Mutation Authority:** Super Admin / Operator provisioning commands; trigger invalidation updates `authorization_version`.
- **Security Concerns:** `on delete restrict` prevents accidental cascade deletion of school profiles if an Auth user is deleted.
- **Audit Result:** **PASS**.

### Table 3: `public.user_roles`
- **Migration:** `20261105000100_identity_foundation.sql` (amended in `00300` with `permissions`)
- **Purpose:** Role memberships and fine-grained permission assignments per profile.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `profile_id references public.profiles(id) on delete restrict`, `role_code references public.roles(code)`.
- **Unique Constraints:** `unique (profile_id, role_code)`, `unique (id, profile_id, role_code)`.
- **Check Constraints:** `membership_status in ('active', 'revoked')`, `valid_until is null or valid_until > valid_from`, `permissions <@ array[... 45 permissions ...]`.
- **Nullability:** `id`, `profile_id`, `role_code`, `membership_status`, `valid_from`, `permissions` all `NOT NULL`.
- **Indexes:** PK on `id`, unique indexes on `(profile_id, role_code)` and `(id, profile_id, role_code)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** `SELECT` granted to `authenticated` in `00300`. Writes revoked.
- **Existing Policies:** `memberships_self_metadata` (`SELECT` where `public.staff_session_is_live() and profile_id = auth.uid()`).
- **Data Mutation Authority:** Super Admin / IAM commands; changes trigger context invalidation.
- **Security Concerns:** None. The compound unique key allows foreign key targeting from `admin_privileges` and `role_contexts`.
- **Audit Result:** **PASS**.

### Table 4: `public.admin_privileges`
- **Migration:** `20261105000100_identity_foundation.sql`
- **Purpose:** Tiered privilege assignment within the Admin role (Super Admin tier).
- **Primary Key:** `profile_id uuid primary key`
- **Foreign Keys:** `(profile_id, role_code) references public.user_roles(profile_id, role_code) on delete restrict`.
- **Unique Constraints:** PK on `profile_id`.
- **Check Constraints:** `role_code = 'admin'`, `tier = 'super_admin'`, `privilege_status in ('pending', 'active', 'revoked')`, `privilege_version > 0`.
- **Nullability:** All columns `NOT NULL`.
- **Indexes:** PK index on `profile_id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** `SELECT` granted to `authenticated` in `00300`. Writes revoked.
- **Existing Policies:** `tier_self_metadata` (`SELECT` where `public.staff_session_is_live() and profile_id = auth.uid()`).
- **Data Mutation Authority:** Super Admin dual-approval ceremony.
- **Security Concerns:** Compound foreign key guarantees that a user CANNOT have Super Admin privileges without an active `admin` membership in `user_roles`.
- **Audit Result:** **PASS**.

### Table 5: `public.role_contexts`
- **Migration:** `20261105000100_identity_foundation.sql`
- **Purpose:** Tracks active server session role contexts bound to genuine provider session IDs.
- **Primary Key:** `id uuid primary key` (corresponds to Supabase `session_id`).
- **Foreign Keys:** `profile_id references public.profiles(id) on delete restrict`, `role_code references public.roles(code)`, `(assignment_id, profile_id, role_code) references public.user_roles(id, profile_id, role_code) on delete restrict`.
- **Unique Constraints:** PK on `id`.
- **Check Constraints:** `context_version > 0`, `authorization_version > 0`.
- **Nullability:** `id`, `profile_id`, `role_code`, `assignment_id`, `context_version`, `authorization_version`, `expires_at` `NOT NULL`. `revoked_at` nullable.
- **Indexes:** PK on `id`, index `role_contexts_profile_idx` on `(profile_id, expires_at)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** `SELECT` granted to `authenticated` in `00300`. Writes revoked.
- **Existing Policies:** `contexts_current_session` (`SELECT` where `public.staff_session_is_live() and profile_id = auth.uid() and id::text = auth.jwt()->>'session_id'`).
- **Data Mutation Authority:** Narrow definer functions `activate_staff_context` and `revoke_staff_context`, and trigger `invalidate_staff_contexts`.
- **Security Concerns:** Direct updates/inserts prohibited; only accessible via verified security-definer RPCs.
- **Audit Result:** **PASS**.

### Table 6: `public.school_configuration`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** School-wide singleton settings (school display name, metadata).
- **Primary Key:** `id boolean primary key default true check (id)` (ensures at most 1 row).
- **Foreign Keys:** None.
- **Unique Constraints:** PK.
- **Check Constraints:** `check (id)` (only `true` allowed), `length(display_name) between 1 and 160`.
- **Nullability:** `id` and `display_name` `NOT NULL`.
- **Indexes:** PK on `id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Super Admin / School Settings Write workflow.
- **Security Concerns:** None.
- **Audit Result:** **PASS**.

### Table 7: `public.staff_profiles`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Domain metadata for staff members (Teachers, Accountants, Admins).
- **Primary Key:** `profile_id uuid primary key references public.profiles(id) on delete restrict`
- **Foreign Keys:** `profiles(id)`.
- **Unique Constraints:** PK.
- **Check Constraints:** `length(display_name) between 1 and 160`.
- **Nullability:** All columns `NOT NULL`.
- **Indexes:** PK index on `profile_id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Super Admin staff management.
- **Security Concerns:** None.
- **Audit Result:** **PASS**.

### Table 8: `public.academic_years`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Academic year periods and status boundaries.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** None.
- **Unique Constraints:** `unique (label)`.
- **Check Constraints:** `ends_on >= starts_on`.
- **Nullability:** All columns `NOT NULL`.
- **Indexes:** PK on `id`, unique index on `label`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Academics management.
- **Security Concerns:** None.
- **Audit Result:** **PASS**.

### Table 9: `public.classes`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** School class definitions (e.g. Class 10, Class 9).
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** None.
- **Unique Constraints:** `unique (name)`.
- **Check Constraints:** `length(name) between 1 and 80`.
- **Nullability:** All columns `NOT NULL`.
- **Indexes:** PK on `id`, unique index on `name`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Academics management.
- **Security Concerns:** None.
- **Audit Result:** **PASS**.

### Table 10: `public.sections`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Class sections bound to an academic year (e.g. Class 10 - Section A - 2026-2027).
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `class_id references public.classes(id)`, `academic_year_id references public.academic_years(id)`.
- **Unique Constraints:** `unique (class_id, academic_year_id, name)`, `unique (id, academic_year_id)`.
- **Check Constraints:** None beyond standard types.
- **Nullability:** All columns `NOT NULL`.
- **Indexes:** PK on `id`, unique indexes on `(class_id, academic_year_id, name)` and `(id, academic_year_id)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Academics management.
- **Security Concerns:** None. The compound unique key `(id, academic_year_id)` provides reference integrity for enrollments and teacher assignments.
- **Audit Result:** **PASS**.

### Table 11: `public.students`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Student registry records.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `profile_id references public.profiles(id)` (nullable, unique).
- **Unique Constraints:** `unique (registration_number)`, `unique (profile_id)`.
- **Check Constraints:** `enrollment_status in ('active','inactive','withdrawn')`, `relationship_version > 0`, `length(registration_number) between 1 and 128 and registration_number !~ '[[:cntrl:]]'`.
- **Nullability:** `registration_number`, `display_name`, `enrollment_status`, `relationship_version` `NOT NULL`. `profile_id` nullable (pre-login registration).
- **Collation:** `registration_number text collate "C"` (deterministic byte-wise uniqueness).
- **Indexes:** PK on `id`, unique index on `registration_number`, unique index on `profile_id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Admissions / Student management.
- **Security Concerns:** Strong control character check and strict C-collation protect against injection and visual spoofing.
- **Audit Result:** **PASS**.

### Table 12: `public.guardians`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Guardian identity and contact profiles.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `profile_id references public.profiles(id)` (nullable, unique).
- **Unique Constraints:** `unique (id, profile_id)`, `unique (profile_id)`.
- **Check Constraints:** None beyond types.
- **Nullability:** `display_name` `NOT NULL`. `profile_id` nullable.
- **Indexes:** PK on `id`, unique index on `(id, profile_id)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Admissions / Guardian management.
- **Security Concerns:** None.
- **Audit Result:** **PASS**.

### Table 13: `public.student_guardian_relationships`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Family links between students and guardians, including scope and access grants.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `student_id references public.students(id)`, `guardian_id references public.guardians(id)`.
- **Unique Constraints:** `unique (id, student_id, guardian_id)`.
- **Check Constraints:** `relationship_status in ('pending','verified','revoked')`, `valid_until is null or valid_until > valid_from`, `relationship_version > 0`.
- **Nullability:** `student_id`, `guardian_id`, `relationship_status`, `academic_access`, `fee_access`, `valid_from`, `relationship_version` `NOT NULL`. `valid_until` nullable.
- **Indexes:** PK on `id`, index `student_guardian_scope_idx` on `(student_id, guardian_id, relationship_status)`, unique index on `(id, student_id, guardian_id)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** School Administration / Admissions verification.
- **Security Concerns:** Stores historical and active relationships. Separate flags for `academic_access` and `fee_access`.
- **Audit Result:** **PASS**.

### Table 14: `public.parent_login_identities`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Enforces the 1:1 Student-Parent login eligibility singleton.
- **Primary Key:** `profile_id uuid primary key`
- **Foreign Keys:** 
  - `(profile_id, role_code) references public.user_roles(profile_id, role_code)`
  - `(guardian_id, profile_id) references public.guardians(id, profile_id)`
  - `(relationship_id, student_id, guardian_id) references public.student_guardian_relationships(id, student_id, guardian_id)`
- **Unique Constraints:** PK on `profile_id`, `unique (guardian_id)`, partial unique index `parent_login_one_eligible_student` on `(student_id) where login_eligible`.
- **Check Constraints:** `role_code = 'parent'`, `mapping_version > 0`.
- **Nullability:** All columns `NOT NULL`.
- **Indexes:** PK on `profile_id`, unique index on `guardian_id`, partial unique index `parent_login_one_eligible_student`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** School Administration / Verified link ceremonies.
- **Security Concerns:** Partial unique index prevents concurrent race conditions attempting to activate two eligible parent logins for one student.
- **Audit Result:** **PASS**.

### Table 15: `public.enrollments`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Student class section enrollment history.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `student_id references public.students(id)`, `academic_year_id references public.academic_years(id)`, `(section_id, academic_year_id) references public.sections(id, academic_year_id)`.
- **Unique Constraints:** PK on `id`.
- **Check Constraints:** `valid_until is null or valid_until >= valid_from`.
- **Nullability:** `student_id`, `academic_year_id`, `section_id`, `valid_from` `NOT NULL`. `valid_until` nullable.
- **Indexes:** PK on `id`, index `enrollment_scope_idx` on `(student_id, academic_year_id, section_id)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Admissions / Academic registrars.
- **Security Concerns:** Composite FK guarantees section belongs to the same academic year.
- **Audit Result:** **PASS**.

### Table 16: `public.teacher_assignments`
- **Migration:** `20261105000200_school_domain.sql`
- **Purpose:** Subject and section teaching assignments per staff member.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** `teacher_profile_id references public.staff_profiles(profile_id)`, `(section_id, academic_year_id) references public.sections(id, academic_year_id)`.
- **Unique Constraints:** PK on `id`.
- **Check Constraints:** `valid_until is null or valid_until >= valid_from`.
- **Nullability:** All columns `NOT NULL` except `valid_until`.
- **Indexes:** PK on `id`, index `teacher_assignment_scope_idx` on `(teacher_profile_id, section_id, valid_from, valid_until)`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Principal / Academics manager.
- **Security Concerns:** Composite FK guarantees section belongs to the specified academic year.
- **Audit Result:** **PASS**.

### Table 17: `public.audit_events`
- **Migration:** `20261105000200_school_domain.sql` (amended with triggers in `00300`)
- **Purpose:** Immutable append-only audit trail of security, context, and administration actions.
- **Primary Key:** `id uuid primary key default gen_random_uuid()`
- **Foreign Keys:** None (intentionally detached from profile deletion cascades).
- **Unique Constraints:** PK on `id`.
- **Check Constraints:** None beyond standard types.
- **Nullability:** `event_type`, `occurred_at` `NOT NULL`. `actor_profile_id`, `target_profile_id` nullable (system events).
- **Indexes:** PK on `id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked from `public`, `anon`, `authenticated`.
- **Existing Policies:** None (default deny).
- **Triggers:**
  - `audit_events_immutable BEFORE UPDATE OR DELETE` -> raises `'Audit events are append-only'`.
  - `audit_events_no_truncate BEFORE TRUNCATE` -> raises `'Audit events are append-only'`.
- **Data Mutation Authority:** Appended exclusively via `SECURITY DEFINER` commands (`activate_staff_context`, `revoke_staff_context`, `consume_staff_mfa_enrollment_approval`, `invalidate_staff_contexts`).
- **Security Concerns:** Application users cannot write, update, delete, or truncate audit rows.
- **Audit Result:** **PASS**.

### Table 18: `public.staff_mfa_enrollment_approvals`
- **Migration:** `20261105000300_staff_security.sql`
- **Purpose:** Time-bounded, one-use independent approvals required for Super Admin TOTP enrollment.
- **Primary Key:** `profile_id uuid primary key references public.profiles(id)`
- **Foreign Keys:** `profile_id references public.profiles(id)`, `approved_by references public.profiles(id)`.
- **Unique Constraints:** PK on `profile_id`.
- **Check Constraints:** 
  - `profile_id <> approved_by` (self-approval strictly prohibited)
  - `valid_until > issued_at and valid_until <= issued_at + interval '10 minutes'` (10-minute expiry cap)
  - `length(approval_reference) between 1 and 200`
- **Nullability:** `profile_id`, `approved_by`, `approval_reference`, `issued_at`, `valid_until` `NOT NULL`. `consumed_at` nullable.
- **Indexes:** PK on `profile_id`.
- **RLS Enabled / Forced:** Yes / Yes.
- **Granted Roles:** All revoked from `public`, `anon`, `authenticated`.
- **Existing Policies:** None (default deny).
- **Data Mutation Authority:** Created via out-of-band operator ceremony; consumed atomically by `consume_staff_mfa_enrollment_approval()`.
- **Security Concerns:** Atomic consumption checks active Super Admin status of approver at consumption time.
- **Audit Result:** **PASS**.

---

## 4. Student–Parent Singleton Invariant Analysis

The architecture dictates strict singleton constraints for the initial launch:
1. **One Student has at most one active login-eligible Parent.**
2. **One Parent login identity is linked to exactly one Student.**
3. **Student and Parent are distinct identities with independent six-digit PINs.**
4. **Student Register Number is used for both Student and Parent login (exactly two fields each; no third identifier).**

### Enforcement Audit
| Requirement | Enforcing Mechanism | Classification |
| :--- | :--- | :--- |
| $\le 1$ eligible Parent per Student | `create unique index parent_login_one_eligible_student on public.parent_login_identities(student_id) where login_eligible;` | **Enforced in SQL** |
| Exactly 1 Student per Parent identity | `profile_id uuid primary key` and `student_id uuid not null` in `parent_login_identities` | **Enforced in SQL** |
| Exactly 1 Guardian profile per Parent identity | `guardian_id uuid not null unique` and `(guardian_id, profile_id) references public.guardians(id, profile_id)` | **Enforced in SQL** |
| Legitimate Student-Guardian relationship binding | `(relationship_id, student_id, guardian_id) references public.student_guardian_relationships(id, student_id, guardian_id)` | **Enforced in SQL** |
| Verified relationship status (`status = 'verified'`) | Application verification transaction | **Application Logic Required** |
| Active Parent profile account status (`status = 'active'`) | Application verification transaction | **Application Logic Required** |
| Distinct Student and Parent profiles | Application verification contract (`Parent resolution denies same internal profile`) | **Application Contract** |
| No third login field / No PIN identification | Application login form and contracts | **Application Contract** |

---

## 5. Authentication and Identity Binding

1. **Supabase Auth UUIDs:** Primary identities in `public.profiles` reference `auth.users(id)` with `ON DELETE RESTRICT`. Deleting an auth user cannot cause unmonitored cascade deletion of school records.
2. **Native AMR Validation:** `public.is_native_staff_request()` verifies that the JWT contains `amr` with `method = 'password'`. This prevents non-password authentication mechanisms from bypassing staff requirements.
3. **Server-Side Session Liveness:** `public.staff_session_is_live()` verifies that the caller's JWT `session_id` actively exists in `auth.sessions`, matches `auth.uid()`, and the corresponding `auth.users` row is email-confirmed and unbanned.
4. **Context Lifetime:** Context activation caps expiration at $\min(\text{JWT exp}, \text{now} + 30\text{ minutes})$.
5. **No Public Signup:** Schema provides zero signup triggers, zero public profile creation policies, and revokes `CREATE` on `public` schema.

---

## 6. RLS and Database Grant Audit

### Privileges Baseline
- `REVOKE CREATE ON SCHEMA public FROM public, anon, authenticated;`
- All 18 tables: `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- All ordinary table privileges (`ALL`) revoked from `public`, `anon`, and `authenticated`.
- `app_private` schema: `REVOKE ALL ON SCHEMA app_private FROM public, anon, authenticated;`.

### Policy Catalog (Exactly 4 Policies)
| Table | Policy Name | Permitted Op | Role | Condition |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | `profiles_self_metadata` | `SELECT` | `authenticated` | `public.staff_session_is_live() AND id = auth.uid()` |
| `user_roles` | `memberships_self_metadata` | `SELECT` | `authenticated` | `public.staff_session_is_live() AND profile_id = auth.uid()` |
| `admin_privileges` | `tier_self_metadata` | `SELECT` | `authenticated` | `public.staff_session_is_live() AND profile_id = auth.uid()` |
| `role_contexts` | `contexts_current_session` | `SELECT` | `authenticated` | `public.staff_session_is_live() AND profile_id = auth.uid() AND id::text = auth.jwt()->>'session_id'` |

### Critical Security Properties
- **Zero Broad Policies:** No `USING (true)` or unconstrained access exists.
- **Zero Ordinary Writes:** There are zero `INSERT`, `UPDATE`, or `DELETE` policies on any table for `authenticated`.
- **Zero Domain Reads:** All 12 school domain tables are 100% default-deny.

---

## 7. Security Definer and Trigger Review

### Function Audit Matrix
| Function | Language | Security | Search Path | Owner | Granted To | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `is_native_staff_request()` | SQL | INVOKER | `''` (empty) | Standard | `authenticated` | Validates JWT claims (iss, aud, role, amr). |
| `staff_session_is_live()` | SQL | DEFINER | `''` (empty) | `postgres` | `authenticated` | Verifies live provider session in `auth.sessions`. |
| `consume_staff_mfa_enrollment_approval()` | PL/pgSQL | DEFINER | `''` (empty) | `postgres` | `authenticated` | Atomically consumes 10-minute MFA approval. |
| `activate_staff_context(text)` | PL/pgSQL | DEFINER | `''` (empty) | `postgres` | `authenticated` | Activates staff session role context with AAL2 check. |
| `revoke_staff_context()` | PL/pgSQL | DEFINER | `''` (empty) | `postgres` | `authenticated` | Revokes caller's active session role context. |
| `reject_audit_change()` | PL/pgSQL | INVOKER | `''` (empty) | Standard | Revoked | Enforces append-only immutability on `audit_events`. |
| `invalidate_staff_contexts()` | PL/pgSQL | DEFINER | `''` (empty) | `postgres` | Revoked | Increments versions and revokes contexts on security change. |

### Search Path and SQL Injection Audit
- All 7 functions explicitly declare `SET search_path = ''`.
- Every table and function reference inside function bodies is strictly schema-qualified (e.g. `public.profiles`, `public.role_contexts`, `auth.jwt()`, `auth.sessions`).
- No dynamic SQL (`EXECUTE format(...)`) is utilized; all queries are parameterized static SQL.
- Trigger recursion is avoided because `invalidate_staff_contexts()` updates `role_contexts` directly without invoking secondary cascading triggers.

---

## 8. Super Admin Security and MFA Enforcement Audit

- **Tier within Admin:** Super Admin is strictly a tier within `admin`, confirmed by `admin_privileges(profile_id, role_code)` foreign key referencing `user_roles(profile_id, 'admin')`.
- **Mandatory AAL2:** `activate_staff_context()` strictly checks:
  ```sql
  if exists(select 1 from public.admin_privileges where profile_id=p.id and privilege_status='active') then
    if auth.jwt()->>'aal' is distinct from 'aal2' ... then return false; end if;
  end if;
  ```
  Even if an active Super Admin attempts to activate a non-admin role context (e.g. `teacher`), their provider session MUST be AAL2.
- **Approval Consumption:** `consume_staff_mfa_enrollment_approval()` requires:
  - Caller has active `admin_privileges` and active `user_roles(admin)`.
  - Caller does not already have a verified factor in `auth.mfa_factors`.
  - Approval row exists in `staff_mfa_enrollment_approvals` where `profile_id = auth.uid()`.
  - Approval is unconsumed (`consumed_at IS NULL`) and within 10-minute window.
  - Approver (`approved_by`) remains an active Super Admin at the moment of consumption.
  - Approver is NOT the caller (`profile_id <> approved_by`).
  - Consumption logs an immutable audit event in `public.audit_events`.

---

## 9. Audit and Financial Integrity Boundaries

- **Audit Events:** `public.audit_events` cannot be updated, deleted, or truncated by any application role. Triggers `audit_events_immutable` and `audit_events_no_truncate` fire `BEFORE` and raise an exception.
- **Financial Integrity:** The database schema intentionally contains **no financial ledger tables** (invoices, payments, fee ledgers). Financial contracts in `src/lib/auth/authorization.ts` enforce integer-paise math, settled-only reporting, and draft-only mutation in application memory, but database persistence remains future scope.

---

## 10. Staff Authentication Code Consistency

Cross-checking the SQL schema against `src/lib/staff/server.ts`, `src/lib/staff/contracts.ts`, and `src/app/login/staff/actions.ts`:
1. **Tables & Columns:** Every column queried by `loadStaffResolution()` exists and has matching types:
   - `profiles`: `id`, `account_status`, `credential_reset_required`, `authorization_version`
   - `user_roles`: `id`, `profile_id`, `role_code`, `membership_status`, `valid_from`, `valid_until`, `permissions`
   - `admin_privileges`: `profile_id`, `tier`, `privilege_status`
   - `role_contexts`: `id`, `profile_id`, `role_code`, `assignment_id`, `context_version`, `authorization_version`, `expires_at`, `revoked_at`
2. **RPC Functions:** Signatures and names match identically:
   - `staff_session_is_live()`
   - `activate_staff_context({ requested_role: role })`
   - `revoke_staff_context()`
   - `consume_staff_mfa_enrollment_approval()`
3. **Permissions Catalog:** The 45 permissions in `src/lib/auth/permissions.ts` match the PostgreSQL `CHECK` constraint array element-for-element.
4. **Role Codes:** Restricted strictly to the 5 primary roles; staff contexts restricted strictly to `admin`, `teacher`, `accountant`.
