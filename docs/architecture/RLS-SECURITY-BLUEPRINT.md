# RLS and authorization blueprint — planning pseudocode only

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

## Step 8 authoritative update

Any older Admin account/grant mutation permission means Super Admin only, verified from protected live tier and Admin membership with aal2. No service-role bypass is granted to Super Admin. Implement live account, authorization-version, session-context and guardian checks in RLS/commands; login method or source marker is not authority. PIN integration must yield a genuinely supported identity/session before this blueprint can be implemented.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

No policies, functions, grants, SQL or database connections were executed. The [schema](DATABASE-SCHEMA-BLUEPRINT.md) defines table names and [permission matrix](ROLE-PERMISSIONS-MATRIX.md) defines maximum operations. RLS is a second boundary behind server authorization, not a replacement for it.

## Default deny and API surface

Use a private domain schema and a deliberately small exposed API schema. Enable RLS before granting access on all sensitive tables. Unauthenticated requests, suspended users, missing/expired role context and absent grants return no rows or permission errors. Review SQL privileges as well as RLS; no broad PUBLIC execute, anonymous CRUD, or service-secret browser access. Even tables with harmless-looking UUIDs contain relationship information.

Allow only needed SELECT/INSERT/UPDATE/DELETE grants. Direct writes to roles, profile security fields, memberships, guardian approvals, financial postings, result publications, audit and jobs are denied; reviewed commands enforce workflow transitions. RLS UPDATE must validate both old-row visibility and new-row eligibility. RLS alone cannot prevent changing a protected column within an otherwise allowed row: revoke column writes or require allowlisted commands.

Supabase documents that RLS is required on exposed-schema tables and that view ownership can bypass policies; views intended to honor callers need invoker-safe behavior. [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). Review owner/BYPASSRLS roles, views, materialized views and functions independently. A route hidden in navigation provides no security.

## Trusted context and nonrecursive helpers

Planning notation below is **not SQL**:

```text
context(request):
  validate signed user JWT; principal = verified subject; session = verified session_id
  require active profiles(principal)
  ctx = protected role_contexts(session), belonging to principal
  require ctx not revoked, not expired, current live user_roles membership
  require role exactly one of five primary codes
  permission = role ceiling intersect restricted membership allowlist if restricted
  for high-risk operation require verified MFA + recent reauthentication evidence
  return principal, role, context_version, permission set

linked_child(principal, student, purpose):
  require active Parent context
  resolve guardians.profile_id = principal (not supplied guardian ID)
  require approved, dated, unrevoked student_guardians link
  require purpose-specific academic_access or fee_access
  deny restricted/legal-blocked link even if names/emails match

assigned_teacher(principal, section, subject, record_date, operation):
  require active Teacher context and active staff/teacher profile
  require effective assignment for target + requested operation
  validate enrollment/subject/year matches row date
  require current assignment or separately authorized historical-review grant
```

Role is derived from the protected per-session DB row, not user_metadata, a form field, URL, JWT role label supplied by client, custom request header or pooled connection variable. Each operation validates the current permission ceiling; client cannot add a grant by editing its DTO. Switch-role command validates membership, increments context_version, and audits. Writes must match expected context version; no union of inactive roles. Reads do not cache authorization across role changes.

Helper queries must not recursively invoke the same protected policy chain: for example policies on user_roles must not call a helper that reselects user_roles under that same policy. Proposed helper owner is a dedicated NOLOGIN role with narrowly reviewed access only to the necessary private IAM/relationship tables; owner bypass, if required for those exact lookups, is explicit, audited and unavailable to application users. Fix search_path, fully qualify names, forbid dynamic SQL and caller-chosen table names, return only boolean/minimal context. Revoke default PUBLIC/anon execute; allow only enumerated helpers/commands. FORCE RLS/owner behavior must be reviewed for compatibility rather than assumed. Tests must prove no unintended bypass or recursion before any exposure.

## Category-by-category policy intent

All categories deny operations not explicitly granted in the matrix. Every child table follows its parent's authorization plus state checks; knowing the child UUID never expands access.

