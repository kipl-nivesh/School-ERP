# Brightcamp fast-track implementation and release assessment

Last updated: 2026-11-12 (Asia/Calcutta). **Partial local implementation; NOT production-ready.**

**Latest sprint:** staff password-recovery orchestration and academic management are implemented locally. Migrations **1–25** replay successfully on fresh PostgreSQL 18.4. The expanded offline suite passes **43 tests**, with additional real PostgreSQL authorization, retry, revision and overlap checks. TypeScript, ESLint and the Windows production build pass. Native cloud Auth/email, real browser workflows and Linux execution remain **UNVERIFIED**. See **Final functional sprint — 2026-11-12** at the end for the current status and exact files; earlier sections preserve previous evidence rather than claiming the remaining workflows are complete.

**Continuation status (2026-11-11):** migrations 1–23 now apply successfully to a fresh local PostgreSQL 18.4 cluster. Actual database tests pass for admission retries/collisions, attendance rollback, homework retries/subject authorization, payment settlement/retries/overpayment, and teacher roster/school/expired-assignment RLS. Auth tables and claims are synthetic: native Supabase Auth, full RLS coverage and cloud execution remain unverified. TypeScript, ESLint and the Windows production build pass. The new offline regression suite now has 21 passing tests. See **Continuation implementation and exact remaining queue** below for current changes and limitations; the earlier batch sections below are retained as history and are superseded where noted.

This report distinguishes source changes, offline evidence and unverified database behavior. It does not declare the full ERP complete. The affected authentication, billing and release paths remain blocked. No Supabase Cloud migration, native account creation, production query, cloud project creation or deployment was performed. Continuation SQL execution used only new local fictional PostgreSQL clusters.

## Implemented locally

1. Added migration 17 to reject missing role/tenant/identity in fee collection, require the selected membership's payment permission, prevent caller-supplied school fallback, serialize idempotency retries, compare the full payment payload, lock invoices, use the existing receipt sequence and audit the student's profile identity. Removed the obsolete seven-argument RPC overload. Direct invoice/payment/expense/payment-intent writes and unsafe client rate-limit/reset execution are revoked. This intentionally leaves expense/invoice creation and billing settlement unavailable until reviewed commands exist.
2. Added migration 18 to bind active roles to the native live-session/tenant helper, validate membership start dates, enforce explicit permission grants and role ceilings, and add staff read policies for previously inaccessible tables. Teacher reads/writes check current assignment/enrollment. Teacher attendance writes are restricted to the current date. Financial reads and administrative class/student access receive restrictive permission policies. High-risk permission checks require AAL2 and a recent password AMR timestamp; parity with the application's stricter reauthentication evidence still needs native tests.
3. Added migration 19 for a single transactional admission command: student, enrollment with the section's academic year, pending guardian relationship, contact draft and audit event. Portal activation remains separate. Direct student/enrollment mutations are revoked. The DAL now uses this command instead of separate inserts. Registration identifiers use UUIDs, not truncated timestamps. Admission is atomic in the proposed SQL, but retry idempotency is not implemented: operators must reconcile an uncertain response before submitting a new admission.
4. Added migration 20 to separate Parent academic and fee purposes, require current verified relationships and explicit purpose permissions, and require an active Student membership for subscription access. Existing subscription gates remain. Restrictive policies do not supply missing permissive portal policies; complete portal functionality is still pending.
5. Added migration 21 to stop onboarding from minting unusable UUID invitation tokens. Step 4 now checks that invitations were issued through the hashed-token command, using its audit event. Old invitations are preserved; they are not regenerated. Direct onboarding-progress mutations are revoked. Production invitation delivery remains unavailable.
6. Added server-rendered staff record lists with fresh server authorization, fixed table/projection allowlists, explicit tenant filters, permission checks, bounded results and generic unavailable states. They cover students, staff, classes, sections, academic years, teacher assignments, timetable, attendance, homework, exams, invoices, receipts, expenses, announcements and audit. These are initial lists, not full editing/reporting workflows. Empty results mean no accessible rows, not proof that RLS is correctly configured.
7. Added authenticated admission and fee collection server actions/forms. Authorization is obtained from the current session, never accepted from form data. Success requires a successful DAL result. Payment handling now recognizes the RPC's `settled` and `idempotent_duplicate` statuses instead of expecting a nonexistent `success` field.
8. Protected staff routes use the new database-backed surface. The existing five fictional dashboard designs and data remain. All 36 development adapter methods that accept a context now reject tenant-bound sessions. This is a preview boundary, not an authentication mechanism; the server and RLS remain the security boundary.
9. Removed fabricated staff-account success from the live DAL. It now returns `INVITATION_REQUIRED` without writing an audit event that falsely claims account creation.
10. Logout attempts native sign-out even if application-context revocation fails, but does not claim complete revocation in that case. MFA enrollment approval requirements remain intact.

## Verification

