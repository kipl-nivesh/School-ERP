# Prepared Supabase identity migration

Step 14 adds two **unapplied** migrations after the original file, for eighteen tables total, four self-metadata SELECT policies and narrow staff commands. Domain access remains default-deny. Staff requests and Student/Parent PIN authentication remain disabled. See [Step 14 review](STEP-14-REVIEW.md) and [report](../STEP-14-REPORT.md). The following describes the unchanged Step 13 migration alone.

`migrations/20261105000100_identity_foundation.sql` is a **review artifact, not applied**. No CLI config, linked project, generated database types or execution script is supplied. Do not run a DB push/reset or SQL until the owner separately approves it.

The migration prepares five minimal identity tables: roles, profiles, user_roles, admin_privileges and role_contexts. Only the fixed five role codes are seeded; no user/profile/grant or Super Admin is created. Every table enables and forces RLS; ordinary grants are revoked, and there are zero allowing policies. No auth-user trigger, self-update policy, security-definer helper, public signup path or privileged provisioning command is created.

This deliberately blocks all ordinary data access. It is not a complete application schema or an implemented authorization workflow. There are no Parent/Student domain tables, PIN verifiers, finance/audit write paths, Storage policies, permission grants, bootstrap/MFA enforcement commands or role-switch API. Step 12 singleton contracts remain unchanged and unintegrated.

Before application, review actual target schema/version/ownership, role availability, reserved-name conflicts, grants, rollback/backup and intended environment. It is designed to fail on existing conflicting tables rather than silently accept an unknown schema. Future live activity must verify current account/membership/tier/MFA/context/relationship facts; foreign keys and RLS enablement alone cannot prove authorization. PostgreSQL owners/BYPASSRLS infrastructure can retain elevated powers; school Super Admin never gets those credentials for ordinary requests.

No migration parsing, SQL execution, DB constraints, live RLS, concurrency or provider identity was tested. Local tests only inspect expected RLS/revoke text and absence of allowing policies. See [Step 13 setup](../docs/architecture/STEP-13-SUPABASE-FOUNDATION.md) and [report](../STEP-13-REPORT.md).
