# Implementation roadmap after Step 7 — not executed

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

## Step 8 authoritative update

Step 8 completed only local contracts and documentation. F03 security schema planning must incorporate privilege/identity metadata and unique login identifiers; F04 auth now requires the PIN/OIDC provisioning/session proof before implementation, Super Admin-only account management, mandatory Super Admin MFA, sealed bootstrap and live API/RLS checks. Older all-email or ordinary-Admin provisioning tasks are superseded. Login UI is deferred. Step 9 has not started; all provider/database/bootstrap work remains future and requires its own authorized integration scope.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

This is a dependency-aware sequence of future, separately authorized tasks. **Step 8 has not started.** First approve architecture/open decisions; do not interpret a roadmap row as permission to create accounts, services or migrations now. Each task should produce a small reviewable change and stop at its stated acceptance gate. Expected paths below do not currently exist unless noted.

## F01 — Architecture and school policy sign-off

- Objective: approve five-role model, scope, student identity recovery, guardian verification/custody, historical access, attendance/mark semantics, finance conventions, retention and RPO/RTO.
- Dependencies: Step 7 documents; school owner, finance lead and privacy/education counsel.
- Expected changes: documentation/decision log only.
- Security: no real records or credentials exchanged in source control.
- Tests: consistency review against matrix/schema/ERD; choose owners for open questions.
- Acceptance: signed-off decisions or explicitly deferred optional features; no implicit legal compliance claim.
- Rollback: revise proposed decisions; no live-state effect.

## F02 — Nonproduction environment and operational baseline

- Objective: future authorized local/staging Supabase and protected Vercel Preview setup, isolated secrets, monitoring ownership and synthetic-only seed safety.
- Dependencies: F01, approved service accounts/region/budget.
- Expected changes: future environment documentation, reviewed SDK dependencies, CI skeleton and configuration names; credentials remain outside repository.
- Security: separate production/staging, least-privilege CI, no production data in previews, no uncontrolled email delivery.
- Tests: environment identity checks, secret exposure scan, backup/storage recovery proof of concept, clean installation.
- Acceptance: reproducible isolated test environment and operator access inventory.
- Rollback: revoke newly scoped credentials and remove authorized nonproduction resources after review; no production changes.

## F03 — Minimal identity/schema/RLS foundation

- Objective: versioned migrations for configuration, profiles, five role codes, permission catalog, memberships, role contexts, audit and operation infrastructure; not every future domain table.
- Dependencies: F02, schema review.
- Expected changes: future `supabase/migrations`, generated types and DB tests.
- Security: RLS/grants default-deny from first exposure; no unconditional anonymous policies; separate runtime/migration credentials.
- Tests: migration reset on empty local DB, constraints, negative direct API access, nonrecursive helper tests.
- Acceptance: migration reproducible; no exposed sensitive row accessible without deliberate permission.
- Rollback: disposable local/staging rebuild; production later additive forward repair, never unreviewed destructive down-migrations.

## F04 — Authentication lifecycle and per-session role context

- Objective: login/reset/refresh/logout, invitations, activation/suspension, MFA, protected routes and restricted active-role switch.
- Dependencies: F03, student login/recovery decision.
- Expected changes: future `src/lib/{supabase,auth}`, `src/proxy.ts`, auth routes/actions and authorized dashboard entries.
- Security: validated identity + live profile/membership/context; no role from metadata/URL; authenticated HTML not public-cacheable.
- Tests: expired/forged/revoked tokens, replayed reset/invite, open redirect, multi-role stale-tab/context version, restricted Admin escalation and rate limits.
- Acceptance: anonymous/suspended requests denied at server and DB; five valid roles redirect correctly; old UI context cannot submit writes.
- Rollback: feature flag exposes only synthetic preview in isolated environment, never public real-data fallback; revoke sessions and retain logs.

## F05 — Academic catalogs and calendars

- Objective: school/year/term/classes/sections/subjects/calendar with closed-year preservation.
- Dependencies: F03–F04.
- Expected changes: configuration/academic migrations, query/command DTOs and Admin catalog forms.
- Security: configuration grants; no delete of referenced historical structure.
- Tests: duplicate section, cross-year FK mismatch, calendar outside year, time overlap, read scopes.
- Acceptance: usable approved year/section catalog with deterministic calendar semantics.
- Rollback: retire unused drafts; preserve referenced year records; compatible schema remains.

## F06 — Admissions, guardians and enrollments

- Objective: approved student admission, verified adult linking, current roster, transfers and promotions.
- Dependencies: F05, F04, custody/privacy decisions.
- Expected changes: ST schema/commands, bounded roster DTOs and authorized family child-list query.
- Security: parent cannot self-link; purpose-specific guardian access and revocation; synthetic test cases with two unrelated families.
- Tests: unique admission number race; replayed admission; forged guardian/child ID; overlapping placement; promotion keeps old year; approval separation.
- Acceptance: admission transaction creates coherent student/enrollment/verified links with audited state; invitation is idempotent outbox follow-up, not assumed atomic with Auth.
- Rollback: archive failed drafts and cancel pending invites; correct approved records with audit, no deletion of historical children.