| Command | Observed result | Scope |
| --- | --- | --- |
| `node --test verification/verify-auth-test-target.mjs` | 68 passed | Offline target/transport guard |
| `node verification/verify-supabase-config.mjs` | 25 passed | Configuration/static/mock checks |
| `node verification/verify-step24b-tenant-client.mjs` | 8 assertions passed | Mock tenant wrapper |
| `node --test verification/verify-fast-track.mjs` | 11 passed | New preview, DAL, RPC-contract and static SQL checks |
| `node verification/verify-phase4-authentication.mjs` | 18 passed | Synthetic authentication models, not native Auth |
| `node verification/verify-phase5-multi-tenant-subscription.mjs` | 12 passed | In-memory subscription models/static SQL |
| `node verification/verify-phase6-onboarding-management.mjs` | 12 passed | In-memory onboarding models/static SQL |
| `node verification/verify-supabase-dal.mjs` | 23 passed | Offline delegation, policy and static SQL checks |
| `node verification/verify-dashboard-interactions.mjs` | 25 passed | Fictional adapter interactions, not browser or database tests |
| `node verification/verify-staff-auth.mjs` | 83 passed | Mock SDK, school resolution and server-action checks |
| Five `verify-{admin,teacher,student,parent,accountant}-data.mjs` scripts | All passed | Fictional preview-data consistency |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Passed | Local TypeScript |
| `node node_modules/eslint/bin/eslint.js .` | Passed after correcting three introduced lint errors | Repository lint |
| `npm run build` | Passed, including the final rerun: compile, TypeScript, 10 static pages and build traces | Windows, Next.js 16.4.5 / Node 24.18.0 |
| `git diff --check` | Passed; existing LF/CRLF advisory warnings only | Whitespace check, no Git mutation |

The initial build failed with sandbox EPERM creating generated `.next` output. A permitted execution outside that restriction succeeded. No deletion/reset/clean was used. The initial staff-auth suite exposed a pre-existing mock that returned a boolean for `current_school_id`; its fixture now returns a school ID, supplies the school row and tests missing-school denial. Logout assertions reflect the newly required native sign-out attempt. Authorization code was not weakened to pass these tests.

**UNVERIFIED:** migrations 17–21 execution/syntax against PostgreSQL; native Auth/MFA/recovery/email; positive/negative RLS; database concurrency, rollback and tenant isolation; role-based browser workflows; Linux dependency installation/build; Vercel deployment. Static SQL checks cannot substitute for these tests. Existing fixture-based evidence for migrations 1–16 is not native Supabase evidence for these changes.

## Module status

| Module | Current status and remaining work |
| --- | --- |
| Five fictional dashboards | Preserved; fixture consistency and adapter interaction checks pass |
| Staff login, school selection, session checks | Existing native SDK/server scaffolding retained; mock regression coverage; native flow unverified |
| Logout | Native sign-out fallback implemented and mock-tested; provider revocation unverified |
| Email confirmation, password reset/recovery | Incomplete; no new publicly callable recovery path enabled |
| Admin MFA enrollment/recovery | Blocked: legacy approval RPC still denies; independent approval/trust lifecycle unresolved |
| Student/Parent authentication | Production PIN-to-provider-session integration remains disabled; synthetic tests are not genuine login |
| School/staff administration | Live directory reads prepared; invitation-based provisioning incomplete; fabricated creation removed |
| Admission/enrollment | Atomic SQL command, DAL, server action and form prepared; DB execution and retry handling unverified |
| Parent/guardian relationships | Pending contact/relationship persisted by proposed admission transaction; verification/binding flow remains separate; purpose RLS prepared |
| Classes/sections/teacher assignments | Live reads and policy changes prepared; comprehensive mutation UI/commands remain pending |
| Attendance/homework/timetable | Live lists and staff RLS prepared; complete live editing workflows pending |
| Exams/marks/results | Staff read policies/lists prepared; atomic marks entry, publication and portal result workflows pending |
| Fees/collections/receipts | Hardened atomic collection command and live form prepared; actual settlement/concurrency unverified; invoice lifecycle and receipt export pending |
| Expenses/accounting | Read list prepared; direct writes disabled; audited expense/refund/accounting commands pending |
| Reports/exports | Complete live reports, permission-sensitive exports and reconciliation pending |
| Notifications/announcements | Staff list policy prepared; authoring, delivery and recipient workflows pending |
| School settings | Existing DAL/settings scaffold retained; complete live editing integration pending |
| User/role management | Existing scaffolding retained; complete fine-grained privileged commands and recent-reauthentication lifecycle pending |
| Onboarding/platform administration | Existing native-backed command scaffolding retained; invitation boundary corrected in proposed SQL; full workflow unverified |
| Subscriptions/billing | Access-purpose hardening prepared; client settlement disabled; provider orders, verified webhooks, refunds and reconciliation pending |
| Files/documents | Secure private storage, upload validation, lifecycle and signed-download authorization pending |

No live module is declared complete: its real database operations and authorization checks have not been executed on an approved isolated target.

## Remaining critical blockers and priority

