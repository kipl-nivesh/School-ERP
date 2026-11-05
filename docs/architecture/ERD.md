# Domain ERDs — proposed only

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

Any earlier proposed guardian login_reference column/uniqueness is no longer a required login input or an approved hidden selector. Internal canonical guardian IDs and verified dated relationships remain necessary. No schema or migration is changed.

## Retained earlier architecture — superseded where stated above

## Step 8 authoritative update

The historical diagrams below omit the proposed admin_privileges (profile 1:0..1), admin_privilege_events (profile 1:many), login_identities (profile 1:many), pin_credential_metadata (profile 1:many), and singleton security_bootstrap_runs relations. These additive relations are specified in the access model. Admin privilege is not a new role node. Existing guardian/student many-to-many links remain authoritative; registration and guardian login-reference uniqueness are required.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

Names refer to the [canonical schema inventory](DATABASE-SCHEMA-BLUEPRINT.md). These diagrams show important FKs, not every metadata/catalog/document/job edge. `o|` permits zero/one; `o{` permits zero/many; `||` requires one. Optional profile links do not create authorization by themselves. Composite year/section/student keys and transactional constraints remain mandatory even where a simple edge is used for readability.

## Identity, people and enrollment

```mermaid
erDiagram
  profiles ||--o{ user_roles : has
  roles ||--o{ user_roles : authorizes
  roles ||--o{ role_permissions : ceiling
  permissions ||--o{ role_permissions : defines
  user_roles ||--o{ user_role_permissions : restricts
  permissions ||--o{ user_role_permissions : allows_subset
  profiles ||--o{ role_contexts : owns_session_context
  roles ||--o{ role_contexts : active_role
  profiles o|--o| students : optional_unique_link
  profiles o|--o| guardians : optional_unique_link
  profiles o|--o| staff : optional_unique_link
  staff ||--o| teacher_profiles : teaching_extension
  students ||--o{ student_guardians : linked_by
  guardians ||--o{ student_guardians : approved_relationship
  academic_years ||--o{ terms : contains
  academic_years ||--o{ sections : defines
  academic_years ||--o{ student_batches : intake_cohorts
  student_batches ||--o{ students : stable_batch
  classes ||--o{ sections : grade_in_year
  students ||--o{ enrollments : historical_placements
  sections ||--o{ enrollments : roster
  academic_years ||--o{ enrollments : scoped_year
  enrollments ||--o| promotions : from_placement
  enrollments o|--o{ promotions : destination_or_graduation
  students ||--o{ student_transfers : transfer_history
```

A student has zero/many enrollments over time; placement intervals cannot overlap. `promotions.from_enrollment_id` is unique. Destination is optional only for graduation, required otherwise. Guardian membership is many-to-many with dated access/approval, not an email/name join. Staff→teacher is optional unique extension.

## Teaching, attendance and homework

```mermaid
erDiagram
  sections ||--o{ class_subjects : curriculum
  subjects ||--o{ class_subjects : taught_subject
  teacher_profiles ||--o{ teacher_assignments : assigned
  class_subjects ||--o{ teacher_assignments : effective_authority
  teacher_profiles ||--o{ class_teacher_assignments : homeroom
  sections ||--o{ class_teacher_assignments : attendance_authority
  teacher_assignments ||--o{ timetable_entries : delivers
  class_subjects ||--o{ timetable_entries : schedules
  timetable_periods ||--o{ timetable_entries : slot
  sections ||--o{ attendance_sessions : daily_register
  attendance_sessions ||--o{ attendance_records : records
  enrollments ||--o{ attendance_records : student_placement
  attendance_records ||--o{ attendance_corrections : correction_history
  teacher_assignments ||--o{ homework_assignments : authored_under
  homework_assignments ||--o{ homework_targets : targets
  class_subjects ||--o{ homework_targets : receives
  homework_assignments ||--o{ homework_submissions : attempts
  enrollments ||--o{ homework_submissions : submits
  homework_submissions ||--o{ submission_attachments : files
  document_objects ||--o| submission_attachments : manifest
```

