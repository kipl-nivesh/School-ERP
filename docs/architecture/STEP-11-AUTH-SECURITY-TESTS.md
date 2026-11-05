# Step 11 — Authentication security test plan

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

Date **2026-11-05**. Current two-field Parent multi-guardian first login is **BLOCKED**. These tests define rejection evidence and future requirements; no provider, credential, token, SQL or live policy was created. No new optional test file was added. Existing tests model supplied trusted evidence only.

Classes: **L — Locally testable**, **P — Requires isolated provider proof**, **R — Requires database/RLS integration**, **O — Requires school approval**. Multiple classes need evidence at every listed boundary. P/R/O cases are **NOT RUN / NOT APPROVED**. “Local PASS” is restricted to an existing assertion and never means successful authentication.

| ID | Scenario | Expected result / required evidence | Class | Actual Step 11 status |
| --- | --- | --- | --- | --- |
| S01 | Correct Student registration/own PIN | Unique approved Student, exact verifier, genuine supported Auth session, active role and own-row scope | P, R, O | NOT RUN; six-digit risk not approved |
| S02 | Correct Parent credential in singleton scope | Exact single candidate then own verifier and genuine session/live link; cannot generalize to multi-guardian case | P, R | NOT RUN |
| S03 | Correct Parent credential in multi-guardian scope | Fail closed before candidate-wide comparison unless a separately reviewed permitted resolver exists; no success proof claimed | P, O | BLOCKED / NOT RUN |
| S04 | Wrong PIN / unknown registration | Generic errors without enrollment/guardian hints; bounded work, budgets consumed, no session | P | NOT RUN |
| S05 | Student PIN or credential metadata in Parent method | Role/profile/method metadata mismatch denies; live verifier must not accept Student credential as guardian | L, P | Local binding assertions PASS within existing 44 groups; live NOT RUN |
| S06 | Parent PIN/metadata in Student method | Independent exact Student verifier only; identical numeric value would not transfer identity | L, P | Local binding assertions PASS; live NOT RUN |
| S07 | Two guardians, distinct PINs | Current design denies unresolved scope; do not scan hashes or build forbidden directory; future protocol needs independent evidence | P, O | BLOCKED / NOT RUN |
| S08 | Two guardians, identical PINs | No arbitrary/shared subject; deny. Identical observable request cannot distinguish the people | L, P | Logical indistinguishability analysis only; no new credential fixture or live test |
| S09 | Concurrent PIN assignment / guardian linking | No silent collision or unintended subject; Model A requires permitted equality mechanism plus atomic cross-scope invariant | P, R, O | BLOCKED / NOT RUN; no acceptable uniqueness protocol established |
| S10 | PIN reset collision across siblings/guardians | New credential cannot cause another subject to be selected; exact target recovery, old-authority invalidation | P, R, O | BLOCKED / NOT RUN |
| S11 | Guardian account suspension | Live disabled state/version denies old/new authority; filtering candidates cannot reinterpret old credential as another person | L, P, R | Local inactive-account assertion PASS; live NOT RUN |
| S12 | Guardian-child relationship revoked | Reject old alias/query/file, invalidate context/version, preserve unrelated links only through verified identity | L, P, R | Local relationship assertions PASS; live NOT RUN |
| S13 | Unauthorized child selection/direct API query | Real user JWT cannot read another child even if UI/registration ID is edited | L, R | Local wrong-relationship assertion PASS; direct RLS NOT RUN |
| S14 | Stale membership/role-context/session version | Deny stale evidence and real old tokens/requests; no inactive-role union | L, P, R | Local stale-context assertions PASS; actual tokens NOT RUN |
| S15 | Forged JWT/wrong key/algorithm/issuer/audience | Actual verifier rejects before trusted context/RLS; marker/cast/cookie decode never suffices | L, P, R | Local untrusted-input assertion PASS; JWT verification NOT RUN |
| S16 | Session substitution/fixation | No attacker-selected context/guardian binding; actual provider request/code/session bound to intended subject | L, P | Local wrong-user/session evidence PASS; fixation/substitution NOT RUN |
| S17 | Enumeration through counts, timing, errors, lockouts | Known, unknown and multi-candidate outcomes do not reveal guardian list/candidate count; measured timing and rate-response tolerances | P, O | NOT RUN |
| S18 | Distributed brute force/child-alias cycling | Atomic registration/IP/global budgets before identity, canonical budget after proven resolution; aliases cannot multiply attempts | P, O | NOT RUN; thresholds and family-lockout trade-off pending |
| S19 | Rate-limit concurrency/restart/outage | Reserve atomically, persist across nodes, fail closed on unknown state; no read-then-write races | P | NOT RUN |
| S20 | Recovery abuse/support impersonation/shared phone | Verified exact canonical target with approved evidence and Super Admin MFA; no hidden phone/email selector or shared reset | P, R, O | NOT RUN |
| S21 | Shared family device/guardian switching | No cookie/localStorage inference of intended new guardian; verified current session continues only own live scope; ambiguous new login denies | P, O | NOT RUN |
| S22 | First login/cleared cookies/device loss/session expiry | No prior subject assumed; ambiguous request denies rather than silently requiring an unapproved extra step | P, O | BLOCKED / NOT RUN |
| S23 | OIDC issuer/subject mismatch or repeated callback | Reject wrong/replayed binding; exact approved issuer/sub uniquely binds actual Auth UUID/profile; no fabricated session | P | NOT RUN |
| S24 | Supabase automatic/manual linking | No guardian/Student/staff merge by email/contact; unknown subject creates no unauthorized identity/role | P, R | NOT RUN |
| S25 | RLS bypass/privileged infrastructure credential | Ordinary-user direct API negative tests; no service-role success counts as proof; scope check on every path | R | NOT RUN |
| S26 | Private Storage/path substitution/revoked link | Private manifest and live permission checks; no unauthorized new signed URL/download; existing URL lifetime bounded | R, O | NOT RUN |
| S27 | One guardian across children / shared phone among guardians | Canonical identity not duplicated per child; each guardian independent; no cross-child budget bypass or contact merge | L, P, R | Local two-child policy assertions PASS; resolution/budget integration NOT RUN |
| S28 | Withdrawal/historical data | Default alias eligibility ends; archived records do not imply continued login; dated alternative access requires approval | P, R, O | NOT RUN |
| S29 | Logout/reset/suspension then old access/refresh use | App live denial plus supported provider lifecycle and lost-event reconciliation; routine refresh cannot restore revoked authority | P, R, O | NOT RUN |
| S30 | MFA bypass / ordinary Admin provisioning / sixth role | Only five primary roles, Super Admin tier with real mandatory MFA; other roles cannot provision/grant/elevate | L, P, R | Local role/ceiling/MFA assertions PASS; native enforcement NOT RUN |
| S31 | Super Admin self-target/reviewer/last-admin races | Local structural denial plus future independently authorized review and locked count; no audit/finance bypass | L, R, O | Local structural/integrity assertions PASS; concurrency/reviewer authority NOT RUN |
| S32 | PIN expiry/forced initial reset/rotation | Provider-enforced scoped recovery, version recheck, no normal records before approved change; collision lifecycle unresolved for Model A | L, P, R, O | Local reset-required assertion PASS; credential lifecycle NOT RUN |
| S33 | Forbidden third field/guardian picker/invisible selector | Exactly the two approved fields remain proposed; no alternate credential/account-choice step introduced without approval | L, O | Documentation consistency checked; no login UI exists to test |
| S34 | Secret leakage/credential directory | No plaintext/reversible PIN, unsalted secret index, candidate-wide verification or export of secrets/hashes/tokens to normal logs/repository | P, O | Documentation/changed-file inspection only; provider audit NOT RUN |
| S35 | Approved stronger alternative or single-login policy | Explicit changed requirements, enrollment/recovery/access consequences and independent review precede any new success claim | O, P, R | NOT APPROVED / NOT RUN |

