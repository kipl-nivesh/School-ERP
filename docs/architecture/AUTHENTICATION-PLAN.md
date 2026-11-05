# Authentication and account lifecycle — proposal

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

## Step 9 feasibility clarification — 2026-11-05

[Step 9 research](STEP-9-AUTH-FEASIBILITY.md) verifies the federation primitives but does not prove the school's full PIN flow. OIDC through Supabase Auth and direct third-party JWT access are separate models; only the first preserves the proposed native Auth-session model without redesign. Automatic same-email linking is a documented isolation risk, and the earlier tentative PIN length is superseded by the [current assessment](PIN-SECURITY-POLICY.md). The decision remains [CONDITIONAL](STEP-9-DECISION-GATE.md); no project configuration, provider/session integration or contract change occurred.

## Step 8 authoritative update

The original Identity model and Account provisioning sections below are retained as Step 7 history and are superseded for login methods and provisioning authority. Staff use email/password; Super Admin additionally requires mandatory MFA. Student uses registration number + Student PIN; Parent uses linked-child registration number + independent Parent PIN + proposed guardian reference. Only Super Admin provisions or manages accounts and security grants. The former student-email proposal and generic authorized-Admin provisioning are withdrawn. Initial bootstrap follows the new sealed ceremony. The custom PIN-to-Supabase session bridge is unresolved and blocks production integration. Other Step 7 lifecycle/session safeguards remain proposals where consistent.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

Planning only. The current application has no authentication. Exactly five role codes remain `admin`, `teacher`, `student`, `parent`, `accountant`; see [matrix](ROLE-PERMISSIONS-MATRIX.md). An admission number, URL role, selected child ID, email address match, or browser role selector is never proof of authorization.

## Identity model

Use Supabase Auth email/password with verified email and invitation-only provisioning initially. `profiles.id` references the Auth user UUID; domain people exist independently of accounts. `staff.profile_id`, `students.profile_id`, and `guardians.profile_id` are nullable unique links established through reviewed provisioning. A person can be staff and guardian, with multiple authorized user_roles; display only the active role's permissions. Do not create extra Principal/Office dashboards.

Students: prefer a school-controlled, recoverable email identity or verified student's email when appropriate. For children without one, approve a school-managed login-address issuance/recovery process first. Never fabricate routable personal emails or use admission number as password/sole reset evidence. A school identifier login alias would require a later protected mapping service, enumeration resistance and secure recovery; it is an open decision, not Supabase email login by itself. Parents have their own accounts; never share a child's credentials.

## Account provisioning and linking

1. **Superseded Step 7 mechanism (not an active permission ID):** Authorized Admin with `accounts.provision`, MFA and recent identity confirmation creates a pending invitation binding intended role, domain subject and verified delivery address. Normalize email conservatively; do not merge accounts based only on names/phone numbers.
2. Provisioning worker invokes Auth administrative invitation with server-only credentials. Store only invitation token digest/expiry, not plaintext tokens/passwords. Auth calls and application DB are not one transaction: use pending states and idempotent outbox/retry with reconciliation.
3. Callback validates single-use token, expiry, redirect allowlist, verified Auth identity, intended subject and pending approval. Within one transaction bind the unique domain profile link and intended role; invitee cannot edit requested role/student IDs. A second reviewer approves privileged accounts and guardian links where policy requires.
4. Parent account: staff verifies guardianship/access restrictions offline, then creates a dated approved student_guardians relationship. An invite proves address possession, not guardianship. Revocation/court restrictions immediately withdraw linked access; historical relationship entries remain audited.
5. Teacher account: link staff/teacher profile after employment review; teaching access additionally requires dated teacher_assignments/class_teacher_assignments. Accountant provisioning grants finance permissions, not all student fields. Student activation links exactly one master student to one profile.
6. Initial bootstrap Admin: future controlled operator ceremony with MFA, documented ownership and no self-service role escalation. Disable bootstrap path after creation; establish a second recovery administrator under separation of duties.

