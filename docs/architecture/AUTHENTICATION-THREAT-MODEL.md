# Authentication threat model — Step 8

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

Scope: proposed future authentication plus the local pure policy contracts. Current routes are public fictional previews; no provider verification, credential handling or RLS exists. Releasing protected school records before those boundaries are implemented is a critical release blocker. The tests below are required future integration tests unless explicitly described as local policy tests.

| Attack scenario | Severity | Mitigation | Verification test | Residual risk |
| --- | --- | --- | --- | --- |
| Ordinary Admin provisions users or elevates itself | Critical | Super Admin-only IAM commands; no self-target; live tier | Local ceiling/self-target tests; future direct API/RLS attempts | Misconfigured DB command |
| Forged Super Admin metadata or client role | Critical | Server-verified session plus protected live tier/membership; opaque type is not runtime proof | Local untrusted denial; future forged JWT/metadata tests | Broken verifier adapter |
| PIN stuffing or short-PIN guessing | High | Random long PINs, atomic identity/IP/global throttles, reviewed hashing | Future distributed/concurrent rate tests | Low entropy and lockout abuse |
| Registration/guardian enumeration | High | Always require guardian reference; generic errors and bounded dummy verification | Future response/timing comparisons | Statistical timing differences |
| Student PIN accepted for Parent | Critical | Separate role/method-bound credentials and provider resolution | Local incompatible binding tests; future real verifier tests | Provider mapping defect |
| Multiple guardians resolved by trying hashes | Critical | Exact guardian reference resolution; never candidate search | Future two-guardian ambiguity tests | Leaked reference still needs secret |
| Parent reads unlinked/revoked child | Critical | Live dated guardian scope per request and session invalidation | Local relationship tests; future direct ID/RLS and revocation tests | Court-order data entry delay |
| Guardian duplicated per child | High | Unique canonical guardian identity, many links and aliases | Future two-child identity/alias tests | Incorrect record merging |
| Account takeover by insecure reset | Critical | Super Admin verified recovery, MFA, scoped approval, one-use reset | Future reset replay and wrong-target tests | Social engineering |
| Stale session survives suspension/grant removal | Critical | Live status and versions, revoked contexts plus provider revocation | Local stale/disabled tests; future old-token Data API test | Cache/invalidation lag |
| Role switch unions permissions or stale tabs write | High | One server-bound active role; expected context version | Local no-union/version tests; future tab race tests | Missed command check |
| Super Admin MFA bypass | Critical | Genuine aal2 enforced server/API/RLS, recent step-up | Local MFA tests; future direct aal1 requests | Factor/recovery compromise |
| Last Super Admin removed concurrently | Critical | Locked count, independent approval and recovery custodian | Local count tests; future concurrent transaction drill | Operational custodian loss |
| Bootstrap replay/default credential/backdoor | Critical | One sealed bounded dual-control ceremony; no web flag | Future replay/race/interruption drill | Operator compromise |
| PIN hashes/secrets leak via logs/client/storage | Critical | Provider-owned verifier store; sanitized logs; no secret fixtures | Future log/telemetry/bundle/storage inspection | Provider breach |
| Custom PIN success mistaken for Supabase session | Critical | Block release until supported OIDC/provider identity/session proof | No runtime factory locally; future callback/refresh/revoke integration | Provider support uncertainty |
| Auto-created OAuth subject gets application privileges | Critical | Preapproved subject binding; no automatic roles/email linking | Future unknown-subject/duplicate-link tests | Provider lifecycle mismatch |
| Super Admin rewrites finance or audit | Critical | Immutable events, transactional financial invariants; no service bypass | Local immutable-record tests; future DB mutation tests | Privileged infrastructure operator |
| Session/callback theft, CSRF or open redirect | High | Supported secure cookie/PKCE flow, same-origin commands, redirect allowlist | Future callback/CSRF/replay tests | Browser/device compromise |

## Decisions and ownership before integration

School/security owners must approve PIN policy and delivery, guardian reference usability, recovery identity evidence, independent approver authority and emergency procedure. Engineering must prove the [PIN session bridge](STUDENT-PARENT-PIN-AUTH-DESIGN.md), server verifier, live session/context revocation, transactional approval/count checks and RLS/storage denial. No current policy unit test proves provenance: synthetic trusted contexts model an already verified boundary only.

Local implemented defenses are deterministic fail-closed decisions over supplied evidence, five-role constraints, distinct credential metadata, MFA/reauthentication checks, no permission union and immutable-record restrictions. They are not deployed controls. All risks involving actual credentials, sessions, network limits, concurrency or data access remain open until integration evidence exists.
