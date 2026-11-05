# Step 12 — Simplified Parent identity and local auth foundation

## 1. Executive summary

Completed the scoped local TypeScript foundation, deterministic tests and documentation updates. Three distinct outcomes:

- **LOCAL FOUNDATION COMPLETE**.
- **ISOLATED PROVIDER PROOF PENDING**.
- **PRODUCTION AUTHENTICATION NOT APPROVED**.

No real login, provider, Supabase client, database or production authorization was enabled. The owner's singleton policy removes the specific earlier multi-guardian selection ambiguity while preserving the Step 11 security finding as historical for that earlier scope. Step 13 has not started.

Initial inspection covered README, Steps 7–11 reports, all 31 existing architecture documents, auth library/tests, all five mock-data scripts, App Router, UI/dashboard source, package/lockfile, TypeScript configuration and environment template. Read installed Next.js data-security guidance before source changes. Identified the unused guardianReferenceRequired true flag and older multi-child/reference assumptions; no backend implementation was assumed from those documents.

## 2. Initial singleton Parent policy

One Student has at most one active explicitly provisioned login-eligible Parent. Each Parent login identity links to exactly one Student. Additional non-login guardian records are conceptually distinct and grant no login rights. Multiple children per Parent and multiple independently login-eligible guardians per Student are deferred; richer relationship/domain history is not deleted.

Student and Parent have different internal profile identities and distinct canonical issuer/subject bindings, independent credentials and method/role scope. Shared registration is only an identifier. Super Admin alone provisions/manages accounts and role grants; ordinary Admin cannot do so. Five primary roles and Super Admin within Admin remain unchanged, including mandatory Super Admin MFA and immutable audit/financial constraints.

## 3. Exact login requirements

Student: exactly Student Registration Number + six-digit Student PIN. Parent: exactly linked Student Registration Number + independent six-digit Parent PIN. No Parent Login ID, Guardian Reference/ID, extra username, third field or selection screen. Six-digit remote PIN security remains unapproved. No form/page was created. All six routes remain public fictional previews.

## 4. Files changed

New source files under `src/lib/auth/`: `input-contracts.ts`, `parent-identity.ts`, `authentication-flow.ts`. Updated `login-methods.ts` and `index.ts`; updated local auth README. Created `verification/verify-auth-foundation.mjs` and extended `verification/auth-type-contracts.ts`. Existing authorization/mock-data scripts are unchanged.

Created four Step 12 architecture documents and this report. Updated root README and 28 relevant older architecture documents with authoritative singleton-scope/supersession notes. Typechecking regenerated `tsconfig.tsbuildinfo`; production build artifacts remain generated. No dependency, package/lockfile, app route, UI feature, navigation, environment template or historical report was changed. Final new-file inventory is exactly nine files: three source modules, one verification script and five Markdown deliverables.

## 5. TypeScript contracts added/updated

Added strict input and school-policy contracts, exact PIN format validation, opaque complete Parent lookup input/interface, cardinality/state/version checks, nominal trusted identity/admission/credential/provider-session evidence, future adapter interfaces, categorical failure types and an ordered pure evidence assessment. No trusted evidence factory, lookup implementation, credential verifier or provider SDK exists.

The unused `guardianReferenceRequired` flag is now **false**, with `initialRelationshipPolicy: one-student-one-parent-login`. This explicitly corrects the earlier metadata mismatch. Existing generic role/permission/guardian-row functions remain intact for authorized future scope; the new initial resolver/evidence model applies the narrower login policy.

## 6. Registration-number validation

`normalizeRegistrationNumber` conservatively rejects empty/nonstring, control/non-ASCII/whitespace and excessive input, with a 128-character transport ceiling. It does not assume numeric registration, trim, case-fold or Unicode-normalize. A reviewed explicit school policy must provide identity, bounded maximum and deterministic exact-value acceptance; unknown/malformed/throwing policy denies. The real school format is unknown, and the synthetic test predicate is not a proposed production format.

Accepted registration is returned unchanged, preserving meaningful case/leading zeroes. Supporting other school formats needs explicit policy/contract review. Denial codes contain no entered values; future logging must avoid complete identifiers and use protected pseudonymous correlation instead.

## 7. Six-digit PIN format validation

`isSixDigitPinFormat` accepts only a string containing exactly six ASCII digits; leading zeros remain valid. It rejects letters, spaces/newlines, Unicode lookalikes, wrong lengths and nonstrings. No trimming, numeric conversion, reflection, storage or authentication occurs. `assessFamilyLoginInput` returns method/registration/policy metadata, never the PIN. Error output is static categorical data.

