# Step 2B: offline test-target guard

Cloud execution is DISABLED. No disposable project is approved. No cloud project,
account, SMTP setup, SQL execution, issuer change or live test is authorized here.

## Trust and execution boundaries

- `verification/auth-test-policy.mjs` is the separate reviewed policy boundary:
  approved target is null and cloud execution is false. No environment flag, file
  path, caller-provided URL or project reference can populate this runner policy.
- `validateTestTarget` is a pure validation contract, not proof of approval.
  Its approval parameter permits fictional offline tests. The real runner obtains
  approval only through the policy module. Code review and repository integrity,
  not a signature or environment variable, establish that policy's provenance.
- A future reviewed policy would contain exactly `{ projectRef, url, reviewId }`.
  Do not insert a real target or enable execution without independent owner approval.
- Cloud mode requires `AUTH_TEST_MODE=cloud`, `AUTH_TEST_DISPOSABLE=1`, an exact
  20-character lowercase project reference, and its exact HTTPS Supabase origin.
  The existing school project is explicitly denied. Unknown targets and URL aliases
  (including trailing slash/default port), credentials, paths, queries and fragments
  are rejected. Loopback cannot be used in cloud mode.
- Absent mode retains local mode. Local mode accepts canonical localhost,
  127.0.0.1 or IPv6 loopback HTTP(S) origins with optional port/trailing slash.
  It rejects alternate IP spellings, project references, and ambiguous URL forms.
- The runner never loads `.env.local` or dotenv. Presence of application Supabase,
  database, PostgreSQL or staff-enablement variable names blocks execution without
  reading their values. A clean test-process environment is required.
- Target validation precedes credential reads and lazy SDK loading/client creation.
  Only modern publishable-key shapes, synthetic `example.invalid` email addresses
  and nonempty test passwords are accepted. Shape validation does not establish
  that a key belongs to a project or that an email is confirmed.
- The SDK uses a pinned Auth-only fetch wrapper: same validated origin, no embedded
  credentials, no fragments, no redirects, no raw transport errors. This is not an
  RLS transport; future database tests require a separately reviewed equivalent.
- Network access is never performed by the guard. A future authorized local runner
  invocation still performs the existing limited password/user/refresh/sign-out
  smoke workflow. It does not establish MFA, stale-token or browser E2E security.
- Blocked runs emit a fixed message and exit 2 without overwriting saved evidence.
  Authorized smoke results retain the existing report location; report write errors
  are generic. The native runner was NOT executed in Step 2B.

## Offline verification

Run `node --test verification/verify-auth-test-target.mjs`. Fixtures never load
environment values or the SDK. Global fetch is replaced with a throwing sentinel;
transport tests inject in-memory responses. The fictional approval positive case
proves only the validation contract, not cloud execution authorization.

## Issuer compatibility proposal (not implemented)

Migration 3's `is_native_staff_request` pins the existing project's issuer. A new
test project therefore cannot exercise native-session SQL faithfully without an
explicit reviewed issuer adaptation. Preserve migrations 1–16 byte-for-byte.

Before any cloud setup, review an additive mechanism with a private, owner-managed
single expected-issuer configuration, default-deny when absent, no application
write grants, and exact issuer comparison. Production must retain its exact current
issuer; no wildcard, caller header, environment-derived SQL authority or dual-project
allowlist. An alternative is a clearly labeled test-only additive issuer override
on the disposable target. Results then describe baseline plus that override, never
the untouched baseline or production. Neither proposal is SQL approved for execution.

Native session checks still depend on Auth internals and password AMR. A target
guard cannot fix that dependency, MFA enrollment contradictions, PIN sessions, RLS,
financial RPC authorization or other Step 2A findings.

## Next approval gate

Owner review must specify the exact disposable project identity, approval reference,
test purpose, credential handling, synthetic email capture, expiry/cleanup scope,
and separately authorize any project creation, migrations, Auth settings, users or
network tests. Configuring a policy is not itself authorization to run those actions.
The existing synthetic-recipient restriction also requires an approved capture SMTP
transport for cloud confirmation emails; it must not be silently relaxed.

Do not change production configuration, run migrations, create a project, connect
to cloud services or begin Step 2C as a consequence of this implementation.
