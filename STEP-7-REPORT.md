# Step 7 report — architecture audit and backend blueprint

Completed: **5 November 2026**, Asia/Kolkata. Status: **read-only audit and proposed architecture documentation only**. No backend or authentication implementation is included. Earlier reports and README remain unchanged as historical evidence.

## 1. Executive summary

Audited the completed five-dashboard Next.js application and created the 12 requested architecture documents. The existing implementation is a well-isolated fictional frontend preview, not a secured ERP. The proposed backend uses one school's PostgreSQL domain model, Supabase Auth/Storage, default-deny RLS, server-side authorization, and future Vercel deployment with separate environments.

The most consequential findings are public dashboard routes, client-imported full mock datasets in Parent/Accountant, independent financial fixtures, missing persistent relationships/publication/workflows, and absent backend security/operational tests. They are documented integration risks, not claims of an existing breach involving real school data.

The proposal preserves exactly five primary roles and historical years/enrollments, supports verified multiple guardians/children and effective teacher assignments, and gives Parent/Admin/Accountant one future financial source of truth. All schema, authorization, infrastructure and roadmap decisions remain proposals requiring review; no production-readiness or legal-compliance certification is claimed.

## 2. Existing codebase audit

Inspected README, reports 1–6, package scripts/dependencies, strict TS configuration, actual App Router tree, all five feature entry points/data architectures, shared shell/header/sidebar/drawer/navigation/switcher, chart/text-table patterns, original SVG/motion utilities, pure calculation helpers and verification scripts.

Confirmed:

- Next 16.4.5, React 19.3.1, TypeScript 6 strict, Tailwind 4, Motion, Radix and Lucide; webpack mode is explicit in dev/build scripts. No root `next.config.*` exists, so this is framework defaults plus script flags, not an inspected custom configuration file.
- Six intended routes: landing plus Admin/Teacher/Student/Parent/Accountant dashboards. Role layouts pass literal presentation roles; no session/authorization guards, Supabase client, API handler, Proxy, SQL or migration implementation was found in the inspected app tree.
- Development role switcher navigates routes only; production hiding is not access control.
- Feature CSS and presentation are isolated; minimal shared Button/Skeleton and chart textual alternatives exist. Desktop collapse/mobile dialog/focus/reduced-motion patterns are strengths.
- Server composition exists in Admin/Teacher/Student, with filter/motion islands. Parent imports all fictional children into its client portal; Accountant imports the complete small ledger into its client workspace. These patterns must not simply receive whole real datasets.
- Fixed snapshots differ by feature. Admin additionally uses request-time India greeting date. Production needs explicit year/report/as-of/date semantics.
- Financial fixtures are independent: Admin/Parent use rupee-number mock contracts; Accountant uses paise and a deliberately simplified same-month ledger. They are not a coherent real database.
- A loading skeleton exists; no custom route error/global-error/not-found file was found. Future backend errors cannot be handled as empty/zero metrics.
- Formatting/calculation/motion wrappers are duplicated across bounded features and some JSX is dense. Extract shared domain contracts incrementally, without a cosmetic rewrite now.
- Earlier reports document build/browser checks and dev-tool advisories. Step 7 does not reassert those historical results as a fresh dependency, browser or deployment security audit.

Detailed evidence paths and consequences: [system audit](docs/architecture/SYSTEM-ARCHITECTURE.md).

## 3. Architecture overview

Proposed: Next App Router pages use request-scoped server-only identity/authorization/query/command layers. Supabase user JWT keeps RLS active; sensitive administrative credentials are isolated to provisioning/controlled jobs. Client islands receive minimal authorized DTOs for visual interactions, not all school records. Server Actions are authorized mutation endpoints; Route Handlers cover callbacks/downloads/integrations with their own validation.

