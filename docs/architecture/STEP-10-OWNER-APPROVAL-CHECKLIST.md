# Step 10 — Owner approval checklist and risk decision template

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

Date: **2026-11-05**. **No approval is recorded by this document.** The owner's six-digit UX preference is acknowledged; it is not security acceptance, external setup authorization or permission for production integration. No secrets or subject names need to be supplied to complete Step 10.

## Separate decisions

| Decision | Concrete item to review | Current state |
| --- | --- | --- |
| UX preference | Student registration + six-digit Student PIN; linked-child registration + independent six-digit Parent PIN | Selected preference, not approved production security |
| Guardian resolution | Always-present nonsecret school-issued guardian reference for this proof design; wording, accessibility, issuance, lost-reference help | Field approval pending; dropping it requires a new exact-resolution design |
| Proof-only authorization | [Bounded plan](STEP-10-AUTH-PROOF-PLAN.md), synthetic-only environment, named provider/release/operator, spend cap and cleanup | Not granted; do not configure anything now |
| Security policy | Low-entropy residual risk, optional factor/stronger alternatives, thresholds, initial change/delivery, recovery/custody and session freshness | Undecided; school/security review required |
| Production release | Reviewed live provider/session/RLS/Storage evidence plus operational/security acceptance | Not requested or authorized in Step 10 |

## Checklist before requesting an isolated proof

- Approve logical synthetic fixture scope, no real school records/minors/contact data, no production resource access, and strictly nonproduction provider/Supabase/hosting ownership and region.
- Name a supported provider release and reviewed credential extension owner, independent reviewer and maintainer; accept or reject internal SPI upgrade burden. Keycloak remains an evaluation candidate, not a confirmed turnkey provider.
- Approve exact subject provisioning/binding and linking controls, including rejection of unknown upstream subjects before unauthorized Auth/application user creation. No email/name/phone-only identity merge or public registration.
- Approve mandatory guardian reference for the Parent arm or supply a separately reviewed exact identity strategy. One guardian retains one identity across children; two guardians retain separate credentials even with shared contacts.
- Choose the six-digit-only experimental arm and whether a stronger-factor comparison arm is permitted. Record that neither a happy-path login nor limiter test proves production safety, and six remote digits are below the cited NIST password length baselines even if MFA is added.
- Fix identity/IP/global budgets, cumulative campaign controls, backoff, persistent atomic store, shared-NAT behavior, limiter outage denial, alert responder and permitted attack/test load before measurement.
- Approve secure activation/delivery, whether forced initial PIN change is required, how replacement avoids human-biased secrets, supervised recovery identity evidence, and no secret capture/export.
- Approve application transaction freshness and an explicit out-of-band provider-event delay/failure policy; review the plan's proposed 60-second external-event target rather than silently accepting it.
- Name primary/recovery privileged custodians and independent approver roles; preserve native email/password plus mandatory Super Admin MFA, last-admin locking, immutable audit/finance and no ordinary-request service-role access.
- Approve protected test origin/callbacks, environment secret custody, proof duration, budget ceiling, evidence retention/redaction, incident escalation, stop conditions, resource inventory and independently checked cleanup targets.

All boxes remain unchecked. Read [risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md) and [test matrix](STEP-10-SECURITY-TEST-MATRIX.md) before deciding. Completing this checklist would authorize nothing until the owner explicitly approves the bounded setup scope.

## Risk-acceptance decision template — unexecuted

| Field | Required decision/evidence; no values recorded here |
| --- | --- |
| Decision identifier, date, owner and independent security reviewer | Named accountable school authority and reviewer; signatures/approval recorded through the school's approved process |
| Scope | Choose UX preference only, isolated synthetic proof only, reject/defer, stronger alternative, or separately reviewed production scope; never infer one from another |
| Affected population/data | Student/guardian/staff count assumptions, permitted records/actions and sensitive fields; prohibit production data in proof |
| Chosen authentication mode | Six-digit-only experiment, six-digit-plus-independent-factor comparison, or approved changed credential UX; justify exact selection |
| Threats and residual risk | Acknowledge small search space, lucky/distributed guesses, offline verifier theft, phishing/shared-device exposure, recovery and insider abuse; explain why proposed controls are acceptable for the chosen scope |
| Standards assessment | Record remote-password length departure and distinguish local activation PINs; no blanket NIST/OWASP or compliance claim |
| Compensating controls and evidence | Provider/version/credential module; measured atomic limits, exact identity binding, session/MFA/revocation and ordinary-token RLS/Storage results; reference test IDs and failures |
| Guardian field decision | Approve wording and always-present reference, or defer Parent proof pending an equally exact reviewed alternative; reference alone proves nothing |
| Thresholds and failure policy | Fixed attempt/campaign budgets, cooldowns, alert thresholds, fail-closed outage semantics, session freshness and test-volume ceilings |
| Recovery and custody | Named responsible roles, independent review/evidence, factor/secret delivery, compromised account procedure and immutable audit |
| Costs and maintenance | Dated provider/hosting/limiter/support estimates, budget cap, owner, expiry, patch and incident obligations |
| Evidence gaps and exclusions | Every unexecuted test, unsupported feature, provisional assumption and disallowed production behavior |
| Expiry/review triggers | Defined decision expiry and review on incident, provider/extension change, changed school data scope, threat changes or failed control |
| Stop/rollback/cleanup | Authorized resource list, incident contact, revoke path, cleanup owner and closure evidence |
| Outcome | Explicit approve bounded scope / reject / defer / approve stronger alternative, with reasons; no default selection |

School risk acceptance cannot turn a technically unsupported session exchange into a supported one, waive other people's privacy/security obligations, or override invariant protections. A production decision would need its own implemented evidence, professional review as applicable and explicit release authorization; this template does not constitute any of them.

## Current decision gate

**CONDITIONAL.** The proof architecture is credible and reviewable, but the provider/extension, durable limiter/control decisions, exact subject gate, guardian field and proof ownership/budget remain unresolved. After these decisions are documented, request explicit isolated setup authorization against the finalized plan; do not request production credentials or start Step 11 in this task.
