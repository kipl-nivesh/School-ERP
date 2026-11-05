# Secure Super Admin bootstrap plan — Step 8

This is an unexecuted design. No Super Admin, account, secret, database object or bootstrap endpoint is created by Step 8. Only five primary roles remain; the privilege attaches to an Admin membership.

## One-time ceremony

1. School owner and an independent security witness approve the named intended primary and recovery custodians through verified offline identity evidence. Record approvals and a bounded subject list, never credentials, in the ceremony record.
2. A future controlled offline operator uses a reviewed provider-supported provisioning workflow with short-lived, narrowly controlled administrative access. This is not a web request with a user-supplied bootstrap flag, email-domain promotion, environment default user, or permanent ordinary-request service key.
3. Serialize the singleton bootstrap record under a database lock. Require a unique ceremony nonce, expiry and unconsumed state; bind the exact approved subject list. Replays and competing operators fail. Provider/DB operations need idempotent pending states and reconciliation because they are not one transaction.
4. Provision the first primary and separate recovery Admin identities within this single bounded dual-control ceremony. This avoids pretending a nonexistent first Super Admin can independently approve itself. No other subjects or arbitrary role changes are permitted by the bootstrap exception.
5. Require genuine factor enrollment and verified MFA before either pending privilege becomes active. Validate genuine provider identities, canonical profile links, active Admin memberships and authorization versions. MFA enforcement must also exist at server and RLS boundaries; a UI challenge alone is insufficient. See [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).
6. Append immutable activation/audit events, seal the singleton ceremony, revoke temporary operator credentials, remove/disable the bootstrap execution path and verify replay/concurrent attempts are rejected. No application endpoint can reopen it. An incomplete ceremony is reconciled under the same approval and subject bounds, not restarted as an unrestricted grant.

## Ongoing privilege changes and recovery

Normal changes require a verified active Super Admin, active Admin context, MFA, recent reauthentication, an independent authorized reviewer distinct from actor and target, and auditable purpose. Self-elevation/self-reset through the security-change command is denied. Approval must be bound to operation, target, expiry and version, not merely a supplied reviewer ID.

Keep two separately controlled active Super Admin accounts with backup factors/recovery material held in a school-controlled vault outside this repository. A recovery account still requires MFA and all audit rules. Factor loss is not permission to disable security or rewrite history. A documented offline emergency process requires owner/witness identity verification, time-limited authority, append-only evidence and a post-event review; its exact provider-supported mechanics remain a preproduction decision.

Lock and recheck active privileged account counts during revoke, suspension, Admin-role removal and credential recovery. Reject operations that remove the last viable Super Admin; concurrent requests must not both pass a stale count. If only one remains, restore an independently approved recovery custodian before normal removal. A count or approval field supplied by the browser is not evidence.

## Required future drills

Test first ceremony, interrupted provisioning, nonce replay, concurrent attempts, wrong subject, missing MFA, temporary credential revocation, sealed-path denial, lost factor, compromised custodian, last-admin races and session/version revocation. Current deterministic tests check policy inputs only; no live bootstrap or recovery has been performed.
