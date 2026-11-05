# Step 16B — Migration History & Potential Conflicts Assessment

**Date:** 2026-11-05  
**Review Type:** Step 16B Existing Supabase Production Read-Only Audit & Migration Safety Assessment  
**Execution Mode:** READ-ONLY / NO DATABASE MUTATIONS  
**Safety Protocol:** STRICT SAFETY BOUNDARY — Zero SQL Mutations, No Database Writes.

---

## 1. Migration History Comparison

### Local Prepared Migrations:
1. `supabase/migrations/20261105000100_identity_foundation.sql`  
   **SHA-256:** `3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c` (VERIFIED LOCALLY)
2. `supabase/migrations/20261105000200_school_domain.sql`  
   **SHA-256:** `dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e` (VERIFIED LOCALLY)
3. `supabase/migrations/20261105000300_staff_security.sql`  
   **SHA-256:** `0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9` (VERIFIED LOCALLY)

### Target Migration Table:
- **Migration Tracking Table:** `supabase_migrations.schema_migrations`
- **Target Inspection Status:** **NOT RUN** (No safe read-only database credentials or Management API token configured locally).
- **Previous Audit Records (Steps 13–15):** Reported as **UNAPPLIED** across all previous audit milestones. No migration files were ever applied to the remote target.

---

## 2. Potential Conflict Analysis (Pre-Application Assessment)

Because the migrations are non-idempotent and transactional, we evaluate potential failure modes if applied against different target states:

### Case A: Target Database is Clean / Empty Public Schema (Intended Target State)
- **Table Declarations:** Succeeded cleanly in sequence (`00100` $\to$ `00200` $\to$ `00300`).
- **Dependencies:** `profiles.id` references `auth.users(id)`. Succeeded if Supabase Auth is provisioned.
- **Role Seed:** Succeeded (inserts 5 primary roles into `public.roles`).
- **Schema Creation:** Creates `app_private` schema and sets strict revocations.
- **Functions & Triggers:** Creates 7 functions with `SET search_path = ''` and 5 triggers.
- **Policies:** Creates exactly 4 self-scoped metadata `SELECT` policies for `authenticated`.
- **Conflict Risk:** **ZERO** (if target public schema is empty).

### Case B: Target Database Contains Existing Application Objects (Conflicting Target State)
- **Table Name Collisions:** Standard `CREATE TABLE public.<name>` will throw `relation "<name>" already exists` if any of the 18 tables pre-exist.
- **Transaction Rollback:** Because each migration begins with `begin;` and ends with `commit;`, any duplicate object will trigger an automatic, immediate transaction rollback.
- **Schema Collisions:** `CREATE SCHEMA app_private` in `00300` will fail if `app_private` pre-exists.
- **Column Addition:** `ALTER TABLE public.user_roles ADD COLUMN permissions text[]` in `00300` will fail if column already exists.
- **Trigger Collisions:** `CREATE TRIGGER ...` will fail if triggers pre-exist.
- **Conflict Risk:** **FAIL-CLOSED (Safe Rollback)**. The migrations will refuse to partially overwrite an uncoordinated database.

---

## 3. Structural & Semantic Dependency Review

| Object Type | In-Scope Items | Target Prerequisite | Risk Assessment |
| :--- | :--- | :--- | :--- |
| **Extensions** | `gen_random_uuid()` (standard PG 13+), `collate "C"` | PostgreSQL 13+ support | **LOW** (Standard in Supabase PG 15/16) |
| **Issuer URL** | `auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'` | Exact project reference match | **MEDIUM** (Fails closed if reference differs) |
| **Auth Tables** | `auth.users`, `auth.sessions`, `auth.mfa_factors` | GoTrue internal schema | **MEDIUM** (Target compatibility required) |
| **Schema Permissions** | `REVOKE CREATE ON SCHEMA public` | Run by `postgres` or administrative owner | **LOW** (Standard Supabase migration runner) |
| **Function Ownership** | `ALTER FUNCTION ... OWNER TO postgres;` | Target role `postgres` exists | **LOW** (Standard Supabase superuser role) |

---

## 4. Reconciliation and Safe Application Strategy

1. **Pre-Migration Verification Command:**  
   Before executing the migrations during any future separately authorized phase, an operator or migration script must verify that:
   `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`
   returns 0 application tables, or contains only pre-existing standard extensions.
2. **Sequential Application Without Drift:**  
   Apply the migrations strictly in numerical timestamp order:
   `00100` $\to$ `00200` $\to$ `00300`.
3. **No Migration History Alteration:**  
   Do not manually insert entries into `supabase_migrations.schema_migrations` without executing the corresponding DDL script.