Verification uses deterministically constructed transient in-memory format vectors, not issued/assigned credentials or persisted PIN/hash fixtures. Test output/snapshots contain no entered PIN values. A regex/format pass does not improve entropy or establish identity.

## 8. Parent identity-resolution rules

`ParentIdentityLookup` declares a future lookup only. `resolveInitialParent` consumes a nominal complete trusted snapshot and yields `resolved_contract` metadata or denial. It checks registration binding, active Student/enrollment, complete/fresh snapshot/version, exactly one eligible candidate, active Parent, verified link, approved Super Admin provisioning, distinct identity, exactly one matching reverse Student scope and current relationship version.

Zero/multiple eligible Parents, missing bindings, duplicate/malformed records, revoked/pending/inactive states, withdrawal, stale versions, expired snapshot, wrong role/provisioner/Student and conflicting reverse eligibility deny. No PIN is passed to this resolver; no hash scanning, first selection or merging occurs. Source markers and completeness flags must ultimately come from actual protected server reads; no structural marker proves authority.

## 9. Authentication state machine

The ordered model checks input received → format accepted → trusted exact identity → durable attempt admission → credential evidence → session reference → verified session evidence → live role/context authorization. Each missing/rejected/invalid stage denies and cannot skip directly to grant.

The final result is **contract_access_granted**, not authenticated. It contains only stage labels and `liveAuthenticationEnabled: false`, with no identity, session, token or cookie. `LIVE_AUTHENTICATION_ENABLED` remains false; no route imports the new foundation. Compile-time assertions distinguish the result from `AuthenticationResult`.

Attempt/registration/role/profile/issuer/subject, credential reference/version, timestamps and live context/session IDs/versions are bound across stages. Parent additionally needs current live relationship version and explicit academic/fees purpose; fee-only scope does not grant academics. Synthetic success tests evaluate these assumptions only, never create a usable session.

## 10. Provider boundary

Future nominal interfaces cover provider subject, issuer/audience, cryptographic-verification evidence, session expiry/revocation, account/reset and role state, current identity/credential/context/relationship versions, durable admitted/rejected/unavailable attempts and approved credential outcomes. No implementation performs these operations.

Evidence source strings, brands and signature flags are **not runtime provenance or cryptography**. Never cast client JSON into them. A future server adapter must first verify the real provider/session and live protected school state. If OIDC feeds Supabase Auth, upstream subject → downstream Auth UUID/profile binding must be separately proven; filling a custom PIN result or external JWT into an interface does not create a native session. Fresh-login timing is modeled; actual refresh/continuation requires separate verified lifecycle integration.

## 11. Security test results

New foundation suite: **81 groups passed, exit 0**. Covers all requested PIN format, registration, unknown policy, singleton Parent/no/two/revoked/suspended/withdrawn/missing/stale/conflicting/wrong-role/provisioning cases, state evidence omissions/rejection/expiry/role/version, explicit synthetic contract success, fees-only purpose and sanitized result fields.

Original authorization suite: **44 groups passed, exit 0**, retaining five-role/Super Admin-exclusive IAM/MFA, active-role isolation, credential separation, guardian scope and immutable finance/audit tests. All five unchanged mock-data suites passed. Strict typechecking includes nominal-evidence/non-authentication compile-time assertions.

No actual credential/PIN verification, token issuance/verification, durable limiter, DB lookup/constraints/races, provider/session refresh/revoke or RLS test occurred. Synthetic metadata is not real family data or provider sessions. Passing tests cannot authorize production authentication.

## 12. Dashboard preservation

SHA-256 comparison against **282 pre-existing workspace files** outside dependency/generated/Git trees confirms all dashboard/features/layout/shared UI/navigation source, route implementations, role catalog, mock data, package/lockfile, configuration, environment template and Steps 1–11 reports unchanged. Only the documented auth source/tests/docs/status and generated build metadata changed; no deletions.

The Parent preview still displays its existing fictional two-child demo. It is deliberately separate from the new initial singleton backend policy; no mock relationship was added or altered to satisfy cardinality tests. All six production preview routes returned HTTP 200 and Brightcamp branding on localhost port 3006. No login route, middleware or sixth dashboard was added.

## 13. Existing architecture documentation updates

Created:

