# Supabase environment readiness — Step 9

## Step 13 limited connection update

The owner created the school-erp Supabase project and authorized local client configuration, prepared minimal deny-by-default migrations and staff session scaffolding. The modern publishable-key read-only Auth settings probe returned HTTP 200. No SQL/migration was executed, user/session created, staff/PIN login enabled, real school data connected, deployment made or Git operation performed. Region/Free-plan details are owner-reported. Step 12 source/contracts and dashboards remain unchanged; live RLS, staff role/context/MFA/refresh integration and PIN provider proof remain pending. See [Step 13 scope and limits](STEP-13-SUPABASE-FOUNDATION.md) and [report](../../STEP-13-REPORT.md). Older no-connection statements below describe earlier milestones.

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

The proposed setup remains unexecuted. The new proof is synthetic-only and requires explicit owner authorization before any external setup. Approve provider/release/extension, guardian reference, six-digit risk scope, durable throttling/campaign policy, freshness targets, budget, custody and cleanup; no environment or production readiness is implied.

This update takes precedence for the current UX and proof scope; it does not rewrite the historical findings below as a passed security proof. See [six-digit risk assessment](STEP-10-SIX-DIGIT-PIN-RISK-ASSESSMENT.md), [controlled proof plan](STEP-10-AUTH-PROOF-PLAN.md), [security matrix](STEP-10-SECURITY-TEST-MATRIX.md) and [owner checklist](STEP-10-OWNER-APPROVAL-CHECKLIST.md). Exactly five roles and the existing Super Admin model are unchanged.

## Retained Step 9 analysis

Checked 2026-11-05. This is an **unexecuted setup plan**. No package/CLI was installed, container started, project created/linked, environment file changed, migration written, user created or deployment made. Do not run setup until the [decision gate](STEP-9-DECISION-GATE.md) is satisfied and the subsequent scope is authorized.

## Environment strategy

| Environment | Proposed isolation | Data and access | Exit evidence |
| --- | --- | --- | --- |
| Current workspace | Existing public mock previews and pure contracts only | Fictional fixtures; no credentials or backend | Step 9 read-only verification |
| Future local development | Pinned reviewed CLI/runtime, private loopback-bound local stack, separate IdP development environment if selected | Future approved synthetic data only; no production copies | Reproducible reset, migrations and negative policy tests |
| Future controlled staging/proof | Dedicated nonproduction Supabase project, IdP client/realm, domains and mail sink; protected staging hosting | Bounded approved subjects and no real school records during proof | Canonical subject/session, linking, MFA, refresh/revoke and RLS proof |
| Future production | Separately owned school projects, clients, domains, secrets and operator roles | Approved minimal real data only after release review | Restore drill, monitoring, least privilege and production checklist |

