# Phase 11.12: Disposable Supabase Integration Checklist
**BRIGHTCAMP School ERP — Multi-Tenant Student & Parent Portal**

---

## 1. Safety Boundaries & Target Identification

| Environment | Project Ref | Host / URL | Policy |
| :--- | :--- | :--- | :--- |
| **Production** | `yedvkcwkflhbqumjwknh` | `https://yedvkcwkflhbqumjwknh.supabase.co` | **STRICTLY FORBIDDEN**. Zero connections, zero writes, zero schema modifications. |
| **Disposable Test** | `etlahjbwylasudkuqozc` | `https://etlahjbwylasudkuqozc.supabase.co` | **CONTROLLED ACCESS ONLY**. Requires explicit user authorization and trusted CA certificate. |
| **Local PostgreSQL** | N/A | `127.0.0.1:54329` / `54331` | Verified in Phase 11.10D. Currently shut down and preserved. |

---

## 2. Environment & Certificate Prerequisites

- [ ] **Git-Ignored Local Configuration**: Ensure `.env.local` is present in `.gitignore` and contains only public configuration for the disposable project:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://etlahjbwylasudkuqozc.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<disposable_anon_publishable_key>
  ```
- [ ] **Node.js Trusted CA Chain**: Ensure any corporate proxy or local security appliance certificates are injected via `NODE_EXTRA_CA_CERTS` or standard Windows certificate trust store before attempting HTTPS requests.
- [ ] **Supabase CLI / Management Authorization**: Verify that CLI credentials point strictly to the disposable project ref `etlahjbwylasudkuqozc`.

---

## 3. Database Schema & Migration Sequencing

- [ ] **Historical Migrations (1–26)**: Verify the clean sequential application of all 26 historical migrations from `supabase/migrations/`:
  1. `20261105000100_identity_foundation.sql`
  2. `20261105000200_school_domain.sql`
  3. `20261105000300_staff_security.sql`
  4. `20261105000400_school_admin_simplification.sql`
  5. `20261105000500_school_domain_rls.sql`
  6. `20261105000600_pin_authentication_and_rate_limiting.sql`
  7. `20261105000700_multi_tenant_foundation.sql`
  8. `20261105000800_student_subscription_foundation.sql`
  9. `20261105000900_school_onboarding_and_management.sql`
  10. `20261106001000_baseline_access_hardening.sql`
  11. `20261106001100_onboarding_transactions.sql`
  12. `20261106001200_tenant_settings.sql`
  13. `20261106001300_verified_identity_binding.sql`
  14. `20261107001400_subscription_context_scope.sql`
  15. `20261107001500_portal_subscription_rls.sql`
  16. `20261107001600_hashed_staff_invitations.sql`
  17. `20261111001700_financial_authorization_hardening.sql`
  18. `20261111001800_operational_staff_policies.sql`
  19. `20261111001900_atomic_student_admission.sql`
  20. `20261111002000_parent_access_purposes.sql`
  21. `20261111002100_onboarding_invitation_boundary.sql`
  22. `20261111002200_admission_retry_safety.sql`
  23. `20261111002300_academic_write_commands.sql`
  24. `20261111002400_academic_management.sql`
  25. `20261112002500_staff_recovery_scope.sql`
  26. `20261112002600_staff_invitation_issuance.sql`
- [ ] **Migration 27 Promotion**: Copy `docs/architecture/drafts/20261118002700_portal_school_context_and_rls_draft.sql` to `supabase/migrations/20261118002700_portal_school_context_and_rls.sql` only upon explicit migration execution authorization.
- [ ] **Schema Integrity Check**: Verify that:
  - `public.pin_credentials` contains `credential_version INT NOT NULL DEFAULT 1`.
  - `public.pin_audit_logs` is created with immutable audit constraints.
  - `public.current_school_id()` and `public.current_active_role()` support partitioned branches for Staff, Student, and Parent.
  - `public.student_marks_entries_self` enforces published-only marks for students.

---

## 4. Auth & Identity Provider Configuration

- [ ] **Native Supabase Auth Settings**:
  - Email confirmation required for Staff users.
  - Password minimum requirements enforced (minimum 10 characters).
  - Secure session duration: 2 hours maximum lifetime.
- [ ] **Identity Provider (IdP) Architecture**:
  - **Verdict**: Keycloak is **NOT** required.
  - Standard OIDC / OAuth2 custom provider or native Supabase custom token assertion configured with:
    - Provider issuer URL (`iss`).
    - Standard claims: `sub`, `session_id`, `role = 'authenticated'`, `aud = 'authenticated'`, `exp`.
    - Distinct AMR method: `pin` for Students, `otp` for Parents, `password` for Staff.
- [ ] **Parent OTP Delivery**:
  - Configure disposable SMTP provider for guardian one-time email login codes.
  - Verify that OTP recovery tokens are partitioned from live authentication sessions.

---

## 5. Admin First-Time MFA Bootstrap Resolution

- [ ] **MFA Self-Approval Deadlock Resolution**:
  - Historical constraint `check (profile_id <> approved_by)` on `public.staff_mfa_enrollment_approvals` prevents a single initial School Admin from enrolling MFA without a pre-existing second administrator.
  - **Resolution**: Use the authorized operator bootstrap script to insert the initial approval record referencing the system operator profile, OR execute the approved bootstrap seed during disposable database provisioning.
- [ ] **MFA Factor Verification**:
  - Verify that `auth.mfa_factors` contains `status = 'verified'` and `factor_type = 'totp'`.
  - Verify that `public.mfa_factor_trust_registry` contains an active record approved by the operator.
  - Confirm that Admin sessions obtain `aal = 'aal2'` and signed `totp` AMR method.

---

## 6. Live RLS & Security Validation (Phase 11.10D Test Matrix)

Run the full genuine PostgreSQL test suite against the disposable database with synthetic fixtures:

- [ ] **Admin AAL1 Denial**: Verify that an Admin session with `aal = 'aal1'` returns `NULL` for `current_school_id()` and 0 records through RLS.
- [ ] **Admin AAL2 TOTP Factor**: Verify that an Admin session with `aal = 'aal2'` but unverified TOTP factor in `auth.mfa_factors` is denied context.
- [ ] **Admin AAL2 TOTP AMR**: Verify that an Admin session with `aal = 'aal2'` but missing `totp` in `amr` claims is denied context.
- [ ] **Admin Full Authorization**: Verify that genuine Admin AAL2 with verified factor and TOTP AMR resolves `current_school_id()` and reads active school records.
- [ ] **Student Own-Record Read**: Verify that Student session can read only own student, enrollment, attendance, published marks, invoices, and payments.
- [ ] **Student Draft Marks Hidden**: Verify that draft/unpublished marksheets and marks entries return 0 records through RLS.
- [ ] **Student PIN Version Invalidation**: Verify that incrementing `credential_version` on `public.pin_credentials` immediately invalidates active student sessions via database authorization without requiring JWT reissue.
- [ ] **Tenant Isolation**: Verify that foreign-school student and parent records are strictly hidden (0 records returned).
- [ ] **Parent Purpose Separation**:
  - Academic-only access reads attendance and published marks; fee invoices/payments return 0 records.
  - Fee-only access reads invoices and payments; attendance and marks return 0 records.
  - Revoked guardian relationship returns 0 records for all child data.
- [ ] **Operational Write RPC Denial**: Verify that calls to `collect_fee_payment_atomic`, `admit_student_idempotent`, `save_attendance_atomic`, `rotate_student_pin`, and `revoke_student_pin` throw SQLSTATE `42501` for Student and Parent principals.
- [ ] **Recovery Token Rejection**: Verify that JWTs containing `recovery` AMR or `recovery: true` claims are denied portal context.
- [ ] **Session Expiry Rejection**: Verify that expired JWTs and expired provider sessions fail closed.

---

## 7. Application Integration & Route Gating

- [ ] **Portal Route Service Verification**:
  - Verify that `createPortalRouteService` correctly invokes `createPortalAuthenticationAdapter`.
  - Verify that `liveAuthEnabled` remains `false` until final release sign-off.
  - Verify that failed exchanges execute `revokeIssuedSession`.
  - Verify that revocation failures return `{ success: false, blocked: true }` and clear all session cookies.
  - Verify that CSRF state tokens are consumed exactly once to prevent replay attacks.
  - Verify that persistent rate limiting backed by `public.auth_rate_limits` enforces max 5 failed attempts and 15-minute lockout.
- [ ] **Public Route Safety**:
  - Confirm `src/app/login/student/actions.ts` returns `{ phase: 'error', message: 'Student sign-in is currently unavailable.' }`.
  - Confirm `src/app/login/parent/actions.ts` returns `{ phase: 'error', message: 'Parent sign-in is currently unavailable.' }`.
- [ ] **Production Build & Security Diff**:
  - Run `npm run typecheck` (0 errors).
  - Run `npm run lint` (0 errors, 0 warnings on application code).
  - Run all 118+ offline regression tests.
  - Run `npm run build` and verify clean route compilation.
