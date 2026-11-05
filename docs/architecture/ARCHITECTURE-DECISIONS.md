# Architecture decision records — Step 7 proposals

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

## Step 11 authoritative UX and resolution status — 2026-11-05

The owner approved exactly two fields for each family login: Student Registration Number + six-digit Student PIN; linked Student Registration Number + independent six-digit Parent PIN. **No Guardian Reference/ID field, third input, guardian selection screen, hidden phone/email selector or unapproved extra factor.** Earlier requirements for a guardian reference and their associated successful proof sequences/approval checklists are **superseded**, retained below solely as historical designs. Do not implement or request approval for the old third-field design as if it were current.

The two-field multi-guardian Parent first-login architecture is **C. BLOCKED**: identical allowed inputs cannot distinguish two guardians, and no acceptable distinct-secret resolution protocol meeting the restrictions is established. Student/provider integration remains conditional; six-digit production security remains unapproved. Five roles, Super Admin within Admin, mandatory Super Admin MFA and sole Super Admin provisioning remain unchanged. No UI or live authentication is implemented.

See [current feasibility and sequences](STEP-11-TWO-FIELD-LOGIN-FEASIBILITY.md), [guardian models](STEP-11-GUARDIAN-IDENTITY-MODELS.md), [tests](STEP-11-AUTH-SECURITY-TESTS.md) and [decision gate](STEP-11-DECISION-GATE.md). These take precedence over the rejected reference-based resolution assumptions below; they do not relabel earlier research or tests as a passed proof.

The unused Step 8 guardianReferenceRequired metadata flag is preserved historical code, not current UX or a proven resolver. It must not be wired into a form; any future integration must first obtain an acceptable design and explicitly reconcile that obsolete contract detail.

## Retained earlier architecture — superseded where stated above

## Step 8 authoritative update

ADR-002 email/password-for-everyone and student-email assumptions are superseded by ADR-013/014 below. ADR-003 retains five primary roles and active-context isolation, with the explicit controlled Super Admin overlay. Generic Admin provisioning anywhere in these historical ADRs means Super Admin only under the new access model.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

All decisions below are **proposed for approval**, not installed/configured. They must be reconciled with open school policy questions before implementation. See [risk register](RISK-REGISTER.md) and [roadmap](IMPLEMENTATION-ROADMAP.md).

## ADR-001 — One school, historical academic dimensions

- Decision: one school configuration and one production database; no tenant IDs/subscriptions. Stable student/class catalogs with year-specific sections/enrollments and dated transitions.
- Alternatives: tenant-per-school SaaS; overwriting each student's class/year.
- Reasoning: matches explicit single-school scope and preserves historical reporting.
- Trade-offs: this schema is not a ready multi-school SaaS; some interval/composite constraints need careful review.
- Future implications: multi-school conversion would be a new architecture project, not adding a hidden school filter. Promotion creates new rows, not historical edits.

## ADR-002 — Supabase Auth, application-controlled domain linking

- Decision: Supabase email/password identity with invitation/activation, MFA for privileged users, nullable explicit links to domain people.
- Alternatives: custom password storage; shared parent/student accounts; admission-number-only login.
- Reasoning: avoid custom credential handling and unsafe identity shortcuts; non-account people still need school records.
- Trade-offs: provider lifecycle and app DB are not one transaction; student email/recovery policy needs approval.
- Future implications: use outbox/idempotent reconciliation for provisioning. No auto-link by email/name alone; no passwords in application tables.

## ADR-003 — DB-bound active role and least privilege

- Decision: five membership roles, a per-Auth-session protected role_context, permission ceilings and restricted membership intersection.
- Alternatives: URL/localStorage selected role; user-editable JWT metadata; union all memberships for every operation; extra Principal/Office dashboards.
- Reasoning: explicit active-role behavior must survive direct API access, stale tabs and role spoofing.
- Trade-offs: database context lookup, role switching shared across tabs in one session, bootstrap/revocation complexity.
- Future implications: context version on mutations, live grant checks, positive/negative RLS tests; no additional primary roles without separate product decision.

## ADR-004 — RLS plus server-only authorization/DAL

- Decision: authorize in server query/command layer and DB RLS/command checks; safe DTOs and bounded API surface.
- Alternatives: hidden frontend controls only; service-secret access for every query; copying whole datasets into the client.
- Reasoning: both browser routes and Data API/RPC requests need protection; row access alone does not minimize columns.
- Trade-offs: deliberate duplicate defense and helper-policy complexity; requires realistic user-JWT tests.
- Future implications: privileged helpers narrowly reviewed, recursive policy chains avoided, views/grants audited; no shared-cache personal responses.

## ADR-005 — Guardian relationships are verified dated permissions

- Decision: explicit student_guardians with approval, validity/revocation and separate academic/fee rights; many guardians and children supported.
- Alternatives: one parent_id column; email/phone/name match; parent self-claimed child linkage.
- Reasoning: custody, multiple families and access restrictions require actual relationship evidence.
- Trade-offs: staff verification workflow and revocation policy; signed URL residual lifetime.
- Future implications: relationship checks on every child read/file/export/message, not just child selector. Consent evidence is separate from access linkage.

