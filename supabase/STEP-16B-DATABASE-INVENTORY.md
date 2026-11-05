# Step 16B — Database Schema Inventory & Target Assessment

**Date:** 2026-11-05  
**Review Type:** Step 16B Existing Supabase Production Read-Only Audit & Migration Safety Assessment  
**Execution Mode:** READ-ONLY / NO DATABASE MUTATIONS  
**Safety Protocol:** STRICT SAFETY BOUNDARY — Zero SQL Mutations, No Secret Disclosure, No Real Data Access.

---

## 1. Protected Target Identity

- **Project Display Name:** `school-erp` (REPORTED BY PREVIOUS AUDIT)
- **Project Reference:** `yedvkcwkflhbqumjwknh` (VERIFIED LOCALLY via configuration)
- **Project URL:** `https://yedvkcwkflhbqumjwknh.supabase.co` (VERIFIED LOCALLY via configuration)
- **Project Branch:** `main` — production-labelled (REPORTED BY PREVIOUS AUDIT)
- **Region:** Singapore (REPORTED BY PREVIOUS AUDIT)
- **Remote Inspection Access Status:** **NOT RUN**  
  *Reason:* Safe read-only database role or connection credentials are not provisioned in the local environment. Local configuration possesses only the modern client publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in `.env.local`. In accordance with Step 16B Safety Rule Section 4, live remote database introspection was **NOT RUN** to avoid requesting privileged credentials or executing untrusted connection commands.

---

## 2. Database Identity Metadata

| Attribute | Specification / Local Evidence | Target Verification Status | Evidence Classification |
| :--- | :--- | :--- | :--- |
| **Project Ref** | `yedvkcwkflhbqumjwknh` | Matches local URL & migration issuer | **VERIFIED LOCALLY** |
| **PostgreSQL Version** | Expected PostgreSQL 15.x / 16.x (Standard Supabase) | Not queried directly | **NOT RUN** |
| **Database Name** | `postgres` (Standard Supabase host DB) | Not queried directly | **NOT RUN** |
| **Default Roles** | `postgres`, `anon`, `authenticated`, `service_role` | Standard Supabase infrastructure | **REPORTED BY PREVIOUS AUDIT** |
| **Application Schemas** | `public` (core schema), `app_private` (prepared in 00300) | Not queried directly | **NOT RUN** |
| **System Schemas** | `auth`, `storage`, `extensions`, `pg_catalog`, `information_schema` | Standard Supabase architecture | **NOT VERIFIED** |

---

## 3. Table-by-Table Inventory (All 18 School ERP Tables)

Every table declared in the prepared migrations is evaluated below against local declarations and target status:

| # | Table Name | Migration File | Status on Target | Local SQL Status | RLS State (SQL) | Granted Roles (SQL) | Policies (SQL) | Potential Conflict |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `roles` | `00100` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists with conflicting codes |
| 2 | `profiles` | `00100` | **NOT RUN** | Prepared | ENABLE + FORCE | `SELECT` to `authenticated` | 1 self-metadata | Conflict if user profiles already defined |
| 3 | `user_roles` | `00100` | **NOT RUN** | Prepared | ENABLE + FORCE | `SELECT` to `authenticated` | 1 self-metadata | Conflict if role membership table exists |
| 4 | `admin_privileges` | `00100` | **NOT RUN** | Prepared | ENABLE + FORCE | `SELECT` to `authenticated` | 1 self-metadata | Conflict if table exists |
| 5 | `role_contexts` | `00100` | **NOT RUN** | Prepared | ENABLE + FORCE | `SELECT` to `authenticated` | 1 self-metadata | Conflict if table exists |
| 6 | `school_configuration` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if singleton table exists |
| 7 | `staff_profiles` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 8 | `academic_years` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 9 | `classes` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 10 | `sections` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 11 | `students` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 12 | `guardians` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 13 | `student_guardian_relationships` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 14 | `parent_login_identities` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 15 | `enrollments` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 16 | `teacher_assignments` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Default deny) | Conflict if table exists |
| 17 | `audit_events` | `00200` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (Immutable triggers) | Conflict if audit table exists |
| 18 | `staff_mfa_enrollment_approvals` | `00300` | **NOT RUN** | Prepared | ENABLE + FORCE | Revoked from ALL | 0 (RPC consumed) | Conflict if approval table exists |

---

## 4. Aggregate Data and Record Assessment

- **Local Mock Records:** All dashboards operate strictly on static, in-memory TypeScript mock fixtures (`src/lib/*-data.ts`).
- **Migration Seeds:** The only seeded database records in the prepared SQL are the **5 fixed primary role codes** in `public.roles`:
  `'admin'`, `'teacher'`, `'student'`, `'parent'`, `'accountant'`
- **Target Live Data Status:** **NOT RUN** (No personal, student, parent, staff, or financial records were inspected or fetched from the remote database).
- **Target Cleanliness Assumption:** The migration scripts are written using standard non-idempotent `CREATE TABLE` statements wrapped in transactions. If the target database already has any table with the same name, migration execution will abort immediately and roll back. Target emptiness must be verified prior to migration execution.
