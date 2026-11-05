# Step 11 — Two-field login feasibility and guardian identity

## 1. Executive summary

Completed the requested documentation/security architecture step on **2026-11-05**. Outcome: **C. BLOCKED** for the approved two-field multi-guardian Parent first-login architecture. The documentation assignment is complete; no live authentication/proof is implemented. Student integration remains conditional. Step 12 has not started.

The exact Parent identity cannot be established for two guardians presenting identical permitted inputs. Distinct PINs could define a mathematical inverse, but no safe permitted resolver/collision protocol is established under the restrictions. No third field, guardian picker, secret directory, candidate-wide hash search, hidden contact selector, single-guardian policy or extra factor is adopted to mask the gap.

## 2. Current approved UX

Student: exactly Student Registration Number and six-digit numeric Student PIN. Parent: exactly linked Student Registration Number and six-digit numeric Parent PIN. Guardian Reference/ID is removed from the current proposed UX. Six digits is a preference, not production security approval.

Five primary roles remain Admin, Teacher, Student, Parent and Accountant. Super Admin is a privileged Admin tier using email/password plus mandatory MFA, solely authorized to create accounts/manage grants, subject to immutable audit/finance and normal security boundaries. Ordinary Admin/Teacher/Accountant use email/password. Future integration must prohibit public signup; no provider configuration or login exists now.

## 3. Guardian identity ambiguity analysis

The [model analysis](docs/architecture/STEP-11-GUARDIAN-IDENTITY-MODELS.md) formalizes inputs (Parent role, child registration, six-digit PIN) and currently eligible guardian sets. If two distinct guardians use the same secret under the same registration, their observable login requests are identical. A resolver cannot always select both correctly without more independent evidence. Random guessing, first match or shared subject would violate exact identity and audit/custody requirements.

Uniqueness of distinct secret values is mathematical sufficiency for an inverse, not evidence of a secure implementation. Independently salted hashes cannot be used as a direct equality/lookup directory. Collision prevention/reset/linking across siblings and concurrent provisioning need a permitted equality mechanism plus transactional invariants. None is established. This is not a universal claim that every future cryptographic protocol is impossible; identical-input ambiguity and unverified distinct-secret resolution are separate limitations.

## 4. Candidate model comparison

Evaluated all five requested models:

- A: unique PIN per registration scope. Reject as an established solution: collision/rotation/recovery/equality and exact resolution remain unresolved; no unsafe secret-derived lookup or hash scanning is proposed.
- B: trusted prior context. Useful for continuing an actually verified identity with live authorization, but cannot cover first device, cleared cookies, expired session, device loss or unapproved guardian switching. Browser-local state is not proof.
- C: provider-owned privacy-preserving protocol. Unverified; requires a formally specified independently reviewable mechanism and full compromise/lifecycle analysis. OIDC and Keycloak extensibility do not themselves supply it.
- D: one designated login guardian per child. Could create a singleton eligible scope only by explicitly changing independent multi-guardian login policy, with custody/sibling/access consequences. Not adopted; no credential sharing.
- E: stronger/additional cryptographic or possession evidence. Could supply distinguishing information but adds enrollment, interaction/factor, possible account choice and recovery; requires explicit approval. Not adopted.

## 5. Six-digit PIN security assessment

One million possible random values provide about 19.93 bits. Low entropy, guessing/stuffing/distributed attacks, exposed registration identifiers, reuse, shared devices, phishing/interception, offline verifier theft, support impersonation, recovery abuse and lockout denial-of-service remain. Uniqueness does not make a secret a safe account selector. Parent pre-resolution throttles can protect an entire registration scope but also let attackers lock out all guardians; per-guardian limits cannot depend on an identity not yet established.

Retained proposed compensating controls include independent random role-bound credentials/salts, reviewed provider-owned memory-hard verification, confidential activation, policy-approved initial change, durable atomic registration/identity/IP/global/campaign budgets, outage denial, supervised recovery, account suspension and live version/context revocation. These are not implemented and cannot fix indistinguishable inputs or remove entropy limits.

NIST distinguishes remotely verified numeric passwords from local activation secrets; six remote digits fall below its cited password length baselines even within MFA. No compliance/applicability claim is made. The prior fifteen-digit option remains a comparison rather than selected UX. Stronger credentials alone also do not solve the shared-identifier collision case.

