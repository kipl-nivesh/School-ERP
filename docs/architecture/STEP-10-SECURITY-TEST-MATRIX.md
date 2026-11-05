# Step 10 — Security test matrix

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

## Retained earlier architecture — superseded where stated above

Date: **2026-11-05**. No external proof was executed. Every future result below is **NOT RUN** unless explicitly limited to a named local policy assertion. No credential value/hash/token is included. [Proof plan](STEP-10-AUTH-PROOF-PLAN.md) defines participants, isolation and stop conditions.

Classification labels:

- **L — Locally testable now:** deterministic metadata/policy assumptions, not credential/session verification.
- **P — Requires isolated provider proof:** actual credential, OAuth/session, limiter, cookie or provider behavior.
- **R — Requires live RLS integration:** actual ordinary-user database/Storage policies and transactional state.
- **O — Requires school approval:** policy, UX, thresholds, custody, test scope or risk acceptance. “O” never indicates approval has been obtained.

Multiple labels mean all named boundaries need evidence. The existing synthetic `VerifiedServerContext` fixtures assume an already verified boundary; they do not mint sessions or prove provenance.

| ID | Scenario and setup (logical labels only) | Expected evidence / pass condition | Class | Actual Step 10 status |
| --- | --- | --- | --- | --- |
| T01 | Correct Student credential, approved S-A | Trusted verifier checks one exact Student credential; supported callback yields real Auth UUID/session; only Student own published records | P, R | NOT RUN |
| T02 | Correct Parent credential, G-A through S-A | Exact guardian subject, own credential and current link; real session; only authorized children/purpose projections | P, R, O | NOT RUN |
| T03 | Wrong PIN for valid identity | Generic failure, durable failure count, no normal session/profile/context; distinguish provider behavior from app permission tests | P | NOT RUN |
| T04 | Invalid registration/reference or unknown identity | No guardian hints/list; consistent response envelope, preapproved statistical timing tolerance, bounded dummy work and no account creation | P, O | NOT RUN |
| T05 | Student credential metadata used as Parent or wrong profile | Metadata helper denies role/method/profile mismatch; real verifier cannot accept one credential in other method | L, P | Local metadata assertions PASS within existing 44 groups; real credential test NOT RUN |
| T06 | Two guardians share one child | Different references resolve distinct subjects/credential IDs; never scan candidate hashes, merge by contact or share reset | P, R, O | NOT RUN |
| T07 | G-A uses either of two linked-child aliases | Same canonical subject, credential reference and limiter budget; dashboard returns both currently permitted links only | P, R | NOT RUN; local two-child policy assertions alone PASS |
| T08 | G-A/G-B share phone/email contact fixture | No automatic merge or contact-only reset; aliases/references remain separate | P, O | NOT RUN |
| T09 | Disabled/suspended account, including Super Admin | Local policy denies supplied inactive status; actual IdP/app/RLS deny after authoritative change, including old tokens | L, P, R | Local inactive-account assertions PASS; live denial NOT RUN |
| T10 | Expired initial activation credential or stale credential version | Provider rejects expired/replayed activation; old credential does not establish authority; credential-version invalidation measured | P | NOT RUN; policy does not verify credential expiry |
| T11 | Forced initial reset | Policy denies reset-required context; provider grants only scoped change workflow, no dashboard/API/Storage access until complete | L, P, R, O | Local reset-required assertions PASS; activation flow NOT RUN |
| T12 | Repeated attempts via same identity | Approved canonical budget enforced before costly work, generic denial and measured cooldown; routine refresh/new browser cannot reset budget | P, O | NOT RUN |
| T13 | Distributed guessing across IPs/nodes/child aliases | Identity/global campaign limits hold across aliases/nodes; trusted IP policy withstands spoofing and school NAT conditions | P, O | NOT RUN |
| T14 | Concurrent invalid attempts at budget boundary | Atomic reservations admit no more verification attempts than remaining approved budget; increments persist, no lost updates/negative counters | P | NOT RUN |
| T15 | Limiter restart/outage/partition | Restart preserves budget; unavailable/uncertain state denies new attempts and alerts without resetting limits | P, O | NOT RUN |
| T16 | Lockout abuse against victim/shared NAT | Chosen backoff/recovery remains usable under approved abuse load; no unlimited guessing via supervised recovery | P, O | NOT RUN |
| T17 | Session fixation and preexisting browser state | New login cannot bind to attacker-supplied subject/context; expected session rotation, state/nonce and safe cookie behavior verified | P | NOT RUN |
| T18 | JWT substitution: wrong issuer/audience/key/algorithm/subject or forged token | Actual verifier/gateway rejects; no trusted context or row/file access; direct cookie decoding never authorizes | P, R | NOT RUN; local untrusted-input denial PASS does not test JWTs |
| T19 | Expired/revoked session evidence and future timestamps | Policy denies invalid supplied evidence; actual token/session boundary independently rejects invalid credentials/session | L, P, R | Local evidence assertions PASS; actual token tests NOT RUN |
| T20 | Callback/code replay, wrong redirect, missing state/nonce/PKCE | Supported flow rejects replay/mismatch; no open redirect or duplicate identity creation | P | NOT RUN |
| T21 | Same-email automatic/manual identity-link attack; staff/family collision | No cross-identity authority/merge or unauthorized Auth/application creation; approved binding uniquely persists under retries | P, R | NOT RUN |
| T22 | Unapproved upstream subject attempts first login | Rejected through documented creation/binding controls; no unauthorized Auth user, school profile or grants | P | NOT RUN |
| T23 | Stale/revoked role, changed grant/version or role switch | Local intersection/version tests deny; live server/RLS rejects stale tabs and no inactive-role union | L, P, R | Local role/version assertions PASS; live integration NOT RUN |
| T24 | Guardian revoked/wrong guardian/purpose | Local exact relationship denial; real query/file/new alias use denied on live link/version check within approved freshness bound | L, P, R | Local relationship assertions PASS; live revocation NOT RUN |
| T25 | Withdrawn Student or ended alias | Default alias denial; no implied historical access without approved dated policy; other independent current child access evaluated | P, R, O | NOT RUN |
| T26 | Unauthorized Student/child ID in direct API | User JWT plus correct context still cannot access unrelated row; no service-role test counted | R | NOT RUN |
| T27 | Ended Teacher assignment / Accountant sensitive Student query | Effective-date Teacher checks and explicit finance projections deny excess data; API and direct RLS paths agree | R | NOT RUN |
| T28 | Super Admin MFA bypass or fake fresh reauth timestamp | Local aal1/stale-reauth evidence denies; actual native MFA and step-up required server/API/RLS; token refresh does not count as fresh factor | L, P, R | Local MFA/reauth assertions PASS; native enforcement NOT RUN |
| T29 | Ordinary Admin or another role provisions/grants/elevates | Local ceilings deny even supplied forged security grants; real provisioning endpoints/DB prevent escalation | L, P, R | Local five-role/IAM assertions PASS; live mutation NOT RUN |
| T30 | Security self-target, invalid reviewer, last-admin concurrent removal | Local structural checks deny invalid evidence; actual authorized reviewer/approval scope and locked count withstand races | L, P, R, O | Local structural approval/count assertions PASS; authority/concurrency NOT RUN |
| T31 | Private Storage object, path substitution or stale link after revocation | Manifest/row relationship checked; no public bucket; direct ordinary-user request denies forbidden object; issued URL lifetime bounded by approved policy | R, O | NOT RUN |
| T32 | Logout then access/refresh reuse, with upstream SSO cookie | App context denied immediately as approved, native scope documented, old refresh fails as applicable; upstream SSO cannot bypass alias/state | P, R, O | NOT RUN |
| T33 | Parent reset, Student reset or suspension; provider event lost | Exact target-only credential reset; old sessions denied by live versions; retries/reconciliation fail closed within approved freshness target | P, R, O | NOT RUN |
| T34 | Recovery abuse through shared phone, stale approval, replay or insider | Identity/custody independently verified; one-use scoped reset, required MFA/reviewer and sanitized audit; no role/link creation | P, R, O | NOT RUN |
| T35 | PIN/hash/token leakage through logs/telemetry/screenshots/client | Evidence collection/redaction proves no captured secrets in repository, reports, normal logs or browser persistent secret storage | P | NOT RUN; Step 10 document inspection contains no secret fixtures |
| T36 | Issued/settled financial facts and audit mutation by privileged user | Local immutable-record rules deny; real DB commands preserve immutable events and integrity under ordinary JWT | L, R | Local policy assertions PASS; DB invariants NOT RUN |
| T37 | Six-digit format, leading zero, non-ASCII digits/whitespace/wrong length | Future validator treats exact six ASCII characters as a string, rejects other input and preserves leading zero; valid format is not credential success | L, P | NOT RUN; no optional format validator/test added |
| T38 | Provider SSO reuse with changed child alias or selected role | Provider/app revalidate exact alias and canonical identity; no cookie-only bypass or permission union | P, R | NOT RUN |
| T39 | Counter race between valid login, reset and failures | No success/reset clears another in-flight campaign budget contrary to policy; no stale credential accepted after version change | P | NOT RUN |
| T40 | Optional additional factor and device-loss recovery | Actual independent factor and supported assurance; no knowledge identifier counted; secure enrollment/recovery and accessible fallback | P, O | NOT RUN; stronger-factor arm not approved |
| T41 | Budget/resource cleanup, replay after proof closure | Inventoried callbacks/keys/sessions/accounts/resources revoked/removed under approved target checks; no surviving access or billing surprise | P, O | NOT RUN |