- [STEP-12-SIMPLIFIED-PARENT-IDENTITY.md](docs/architecture/STEP-12-SIMPLIFIED-PARENT-IDENTITY.md)
- [STEP-12-AUTH-CONTRACTS.md](docs/architecture/STEP-12-AUTH-CONTRACTS.md)
- [STEP-12-SECURITY-VERIFICATION.md](docs/architecture/STEP-12-SECURITY-VERIFICATION.md)
- [STEP-12-NEXT-INTEGRATION-GATE.md](docs/architecture/STEP-12-NEXT-INTEGRATION-GATE.md)
- `STEP-12-REPORT.md`.

Updated 28 relevant existing architecture documents: all Step 9 (seven), Step 10 (four) and Step 11 (four) deliverables; ARCHITECTURE-DECISIONS, AUTHENTICATION-PLAN, AUTHENTICATION-THREAT-MODEL, DATABASE-SCHEMA-BLUEPRINT, ERD, IMPLEMENTATION-ROADMAP, MOCK-TO-DATABASE-MAPPING, RISK-REGISTER, RLS-SECURITY-BLUEPRINT, ROLE-PERMISSIONS-MATRIX, STUDENT-PARENT-PIN-AUTH-DESIGN, SUPER-ADMIN-ACCESS-MODEL and SYSTEM-ARCHITECTURE. Superseded reference/multi-child/retain-true-metadata assumptions are marked historical. Step 11's earlier blocker is preserved, not falsified. Historical reports are byte-for-byte unchanged.

## 14. Remaining risks

Six-digit low entropy, distributed/low-and-slow guessing, offline verifier theft, shared devices/phishing, secure initial delivery/reset and staff impersonation remain unresolved. Trusted snapshot completeness/freshness, provisioning authority, reverse cardinality, concurrent reassignment/version checks and live revocation must be proven in actual storage/commands. Nominal evidence cannot guarantee any of these.

Provider selection, supported PIN verification, exact canonical session mapping, automatic identity linking, native privileged MFA, refresh/logout/reset/event reconciliation, durable throttling and ordinary-user RLS/private Storage remain unverified. Public previews must remain disconnected from protected school records. Richer guardian login expansion requires a new explicit policy and security design.

## 15. Next integration prerequisites

The [integration gate](docs/architecture/STEP-12-NEXT-INTEGRATION-GATE.md) requires approved real registration policy and credential delivery/recovery/risk decisions; named reviewed provider/credential/session capabilities; supported canonical binding and no-public-signup/linking controls; durable atomic abuse prevention; transactional current singleton reads/constraints; actual verification before trusted context; live account/relationship/role/RLS/Storage and session lifecycle tests; named custodian/operator, budget, isolated synthetic scope and cleanup approval. No setup is authorized by completing local contracts.

## 16. Verification commands/results

| Exact command | Exit code | Actual result |
| --- | --- | --- |
| node verification/verify-auth-foundation.mjs | 0 | 81 groups PASS |
| node verification/verify-auth-contracts.mjs | 0 | 44 groups PASS |
| node verification/verify-admin-data.mjs | 0 | PASS |
| node verification/verify-teacher-data.mjs | 0 | PASS |
| node verification/verify-student-data.mjs | 0 | PASS |
| node verification/verify-parent-data.mjs | 0 | PASS |
| node verification/verify-accountant-data.mjs | 0 | PASS |
| npm run lint | 0 | PASS |
| npm run typecheck | 0 | PASS |
| npm run build | 0 | PASS, webpack |

`npm run start -- --port 3006` started successfully; a read-only local Node fetch smoke check requested `/`, `/admin/dashboard`, `/teacher/dashboard`, `/student/dashboard`, `/parent/dashboard`, `/accountant/dashboard`: all 200 with brand present, smoke script exit 0. The preview was intentionally stopped afterward. Windows host process access was used for build/server/localhost verification. No UI changed, so no responsive/browser rerun is claimed.

Validated local Markdown links/fragments, report sections, current singleton/legacy flags/status consistency and allowed file preservation. Static inspection confirms new contract modules have local imports only and no service/cookie/token issuance calls; existing routes do not import them. No dependency install or external service test was performed. Mermaid state diagram was structurally checked, not rendered.

## 17. Confirmation of no external operations

No Supabase/project/provider connection/setup, external account, actual PIN/password/hash/credential/token, session cookie, SQL/migration, production record, secret environment file, dependency installation, deployment or Git operation occurred. New tests contain only in-memory unassigned format vectors and synthetic contract metadata, never credentials or usable sessions. No real authentication was enabled. Local production preview HTTP requests are not external backend operations.

## 18. Confirmation Step 13 has not started

**Step 13 has not started.** Local foundation is complete; isolated provider proof remains pending; production authentication is not approved. All real provider/database/session/RLS integration remains separately authorized future work.