1. Review and test migrations on an explicitly approved disposable target. Resolve SQL/policy failures without broadening grants or using production fixtures. The test policy remains disabled/unapproved.
2. Resolve the MFA approval/trust mismatch, trusted durable rate limiter and genuine Student/Parent provider-session design. Do not reactivate the quarantined caller-controlled limiter/reset functions. Implement confirmation/recovery without granting roles or clearing administrative reset requirements from client claims.
3. Complete atomic invoice/expense/refund/marks commands, admission retry reconciliation/idempotency, and missing positive portal policies. Confirm every existing permissive policy is intersected appropriately; this batch is not a full security sign-off.
4. Complete invitation delivery and credential onboarding. Onboarding confirms issuance, not proof of delivery. Legacy UUID invitations need deliberate revocation/reissue through a reviewed flow; do not expose old tokens.
5. Complete the remaining editing/reporting/storage/billing workflows above. Existing DAL methods outside the new surface still contain placeholder display values and incomplete implementations; do not expose them as production-complete modules.
6. Execute real role/tenant/browser tests and a Linux clean dependency installation/build before requesting deployment approval.

## Isolated test plan — no execution authorized here

Use the Step 2B guard and an independently approved disposable project. Keep production identifiers on the denylist. The existing pinned Auth transport permits `/auth/v1/` only; database REST/SQL tests require a separately reviewed target-pinning extension, not bypassing that transport. Do not set a cloud execution flag merely to make a test pass.

Use two synthetic schools and native users for all five roles; only synthetic `example.invalid` data. Obtain actual provider sessions and MFA evidence. Do not fabricate JWT claims as proof of native authentication.

- Fee RPC: anonymous, missing role, missing tenant, revoked session, future/expired membership, wrong permission and wrong-school cases must deny without writes. Verify obsolete overload absence and execute grants. Positive collection changes payment/invoice/audit together. Inject an audit failure and verify full rollback. Race identical keys and competing payments; assert one receipt per request, payload collision denial and no overpayment.
- Admission: valid school/class/section succeeds with year/contact/pending guardian; wrong-school section and injected failure roll back every row. Concurrent admissions receive distinct identifiers. Record current lack of retry idempotency as a release issue.
- RLS: exercise REST directly, not only the application. Matrix each table/action across role, permission, school, assignment date, enrollment date, relationship status/date/purpose and subscription state. Fee-only Parents must not read academics and academic-only Parents must not read financial rows.
- Direct writes: deny financial settlement/balance manipulation, payment-intent completion, student/enrollment bypass, onboarding-progress forgery, limiter threshold override and bucket reset.
- Sessions/MFA: login before/after confirmation, mandatory admin AAL2, untrusted enrollment, revoked session, school switch, recovery/reconfirmation, logout RPC failure and native sign-out failure. Recovery may not bypass active profile/membership/reset requirements.
- Invitations: secure issuance, wrong identity, expiry, replay, revocation, delivery failure, old UUID incompatibility and onboarding confirmation. No bearer token logging.
- Browser: all role workflows, generic failure states, retry behavior, no mock success, no private response caching and preserved fictional previews.

## Deployment and migration plan

Actual remote migration history and Vercel settings were not queried. First reconcile remote history through an approved read/review process. Do not assume migrations 1–16 are applied merely because they exist locally. Their hashes are unchanged from this task's starting snapshot.

After an approved disposable rehearsal and review, the new ordered migration sequence is:

1. `20261111001700_financial_authorization_hardening.sql`
2. `20261111001800_operational_staff_policies.sql`
3. `20261111001900_atomic_student_admission.sql`
4. `20261111002000_parent_access_purposes.sql`
5. `20261111002100_onboarding_invitation_boundary.sql`

Each file is transactional. Do not deploy this sequence independently of the compatible application changes: it intentionally revokes old write paths. Plan a maintenance/feature-disabled window and approved backup/recovery procedure. If a migration fails, roll back that transaction and investigate on the disposable target. After committed writes, prefer additive forward fixes; never restore the unsafe grants as a convenience rollback or delete settled financial records. No rollback or migration was run here.

Environment requirements remain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the existing server-only `STAFF_AUTH_REQUESTS_ENABLED` feature gate. No values were disclosed, changed or added. Do not enable the live gate before security/integration acceptance. This application does not need a secret/service-role key in browser code; none was requested. Recovery and invitation origin/delivery configuration still need a reviewed design before introduction.

The package manifest and lock root agree. The Windows binary is not a direct dependency. All eight Supabase CLI platform packages, including Linux variants, are optional in the existing lock. This is static portability evidence only. No dependency installation or Linux execution occurred. Docker can be skipped for this Next.js + Supabase Cloud workflow; a local Supabase container stack is optional, and was not invoked.

Release checklist:

- [ ] Resolve the incomplete security/authentication and ERP workflows above.
- [ ] Approve a disposable target and narrowly scoped test access separately.
- [ ] Review migrations, permissions, RLS, issuer configuration and native session behavior; pass real database tests.
- [ ] Pass role-based browser workflows and financial/admission failure/concurrency tests.
- [ ] Pass Linux install, TypeScript, lint and production build with the intended Node version.
- [ ] Review Vercel configuration and environment names privately; do not include secret values in reports.
- [ ] Reconcile migration history, rehearse migration/forward-recovery order and approve a production window.
- [ ] Obtain explicit authorization for production migrations, Git push and deployment. None is implied by this report.

