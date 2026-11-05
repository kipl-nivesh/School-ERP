# Step 16A — Security Hardening & Preflight Findings Register

**Date:** 2026-11-05  
**Review Type:** Step 16A Local Security Hardening, SQL Migration Corrections & Database Preflight  
**Safety Protocol:** STRICT SAFETY BOUNDARY — No SQL Execution, No Remote Connection, No Migrations Applied.

---

## 1. Executive Summary & Findings Matrix

| Finding ID | Title | Severity | Task Area | Status | Resolution / Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Direct Native Supabase Auth MFA REST Endpoint Exposure (`/auth/v1/factors`) | **HIGH** | Task C (MFA Lifecycle) | **UNRESOLVED / BLOCKED** | Live Super Admin MFA lifecycle is **BLOCKED**. Kept disabled until provider-level gateway or custom hook is designed. |
| **SEC-02** | Stale Context Reactivation Semantics in SQL `ON CONFLICT` | **MEDIUM** | Task B (Context Lifecycle) | **RESOLVED (By Design)** | `ON CONFLICT ... WHERE revoked_at IS NULL` prevents reviving revoked contexts in the same session; new session required. |
| **SEC-03** | Super Admin Dashboard Access Exception in `activate_staff_context()` | **LOW** | Task A (Staff Auth) | **JUSTIFIED / PRESERVED** | Bounded exception allows active Super Admin with active Admin role and AAL2 to access `/admin/dashboard` even with empty permissions array. |
| **SEC-04** | Hardcoded Project URL in `is_native_staff_request()` | **MEDIUM** | Task F (Compatibility) | **DOCUMENTED REQUIREMENT** | Pinned to `https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1`. Must be reviewed before executing against any other target. |
| **SEC-05** | Reliance on Internal GoTrue Engine Tables (`auth.sessions`, `auth.mfa_factors`) | **MEDIUM** | Task F (Compatibility) | **DOCUMENTED REQUIREMENT** | Direct definer queries depend on GoTrue internal table structure. Verified against target specifications. |
| **SEC-06** | Temporal Non-Overlap Invariants (Enrollments & Teacher Assignments) | **LOW** | Task E (DB Integrity) | **APPLICATION RESPONSIBILITY** | Without PostgreSQL `btree_gist` extension, date range exclusions must be enforced via transactional application logic. |
| **SEC-07** | Relationship Status Verification on `parent_login_identities` | **LOW** | Task E (DB Integrity) | **APPLICATION RESPONSIBILITY** | Composite FKs guarantee identity/student match, but `relationship_status = 'verified'` requires transactional validation. |
| **SEC-08** | Approval Slot Singleton in `staff_mfa_enrollment_approvals` | **INFORMATIONAL** | Task C (MFA Lifecycle) | **DOCUMENTED ARCHITECTURE** | `profile_id uuid primary key` enforces 1 active approval slot per user; historical audits preserved in `audit_events`. |
| **SEC-09** | Potential PostgreSQL Default `PUBLIC` EXECUTE Privileges on New Functions | **LOW** | Task D (Function Security) | **HARDENED** | All 7 functions explicitly revoke execute from `public` and `anon`; `app_private` functions revoke from `authenticated`. |
| **SEC-10** | Absence of Financial Persistence Schema | **INFORMATIONAL** | Task E (DB Integrity) | **SCOPE BOUNDARY** | Financial calculations remain in memory contracts; ledger tables will be defined in a future domain milestone. |

---

## 2. In-Depth Security Hardening Findings

### SEC-01: Direct Native Supabase Auth MFA REST Endpoint Exposure
- **Severity:** **HIGH**
- **Affected Surfaces:** `src/app/login/staff/actions.ts` (`enrollStaffMfa`), `supabase/migrations/20261105000300_staff_security.sql` (`consume_staff_mfa_enrollment_approval`), Supabase Auth REST API (`/auth/v1/factors`)
- **Problem Statement:**  
  The application code requires a Super Admin to possess a valid, 10-minute independent approval in `public.staff_mfa_enrollment_approvals` before `enrollStaffMfa()` will trigger TOTP enrollment. However, Supabase Auth (GoTrue) exposes the `/auth/v1/factors` endpoint directly to any authenticated bearer of a valid JWT (AAL1). An authenticated user can bypass the Next.js Server Action and directly issue HTTP `POST` requests to `/auth/v1/factors` to enroll a factor, followed by `POST /auth/v1/factors/{id}/verify` to escalate their session to `aal2`.
- **Provider Research & Offline Analysis:**  
  Offline inspection of Supabase Auth documentation confirms:
  1. Supabase Auth supports MFA verification hooks (`mfa_verification_attempt`), but does **NOT** support a pre-enrollment or factor-creation blocking hook.
  2. Any client holding an AAL1 JWT has native permission in GoTrue to enroll a TOTP factor unless the GoTrue server configuration disables MFA altogether.