| Category and tables | Read scope | Write scope and state controls |
| --- | --- | --- |
| CFG: school_profile, school_settings, years, terms, calendar, classes | Authorized school catalog subset; safe branding may be public; personal settings never public | Admin configuration permission; archive referenced masters, no historical destruction |
| IAM: profiles, roles, permissions, memberships, role_contexts, invitations, consents, audit_events | Own minimal account; grant administrators get scoped catalog; audit/privacy separately gated | Trusted provisioning/grant/context commands only; user cannot change status, profile link, role or consent evidence to gain access; audit append-only |
| ST: students, admissions, guardians, student_guardians, emergency contacts, enrollments, transfers | Admin field grants; Student self via students.profile_id; Parent linked purpose; Teacher assigned roster projection | Admin admission/link/promotion workflows; family correction requests separate, no arbitrary self-link or admission-number update; no Accountant raw master read |
| HR: staff, teacher_profiles, departments, staff_documents, staff_attendance | HR Admin grants; Teacher own permitted employment subset; public teacher directory is separate DTO | Admin HR commands only; Accountant payee/payroll projection needs explicit grant; staff documents not broadly shared |
| AC: sections, class_subjects, assignments, timetable | Admin; assigned Teacher; own/child enrollment with published timetable; no broad academic roster for Accountant | Admin scheduling/assignment commands; same-year and collision constraints; teacher cannot assign self |
| AT: sessions, records, corrections | Admin attendance grants; Teacher assigned class; own/child finalized records only | Assigned teacher writes open eligible session, cannot swap student/session ownership; locked record corrections need independently approved request; append old/new audit |
| HW: assignments, targets, submissions, attachments | Author/assigned Teacher; Student targeted enrollment; Parent linked child published task/status; no peer submissions | Teacher only permitted target sections; Student own attempt within submission rules; review columns teacher-only; parent read-only; attached objects inherit eligibility |
| EX: exams, subject_exams, marks, scales, publications, corrections, report_cards | Teacher assigned examination; Admin academic grants; Student/Parent ONLY released result_publications/report_cards | Draft marks teacher-bound; approval separate; family has NO SELECT grant on working marks; publication/correction commands snapshot approved data atomically |
| FI: tariffs, invoices, lines, payments, allocations, receipts, refunds, expenses, reconciliations, financial_events, operation_keys | Accountant and finance-authorized Admin; own/child issued invoice, receipt and statement DTOs only; identifiers minimized | Posting commands, not direct financial CRUD; explicit approvals/MFA, row locks, idempotency, append-only facts/reversals; payer/student never client-authorized by itself |
| CM: announcements/audiences/doc links | Published, currently effective audience; school notice intentionally shared with authenticated eligible role; section/student targets require relationship | Admin/Teacher author only within authorized audience; Accountant finance draft only; public publishing separate approval; no audience broadening by row update |
| CM: messages/threads/participants | Actual participant AND still verified teacher/guardian for thread student; explicit audited safeguarding exception | Sender derives from principal; no arbitrary add-participant; no Student/Accountant messages by default; moderation redaction retained |
| CM: notifications/reads | Recipient only; linked target reauthorized | System creates authorized recipients; recipient may update own read timestamp only; self-notification inserts denied |
| DOC: manifest and every typed file link | Domain relationship, purpose, scan clean, release state and retention; uploader alone insufficient | Quarantine upload command allocates scope/key; no upsert ownership transfer; guarded retention delete; see Storage plan |
| JOB: report_jobs, outbox_jobs | Requester authorized report metadata; narrow operators/worker for jobs | Server queues validated scope; worker leases bounded job; authorization rechecked before delivering; no user-chosen recipient or arbitrary SQL |
| Deferred modules | Default deny until module-specific grants/row policies are reviewed | No permission automatically inherited from generic dashboard access |

### Example planning predicates