## Files changed by this task

Modified existing files (their earlier uncommitted work was retained):

- `src/app/login/staff/actions.ts`
- `src/app/staff/[role]/page.tsx`
- `src/lib/services/development-adapter.ts`
- `src/lib/services/supabase-dal.ts`
- `src/lib/services/tenant-client.ts`
- `verification/verify-staff-auth.mjs`

Added files:

- `src/app/staff/record-actions.ts`
- `src/components/workspaces/live-record-forms.tsx`
- `src/components/workspaces/live-staff-workspace.tsx`
- `src/lib/services/live-workspace.ts`
- `src/lib/services/preview-boundary.ts`
- Five migrations 17–21 listed above.
- `verification/verify-fast-track.mjs`
- `docs/architecture/FAST-TRACK-IMPLEMENTATION-REPORT.md`

Git remains on `main`, HEAD `da18378e8ff61eb33af9bccadda8313cf1f16849`. The worktree remains dirty with the user's earlier work plus this task's changes. A starting snapshot covered 441 non-environment files; comparison identified six existing files modified by this task and no historical migration changes. Package manifests, the cloud test guard/policy and environment configuration were unchanged. No commit, branch switch, reset, clean, stash, pull, push, merge, deployment, Docker operation or Windows configuration change occurred.

## Continuation implementation and exact remaining queue

### Changes and evidence

- Corrected single-dollar function delimiters in **unapplied draft migrations 18 and 20**. These were syntax blockers that a later additive migration could not repair, since the earlier file would fail before reaching it. Added a delimiter regression across all migration files. Migrations 1–16 were not edited.
- Added **migration 22**, `20261111002200_admission_retry_safety.sql`: private request ledger, school/request lock, actor and payload binding, repeat-result handling and collision rejection. The original admission RPC is no longer directly executable by clients. DAL/server form now supply a stable request ID for retries within the mounted form. Database tests prove one admission/enrollment for repeated identical requests and denial of changed payload/cross-school requests. A browser reload starts a new request: recovery of an uncertain admission across reloads still needs an operator reconciliation or durable request-ID UX.
- Added **migration 23**, `20261111002300_academic_write_commands.sql`: atomic attendance batch command, deterministic student lock order, active assignment/enrollment validation, section conflict protection and audit within the transaction; homework creation with teacher subject authorization, bounded input, request replay handling and transactional audit. Direct attendance/homework writes are revoked. The staff workspace has authenticated server actions and simple attendance/homework forms. Attendance currently records the database's current date; school timezone handling and historical corrections remain queued.
- `/portal/student` and `/portal/parent` now redirect to the respective login boundary instead of rendering fictional workspaces at a live portal URL. The existing public fictional dashboards remain separate. This is a fail-closed boundary, **not completed Student/Parent authentication**.
- Added a Docker-free local PostgreSQL harness. It refuses inherited database connection overrides, uses a random loopback port and unique new directory, verifies the server's actual data directory before any SQL, applies sorted migrations, runs fictional tests and stops its server. It retains evidence instead of deleting test clusters. Native Supabase tables are represented by an explicit synthetic fixture.
- Added `scripts/verify-linux.sh` for a fresh disposable Linux checkout with no existing dependencies or local environment files. It performs a clean lockfile install, checks, offline tests and build with staff provider requests disabled. It was **not executed on Linux**, and does not deploy or apply migrations. Existing Next.js package scripts remain the deployment build configuration; Vercel remote settings were not queried or modified.

### Continuation verification results

| Check | Result |
| --- | --- |
| `node --test verification/verify-fast-track.mjs` | **21 passed**, zero failures; mocks and static SQL boundary checks |
| `node verification/verify-step24b-tenant-client.mjs` | **8 passed** |
| `node verification/verify-staff-auth.mjs` | **83 passed**, synthetic SDK/database evidence |
| `node verification/verify-supabase-dal.mjs` | **23 passed**, offline/static checks |
| `node verification/verify-dashboard-interactions.mjs` | **25 passed**, fictional adapter |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | **Passed** |
| `node node_modules/eslint/bin/eslint.js .` | **Passed** |
| `npm run build` | **Passed on Windows**, compilation, TypeScript, 10 static pages and build traces |
| `scripts/verify-fast-track-postgres.ps1` | **Passed**: fixture + all 23 migrations + database assertions on PostgreSQL 18.4 |
| `git diff --check` | **Passed**, line-ending advisories only |

The final database evidence is retained at `verification/step-24a/pg-7a6867b035df4fc78532792016a5a03a/verification.log`; its `server.log` records a clean shutdown. An earlier successful run before the teacher matrix is retained at `pg-a656fbb09214420fa5d7a69924936646`.

Failures encountered and resolved: the first harness wrote a log into the directory required to be empty by initdb; a later Windows pg_ctl pipeline retained background output handles; the sandbox attempt lost its server and timed out. Separate data/log directories, bounded noninteractive connections and a hidden launcher waiting only for pg_ctl resolved the harness issues. These failed attempts did not submit SQL to cloud or production. The final two isolated runs completed successfully. The failed sandbox runner was interrupted; no unrelated database was stopped.

