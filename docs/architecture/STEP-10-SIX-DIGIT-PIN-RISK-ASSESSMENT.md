# Step 10 — Six-digit PIN risk assessment

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

Date checked: **2026-11-05**. Current selected **UX preference**: Student Registration Number + six-digit Student PIN; linked-child Registration Number + independent six-digit Parent PIN, with a guardian reference if approved. This supersedes the Step 9 fifteen-digit candidate as the preferred UX, not its value as a stronger comparison. **Security approval is pending.** No PIN, verifier, credential or session is created here.

## Quantified risk and security position

A uniformly random six-digit decimal secret has **1,000,000 possible values**, including leading-zero strings, and about **19.93 bits** of entropy. It is a reusable remote knowledge secret, not a local device-unlock PIN or one-time code. Registration numbers and guardian references are identifiers; neither supplies a second factor. With distinct guesses against one uniformly random fixed PIN and no other information, success probability is attempts / 1,000,000 up to exhaustive search. Five distinct guesses give 0.0005% per targeted account. If 2,000 independent accounts each receive five distinct guesses, the chance of at least one compromise is approximately 1 − (1 − 5/1,000,000)^2,000, or **0.995%**. These are mathematical illustrations, not a predicted school incident rate: reuse, bias, leaks, observation and repeated campaigns can be much worse.

A five-attempt budget renewed every 15 minutes would allow 480 attempts/day against one account unless a separate cumulative/risk control stops it. At one permitted guess/second, the entire space takes about 11.6 days and the mean distinct-guess position about 5.8 days; neither is a provider benchmark. Per-IP limits alone can be multiplied by an attacker using many IPs. A slow salted hash limits offline throughput, but a stolen six-digit verifier still has a small search space. Random issuance improves distribution, not maximum entropy.

NIST's remote-password baseline is 15 characters for single-factor use, or at least eight when part of MFA; a six-digit reusable remote secret does not meet either length baseline. Adding a second factor therefore does **not** make a six-digit remote password NIST-conformant. A locally retained activation PIN belongs to a different authenticator model. This report does not assert NIST applicability, certification or compliance. [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html), checked 2026-11-05.

Recommendation: do not approve six-digit PIN-only production access on the strength of documentation or a successful login demonstration. Prefer a separately approved possession-based design or stronger credential for protected school records. A synthetic, isolated proof can investigate the preferred UX and compensating controls without approving its residual risk. Current Step 10 gate: **CONDITIONAL**, because provider/control choices and guardian UX approval are unresolved.

## Threat assessment

| Threat | Scenario / severity | Proposed controls to investigate | Remaining limitation |
| --- | --- | --- | --- |
| Online guessing | Target one known account; High | Canonical identity/method budgets, cumulative risk controls, bounded attempts, optional possession factor | A small renewed guess budget accumulates; one lucky guess still works |
| Credential stuffing | Reuse observed or leaked family PINs; High | Independent random issuance, reuse checks within reviewed policy, risk alerts and additional factor | Six digits collide naturally; matching values must never imply shared identity |
| Distributed attack | Many IPs target one or many identities; High | Persistent atomic identity/global budgets at actual verifier, anomaly detection | IP-only counters and per-instance memory fail; availability/cost trade-offs remain |
| Enumeration | Different errors/timing expose enrollment or guardians; High | Exact lookup, generic failure paths and bounded dummy work | Timing and rate-limit responses may still leak; require measurement |
| Registration-number disclosure | School document or student exposes identifier; High | Treat registration as public identifier; independent credential and row controls | Keeping identifiers obscure cannot protect a short secret |
| Parent targeting | Child registration used to attack household data; High | Required guardian reference in candidate design and exact dated links | Reference is nonsecret; no entropy or guardianship claim |
| PIN reuse/sharing | Student and guardian share a remembered secret; High | Separate credential IDs/verifiers, independent issuance, education and recovery | Users may still disclose/reuse; credentials are not interchangeable even if values coincide |
| Shared devices | Saved session/autofill exposes another family member; High | Explicit logout, bounded idle/absolute context lifetime, clear private state, no PIN storage | A compromised/unlocked endpoint can defeat login controls |
| Interception/phishing | Shoulder surfing, malicious form or endpoint captures secret; High | TLS, trusted provider origin, no URL/log secrets, CSP and phishing-resistant factor alternative | TLS does not stop phishing, keylogging or observation |
| Recovery abuse | Shared phone or social engineering resets guardian; Critical | Verified canonical person/custody evidence, Super Admin MFA, scoped approval and notices | Staff judgment is attackable; contact possession is insufficient |
| Lockout denial-of-service | Attacker repeatedly exhausts victim budget; High | Progressive bounded cooldown, supervised recovery, account-risk escalation | More permissive recovery can restore guessing; balance needs approval |
| Credential-store theft | Offline brute force after verifier breach; Critical | Salted memory-hard hashing; optional separately stored pepper; protected provider administration | Six-digit space remains exhaustible; provider plus key compromise defeats pepper |
| School staff misuse | Insider reads/reset secrets or changes links; Critical | Only Super Admin IAM, independent review, no secret-read APIs, immutable audit | Infrastructure operators may remain privileged; custody and monitoring matter |
| Stale sessions/access | Reset/suspension/link revocation leaves old tokens usable; Critical | Live school state/version/context checks and supported provider revocation reconciliation | Signature validity is not current authorization; integration must prove freshness |