Proxy may refresh sessions/redirect early, but final authorization is repeated at the server data boundary and DB command/RLS boundary. Installed Next documentation was reviewed for Proxy and data-security guidance; no Next files were edited. Avoid shared caches for identity-bearing/private content; separate local, staging and production credentials/projects. Proposed recovery targets require budget/owner approval, not assumptions about hosting rollback.

[System architecture](docs/architecture/SYSTEM-ARCHITECTURE.md), [authentication](docs/architecture/AUTHENTICATION-PLAN.md), [ADRs](docs/architecture/ARCHITECTURE-DECISIONS.md).

## 4. Proposed database domains

Configuration/calendar; identity/permissions/privacy/audit; students/admissions/guardians/intake batches/enrollments/promotions/transfers; staff/teachers/assignments; academic structure/timetable; attendance/corrections; homework/submissions; exams/marks/publications; fees/collections/refunds/expenses/reconciliation; communication/documents/jobs; explicitly deferred additional modules.

There are no tenant IDs, school subscriptions, multi-school plans or extra dashboards. One singleton school configuration supports many academic years and date-valid relationships. Stable intake batches are distinct from year-specific class placements. Promotions preserve prior enrollments and attached records.

## 5. Table inventory

The [schema blueprint](docs/architecture/DATABASE-SCHEMA-BLUEPRINT.md) inventories **103 proposed tables**, including **89 across the eventual main domain design** and **14 explicitly deferred learning/additional-module tables**. This is not a proposed 103-table first migration; roadmap tasks introduce only reviewed domain subsets.

| Domain | Proposed tables |
| --- | ---: |
| A School configuration | 5 |
| B Identity, permission and privacy metadata | 10 |
| C Student/family/enrollment history, including batches | 10 |
| D Staff and teacher assignments | 6 |
| E Academic structure/timetable | 6 |
| F Attendance | 4 |
| G Homework | 5 |
| H Examinations/results | 9 |
| I Fees/payments/expenses | 23 |
| J Communication/documents/jobs | 11 |
| K Deferred learning/library/transport/payroll/inventory/certificates | 14 |

Inventory rows specify purpose, typed important columns, PK convention/overrides, FKs, uniqueness/checks, required common/extra indexes, ownership and RLS category. Cross-row constraints are explicitly assigned to composite FKs, exclusion rules or locked transactional commands, rather than impossible cross-table CHECK clauses. Five [Mermaid domain ERDs](docs/architecture/ERD.md) cover 74 important entities; omitted catalog/support edges remain defined in the inventory.

## 6. Role permission summary

Exactly Admin, Teacher, Student, Parent and Accountant. [Detailed operation matrix](docs/architecture/ROLE-PERMISSIONS-MATRIX.md) covers dashboard/settings/admissions/people/year/classes/subjects/schedules/attendance/homework/exams/marks/fees/payments/expenses/receipts/reports/announcements/documents/audits, distinguishing view/create/update/draft-delete/approve/export.

Membership is not sufficient: live account + active authorized role + exact permission + row relationship + state are required. Restricted Principal/Office responsibilities use permission subsets inside Admin, not extra primary roles. Multi-role users select one DB-bound active role per Auth session; inactive memberships do not create an implicit rights union. Privileged grants, refunds and publication require separation of duties where specified.

## 7. Authentication strategy

Invitation-first verified email/password, explicit domain-person links, account activation/suspension, password recovery, MFA, rate limits, bounded sessions and audited role selection. Admission number is never sufficient authentication. Student email/identifier recovery model requires school approval; parent address possession does not prove guardianship.

The auth plan distinguishes cryptographic token validation, fresh provider state and live application authorization. Supabase's current SSR guidance recommends verified claims and warns against using an unverified cookie-session user object for authorization. [Official SSR reference](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs). Logout revokes application role context; out-of-band provider revocation and already-issued tokens/capabilities need an explicit operational design and bounded windows.

Proposed password/session/reauthentication targets are clearly marked recommendations, not configured values. No user/account/invitation/session was created.

## 8. RLS security summary