- **Security Impact:**  
  Application-level approval consumption does not provide provider-wide enforcement. A compromised staff account could enroll an unauthorized factor directly via API.
- **Status & Determination:**  
  **UNRESOLVED — CANNOT BE RESOLVED SOLELY VIA POSTGRESQL DDL.**  
  In strict accordance with Step 16A instructions, this issue is **NOT** claimed as fixed.
- **Enforcement Decision:**  
  **LIVE SUPER ADMIN MFA LIFECYCLE IS MARKED BLOCKED.**  
  Live authentication remains strictly disabled (`STAFF_AUTH_REQUESTS_ENABLED=false`).
- **Proposed Provider-Compatible Future Remediation:**  
  1. Deploy a custom Reverse Proxy / API Gateway (e.g. Next.js Proxy or Cloudflare Worker) that drops direct client requests to `/auth/v1/factors` and forces all MFA operations through authenticated, approved Server Actions.
  2. Implement an approval stamp verification in a Supabase Auth Custom Access Token (JWT) Hook that suppresses the `aal2` claim unless a database-approved factor registration ID is verified.

---

### SEC-02: Stale and Revoked Context Reactivation Semantics
- **Severity:** **MEDIUM**
- **Affected Surfaces:** `supabase/migrations/20261105000300_staff_security.sql`, lines 118–124; `src/lib/staff/contracts.ts`, lines 64–79
- **Problem Statement:**  
  When a staff member switches roles or logs out, how does the database handle context reactivation, and can a revoked context ever be restored within the same session?
- **Analysis of `activate_staff_context()`:**
  ```sql
  insert into public.role_contexts(id,profile_id,role_code,assignment_id,authorization_version,expires_at)
  values(sid,p.id,requested_role,m.id,p.authorization_version,expiry)
  on conflict(id) do update set role_code=excluded.role_code, assignment_id=excluded.assignment_id,
   authorization_version=excluded.authorization_version, context_version=public.role_contexts.context_version+1,
   expires_at=excluded.expires_at, revoked_at=null
  where public.role_contexts.profile_id=auth.uid() and public.role_contexts.revoked_at is null;
  if not found then return false; end if;
  ```
- **Lifecycle & Recovery Semantics:**
  1. **Active Role Switching:** When `revoked_at IS NULL`, calling `activate_staff_context()` with another valid role updates the context row, increments `context_version`, updates `role_code`, and refreshes `expires_at`.
  2. **Revocation Permanence:** When `revoke_staff_context()` is called (e.g. on logout) or a security trigger sets `revoked_at = now()`, the `WHERE public.role_contexts.revoked_at is null` condition in the `ON CONFLICT` clause evaluates to **FALSE**.
  3. **Zero Revival in Same Session:** The update is skipped, no row is inserted (due to PK conflict on `id`), and PL/pgSQL `FOUND` evaluates to `false`. The function immediately returns `false`.
  4. **Recovery Path:** To obtain a new context after revocation, the user **MUST** re-authenticate via Supabase Auth (`signInWithPassword`), obtaining a fresh provider session with a new `session_id`.
- **Status:** **RESOLVED BY DESIGN.**

---

### SEC-03: Super Admin Dashboard Access Exception in `activate_staff_context()`
- **Severity:** **LOW**
- **Affected Surfaces:** `supabase/migrations/20261105000300_staff_security.sql`, lines 116–117; `src/lib/auth/authorization.ts`, line 60
- **Problem Statement:**  
  Lines 116–117 contain:
  ```sql
  if not (('dashboard.' || requested_role || '.view') = any(m.permissions))
  and not (requested_role='admin' and exists(select 1 from public.admin_privileges where profile_id=p.id and privilege_status='active')) then return false; end if;
  ```
- **Analysis:**  
  Ordinary Admin accounts require explicit `'dashboard.admin.view'` in `user_roles.permissions`. Super Admin accounts inherit universal module viewing authority under the architecture specification.
- **Justification & Guardrails:**  
  This exception is strictly bounded:
  - It applies **ONLY** when `requested_role = 'admin'` (never `teacher` or `accountant`).
  - Lines 111–115 have already strictly verified that `auth.jwt()->>'aal'` is not distinct from `'aal2'` AND that an active, unexpired `admin` membership exists in `user_roles`.
  - It matches application authorization policy in `src/lib/auth/authorization.ts` line 60.
- **Status:** **JUSTIFIED / PRESERVED.**

---

### SEC-04: Hardcoded Project URL in `is_native_staff_request()`
- **Severity:** **MEDIUM**
- **Affected Surfaces:** `supabase/migrations/20261105000300_staff_security.sql`, line 11
- **Problem Statement:**  
  `is_native_staff_request()` checks `auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'`.
- **Preflight Requirement:**  
  This is an environment constraint. For the designated development project `yedvkcwkflhbqumjwknh`, it succeeds. For any other target (e.g. local Supabase or staging), the SQL issuer string must be updated before execution.
