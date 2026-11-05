# Step 10 — Controlled authentication proof plan

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

Date checked: **2026-11-05**. **Design only; not executed.** Gate: **CONDITIONAL**. This plan defines the future scope to approve after the outstanding decisions below; it neither configures a provider nor authorizes external setup. Production authentication remains unapproved. [Risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md), [test matrix](STEP-10-SECURITY-TEST-MATRIX.md), [owner decisions](STEP-10-OWNER-APPROVAL-CHECKLIST.md).

## Current state and unchanged requirements

Read README, Steps 7–9 reports, all twenty-three existing architecture documents, all auth library files, both authorization verification files, routes, package/TypeScript configuration and mock-data verification scripts. Existing code consists of isolated policy contracts; it has no PIN verifier/format validator, real session adapter, provider client, login route, SQL or migration. Six application routes including entry page remain public fictional previews. Exactly five dashboard roles remain Admin, Teacher, Student, Parent and Accountant. Super Admin is a tier within Admin using native email/password plus mandatory MFA; only Super Admin provisions accounts and manages grants. Ordinary Admin/Teacher/Accountant use email/password; no public signup or sixth dashboard.

Selected UX: six-digit independent Student and Parent remote PINs. Guardian reference is necessary for this proposed exact-resolution strategy but its added field still requires school approval. A reference is not a secret/factor or evidence of guardianship. One guardian has one canonical identity across children; each guardian has a separate credential. No Step 8 application contract requires changing to document this preference.

## Provider feasibility and comparison

Official capabilities were rechecked 2026-11-05. Verification status applies to a primitive, not this entire school flow.

| Option | Six-digit UX / session / RLS | Complexity, cost, maintenance and recovery | Assurance and required proof |
| --- | --- | --- | --- |
| **A — Custom OIDC via Supabase Auth; preferred proof candidate** | Custom trusted IdP challenge could preserve fields; downstream genuine Auth session retains native UUID/session-based RLS model | High: IdP hosting, reviewed extension/limiter, two lifecycles, patching, mail/recovery and support; quotes pending | Federation documented; exact school credential module, atomic limits, approved subject binding and reset-to-downstream revocation unverified |
| B — Native Auth plus protected identifier mapping | Native password API expects email/phone; no documented arbitrary registration/PIN grant; composition may require suitable actual unique identities and numeric policy | Medium/high family mapping/recovery burden, native provider costs and mail; managed bcrypt is not configurable custom Argon2 | Do not weaken password policy to force six digits, invent aliases, share guardian email, or reuse supplied PIN as a shortcut; not selected |
| C — External JWT with explicit identity redesign | Trusted external access token can reach services; does not create native Auth session; issuer/sub/context/RLS model must change | High: external SDK/session/recovery, custom mapping/helpers, third-party usage costs and key lifecycle | Requires new approved ADR/contracts and verified audience/assurance/session/revocation semantics; no casting external claims into current native types |
| D — Stronger credential or additional-factor UX | May reduce guessed-PIN risk or replace remote secret entirely; session/RLS depend on chosen supported mechanism | Device/enrollment/recovery/support costs and changed UX; may reduce custom code with suitable native mechanism | Requires explicit owner approval and independent device/factor proof; six remote digits plus MFA is not full NIST length conformity |

