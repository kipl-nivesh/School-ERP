# Student and Parent login sequences — Step 9

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

The current selected Student and Parent secret UX is six numeric digits, independently role/identity-bound. The new proof sequences explicitly include durable atomic attempt reservation and current alias/state checks. Guardian reference is required for this exact-resolution design but the added field needs school approval; without approval, defer Parent proof or review an equally exact alternative.

This update takes precedence for the current UX and proof scope; it does not rewrite the historical findings below as a passed security proof. See [six-digit risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md), [controlled proof plan](STEP-10-AUTH-PROOF-PLAN.md), [security matrix](STEP-10-SECURITY-TEST-MATRIX.md) and [owner checklist](STEP-10-OWNER-APPROVAL-CHECKLIST.md). Exactly five roles and the existing Super Admin model are unchanged.

## Retained Step 9 analysis

Design only, checked 2026-11-05; no form, account or session was created. These sequences describe **candidate A after future proof**, not existing endpoints. Participants name responsibilities; arrows are not invented API names. The supported federation and native session primitives are in [S01/S09/S12](STEP-9-AUTH-FEASIBILITY.md#evidence-register); unresolved steps are explicit below.

## Student sequence

Fields: **Student Registration Number**, **Student PIN**. The approved provider-hosted form may follow an app redirect. No PIN appears in a URL, OAuth login hint, analytics or log.

```mermaid
sequenceDiagram
    actor Student
    participant Browser
    participant App as Next.js server
    participant Auth as Supabase Auth
    participant IdP as Reviewed identity provider
    participant DB as PostgreSQL and RLS
    Student->>Browser: Choose Student login
    Browser->>App: Begin allowlisted login flow
    App->>Auth: Supported OAuth code flow with PKCE
    Auth->>IdP: Protected authorization request
    Student->>IdP: Registration number and Student PIN over TLS
    IdP->>IdP: Normalize identifier; throttle; exact Student identity lookup
    IdP->>IdP: Verify role-bound credential and active account; enforce reset
    alt Invalid, unknown, throttled or inactive
        IdP-->>Browser: Generic failure without identity hints
    else Approved identity and credential
        IdP-->>Auth: Authorization code bound to request
        Auth->>IdP: Supported code exchange and ID-token validation
        Auth->>Auth: Approved subject binding gate must be proven
        Auth-->>App: Downstream callback code
        App->>Auth: Supported PKCE code exchange
        Auth-->>App: Genuine Auth session
        App->>Auth: Verify provider token/current user as required
        App->>DB: Resolve approved profile, live status and Student membership
        App->>DB: Establish protected session-bound Student role context
        App->>DB: User-JWT request with own-record RLS
        DB-->>App: Authorized minimal records
        App-->>Browser: Safe session response and Student dashboard
    end
```

1. Normalize registration as a bounded string using a school-approved ASCII format and explicit case rule; trim surrounding whitespace only if policy permits, preserve significant leading zeroes, reject invisible/confusable characters and never parse as a number. Enforce uniqueness at issuance; do not guess admission-number equivalence.
2. Resolve exactly one preapproved canonical Student subject under the Student method. Unknown identifiers follow bounded dummy work and generic response behavior. Rate-limit by role/identity, trusted IP and aggregate attack budget before expensive verifier work. The IdP must obtain timely authoritative school status; stale caches must fail closed within an approved bound.
3. Verify the Student credential at the reviewed IdP. Check active provisioning intent, account status, credential version and reset requirement before normal login can complete. First-use credential change occurs in a restricted provider workflow; no dashboard data before completion.
4. Perform both supported code-flow legs. Provider signature validation is necessary but not sufficient: the subject must belong to the exact approved school identity. Prove controlled first-login Auth-user creation or supported prebinding; no automatic role grant or unknown-subject application profile. This is a gate blocker, not an implemented callback.
5. Server validates actual issuer/audience/signature/time/session evidence, then resolves current account/version and only the Student membership. Bind canonical Auth UUID/session_id to protected role_context. RLS requires own Student link and permitted published records; a registration string or requested route is not authorization.
6. Refresh through the downstream Auth lifecycle using response-capable request-scoped clients; reread live school status/context on protected requests. IdP cookies and Supabase sessions have independent lifetimes. A provider reset/disable must propagate school version/context revocation and supported provider invalidation; test old access and refresh tokens.
7. Logout is a same-origin protected mutation: revoke app context, request explicit Auth signout scope, clear cookies/private state. If logout must also prevent immediate IdP SSO reuse, define and test IdP logout/forced reauthentication separately. No claim that downstream logout automatically clears upstream SSO.
8. Super Admin-only reset follows verified offline identity review and approved confidential one-use delivery. Rotate Student credential version, revoke old sessions, enforce first change, audit metadata only; never grant Parent access during recovery.

## Parent sequence and guardian reference

Fields: **Linked Student Registration Number**, **Guardian Login Reference**, **Parent PIN**. The nonsecret reference is necessary in this design to select exactly one guardian when multiple people share a child. It must be always present, opaque and school-issued; do not reveal guardian names or show a candidate picker after a registration lookup. Shared phone/email cannot disambiguate guardians. School approval is required for the added field wording, accessibility, issuance/replacement and help process before real UI implementation.

```mermaid
sequenceDiagram
    actor Parent
    participant IdP as Reviewed identity provider
    participant Auth as Supabase Auth
    participant App as Next.js server
    participant DB as PostgreSQL and RLS
    Parent->>IdP: Linked-child registration, guardian reference, own PIN
    IdP->>IdP: Normalize identifiers; throttle; resolve one Parent subject
    IdP->>IdP: Require current approved child alias and guardian relationship
    alt No exact active identity/link or failed credential
        IdP-->>Parent: Generic failure, no guardian list
    else One exact approved guardian
        IdP->>IdP: Verify only that guardian's Parent credential
        IdP-->>Auth: Supported code-flow result
        Auth->>Auth: Enforce proven subject binding and linking controls
        Auth-->>App: Genuine downstream session via supported callback
        App->>DB: Resolve guardian profile and active Parent context
        App->>DB: User-JWT query for currently authorized children
        DB-->>App: Purpose-scoped child projections
        App-->>Parent: Parent dashboard with authorized children
        Parent->>App: Select another child
        App->>DB: Recheck exact guardian link and purpose under RLS
        DB-->>App: Only authorized child data or denial
    end
```

Parent normalization follows the same bounded registration rules; guardian reference has a separately defined canonical alphabet/case policy. PIN is compared exactly under provider policy, never trimmed, numerically converted or reused across methods. The IdP must check the chosen child alias even when an upstream SSO cookie exists. A remembered session may open the guardian's currently allowed dashboard directly, but must not treat an arbitrary new child alias as approved. Do not try a PIN against multiple guardians.

| Mandatory case | Required behavior and future evidence |
| --- | --- |
| One parent, one child | One guardian subject, one dated link, own Parent credential; exact resolution test |
| One parent / guardian, multiple children | One subject and credential, multiple approved aliases; any active alias logs into same guardian; dashboard lists only current approved links |
| Two guardians, one child | Different references, subjects and credential IDs; never shared PIN or hash scan |
| Relationship revoked | That login alias and subsequent related queries deny; invalidate affected context/version promptly; other approved child links can remain accessible |
| Student transferred/withdrawn | End login-alias eligibility by default; live status check prevents new use; historical-record access requires an explicit dated policy and a permitted login path, not automatic deletion of history |
| Parent PIN reset | Super Admin-controlled identity review; rotate that guardian's credential, revoke sessions, forced change; no sibling identity duplication or child-PIN reset |
| Guardians share phone | Phone is contact metadata only; never an identity merge, unique login reference or sufficient recovery proof |
| Unauthorized child request | Server and direct RLS denial even when browser edits selected child or sends another registration number |
| Same person is staff and guardian | No automatic email merge; exact approved identity policy must demonstrate family/staff isolation and active-role behavior before any linking |

Parent refresh/logout/recovery use the same lifecycle controls as Student, applied to the independent guardian subject and all its contexts. Reset of one guardian must not reset another guardian or any Student secret. Relationship changes may require broad guardian-session invalidation to prevent stale access; the remaining permitted children can be restored under a fresh context. No production SSO, refresh, reset or relationship behavior has been tested.