The official [CLI/local guide](https://supabase.com/docs/guides/local-development) describes container-based development; review supported Windows runtime and resource capacity later. The [custom external OIDC guide](https://supabase.com/docs/guides/auth/third-party/custom-oidc) explicitly lacks CLI configuration for that integration, so a local pass cannot prove hosted Option C. Candidate A's exact local custom-provider parity is unverified; do not claim local tests replace hosted federation proof. No local services were started for this step.

Use reviewed migration history and separate environment targets in a future workflow; inspect target identity and backup before any change. No deployable SQL is supplied here. Local synthetic seeds must have no copied credentials or real minors' records. External Auth/IdP fixtures need separately authorized creation and cleanup; none were created now. See [Supabase environment workflow](https://supabase.com/docs/guides/deployment/managing-environments).

## Environment variable and secret inventory — names/categories only

| Proposed item | Exposure and owner | Rule |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Public project locator; environment owner | Correct environment only; not an authorization control |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Browser-safe API identifier | User JWT and RLS still required; no private key under NEXT_PUBLIC |
| SUPABASE_URL | Server project locator if required | Explicit target validation for operational workloads |
| IdP issuer/client ID | Public configuration as provider allows | Different staging/production registrations; strict issuer/callback allowlists |
| IdP OAuth client secret | Provider/server secret store only | No browser bundle, repository, report, logs or shared preview values |
| Database migration credentials / project-management token | Approved isolated operator/CI vault only | No ordinary app runtime access; least privilege and rotation |
| Administrative provisioning credential | Separately reviewed isolated server worker only | Not a Super Admin browser credential or normal dashboard DB client; never used in Step 9 |
| SMTP credentials and optional limiter/pepper keys | Dedicated provider/server secret stores | Separate environments, redacted telemetry, audited access and recovery |

No values or credential-like placeholders are provided. Existing `.env.example` remains unchanged. Publishable and secret API keys have different privileges; secret/service-role credentials bypass RLS and are prohibited for ordinary requests. The future worker must first verify an approved Super Admin operation and record its actual actor; its infrastructure credential is not the school's user identity. [API-key security](https://supabase.com/docs/guides/getting-started/api-keys).

Vercel preview and production environment scopes must be isolated. Untrusted previews get no production credentials, user records or callback wildcard. Approve a protected staging origin and exact redirects rather than allowing arbitrary preview URLs. Restrict secret visibility, rotate on exposure, prevent token capture in error monitoring and never share private session responses in CDN caches. No Vercel setup/deploy was performed. [Vercel environment guidance](https://vercel.com/docs/environment-variables).

## Safe future setup order

1. Obtain school approval for requirements, provider, region/data processing, budget, custodians, recovery, staging test scope and retention. Resolve or explicitly bound each gate blocker first; a controlled proof is a new authorized scope, not an automatic Step 10 start.
2. Select a pinned IdP/version and supported integration mode. Review custom extension ownership, all login/reset/direct-grant paths, signing keys and backup strategy before creating infrastructure.
3. Prepare isolated local tooling and design reviewed minimal identity/context/RLS migrations. Validate configuration without production secrets. Later initialize version control only under explicit authorization; no Git action is performed here.
4. Create owner-controlled nonproduction projects/clients only under the approved proof scope. Configure exact callbacks, no public signup, approved-subject creation gate, deliberate linking settings, secure cookies, request verification and mail sink.
5. Prove subject binding/session creation first, then MFA, refresh, reset, revocation and ordinary-user RLS. If proof fails, keep all school data outside and reconsider options.
6. Add audited Super Admin bootstrap with owner/witness and independent recovery custodian. Require native email/password plus actual Supabase MFA before privilege activation. Validate transactional approvals/last-admin guards before account-management operations.
7. Establish separate production resources, reviewed migration release/rollback, budget alerts, monitoring and successful recovery drill. Import real data and deploy only after explicit release approval; current public previews cannot become a secured ERP by adding environment values.

## Super Admin: native primitives versus school logic

| Need | Documented native capability | Required custom governance/application work |
| --- | --- | --- |
| Email/password account | Admin-created identity and native sign-in | Only approved Super Admin provisioning worker; no public form; idempotent profile binding |
| MFA/activation | Factor enrollment/challenge and assurance claims | Require genuine verified MFA before tier active; restrictive API/RLS enforcement and recent step-up |
| First privileged users | Server provisioning primitives | Owner/witness sealed bounded ceremony for primary/recovery pair; no environment default promotion |
| Role/permission grant | Claims/hook primitives do not define school roles | Live protected tier/memberships, operation-specific independent approval, self-target denial and audit |
| Last Super Admin | No school-specific native guarantee established | Locked transactional count across revoke/suspend/Admin-role removal/recovery; concurrency drill |
| Emergency recovery | Provider factor/account management primitives | Verified school custody, independent approval, approved supported factor recovery, immutable evidence; no assumed built-in recovery-code feature |
| Password/factor rotation and suspension | Provider-supported lifecycle operations | Revoke application versions/contexts first; reconcile provider invalidation and test old tokens; never remove last viable custodian |

[Native Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser) and [MFA](https://supabase.com/docs/guides/auth/auth-mfa) establish primitives, not a school bootstrap/backdoor. Retain the [Step 8 ceremony](SUPER-ADMIN-BOOTSTRAP-PLAN.md). Independent reviewer authority and last-admin checks need DB locking; a policy-unit-test count is not concurrency evidence. Upstream IdP MFA is not automatically equivalent to genuine native aal2; staff Super Admin should use native MFA in the candidate design. [Recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

## Backups, recovery and monitoring

School owner must approve RPO/RTO; tentative planning targets are 24-hour recoverable data loss and four-hour restoration, **not tested or promised**. If that is unacceptable for payments, cost a stronger backup/PITR plan before production. Cover database, object bytes, IdP store/configuration, approved subject mappings, deployment configuration and keys through separate encrypted procedures. Database backups alone exclude Storage file bytes. Restores can resurrect stale grants/contexts: keep restored systems isolated, reconcile authoritative security changes, invalidate sessions and verify guardian/tier state before access. [Backup limitations](https://supabase.com/docs/guides/platform/backups).

Monitor generic authentication failure rates, per-identity/IP attack patterns, reset/recovery, MFA failures, unapproved subject attempts, provisioning retries, tier/grant changes, context-version denials, direct API policy denials, signing-key health, backup age, restore success, mail delivery and spend. Exclude secrets/raw tokens from telemetry. Assign a named incident responder, alert retention and out-of-hours escalation; no monitor is configured now.

## Workload and cost assumptions — school size unknown

Illustrative planning assumptions only: 800 Students, 1,100 distinct guardian identities, 60 Teachers, 20 other staff and 5 Admins (including two Super Admin custodians), **1,985 identities**, assuming no cross-category overlap. With all 85 staff active monthly and 75% of 1,900 family identities active, estimated MAU is **1,510**. Student weekday logins 800×20, guardian logins 1,100×8 and staff logins 85×22 produce **26,670 interactive logins/month**, excluding refresh, failures and reset traffic. Peak planning case: 600 logins in 10 minutes averages one/second with bursts above that; benchmark rather than sizing on average.

Storage example: 1,900 family-related people × 5 retained files × 1 MB is about **9.5 GB** before versions, staff files, quarantine and backups; actual document policy is unknown. Database demand includes attendance, marks, audit and financial history, not just Auth MAU. Refresh and report queries add load; document downloads often dominate egress. These arithmetic estimates are not provider entitlements or invoices.

| Cost area | Prototype | Small-school production / long term |
| --- | --- | --- |
| Supabase Auth/DB/Storage | Free plan may accommodate a bounded proof if all chosen features fit | Price selected compute/projects, MAU, third-party MAU if C, storage, egress, logs, backups/PITR and support; recheck growth/retention |
| Identity provider | Local open-source evaluation may avoid license charges | Hosting, database, extension security review, upgrades, backup and on-call support; managed pricing depends on provider/features |
| Hosting | Local preview needs no hosted plan | Confirm school use eligibility, team/usage requirements, region and budget; Vercel Hobby is not assumed eligible for school operations |
| Delivery | Mail sink for approved future proof | Production SMTP/domain reputation and recovery volume; SMS only if separately approved, with per-message/region costs |
| Security/operations | Local design checks | Rate-limit store, monitoring/log retention, scans, incident response, staff recovery time and periodic restore drills |

No exact prices, quota promises or zero-cost production claim is made. Obtain dated quotes and a school-approved monthly cap plus incident/growth reserve after provider selection; count staging and production separately. Published sources: [Supabase pricing](https://supabase.com/pricing), [Vercel Hobby restrictions](https://vercel.com/docs/plans/hobby), [production SMTP limitations](https://supabase.com/docs/guides/auth/auth-smtp). Long-term costs depend on retention, workload, provider choice and maintenance ownership, not merely student count.

## School-owner approval checklist before infrastructure

- Approve exact family fields and guardian reference, numeric-secret versus stronger-factor policy, child accessibility and confidential delivery.
- Approve canonical identity/linking and transfer/withdrawal/historical-access rules; never merge guardians by shared phone/email.
- Approve named primary/recovery custodians, independent reviewer authority, owner/witness ceremony, recovery identity evidence and emergency process.
- Approve IdP/version/extension owner, nonproduction proof subjects, no-public-signup rules, session freshness and revocation target.
- Approve providers, regions, data-processing/retention terms, hosting eligibility, environments and operator access.
- Approve monthly/annual budget, paid-feature dependencies, mail/SMS choices, backup/PITR, RPO/RTO and incident ownership.
- Approve later setup scope explicitly; this checklist is documentation, not an approval obtained or an infrastructure action.
