# Role permissions matrix — proposed ceilings

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

## Step 8 authoritative update

The Admin column means ordinary Admin unless an explicit Super Admin overlay is stated. Ordinary Admin cannot provision users, reset credentials, suspend accounts, assign/revoke roles or permissions, or elevate itself. Super Admin with live Admin context and MFA can review all five modules, subject to row/workflow controls and immutable audit/finance rules. A guardian relationship may be reviewed by authorized staff, but only the protected approved workflow may activate access; no account role can be granted incidentally.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

Exactly five primary roles. **Membership + active role + granted operation + row relationship + workflow state** are all required. These are proposed maximum role capabilities, not automatic grants to every staff member. Dashboard availability does not grant data access. No primary role code for Principal or Office Staff.

Legend: V view, C create, U update, D delete only unreferenced drafts, A approve/publish, E export. `own` = linked person; `assigned` = current authorized class/subject/exam and effective dates; `child` = approved, unrevoked guardian link with appropriate academic/fee permission; `pub` = published/released data only. `—` denies. Missing operations deny. Exports always require separate permission, purpose, bounded scope and audit. Academic/financial final records cannot be deleted by ordinary roles.

| Resource / action scope | Admin | Teacher | Student | Parent | Accountant |
| --- | --- | --- | --- | --- | --- |
| Dashboard | V admin | V teacher | V student | V parent | V accountant |
| School profile/general settings | V C U A | V public subset | V public subset | V public subset | V finance configuration subset |
| Accounts/role grants | — ordinary Admin; Super Admin only under controlled IAM workflow | V own profile subset | V own profile subset | V own profile subset | V own profile subset |
| Admissions | V C U A E | V assigned enrollment roster only | V own accepted admission subset | V child accepted subset | V approved fee identifier projection only |
| Student master / sensitive fields | V C U A E by field permission | V assigned classroom subset | V own permitted fields | V child permitted fields | V fee ID/display name/grade projection, no health/address/emergency data |
| Guardian relationship | V C U A; verify relationship | V necessary assigned contact channel only | V permitted emergency contact subset | V own approved children; no self-link C/U | — |
| Staff/teacher profiles | V C U A E | V own employment subset; request correction | — | V public teacher directory subset | V payee projection only if expense permission |
| Academic years/terms/calendar | V C U D A | V assigned years | V relevant calendar | V relevant calendar | V reporting year/calendar |
| Classes/sections | V C U D A | V assigned | V own enrollment | V child enrollment | V fee reporting projection |
| Subjects/class curriculum | V C U D A | V assigned | V own | V child | — |
| Teacher/class assignments | V C U A | V own | V relevant public timetable teacher | V child relevant teacher | — |
| Timetable | V C U D A | V assigned; request conflict correction | V own published schedule | V child published schedule | — |
| Student attendance session/record | V C U A E via audited workflow | V C U assigned open sessions; correction C after lock | V own finalized | V child finalized | — |
| Attendance correction approval | V A, not own request | C assigned request; V own request | — | — | — |
| Staff attendance | V C U A E HR permission | V own | — | — | V payroll aggregate only with explicit grant |
| Homework assignment/attachments | V C U D A E academic permission | V C U D assigned drafts; publish assigned | V own published targets | V child published targets | — |
| Homework submission | V authorized audit; U only correction workflow | V review assigned; U feedback/status | V C U own until due/lock | V child permitted status/feedback; no submit as child | — |
| Examination schedule | V C U D A E | V assigned | V own published schedule | V child published schedule | V fee-related schedule only if needed, otherwise — |
| Marks entry | V assigned academic administration; C U A E | V C U assigned subject_exam drafts | V own pub only | V child pub only | — |
| Result approval/publication | V A separate from entrant | Submit for review; no A by default | V own pub | V child pub | — |
| Mark corrections | V A separate reviewer; audited version | C request assigned, V related history | V resulting published revision only | V child resulting published revision only | — |
| Fee categories/structures | V C U D A E finance permission | — | V own issued invoice subset if approved | V child issued invoices | V C U D drafts; A requires independent approver grant |
| Fee assignments/invoices | V C U D A E via controlled posting | — | V own issued subset | V child issued | V C U D drafts; issue via posting permission |
| Concessions/adjustments | V C A E; no self-approval | — | V own applied amount | V child applied amount | V C request; A only different approver, explicit grant |
| Payment attempts/settled payments/allocations | V authorized audit; C posting if granted; E | — | V own permitted payment status | V child permitted receipt/payment DTO | V C posting/reallocation requests; no U/D settled records; E granted |
| Refunds | V A different requester; E | — | V own final refund information | V child final refund information | V C request; A different approver grant; no silent delete |
| Expenses/payments | V C U D draft A E finance grant | — | — | — | V C U D draft; record payment under grant; A independent |
| Receipts | V issued; regenerate copy via job, E | — | V own issued if policy permits | V child issued | V C issue atomically with payment; E scoped; no edit/renumber/delete |
| Financial reports | V E finance permission | — | — | V child statement only, no school aggregate | V E finance permission |
| Academic reports/report cards | V A E academic permission | V assigned draft aggregates; E authorized | V own released report | V child released report | — |
| Announcements | V C U D draft A | V audience; C U assigned draft/publish if granted | V permitted published audience | V permitted published audience | V audience; C finance-targeted draft only |
| Notifications/read status | V own; no school-wide inbox browsing by default | V U own read status | V U own | V U own | V U own |
| Private parent–teacher messages | V only separately authorized safeguarding review, audited | V C assigned thread participant | — by default | V C verified child thread participant | — |
| Student/staff documents | V C U quarantine; D retention workflow by purpose grant | V assigned academic files only | V own designated released files; C permitted homework | V child permitted files; no HR | V receipts/invoice support only |
| Audit logs | V E audit permission; never ordinary C/U/D | V own command outcome only | — | — | V financial audit projection/E if granted |
| Library/transport/HR/inventory/certificates | Deferred module-specific grants | No implicit grant | No implicit grant | No implicit grant | No implicit grant |