## Concurrency and statistical evidence requirements

Before running T14, fix an approved attempt budget B and starting consumed count C. A simultaneous batch larger than B−C must not cause more than B−C costly credential comparisons/reserved attempts under the chosen semantics; all workers must use shared transactional state. Verify again after restart, alias change, new IP and cross-node retries. Count reservation/commit/rejection events without secrets. This is not a benchmark of the existing TypeScript policy library.

For T04, predefine the comparison method, realistic known/unknown cases, sample size, network/noise conditions and acceptable distinguishability; report distributions rather than declaring constant time from one request. Limit proof attack volume and costs before running T13/T16. Failure to find a correct PIN by random guessing never proves sufficient strength.

For T09/T23/T24/T32/T33, test both app routes and direct Data API/Storage access with old access and refresh credentials held only in the isolated test runner. Application mutations must respect transaction/version freshness; external provider events need a chosen maximum delay, delivery-failure handling and measured reconciliation. No raw JWT evidence is exported to the repository.

## How results must be recorded later

Each future result needs test ID, approved fixture labels, reviewed versions/configuration, exact sanitized steps, expected/observed result, timestamp, request/correlation IDs, role/assurance/context version, measured timing/counter outcome, reviewer and limitations. Store secret-bearing diagnostics only in the approved isolated boundary, redact before reporting, and follow cleanup retention. Use PASS/FAIL/NOT RUN/BLOCKED honestly. Every critical authority leak fails the proof; no overall pass while a required test remains unexecuted or blocked. A technical proof pass does not equal school acceptance of six-digit production risk.

## Actual local verification in Step 10

`node verification/verify-auth-contracts.mjs`: **44 deterministic groups passed**, exit 0, including the limited L assertions described above. All five unchanged mock-data scripts also passed, exit 0. No new deterministic test or format/identity resolver was added; existing policy coverage is sufficient for a documentation-only change and cannot validate real credentials, persistent counters or actual sessions. All P/R/O outcomes above remain unexecuted or undecided.
