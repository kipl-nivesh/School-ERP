# Step 14 — Local database and staff authentication foundation

Date: 2026-11-05. Scope: local implementation and review only.

## 1. Executive summary

**LOCAL IMPLEMENTATION COMPLETE.** Incremental schema, restrictive RLS, native SDK staff login/MFA actions, separate protected routes and deterministic tests are prepared. The staff-request switch remains off; no real authentication was attempted.

- **DATABASE MIGRATIONS: NOT APPLIED**
- **LIVE RLS: NOT VERIFIED**
- **STAFF AUTHENTICATION: CODE PREPARED, NOT LIVE-VERIFIED**
- **SUPER ADMIN MFA: NOT LIVE-VERIFIED**
- **STUDENT/PARENT PIN AUTHENTICATION: DISABLED**
- **PRODUCTION RELEASE: NOT APPROVED**

## 2. Current repository state

Next.js 16.4.5, React 19.3.1, TypeScript 6.0.3, installed Supabase SSR 0.12.7 and supabase-js 2.119.0 were used without dependency additions. Installed Next.js data-security, cookies and Proxy documentation and actual SDK implementations were inspected. Existing Steps 12–13 contracts and architecture documents informed the boundary. No Git command was needed to inspect or implement this work.

The designated project is `school-erp` at `https://yedvkcwkflhbqumjwknh.supabase.co`. Its PRODUCTION branch label does not authorize changes. Modern publishable configuration stays in ignored `.env.local`; no key value is copied into this report. `STAFF_AUTH_REQUESTS_ENABLED` defaults to disabled and remains disabled locally. Step 13's historical settings probe was not repeated.

## 3. Files created/modified

Created application code:

- `src/lib/staff/contracts.ts` — bounded input, safe destinations and adapter mapping to existing authorization policy.
- `src/lib/staff/server.ts` — server-only verified provider/live school authorization boundary.
- `src/app/login/staff/{page.tsx,actions.ts,staff-login-form.tsx,staff-login.module.css}` — responsive login and native SDK action preparation.
- `src/app/staff/page.tsx`, `src/app/staff/[role]/page.tsx` — protected staff landing/module boundaries, no domain records.
- `src/proxy.ts` — staff-only cookie refresh preparation.

Created database/review artifacts: the `20261105000200_school_domain.sql` and `20261105000300_staff_security.sql` migrations, `supabase/tests/step-14-rls-plan.json`, [migration review](supabase/STEP-14-REVIEW.md), and this report.

Created tests: `verification/verify-staff-auth.mjs`, `verification/verify-step14-sql.mjs`, `verification/verify-step14-local.mjs`. Evidence in `verification/step-14/`: baseline/preservation JSON, production route JSON, responsive JSON and desktop/mobile screenshots.

Modified only pre-existing `.env.example` (disabled staff switch), `src/lib/supabase/server.ts` (optional HttpOnly cookie mode), and root/Supabase READMEs (milestone pointers). TypeScript regenerated `tsconfig.tsbuildinfo`. No existing dashboard, Step 12 source, prior test or original migration changed.

## 4. Database schema design

The unchanged Step 13 migration defines five identity tables. Two new ordered transactional files add twelve school-domain tables and one MFA approval table: eighteen total. FKs, checks, scope indexes and restrictive defaults are prepared. The only seeded records remain the original five fixed role codes; no school/user/account records were added.

Parent eligibility uses a partial unique Student index, while Parent profile PK/non-null Student FK enforce one Student per Parent identity. Canonical composite guardian/relationship FKs prevent mismatched identity references. History remains separate from current eligibility. See review notes for cross-row invariants still requiring transactional commands.

## 5. RLS policy implementation

All eighteen application tables enable and FORCE RLS and revoke ordinary grants. Four self-scoped SELECT policies expose only caller authorization metadata after native live-session verification. No broad authenticated policy, anonymous grant, self-provisioning, role-write or domain-write policy exists. Unfinished Student/Parent/Teacher/Accountant data access remains denied.

Narrow definer functions have empty search paths, explicit postgres ownership and restricted execution. Public schema CREATE is revoked. Private audit/invalidation triggers cannot be invoked directly by app roles. Infrastructure owner/BYPASSRLS authority remains outside application protections; this was reviewed statically, not tested on PostgreSQL.

## 6. Staff authentication implementation

Admin, Teacher and Accountant use native `signInWithPassword`. Role selection requests a context; it grants nothing. Verified SDK claims, matching confirmed Auth user, current provider session, active school profile, live membership, existing permission catalog and current context are all required before a protected redirect.

Missing configuration/schema, disabled requests, provider errors, cookie failures or unavailable authorization deny access with generic messages. No embedded credentials, signup, password-reset request or account-management endpoint exists. UI submission in review mode reports that no authentication request was sent.

## 7. Super Admin MFA enforcement

Super Admin remains an Admin privilege tier, never a sixth role. Active Admin membership and native verified AAL2 are required; password-only access and pending privileged activation are denied. Code prepares TOTP enrollment, factor ownership checks, challenge/verification and full authorization reread before access. Transient QR material is neither logged nor persisted.

Enrollment actions reject an existing verified factor and require consumption of a short-lived independent approval. No app API creates approvals. Bootstrap, approval issuance and lost-factor recovery remain separately reviewed workflows. Approval issuance must verify independent approver MFA/recent authentication. Native direct MFA APIs, factor replacement/recovery, races and stale AAL2 behavior remain **unverified**; application approval checks do not enforce provider-wide lifecycle restrictions. These are live-enablement blockers, not completed guarantees.

## 8. Session and route security