```text
attendance SELECT for Parent:
  context.role == parent AND linked_child(context.user, row.enrollment.student, academic)
  AND row.session is finalized

marks SELECT for Student or Parent: DENY (working rows)
result_publications SELECT:
  active self/linked-child permission AND released AND not withdrawn
  AND revision is current permitted publication for exam/enrollment

invoice statement SELECT for Parent:
  linked_child(context.user, invoice.student, fees) AND invoice issued
  return only child's lines/allocations/receipt documents; never school's ledger

financial POST:
  context.role in {accountant, admin} AND permission for exact command
  AND MFA AND not suspended AND expected_context_version matches
  AND valid actor-independent approval where required
  THEN transactional validation/locks; append audit; commit or rollback
```

Do not implement a broad permissive policy for Admin and assume later restrictive teacher/parent policies narrow it: policy composition must be reasoned about for the active-role predicate. Explicitly test OR composition, UPDATE WITH CHECK equivalents and definer behavior. Financial aggregate functions must authorize rows before grouping, never compute a school total then redact it client-side.

The shared operation_keys table serves admission and other domain commands as well as finance. Its category labels do not grant an Accountant visibility into another module's idempotency records: only the trusted command and authorized caller's minimal operation result may be exposed. Writes remain command-specific and payload/actor bound.

## Adversarial verification plan — not executed

Construct at least two unrelated families, two assigned teachers, a suspended account, a multi-role Teacher/Parent, a restricted Admin, an Accountant and a privileged approver. Test SQL/API under each authenticated principal, including anonymous requests and direct RPC/Storage calls, not only UI clicks.

Required denials: swapping child/enrollment/file UUID, modifying user_metadata role, forging active-role cookie/header, selecting all guardian links, Teacher reaching another subject/class/year, class-teacher entering unrelated marks, Student changing reviewer fields, reading draft/withdrawn/superseded results, stale role context, revoked guardian/teacher assignment, inactive staff, unauthorized exports and signed URL issuance, direct financial UPDATE/DELETE, repeated requests, anonymous function execute and audit mutation. Include positive own/assigned/published cases to detect policies that deny everyone.

Live application suspension/profile status and role/guardian revocation are checked at access time. Native Auth token revocation is distinct: a cryptographically valid JWT can survive Auth logout until expiry. Application logout revokes role_context immediately; out-of-band Auth-admin changes require synchronized app suspension/session revocation and a bounded short-token fallback. Approve this operational revocation design and test it; do not promise instant provider-token invalidation. Previously issued signed URLs remain bearer capabilities until their short expiry, as disclosed in Storage planning.

Measure policy queries with indexes matching principal/relationship/date filters; avoid per-row remote calls and expensive recursive joins. Review direct-table and view grants, subscription payloads, error messages and timing/existence leaks. No service-role test can prove ordinary-user RLS correctness.

## Privacy/security review and India questions

Threats include unrelated-child disclosure, staff health/payroll exposure, financial alteration, overbroad exports, malware uploads, stolen sessions, leaked logs and backup/object exposure. Use data minimization, HTTPS, provider encryption at rest, server validation, encoded output, CSP, cookie-aware CSRF controls, rate limits, isolated secrets, purpose-specific exports, restricted audit readership and tested recovery. No raw HTML, public student buckets, advertising trackers or behavioral profiling as a default feature. Exported CSV values must neutralize formula injection.

India review as of **5 November 2026**: the DPDP framework includes special treatment of children's data and a phased implementation timetable. Official education guidance discusses parental consent and limited educational/safety exemptions; this is not a blanket school exemption. [Government education guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2202901&lang=2&reg=48), [notification overview](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&lang=1&reg=3). Counsel must check operative Gazette commencement provisions, corrigenda and school applicability at launch; do not infer that every substantive obligation is already in force or assert compliance from this architecture.

Approval questions: school/controller and vendor/processor responsibilities; child/adult age assurance; verifiable guardian consent or precise lawful exemption and evidence; consent withdrawal/grievance/access/correction workflow; retention vs statutory academic/financial evidence; breach duties/timelines; transfer/localization requirements and approved provider region/subprocessors; attendance/transport tracking necessity; restricted guardianship/custody; treatment of government identifiers and health information. Store minimum evidence needed, not copies of Aadhaar or credentials by default. Obtain professional privacy, accounting and education-sector advice before real records.
