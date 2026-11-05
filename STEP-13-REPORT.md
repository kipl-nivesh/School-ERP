# Step 13 — Supabase connection and backend foundation

## Scope and outcome

Implemented the owner's clarified scope from this chat: local modern-publishable-key configuration, lazy Next.js Supabase clients, minimal **unapplied** identity migration/default-deny RLS, staff provider-session inspection scaffolding and verification. The older full Step 13 master prompt was not available locally; no broader unpublished requirements are claimed complete.

The owner-created project `school-erp` is reachable at `https://yedvkcwkflhbqumjwknh.supabase.co`. Free plan and Singapore region are owner-reported, not independently queried. **The authorized read-only Auth settings probe returned HTTP 200.** This is endpoint connectivity evidence, not a successful school login, RLS test, PIN session proof or production approval.

| Area | Actual status |
| --- | --- |
| Local public configuration | Configured; values validated; supplied key kept only in ignored .env.local |
| Supabase endpoint reachability | GET Auth settings HTTP 200; no response body/key printed |
| Next.js clients | Browser and request-scoped server factories prepared; unwired to dashboards |
| Database migration/RLS | Prepared locally, never executed; no allowing policies/grants |
| Staff authentication | Inspection scaffolding only; schoolAccess always false; no staff sign-in or role/context authorization enabled |
| Student/Parent PIN | Disabled; Step 12 contracts unchanged; provider proof/security approval pending |
| Production release | Not approved or deployed |

## Implemented files

New:

- `src/lib/supabase/config.ts`: pure public configuration validation and lazy environment access; rejects missing, legacy/privileged-shaped keys and unsafe/nonstandard hosted URLs; errors omit values.
- `src/lib/supabase/browser.ts`: lazy browser client factory using official SSR SDK.
- `src/lib/supabase/server.ts`: server-only, request-scoped async cookies client with no-store requests; cookie writes explicitly restricted to a future response-capable context.
- `src/lib/supabase/staff-session.ts`: unwired claims/current-user inspection. All paths deny school access, including a matching provider identity; no password input, signup, role inference, authenticated context or user details returned.
- `scripts/check-supabase.mjs`: redacted configuration-only check and explicit read-only probe with timeout/redirect rejection; no table or account operations.
- [Prepared identity migration](supabase/migrations/20261105000100_identity_foundation.sql) and [migration README](supabase/README.md).
- `verification/verify-supabase-config.mjs`: offline config, static migration and mocked staff-denial tests.
- [Setup and limits](docs/architecture/STEP-13-SUPABASE-FOUNDATION.md) and this report.
- Local `.env.local`, excluded by the existing `.env*` ignore rule; not part of source or this report's public file inventory.

Updated `package.json`/lockfile, keyless `.env.example`, current README, three architecture/readiness summaries (SYSTEM-ARCHITECTURE, SUPABASE-ENVIRONMENT-READINESS, STEP-12-NEXT-INTEGRATION-GATE) and generated `tsconfig.tsbuildinfo`. All historical reports and Step 12 authentication source/tests are unchanged.

Installed dependencies: `@supabase/supabase-js` **2.119.0**, `@supabase/ssr` **0.12.7**, `server-only` **0.0.1** (manifest compatible ranges, lockfile records resolved versions). The initial sandboxed install stalled and was canceled; host-authorized retry completed successfully. No Supabase CLI was installed or project linked through a CLI.

## Configuration handling

Uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The supplied modern publishable value is in `.env.local` only; source/template/docs/tests were scanned for accidental copies and none were found. No value is included in error messages, logs or this report. `.env.example` has the public URL and an empty key field. No legacy anon fallback, secret/service-role key, database password or elevated client exists.

The existing `.gitignore` covers `.env.local`; no Git command was run and no Git repository was initialized/modified. Public client variables are browser-visible by design, and a publishable key identifies the app, not a school person. It does not prove or replace authenticated identity/RLS. Restart dev/rebuild local production preview after changing public variables. The initial URL validator intentionally supports standard HTTPS hosted-project URLs only; custom/local domains require later explicit support.

## Prepared database foundation — not applied

The migration declares **five tables**: roles, profiles, user_roles, admin_privileges and role_contexts. It seeds only the five fixed primary role codes. There are no users/profiles/assignments/privileged grants or school records. Super Admin is tied to the Admin membership tier, not a sixth role.

Every table enables and forces RLS, ordinary grants are revoked from PUBLIC/anon/authenticated, and **zero allowing policies** are created. Thus no ordinary table access is intentionally enabled. No automatic Auth-user provisioning trigger, self-update policy, security-definer helper, bootstrap, privileged app credential or signup path is created.

These are prepared review artifacts, not executed SQL or validated migrations. No database parser, constraints, schema introspection, live RLS, concurrency or policy performance test ran. The migration needs target/version/schema/ownership review, separate application approval and rollback/backup planning; it deliberately fails on conflicting existing tables rather than silently assuming their shape. It is not the full Step 7 blueprint or production authorization.

Parent/Student domain/eligibility tables, permission grants, operational audit/finance workflow, private Storage policies, provisioning commands, bootstrap/MFA enforcement and role switching remain outside this minimal slice. No actual database objects were created by this work.

