# Step 14 migration and integration review

Prepared locally on 2026-11-05. **No SQL executed; no live RLS/MFA proof.**

## Unapplied sequence

1. `migrations/20261105000100_identity_foundation.sql` — existing Step 13 artifact, unchanged; five roles and five identity tables, no users.
2. `migrations/20261105000200_school_domain.sql` — twelve domain tables: singleton school configuration, staff profiles, years/classes/sections, students, guardians, relationship history, Parent login identities, enrollments, teacher assignments and audit events.
3. `migrations/20261105000300_staff_security.sql` — permission catalog, four self-metadata policies, narrow session/context commands, audit/invalidation triggers and one MFA enrollment approval table. Eighteen application tables total.

Each file is transactional and intentionally fails on conflicting definitions. None is an idempotent production repair script. Target schema, migration history, PostgreSQL/Auth versions, ownership and rollback/backup must be reviewed before separately authorized application.

## Ownership and authorization

All eighteen tables enable and FORCE RLS, with ordinary grants revoked. The migration operator must use reviewed infrastructure ownership; SECURITY DEFINER functions explicitly belong to `postgres`, with empty search paths, qualified relations, no dynamic SQL and restricted EXECUTE grants. The operator must confirm this owner can perform the intended maintenance despite FORCE RLS. Owners/superusers/BYPASSRLS remain an infrastructure trust boundary; school Super Admin receives none of these database powers. Public schema CREATE is revoked from PUBLIC, anon and authenticated.

Only four policies allow SELECT: own profile, own memberships, own privileged tier and own current-session context. They require a native password-authenticated, live provider session. No policy grants ordinary writes. Domain tables, enrollment approvals and audit events remain inaccessible directly. The session helper touches Auth tables, not policy-protected application tables, avoiding policy recursion.

`staff_session_is_live()` checks only the caller's native session against `auth.sessions` and confirmed/unbanned `auth.users`. `activate_staff_context(text)` accepts only a requested staff role, derives identity/session from native claims, requires live membership/account status, dashboard permission and AAL2 for active Super Admin. It cannot revive a revoked context. `revoke_staff_context()` revokes the own app context before native sign-out. Permission/tier/membership changes increment authorization versions and revoke existing contexts.

Audit row updates/deletes and table truncation are rejected by triggers; ordinary clients cannot insert. Narrow definer commands append events atomically. Infrastructure owners can disable triggers, so this is not tamper-proof against database operators. No financial write path or ledger is introduced; existing financial-integrity contracts remain unchanged.

## MFA lifecycle limits

The enrollment Server Action refuses an existing verified factor. Before native enrollment, `consume_staff_mfa_enrollment_approval()` atomically consumes a ten-minute, one-use approval from a different currently active Super Admin. It rejects an existing verified native factor and logs consumption. If provider enrollment fails afterwards, a new approval is necessary. No application endpoint creates approvals.

Approval creation must independently verify the approver's MFA, recent authentication and decision; a row alone cannot prove those facts. First Super Admin bootstrap, lost-factor recovery, last-admin protection and approval issuance remain separately reviewed operator workflows, not implemented account-management APIs. Pending Super Admin activation stays denied.

**These application checks do not govern direct calls to Supabase Auth's MFA endpoints.** Native enrollment/replacement/unenrollment/recovery restrictions, factor races, refresh-token behavior and stale AAL2 tokens must be verified with genuine isolated sessions before enablement. Native Auth settings were neither inspected nor changed in Step 14. Do not treat the approval table as provider-wide enforcement. The dependencies on `auth.sessions`, `auth.users.banned_until` and `auth.mfa_factors` require target compatibility review. Staff requests remain disabled.

## Parent and domain invariants

The partial unique index permits at most one login-eligible Parent mapping per Student under concurrent writes. A Parent profile primary key and non-null Student FK bind each Parent identity to exactly one Student. Composite FKs bind its canonical guardian profile and relationship. Relationship history is stored separately from eligibility.

Verified link status/dates/purpose, active membership, distinct Student/Parent profiles, synchronized versions/invalidation, overlap-free enrollment/teacher history and reassignment require future transactional commands and integration tests. Those commands are absent; domain access remains denied. No Student/Parent PIN storage or live verifier exists. No school-specific registration normalization is silently introduced.

## Next integration gate

Keep `STAFF_AUTH_REQUESTS_ENABLED=false` and Step 12 `LIVE_AUTHENTICATION_ENABLED=false`. Use only the ignored local modern publishable-key configuration; no secret/service-role credentials or database passwords belong in the app. The exact future test matrix is `tests/step-14-rls-plan.json` (all NOT RUN), including native MFA recovery. Add approval consumption/concurrency and direct native factor lifecycle tests when an isolated environment is separately approved.

After owner approval of an isolated target: review ownership/Auth internals, apply the exact ordered SQL, provision separately approved synthetic identities with independently reviewed bootstrap, then exercise genuine JWT sessions, all negative RLS cases, concurrent Parent mappings, audit/invalidation, MFA factor lifecycle, cookie refresh and logout/revocation. Domain positive policies and IAM mutations require further design. No production enablement is implied by passing local tests.

Compatibility references reviewed: installed Next.js data-security, cookies and Proxy guides; installed Supabase SDK; [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Public documentation does not establish hosted configuration.