- **Status:** **DOCUMENTED TARGET PREREQUISITE.**

---

### SEC-05: Direct Dependencies on GoTrue Internal Tables
- **Severity:** **MEDIUM**
- **Affected Surfaces:** `supabase/migrations/20261105000300_staff_security.sql`, lines 22–24, 53
- **Problem Statement:**  
  Direct SQL queries against `auth.sessions`, `auth.users.banned_until`, and `auth.mfa_factors`.
- **Preflight Requirement:**  
  Before executing migrations on any hosted database, verify that the target's GoTrue version supports:
  - `auth.sessions(id uuid, user_id uuid)`
  - `auth.users(id uuid, email_confirmed_at timestamptz, banned_until timestamptz)`
  - `auth.mfa_factors(id uuid, user_id uuid, status auth.factor_status)`
- **Status:** **DOCUMENTED TARGET PREREQUISITE.**

---

### SEC-06: Temporal Non-Overlap Invariants (Enrollments & Teacher Assignments)
- **Severity:** **LOW**
- **Affected Surfaces:** `supabase/migrations/20261105000200_school_domain.sql`, tables `enrollments` and `teacher_assignments`
- **Problem Statement:**  
  Can a student be enrolled in two sections simultaneously, or a teacher assigned to the same section/subject twice with overlapping dates?
- **Analysis:**  
  In PostgreSQL, enforcing temporal non-overlap across date ranges requires the `btree_gist` extension with `EXCLUDE USING gist`. Without `btree_gist`, standard relational uniqueness constraints cannot evaluate temporal ranges.
- **Enforcement Boundary:**  
  This invariant requires transactional application validation during enrollment/assignment creation, or the introduction of a temporal exclusion constraint in a future migration if `btree_gist` is approved.
- **Status:** **APPLICATION RESPONSIBILITY.**

---

### SEC-07: Relationship Status Verification on `parent_login_identities`
- **Severity:** **LOW**
- **Affected Surfaces:** `supabase/migrations/20261105000200_school_domain.sql`, lines 42–53
- **Problem Statement:**  
  `parent_login_identities` uses composite FKs to guarantee that the `guardian_id` matches `guardians.profile_id` and that `(relationship_id, student_id, guardian_id)` matches `student_guardian_relationships`. However, SQL foreign keys cannot filter by non-key column values like `relationship_status = 'verified'`.
- **Enforcement Boundary:**  
  Application provisioning commands must verify that `relationship_status === 'verified'` within their database transactions before marking `login_eligible = true`.
- **Status:** **APPLICATION RESPONSIBILITY.**

---

### SEC-08: Approval Slot Singleton in `staff_mfa_enrollment_approvals`
- **Severity:** **INFORMATIONAL**
- **Affected Surfaces:** `supabase/migrations/20261105000300_staff_security.sql`, line 33
- **Problem Statement:**  
  `profile_id uuid primary key` means each profile has at most one approval record in `staff_mfa_enrollment_approvals`.
- **Analysis:**  
  This creates a 1:1 singleton approval slot per user. If an approval expires or provider enrollment fails, issuing a new approval must update the existing row (`ON CONFLICT (profile_id) DO UPDATE`). Historical records of all consumed approvals are permanently preserved in `public.audit_events`.
- **Status:** **DOCUMENTED ARCHITECTURE.**

---

### SEC-09: SQL Function Execution Grant Hardening
- **Severity:** **LOW**
- **Affected Surfaces:** `supabase/migrations/20261105000300_staff_security.sql`, lines 15, 28, 71, 89, 141, 163
- **Analysis:**  
  PostgreSQL grants `EXECUTE` on newly created functions to `PUBLIC` by default. The migration explicitly executes:
  - `REVOKE ALL ON FUNCTION ... FROM public, anon;` on all public RPC functions (`is_native_staff_request`, `staff_session_is_live`, `consume_staff_mfa_enrollment_approval`, `activate_staff_context`, `revoke_staff_context`).
  - `REVOKE ALL ON FUNCTION ... FROM public, anon, authenticated;` on private trigger functions in `app_private`.
  - Only authorized RPC functions are granted to `authenticated`.
- **Status:** **VERIFIED HARDENED.**

---

### SEC-10: Absence of Financial Persistence Schema
- **Severity:** **INFORMATIONAL**
- **Affected Surfaces:** `supabase/migrations/20261105000200_school_domain.sql`
- **Analysis:**  
  The prepared schema defines school structure and user identities, but zero invoice, payment, or fee tables. Financial invariants (integer paise math, settled-only cash flow, negative cash-flow semantics) are fully tested in application memory (`verification/verify-accountant-data.mjs` and `src/lib/auth/authorization.ts`), but have no database write path in this milestone.
- **Status:** **VERIFIED SCOPE BOUNDARY.**