## ADR-006 — Published-result snapshots, working marks private

- Decision: teachers edit assigned working marks; independent approval creates immutable per-student result revision and report artifacts. Families query releases only.
- Alternatives: show live marks table with a UI-only published toggle; overwrite a PDF/mark silently.
- Reasoning: prevents premature disclosure and preserves correction traceability.
- Trade-offs: snapshot version/storage overhead, withdrawal/correction and absence/grading policy needed.
- Future implications: report cards refer to exact publication revision/hash; aggregate queries state working vs released scope explicitly.

## ADR-007 — Integer paise and separate obligation/cash models

- Decision: bigint paise for money, decimal-string transport; invoices/credits/allocations for debt, dated payment/refund/disbursement events for cash.
- Alternatives: float rupees; reusing mock same-month formulas; storing editable dashboard totals.
- Reasoning: exact reconciliation across partial/cross-period payments, refunds and promotion history.
- Trade-offs: bigint serialization and rounding policies; unapplied credit and adjustment rules add domain work.
- Future implications: Parent/Admin/Accountant use same facts with different authorized projections/scopes. Full statutory GL/tax scope is a separate decision.

## ADR-008 — Append-only financial facts and transactional posting

- Decision: immutable issued/settled facts, linked reversal/credit/refund evidence, locked allocation/counter checks, idempotency, append-only audit/outbox.
- Alternatives: editable settled rows; client-generated receipt numbers; one receipt PDF action without DB atomicity.
- Reasoning: prevents double collection, silent history changes and races; keeps money committed even if rendering fails.
- Trade-offs: more command/state design and finance review; not every failure can be undone by deleting data.
- Future implications: deterministic retries, close/reopen policy, banking reconciliation, artifact generation after commit; restrict direct CRUD.

## ADR-009 — Private manifest-bound Storage with quarantine

- Decision: private buckets for student/staff/homework/report/receipt records; typed manifest links, clean-scan state, scoped upload, short-lived download capability.
- Alternatives: public object URLs; folder-only security; uploader owns all future access; unscanned direct release.
- Reasoning: student/family/financial files require current relationship and release-state checks.
- Trade-offs: scanning, orphan cleanup, TTL/revocation and separate byte backup work.
- Future implications: approved retention/deletion workflows and recovery drills; only reviewed nonsensitive branding may be public.

## ADR-010 — Preserve UI, replace data contracts incrementally

- Decision: retain Next App Router, strict TS, Tailwind/owned components, Motion, accessible chart text; server DTOs around focused client islands.
- Alternatives: rewrite frontend/introduce another chart framework; implement an entire backend in one step.
- Reasoning: existing isolated features and deterministic tests provide useful regression base; backend authorization should not be mixed into presentation ad hoc.
- Trade-offs: duplicated helpers may persist until a safe domain contract exists; actual server paging changes interaction contracts.
- Future implications: staged adapters and five-role integration tests, no production seeding with mock identities. Read installed Next 16 docs before code, especially Proxy/cookies/cache boundaries.

## ADR-011 — Separate environments and measured recovery goals

- Decision: synthetic local/staging, separate production credentials/project, additive reviewed migrations, database and object backups, tested rollback/restore.
- Alternatives: one shared project for all previews; assume hosting rollback restores database/files; production data copied to developers.
- Reasoning: isolate mistakes and prove recoverability before real records.
- Trade-offs: cost and operational ownership; RPO/RTO/provider plans require approval.
- Future implications: no automatic production seeds, no unreviewed deployment integration, staged pilot, observability and incident runbooks.

## ADR-012 — Defer optional modules and compliance claims

- Decision: outline library/transport/payroll/inventory/certificates but implement only after owner/purpose/security review; legal framework reviewed by counsel.
- Alternatives: create every proposed table in initial migration; claim DPDP compliance from encryption/RLS alone.
- Reasoning: reduce premature complexity, child-data collection and misleading assurances.
- Trade-offs: extra future design gates and possible schema revisions.
- Future implications: no default tracking/analytics on children, no payroll tax automation without professional scope, record lawful basis/retention/responsibility decisions.

## ADR-013 — Five roles with controlled Super Admin tier

Approved requirement: preserve five roles; Super Admin is an Admin privilege requiring live membership and mandatory MFA. Only this tier manages accounts/security. Proposed mechanisms: independent approval, recent reauthentication, sealed dual-control bootstrap, locked last-admin protection and version revocation. Local contracts implement decisions over supplied evidence only. No service-key, audit or finance bypass.

## ADR-014 — Distinct registration/PIN identities and session bridge

Approved requirement: Student registration/PIN and Parent linked-child registration/separate PIN; one guardian identity across children. Proposed disambiguation: additional guardian reference. Preferred technical investigation: reviewed custom OIDC provider through Supabase Auth, preserving canonical Auth UUIDs. Exact controlled preprovisioning/identity binding and real session behavior remain unresolved release blockers. No fake email aliases, PIN-as-password shortcut or homemade session token. See the PIN design for alternatives and acceptance evidence.
