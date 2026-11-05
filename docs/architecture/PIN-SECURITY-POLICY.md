# PIN security policy assessment — Step 9

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

Six digits is now the selected UX preference; the fifteen-digit numeric candidate is superseded as preferred UX and retained only as a stronger risk-comparison option. Six-digit-only remote authentication remains unapproved for production. The earlier standalone rejection/security concerns below are historical security findings, not a claim that the new UX preference is forbidden or approved. Controls reduce some risks but cannot remove low entropy; even adding MFA does not satisfy the cited remote-password length baseline for six digits.

This update takes precedence for the current UX and proof scope; it does not rewrite the historical findings below as a passed security proof. See [six-digit risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md), [controlled proof plan](STEP-10-AUTH-PROOF-PLAN.md), [security matrix](STEP-10-SECURITY-TEST-MATRIX.md) and [owner checklist](STEP-10-OWNER-APPROVAL-CHECKLIST.md). Exactly five roles and the existing Super Admin model are unchanged.

## Retained Step 9 analysis

Checked 2026-11-05. **Proposed school policy, not implemented or approved.** No PIN or password has been generated. This assessment supersedes the Step 8 tentative 10-digit minimum/12-digit preference as a release recommendation. The login-method contracts remain unchanged.

## What the secret is

A reusable secret sent to a remote verifier is password-like even if the UI calls it a PIN. A registration number and guardian reference are identifiers, not additional factors. NIST SP 800-63B-4 distinguishes this from a locally retained authenticator activation secret; its single-factor password baseline is 15 characters, with eight permitted only within MFA. These are guidance inputs, not a certification of this school or numeric-only policy. [NIST guidance](https://pages.nist.gov/800-63-4/sp800-63b.html).

Candidate for school review: **at least 15 randomly generated ASCII decimal digits** for a standalone reusable numeric family secret, exact string handling with significant leading zeroes, rejection of common/compromised patterns and explicit accessibility/password-manager support. This is not a universal safe length. A numeric-only restriction also differs from the broader character acceptance recommended for general passwords; do not describe this proposal as full NIST conformity. If that burden is unsuitable for children/guardians, change the approved authentication design to a stronger possession-based method or longer general password after school review. Do not silently shorten the secret or count two knowledge fields as MFA. Short local-device PIN rules cannot justify short remote school secrets.

| Random numeric length | Search space | Approximate entropy | Assessment |
| --- | --- | --- | --- |
| 4 | 10^4 | 13.3 bits | Reject as standalone remote credential |
| 6 | 10^6 | 19.9 bits | Reject as standalone remote credential |
| 10 | 10^10 | 33.2 bits | Prior tentative proposal; not production approved |
| 12 | 10^12 | 39.9 bits | Prior tentative proposal; not production approved |
| 15 | 10^15 | 49.8 bits | New candidate requiring provider, abuse and usability proof |

Entropy is calculated as length × log2(10), assuming unbiased independent random digits. Human-chosen birthdays, repeated digits, reused family secrets and leaked credentials have much less effective unpredictability. A slow hash cannot increase this search space. Offline hash theft and distributed online guessing require separate defenses.

## Verifier storage and provider constraints

Under candidate A, the reviewed identity service owns secret generation/verification/reset. Require separate credential IDs and independent salted verifiers for Student and each guardian; canonical issuer/subject and selected method bind exactly one verifier. PINs must never appear in app profile tables, Storage objects, browser state after use, analytics, traces, rate keys, URLs or ordinary audit logs. App metadata records only external credential reference, method, identity, state and version.

Prefer a benchmarked memory-hard scheme under the provider's supported extension model. OWASP gives Argon2id 19 MiB/two iterations/parallelism one as a minimum baseline; test a stronger 64 MiB/three-iteration candidate against real peak load and denial-of-service controls. An optional pepper belongs in separately controlled key storage/HSM, not beside hashes; lost/compromised pepper needs a documented reset/rotation plan. Do not add unsupported application pepper wrapping to managed native Auth. [OWASP storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Native Supabase password storage is documented as bcrypt, so Option B is not equivalent to this proposed memory-hard PIN store. Do not promise configurable Argon2 inside native Auth. Verify each shortlisted IdP's actual credential module, parameters, upgrade policy, secret export restrictions and recovery semantics. A generic custom authenticator does not prove safe credential storage. [Native password security](https://supabase.com/docs/guides/auth/password-security), [Keycloak extension caveats](https://www.keycloak.org/docs/latest/server_development/index.html#_auth_spi).

## Abuse controls — candidate thresholds to validate

| Control | Proposed starting design | Required future evidence |
| --- | --- | --- |
| Per canonical account/method | Five failures in 15 minutes trigger progressive backoff; cap automatic cooldown at 30 minutes, then maintain constrained retry rather than indefinite silent lockout | Concurrent atomic counters and lockout-abuse/accessibility tests |
| Unknown identity | Keyed pseudonymous normalized role/identifier bucket; bounded dummy verifier work; same generic response shape/status | Enumeration/timing comparison without unbounded hashing DoS |
| Per trusted IP/network | Risk-adjusted burst and sustained limits at IdP and app entry points | Shared school NAT/mobile carrier tests; no naive one-IP-one-user assumptions |
| Distributed attack | Cross-IP account budgets, global stuffing detection, request concurrency cap and alerting | Many-source simulation, breached-secret attempts and load under incident conditions |
| Proxy trust | Derive client IP only from configured trusted infrastructure | Header-spoofing and server-proxy aggregation tests |
| Direct endpoint bypass | Apply credential limits at the actual IdP/native verifier as well as application form | Direct token/login endpoint tests; client-side limiter bypass test |
| Recovery | Separate low-rate identity-reviewed workflow; do not disclose account existence | Reset flooding, wrong guardian, stale approval and replay tests |

Thresholds are not provider defaults or proven capacity. Native provider endpoint limits do not replace school per-credential controls. Some forwarded-IP features require elevated API configuration; do not introduce a secret key to ordinary requests as a workaround. [Supabase rate-limit limitations](https://supabase.com/docs/guides/auth/rate-limits). Generic wording alone does not prove equal timing; measure end-to-end known/unknown paths. [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

## Issuance, change, recovery and suspension

Only a verified Super Admin may authorize issuance/reset, with mandatory MFA, recent reauthentication and independent approval for privileged targets. Confirm the canonical person and guardian evidence; shared contact possession is insufficient. Deliver a short-lived, single-use activation secret by an approved confidential school channel. Limit activation to credential change; issue no normal dashboard access while reset-required. Never send a reusable secret in ordinary email plaintext or print it in this repository. The exact expiry/delivery channel needs school approval.

After first login replace the initial credential through the provider-supported flow with an independently generated replacement of approved strength. Avoid routine forced periodic changes without a risk reason; rotate on compromise, recovery, guardian custody changes requiring reset or provider migration. Do not derive replacements from the old secret. Reset updates credential version, revokes app contexts and supported provider sessions, invalidates old activation material and generates metadata-only audit evidence. Confirm old refresh/access tokens are denied by live school policy.

Suspension immediately denies school data and new activation; provider invalidation is reconciled if an external call fails. Guardian-link revocation denies that child alias and row scope; it must not accidentally reset a Student or another guardian. Audit actor, canonical target, action, reason, timestamp, version, outcome and approval reference; exclude submitted secrets, hashes, raw tokens and unnecessarily exposed registration/guardian identifiers.

## Approval and release gate

School/security owners must approve numeric-only versus stronger-factor UX, candidate length, guardian-reference delivery, confidential activation, recovery evidence, cooldown accessibility and incident response. Engineering must prove provider credential storage, atomic distributed limits, peak hashing capacity, generic errors, independent credential binding and supported downstream session revocation. Any proposal for fewer than 15 standalone numeric digits needs an explicit revised risk/design decision; it is not approved by this report. Overall status remains conditional.