## Restricted staff within Admin

Permission codes such as `admissions.create`, `attendance.correct.approve`, `marks.publish`, `fees.issue`, `refunds.approve`, `exports.finance`, `accounts.grant`, `audit.read` are stored in `permissions`; role_permissions define ceilings. `user_roles.restricted=true` requires an explicit intersection with user_role_permissions. For example Office Staff may have admissions/rosters and no financial approvals/role grants; a Principal may approve academics without managing secrets. This does not create a sixth role. Grant changes require an independently authorized Admin and MFA, cannot exceed the role ceiling, and cannot be performed by the recipient alone.

## Additional invariants

- Parent academic and fee visibility are separate flags on an approved dated guardian link; a relation label alone grants nothing. Multiple guardians may have different restrictions.
- Teacher subject and class scopes are effective-dated. Class teacher attendance authority does not automatically grant every subject's marks authority.
- A user holding Parent and Teacher does not receive a union of rights while one role is active. RLS uses the DB-bound role context described in [auth plan](AUTHENTICATION-PLAN.md).
- Column minimization needs grants/secure projections/commands as well as RLS: RLS controls rows, not which sensitive columns are returned.
- Delete means draft disposal where references/retention allow it; published grades, locked attendance, issued invoices, settled cash and audits use correction/reversal workflows.
- Export requests re-evaluate authorization at generation and download, protect against spreadsheet-formula injection, expire files, and record purpose/actor/scope. No bulk family or academic export for Accountant.
- Every approval checks requester != approver plus live permission. Emergency access is time-limited, reasoned and audited, never an unrestricted hidden sixth dashboard.

The [RLS blueprint](RLS-SECURITY-BLUEPRINT.md) and database command constraints enforce these ceilings. No permission policy was implemented or exercised against a live database in Step 7.