Published homework needs at least one authorized target; drafts may have none. Records are unique per session/enrollment, submissions per homework/enrollment/attempt. The class/subject/year and effective teacher assignment are validated together, not merely independent FKs.

## Examinations and publication

```mermaid
erDiagram
  academic_years ||--o{ exams : year
  terms ||--o{ exams : term
  exam_types ||--o{ exams : type
  grade_scales ||--o{ exams : fixed_scale_version
  grade_scales ||--o{ grade_bands : thresholds
  exams ||--o{ subject_exams : sittings
  class_subjects ||--o{ subject_exams : section_subject
  subject_exams ||--o{ marks : working_entries
  enrollments ||--o{ marks : candidate
  exams ||--o{ result_publications : released_snapshot
  enrollments ||--o{ result_publications : own_release
  result_publications ||--o{ report_cards : template_artifacts
  document_objects ||--o| report_cards : private_file
  marks ||--o{ result_corrections : request_history
  result_publications o|--o{ result_corrections : resulting_revision
```

Publications are per exam/enrollment/revision and contain validated immutable snapshots of approved marks. Families query publications, not the working marks table. Corrections require a new released revision; report artifacts refer to that exact revision.

## Finance

```mermaid
erDiagram
  academic_years ||--o{ fee_structures : tariff_year
  classes ||--o{ fee_structures : grade_tariff
  fee_structures ||--o{ fee_structure_lines : installments
  fee_structures ||--o{ student_fee_assignments : assigned
  enrollments ||--o{ student_fee_assignments : enrollment_tariff
  students ||--o{ fee_invoices : owes
  enrollments ||--o{ fee_invoices : historical_class
  student_fee_assignments o|--o{ fee_invoices : optional_tariff_source
  fee_invoices ||--o{ invoice_lines : billed_lines
  fee_categories ||--o{ invoice_lines : category
  fee_invoices ||--o{ invoice_adjustments : posted_notes
  students ||--o{ payment_attempts : attempted
  students ||--o{ payments : settled_for
  payment_attempts o|--o| payments : at_most_one_settlement
  payments ||--o{ payment_allocations : allocated_or_reversed
  fee_invoices ||--o{ payment_allocations : receives
  payments ||--|| receipts : one_issued_identity
  payments ||--o{ refunds : returned_cash
  refunds ||--o{ refund_allocations : allocation_reversal_links
  payment_allocations ||--o{ refund_allocations : original_allocation
  expense_categories ||--o{ expenses : categorizes
  expenses ||--o{ expense_payments : partial_disbursements
  operation_keys ||--o{ financial_events : command_audit
  reconciliation_runs ||--o{ reconciliation_items : matches
```

One settled payment belongs to one student in the initial design, may pay many of that student's invoices, and gets one immutable receipt identity in the posting transaction. Counter uniqueness + transaction enforce receipt 1:1; no direct payment inserts. Refund links point to original and reversal allocations; they are not a second balance adjustment. Expense obligations have zero/many partial paid events. Reconciliation items point to exactly one payment/refund/expense-payment cash fact.

## Documents, messaging and jobs

```mermaid
erDiagram
  students ||--o{ student_documents : files
  staff ||--o{ staff_documents : files
  document_objects ||--o| student_documents : typed_student_link
  document_objects ||--o| staff_documents : typed_staff_link
  announcements ||--o{ announcement_audiences : restricted_targets
  announcements ||--o{ announcement_documents : files
  document_objects ||--o| announcement_documents : typed_notice_link
  profiles ||--o{ notifications : recipient
  notifications ||--o{ notification_reads : acknowledgment
  profiles ||--o{ notification_reads : own_read
  students ||--o{ message_threads : child_context
  message_threads ||--o{ thread_participants : members
  profiles ||--o{ thread_participants : participates
  message_threads ||--o{ messages : conversation
  profiles ||--o{ messages : sender
  profiles ||--o{ report_jobs : requests
  document_objects o|--o{ report_jobs : optional_output
```

At most one typed parent purpose per object is a command/manifest integrity rule across document links, not independently implied by each edge. Notification read's profile must equal recipient. Thread participation additionally requires a currently authorized child relationship. Job output access is reauthorized, not granted by the existence of a file UUID.