Database checks exercise real PostgreSQL transactions/privileges and RLS, but the **authentication evidence is fabricated for isolation testing**. No claim is made about actual GoTrue session creation, MFA factors, recovery emails, full concurrent race behavior, browser workflows or comprehensive Parent/student RLS. The SQL fixtures embed the historical issuer string only as synthetic claims; no request is sent to that host.

### Migration readiness

Apply order in a reviewed target is **1–23**, or only missing migrations after reconciling actual history. New continuation order is 22 (requires 19) then 23 (requires the helpers in 18). Draft 18/20 syntax fixes must be present before replay. Files 17–23 have now been parsed/applied by actual local PostgreSQL, and selected command paths have execution evidence. This is **local migration readiness only**, not approval for a hosted deployment.

Migration 22 revokes the old admission command, and 23 revokes direct academic writes: deploy their compatible server-action code together after testing. Older DAL attendance/homework write methods are not the new supported command path and must not be exposed by a production UI. Preserve restrictive policies and use forward fixes if hosted testing finds differences. Do not undo security revocations to restore old behavior.

### Exact remaining-work queue

1. **Native test target/issuer setup:** obtain explicit approval for a disposable Supabase target; review the existing hard-coded SQL issuer pin and replace it through an owner-controlled, fail-closed configuration migration for that target. Do not disable issuer checks or repoint production configuration. Extend the test guard for approved REST/database tests without bypassing its Auth-only transport.
2. **MFA approval and recovery:** design and implement independent operator approval, factor trust/rotation/revocation and recent reauthentication consistently across GoTrue and SQL. The legacy consume-approval function still returns false. Prove direct provider enrollment cannot bypass the selected trust model. Keep affected enrollment/recovery blocked until tested.
3. **Staff confirmation/password recovery:** implement trusted callback-origin configuration, bounded recovery requests, PKCE/token verification, recovery session handling and password update without clearing administrative reset requirements or assigning roles from client data; test expiry/replay and enumeration resistance.
4. **Staff invitations:** configure an approved delivery transport and native account onboarding; handle failed delivery/revocation and old UUID-token reissue. Current invitation delivery remains restricted to local fictional recipients. Complete a real acceptance browser flow.
5. **Student/Parent identity:** implement a reviewed native-session bridge with separate PIN namespaces, durable server-owned throttling, credential reset, revocation and fixed Parent identity/guardian verification. Never mint a session merely from the development verifier or expose privileged credentials. Keep portal redirects until this exists.
6. **Portal reads:** add/verify all required permissive policies and server projections for Student and Parent purposes, subscription entitlement and child switching; prove academic-only and fee-only relationships remain separated.
7. **Academic administration:** implement authorized class/section/year and teacher assignment editing, date/subject validation and audit; replace development-only gateway mutation branches.
8. **Attendance:** add roster selection/batch UI, school timezone semantics, authorized historical corrections, concurrent-edit behavior and browser tests. Current live form records one student today; the command supports atomic batches up to 200.
9. **Homework:** complete edit/close/submission workflows, teacher assignment changes, student submission policies and browser tests. Creation/retry command is implemented and locally database-tested.
10. **Timetable:** implement authorized editing, cross-section teacher conflict checks, period/time validation and atomic multi-slot changes.
11. **Exams/marks/results:** implement atomic sheets/entries, score limits, enrollment/subject checks, publication with recent MFA, immutability/corrections and Parent/Student results.
12. **Fees/accounting:** implement atomic invoice issuance, expense vouchers, refunds/reversals, fee structures and reconciliation; test concurrent collection and audit-failure rollback. Existing collection has sequential settlement/retry/overpayment evidence, not a concurrent race test.
13. **Reports/exports:** complete school/role/purpose filters, pagination, reconciliation, sensitive export reauthentication, spreadsheet-formula escaping and real downloads.
14. **Notifications/settings/role management:** implement persistent authoring/editing, recipient scope, permission changes, last-admin safeguards and audit; verify no live placeholder successes remain in any exposed path.
15. **Subscriptions/billing:** integrate an explicitly selected provider, trusted order creation, signature-verified replay-safe webhooks, settlement/refund ledger and entitlement reconciliation. Client-controlled settlement remains disabled.
16. **File storage:** implement private buckets/policies, tenant/object ownership, upload constraints, scanning/quarantine policy and authorized expiring downloads; no bucket or cloud resource has been created.
17. **Admission recovery:** preserve/recover request IDs across uncertain reloads, add operator reconciliation and browser retry tests. Current idempotent command is locally database-tested.
18. **Security acceptance:** complete native MFA/session/confirmation/recovery tests, full positive/negative role and purpose RLS matrices, cross-school writes, concurrent financial/admission tests and all role-based browser flows on the approved disposable target.
19. **Release:** execute the fresh Linux verification, verify intended Vercel Node/build/environment configuration privately, rehearse migration/forward-recovery order, then request explicit production migration, push and deployment authorization. None is authorized by this report.

### Continuation file list

