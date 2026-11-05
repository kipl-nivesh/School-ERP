# Architecture risk register — proposed mitigations

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

## Step 8 authoritative update

The authentication threat model is the authoritative additional Step 8 security risk inventory. Open critical blockers include custom PIN/session integration, unapproved OIDC subjects, runtime verifier provenance, bootstrap races, last-admin concurrency, guardian ambiguity/revocation and mandatory MFA/API/RLS enforcement. Public mock routes cannot serve protected records. Earlier student-email and ordinary-Admin provisioning assumptions are superseded.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

Assessment date: 5 November 2026. Likelihood reflects a future rushed backend integration, not proof of exploitation in the existing fictional preview. Severity: Critical / High / Medium. Owner roles below are operational responsibilities within the five-role architecture, not extra dashboards. None of the proposed controls has been proven in a deployed environment.

| ID / risk | Severity / likelihood | Proposed mitigation | Verification / acceptance | Owner |
| --- | --- | --- | --- | --- |
| R01 Authentication bypass from public previews | Critical / High | Protected entries + live identity/status + authorization DAL + RLS; no real records until complete | Anonymous/direct API/forged-cookie requests denied; private response cache-isolation tests | Engineering/security |
| R02 RLS permissive OR, recursion or definer bypass | Critical / Medium | Default-deny grants; narrowly owned helpers, fixed search_path, invoker-safe views, operation checks | Direct JWT tests per role including anonymous; policy composition/recursive chain/owner review | DB/security reviewer |
| R03 Parent sees unrelated/restricted child | Critical / High | Approved dated purpose-specific guardian links, no self-link, child DTO only after authorization | Swap UUID/search/file/thread/export ID across two families; revoke guardian and retry | School records + security |
| R04 Teacher accesses unassigned class/subject/year | High / High | Effective subject and homeroom assignments, same-year integrity, independent history grant | Different teacher/subject/year tests; ended staff/assignment denied | Academic lead |
| R05 Unpublished marks/report card disclosure | High / High | No family SELECT on working marks; immutable released snapshots, withdrawn/current revision checks | Draft/unapproved/withdrawn/superseded API/file denial; own released positive case | Exam controller |
| R06 Financial reconciliation errors / mixed scopes | Critical / High | Exact paise, separate cohort/as-of and cash dates, credits/refunds/unapplied model | Property tests and independently expected cross-month examples; class/category/aging totals | Finance lead |
| R07 Duplicate settlement/refund/receipt race | Critical / Medium | Idempotency key+payload hash, unique external reference, deterministic locks/counter, bounded retry | Concurrent duplicate last-balance collections, replay, double refund and receipt numbering tests | Finance engineering |
| R08 Promotion or transfer corrupts prior years | High / Medium | Interval enrollments, new placement rows, composite year/student keys, transition evidence | Promote/repeat/transfer twice; old attendance/results/invoices retain original enrollment | Academic records |
| R09 Documents exposed through public bucket/path/URL | Critical / Medium | Private manifest/typed link, scan state, short TTL/proxy, no path-only ACL | Cross-family listing/download/upload and expired/revoked capability tests | Storage/security |
| R10 Migration deletes data or exposes tables before policies | Critical / Medium | Additive migrations, RLS/grants before exposure, staging fixtures and approval | Clean reset/upgrade tests, schema diff review, no permissive transitional state | DB owner |
| R11 Database or object loss / untested backup | Critical / Medium | Separate DB+bytes backup, encrypted recovery, agreed RPO/RTO and restore drill | Restore to isolated environment and reconcile files, released records, finance and revoked access | Operations |
| R12 Deployment variables/preview hit production | Critical / Medium | Dedicated projects, environment-scoped secrets, production seed guard, explicit approval | Preview cannot reach production; inspect bundle/env exposure; first deployment behavior review | Deployment owner |
| R13 Multi-role spoofing/stale-tab privilege union | Critical / Medium | Protected role_context per session, membership intersection, versioned writes, no metadata role trust | Tamper cookie/header/metadata, switch tabs/roles mid-write, revoked membership old JWT denial | Auth/security |
| R14 Sensitive columns leaked despite row RLS | High / Medium | Minimal DTOs, column grants and approved projections, Accountant fee IDs only | Response payload inspection for health/address/emergency/HR/draft marks | Domain owners |
| R15 Invitations/reset/linking hijack | High / Medium | Verified identity, one-use expiry/digest, redirect allowlist, staff guardian verification, MFA | Invite replay, altered subject/role, shared email, recovery enumeration/open redirect | School account admin |
| R16 Provider logout/ban leaves valid JWT or signed URL | High / Medium | App context revocation, live status, short token/capability window, out-of-band revocation runbook | Old token after app logout/suspension denied; measure remaining external revoke/URL window | Auth/operations |
| R17 Exports leak rows, formulas or long-lived files | High / Medium | Dedicated export grants, bounded query, scope recheck at job/download, sanitization, expiry | Permission revoked while queued; malicious CSV cell; unrelated requester/file | Security + report owner |
| R18 Upload malware/content spoofing | High / High | Quarantine, magic-byte/type/size checks, scanning, no executable/SVG/HTML by default | Spoofed MIME/oversize/polyglot/malicious document fixtures remain unreadable | Storage/security |
| R19 Cache/realtime leaks another role/user | Critical / Medium | Uncached private data initially, scoped keys later; no broad subscription payloads | Two-session cache swap, role change, guardian revoke; websocket payload inspection if introduced | Frontend/server lead |
| R20 Privacy/children's data or retention noncompliance | High / Medium | Purpose minimization, documented consent/exemption decision, legal review, no default tracking, retention/holds | Counsel approval, data inventory, access/correction/withdrawal/deletion drill and incident plan | School privacy owner |
| R21 Audit tampering or sensitive logs | High / Medium | Append-only domain/financial audit, redacted payloads, restricted exports, separate recovery copies | Ordinary role cannot alter/delete; token/PII log inspection; posting without audit rollback | Security/finance |
| R22 Partial external job failure mistaken for success | High / Medium | Transactional outbox, pending states, idempotent worker, lease/retry/dead letter, reconciliation | Auth invite/PDF/storage fail after commit; no duplicate money/invites and no fabricated ready state | Operations/domain lead |
| R23 Single privileged approver cannot maintain separation | High / Medium | Second authorized reviewer/recovery plan, approval limits, explicit emergency process | Requester=approver rejected; recovery ceremony exercised; owner accepts staffing dependency | School management |
| R24 Access/performance degradation at year-end | Medium / Medium | Indexed relationship/date queries, keyset pagination, bounded reports, representative synthetic plans | Staging plans/latency and concurrency test within approved single-school workload | Engineering |

## Approval-gated decisions

Before implementation owner must resolve: student identity/recovery without personal email; guardian/custody verification and historical access; attendance statuses/denominator; mark weights/absence/exempt handling; receipt numbering/refunds/credits/closed periods; one-student vs sibling/bulk settlement; real import/opening balances; staff approval separation; storage/scanning region and retention; current DPDP commencement/applicability; RPO/RTO/budget; first-release optional modules. See report section 15 for the consolidated owner checklist.

No critical risk is “closed” merely because documentation exists or the mock data checks pass. Closure requires the future verification method, evidence and accountable owner. Step 7 creates the reviewable plan and preserves the current application.
