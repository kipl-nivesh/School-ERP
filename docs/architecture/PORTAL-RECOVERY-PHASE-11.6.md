# Phase 11.6 Student and Parent portal recovery

## Implementation manifest

The recovery worktree is based on `a6872451856d390c80d2fd7324fd297cda201f3e`. The following files were recovered from local commit `826fd1e8ed99cabefb7f5a884c927914384692ce`.

| Files | Decision |
| --- | --- |
| `src/components/workspaces/live-student-dashboard.tsx`, `src/components/workspaces/live-parent-dashboard.tsx` | Adapted the read-only views. Excluded subscription UI and checkout. The Parent view reuses Student cards and links only to returned eligible child options. |
| `src/components/workspaces/live-student-dashboard.module.css`, `src/components/workspaces/live-parent-dashboard.module.css` | Reused the responsive card grid, accessible child links and Staff design shell. |
| `src/lib/student/dashboard-model.ts`, `src/lib/parent/dashboard-model.ts`, `src/lib/student/identity-contracts.ts` | Reused view types, verified Student scope and unambiguous enrollment selection. |
| `src/lib/student/dashboard-repository.ts`, `src/lib/parent/dashboard-repository.ts` | Reused trusted server adapter seams. Row scope is now checked before visibility filters. Parent reads require the existing dashboard permission in addition to the verified relationship and its independent academic or fee permission. The deployed reader entry points remain unavailable. |
| `src/lib/auth/portal-session.ts` | Reused native session verification and binding seams. Added a runtime Student/Parent role allowlist. No SDK client or database adapter is wired. |
| `verification/verify-student-dashboard-boundary.mjs`, `verification/verify-parent-dashboard.mjs` | Restored and extended route, relationship, permission and synthetic-render checks. |

New files are `verification/verify-student-portal-recovery.mjs` and this manifest. Synthetic fixtures live in the test files. No recovered code is imported by the protected routes or the public fictional dashboards. The legacy development widgets that construct synthetic contexts remain outside the recovered implementation.

## Security and release blockers

- Student ID + PIN still needs genuine Supabase session issuance, verified PIN evidence bound to the exact native session and canonical Student, and credential-version and revocation checks. A standalone Keycloak token or client-supplied identity grants no access.
- Parent needs a native session bound to a canonical guardian and verified relationship. Recovery, relationship revocation, effective permissions, and the independent academic and fee purposes must be verified against real user-session RLS.
- Migration 10's `current_school_id()` calls the Staff liveness helper, which uses the native password issuer and AMR assumptions from migration 3. Do not route Student OIDC or Parent sessions through that context mechanism without proving compatibility. Verify portal-specific context and RLS against the intended catalog, including exact school, student and section bindings and versioned guardian relationships. Keep both portals disabled in the meantime.
- The historic announcements policies were dropped in migration 7 and the migration 18 replacement is Staff-scoped. The offline announcement card only accepts an already-authorized projection. Verify an appropriate portal projection before populating it. Verify the dedicated exam schedule projection independently from marks publication.
- The current disposable ledger and permissions remain unresolved. No hosted database query, credential use, native session, gateway operation or production activation is part of this phase. School-level billing and payment operations are deferred.