Modified:

- `supabase/migrations/20261111001800_operational_staff_policies.sql` and `20261111002000_parent_access_purposes.sql` (draft syntax only).
- `src/lib/domain/dashboard-contracts.ts`
- `src/lib/services/tenant-client.ts`, `supabase-dal.ts`, `live-workspace.ts`
- `src/app/staff/record-actions.ts`
- `src/components/workspaces/live-record-forms.tsx`, `live-staff-workspace.tsx`
- `src/app/portal/[role]/page.tsx`
- `verification/verify-fast-track.mjs`
- This report.

Added:

- `supabase/migrations/20261111002200_admission_retry_safety.sql`
- `supabase/migrations/20261111002300_academic_write_commands.sql`
- `src/lib/services/academic-commands.ts`
- `src/app/staff/academic-actions.ts`
- `src/components/workspaces/live-academic-form.tsx`
- `scripts/verify-linux.sh`
- `scripts/verify-fast-track-postgres.ps1`
- `verification/fast-track-database-tests.sql`
- Ignored, retained fictional PostgreSQL test directories/logs.

No production/cloud changes, Git mutations, dependency installs, Docker operations, Windows configuration changes or credential changes occurred. Feature gates and cloud test approval policy remain unchanged. The full requested scope is not complete; the queue above is the exact continuation boundary.

## Final functional sprint — 2026-11-12

Work resumed from the preserved, user-stopped sprint. No migration from 1–23 was edited during this sprint. New database behavior is additive in migrations 24 and 25. The full requested ERP remains incomplete.

### Implemented features and limits

**Staff password recovery:** added `/login/staff/recover`, a staff-login link, recovery email request and native PKCE code exchange. The handler requires the public SDK `PASSWORD_RECOVERY` event, a matching confirmed identity, and a live native session with an active staff membership in an active school. It never creates an application role/context or clears administrative reset requirements. Admin membership requires MFA even if the provider currently reports no enrolled factors; existing verified MFA for any staff role must be satisfied. TOTP is supported; lost-factor and phone-only recovery deliberately fail closed. Password updates request global sign-out and attempt local cleanup. Failure to confirm global revocation is reported distinctly after a password change rather than claiming complete success.

Recovery requests require the existing staff feature gate and a valid server-only `AUTH_APP_ORIGIN`. No environment file or value was changed. The deployed recovery URL must be approved in the provider redirect configuration, and provider email/rate-limit behavior must be tested. Codes must be opened in the initiating browser for PKCE. A failed attempt after code redemption requires a new email. Responses do not reveal account existence or provider errors. Recovery pages receive no-store and no-referrer headers, and the client removes the code from the visible URL after loading. These measures do not replace deployment access-log handling of transient authorization codes.

The implementation follows the installed SDK and the public [Supabase password recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail). It has mock and local database evidence, **not a successful native email/MFA/browser recovery test**. It must not be described as production-complete authentication.

**Academic management:** migration 24 and authenticated server actions/forms now support:

- Create classes and sections with school/year ownership validation.
- Create teacher assignments only for active staff/teacher memberships. Overlapping assignments for the same teacher, section and subject are serialized and rejected.
- Create/update timetable slots with active subject assignment checks, teacher/section time-overlap detection and revision checks. School-wide schedule locking prevents parallel commands from bypassing the overlap check; concurrent execution still needs an explicit race test.
- Edit/close/reopen homework with author/subject/assignment checks for teachers, permission checks for admins, revision checks and transactional audit.
- Replay the same command request without duplicating changes; reject request ID reuse with changed payload, actor or operation.

Direct class, section, teacher-assignment and timetable mutations are revoked from client roles. Commands derive school identity from the current session, never a form-supplied tenant. Forms use server-generated request identifiers, and only allowlisted payload fields reach the command. The UI currently uses record IDs and explicit revision fields; record pickers, lifecycle editing/removal and full browser usability checks remain pending. Homework and timetable lists expose IDs/revisions needed by these forms.

**Migration 25:** `staff_recovery_scope()` is a self-only eligibility query for a confirmed, unbanned, live native identity with a non-expired token and an active staff membership. It returns eligibility/MFA requirement only; it grants no permissions and does not alter Auth records. It retains the existing issuer pin. A reviewed disposable-target issuer configuration remains necessary before native cloud tests.

### Verification results

| Command/check | Result and scope |
| --- | --- |
| `node --test verification/verify-fast-track.mjs` | **43 passed**, zero failures; recovery denial/cleanup/MFA/revocation, management form/server-action boundaries, prior admission/payment/academic tests and migration delimiter checks |
| `node --test verification/verify-auth-test-target.mjs` | **68 passed**, offline target/transport guard |
| `node verification/verify-supabase-config.mjs` | **25 passed**, offline configuration/static/mock checks |
| `node verification/verify-step24b-tenant-client.mjs` | **8 passed**, mock tenant wrapper |
| `node verification/verify-staff-auth.mjs` | **83 passed**, existing auth/session/server-action mocks |
| `node verification/verify-supabase-dal.mjs` | **23 passed**, offline DAL/delegation/static checks |
| `node verification/verify-dashboard-interactions.mjs` | **25 passed**, fictional dashboard adapter interactions |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | **Passed after correcting the SDK return-type assumption** |
| `node node_modules/eslint/bin/eslint.js .` | **Passed** |
| `npm run build` | **Passed on Windows**, including TypeScript, 10 static pages, dynamic recovery route and build traces |
| `scripts/verify-fast-track-postgres.ps1` | **Passed**: synthetic Auth fixture, clean replay of migrations **1–25**, all database assertion blocks |
| `git diff --check` | **Passed**, line-ending advisories only |

