# Step 9 — Authentication feasibility and environment readiness

## 1. Executive summary

Completed the requested evidence-based research and documentation step on **2026-11-05**. Decision: **B. CONDITIONAL — APPROVALS OR PROOF REQUIRED**. Supported federation/native authentication primitives exist, but the school-specific registration/PIN credential flow, canonical identity binding and downstream session behavior are not proven. No implementation readiness or production security claim is made.

Exactly five primary roles remain. Super Admin is a privileged Admin tier, solely authorized to manage accounts/security, with mandatory MFA and no audit/financial bypass. Current dashboards remain public fictional previews. Step 10 has not started.

## 2. Files inspected

Inspected `README.md`, `STEP-7-REPORT.md`, `STEP-8-REPORT.md`, all sixteen pre-existing architecture documents, `package.json`, `tsconfig.json`, the App Router pages/layouts, and the existing configuration inventory. Reviewed all eight files in `src/lib/auth/`, `verification/verify-auth-contracts.mjs`, `verification/auth-type-contracts.ts`, and the five mock-data scripts. Read installed Next.js Proxy and data-security guides. The workspace has no Next configuration file, Proxy/middleware, Supabase client/dependency/configuration, SQL/migration or real login route. `.env.example` is comments only and remains unchanged; no environment secrets were requested or inspected.

Existing code contains deterministic policy evaluators and typed assumptions about future verified evidence, not authentication. No live verifier/context constructor, PIN verification, JWT issuance, cookie/session adapter or DB enforcement exists. Approved business requirements, proposed mechanisms, unresolved decisions and future work are separated in the feasibility document.

## 3. Research sources and dates