## Compensating controls and limits

| Control | Candidate proof design | What it cannot establish |
| --- | --- | --- |
| Cryptographic random issuance | Reviewed CSPRNG, unbiased six-character decimal string, leading zero preserved; no sample secret in repository | More than 19.93 bits or resistance to disclosure |
| Hashing | Provider-owned independently salted memory-hard verifier; benchmark against OWASP guidance and load | Safety of low entropy after full verifier/key compromise |
| Pepper/key isolation | Optional provider-supported separately protected key and audited access/rotation | Replacement for entropy, offline resistance if key is also stolen, or easy rotation without reset |
| Identity throttling | Atomic persistent canonical profile/method budget shared across aliases, nodes and sessions | Elimination of lucky or low-and-slow guesses |
| IP and aggregate throttling | Trusted source-IP/network controls plus global budgets and prehash concurrency cap | Identification of one person behind NAT; detection of every distributed attacker |
| Counter durability | Shared authoritative store, reserve attempt before verification, no alias/reset/refresh budget bypass; fail closed on uncertain availability | Security based on per-process counters or race-prone read-then-write |
| Backoff/cumulative risk | Proposed five failures/15-minute window, increasing cooldown up to 30 minutes; additional multi-window campaign control required | A production threshold; periodic window resets alone are inadequate |
| Monitoring | Pseudonymous failure/risk signals and sanitized alerts to named responder | Prevention without staffed response; no PIN/token logging |
| Secure delivery | Approved confidential short-lived one-use activation channel and no dashboard access until activation complete | Recipient identity merely from possession of a shared contact |
| Initial change | Policy-approved provider-controlled one-use activation/change with same method binding; retain random replacement strength | Increased entropy from a user-chosen birthday PIN; routine periodic change is not a cure |
| Recovery | Super Admin verifies canonical person and authority, recent MFA, independent approval for privileged targets, metadata-only audit | Protection against every insider/social-engineering attack |
| Revocation/suspension | Live account, credential and context versions deny first; supported provider calls reconciled | Instant invalidation from JWT signature verification alone |
| Additional factor | Evaluate possession-based challenge or cryptographic authenticator with device-loss recovery | A second factor from registration/reference; automatic NIST conformity for six remote digits |

OWASP recommends generic failures, throttling and risk-based reauthentication, while storage guidance calls for slow salted verification and separate pepper custody if used. These are documented guidance, not evidence that the above school controls exist. [Authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), checked 2026-11-05. No hashing or limiter is implemented.

## Stronger alternatives — comparisons, not substituted requirements

| Alternative | Advantage over six-digit-only remote secret | Trade-off / approval |
| --- | --- | --- |
| Prior fifteen-digit random numeric candidate | About 49.83 bits under uniform randomness; much larger search space | Superseded preferred UX; usability/recovery and numeric-only policy still need review; not automatically full compliance |
| Longer general password/passphrase | Larger available secret space; standard provider verification/recovery | School approval for changed family UX and child accessibility |
| Six remote digits plus genuine possession factor | Adds an independent barrier to a guessed PIN | Enrollment, device access/cost and secure recovery; still below NIST remote-password length baseline |
| Cryptographic authenticator with local activation PIN | Replaces remote reusable PIN with proof of key possession and origin binding when supported | Different protocol/UX; provider/device support and recovery proof needed; do not pretend this is the unchanged remote PIN flow |

No alternative is adopted silently. The preferred UX remains six digits while production security acceptance remains unresolved. See [owner checklist and decision template](STEP-10-OWNER-APPROVAL-CHECKLIST.md).
