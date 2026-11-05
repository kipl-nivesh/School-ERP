# Authentication options comparison — Step 9

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

Evaluate all four options for the current six-digit UX using the new proof comparison. Option A remains the first proof candidate, not production selection. Native B has no demonstrated safe arbitrary registration/six-digit session exchange; C needs explicit identity redesign; D remains a stronger alternative requiring owner approval.

This update takes precedence for the current UX and proof scope; it does not rewrite the historical findings below as a passed security proof. See [six-digit risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md), [controlled proof plan](STEP-10-AUTH-PROOF-PLAN.md), [security matrix](STEP-10-SECURITY-TEST-MATRIX.md) and [owner checklist](STEP-10-OWNER-APPROVAL-CHECKLIST.md). Exactly five roles and the existing Super Admin model are unchanged.

## Retained Step 9 analysis

Checked 2026-11-05. Status vocabulary: **Verified supported** = documented primitive, not an end-to-end school test; **Conditionally supported** = documented mechanism requiring named controls/approval; **Unverified** = exact behavior not established; **Unsupported** = no documented primitive for that exact use in the reviewed material. No option was implemented. Source IDs link to the dated [evidence register](STEP-9-AUTH-FEASIBILITY.md#evidence-register).

## Options and actual identity model

**A — OIDC provider through Supabase Auth.** Candidate recommendation for a controlled future proof. A reviewed IdP hosts the registration/PIN challenge and returns a stable subject through code-based federation. Supabase Auth handles its own downstream session. Staff stay native email/password. This preserves the existing Auth UUID/session model most closely, but family provisioning/linking and custom verifier remain unverified. Keycloak's extension model is a concrete candidate to investigate, not a ready implementation. [S01](https://supabase.com/docs/guides/auth/custom-oauth-providers), [S35](https://www.keycloak.org/docs/latest/server_development/index.html#_auth_spi).

**B — Native Supabase email/password with protected identifier mapping.** Native staff login is documented. A server could resolve a school identifier to an actual approved email identity and submit the supplied secret to native password verification; that composition is application logic, not a documented registration-number login API. A secure lookup would need exact role/identity resolution, generic responses, throttling, no browser-visible mapping and legitimate separately recoverable identities. Many children lack a suitable unique email. Shared guardian email/phone, fake aliases and copying PINs into native passwords do not solve this. A long numeric secret might satisfy configured native password rules, but remains subject to project-wide policy, bcrypt storage, reset and linking constraints; we do not recommend treating the proposed custom PIN verifier as native password authentication. Short PINs are not acceptable merely because a provider permits a low minimum. No custom-PIN-to-native-session exchange was verified. [S04](https://supabase.com/docs/guides/auth/passwords), [S05](https://supabase.com/docs/guides/auth/password-security).

**C — External JWT / third-party auth.** The IdP owns login and refresh; Supabase services consume its trusted JWT. This does not create a Supabase Auth session or automatically create Auth users. Existing profiles.id/Auth-user FK, session_id, assurance and revocation assumptions would need redesign around a protected issuer/subject mapping and provider session evidence. Cannot silently pass a different identity model into Step 8 types. [S02](https://supabase.com/docs/guides/auth/third-party/custom-oidc), [S03](https://supabase.com/docs/guides/auth/third-party/overview).

**D — Requirement change to native staff/family verified email/password, with optional stronger authenticator.** Explicit fallback if A cannot be proven affordably. Retain registration number only as a record selector, not a credential. Each guardian needs their own identity; children need an approved suitable unique identity and recovery plan. This changes approved family login fields and requires school approval; it is not adopted here. Native email/password primitives are supported; any additional authenticator and child provisioning/recovery must be separately validated. It avoids an unreviewed PIN bridge at the cost of product change. [S04](https://supabase.com/docs/guides/auth/passwords).

## Detailed matrix

| Criterion | A — OIDC via Auth | B — Native with mapping | C — External JWT | D — Approved UX change |
| --- | --- | --- | --- | --- |
| Official support | Verified supported federation; school composition Unverified | Verified supported native primitive; mapping Conditionally supported | Verified supported service integration; school composition Unverified | Verified supported email/password; family availability Conditional |
| Student registration + PIN | Conditionally supported by reviewed custom IdP; exact flow Unverified | Unsupported as direct native identifier/grant; composed mapping Unverified | Conditionally supported by reviewed IdP; exact flow Unverified | Unsupported under unchanged requirements; explicit UX change |
| Parent registration + own PIN | Same conditional custom flow | Same mapping/unique identity blocker | Same conditional custom flow | Changes to own email/password |
| Guardian disambiguation | Required guardian reference plus exact alias mapping | Required reference before server lookup | Required reference plus issuer/subject map | Unique guardian identity; still verify child links |
| Supabase Auth session | Verified supported flow; exact school binding Unverified | Verified supported after genuine native sign-in | Unsupported as an Auth session; external token only | Verified supported native sign-in |
| RLS | Conditional school policies on Auth UUID/session | Same | Conditional redesign, issuer/sub and session mapping | Same native model |
| MFA | Supabase native for staff; upstream family behavior must be proven | Native enrollment/challenge; policies custom | IdP MFA; trusted assurance translation Unverified | Native MFA; optional alternative factor separately validated |
| Refresh | Supabase session refresh; IdP lifecycle independent | Native refresh | External SDK/IdP; Supabase Auth refresh not applicable | Native refresh |
| Revocation | App live denial plus both-provider lifecycle work | App live denial plus native lifecycle | App live denial plus external session lifecycle | Same native lifecycle |
| PIN/password reset | IdP PIN reset + app invalidation; school control custom | Native reset is email-oriented; PIN workflow unresolved | IdP reset; app invalidation custom | Native recovery with school identity checks |
| Rate limiting | IdP credential + app alias/global + provider endpoints | App identity/global plus native endpoints; direct endpoints remain in scope | IdP credential/global plus app controls | Native endpoints plus app recovery/abuse controls |
| Operational complexity | High: two identity lifecycles, extension and app | Medium/high: identity inventory, mapping and recovery | High: external verifier, RLS/schema/context redesign | Lower technical complexity, significant school workflow change |
| Cost dependencies | IdP hosting/support, Supabase Auth usage, extension maintenance | Native Auth, legitimate identity/mail provision, app support | External IdP plus third-party MAU plan usage and redesign | Native Auth/mail, identity/device support |
| Free-tier feasibility | Prototype only if provider/config limits fit; unproven end-to-end | Native prototype plausible; school UX still unresolved | Hosted proof may be needed; custom OIDC CLI gap | Prototype plausible for consenting suitable test identities in later authorized scope |
| Production feasibility | Conditional on proof, operator and budget | Conditional; not selected for current PIN requirement | Conditional alternative with explicit redesign | Conditional on approved requirement change and child identity policy |
| Lock-in | Supabase downstream sessions; IdP subject/extension coupling | Native identities and account lifecycle | More portable external identity; Supabase policies still coupled | Native identities/recovery |
| Maintenance | Monitor IdP extension upgrades, provider linking and revocation | Keep mapping, identity changes and recovery synchronized | Maintain verifier/JWKS/claims/context compatibility | Maintain account and family recovery inventory |
| Principal risk | Wrong subject/link; IdP reset not ending downstream session | Alias workaround, shared email, weak secret, bypass of mapping limiter | Wrong issuer/audience/sub; stale token; assurance/session mismatch | Exclusion of children without suitable identity; recovery takeover |
| Implementation effort | High; proof required first | Moderate for staff, substantial/unresolved for family | High; new ADR and data model required | Moderate technical; high policy/UX effort |

No exact price or free-tier entitlement is promised. Recheck current [Supabase plans](https://supabase.com/pricing) and [hosting eligibility](https://vercel.com/docs/plans/hobby) after a provider and workload are approved. Open-source IdP software does not make hosting, patching, backup or incident support free.

## Selection criteria

Proceed with A only after the gate proves approved upstream subjects can bind uniquely without public signup, cross-role linking or privilege creation. Do not call a hook, JWT template or successful local policy evaluation a PIN-to-session bridge. If A fails, reassess C's redesign against D's explicitly changed UX. B remains a fair native capability assessment, not a hidden alias/password shortcut. Overall gate remains **B. CONDITIONAL — APPROVALS OR PROOF REQUIRED**.