The [feasibility evidence register](docs/architecture/STEP-9-AUTH-FEASIBILITY.md#evidence-register) contains **35 official source entries**, all checked **2026-11-05**, with capability, status, required configuration, limitations and security implications. Sources cover Supabase custom OAuth/OIDC, third-party JWT integration, native Auth/passwords/hooks, identity linking, Next.js SSR, JWT verification/claims, refresh/signout, MFA, RLS, Admin APIs/keys, rate limits, CLI/environments, backup/pricing/SMTP; Vercel environments/Hobby eligibility; OIDC Core, OAuth security BCP, OWASP authentication/session/storage/MFA guidance, NIST SP 800-63B-4 and Keycloak's authentication extension model.

Only public documentation was browsed. “Verified supported” means a documented primitive, never an executed school integration. Exact external custom-OIDC audience controls, candidate A local feature parity, trusted precreation subject availability and provider-specific school credential behavior are explicitly unverified.

## 4. Authentication options evaluated

The [comparison](docs/architecture/AUTH-OPTIONS-COMPARISON.md) evaluates four options across all requested criteria: official support, Student/Parent UX, guardian resolution, native session/RLS compatibility, MFA, refresh/revoke/reset, rate limits, complexity, cost/free-tier constraints, lock-in, maintenance, security and effort.

A: custom OIDC provider sign-in through Supabase Auth. B: native email/password with a protected school-identifier mapping, assessing real identity/recovery constraints fairly. C: external JWT authentication to Supabase services, without a native Auth session. D: explicitly approved family UX change to native verified email/password if the PIN design cannot be proven safely. Classifications distinguish verified primitives, conditional composition, unverified behavior and unsupported exact uses.

## 5. Recommended architecture

Keep **A as the first candidate for a separately authorized controlled proof**, with native staff email/password and mandatory native Super Admin MFA. No production IdP is selected. Keycloak is a researched candidate extension platform, not a validated turnkey school PIN service; its internal SPI compatibility and operator burden are material risks.

A preserves the proposed Auth UUID/session model more closely than C. B is not a native arbitrary registration-number/PIN API and has unique email, policy, bcrypt, linking and recovery constraints. D is a legitimate fallback only with explicit changed business requirements. No fake email aliases, shared credentials, homemade token exchange or PIN-to-password shortcut is recommended.

## 6. Student login design

The [sequence design](docs/architecture/STUDENT-PARENT-LOGIN-SEQUENCES.md) preserves Registration Number + Student PIN, potentially in a provider-hosted form after redirect. It covers bounded string normalization, exact non-enumerating role-bound lookup, throttling, credential/account/reset checks, both supported code-flow legs, preapproved subject binding, genuine session verification, active Student context, own-record RLS, refresh, explicit-scope logout, reset and recovery. The sequence labels the still-unproven binding gate rather than inventing a callback API.

## 7. Parent login design

The Parent sequence preserves linked-child Registration Number + independent Parent PIN and proposes an always-present Guardian Login Reference. It resolves exactly one guardian and active child alias before verifying only that guardian's credential. One guardian subject supports multiple children. The design handles reset, refresh, logout, SSO reuse, revoked relationships, transfer/withdrawal, historical access decisions and direct unauthorized child requests.

## 8. Guardian disambiguation

The guardian-specific nonsecret reference remains necessary in the proposed design because a child may have multiple guardians. No guardian list or multi-hash search is allowed. Shared phone/email is contact metadata, never sufficient identity or recovery evidence. School approval is required for the final added field wording, accessibility, issuance/replacement and help process. Each guardian keeps an independent identity/credential; child selection is a query scope, not guardianship proof.

## 9. PIN security policy

The [assessment](docs/architecture/PIN-SECURITY-POLICY.md) identifies reusable remote PINs as password-like secrets, distinct from local device activation PINs. It supersedes the prior tentative 10/12-digit release suggestion with a **15-digit random numeric candidate requiring approval and proof**, or an explicitly revised stronger-factor UX. This is neither a universal safe length nor a full NIST conformity claim; numeric-only restrictions and usability require review.

Entropy calculations, provider-owned salted memory-hard storage, optional separately managed pepper, per-account/IP/global atomic limits, backoff/lockout abuse, secure one-use initial delivery, first change, risk-based rotation, suspension, recovery, sanitized audit and old-session denial are addressed. Hashing cannot add entropy. Native managed bcrypt is not described as configurable Argon2. No PIN, hash, password or secret value was generated/stored.

## 10. Super Admin security

The [readiness plan](docs/architecture/SUPABASE-ENVIRONMENT-READINESS.md#super-admin-native-primitives-versus-school-logic) separates native identity/MFA primitives from custom school governance. Retain owner/witness sealed provisioning of primary/recovery custodians; mandatory real MFA before tier activation; recent reauthentication; independent operation-bound approval; protected role grants; locked last-admin checks; emergency custody; metadata-only immutable audit; and app-context invalidation followed by provider reconciliation. No public Super Admin signup, default environment promotion, ordinary-request service-role access or assumed built-in recovery-code capability is introduced.

## 11. Supabase session compatibility

A documented custom provider flow goes through Supabase Auth; C's external access-token integration does not create an Auth user/session. A PIN verdict, source marker or access-token hook cannot create a native session. Routine token refresh is not recent factor authentication.

The exact approved subject → Auth UUID → school profile binding remains a critical proof requirement. Supabase documents automatic same-email identity linking; application-only no-link rules do not resolve that risk. Before-create hook coverage/subject evidence and existing identity-link behavior require testing. Upstream IdP reset/logout does not establish downstream Supabase revocation; both lifecycle boundaries require evidence.

## 12. RLS compatibility

The [trust-boundary analysis](docs/architecture/SESSION-RLS-TRUST-BOUNDARIES.md) compares issuer, audience, subject, auth.uid behavior, DB role versus school role, session context, assurance, live suspension/version checks, guardian links, teacher assignments and finance grants. It identifies required custom live-policy helpers and transactional commands using nondeployable planning pseudocode only.

C requires explicit issuer/subject mapping and session/schema/contract redesign; even a UUID-looking external subject is not automatically an Auth-user identity. Its exact audience enforcement configuration remains unverified. No RLS, SQL, grants or migration was executed. Native signature/current-user verification remains distinct from live school authorization. Existing TypeScript branding is not a cryptographic trust boundary.

## 13. Environment readiness

The environment plan defines future private local tooling, isolated controlled staging and separate school-owned production resources, strict redirect/secret scopes, reviewed migration/seed workflow, Vercel environment isolation, backup/object/IdP recovery and monitoring. No setup commands or credentials were run or written.

Custom external OIDC's CLI limitation is documented; hosted proofs may be needed under later authorization. Database backups do not include Storage file bytes. Proposed RPO/RTO targets are labeled untested, require owner approval and must be reconciled with financial recovery needs. Restoring stale grants requires security reconciliation and session invalidation before reopening access.

## 14. Cost assumptions

Illustrative unknown-school-size assumptions: 800 Students, 1,100 guardians, 60 Teachers, 20 other staff and 5 Admins including two privileged custodians, with no category overlap: **1,985 identities**. At 75% family monthly activity plus all staff, estimated MAU is **1,510**. Example interactive volume is **26,670 logins/month**, excluding refresh/failure/reset traffic. Example retained family documents total about **9.5 GB** before versions, staff documents or backups.

The plan separates prototype feasibility, small-school production and ongoing operating costs. It includes provider/compute, staging, storage/egress, mail/SMS if approved, hosting eligibility, rate-limit infrastructure, backups, extension maintenance and incident support. No exact price or free-tier entitlement is invented; no zero-cost production guarantee is made. Dated plan/feature quotes and school budget approval remain required.

## 15. Open risks

Unselected provider; custom credential storage/abuse behavior; controlled first-login provisioning; email/manual linking; SSO bypass of alias checks; downstream refresh after upstream reset; actual native MFA assurance/step-up; guardian revocation freshness; direct RLS/storage coverage; last-admin concurrency; hashing burst capacity; child usability; recovery abuse; plan/feature and operator costs. All remain open until applicable reviewed evidence exists. Public previews must stay disconnected from protected records.

## 16. Approval requirements

The readiness checklist requires school/security approval for exact family UX, guardian reference, numeric-secret/stronger-factor choice, delivery/recovery, relationship and transfer/historical policy, custodians/reviewer authority, IdP/version/extension owner, bounded proof subjects, freshness targets, regions/data processing, budget, environments, retention and recovery objectives. These are concrete future gates, not approvals obtained or a request to perform setup during Step 9.

## 17. Decision gate outcome

**B. CONDITIONAL — APPROVALS OR PROOF REQUIRED.** The [decision gate](docs/architecture/STEP-9-DECISION-GATE.md) records ten evidence gates with owners and failure responses. READY requires approved requirements, reviewed provider behavior, exact binding/linking negative tests, genuine session/MFA/refresh/revoke evidence, live ordinary-user API/RLS/Storage tests, abuse/capacity results, secure bootstrap/concurrency and approved operational budget/recovery. C additionally requires an approved identity/schema/context redesign; D requires changed business requirements. No speculative PIN bridge is labeled ready.

## 18. Documentation created

Seven new architecture documents and this report:

- [STEP-9-AUTH-FEASIBILITY.md](docs/architecture/STEP-9-AUTH-FEASIBILITY.md)
- [AUTH-OPTIONS-COMPARISON.md](docs/architecture/AUTH-OPTIONS-COMPARISON.md)
- [STUDENT-PARENT-LOGIN-SEQUENCES.md](docs/architecture/STUDENT-PARENT-LOGIN-SEQUENCES.md)
- [SESSION-RLS-TRUST-BOUNDARIES.md](docs/architecture/SESSION-RLS-TRUST-BOUNDARIES.md)
- [PIN-SECURITY-POLICY.md](docs/architecture/PIN-SECURITY-POLICY.md)
- [SUPABASE-ENVIRONMENT-READINESS.md](docs/architecture/SUPABASE-ENVIRONMENT-READINESS.md)
- [STEP-9-DECISION-GATE.md](docs/architecture/STEP-9-DECISION-GATE.md)
- `STEP-9-REPORT.md`.

Only two older architecture documents were clarified: AUTHENTICATION-PLAN and STUDENT-PARENT-PIN-AUTH-DESIGN, for verified session-model/linking findings and the revised tentative PIN assessment. Historical reports, README and application/authentication code were preserved. Historical “Step 9 has not started” statements describe earlier deliveries; this report records the current completed research step.

## 19. Verification results

Executed the existing in-memory deterministic authorization script: **44 groups passed, exit 0**. Executed all five existing Admin/Teacher/Student/Parent/Accountant mock-data scripts: **all passed, exit 0**. These verify local policy/fixture consistency only; no credential verifier, provider session, rate-limit service, concurrency or RLS was tested.

Checked all new/clarified local Markdown link targets, heading fragments and balanced code fences. The Student/Parent sequence diagrams and one boundary diagram were reviewed structurally; no Mermaid rendering or browser security test is claimed. No new test script or dependency was necessary.

Before/after SHA-256 comparison against **264 pre-existing workspace files** outside node_modules/.next/.git confirms only the two named architecture files changed; no deletions. All pre-existing application source, auth contracts, routes, navigation, package/lockfile, configuration, environment template, Steps 1–8 reports, README, tests and build metadata are byte-for-byte unchanged. Final new-file inventory is exactly the eight Markdown deliverables above. No lint/typecheck/build/server/HTTP/browser rerun was needed for documentation-only changes; earlier build evidence is historical, not relabeled as Step 9 execution.

## 20. Confirmation that no backend/service operations occurred

No Supabase project or other identity service was created or connected. No SQL, migrations, Auth user/account, PIN/password, secret, environment credential file, service-role operation, deployment or Git action was created/executed. No packages or CLI were installed. Only official public documentation browsing and non-destructive local inspections/tests occurred. No authentication is enabled. Documentation analysis is not live integration testing.

## 21. Confirmation that Step 10 has not started

**Step 10 has not started.** Step 9 research, architecture assessment and readiness documentation are complete. All infrastructure, proof accounts, credentials, provider configuration, schema/RLS, authentication UI and production integration remain future work under a separately authorized scope.