Documented basis: [Supabase custom OAuth/OIDC](https://supabase.com/docs/guides/auth/custom-oauth-providers) supports federation and email-optional providers, not a school PIN verifier; [external OIDC](https://supabase.com/docs/guides/auth/third-party/custom-oidc) supports a different token model, with non-UUID subject and CLI constraints; [native passwords](https://supabase.com/docs/guides/auth/passwords) and [password security](https://supabase.com/docs/guides/auth/password-security) describe native identity/policy/storage. [Keycloak Authentication SPI](https://www.keycloak.org/docs/latest/server_development/index.html#_auth_spi) permits custom authenticators and credentials, but warns of internal SPI compatibility changes. None proves exact six-digit school login out of the box.

**Required candidate provider:** a standards-compliant OIDC service with an audited role-bound six-digit credential module, protected registration/guardian alias resolver, durable atomic limiter and supported reset/revocation events. **Named first evaluation target: Keycloak**, pinned supported release to be chosen and reviewed before setup. No version/extension has been approved or built. A custom browser authenticator alone is insufficient: credential storage, all alternate login routes, SSO cookies, direct grants, recovery and administrative functions must obey the same identity and abuse rules. Disable unsupported alternate flows rather than leaving bypasses. No provider account/realm/client was created.

## P0 — Decisions before external setup

1. School/security owners approve a **synthetic-only experiment**, not production six-digit risk acceptance; decide guardian-reference wording and mandatory presence, initial-secret/change/delivery policy and optional-factor arm.
2. Name provider release, extension owner and reviewer; choose provider-supported hashing/credential store and limiter backend with transactional semantics. Define exact attempt budgets, campaign limits, cooldowns, trusted-proxy rules, failure mode and abuse/load ceilings. Current five-failure/15-minute and 30-minute cooldown ideas are experiment candidates, not accepted controls.
3. Prove on paper a supported provisioning/canonical-binding workflow or obtain vendor clarification, especially trusted issuer/sub availability before Auth-user creation and identity-link behavior. A before-create hook might help, but do not assume it exposes enough verified identity data.
4. Approve named operator/reviewer, infrastructure identifiers to create, permitted region, cost cap, expiry, synthetic fixture counts, cleanup ownership and isolation verification. No production secrets, projects, users or school records may be accessed.
5. Approve measurable security freshness targets and test tolerances. Proposed proof target: app-owned suspension/link/grant changes deny any request that begins after the authoritative transaction commits; an already-started read may complete, but writes recheck under lock/version before commit. Proposed out-of-band provider-event propagation target: at most 60 seconds with fail-closed stale-state handling. These targets need owner/engineering approval and measured evidence, not a guarantee.

Unresolved P0 items keep the Step 10 gate CONDITIONAL. Do not start a provider build or request credentials to complete this documentation task.

## P1 — Isolated environment specification (future only)

| Component | Required future configuration / evidence |
| --- | --- |
| Resources | Dedicated nonproduction Supabase project and provider realm/instance/client; protected test hostname; distinct ownership/region; no production resource linking |
| Provider | HTTPS issuer/discovery and asymmetric signing/JWKS; stable immutable subjects; exact callback/client; authorization-code flow with PKCE/state/nonce; no password-grant shortcut, public signup or unrestricted self-service identity changes |
| Supabase Auth | Custom OIDC provider with strict issuer/client/callback; deliberate family email-optional behavior; explicit signup/approved-creation control; review manual/automatic linking, no anonymous entry; native staff email/password/MFA |
| Subject gate | Protected approved provisioning intent maps issuer/sub to one canonical school identity; bind exactly one actual Auth UUID through documented behavior; no email/name/phone-only merge; unknown subjects fail before unauthorized Auth/application creation |
| Callback/server | Both code-flow legs use supported APIs, exact redirect allowlists and replay protection; verify actual project issuer/audience/signature/times/subject/session before creating trusted context; no token issuer or PIN-success cookie |
| RLS/Storage | Future reviewed schema/policies and private test bucket, ordinary authenticated-user JWT access; default deny until context exists; scoped row and file projections; no service-role success counted as evidence |
| Limiter | Dedicated durable shared backend; atomic attempt reservation and identity-wide/method-specific budget across aliases/nodes; global/IP controls; fail closed on unavailable/uncertain state; no PIN in keys/logs |
| Observability | Sanitized event IDs, canonical pseudonymous actor/target, reason code, version, timing and reviewer; access-controlled evidence retention; no raw requests, secrets, hashes or tokens |
| Staff/MFA | Native test staff identities and bounded privileged primary/recovery custodians provisioned only under approved ceremony; actual native factor enrollment/challenge and server/RLS aal enforcement |
| Hosting/secrets | Protected staging origin, environment-specific secret vault, no production variables, no wildcard callback previews; no privileged key in browser or ordinary data requests |

No deployable SQL, config file, endpoint implementation or command is included. Local CLI parity for all custom-provider behavior is not established; external custom OIDC lacks CLI support. Hosted proof, if needed, requires explicit owner authorization and a capped scope.

### Synthetic identity and row structure

Logical labels only, **not created accounts or credentials**: two Students S-A/S-B; guardian G-A linked to both; guardian G-B also linked to S-A and sharing a contact-phone fixture with G-A; unlinked guardian G-C; a withdrawn Student projection; ordinary Admin, Teacher, Accountant and privileged primary/recovery Admin tier projections. Variants for suspended/disabled, revoked/expired membership, reset-required and expired activation credential may reuse bounded fixture records under a documented reset procedure.

Use opaque provider subject and school profile IDs generated only inside the authorized proof, not registration as sub. Independent Student/guardian credential references must remain separate even if random values happen to coincide. Two child aliases for G-A must resolve to the **same** guardian subject and limiter budget; two guardians for S-A must resolve to **different** subjects and verifier records. Shared phone is never a key. Synthetic row sets include own/unrelated Student results, published/unpublished records, dated Teacher assignments, purpose-restricted guardian links, finance drafts/final facts, immutable audit events and private allowed/forbidden file manifests. No real enrollment, legal evidence, money movement or production files.

Future secrets must be issued only inside the isolated trusted credential boundary after authorization, never entered in repository fixtures/reports, captured in screenshots or exported to this workspace. A proof credential-generation procedure is future work; no PIN/password is generated in Step 10.

## P2 — Student login sequence and evidence

```mermaid
sequenceDiagram
    actor Student
    participant IdP as Trusted test provider
    participant Limiter as Durable atomic limiter
    participant Auth as Test Supabase Auth
    participant Server as Next.js proof server
    participant DB as Test PostgreSQL with RLS
    Student->>IdP: Registration and six-digit Student PIN over TLS
    IdP->>IdP: Bound format and normalize identifier; resolve exact approved Student
    IdP->>Limiter: Reserve identity/method attempt plus IP/global budget
    alt Denied, unknown, wrong secret or inactive account
        IdP-->>Student: Generic response; no session
    else Attempt admitted
        IdP->>IdP: Verify only exact credential; recheck state/version and reset status
        IdP-->>Auth: Supported authorization-code result
        Auth->>Auth: Validate provider; enforce approved subject binding
        Auth-->>Server: Supported downstream code callback
        Server->>Auth: Supported PKCE exchange and actual session verification
        Server->>DB: Resolve live profile, membership and session-bound Student context
        Server->>DB: User-JWT own-record query under RLS
        DB-->>Server: Authorized safe DTO or denial
        Server-->>Student: Protected result only after all gates
    end
```

The order reserves attempt capacity before expensive verification, uses bounded dummy handling for unknown identities and rechecks active account/credential version before issuing authority. PIN format is exactly six ASCII digits as a string; no numeric conversion, trimming or Unicode-digit acceptance. Registration normalization is bounded school-approved text preserving leading zeroes; no admission-number guess. Equal generic wording is not proof of timing resistance.

Evidence must include successful approved Student sign-in with actual provider/Auth identities and a real verified session, plus incorrect PIN, invalid identifier, suspended account, repeated attempts, stale membership, forged/substituted session and unrelated-row denial. A generic `allowed` unit-test result is not a successful login. Normal dashboard access must be denied while activation/reset is incomplete; permitted credential change occurs only in a restricted reviewed provider flow.

## P3 — Parent login and exact guardian identity

```mermaid
sequenceDiagram
    actor Guardian
    participant IdP as Trusted test provider
    participant Limiter as Durable atomic limiter
    participant Auth as Test Supabase Auth
    participant Server as Verified server boundary
    participant DB as Live test relationships and RLS
    Guardian->>IdP: Child registration, approved guardian reference, own six-digit PIN
    IdP->>IdP: Resolve one guardian and current approved child alias
    IdP->>Limiter: Canonical guardian/method budget across every child alias
    IdP->>IdP: Verify only resolved guardian credential; recheck link/state
    IdP-->>Auth: Supported code flow after approved identity checks
    Auth-->>Server: Genuine downstream session through supported callback
    Server->>DB: Verified Parent context; query current authorized children
    DB-->>Server: Only permitted child projections
    Guardian->>Server: Select child or request file/data
    Server->>DB: Recheck exact live guardian link, purpose and version
    DB-->>Server: Authorized projection or denial
```

The guardian reference is **required by this candidate design**, subject to school field approval. If that approval is withheld, stop the Parent proof or obtain a different equally exact resolution design; never drop the field and try PIN hashes to identify a guardian. Do not show guardian names or candidate lists during lookup. A valid provider SSO cookie cannot bypass selected child-alias checks or switch canonical guardian identity.

| Required case | Expected result |
| --- | --- |
| One guardian, one child | One exact subject/link and own credential; only approved purpose fields |
| One guardian, multiple children | Same subject through either approved alias; shared guardian attempt budget; current allowed child list only |
| Two guardians, one child | Different references/subjects/verifier records; no hash scan and no automatic sharing |
| Shared phone numbers | No merge, shortcut or contact-only recovery; references remain distinct |
| Revoked relationship | New use of that child alias and subsequent related queries/files denied; live context/version invalidation measured; other links independently evaluated |
| Withdrawn Student | Alias eligibility ends by default; any historical access needs explicit dated policy and valid alternative login path |
| Parent PIN reset | Revoke only that guardian's credential/context authority; forced reset as approved; no Student/other-guardian credential change |
| Unauthorized child selection | Server and direct RLS/Storage paths deny regardless of UI selection |

## P4 — Session, MFA, revocation and authorization tests

Record approved issuer/sub → actual Auth UUID/profile/session binding without exporting tokens. Test new callback, replay, refresh rotation, logout scopes, session fixation, wrong issuer/audience/algorithm/key, expired token, stale context, direct API/Storage requests, concurrent state changes and same-email/manual linking. No automatic upstream MFA-to-native aal2 assumption. Super Admin uses genuine native MFA; test aal1 denial on server/API/RLS and independent approvals/last-admin races. The school's Admin tier is not a Postgres service role.

Auth refresh and IdP SSO are separate lifecycles. IdP reset/disable must revoke school versions/contexts first through an authenticated event or authoritative workflow, then reconcile provider lifecycle operations. A missed webhook cannot indefinitely preserve access: define reconciliation and maximum evidence age; deny when freshness cannot be established. Test old access and refresh tokens after logout/reset/suspension/link change and after IdP event-delivery failure. Ordinary-request user JWTs must remain under RLS. Supabase documents access-token validity to expiry after signout, so native signout alone cannot prove immediate school denial. [Signout semantics](https://supabase.com/docs/guides/auth/signout), [MFA enforcement](https://supabase.com/docs/guides/auth/auth-mfa), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), checked 2026-11-05.

## P5 — Pass/fail, stop conditions and evidence package

A future proof passes **technical feasibility only** when every applicable matrix test has recorded expected/actual result, named reviewer, provider/SDK/version/configuration, repeatable sanitized procedure, time bounds and explicit limitations. Required: exact canonical binding with no unapproved creation/link, independent role credentials/guardian resolution, real session/MFA/refresh lifecycle, atomic sustained abuse limits under concurrency/restart, fail-closed stale/outage behavior and ordinary-token RLS/Storage isolation. All approval-dependent thresholds must be fixed before measurement. Missing data is not a pass; an observed unexpected authority grant fails immediately.

Stop on any production resource/record/secret exposure, unapproved signup, guardian/Student cross-access, unsafe linking, lost counter durability, unsupported credential/session exchange, privilege bypass, unverifiable native MFA or spend/abuse ceiling breach. Quarantine evidence, revoke proof authority, halt traffic and notify the approved owner through the agreed operator process. No messages are sent by Step 10.

Keep failed tests visible and retest only after a reviewed fix. A pure policy pass, service-role query, successful happy-path login, screenshot or absence of observed guessing success cannot establish production safety. Even a passed proof leaves six-digit-only residual risk requiring a separate school/security decision and production controls review.

## P6 — Cleanup, rollback and closure

Before starting, inventory every authorized test resource and owner, lifecycle deadline, retention and deletion criteria. Cleanup must revoke all proof sessions/contexts/keys, disable provider/client callbacks and any temporary bootstrap/provisioning access, remove only inventoried synthetic identities/data/files/configuration, and delete/decommission isolated resources when approved. Export only sanitized results; destroy transient credential material and secret-bearing test logs; verify no surviving callbacks, identities, billing resources or production links. Never point cleanup/migration tools at an inferred project target. Two-person target confirmation is part of the future operator runbook.

Rollback means stop the isolated proof and restore only the approved test baseline under isolation; do not apply experimental migrations to the ERP or production. Restored grants/contexts must be reconciled and old sessions invalidated before reuse. Owner signs off cleanup and residual billing/retention. No cleanup/deletion operation is performed now because no resources exist from Step 10.

## Decision gate

**CONDITIONAL**: credible proof architecture and detailed tests exist, but mandatory guardian-reference approval, provider/release/credential module, exact subject creation/binding, limiter backend/budgets/failure semantics, event freshness, proof cost/custodians and optional-factor policy remain decisions. Once P0 is completed, the plan can be presented as READY FOR ISOLATED PROOF to request explicit setup authorization. That future status would still not approve production six-digit authentication. Step 11 has not started.