Default-deny tables and API grants; server authorization plus RLS; protected active-role context; live parent-child and effective teacher scope; no family read of working marks; finance-only accountant data projections; participant AND relationship checks for private messages; private manifest-based files; immutable audit/financial facts.

Policy logic appears only as plain planning pseudocode in [RLS blueprint](docs/architecture/RLS-SECURITY-BLUEPRINT.md). It addresses SELECT and mutation checks, column protections, recursive helpers, function execute grants/search paths, view/owner bypass, stale role context, privacy minimization and direct API adversarial testing. No policy was executed or validated on a database.

## 9. Financial architecture summary

Use integer bigint paise and decimal-string transport. Issued invoices, credits/debits and allocation reversals describe obligation; dated settlements/refunds/expense-payments describe cash. Partial/multiple payments, unapplied credit, idempotency, immutable receipts, locked numbering, independently approved refunds/concessions and reconciliation are planned.

Key difference from the preserved mock: invoice-cohort debt does not generally equal period cash collections. Cross-period settlements and refunds require separate cohort/as-of and cash-period queries. Parent, Accountant and Admin ultimately use those same underlying facts with authorized projections, not copied totals. The [financial design](docs/architecture/FINANCIAL-DATA-DESIGN.md) includes arithmetic examples, command atomicity, retry/concurrency rules, and accounting assumptions to approve.

No real ledger/financial record was read or changed. The existing mock-data reconciliation tests were rerun; the proposed production transactions remain untested designs.

## 10. Storage security summary

Private buckets proposed for student/staff/homework/notice/report/receipt files, public only for deliberately approved nonsensitive branding. Typed manifests, clean/quarantine states, magic-byte/type/size checks, malware scanning, scoped no-overwrite uploads, short signed URL/proxy delivery, purpose-based retention and separate byte backups are documented.

Uploader/path alone never proves child/file access. Revocation blocks new links but cannot promise immediate expiry of previously issued bearer URLs. [Storage plan](docs/architecture/STORAGE-SECURITY-PLAN.md). No bucket, file, signed URL, scanner or provider configuration was created.

## 11. Mock-data integration strategy

[Field/query mapping](docs/architecture/MOCK-TO-DATABASE-MAPPING.md) covers all requested dashboard aggregates and interactions, giving current source path, future table/query contract, role scope, server/client boundary, difficulty and dependencies. It explicitly resolves year/history, attendance leave/unknown denominators, published-only results, Parent selected-child authorization and exact-money scope differences.

Keep fictional fixtures for synthetic regression only; never seed them as production records. Replace one feature with authorized server adapters after its domain/RLS tests exist. Real imports/opening balances require separately approved provenance, staging trial, duplicate review, family verification, reconciliation and rollback evidence.

## 12. Implementation roadmap

The [roadmap](docs/architecture/IMPLEMENTATION-ROADMAP.md) defines 17 future tasks, each with objective, dependencies, expected modules, security requirements, tests, acceptance and rollback:

architecture/policy approval → isolated environments → minimal IAM/RLS → auth/role context → academic catalogs → admissions/guardians/enrollments → teachers/schedules → private Storage → attendance → homework → approved results → invoicing → collections/receipts/refunds → expenses/reconciliation/shared finance → communication → approved optional reports/modules → release readiness.

Admission, promotion, attendance, publication and financial posting transaction contracts include concurrency/version checks and outbox boundaries. PostgreSQL transactions do not make Auth/Storage/email/provider calls atomic; partial failure/retry/reconciliation is explicit. No roadmap task was implemented.

## 13. Architectural decisions

Twelve [proposed ADRs](docs/architecture/ARCHITECTURE-DECISIONS.md) cover single-school history, managed identity linking, active-role least privilege, server DAL plus RLS, verified guardian relationships, published-result snapshots, integer money/scope separation, immutable financial transactions, private Storage, incremental UI adapters, isolated operations/recovery, and deferral/compliance boundaries. Each records decision, alternatives, reasoning, trade-offs and future effects.