Server-only SDK verification uses `getClaims` plus `getUser`, native issuer/audience/password AMR and an own-session database check; `getSession` alone grants nothing. Protected page guards reread school authority. The separate Proxy matches only `/staff/:path*` and `/login/staff`, propagates refresh cookies and sets private/no-store caching. Staff cookies opt into HttpOnly, production Secure, SameSite Lax and root path.

Redirects are allowlisted. Logout revokes the own app context before native local sign-out; failures do not claim completed logout. Security-state changes prepare context invalidation/version increments; revoked contexts cannot be revived by activation. No OAuth callback is necessary for this password flow. Real cookie refresh/revocation, concurrency and provider session-retention semantics remain untested.

## 9. Student/Parent scope preservation

Original Step 12 code is hash-identical. `LIVE_AUTHENTICATION_ENABLED=false`. Student remains Registration Number + six-digit Student PIN; Parent remains linked Student Registration Number + independent six-digit Parent PIN, exactly two fields each. No third identifier, live PIN verifier, PIN storage or account creation was added. Initial eligibility is one Student per Parent identity and at most one eligible Parent per Student. Fictional multi-child Parent previews stay separate from backend eligibility.

## 10. Security test results

| Executed check | Result | Evidence limit |
| --- | --- | --- |
| Step 14 staff security | 82 groups passed | Mocked SDK/DB inputs; no actual credentials or sessions |
| SQL static review | 30 checks passed | Text assertions only; no SQL parser, execution, RLS or concurrency proof |
| Supabase configuration | 25 checks passed | Offline configuration/static/mock checks |
| Step 12 authentication foundation | 81 groups passed | Synthetic contract evidence |
| Existing authorization contracts | 44 groups passed | Pure policy contracts |
| All five dashboard mock-data scripts | Passed | Fictional data invariants |
| ESLint, TypeScript, production build | Passed | Staff requests explicitly off during build |
| Production route smoke checks | 12 passed | Localhost only; six previews/login 200, four protected routes 307 to login, unknown staff role 404 |
| Browser responsive checks | 320/375/768/1024/1440 passed | No horizontal overflow; accessible inputs; generic local denial; no console errors |
| Preservation/config exposure | Passed | Baseline hashes and in-memory key comparison; no key values printed |

New test commands: `node verification/verify-staff-auth.mjs`, `node verification/verify-step14-sql.mjs`, and, with the local production server on port 3008 and staff flag off, `node verification/verify-step14-local.mjs`. The original verification scripts also passed. A sandbox localhost restriction was resolved by approved local-only execution; no hosted request was substituted.

The future integration matrix contains twenty scenarios, all **NOT RUN**. It covers real-session role/data isolation, revocation, audit, financial boundaries, Storage, Parent concurrency and MFA lifecycle. No screenshot contains a real MFA QR or credential.

## 11. Migration review findings

Exact unapplied sequence:

1. `supabase/migrations/20261105000100_identity_foundation.sql` — unchanged original.
2. `supabase/migrations/20261105000200_school_domain.sql`.
3. `supabase/migrations/20261105000300_staff_security.sql`.

Offline review checked dependency order, table/FK names, permission catalog, RLS/grants, narrow definer arguments, audit trigger scope, invalidation and Parent uniqueness. No live security audit is claimed. Auth internal tables/columns and migration-owner powers must be reviewed against the target. Independent approval consumption is prepared atomically, but issuance and provider-wide factor lifecycle enforcement remain pending. Detailed findings and ownership assumptions are in the migration review.

## 12. Existing dashboard preservation

Baseline SHA-256 comparison confirms all old dashboard/routes/layouts/styles/mock data and Step 12 auth source unchanged; only the five listed pre-existing files plus generated TypeScript metadata differ. All six existing public preview routes returned HTTP 200 in the fresh production build. New protected routes contain no real school records. Desktop/mobile login evidence is in `verification/step-14/`.

## 13. Remaining blockers

No schema is deployed, no real school authorization state exists from this work, and no native sign-in/MFA/RLS integration was verified. Native MFA replacement/recovery behavior and direct API bypass attempts require isolated proof. Auth internals, cookie lifecycle, revocation timing, concurrent approvals and Parent mappings remain untested.

First Super Admin bootstrap, independent approval issuance/recovery, last-admin concurrency and privileged IAM mutation commands are not implemented. Domain-purpose/assignment policies, cross-row eligibility transactions and production abuse controls/operational review remain pending. Domain operations stay default-deny. Staff requests and PIN authentication must remain off pending separate authorization and proof.

## 14. Exact next actions requiring owner approval

Approve a specific isolated target and migration review before any SQL. Then separately authorize application of the three exact ordered files and synthetic account/bootstrap setup; review ownership, Auth internals and recovery controls first. Authorize genuine-session tests for the NOT RUN matrix plus approval races/direct native factor lifecycle, cookies and revocation. Any hosting/settings/Storage change, live data connection, deployment or Git operation needs separate authorization. No such action was started or inferred from local completion.

## 15. Confirmation no SQL was executed

No SQL parsing/execution against a database, migration push/reset/seed, hosted data operation or Storage write occurred. No real account, provider sign-in, password reset or MFA request was performed. No secret/service-role key or database password was requested or used. Only official public documentation and local test/browser activity were used in Step 14.

## 16. Confirmation no deployment or Git operations

No deployment, commit, push, merge, rebase, branch change or other Git operation occurred. Local source and review artifacts were edited; the production build and localhost server were verification only.

## 17. Confirmation Step 15 has not started

Step 15 has not started. Step 14 completion is local-only; database migration, live authentication, RLS proof and production release remain unapproved/unverified as stated above.
