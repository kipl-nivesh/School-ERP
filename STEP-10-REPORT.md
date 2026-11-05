# Step 10 — Six-digit PIN assessment and controlled proof planning

## 1. Executive summary

Completed the local documentation and deterministic verification step on **2026-11-05**. The selected family UX is six-digit numeric Student/Parent PINs, independently scoped to exact identities. This is a UX preference, **not production security approval**. A credible isolated-proof design is documented, but important provider/control/guardian decisions remain. Decision gate: **CONDITIONAL**. No proof, real login or external setup was executed; Step 11 has not started.

Inspected README, Steps 7–9 reports, all twenty-three existing architecture documents, all auth library files, authorization tests, routes, package/TypeScript configuration and existing mock-data scripts. Current implementation remains public fictional previews and pure policy contracts, without a provider verifier, PIN validator, session adapter, Supabase dependency/configuration or database integration.

## 2. Updated PIN preference

Student: Registration Number + six-digit Student PIN. Parent: linked-child Registration Number + separate six-digit Parent PIN, with guardian reference required by the candidate resolution design subject to school approval. The prior fifteen-digit numeric candidate is superseded as preferred UX and retained as a stronger comparison. No credential is generated or placed in fixtures.

Exactly five primary roles remain. Super Admin stays a privileged Admin tier, with native email/password and mandatory MFA and sole account/grant-management authority. Ordinary Admin, Teacher and Accountant use email/password. No public signup or sixth dashboard is proposed.

## 3. Security risk assessment

The [risk assessment](docs/architecture/STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md) covers the one-million-value search space, about 19.93 bits of random entropy, online/offline guessing, stuffing/distributed attacks, enumeration, exposed registration identifiers, Parent targeting, reuse, shared devices, interception, recovery abuse, lockout denial-of-service, verifier theft, staff misuse and stale sessions. Mathematical probability examples are labeled illustrative, not measured compromise rates or provider capacity.

A reusable remote six-digit PIN is not a device-local activation PIN. It is below NIST's cited remote-password length baselines, including the minimum for password use in MFA; adding a factor does not make six remote digits conformant. No NIST applicability/certification claim is made. Random issuance, hashing and rate limits cannot remove the fundamental low-entropy risk.

## 4. Provider feasibility

Rechecked official public Supabase custom OIDC, external OIDC, native password/security, rate-limit, signout, MFA and identity-linking documentation; Keycloak authentication extension guidance; NIST and OWASP authentication/storage guidance on **2026-11-05**. Supporting official URLs are embedded beside the claims in the assessment and proof plan. The Step 9 dated evidence register remains available as historical research.

Documented federation is distinct from an untested six-digit school verifier. Keycloak documents a custom authenticator/credential extension model with internal SPI upgrade risks, not this exact school flow out of the box. No provider/release/extension is approved, built or configured. Canonical identity lookup, secure credential storage, durable atomic limits, approved subject binding and reset-to-downstream revocation remain unverified school-specific composition.

## 5. Architecture comparison