## 6. Supabase/OIDC feasibility

The [feasibility evidence table](docs/architecture/STEP-11-TWO-FIELD-LOGIN-FEASIBILITY.md#current-official-capability-evidence) cites official sources checked **2026-11-05** for native Supabase email/phone-password authentication, custom OIDC through Auth, separate third-party JWT access, OIDC subject assertions, identity linking, sessions/refresh, signout, MFA, token verification, RLS, Keycloak extensions and WebAuthn.

Documented primitives are separated from proposed custom extensions and untested assumptions. No exact two-field multi-guardian protocol was established. Supabase native Auth is not a registration/PIN identity-discovery API. Custom OIDC requires an already correctly authenticated upstream subject; external JWT integration is not a native Auth session and would require identity/context redesign. Automatic same-email linking remains a cross-identity risk. Real verified session/issuer/audience/subject and live account/context/relationships are required before supplying trusted Step 8 input; TypeScript branding is not verification.

The NIST single-page fetch timed out; its official authenticator section page was successfully reviewed and linked. No provider/project endpoint or private account was accessed. Public documentation analysis is not integration evidence.

## 7. Student login design

Documented one Student Mermaid sequence preserving exactly the two approved fields. It resolves a unique school-provisioned Student identity, admits attempts under persistent limits, verifies only its credential/current state, then requires supported provider/Auth code flow, actual session verification, live Student membership/context and own-record RLS. Subject binding, verifier, limiter and lifecycle are explicitly unproven. Refresh/logout/suspension/reset must respect live versions and provider reconciliation; no fake login flow exists.

## 8. Parent login design

Provided all **eleven requested Parent sequence diagrams**: one guardian/child; one guardian/multiple children; two guardians/child; two guardians/same PIN; reset; suspension; relationship revocation; withdrawal; first new device; shared device; unknown registration. Every diagram shows limiter admission, resolution outcome, credential-comparison status, session/no-session outcome and live authorization status.

Singleton illustrations are explicitly restricted, hypothetical and unimplemented; they do not impose a one-guardian policy or claim general success. Ambiguous cases deny before hash search, issue no session and expose no data/guardian list. Existing verified-context revocation is separate from first-login resolution. No reference, additional credential, contact choice or selector was silently added.

## 9. Security test plan

Created a [35-case plan](docs/architecture/STEP-11-AUTH-SECURITY-TESTS.md) covering all required credential, collision/concurrency/reset, guardian, session/JWT/substitution, enumeration/distributed guessing/outage, recovery/shared-device/first-login, OIDC/linking, RLS and Storage cases, plus staff privilege/MFA/integrity and current-UX checks.

Each is classified locally testable, requires isolated provider proof, requires database/RLS integration and/or school approval. Actual limited local policy passes are clearly separated from NOT RUN/BLOCKED provider/RLS cases. Identical-input reasoning is analysis, not a new credential test. No optional test/validator/resolver code or secret fixture was added.

## 10. Documentation changes

Created four architecture documents and this report:

- [STEP-11-TWO-FIELD-LOGIN-FEASIBILITY.md](docs/architecture/STEP-11-TWO-FIELD-LOGIN-FEASIBILITY.md)
- [STEP-11-GUARDIAN-IDENTITY-MODELS.md](docs/architecture/STEP-11-GUARDIAN-IDENTITY-MODELS.md)
- [STEP-11-AUTH-SECURITY-TESTS.md](docs/architecture/STEP-11-AUTH-SECURITY-TESTS.md)
- [STEP-11-DECISION-GATE.md](docs/architecture/STEP-11-DECISION-GATE.md)
- `STEP-11-REPORT.md`.

Added authoritative current-UX/supersession notices to **eighteen** relevant older architecture documents: all seven Step 9 deliverables; all four Step 10 designs; STUDENT-PARENT-PIN-AUTH-DESIGN; SUPER-ADMIN-ACCESS-MODEL; AUTHENTICATION-PLAN; AUTHENTICATION-THREAT-MODEL; ARCHITECTURE-DECISIONS; DATABASE-SCHEMA-BLUEPRINT; ERD. Reference-based successful sequences/checklists and proposed login-reference uniqueness are historical, not current recommendations or hidden selectors. Prior content/reports are retained, not rewritten as passed proof.

An unused Step 8 source metadata flag, `guardianReferenceRequired: true`, remains byte-for-byte preserved. It is explicitly documented as superseded resolver metadata, not current UX or an implemented input. Deleting it would not solve identity ambiguity; a future approved integration must reconcile it through an explicit contract change before use. No application/authentication source was changed.

## 11. Verification results

Executed existing authorization tests: **44 deterministic groups passed, exit 0**. Executed all five unchanged Admin/Teacher/Student/Parent/Accountant mock-data scripts: **all passed, exit 0**. These preserve role/credential metadata, policy assumptions and fictional data arithmetic. They do not prove old reference-based or new two-field authentication, actual credential verification, rate limiting, sessions, RLS or concurrency.

Validated local Markdown links/heading fragments, balanced fences, all twelve sequence blocks (one Student/eleven Parent), ordered 35-case matrix, seventeen report sections, current two-field/supersession notices and changed-document credential-material checks. Mermaid was structurally reviewed, not rendered by an engine. Source route inventory remains entry plus exactly five dashboards; no login/sixth dashboard added. No HTTP/browser test is claimed.

SHA-256 comparison against **277 pre-existing workspace files** outside dependency/generated/Git trees confirms changes only in the eighteen architecture files named above, no deletions, and exactly five new Markdown deliverables. All pre-existing application/auth source, dashboards, navigation, routes, package/lockfile, configuration, environment template, README, tests/build metadata and Steps 1–10 reports remain byte-for-byte unchanged. Lint/typecheck/build were not rerun because no source/configuration change required them.

## 12. Open security risks

Exact guardian identity is unresolved for approved multi-guardian fresh login. Collision/equality leakage, transactional cross-child resets/linking, key/database compromise, registration-scope lockout and recovery identity remain blockers. Low-entropy and phishing/shared-device risk, downstream session binding/linking, native MFA, revocation freshness, ordinary-token RLS/Storage and operational cost/support also require actual future evidence. No protected school records may rely on the current public previews or pure policy contracts.

## 13. Required owner decisions

No extra field or factor is requested to finish this task; current two-field UX is recorded as approved. For subsequent progress, owner/security review must explicitly decide whether to change an identifier requirement, permit independently verified additional evidence/interaction/enrollment, or change login-eligible guardian policy. Otherwise Parent authentication remains blocked. Six-digit residual-risk/security approval is separate from UX preference. Any novel two-input protocol would require formal specification and independent review before setup, not faith in provider extensibility.

## 14. Decision gate result

**C. BLOCKED** for the approved two-field multi-guardian Parent login. The [gate](docs/architecture/STEP-11-DECISION-GATE.md) evaluates all twelve requested criteria and defines evidence needed for any readiness upgrade. This is an evidence-based architecture outcome, not an abandoned assignment. Step 11 documentation/local verification is complete; no actual authentication integration is READY or enabled.

## 15. Smallest safe requirement change, if blocked

The smallest added identity information would be an explicit guardian-specific nonsecret identifier, but the additional field is currently rejected and is **not part of the design**. A two-field alternative could replace shared child registration with a unique guardian username, requiring explicit approval to change that requirement. If both visible field requirements must remain, approve genuinely independent cryptographic/possession evidence and disclose its extra enrollment/interaction/recovery; do not hide it as an unchanged flow. Alternatively, explicitly change to one login-eligible guardian per child and address lost independent access/custody consequences. None is adopted or sufficient by itself to approve six-digit production security.

If all changes are declined and no independently reviewed permitted resolver is established, keep the design blocked. Lengthening a PIN, asserting uniqueness, using an OIDC issuer or adding rate limits alone does not supply exact identity information or an acceptable resolver.

## 16. Confirmation of no external operations

Only official public documentation research and local non-destructive inspection/verification occurred. No Supabase connection/project, Keycloak/provider configuration, external account, real authentication, login page/server, PIN/hash/credential/token, environment secret, dependency install, SQL/migration, production mutation, deployment or Git operation occurred. No privileged credential was used. No live proof result is claimed.

## 17. Confirmation Step 12 has not started

**Step 12 has not started.** All provider, credential, schema/RLS, login UI, isolated proof and production setup remain unimplemented and require a separately authorized acceptable architecture/scope.
