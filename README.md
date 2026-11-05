# Brightcamp — Single School ERP

Step 14 prepares local staff login/MFA code at `/login/staff`, separate protected `/staff` routes, incremental schema and deny-by-default RLS artifacts. Staff requests stay disabled (`STAFF_AUTH_REQUESTS_ENABLED=false`); SQL and real authentication have not run. The six public preview routes and Step 12 PIN contracts are preserved. See [Step 14 report](STEP-14-REPORT.md) and [migration review](supabase/STEP-14-REVIEW.md). Earlier milestone descriptions below are historical.

Step 13 connection foundation is prepared: lazy Supabase clients, local publishable-key configuration checks, a read-only connectivity probe, unapplied default-deny identity migration and staff provider-session inspection scaffolding. The project Auth settings probe returned HTTP 200; no SQL/users/login/RLS integration was executed. Dashboards remain public fictional previews and Step 12 PIN authentication remains disabled. See [setup](docs/architecture/STEP-13-SUPABASE-FOUNDATION.md) and [report](STEP-13-REPORT.md).

The Step 12 summary below records the prior milestone.

Step 12 adds isolated pure input, singleton Parent-resolution and ordered authentication-evidence contracts. No real authentication is enabled. See [Step 12 report](STEP-12-REPORT.md) and [integration gate](docs/architecture/STEP-12-NEXT-INTEGRATION-GATE.md). Local foundation is complete; isolated provider proof is pending; production authentication is not approved. Step 13 has not started. The Parent two-child fictional preview is preserved and separate from the initial one-student/one-parent-login backend policy.

All five dashboard previews are complete, including an illustrated Accountant dashboard with consistent fictional financial analytics and working reporting, search, and transaction filters. All displayed records are fictional. No authentication, Supabase connection, database, or real ERP workflows are implemented. This is not a production login or public school website.

## Start

Requires Node.js 20.9+ and npm (developed with Node 24).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production-mode local preview: `npm run build` then `npm start`.

## Routes

- `/` — temporary project entry page
- `/admin/dashboard`
- `/teacher/dashboard`
- `/student/dashboard`
- `/parent/dashboard`
- `/accountant/dashboard`

All preview routes are temporarily public, including production builds. The isolated `RolePreviewSwitcher` is displayed only when `NODE_ENV=development`; it navigates routes and is not authentication or access control. Do not deploy this foundation as a secured ERP. Principal and office staff permissions may eventually live inside Admin; no extra dashboard roles exist.

## Structure and created files

```text
.env.example                 # No credentials needed
.gitignore
components.json              # shadcn/ui configuration
eslint.config.mjs
next-env.d.ts
package.json / package-lock.json
postcss.config.mjs
tsconfig.json
README.md
STEP-1-REPORT.md
src/
  app/
    globals.css              # Semantic palette, typography, responsive styles
    layout.tsx               # Metadata and reduced-motion provider
    page.tsx                 # Temporary entry page
    (dashboard)/
      loading.tsx
      admin/                 # layout.tsx + dashboard/page.tsx
      teacher/               # layout.tsx + dashboard/page.tsx
      student/               # layout.tsx + dashboard/page.tsx
      parent/                # layout.tsx + dashboard/page.tsx
      accountant/            # layout.tsx + dashboard/page.tsx
  components/
    ui/                      # shadcn-style owned Button and Skeleton source
      button.tsx
      skeleton.tsx
    layout/
      app-sidebar.tsx
      app-header.tsx
      dashboard-shell.tsx
      mobile-navigation.tsx
    dashboard/
      primitives.tsx         # PageHeader, SectionCard, StatCardPlaceholder,
                             # EmptyState, LoadingSkeleton
      role-dashboard.tsx
    shared/
      animation.tsx          # PageEntrance, AnimatedCard, AnimationProvider
      brand.tsx
      role-preview-switcher.tsx
  config/
    navigation.ts
    roles.ts
  lib/utils.ts
  hooks/README.md
  types/README.md
  features/README.md
```

Server components own page composition and placeholder content. Client components are limited to the interactive shell, mobile dialog, role preview switcher, and Motion wrappers. Role definitions and navigation are centralized and typed. There are no mock security guards. Future feature code belongs in `src/features`; add backend clients and typed contracts only when real integration is requested.

## Design system