## Evidence quality and future stop conditions

Before any newly authorized proof, identify a credible resolution protocol or explicitly changed requirements. Current Model A/C gaps cannot be fixed by simply attempting a happy-path login. Every future test needs reviewed versions/configuration, bounded synthetic fixtures, expected/actual result, role/subject/context binding without exported tokens, measurement scope, named reviewer and limitations. Record failed/blocked/not-run cases honestly. Never generate PINs or sessions in this repository to demonstrate documentation feasibility.

For identical-input S08, the reasoning is a logical consequence, not an implemented cryptographic test. For S09/S10, a uniqueness assertion over salted hash bytes is not credential equality. For S17, equal wording alone is insufficient; compare realistic latency/error distributions including ambiguous/unknown requests. For S18/S19, pre-resolution protection cannot depend on a guardian identity not yet established; scope-wide controls have family denial-of-service effects that require approval.

For R cases, use actual ordinary-user identities under live RLS/Storage and version/relationship changes in a future authorized environment. A provider-signed wrong subject still fails the school requirement. Actual verifier, rate limiter, SQL helpers, refresh, timing, concurrency and backup behavior have not been tested. Any cross-guardian access, arbitrary subject choice, unsupported exchange or secret leakage stops a future proof immediately.

## Executed local verification

Existing `verification/verify-auth-contracts.mjs`: **44 deterministic groups passed**, exit 0. Existing five Admin/Teacher/Student/Parent/Accountant mock-data scripts: **all passed**, exit 0. These retain policy/fixture consistency only. No optional PIN-format, resolution or authentication-state code/test was added; such a test would not resolve the blocked architecture. Documentation link/consistency and SHA-256 source preservation checks are recorded in [Step 11 report](../../STEP-11-REPORT.md). No live proof outcome is reported as passed.