## Staff scaffolding and SSR limitations

Staff scaffolding may inspect actual provider claims/current user when explicitly called in a future request, but never treats that as application access. It cannot infer a staff role from user metadata or produce a Step 12 trusted context. Native staff email/password UI/actions, real sessions, live memberships/context/tier, Super Admin mandatory MFA enforcement, recovery and permissions remain unimplemented.

There is no Proxy/middleware, login page, callback or refresh route. Server clients default to read-only cookies and explicitly reject attempted updates; writable mode is reserved for future Server Actions/Route Handlers and still subject to Next's response rules. No cookie was written. The SDK factories are prepared plumbing, not a completed SSR login lifecycle or production authorization system. No route imports/constructs them.

Official [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/nextjs) and [API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys), plus installed Next data-security/Proxy/cookies guides, informed this preparation. Supported primitives do not establish school-specific authentication security.

## Tests actually executed

| Command/check | Exit / actual outcome |
| --- | --- |
| npm install @supabase/supabase-js @supabase/ssr server-only | Successful host retry, exit 0; sandbox attempt canceled after stalling |
| node verification/verify-supabase-config.mjs | 0; **25** offline checks passed (19 config/static migration and six mocked staff paths) |
| npm run supabase:check | 0; actual local configuration format accepted; no network |
| npm run supabase:probe | 0; **GET /auth/v1/settings HTTP 200**, publishable apikey only; no response body/key output |
| node verification/verify-auth-foundation.mjs | 0; **81** Step 12 groups passed |
| node verification/verify-auth-contracts.mjs | 0; **44** existing authorization groups passed |
| node verification/verify-admin-data.mjs | 0; PASS |
| node verification/verify-teacher-data.mjs | 0; PASS |
| node verification/verify-student-data.mjs | 0; PASS |
| node verification/verify-parent-data.mjs | 0; PASS |
| node verification/verify-accountant-data.mjs | 0; PASS |
| npm run lint | 0; PASS, including final updated verification script |
| npm run typecheck | 0; PASS |
| npm run build | 0; webpack production build passed with local env loaded |
| npm audit --omit=dev --json | 0; **zero runtime vulnerabilities** reported |

Installation audit noted eight moderate findings in the full dependency tree; no automatic/forced remediation was applied. The runtime-only audit above reported zero. Dependency advisory results are time-specific, not a security guarantee.

A fresh `npm run start -- --port 3007` started successfully. Local read-only Node fetch smoke checks returned HTTP 200 and Brightcamp branding for `/`, `/admin/dashboard`, `/teacher/dashboard`, `/student/dashboard`, `/parent/dashboard` and `/accountant/dashboard`; smoke script exit 0. Preview was stopped after checks. No UI changed; no browser/responsive or actual staff/PIN authentication test is claimed.

The SQL checks are textual RLS/revoke/allow-policy checks only. Staff tests replace the client boundary with in-memory stubs and assert schoolAccess false for missing/error/mismatched/matching provider identity. They do not create a real session or verify provider cryptography. No migration or RLS result is reported as passed.

## Preservation

SHA-256 comparison against **291 pre-existing workspace files outside dependency/build-output trees** (local env excluded) confirms only the documented package/config/status/readiness/build-metadata files changed. All pre-existing `src` files, including every dashboard/navigation and Step 12 auth contract, all historical reports and existing verification suites are byte-for-byte unchanged. New Supabase source is isolated under its own directory. No fifth/sixth role change, login route, fake family mapping or school data was introduced.

Student still requires registration plus independent six-digit Student PIN; Parent requires linked registration plus independent six-digit Parent PIN, with no additional identifier/third field. Initial one-Student/one-Parent-login policy remains; richer login relationships are deferred. Fictional Parent two-child preview is preserved and not real eligibility evidence. LIVE_AUTHENTICATION_ENABLED remains false.

## What remains blocked or unverified

- Migration application, actual schema/grants/deny behavior and live ordinary-user RLS/Storage tests require separate approval and execution.
- No staff sign-in, native MFA, email delivery, Super Admin bootstrap/provisioning or application role/context/session lifecycle has been executed or enabled.
- Safe cookie refresh/callback handling and verified live authorization must precede protected dashboard access; current previews remain public fictional pages.
- Student/Parent six-digit credential verification, canonical provider-to-Supabase subject/session binding, durable limiter, account/link/version revocation and recovery remain pending the isolated proof and security approvals.
- No real school records, production release, deployment or Git operation is authorized by this preparation.

The unavailable full master prompt may contain additional requirements; those are not inferred. The explicitly clarified foundation scope above is prepared and tested to the limits stated. Step 14 has not started.

## Operations boundary

External operations were limited to official public documentation, npm dependency/advisory requests and the explicitly authorized read-only Supabase Auth settings GET. No SQL/migration, table read/write, real user/account, password/PIN, token/session issuance, secret/service-role key, database password, production record, deployment or Git action occurred. The only project credential used was the owner's modern publishable key, retained locally and never displayed by verification.