The [proof plan](docs/architecture/STEP-10-AUTH-PROOF-PLAN.md#provider-feasibility-and-comparison) compares A custom OIDC through Supabase Auth, B native Auth with protected identifier mapping, C external JWT with an explicitly redesigned model, and D stronger credential/additional-factor UX. It assesses six-digit compatibility, session/RLS behavior, operations, cost, maintenance, recovery, assurance and required proof.

**A remains the preferred controlled-proof candidate**, with Keycloak as the first evaluation target, not a production provider selection. B must not weaken native password policy, fabricate aliases or treat a custom PIN result as a native session. C does not create a native Auth session and requires schema/context redesign. D requires owner approval for changed UX and device/recovery implications. No exact prices or zero-cost production promises are invented.

## 6. Student login proof design

The Student Mermaid sequence covers registration and six-digit input in the trusted provider form, exact approved Student resolution, atomic attempt reservation before expensive verification, account/credential-state checks, supported OIDC code flow, controlled subject binding, genuine Supabase callback/session verification, live Student role/context and own-record RLS. Unknown identifiers receive bounded generic treatment. Wrong PIN, invalid registration, suspension, repeated attempts, stale membership, forged session and unrelated-row access are required negative cases.

No fake login endpoint or token issuer was created. A valid input format or allowed policy result is not authentication.

## 7. Parent login proof design

The Parent sequence preserves one guardian identity across multiple children, exact current alias resolution before one credential check, shared canonical guardian attempt budgets across child aliases, separate credentials for multiple guardians, live purpose-scoped relationships and reauthorization for every selected child/query/file. Shared phone/email is never a merge/recovery shortcut. Revoked links, withdrawn Students, Parent reset, provider SSO reuse and unauthorized selection are explicit cases.

## 8. Guardian identity decision

A school-issued nonsecret guardian reference is **necessary for this candidate's exact-disambiguation strategy** and must be always present, not replaced with a guardian picker or PIN-hash scan. School approval is still required for the added field, wording, accessibility, issuance and lost-reference process. If approval is withheld, defer the Parent proof or review another exact strategy; do not silently drop the requirement. The reference itself is neither a secret, factor nor proof of guardianship.

## 9. Compensating controls

Documented candidate controls include unbiased random issuance, independently salted provider-owned memory-hard verifiers, optional separately held pepper, identity/IP/global and campaign throttles, durable atomic reservation, backoff, suspicious-activity response, confidential activation, policy-approved initial change, verified recovery, context/version revocation, suspension and optional possession-based protection. Each control has an explicit limitation.

Five failures/15 minutes and cooldown up to 30 minutes remain experiment ideas, not sufficient approved thresholds; renewed windows accumulate guesses, requiring a separately chosen cumulative/risk policy. Limiter outage/partition must fail closed rather than reset attempts. Stronger credential and authenticator alternatives remain comparison options rather than silent requirement changes.

## 10. Proof environment requirements

The phased plan defines P0 decisions before setup; P1 isolated test provider/Supabase/hosting configuration; P2/P3 Student/Parent sequences; P4 session/MFA/revocation/RLS tests; P5 evidence/pass-fail/stop conditions; and P6 inventoried cleanup/rollback. Future proof uses synthetic identities/data only, no production credentials/resources or real school records, and explicit owner authorization before external setup.

Required configuration includes strict issuer/client/callback and code-flow validation; protected approved-subject provisioning; deliberate linking/no-public-signup controls; actual native Super Admin MFA; user-JWT RLS/private Storage; durable shared throttling; safe logging; secret custody; cost/load ceilings and test-resource expiry. Subject → actual Auth UUID/profile/session mapping must be proven without inventing APIs. An upstream reset/logout does not automatically prove downstream revocation. Proposed transaction/event freshness targets require approval and measurement.

## 11. Security test matrix

The [41-case matrix](docs/architecture/STEP-10-SECURITY-TEST-MATRIX.md) includes every requested scenario and additional counter outage/race, callback replay, unknown-subject creation, provider SSO, cleanup and leakage cases. Each is classified as locally testable now, requires isolated provider proof, requires live RLS integration and/or requires school approval. It records limited local-policy passes separately from **NOT RUN** provider/RLS outcomes.

Concurrency, timing, refresh/revoke and evidence-recording expectations are explicit. Future technical feasibility requires every applicable critical case to pass with reviewed sanitized evidence; any authority leak fails immediately. A proof pass would still not authorize production six-digit-only authentication.

## 12. Local verification results

Executed `node verification/verify-auth-contracts.mjs`: **44 deterministic groups passed, exit 0**. Executed all five unchanged Admin/Teacher/Student/Parent/Accountant mock-data verification scripts: **all passed, exit 0**. These validate supplied policy evidence and fictional data, not credentials, real sessions, persistent rate limits, provider integration or live RLS.

No optional format validator, identity resolver, authentication-state implementation or new test fixture was needed. No PIN values/hashes, token issuer or custom authentication server were added. Lint/typecheck/build were not rerun because no application/test/configuration code changed; historical build results are not relabeled as Step 10 execution. Route source is preserved; no fresh HTTP/browser test is claimed.

Checked local Markdown links/heading fragments, balanced fenced blocks, expected matrix rows and report sections, current-preference notices and absence of credential-like material in the changed documents. Mermaid diagrams were structurally reviewed, not rendered by an engine.

SHA-256 comparison against **272 pre-existing workspace files** outside dependency/generated/Git trees confirms only the seven named Step 9 architecture documents changed, with no deletions. All pre-existing source, five dashboard route implementations, entry route, shared navigation, auth contracts, tests, package/lockfile, configuration, environment template, README, build metadata and Steps 1–9 reports are byte-for-byte unchanged. Exactly five new Markdown deliverables were added.

## 13. Documents created/updated

Created:

- [STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md](docs/architecture/STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md)
- [STEP-10-AUTH-PROOF-PLAN.md](docs/architecture/STEP-10-AUTH-PROOF-PLAN.md)
- [STEP-10-SECURITY-TEST-MATRIX.md](docs/architecture/STEP-10-SECURITY-TEST-MATRIX.md)
- [STEP-10-OWNER-APPROVAL-CHECKLIST.md](docs/architecture/STEP-10-OWNER-APPROVAL-CHECKLIST.md)
- `STEP-10-REPORT.md`.

Updated all seven Step 9 architecture deliverables with authoritative current-preference/proof-status notices and links: STEP-9-AUTH-FEASIBILITY, AUTH-OPTIONS-COMPARISON, STUDENT-PARENT-LOGIN-SEQUENCES, SESSION-RLS-TRUST-BOUNDARIES, PIN-SECURITY-POLICY, SUPABASE-ENVIRONMENT-READINESS and STEP-9-DECISION-GATE. Historical analyses remain explicitly retained; earlier reports are unchanged. Old “Step 10 has not started” report statements describe their original delivery, not current status.

## 14. Open risks

Low entropy, phishing/endpoint observation, offline verifier theft, legitimate-user lockout and insider recovery abuse remain even with compensating controls. Provider module/version, subject creation/binding, linking isolation, persistent limiter semantics/campaign budgets, trusted IP behavior, event freshness, guardian-reference usability, optional factor, custodians, recovery, cost and maintenance remain decisions/proofs. No protected records should be connected to the existing public previews.

## 15. Owner approvals required

The [checklist and risk-decision template](docs/architecture/STEP-10-OWNER-APPROVAL-CHECKLIST.md) distinguish UX preference, bounded synthetic proof authorization, security policy and future production release. They require named owners/reviewers, scope/data, exact provider/configuration, residual-risk acknowledgment, thresholds/failure policy, guardian field decision, credential delivery/recovery, evidence gaps, budget, expiry/review triggers and stop/cleanup authority. All approval fields remain unfilled; no approval was inferred or requested to finish this local step.

## 16. Decision gate result

**CONDITIONAL.** A credible proof plan exists, but the provider/release/credential module, approved guardian field, exact subject gate, durable limiter/budgets/failure policy, freshness targets, experimental factor choice, ownership and cost scope must be decided before calling it READY FOR ISOLATED PROOF and requesting explicit external setup authorization. Production authentication is not labeled READY. The Step 10 documentation/testing assignment is complete despite these intentionally unexecuted future gates.

## 17. Confirmation of no external operations

Only public official documentation research and local read-only verification occurred. No provider, realm, client, Supabase project or external account was created/configured/connected. No real authentication, credential/PIN/hash/session, secret environment file, SQL/migration, package/CLI install, deployment or Git operation occurred. No service-role credential was used. All real provider/RLS tests and cleanup remain unexecuted because no proof resources were created.

## 18. Confirmation Step 11 has not started

**Step 11 has not started.** No external proof or production integration is authorized by this report. The requested six-digit UX assessment, controlled proof design, test matrix, approval template and local regression verification are complete.
