# First Vercel Preview

This release candidate is for manual UI testing with the repository’s fictional dashboards. The five dashboard entry points import their demo features and fixture data. The live staff workspace has a separate authenticated entry point.

| Routes | Preview behavior |
| --- | --- |
| `/`, `/admin/dashboard`, `/teacher/dashboard`, `/student/dashboard`, `/parent/dashboard`, `/accountant/dashboard` | Public fictional previews |
| `/login/staff`, `/login/staff/recover`, `/login/student`, `/login/parent`, `/invite`, `/register/school`, `/register/school/status` | Public UI shells. Staff provider operations and registration RPCs are disabled. Student and Parent PIN authentication remains disabled. |
| `/staff`, `/staff/admin`, `/staff/teacher`, `/staff/accountant`, `/staff/select-school`, `/admin/onboarding` | Redirect to staff sign-in |
| `/portal/student`, `/portal/parent` | Redirect to the corresponding sign-in |
| Unknown staff or portal role | HTTP 404 |

## Vercel configuration

Use the Next.js framework preset with the repository root and `npm run build`. Keep the lockfile install and choose the intended Node version when verifying the clean Linux build. There is no repository `vercel.json` or local Vercel project link to supply these settings.

No application environment variables are required for the UI Preview. Set `STAFF_AUTH_REQUESTS_ENABLED=false` in Preview for clear operator intent. Scope Supabase URLs, publishable keys, auth origins and any privileged credentials away from Preview, including team-shared and branch-specific entries. Keep automatic system environment variable exposure enabled so `VERCEL_ENV=preview` is available. [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables) · [Vercel environment scopes](https://vercel.com/docs/environment-variables#environments)

The build defaults to a compiled preview lock and empty Supabase public credentials, including when Vercel system variables are absent. The live build path requires both `VERCEL_ENV=production` and `BRIGHTCAMP_ENABLE_LIVE_BUILD=true`. Leave that live opt-in unset for this release. The runtime client guard also checks Vercel Preview. Local `next dev` keeps the existing development configuration path. Ordinary local production builds use the preview lock.

## Evidence and remaining steps

- All three historical failures are resolved. Steps 14 and 15 check the exact 26-file inventory and retain the original three-migration schema assertions. The permission catalog check reads the current constraint from migration 4 and verifies all 43 entries. Step 16A uses AAL2 for authorized admin fixtures and separately rejects AAL1.
- All 23 offline regression suites passed. The historical Step 14 local script is tied to its old source snapshot and server setup. The current local verifier covers the expanded route matrix. Native GoTrue verification requires a separately approved disposable Auth target and remains unverified.
- Fresh local PostgreSQL replay passed all 26 migrations and the transaction assertions with synthetic Auth fixtures. Evidence is retained at `verification/step-24a/pg-7bed31ba61b64db7b9c3269eb502179b/verification.log`.
- TypeScript, ESLint and the Windows production build passed. The build used synthetic inherited credentials and enabled live flags with `VERCEL_ENV=preview`.
- The loopback runtime verifier removed `VERCEL_ENV`, supplied a false runtime lock flag and kept synthetic credentials and live flags enabled. The compiled lock held. All 23 route checks passed, protected routes redirected even with a synthetic session cookie, and the tested compiled JavaScript and HTML excluded the synthetic URL/key. The network guard recorded zero outbound application fetch attempts.
- Installed Chrome rendered Student and Accountant previews and followed the staff sign-in redirect. Browser smoke scope was three navigations. Native sign-in, account workflows and the hosted Vercel Preview remain unverified.
- `sh scripts/verify-linux.sh` is ready for a fresh Linux checkout without local environment files. It performs a clean install, builds with the same synthetic variables and runs the loopback checks. Linux execution remains unverified.

Before the first Preview, verify the project’s Preview settings above, identify the branch or source snapshot to use, and obtain explicit authorization for any Git push and Vercel deployment. Run the Linux check for platform evidence or capture equivalent build evidence from the approved Preview. Live ERP release blockers are tracked separately in the implementation report.
