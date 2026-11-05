# Step 12 — Simplified Parent login identity

Current owner-approved initial scope: exactly two Student inputs (Registration Number, six-digit Student PIN) and two Parent inputs (linked Student Registration Number, six-digit Parent PIN). No Parent Login ID, Guardian Reference/ID, additional username, third field or selection step. Six digits remains a UX preference, **not production security approval**.

## Initial relationship policy

One Student has **at most one login-eligible Parent account**. A Parent login identity is linked to **exactly one Student**. Student and Parent have different internal profile IDs and different canonical issuer/subject identity tuples, independently provisioned credentials and role bindings. Shared registration is a lookup identifier, never shared authority or a credential. Only the active explicitly school-provisioned Parent can proceed toward later authentication gates; provisioning authority is exclusively Super Admin, not ordinary Admin.

A guardian relationship is a domain relationship, not automatically a login account or grant. Additional non-login guardian records may exist conceptually, without creating another eligible Parent login. Do not delete the richer guardian model; defer multiple children per Parent and multiple independently login-eligible guardians per Student. This is single-school scope; no tenant/subscription architecture is introduced.

The Step 11 BLOCKED finding remains correct **for the earlier required multi-guardian two-field first-login scope**. The newly approved singleton eligibility removes that specific identity ambiguity: registration can select one known eligible Parent before checking its own credential. It does not solve six-digit guessing/offline theft, safe provider session establishment, refresh/revocation, recovery or RLS. Multiple eligible rows must deny rather than select first, compare PINs, merge identities or silently widen scope.

## Trusted lookup and pure checks

`ParentIdentityLookup` is an interface only. `TrustedParentLookupSnapshot` is a nominal future server-read contract containing registration, canonical Student, complete current candidates, observed/expiry times and snapshot versions. Each candidate carries role, account/provisioning/relationship state, eligibility, independent provider binding, relationship versions and complete reverse login-Student scope. The adapter must obtain these from protected authoritative storage, not a client request. No DB lookup or schema is implemented.

`resolveInitialParent` returns only `resolved_contract` metadata or a categorical denial:

| Evidence | Result |
| --- | --- |
| One active eligible Parent, verified current link, approved Super Admin provisioning, distinct bound identity, one reverse Student link | May proceed to later contract gates; not authentication |
| No eligible Parent | Deny |
| More than one eligible Parent, including conflicting eligibility states | Deny ambiguous; never select first |
| Revoked/pending relationship, suspended/disabled/invited account, unapproved provisioning | Deny |
| Withdrawn/inactive Student or inactive Student account | Deny |
| Missing/identical Student–Parent identity binding | Deny |
| Incomplete/malformed/expired/mismatched lookup, duplicate profiles, stale snapshot or relationship version | Deny |
| Parent reverse scope has zero/multiple/wrong Students | Deny inconsistent relationship |
| One eligible login Parent plus unrelated non-login guardian records | Non-login records do not become login candidates; current live checks still required |

No PIN is supplied to the resolver. The PIN is verified only later by a future approved provider, and cannot discover/select identity. Completeness, authority markers and current versions are promises a real adapter must prove; branding alone does not make a snapshot trustworthy.

## Future persistence and race controls — planning only

Enforce unique current eligible Student→Parent mapping and unique Parent→Student login link in future reviewed constraints plus transactional commands. Constraints alone cannot prove authorization: commands/RLS must recheck active school account, Super Admin provisioning, eligibility, dated verified relationship, version and intended operation. Validate forward/reverse scope in a coherent live read; concurrent linking/reset/revocation must serialize or reject stale versions. Audit changes and invalidate affected contexts; provider operations need idempotent reconciliation outside the DB transaction. No SQL/migration is provided or executed.

Suspension, withdrawal and revocation deny subsequent login and protected requests; old provider token signatures cannot override live status/context. Reassignment must not let a previous Parent credential select a newly assigned Parent: independent canonical identity/credential/version binding and session invalidation are mandatory, with supervised recovery. Richer future relationships need a new explicit policy, resolver, migration and threat review; do not relax singleton checks in place.

## Preview separation

All six existing routes remain public fictional previews. The Parent demo's historical two-child switcher remains unchanged and cannot supply trusted mapping or production access. No fake relationship/account records were added to the application. Test snapshots are synthetic contract evidence only, not domain records or real sessions. Exactly five primary roles and Super Admin within Admin remain unchanged.

Statuses: **LOCAL FOUNDATION COMPLETE**; **ISOLATED PROVIDER PROOF PENDING**; **PRODUCTION AUTHENTICATION NOT APPROVED**. See [contracts](STEP-12-AUTH-CONTRACTS.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [integration gate](STEP-12-NEXT-INTEGRATION-GATE.md). Step 13 has not started.