An initial TypeScript check failed because the public `exchangeCodeForSession` response type does not expose the internal `redirectType` field. The handler was corrected to subscribe to the public recovery event and unsubscribe after exchange. The recovery-only check was preserved, not bypassed. Final compilation/build pass. No database assertion failed in this sprint's completed runs.

New PostgreSQL evidence includes class/section/assignment persistence, duplicate-request replay, changed-payload rejection, overlapping-assignment rejection, timetable overlap rejection, timetable/homework stale-revision rejection, homework edit replay, teacher management denial, direct timetable-write revocation, admin versus teacher recovery scope, foreign issuer rejection, expired token rejection and suspended account rejection. Prior financial/admission/attendance tests run in the same replay. Auth metadata remains synthetic.

Latest complete local evidence:

- `verification/step-24a/pg-0ed6b310f1814c20ad3f36a1d2f826bd/verification.log`
- The same directory's `server.log` records shutdown of that isolated instance.
- Earlier successful sprint runs are retained at `pg-fddb76964d6c4e528a1623c45562c534` and `pg-5dc87860d57342499748aa9764c5325e`.

### Exact sprint files

Added:

1. `supabase/migrations/20261111002400_academic_management.sql`
2. `supabase/migrations/20261112002500_staff_recovery_scope.sql`
3. `src/lib/staff/recovery.ts`
4. `src/app/login/staff/recover/actions.ts`
5. `src/app/login/staff/recover/page.tsx`
6. `src/app/login/staff/recover/recovery-form.tsx`
7. `src/lib/services/management-contracts.ts`
8. `src/app/staff/management-actions.ts`
9. `src/components/workspaces/live-management-form.tsx`

Modified, preserving earlier work:

1. `src/app/login/staff/page.tsx`
2. `src/proxy.ts`
3. `src/lib/services/live-workspace.ts`
4. `src/components/workspaces/live-staff-workspace.tsx`
5. `verification/verify-fast-track.mjs`
6. `verification/fast-track-database-tests.sql`
7. `docs/architecture/FAST-TRACK-IMPLEMENTATION-REPORT.md`

Generated/retained: ignored `.next` build output and fictional local PostgreSQL clusters/logs. No dependency manifests, environment files, cloud test approval policy or historical migrations 1–23 were changed in this sprint.

### Incomplete workflows and release blockers

The preceding 19-item queue remains applicable with these updates: password-recovery source now exists but requires native acceptance testing; class/section/assignment creation, timetable save and homework editing now have local database evidence. Those modules are not full lifecycle implementations.

Priority queue:

1. **P0 native authentication:** resolve independent MFA enrollment/trust/rotation and lost-factor recovery. The legacy enrollment-approval function remains fail-closed. Complete native invitation delivery/account activation. Implement genuine Student/Parent PIN-to-provider sessions, durable trusted throttling, credential lifecycle and protected portal data. Do not substitute fixtures or privileged service-role bypasses.
2. **P0 acceptance:** approve a disposable Supabase target, review issuer configuration without changing production, configure recovery origin/allowed redirect/email privately, and execute native email, PKCE, TOTP, revocation, recovery replay and browser tests. Validate provider throttling, factor enrollment edge cases and phone-only/lost-factor handling. Full Student/Parent purpose RLS and native session tests remain outstanding.
3. **P1 lifecycle:** student/staff suspension, withdrawal/reactivation, section/class/year editing, assignment termination and schedule deletion; user-friendly record selection; historical/timezone-aware attendance corrections; homework submissions and teacher changes. Existing privileged onboarding and role-management commands still need full fine-grained permission review.
4. **P1 results and finance:** atomic exam/marks workflows and publication, fee invoice lifecycle, expenses, refunds, financial reconciliation and receipt exports. Existing sequential payment tests are not concurrent collection proof. School settings and role administration remain incomplete.
5. **P2 operations:** complete onboarding/platform workflows, selected billing-provider orders/webhooks/reconciliation, subscription lifecycle, notification/invitation delivery, private file storage/upload/download authorization, and reports/downloadable exports.
6. **Verification/release:** full native RLS matrix, concurrent race tests, all role browser workflows, clean Linux dependency/build execution, Vercel environment/configuration review, and migration/forward-recovery rehearsal.

### Minimum actions before deployment

