# Super Admin access model — Step 8

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

## Status and authority

Approved requirements: exactly five primary roles (`admin`, `teacher`, `student`, `parent`, `accountant`). Super Admin is a privileged Admin tier, never a sixth role or dashboard. Only Super Admin provisions accounts, resets credentials, suspends accounts, or assigns/revokes roles and permissions. Ordinary Admin has only explicitly assigned administrative operations. Earlier Step 7 references to an authorized Admin provisioning users are superseded.

Implemented locally: pure policy contracts in `src/lib/auth/`, deterministic policy tests and compile-time constraints. No authentication, credential verification, provider adapter, login UI, persistence or enforcement on existing routes is enabled. All dashboards remain fictional public previews. Production integration is future work and release is blocked until server/API/RLS enforcement is demonstrated.

Proposed mechanisms below require implementation and security review. The [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md) identifies unresolved integration decisions.

## Authorization boundary

Every request must verify the provider session on the server and resolve current application account status, memberships, authorization version, session-bound active role and tier from protected storage. URL, browser role switcher, localStorage, user metadata and an object claiming to be verified are never evidence. The opaque TypeScript type discourages accidental use; casts or its source marker cannot authenticate anyone.

Super Admin requires a live Admin membership and mandatory verified MFA (`aal2`) in every context. Its broad module review operates under the active Admin context, covers the existing five module destinations, uses bounded server projections and records the actor. It never impersonates a Teacher, Student or Parent, fabricates guardian links, or combines inactive memberships. Ordinary users remain within the active membership's explicit grants and role ceiling. Unknown permissions deny; no wildcard authorizes future operations automatically.

Security changes and sensitive exports/publication require recent server-confirmed reauthentication (proposed maximum 10 minutes). A disabled, suspended, reset-required, expired, revoked or stale-version context denies. Tier/grant/link changes must atomically bump authorization versions, revoke affected contexts and arrange supported provider session revocation; old JWT signatures alone cannot preserve access.

## Controlled security changes

Normal security commands cannot target the actor. Changes involving Super Admin require an independently authorized reviewer distinct from actor and target. The evaluator checks structural separation only; the future command must resolve reviewer authority and approval scope/expiry itself. Never accept target tier, active administrator count, approval identity or integrity flags from request JSON.

Protect the last active Super Admin under a database lock/serializable transaction for suspension, revocation, Admin-membership removal and recovery. Concurrent operations must not reduce the count to zero. Maintain at least two independently controlled privileged accounts operationally. First-account creation is only the sealed [bootstrap ceremony](SUPER-ADMIN-BOOTSTRAP-PLAN.md).

Super Admin does not get a database service key for ordinary requests. It cannot edit/delete audit events, rewrite issued or settled financial facts, bypass approval separation, or ignore integer-money, allocation, refund and receipt invariants. Corrections append controlled events under the existing financial model.

## Proposed persistence additions — no SQL

| Proposed relation | Key facts and constraints | Access |
| --- | --- | --- |
| admin_privileges | Unique profile FK, tier super_admin only, pending/active/revoked state, validity, version; requires active Admin membership | Protected server projection; no self-update |
| admin_privilege_events | Append-only grant/revoke/recovery event ID, target, actor, independent approval, reason, time | Audited security command only |
| security_bootstrap_runs | Singleton ceremony ID, approved bounded subject list, expiry, consumed/sealed state | Offline controlled operator only |
| login_identities | Unique issuer + subject, canonical profile FK, login-method/role binding, approved provisioning intent, state/version | Server-only resolution; no public lookup |
| pin_credential_metadata | Unique external credential reference, profile/role/method binding, status/version/reset-required; separate Student and Parent credentials | Server-only metadata; PIN/hash belongs to reviewed identity provider |

Registration number must be a unique canonical Student login identifier, distinct from display/admission identifiers unless an explicit migration establishes equivalence. Add a unique opaque nonsecret guardian login reference. Relationship tables retain dated, revocable academic and fee access. These are additive proposals to the Step 7 blueprint, not installed tables or a completed schema migration.

## Verification required before production

Test actual provider verification, mandatory MFA at API and RLS boundaries, direct Data API denial, stale token/context revocation, concurrency on last-admin checks, independently authorized approvals, secure guardian resolution and immutable finance/audit writes. Current unit tests assume trusted evidence and cannot prove any of these integrations. See [threat model](AUTHENTICATION-THREAT-MODEL.md).