## F07 — Staff and effective teacher assignments

- Objective: staff/teacher linking, curriculum assignments, homeroom scope and published timetables.
- Dependencies: F05–F06, verified staff provisioning.
- Expected changes: HR/AC commands, teacher roster/schedule server adapters.
- Security: no self-assignment; subject marks scope distinct from homeroom attendance; employment end revokes access.
- Tests: unassigned class/subject/year denial, overlapping room/teacher slots, substitution boundaries, historical permission.
- Acceptance: teacher sees only authorized schedule/roster; Admin scope change immediately affects queries.
- Rollback: retire future assignments/version schedules; keep delivered-period evidence.

## F08 — Storage quarantine and document authorization

- Objective: private manifests/typed links, upload/finalize/scan/download workflow, retention and recovery.
- Dependencies: F04–F07 and provider/scanner/retention approval.
- Expected changes: future Storage policy migrations, document commands/download handler and worker.
- Security: no public student/staff/finance bucket; path/uploader not sufficient; short capability lifetime.
- Tests: cross-family object access, MIME spoof, oversize/quarantine, orphan cleanup, expired URLs, revoked publication download and restore drill.
- Acceptance: authorized clean object readable only by eligible viewers; no unscanned document released.
- Rollback: stop new uploads, revoke manifests/capabilities, retain evidence and clean orphans via approved job.

## F09 — Attendance recording and corrections

- Objective: daily/session attendance with finalized own/child views and audited corrections.
- Dependencies: F06–F07; calendar/denominator policy.
- Expected changes: AT migrations/transaction commands, Admin/Teacher/Student/Parent attendance adapters.
- Security: assigned teacher/open session only; independent approval for locked corrections.
- Tests: concurrent duplicate register/record, cross-section enrollment, stale version, teacher revoked mid-action, absent vs missing data, leave denominator and locked edit denial.
- Acceptance: unique session/enrollment rows, exact summaries agree across roles, corrections preserve old/new evidence.
- Rollback: disable writes; retain finalized records; correction events rather than bulk reset.

## F10 — Homework and review workflow

- Objective: targeted published homework, own submissions/attachments, assigned review and parent status.
- Dependencies: F07–F09, F08 for files.
- Expected changes: HW migrations/actions/adapters, scoped search/pagination and form states.
- Security: every target section authorized, no peer submission read or student reviewer-field writes.
- Tests: deadline/timezone, duplicate attempts, unpublished assignment denial, late policy, file scope, parent no-submit, review conflict.
- Acceptance: task/submission/status summaries reconcile for same authorized child across roles.
- Rollback: close task intake, preserve submitted attempts and review evidence.

## F11 — Exams, marks approval and result publication

- Objective: exam scheduling, authorized marks drafts, review, immutable per-student publication and versioned report cards.
- Dependencies: F07–F10, approved grading/absence rules and F08.
- Expected changes: EX schema/commands, released-result DTOs, report artifact job.
- Security: no family grant on working marks; teacher scoped per subject exam; requester cannot approve own changes.
- Tests: invalid maximum/grade band, missing/unapproved marks, concurrent entry/publication, unpublished/withdrawn result denial, correction revision, report hash/link consistency.
- Acceptance: release transaction atomically snapshots only approved results; Parent/Student see same released revision.
- Rollback: withdraw erroneous release under audit; publish corrected revision; never erase evidence.

## F12 — Fee tariffs, invoice assignment and posting

- Objective: approved year/class tariffs, concessions, enrollment-linked issued invoice lines, balance-as-of queries.
- Dependencies: F06, F04, agreed finance policy and money DTO.
- Expected changes: first FI migrations, constrained posting commands, Parent/Accountant read adapters behind server feature flag.
- Security: finance grants/MFA, immutable issued values, separate approval and exact paise.
- Tests: duplicate tariff assignment billing, same-student/year mismatches, concessions applied once, cohort vs cash scope, credit > obligation and historical promoted class.
- Acceptance: invoice face values and adjustments reconcile; both dashboards use same authorized source.
- Rollback: remove unissued drafts; correct issued invoice by approved credit/debit notes.

## F13 — Settled collections, allocations, receipts and refunds

- Objective: record actual authorized settlements, exact partial allocations, idempotent receipt numbering and approved refunds.
- Dependencies: F12, F08, outbox/worker reliability.
- Expected changes: remaining payment/refund/receipt FI schema and atomic commands; receipt generation jobs; no gateway unless separately requested.
- Security: lock payment/invoices/counter; no direct ledger CRUD; MFA; independent refund approval; duplicate evidence checks.
- Tests: concurrent last-balance allocation, repeat key/same vs changed payload, reused provider reference, double refund, cross-student allocation, cross-month cash, PDF failure after commit and receipt-number uniqueness.
- Acceptance: invariant/property tests and RLS suite pass; exactly one committed cash fact and receipt per settlement; clear unapplied credit/refund treatment.
- Rollback: stop intake, retain idempotency evidence; financial reversal, never delete/rewrite settled rows.

