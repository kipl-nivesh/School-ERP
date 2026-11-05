# Student and Parent PIN authentication design — Step 8

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

The unused Step 8 guardianReferenceRequired metadata flag is preserved historical code, not current UX or a proven resolver. It must not be wired into a form; any future integration must first obtain an acceptable design and explicitly reconcile that obsolete contract detail.

## Retained earlier architecture — superseded where stated above

## Step 9 verified clarification — 2026-11-05

The [Step 9 feasibility review](STEP-9-AUTH-FEASIBILITY.md) retains a conditional outcome, not a verified school integration. Supabase documents automatic same-email identity linking, which must be addressed at the provider boundary as well as in app code; the exact no-cross-link workflow remains unverified. See the linked review's S08 evidence.

The tentative 10/12-digit policy below is retained as Step 8 history and **superseded as a release recommendation** by the [Step 9 PIN assessment](PIN-SECURITY-POLICY.md): remote reusable secrets are password-like; evaluate at least a 15-digit random numeric candidate or obtain approval for a stronger-factor/revised UX. No length is declared universally safe or fully NIST conformant. Exact IdP credential support, canonical subject binding, linking and session/revocation behavior remain proof gates. No auth contract or login method changed.

## Approved identity requirements

Super Admin, ordinary Admin, Teacher and Accountant use email/password. Super Admin additionally requires mandatory MFA. Only Super Admin provisions identities and privileges. Student uses registration number + Student PIN. Parent uses a linked child's registration number + a separate Parent PIN. Student and Parent credentials are independent even when the same registration number appears in both forms.

One canonical identity exists per guardian, with multiple dated child relationships; a child may have multiple guardians. Proposed secure disambiguation: the Parent form always also requires a school-issued guardian-specific nonsecret login reference. Resolve registration number + guardian reference + Parent method to exactly one approved identity and active relationship before credential verification. Never enumerate guardians, display candidate identities, or try the supplied PIN against multiple guardian hashes. A guardian can use any currently approved linked child alias; revoking that relationship invalidates that alias immediately, without duplicating the guardian identity or unnecessarily revoking access to other approved children. Each guardian has their own credential.

## Provider/session integration — unresolved release blocker

A custom PIN check does **not** create a valid Supabase Auth session. There is no implemented or approved custom token minting shortcut. The existing Auth UUID/profile/session_id architecture cannot treat a fabricated JWT, local cookie, boolean result or service-role token as an authenticated school user.

Preferred proposal to validate: a reviewed standards-compliant OIDC identity provider performs the role-bound registration/PIN login, then Supabase Auth uses its documented custom OAuth/OIDC provider flow. Supabase documents PKCE, discovery/JWKS and optional email for these providers. This offers a supported path to investigate without inventing email aliases or using PINs as email passwords. See [Supabase custom OAuth/OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers).

Before choosing this path, prove all of the following in an isolated future integration: provider suitability for low-entropy secrets; Super Admin-only upstream provisioning; stable issuer/subject bound uniquely to an approved canonical profile; supported binding to the intended Supabase Auth identity; handling of provider first-login Auth-user creation without granting unauthorized application accounts; rejection of unapproved subjects; no automatic identity linking by email; real callback, refresh, logout, MFA and revocation behavior; genuine Auth UUID and session_id availability. Exact preprovisioning/binding behavior is unresolved, so no adapter is implemented now. Public signup restrictions alone are not proof that OAuth first-login provisioning is safe.

Supabase's separate [third-party custom OIDC integration](https://supabase.com/docs/guides/auth/third-party/custom-oidc) trusts external access tokens and is a different architecture, not a Supabase Auth-session creation API. Non-UUID subjects and issuer/subject mapping would require explicit schema/RLS redesign. Do not silently substitute it for the preferred proposal. Staff email/password uses the supported Supabase Auth flow in a later step; no provider/project is connected here.

## Proposed PIN policy — approval and benchmarking pending

Use independently generated random numeric secrets: proposed minimum 10 digits, preferably 12 (approximately 33 and 40 bits respectively). Four-to-six-digit standalone PINs are not an acceptable release default without a separately reviewed possession factor and risk decision. Hashing cannot add entropy. Never derive/copy Parent PINs from Student PINs, registration numbers, birthdays or phone numbers. Independently bind each credential ID, salt and verifier to canonical identity and login method; rotation of one credential does not silently replace another.

The reviewed credential provider must use salted memory-hard hashing such as Argon2id, benchmarked against service capacity and abuse resistance. OWASP's current minimum is 19 MiB, two iterations and parallelism one; a stronger proposed benchmark target is 64 MiB/three iterations where operationally sustainable. Fast SHA hashing, reversible encryption as the sole verifier, plaintext storage, browser comparisons and logging secrets are prohibited. See [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). This step implements no hashing or PIN verification.

Apply persistent atomic throttles per normalized role/identity and trusted client IP, plus aggregate credential-stuffing controls before expensive hashing. Proposed starting policy: five failed attempts per 15 minutes with progressive cooldown up to 30 minutes; review denial-of-service and accessibility effects. Use keyed pseudonymous limiter identifiers, never a PIN in a key or log. Trust proxy-derived IP only from configured infrastructure. Unknown and known identities get the same generic response shape, no guardian/registration hints and bounded dummy verification to reduce enumeration/timing differences. Test rate limits and concurrency against real infrastructure later.

## Issuance, recovery and revocation

Only Super Admin initiates issuance/reset after verified identity/guardianship review, MFA and recent reauthentication. Initial secrets require a school-approved confidential delivery channel, short expiry, one-use activation and forced reset before protected data access. Never put PINs in repository fixtures, URLs, analytics, ordinary logs or default email plaintext. Store no secret in application profile tables or Storage buckets.

Recovery revokes old credential versions and affected sessions/contexts; reset does not create a guardian link or grant a role. Recheck relationship and account status on every data request. Court restrictions and guardian-link revocation take effect through live policy and version invalidation, including existing sessions. Parent selection of a child in a dashboard is a query scope, never evidence of guardianship.

## Local implementation and deferred UI

`src/lib/auth/login-methods.ts` defines distinct method metadata and credential-binding compatibility only. A successful binding check is not a successful PIN check. No function issues a session or returns a newly authenticated identity. Login forms and redirects are deferred; all five existing previews are unchanged. Future shared login UX must preserve the registration-number field, separate Student/Parent method, always-present Parent guardian reference, generic errors, accessible recovery and mandatory Super Admin MFA. Production remains blocked on the integration proofs above.