## 14. Critical risks

The [risk register](docs/architecture/RISK-REGISTER.md) lists 24 risks with severity, likelihood, mitigation, verification and owner responsibility. Highest priorities: public-route real-data exposure, RLS/definer mistakes, unrelated-child access, wrong teacher scope, unpublished marks, duplicate/mis-scoped financial events, leaked documents/caches, role spoofing, migrations, recovery and preview/production misconfiguration.

None is declared closed by documentation or mock arithmetic tests. Closure requires implemented controls and evidence under realistic user JWTs, not service-role tests.

India privacy planning was checked against official government guidance discussing phased DPDP implementation and children's educational data. [Notification overview](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&lang=1&reg=3), [student-data guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2202901&lang=2&reg=48). The plan flags operative commencement/Gazette/corrigenda, lawful purpose/consent/exemptions, guardian evidence, retention, rights, breach and provider-region questions for professional review. It does **not** assert that all provisions are already in force or that this ERP is compliant.

## 15. Open questions requiring approval

These do not prevent completing this documentation step; they are gates before corresponding future implementation.

| Decision | Proposed starting point / unresolved point | Approval owner |
| --- | --- | --- |
| Student identity/recovery | Verified personal or school-issued email; safe alternative for children without email; no admission-number-only login | School records + security |
| Guardian verification/custody | Staff-approved dated links; separate academic/fee rights; restricted-link and evidence handling | School management/privacy |
| Historical access | Default deny ended teacher access; current guardians' historical published-child scope needs explicit policy | Academic/privacy leads |
| Restricted staff grants | Approved Admin subsets, at least two people for sensitive approvals/recovery | School management |
| Attendance semantics | Daily vs period session; leave/late/excused/unknown denominators and correction lock | Academic lead |
| Grading/publication | Weights, absent/exempt marks, scales, review/publish/correction/withdrawal rules | Exam controller |
| Financial conventions | Receipt series/year/reset/void, partial/prepayments, credits/refunds, backdates, closed periods, one-student vs sibling/bulk cash | Finance lead/professional adviser |
| Opening balances/import | Real source/provenance, validated unpaid debt/unapplied credits, independent reconciliation | Finance + school records |
| Auth/session controls | MFA/recovery, proposed idle/absolute limits, out-of-band provider revocation fallback and shared-tab role behavior | Security/management |
| Files/retention | MIME/size defaults, scanner, legal holds, object backup, signed URL vs proxy, deletion periods | Privacy/operations |
| India obligations | Current legal commencement/applicability, children's consent/exemption scope, notices/rights/breach/transfer duties | Qualified counsel + school owner |
| Hosting/recovery | Provider region/plan, RPO/RTO, operator responsibility, incident budget and deployment approvals | Management/operations |
| Release scope | Optional library/transport/payroll/inventory/certificates/achievements; no unnecessary collection/tracking | School product owner |

## 16. Documentation files created

Only these 13 Markdown files were added:

- [SYSTEM-ARCHITECTURE.md](docs/architecture/SYSTEM-ARCHITECTURE.md)
- [DATABASE-SCHEMA-BLUEPRINT.md](docs/architecture/DATABASE-SCHEMA-BLUEPRINT.md)
- [ERD.md](docs/architecture/ERD.md)
- [ROLE-PERMISSIONS-MATRIX.md](docs/architecture/ROLE-PERMISSIONS-MATRIX.md)
- [AUTHENTICATION-PLAN.md](docs/architecture/AUTHENTICATION-PLAN.md)
- [RLS-SECURITY-BLUEPRINT.md](docs/architecture/RLS-SECURITY-BLUEPRINT.md)
- [STORAGE-SECURITY-PLAN.md](docs/architecture/STORAGE-SECURITY-PLAN.md)
- [FINANCIAL-DATA-DESIGN.md](docs/architecture/FINANCIAL-DATA-DESIGN.md)
- [MOCK-TO-DATABASE-MAPPING.md](docs/architecture/MOCK-TO-DATABASE-MAPPING.md)
- [IMPLEMENTATION-ROADMAP.md](docs/architecture/IMPLEMENTATION-ROADMAP.md)
- [ARCHITECTURE-DECISIONS.md](docs/architecture/ARCHITECTURE-DECISIONS.md)
- [RISK-REGISTER.md](docs/architecture/RISK-REGISTER.md)
- `STEP-7-REPORT.md` (this report)

