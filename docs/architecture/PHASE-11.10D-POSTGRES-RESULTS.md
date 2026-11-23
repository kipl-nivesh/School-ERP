# Phase 11.10D local PostgreSQL execution

The confirmed worktree is `D:\O\Office Projects\School ERP\.next-isolated\phase11-live-erp-recovery`, branch `codex/phase-11-live-erp-recovery`, base `a6872451856d390c80d2fd7324fd297cda201f3e`.

## Verified database identity

- PostgreSQL 18.4 from `C:\Program Files\PostgreSQL\18\bin`.
- Host `127.0.0.1`, port `54331`, database and operator `postgres`.
- New data directory `verification/step-24a/pg-phase11-10-fresh18/data`.
- System identifier `7709370675432484392`.
- Final offline control state `shut down`. The final shutdown command exited zero, postmaster.pid is absent, and elevated OS inspection found no listener on 54331.
- One new cluster was initialized. Subsequent attempts used this same newly created cluster. All pre-existing clusters, including the interrupted PostgreSQL 18 cluster, were left untouched.

## SQL evidence

The exact 26-file historical manifest and each source digest were checked against the recovery base. All 26 migrations executed once, individually committed, in manifest order. They were never replayed during correction attempts. Full migration logs and the SHA-256 manifest are in:

`verification/step-24a/pg-phase11-10-fresh18/logs-resume-cdce7336b899445ba2901c029ee46604`

The corrected Phase 11.9 draft committed successfully. The final SQL/RLS suite passed 20 numbered groups, including separate recovery and expiry assertions in group 10. Fixtures and all test changes ended in ROLLBACK. The new cluster retains the synthetic Auth schema, historical schema and corrected draft, without the rolled-back test records.

Final successful SQL, identity, input-hash and shutdown logs:

`verification/step-24a/pg-phase11-10-fresh18/logs-resume-81db1b04e416455db3fcc74c565f4744`

The executed SQL digests match the final draft and test inputs. Earlier failed logs remain available. `reviewed-input-hashes.json` records the reviewed launcher, test and draft hashes.

## Actual PostgreSQL results

- Admin AAL1 denied. Admin AAL2 without a verified TOTP factor denied. Admin AAL2 without TOTP AMR denied. Admin with the required synthetic claims and verified factor authorized.
- Student reads restricted to own Student, enrollment, attendance, published marks and finance records. Draft marks remain invisible. Both foreign-school and same-school foreign-Student reads denied.
- Credential version change invalidates the Student context. The actual Admin PIN rotation command increments the version, rejects a stale expected version, and invalidates the old Student context.
- Parent academic-only access reads attendance and published marks and denies fees. Fee-only access reads invoices and denies attendance. Missing fee permission and revoked relationship deny access.
- Parent calls to collection, admissions, attendance, PIN rotation and PIN revocation reject with SQLSTATE 42501. Student collection, admissions and attendance calls also reject with SQLSTATE 42501. Unexpected errors are failures, never successful denial assertions.
- Teacher and Accountant AAL1 school/role context controls pass. Absent reports.read is denied.
- Expired Student JWT, recovery-only Student token, deleted Parent Auth session, expired Staff JWT, Staff recovery marker, expired Staff context and revoked Teacher membership are denied.

These are genuine PostgreSQL policy and SQL-function results using synthetic Auth tables and injected claims. They do not prove JWT signature validation, Keycloak PIN authentication, OTP delivery or native Supabase session issuance.

## Failures and corrections

1. PowerShell native output capture held the startup pipeline open after pg_ctl reported success. The first launcher interruption also terminated this run's new server before a clean stop. Only this new cluster underwent automatic crash recovery on resumption. A second controlled stop confirmed the inherited-output-pipe cause. The corrected launcher uses hidden Start-Process with separate stdout/stderr files and waits for the exact native process. Subsequent attempts shut down cleanly.
2. The SQL fixture contained non-hexadecimal UUIDs, audit.view instead of audit.read, hard-coded authorization versions invalidated by membership INSERT triggers, a missing students.read grant for its Admin read assertion, and no entitlement for the migration 15 restrictive subscription gates. The test fixture now uses valid synthetic identifiers, actual profile versions and a synthetic legacy trial. No historical policy or constraint was weakened.
3. The new enrollment policy introduced a students/enrollments policy-planning cycle through the existing Teacher Student policy. A restricted postgres-owned SECURITY DEFINER boolean helper with empty search_path now preserves the original Teacher assignment and permission predicate without recursive policy expansion.
4. Parent published-result reads lacked enrollment visibility and a permissive marks_entries rule. The draft adds exact-school academic-purpose enrollment visibility and a published-only marks entry rule guarded by parent_student_purpose.
5. Actual SQL exposed expired Staff JWT context acceptance. The draft's common current_school_id predicate now rejects expired and recovery-marked claims, retaining the existing role, membership, context, native Staff and Admin TOTP checks.
6. One intermediate draft edit had a malformed dollar delimiter. PostgreSQL rejected and rolled back it. Its log is preserved; the corrected draft executed successfully.

Only the offline draft and local verification scripts were changed. The draft's local policy replacements permit safe retry after committed draft execution. Failed test transactions were discarded by connection termination and the successful test transaction explicitly rolled back. A resume mode verifies each historical migration's single successful log and refuses blind replay. A tests-only resume additionally requires a successful draft log matching the current source digest.

## Offline verification and remaining blockers

196 offline Node tests passed. Standalone TypeScript, zero-warning source ESLint, PowerShell parsing and the guarded Windows production build passed. Full offline regression output is retained in the new cluster's evidence directory.

The original main still has seven modified tracked files and 364 untracked files. Executable migrations, production demo configuration, application operational write gates and hosted services were unchanged. No installation, environment, Git publication or deployment changes occurred.

GO for review of the corrected local draft and its separately authorized next compatibility step. NO-GO for live portal activation or a hosted database correction. Native Supabase session/JWT and trusted PIN-to-session evidence remain unverified. The draft's use of role_contexts.context_version as credential evidence needs an independently reviewed native-session binding contract. It cannot establish that PIN authentication took place. Parent native identity/recovery and hosted Auth schema, issuer, ACL, RLS and migration-27 compatibility remain separate checks. First-time Admin MFA enrollment remains subject to the previously identified approval-RPC blocker.

The cluster and all logs are preserved. No automatic cleanup or additional cluster creation is authorized by this report.