- Finish or explicitly exclude the incomplete workflows above from the agreed release scope; do not expose their placeholder paths as functional features.
- Obtain approval for an isolated cloud target and complete native security/browser acceptance. Local PostgreSQL fixtures cannot replace it.
- Run `scripts/verify-linux.sh` in a fresh disposable Linux checkout. **Linux execution remains UNVERIFIED.** Docker is not required. Windows build success is not a Vercel compatibility guarantee.
- Review Vercel Node/build configuration and required variable names (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `STAFF_AUTH_REQUESTS_ENABLED`, and recovery's `AUTH_APP_ORIGIN`) privately. No remote setting or environment value was inspected/changed in this sprint.
- Reconcile actual migration history and rehearse **24 then 25** after 1–23, with the compatible app changes. Local clean replay passes; hosted readiness still needs validation. Preserve the previous forward-recovery strategy and do not restore unsafe direct-write grants.
- Obtain separate explicit authorization for production migrations, Git push and deployment.

Git remains `main` at `da18378e8ff61eb33af9bccadda8313cf1f16849`; the existing modified/untracked work remains. No production database, cloud resource, credential, environment-file, Git history/remote, Docker, Windows configuration or deployment changes occurred. No native account was created or recovery email sent by this verification work.

## Release blocker closure sprint

The live admin workspace now creates and revokes staff invitations through Supabase RPCs. An admin with a verified school session and AAL2 can issue an invitation for a teacher or accountant. The form generates a 256-bit token, stores its digest and returns a private link for manual delivery. Migration 26 validates issuance inputs and lets an expired pending invitation be replaced. A still-valid pending invitation must be revoked before replacement.

Invitees with an existing confirmed account can enter their credentials on the invitation page or use their current session. The acceptance RPC checks the confirmed email, invitation status and school before granting membership. The page keeps the token in the URL fragment until it reads it, then strips the fragment. Automated delivery and native account provisioning remain incomplete.

Changed files include migration `20261112002600_staff_invitation_issuance.sql`, `src/app/staff/invitation-actions.ts`, `src/components/workspaces/live-invitation-form.tsx`, `src/components/workspaces/live-staff-workspace.tsx`, `src/app/invite/actions.ts`, `src/app/invite/page.tsx`, `src/proxy.ts`, `verification/fast-track-database-tests.sql` and `verification/verify-browser-local.mjs`.

### Verification

- Clean PostgreSQL replay passed migrations 1–26 and all SQL assertion blocks. New cases cover issuance, expired replacement, wrong email, one-time redemption, teacher issuance denial and persistence of the tenant membership. Auth identities and sessions are synthetic. Evidence is in `verification/step-24a/pg-8fba6de98d0542a1a8b33d4d40f3562b/verification.log`.
- Final TypeScript, ESLint, Windows production build and `git diff --check` passed. Initial checks caught an inferred server action state type and internal link lint error. Both were corrected.
- Offline regression sweep passed the fast-track, target guard, auth/session, DAL, dashboard, financial, tenancy and phase suites except three historical scripts. Steps 14 and 15 assert exact historical migration inventories. Step 16A expects authorization for a fixture that now resolves to `mfa_required`. Those failures remain open. The historical Step 14 local server script and native GoTrue suite were excluded from the offline sweep.
- Browser smoke test prepared in `verification/verify-browser-local.mjs`. Syntax check passed. With Playwright and Chromium available, start the built app on loopback port 3008 with `STAFF_AUTH_REQUESTS_ENABLED=false`, then run `node verification/verify-browser-local.mjs`. It checks protected redirects, all five previews, fragment handling and the disabled invitation boundary. Browser execution remains **UNVERIFIED**.
- Docker-free Linux build verification remains prepared in `scripts/verify-linux.sh`. Linux and Vercel execution remain **UNVERIFIED**.

### Remaining release blockers

- [ ] Verify native staff enrollment, approved factor replacement, lost-factor identity verification and session revocation. The existing enrollment approval mismatch remains open.
- [ ] Implement genuine Student and Parent provider sessions, secure PIN throttling and recovery, and protected portal data with relationship and school checks.
- [ ] Provision confirmed invited accounts through an approved workflow, integrate automated delivery and verify native invitation issue, acceptance, revoke and school selection in a browser.
- [ ] Complete student and staff lifecycle operations, academic editing and result publication.
- [ ] Complete authorized financial reports and exports, invoice/expense/refund workflows, and concurrent settlement tests.
- [ ] Implement provider-backed billing, verified webhooks and subscription reconciliation.
- [ ] Implement private document upload/download authorization and verify storage policies.
- [ ] Reconcile the three legacy regression failures with current security contracts, run browser and Linux checks, and verify native Auth, tenant RLS, storage and billing on a separately approved disposable target.
- [ ] Review migration history and deploy only after explicit authorization.

## First Vercel Preview preparation

The three historical regression failures are resolved. The 23 offline suites, TypeScript, ESLint and Windows production build passed. A compiled Preview lock blocks live Supabase clients and strips inherited public credentials. The local verifier passed 23 route checks with synthetic credentials and live flags supplied at build and runtime. Installed Chrome passed three navigation checks. Linux, native Auth and hosted Vercel remain unverified. The route matrix, environment settings and approval boundary are in [First Vercel Preview](FIRST-VERCEL-PREVIEW.md).