## F14 — Expenses, reconciliation and unified finance dashboards

- Objective: expense obligations vs paid events, period reporting, banking match review, aligned Parent/Admin/Accountant aggregates.
- Dependencies: F13, finance approval for close/backdate/reconciliation policies.
- Expected changes: expense/reconciliation commands/views, real server-side filter/cursor adapters and finance alerts.
- Security: least-privilege payee/fee DTOs; accountant no academic/personnel access; closed-period guard; exported data separately authorized.
- Tests: partial expense pay cap/race, unpaid exclusion, refunds/cash reversals, cohort opening/closing balances, class/category totals and CSV injection defenses.
- Acceptance: same facts yield reconciled family balances and period cash flow; no mock dataset mixed with real figures.
- Rollback: read-only finance mode; restore compatible adapter version; forward corrective events for data.

## F15 — Announcements, notifications and private communication

- Objective: targeted publication/read state and verified child-context parent–teacher threads.
- Dependencies: F06–F08, safeguarding/retention decisions.
- Expected changes: CM migrations/actions/DTOs and optional delivery worker only after separate authorization.
- Security: audience eligibility before notification creation; participant + live relationship; no email/SMS by default.
- Tests: child-specific notice dedup, unassigned teacher thread, revoked guardian, unauthorized participant insert, stale notification target and content encoding.
- Acceptance: no unrelated-child notice/message leaks; delivery operations idempotent and auditable.
- Rollback: pause delivery/sending, retain authorized history and moderation audit.

## F16 — Reports and deferred modules, individually scoped

- Objective: scoped report jobs first; library/transport/HR-payroll/inventory/certificates only when separately approved.
- Dependencies: relevant domain plus F08, purpose/retention permissions.
- Expected changes: small module migrations and adapters, no bulk premature schema creation.
- Security: reauthorize export at request/generation/download; payroll protected; no default child tracking.
- Tests: report authorization revocation while queued, bounded rows, sanitized CSV, expired output; each module's inventory/loan/payroll invariants.
- Acceptance: each module has own owner/test gate; optional modules remain disabled otherwise.
- Rollback: disable new module feature; retain issued documents, movement/audit history.

## F17 — Release readiness and approved production rollout

- Objective: integrate all authorized modules, legal/privacy/finance sign-off, observability, response runbooks, backup and file restore drill, load/accessibility/browser QA.
- Dependencies: approved first-release subset F01–F16, all security and reconciliation gates.
- Expected changes: CI checks, reviewed Vercel environment/deployment config, operator runbooks; no production step without explicit authorization.
- Security: direct API/RLS adversarial tests, least-privilege secrets, production seed denial, authenticated cache isolation, signed file tests, independent review.
- Tests: installed-version lint/type/build, E2E five roles, concurrency/property/RLS tests, real staging restore, latency/query plans, full reduced-motion/keyboard/screen-reader/contrast checks.
- Acceptance: no unresolved critical/high security defect, agreed RPO/RTO evidence, named rollback/on-call owner, pilot/rollback plan and approval.
- Rollback: stop writes/delivery first if integrity risk; deploy compatible previous app, apply reviewed forward schema repair; restore only under incident plan with post-restore authorization/ledger reconciliation. A Vercel app rollback is not a DB rollback.

## Critical transactional workflow contracts

These are future transaction plans, not executed commands:

| Workflow | One DB transaction includes | External effects / concurrency |
| --- | --- | --- |
| Admission | Unique application/admission-number check, student creation/link, verified guardian links, nonoverlapping enrollment, audit and invitation outbox | Auth invitation after commit, retry by dedupe key; no name/email-based merges; uniqueness handles racing admissions; failed invite leaves pending activation |
| Promotion/transfer | Lock old enrollment + year destination; validate student/year/roll capacity, close old interval, insert new placement and transition evidence, audit | Batch job processes small idempotent per-student units with reviewed exceptions; never edit previous marks/attendance/invoice enrollment IDs |
| Attendance | Validate teacher/context/version, lock open session, validate roster/calendar, insert/update one row per session/enrollment, submit/lock state and audit | Unique session+student prevents duplicates; optimistic draft version; correction decision locks record and appends history, no overwrite after publication without evidence |
| Marks publication | Lock exam/relevant marks, validate assignment/maximum/absence/review completion, independent approval, create per-enrollment immutable snapshot/revision, audit and report-card outbox | Concurrent edits conflict or wait; snapshot/hash fixed; PDF failure retries without unpublishing a valid release; withdrawal/correction separately audited |
| Fee collection/refund | Identity/grant/context check, idempotency key, locked invoices/payments/counter, bounded allocations/refund reversal, receipt identity, financial+security audit and outbox | Same idempotency key across bounded serialization retries; no duplicate real-world side effect; render outside transaction; [financial plan](FINANCIAL-DATA-DESIGN.md) is canonical |

Atomicity does not extend from PostgreSQL to Auth, Storage, email or a payment provider. Use explicit pending/committed/delivered states, idempotency, outbox/saga compensation and reconciliation; never claim a distributed transaction simply because one Server Action called several services.
