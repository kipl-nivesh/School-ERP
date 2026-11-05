# Step 13 — Supabase connection and backend foundation

## Authorized scope and actual project

The full earlier Step 13 master prompt was not available in this chat/workspace. The owner's follow-up explicitly authorized local client configuration, minimal prepared migrations, deny-by-default RLS and staff authentication scaffolding, while prohibiting SQL execution, real users, deployment/Git changes and Student/Parent PIN activation. This delivery follows that clarified scope; it does not claim to implement an unavailable broader prompt.

Owner-supplied project: **school-erp**, URL **https://yedvkcwkflhbqumjwknh.supabase.co**, Free plan, Singapore region. Plan/region are owner-reported, not checked using privileged dashboards/APIs. A read-only Auth settings request returned HTTP 200 using only the modern publishable key. That verifies endpoint reachability/acceptance, not identity/session/RLS/plan/region or production readiness.

## Secure local configuration

A new `.env.local` was prepared from `.env.example`, then the owner's supplied publishable key was placed **only in that local environment file**. Its value is never displayed in logs/reports or embedded in source. The existing `.gitignore` pattern `.env*` covers `.env.local`, with an exception only for the keyless `.env.example`. No Git command was run. Keep local configuration out of shares, screenshots and commits; the publishable key is intended for public clients but does not identify a school user or bypass RLS. No secret/service-role key or DB password is requested, read or used.

Required variable names are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The template contains the public project URL and an empty key field. To change configuration, edit `.env.local` locally, use the modern publishable key from the project's Connect/API Keys interface and restart the local dev server; rebuild before production-mode local testing because Next public variables are build-time values. Do not paste credentials into source or add legacy key aliases.

`src/lib/supabase/config.ts` validates missing values, HTTPS standard hosted-project URL, path/query/fragment/credential restrictions and modern publishable-key shape. It rejects legacy JWT/privileged key shapes. Errors expose reason categories only. Shape validation is not cryptographic key validation. Custom domains, self-hosted and localhost Supabase URLs are deliberately outside this initial validator; future support needs explicit review rather than a fallback to another project/key type.

## Clients and SSR boundary

Installed official `@supabase/supabase-js` and `@supabase/ssr`, plus the server-only module guard. `browser.ts` supplies a lazy browser factory. `server.ts` supplies an async request-scoped server factory using installed Next's cookies API, user-session context and no-store network requests. No client is constructed at import time and no dashboard imports these files.

Server cookie updates default to **read-only** and fail explicitly when refresh would require writing. `cookieWrites: allowed` is reserved for future response-capable Server Actions/Route Handlers; an invalid context still fails through Next. No Proxy/middleware, callback, sign-in page, cookie write or refresh route is wired. These factories prepare plumbing, not a completed SSR authentication lifecycle. Do not silently ignore failed cookie propagation or use cookie contents alone as verified identity.

`staff-session.ts` can inspect existing provider claims and current user when explicitly called in a future request. It returns no token/user details and **schoolAccess is always false**, even if provider identity exists. Live profile/membership/context, ordinary staff scope, native privileged MFA and authorization remain pending. It is not a staff password form/action, signup, account provisioner or authenticated-dashboard gate. No native staff login/session inspection was executed against a user in this step; tests mock the provider boundary only.

## Configuration and read-only probe commands

- `npm run supabase:check`: loads local environment with no value logging, performs format checks only, no network. Missing/invalid configuration returns exit 1.
- `npm run supabase:probe`: explicitly performs GET `/auth/v1/settings` with only the publishable apikey header, no redirect following, an eight-second timeout and no response-body output. No table query, signup, token exchange, session, write or SQL. The actual run returned HTTP 200, exit 0.

The probe is an explicit CLI action, not a route/build side effect. Its success does not verify account provisioning, email delivery, MFA, RLS or PIN-to-session compatibility. Unexpected failure returns only HTTP status or a generic network category without key/body details.

## Prepared migrations and deny-by-default RLS

[Prepared migration](../../supabase/migrations/20261105000100_identity_foundation.sql) defines roles, profiles, user_roles, admin_privileges and role_contexts with basic keys/state/version constraints and five role-code seed rows only. No users/profiles/grants are created. Super Admin is a tier tied to Admin membership, never a sixth primary role. Every table enables and forces RLS; ordinary table grants are revoked and **no allowing policy exists**. Ordinary clients therefore cannot use these tables until separately reviewed authorization is implemented.

This is an unapplied minimal identity slice, not the full Step 7 schema or complete staff authorization. No Parent/Student domain data, PIN credential table, audit/finance mutation workflow, Storage policy or bootstrap is enabled. No SQL parser/database/RLS test was run. See [migration limits](../../supabase/README.md). Application requires separate approval plus actual target inspection, review/backup/rollback and ordinary-user negative RLS tests; do not automatically run migrations with the new URL.

## Preserved requirements and remaining blockers

Exactly five primary roles and privileged Admin-tier Super Admin remain unchanged. Super Admin alone provisions users/grants and requires email/password plus mandatory MFA; ordinary Admin/Teacher/Accountant use email/password. No real users or public self-registration were created/enabled by code; hosted Auth signup settings were not changed and must be reviewed before any login rollout.

Student: registration + independent six-digit Student PIN. Parent: linked registration + independent six-digit Parent PIN; no additional login identifier/third field. Initial singleton eligibility stays one Student to at most one Parent and one Parent identity to exactly one Student. All Step 12 source/contracts are byte-for-byte preserved, including live-authentication-disabled state. Public previews, including fictional two-child Parent UI, remain unchanged and disconnected from real records.

Pending: approved/applied schema and tested live RLS; canonical provider subject mapping; real staff sign-in/session/refresh/revocation and verified live role/tier/context; secure Super Admin bootstrap/MFA/recovery; durable abuse controls; exact registration policy; reviewed PIN provider/session proof and explicit security approval. No Student/Parent PIN authentication is enabled. No deployment, production data or Git operation occurred; Step 14 has not started.

## Documentation checked

Official [SSR setup](https://supabase.com/docs/guides/auth/server-side/nextjs) documents browser/request-scoped server clients and cookie propagation. [API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys) distinguishes modern publishable keys from legacy/elevated credentials. These sources were checked for this step; documented SDK support does not validate school authentication. Installed Next 16 data-security, Proxy and cookies guides were read before implementation. Proxy alone is not an authorization solution.