Brightcamp is a replaceable school-brand placeholder. Semantic CSS variables define backgrounds, surfaces, foreground, muted text, borders, focus rings, and the primary action color. Accent colors use indigo #4F46E5, sky #38BDF8, emerald #22C55E, amber #FBBF24, rose #FB7185, and violet #A78BFA. Text on pale accents uses darker variants for legibility. Plus Jakarta Sans Variable is served locally with Segoe UI/Arial fallbacks. Headings range from 26–36px in dashboards, card headings are 15px, body copy 12–14px, and supporting labels 9–11px. Rounded white cards, restrained shadows, and soft gradient introduction panels create hierarchy. Educational decorations are CSS and Lucide assets, with no stock imagery dependency.

The student panel uses a more playful palette; the accountant panel uses a quieter emerald treatment. All five dashboards show labeled demo analytics; all data is fictional. The Parent feature scopes its styles under `.parent-demo`, uses one selected-child state, and derives attendance, results, homework, fees, schedules, notices, and progress from two distinct typed child datasets. Fee balances reconcile with fictional payment history; payment actions remain disabled.

The Accountant feature scopes its styles under `.accountant-demo`. Its independent 24-invoice sample ledger uses integer paise, a fixed 31 October 2026 reference date, and one reporting-period selection for billing, settled collections, balances, expenses, and cash flow. It is explicitly separate from Admin/Parent demo figures. Only settled receipts and paid expenses affect net cash flow; unpaid obligations and nonsettled attempts remain separate. Search, status/method filters, pagination, and in-page navigation are read-only. Report generation and exports are marked Coming soon.

## Animation and accessibility

Motion for React provides short opacity/vertical entrance and hover elevation patterns. A global `MotionConfig reducedMotion="user"` respects reduced motion; CSS media queries disable CSS animation, transitions, smooth scrolling, and active scaling. Sidebar width transitions, drawer entry, button press feedback, and one-time decorative fades stay lightweight. Loading placeholders use a reduced-motion-aware pulse. No continuous decorative animation or animated large lists.

Navigation uses landmarks, accessible names, visible focus rings, an active overview link, and skip links. The Radix mobile dialog handles focus trapping, Escape dismissal, focus return, and screen-reader dialog labels. Unfinished navigation, search, notifications, and logout are disabled or explicitly marked unavailable. Avatar details are static placeholders.

## Responsive layout

The desktop sidebar collapses; below 950px it becomes a modal mobile drawer. At 640px, dashboard cards and sections stack and supporting header details are simplified. The entry page role grid moves from five to three to two columns. Containers use flexible tracks and bounded widths.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
```

See STEP-1-REPORT.md through STEP-6-REPORT.md for step-specific implementation details, actual execution results, and browser checks. Run `node verification/verify-parent-data.mjs` for Parent checks and `node verification/verify-accountant-data.mjs` for Accountant financial reconciliation and filter checks.

## Future backend boundaries

Future steps may add Supabase PostgreSQL, Auth, Storage, RLS, and server-side permissions. No Supabase dependencies, SQL, migrations, credentials, or backend connections exist in this step. `.env.example` is intentionally comments only. Never expose service-role keys to the browser.

Step 2 is complete; see STEP-2-REPORT.md for the Admin feature and verification details. Step 3 is complete; see STEP-3-REPORT.md for Teacher implementation and verification. Step 4 is complete; see STEP-4-REPORT.md for the Student UI, original illustration, local interactions, and verification. Step 5 is complete; see STEP-5-REPORT.md for the Parent portal, child switcher, fee calculations, and verification. Step 6 is complete; see STEP-6-REPORT.md for the Accountant ledger, definitions, analytics, and verification. Step 7 has not started. No Git initialization, commits, pushes, or deployments were performed.
## Implementation references

- [Next.js installation](https://nextjs.org/learn/react-foundations/installation)
- [shadcn/ui manual setup](https://ui.shadcn.com/docs/installation/manual)
- [shadcn/ui with Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)

UI primitives are project-owned source using the shadcn/ui composition pattern (Radix Slot, CVA, semantic Tailwind tokens, and `cn`). They can be extended through the supplied `components.json` configuration.

## Build tooling note

The development and build scripts explicitly use Next.js webpack mode. Turbopack's CSS worker exited unexpectedly on this Windows environment, including outside the sandbox. Webpack preserves the same App Router application and avoids that environment-specific worker failure.

`npm audit` currently reports 16 moderate development-tool findings rooted in the ESLint/minimatch dependency chain. Suggested forced fixes downgrade core tooling to incompatible historical versions, so they were not applied. `npm audit --omit=dev` reports zero vulnerabilities. Review upstream tooling updates before later production work.



