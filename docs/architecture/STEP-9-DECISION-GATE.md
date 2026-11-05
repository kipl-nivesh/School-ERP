# Step 9 decision gate

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

## Step 10 current preference and proof status — 2026-11-05

Step 9 remains a historical conditional feasibility decision. The current Step 10 gate is CONDITIONAL for isolated-proof preparation, not READY for production integration. Six digits is selected UX only; the earlier fifteen-digit candidate remains a comparison. New plan/matrix/owner decisions define the specific outstanding prerequisites; no proof has run and Step 11 has not started.

This update takes precedence for the current UX and proof scope; it does not rewrite the historical findings below as a passed security proof. See [six-digit risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md), [controlled proof plan](STEP-10-AUTH-PROOF-PLAN.md), [security matrix](STEP-10-SECURITY-TEST-MATRIX.md) and [owner checklist](STEP-10-OWNER-APPROVAL-CHECKLIST.md). Exactly five roles and the existing Super Admin model are unchanged.

## Retained Step 9 analysis

Date checked: **2026-11-05**. Outcome: **B. CONDITIONAL — APPROVALS OR PROOF REQUIRED**.

Research and documentation for Step 9 are complete. Production authentication is not ready. No infrastructure, account, credential, migration, deployment or live integration was created, and Step 10 has not started. The gate outcome is an architecture assessment, not a task-pausing status or a request to perform setup now.

## What documentation establishes

Official sources document custom OIDC sign-in through Supabase Auth, native email/password/MFA/session primitives and a separate external-JWT service integration. None establishes the entire school-specific PIN/verifier/provisioning/session design. A is the preferred candidate to prove; C is an explicit redesign alternative; native B has identifier/credential/recovery constraints; D requires changed family UX. The [evidence register](STEP-9-AUTH-FEASIBILITY.md#evidence-register) distinguishes verified primitives from untested assumptions.

Exactly five roles and Super Admin within Admin remain approved. Only Super Admin manages users/grants; immutable audit/finance boundaries persist. Independent Student/Parent credentials and exact verified guardian relationships remain mandatory. The current application still exposes only fictional public previews and isolated policy contracts.

## Evidence needed to move to A — READY FOR CONTROLLED IMPLEMENTATION

| Gate / owner | Required concrete evidence from a separately authorized scope | Failure response |
| --- | --- | --- |
| G1 — School/security: credential UX | Written approval for registration fields, always-present guardian reference, candidate PIN policy/stronger-factor alternative, confidential delivery and accessible recovery | Keep real login UI deferred; no silent substitution |
| G2 — Identity engineering: provider | Named supported IdP/version, reviewed credential module/extension, hashing/throttling/reset behavior, maintenance owner and all alternate login-path audit | Do not label a generic SPI turnkey PIN support |
| G3 — Identity engineering: subject binding | Documented supported workflow plus bounded proof: approved issuer/sub maps once to intended Auth UUID/profile; unknown subject denied; retries do not duplicate; no automatic school role grant; controlled first-login behavior and before-create hook inputs/coverage verified | No public upstream signup or unapproved Auth/application user creation; redesign if binding cannot be proven |
| G4 — Security: isolation/linking | Negative evidence for same-email auto-link, manual link, shared guardian phone/email, staff/family collision, Student PIN in Parent flow, and provider SSO bypass of selected child alias | Do not reuse fake emails or permit ambiguous identities |
| G5 — Identity engineering: sessions | Genuine callback + PKCE, verified intended issuer/audience/key/time, real subject/session_id, refresh and logout across both providers; reset/disable tested against old access and refresh tokens | No custom token or boolean-session shortcut |
| G6 — Backend/security: live authorization | Implemented server verifier constructs Step 8 input only after live checks; ordinary-user direct API/RLS/storage tests for account/version/context and guardian/teacher/finance scope | Public previews remain disconnected from protected records |
| G7 — School/security: Super Admin | Approved owner/witness primary/recovery ceremony; genuine native MFA before activation; recent step-up and independent reviewer evidence; sealed replay denial and concurrent last-admin protection | No default privileged account or service-role ordinary request |
| G8 — Operations: abuse/capacity | Atomic distributed credential/IP/global limits, unknown-identity timing checks, shared-NAT usability, burst/hash resource tests and lockout recovery | Tune or replace credential method before rollout |
| G9 — Owner/operations: cost/readiness | Dated provider/hosting/mail budget, plan-feature confirmation, staging/production isolation, approved RPO/RTO and successful restore/security reconciliation drill | No guaranteed free-tier production claim |
| G10 — Architecture/security: alternative C only | Explicit new ADR/schema/context contract for issuer/sub, audience enforcement, external session/assurance/revocation and all RLS paths; ordinary-token proof | Do not cast external claims into native Auth-session contracts |

To enter READY, every applicable gate must have reviewed evidence with named approver/date and no unresolved critical security assumption. G10 applies only if C replaces A; D instead requires explicit changed business requirements and revised designs. A controlled proof itself needs a bounded, separately approved setup/test scope. This document does not grant authority to create projects/users or start Step 10.

## Still unverified

No named provider is selected or configured; exact custom PIN storage and reset behavior, preprovisioned subject binding, before-create trusted subject availability, linking isolation, dual-provider revocation and actual direct RLS enforcement have been exercised. Custom external OIDC audience enforcement/configuration and candidate A local feature parity need confirmation. Numeric-secret usability, operating budget, custodians and recovery process are unapproved.

## Rejected shortcuts

A custom PIN check is not a Supabase session. An access-token hook is not a credential exchange. An external JWT is not a native Auth session. A TypeScript brand is not signature verification. A registration number/reference is not guardianship or a second factor. An ordinary Admin is not an account provisioner. A service-role success cannot prove RLS. No fake aliases, shared credentials, hash scanning across guardians, client-side secret comparison or unrestricted bootstrap flags are acceptable.

The conditional outcome completes the requested evidence-based Step 9 decision without claiming live feasibility proof. See the [report](../../STEP-9-REPORT.md) for actual local verification.
