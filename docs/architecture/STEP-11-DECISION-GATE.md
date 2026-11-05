# Step 11 — Architecture decision gate

## Step 12 current singleton login scope

Owner-approved initial scope: one Student has at most one active explicitly provisioned login-eligible Parent; one Parent login identity is linked to exactly one Student. Exactly two fields remain for each family role: registration number and its independent six-digit PIN. No Parent Login ID, Guardian Reference/ID, extra username, selection step or third field. Student and Parent have separate internal identities/credentials. Multiple children per Parent and multiple independently login-eligible guardians per Student are **deferred**, while richer non-login guardian relationships remain conceptually supported.

The Step 11 multi-guardian BLOCKED finding is **historical for that earlier scope and remains valid**, not erased or disproven. The new singleton policy removes only that specific selection ambiguity; zero, multiple, inactive, revoked, stale or inconsistent mappings deny. Six-digit production security, provider/Supabase sessions, durable throttling and RLS remain unverified. Only Super Admin provisions/manages grants; five primary roles and immutable audit/finance boundaries remain unchanged.

Current local source updates replace the unused guardianReferenceRequired true flag with false and add pure input/cardinality/evidence-state contracts. The model returns no genuine session and is not wired to routes. Existing public mock dashboards, including the Parent two-child demo, remain unchanged and are not production relationship evidence. Any older instructions to retain the true flag or require a multi-child login mapping below are superseded for this initial phase.

See [singleton identity policy](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [next integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Statuses remain separate: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. Step 13 has not started.

## Retained earlier architecture and findings

Date **2026-11-05**. **C. BLOCKED** for the approved two-field multi-guardian Parent new-login design. This is an architecture outcome, not unfinished documentation: Step 11 analysis is complete. Student credential/session integration remains conditional, and production authentication is not approved. Step 12 has not started.

## Current UX and boundaries

Exactly two fields for Student: Registration Number and six-digit Student PIN. Exactly two for Parent: linked Student Registration Number and six-digit Parent PIN. No Guardian Reference/ID, third input, guardian selection screen, hidden phone/email choice or extra factor is adopted. The prior guardian-reference design is superseded; owner preference for six digits is not production security acceptance.

Exactly five roles remain. Super Admin stays a privileged Admin tier with email/password and mandatory MFA, sole account/grant provisioning authority, immutable audit/finance constraints and no ordinary-request service-role bypass. There is no login UI/provider/database integration to enable public signup; future integration must prohibit it.

## Twelve-criterion assessment

| Criterion | Evidence/status | Gate consequence |
| --- | --- | --- |
| 1 Exact guardian identity | Identical allowed inputs for distinct guardians cannot identify both; distinct-secret permitted resolver unestablished | Blocking |
| 2 Independent credentials | Existing metadata keeps roles/identities separate; independent values may still collide | Necessary but insufficient |
| 3 Multiple guardians | Singleton illustration does not cover required fresh-login cases | Blocking |
| 4 Multiple children | Canonical guardian/link model exists as proposal; shared alias budgets and cross-scope collisions unresolved | Not proven |
| 5 PIN collision resistance | Six-digit domain permits collisions; no approved equality/reservation protocol across links/resets | Blocking |
| 6 Non-enumeration | No candidate list allowed; secret-derived directory/search and observable count behavior unsafe/unproven | Blocking |
| 7 Session integrity | Documented Auth federation primitives exist, but exact upstream subject must first be established | Downstream support does not resolve blocker |
| 8 Recovery | Exact canonical target evidence and reset collision handling unproven; no hidden selector permitted | Blocking |
| 9 Revocation | Live account/context/link/version design retained; actual provider/DB enforcement untested | Future proof required |
| 10 Usability | Two-field structure approved; no additional step may be silently added | Do not substitute a different UX |
| 11 Operational cost | No selected protocol/provider/control architecture to quote; specialized service adds audit, key and support burden | Unknown; no free guarantee |
| 12 Supabase compatibility | Native/custom OIDC/external JWT documented at primitive level, not exact guardian resolution | Unsupported composition not established |

See [mathematical/model analysis](STEP-11-GUARDIAN-IDENTITY-MODELS.md), [feasibility/sequences](STEP-11-TWO-FIELD-LOGIN-FEASIBILITY.md) and [security tests](STEP-11-AUTH-SECURITY-TESTS.md). This is not a universal impossibility claim about future cryptography; it states that no acceptable, supported/reviewed solution has been established under this project's current constraints. Identical-input ambiguity is a stronger separate information limitation.

## Smallest explicit requirement changes that could remove the identity blocker

None is adopted, and none alone approves six-digit production security.

1. **Least added identity information:** explicitly reverse the rejection of a guardian-specific nonsecret identifier. A separate identifier field would add the missing distinction; it is currently prohibited. A two-field variant could instead replace the shared child registration input with a unique guardian username, but that changes the approved linked-child-registration requirement. An encoded identifier secretly packed into registration is not allowed without explicit UX approval.
2. **Keep both visible field names but add independently verified evidence:** approve cryptographic/possession-based authentication and its enrollment, user interaction and recovery. This changes the authentication flow and may include account choice; it must be disclosed and approved, never called unchanged two-field authentication. A passkey/device can identify a subject only through a genuinely verified binding, not localStorage or a remembered contact.
3. **Change account policy:** explicitly allow just one login-eligible guardian per child, while defining other verified guardians' independent access through another approved path. This gives up the current multi-guardian login requirement and has custody/sibling/access consequences. Never solve it by sharing a credential.

If the owner declines every change, keep Parent authentication blocked. A longer PIN alone, unique-value assertion alone, generic OIDC provider or rate limit alone cannot provide the missing supported exact-identity mechanism. No question or approval is necessary to finish Step 11; these are decisions for a subsequent scope.

## Evidence needed before any readiness upgrade

- Approved revised requirements, or a **formally specified independently reviewable permitted two-input resolution protocol** addressing identical-input behavior, collision prevention, equality leakage, key/DB compromise, atomic cross-child/reset/link invariants and recovery. No plaintext/reversible secret, unkeyed digest, easily enumerable credential directory or candidate-wide hash search.
- Exact guardian subject at first login/new device and after device loss/cleared cookies, without hidden selectors, session fixation or default guardian selection.
- Named provider/version and documented credential/session APIs; reviewed canonical issuer/sub → Auth UUID/profile binding and no automatic email cross-link or unapproved account creation.
- Explicit six-digit residual-risk decision or approved stronger mechanism; persistent atomic pre-resolution/identity/IP/global limits, outage behavior, enumeration measurements and recovery governance.
- Separately authorized bounded synthetic proof with genuine session/refresh/logout/MFA behavior, live ordinary-user RLS/Storage, guardian/Teacher/finance restrictions and measured suspension/revocation.
- Operator/custodian ownership, cost and safe environment/cleanup approval. No setup or credential collection is authorized by this gate.

Current source has an unused Step 8 `guardianReferenceRequired: true` metadata flag. It remains preserved legacy code, not approved current UX or an implemented form. The adapter/contract mismatch must be reconciled only after an acceptable design is approved; deleting a flag would not solve identity resolution. Existing authorization tests prove neither old nor new login feasibility.

## Implementation boundary

No dependency, login page, provider, external account, secret, credential, PIN/hash/token, SQL/migration, deployment or Git operation was created. Existing dashboards and all application source remain unchanged. Public previews must stay separate from protected records. Step 12 has not started.