## Login, refresh and logout

Login returns generic failures, applies IP/account rate limits and risk-based protection, disallows open registration, and requires active account status. If one authorized role exists, enter its dashboard; if multiple, show a server-generated allowed-role chooser. Validate any return URL as same-origin and role-authorized. Preserve no public role-preview switching in authenticated routes.

Request-scoped Supabase SSR clients should use cookie-backed sessions; validate tokens with `getClaims()` and use `getUser()` when fresh Auth account state is necessary. Do not use an unverified `getSession()` user object to authorize. This follows current [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs). Keep current-version cookie handling in one future `src/proxy.ts` helper; refresh cookies only from supported response-capable contexts. Each query/command also validates live application account/session context. SSR token verification alone does not mean recent logout/ban has been checked.

Logout is a same-origin mutation: revoke application role_context, sign out the intended Auth session scope, clear cookies and all private client state, redirect to login. Access tokens can remain valid until expiry, so RLS must reject revoked role_context/account status rather than assuming logout instantly invalidated JWT signatures. Password change/reset and account suspension revoke application contexts and trigger appropriate Auth session revocation. Test old-token requests directly.

## Active role: authoritative per Auth session

`role_contexts` uses verified JWT `session_id` plus user UUID, selected authorized role, context version, expiry and revoked_at. It is not a caller-controlled cookie/claim or a PostgreSQL connection setting. A restricted switch command checks live profile status, unexpired user_roles membership and required MFA, then atomically updates context/version and audits. Every RLS helper derives active role from that row and rechecks current membership. No row means deny.

This deliberately makes active role shared across tabs in the same Auth session. A switch invalidates old UI requests; writes submit expected context_version and fail on mismatch. Clear tab data and show a role-changed message. Separate simultaneous roles require separate Auth sessions/browser profiles, not a bypass header. This avoids a direct Data API request selecting a wider role than the UI. Test helper bootstrap/switch permissions carefully; [RLS blueprint](RLS-SECURITY-BLUEPRINT.md) defines the trust boundary.

## Security policy proposals requiring owner approval

| Control | Proposed starting policy | Verification |
| --- | --- | --- |
| Account states | invited → active → suspended/disabled; no hard deletion of domain history | Disabled account and old JWT denied by DB immediately |
| Passwords | Passphrases ≥12 characters, breached-password checks where supported; no known/default student passwords | Auth config and weak/common password tests |
| MFA | Mandatory for Super Admin (approved); broader Admin/Accountant MFA remains a policy proposal; sensitive actions require step-up | RLS/command `aal2` checks and lost-device drill |
| Sessions | Privileged idle target 30m, maximum 8h; family maximum 24h target, shorter on shared devices | Check provider plan capabilities; app context expiry enforces cap |
| Sensitive actions | Recent reauthentication (target ≤10m) for role grants, bank details, refunds, exports | Server-confirmed evidence; never caller-supplied timestamp |
| Rate limiting | Per-account/IP login/reset/invite/upload/export limits with retry responses | Load/abuse tests, avoid lockout abuse |
| Password reset | Generic response, short-lived one-use recovery, allowlisted HTTPS callback, no automatic role/link changes | Replay/open-redirect/enumeration tests |

Supabase session defaults must not be mistaken for the proposed school policy; available limits depend on configuration/plan. [Session documentation](https://supabase.com/docs/guides/auth/sessions). Never log reset URLs, tokens or passwords. Cookies must use HTTPS/Secure and appropriate SameSite/domain/path; confirm SDK compatibility before changing HttpOnly behavior. Protect against XSS as browser auth flows may require token access. CSP, output encoding and no raw HTML render paths are required.

Audit invites, failed/successful login risk events, activation, recovery, role grant/revoke/switch, MFA changes, suspension and guardian linking with redacted metadata and request IDs. Avoid storing full authentication payloads. Private pages and refreshed-cookie responses must not be shared-cacheable. No real user, invitation, Auth configuration, or session was created in Step 7.