## 17. Verification results

**Executed in Step 7:**

- Read-only inventory/source/configuration searches; reviewed README and previous six reports.
- Read installed Next Proxy/data-security documentation and official public Supabase/Vercel/government references. No logged-in vendor dashboard/project API accessed. Some direct legal PDF fetches timed out; accessible government guidance was used and exact legal applicability remains for counsel.
- Five existing in-memory assertion scripts: `node verification/verify-admin-data.mjs`, `verify-teacher-data.mjs`, `verify-student-data.mjs`, `verify-parent-data.mjs`, `verify-accountant-data.mjs`: **all PASS, exit 0**. They transpile/read fixtures in memory and do not write application artifacts.
- Schema name/reference checks: **103 unique table names**, no duplicate inventory names; all declared FK table targets resolve to an inventory table or external `auth.users`.
- ERD name checks: **74 known entities**, no undefined endpoints, five Mermaid domain blocks. Relationship cardinalities were reviewed against nullable/unique links and noted transactional invariants.
- Local Markdown link targets checked for the new documents; no broken local targets found.
- Manual cross-document review for exactly five roles, parent/teacher relationships, history, unpublished marks denial, money/cash/credit/refund scopes, private Storage and dependency-aware roadmap.
- Before/after SHA-256 comparison of **234 pre-existing workspace files** outside generated/dependency/Git trees: **zero changes or deletions**. Final new-file inventory is the 13 documents above. Baseline includes `src`, package files, earlier reports, README, existing verification artifacts and existing `tsconfig.tsbuildinfo`; hashes held in memory, not copied into an extra unauthorized output file.

**Not executed:** lint/typecheck/build/dev server/browser/HTTP reruns, dependency installation/audit, SQL/schema/RLS tests, Supabase Auth/Storage/project operations, migration deployment, database performance plans or production requests. Build/dev/typecheck scripts can generate files; they were intentionally not run in this documentation-only step. No generated local application artifacts were created. Historical Step 6 build/browser results were reviewed, not rerun or relabeled as current Step 7 execution.

Mermaid blocks were checked structurally/semantically, not rendered by a Mermaid engine. Textual FK/table-name validation is not equivalent to executable constraint/migration validation. RLS, concurrency, backup, legal and architecture proposals still require the future tests/approvals specified in the documents.

## 18. Confirmation that existing application source is unchanged

**Confirmed by the preservation comparison:** no existing source, package/lockfile, configuration, `.env.example`, earlier report, README, verification script/artifact, or pre-existing build-info file changed. Existing dashboards, shared navigation, drawer, collapse behavior and presentation were not edited. README's historical “Step 7 has not started” line was deliberately preserved; this new report records the current documentation outcome without rewriting previous history.

## 19. Confirmation that no database operations were performed

No Supabase project was created or connected; no database/schema/table/query/migration/SQL, Auth user/invitation/session, Storage bucket/object, credential, `.env` file, record mutation, production service configuration or deployment operation was performed. Public documentation browsing is the only external research access. No Git initialization, commit, push, merge or rebase was performed.

## 20. Confirmation that Step 8 has not started

**Step 8 has not started.** This delivery is solely the requested read-only audit and planning documentation. Future architecture decisions, service setup, migrations, authentication, RLS, workflows and deployment all remain unimplemented.
