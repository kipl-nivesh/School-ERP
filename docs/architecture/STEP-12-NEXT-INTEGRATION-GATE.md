# Step 12 — Next integration gate

## Step 13 limited connection update

The owner created the school-erp Supabase project and authorized local client configuration, prepared minimal deny-by-default migrations and staff session scaffolding. The modern publishable-key read-only Auth settings probe returned HTTP 200. No SQL/migration was executed, user/session created, staff/PIN login enabled, real school data connected, deployment made or Git operation performed. Region/Free-plan details are owner-reported. Step 12 source/contracts and dashboards remain unchanged; live RLS, staff role/context/MFA/refresh integration and PIN provider proof remain pending. See [Step 13 scope and limits](STEP-13-SUPABASE-FOUNDATION.md) and [report](../../STEP-13-REPORT.md). Older no-connection statements below describe earlier milestones.

## Three separate statuses

| Status | Outcome / evidence |
| --- | --- |
| **LOCAL FOUNDATION COMPLETE** | Strict local input, singleton eligibility, nominal provider/admission/evidence and ordered decision contracts; 81 new plus 44 existing deterministic groups and regression/build checks |
| **ISOLATED PROVIDER PROOF PENDING** | No provider, durable limiter, session, canonical binding, database/RLS/Storage or race behavior has been integrated/tested |
| **PRODUCTION AUTHENTICATION NOT APPROVED** | Six-digit remote PIN risk and operational/recovery/release approval remain unresolved; no real login is enabled |

Do not collapse these into READY. The Step 11 blocker remains valid for the former required multi-guardian flow. The newly approved one-Student/one-Parent-login policy supplies a unique lookup candidate only; it neither strengthens six digits nor proves a supported PIN-to-Supabase session exchange.

## Preconditions for a separately authorized proof

1. School approves actual registration-number format/case/length policy. The current conservative transport validator deliberately denies an unknown school format; the synthetic test predicate is not a production rule. Approve activation/delivery, initial change, recovery evidence and six-digit risk evaluation or a stronger alternative without silently changing the selected two-field UX.
2. Review a named provider/version/credential mechanism supporting independent Student/Parent subjects, approved school provisioning, salted secure verification, no public signup and exact single Parent resolution before secret verification. No Guardian Reference or extra username may be reintroduced. Super Admin email/password and genuine mandatory MFA remain separate requirements.
3. Prove through documented APIs the canonical upstream identity → intended downstream Auth profile/session mapping. Prevent automatic email/contact linking, duplicate/unauthorized first-login identity creation, subject substitution and custom-PIN-success token shortcuts. External JWT access is not a native Supabase Auth session; any alternative identity model needs an explicit reviewed redesign.
4. Design actual persistent atomic pre-resolution/identity/IP/global/campaign throttles, key custody, shared-NAT behavior, cooldown/recovery, outage denial and abuse/load measurements. Source strings, durable flags and local tests prove none of this.
5. Implement/review complete coherent forward/reverse eligibility reads, constraints and transactional version checks. Test concurrent provisioning/linking/reset/reassignment, suspension, withdrawal and revocation. A unique constraint cannot prove school authorization, purpose scope or fresh state.
6. Produce genuine provider session verification before constructing nominal evidence or Step 8 context. Verify issuer/audience/signature/time/session binding, credential version and live role/context; use ordinary-user JWT RLS/Storage tests for own Student, exact current Parent purpose, Teacher assignments and financial projections. No ordinary-request service-role bypass.
7. Define refresh/logout/reset/event/reconciliation paths, stale-state failure policy and measured revocation freshness. Revalidate relationships/account/versions on every protected request. A retained valid signature or routine refresh cannot restore revoked school authority. Fresh-login and refresh evidence must not be conflated.
8. Obtain explicit authorization for a bounded isolated nonproduction environment with synthetic data only, owner/custodian/reviewer, cost ceiling, short-lived secret custody, incident stop conditions, evidence redaction and inventoried cleanup. No project, user, credential or test resource has been created by Step 12.

## Required future evidence

Actual approved Student and singleton Parent login with distinct internal subjects; wrong/cross-role secrets denied; no/multiple/stale/revoked/inconsistent eligibility denied; secret/reset/version binding; persistent limiter races/outage/restart; genuine native/session callback and refresh; wrong issuer/audience/subject/replayed session rejection; mandatory privileged MFA; independent IAM approval and last-admin safety; ordinary-token direct RLS/private-file denials; audit/financial immutability; suspension/reassignment/withdrawal revocation; sanitized logs; backup/security reconciliation and cleanup. Each result needs approved configuration, exact sanitized procedure, expected/observed outcome, timestamps, reviewer and limits. None was executed live here.

## Expansion gate

Multiple children per Parent and multiple login-eligible guardians per Student remain deferred. Preserve rich domain relationships and historical records, but do not remove singleton rejection or fabricate child links. Reopening expansion needs new explicit policy and resolution/security review, including the original Step 11 ambiguity. The existing fictional two-child preview remains a UI demo, not a promise of initial backend capability.

No external setup or production release is authorized by this document. Step 13 has not started. See [local contracts](STEP-12-AUTH-CONTRACTS.md), [identity rules](STEP-12-SIMPLIFIED-PARENT-IDENTITY.md), [verification](STEP-12-SECURITY-VERIFICATION.md) and [report](../../STEP-12-REPORT.md).
