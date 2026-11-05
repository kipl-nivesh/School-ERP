# Step 16B — Supabase Auth Compatibility & Security Boundaries

**Date:** 2026-11-05  
**Review Type:** Step 16B Existing Supabase Production Read-Only Audit & Migration Safety Assessment  
**Execution Mode:** READ-ONLY / NO DATABASE MUTATIONS  
**Safety Protocol:** STRICT SAFETY BOUNDARY — No Real User Operations, No Credential Access.

---

## 1. Supabase Auth Object Dependencies

The prepared migrations and staff authentication DAL rely on specific objects within Supabase's `auth` schema:

| Target Object / Field | Dependent Prepared Code | Target Status | Local Proof / Offline Status | Compatibility Assessment |
| :--- | :--- | :---: | :---: | :--- |
| `auth.users.id` | `public.profiles.id references auth.users(id)` | **NOT RUN** | **VERIFIED LOCALLY** | Standard primary key in Supabase Auth. `on delete restrict` prevents cascade deletion. |
| `auth.users.email_confirmed_at` | `public.staff_session_is_live()` | **NOT RUN** | **VERIFIED LOCALLY** | Standard GoTrue column. Rejects unconfirmed staff accounts. |
| `auth.users.banned_until` | `public.staff_session_is_live()` | **NOT RUN** | **VERIFIED LOCALLY** | Standard GoTrue column. Rejects banned staff accounts. |
| `auth.sessions.id` | `public.staff_session_is_live()` | **NOT RUN** | **VERIFIED LOCALLY** | GoTrue session UUID. Verified against JWT `session_id`. |
| `auth.sessions.user_id` | `public.staff_session_is_live()` | **NOT RUN** | **VERIFIED LOCALLY** | GoTrue session owner. Verified against `auth.uid()`. |
| `auth.mfa_factors.user_id` | `consume_staff_mfa_enrollment_approval()` | **NOT RUN** | **VERIFIED LOCALLY** | Standard GoTrue MFA factor owner. |
| `auth.mfa_factors.status` | `consume_staff_mfa_enrollment_approval()` | **NOT RUN** | **VERIFIED LOCALLY** | Enum/text `'verified'`. Prevents duplicate enrollment approvals. |
| `auth.uid()` | RLS Policies & Definer Functions | **NOT RUN** | **VERIFIED LOCALLY** | Standard Supabase SQL utility function returning caller's UUID. |
| `auth.jwt()` | `is_native_staff_request()`, Context RPCs | **NOT RUN** | **VERIFIED LOCALLY** | Standard Supabase SQL utility function returning JSONB claims. |

---

## 2. JWT Claim Verification Matrix

`public.is_native_staff_request()`, `public.activate_staff_context()`, and `src/lib/staff/server.ts` validate the following claims in caller JWTs:

| Claim Name | Expected Type | Expected Value / Constraint | Function / Policy Enforcing | Local Verification |
| :--- | :--- | :--- | :--- | :---: |
| `iss` | `text` | `'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'` | `is_native_staff_request()`, TS DAL | **VERIFIED LOCALLY** |
| `role` | `text` | `'authenticated'` | `is_native_staff_request()`, TS DAL | **VERIFIED LOCALLY** |
| `aud` | `text` or `jsonb` | `'authenticated'` or contains `'authenticated'` | `is_native_staff_request()`, TS DAL | **VERIFIED LOCALLY** |
| `sub` | `uuid` (text) | Must match `auth.uid()` and `profiles.id` | `is_native_staff_request()`, RLS policies | **VERIFIED LOCALLY** |
| `session_id` | `uuid` (text) | Must match live `auth.sessions.id` and `role_contexts.id` | `staff_session_is_live()`, `activate_staff_context()` | **VERIFIED LOCALLY** |
| `amr` | `jsonb` array | Must contain element with `{"method": "password"}` | `is_native_staff_request()`, TS DAL | **VERIFIED LOCALLY** |
| `aal` | `text` | Must equal `'aal2'` if caller holds active Super Admin tier | `activate_staff_context()`, TS DAL | **VERIFIED LOCALLY** |
| `exp` | `numeric` | Unix epoch; context expiry capped at $\min(\text{exp}, \text{now} + 30\text{m})$ | `activate_staff_context()`, TS DAL | **VERIFIED LOCALLY** |

---

## 3. Security Definer Execution Support

All 5 `SECURITY DEFINER` functions explicitly set:
`OWNER TO postgres` and `SET search_path = ''`.
- **Target Compatibility:** In Supabase, the `postgres` role has superuser / `BYPASSRLS` privileges and ownership over application schemas.
- **Access to `auth` Schema:** The `postgres` owner has read access to `auth.sessions`, `auth.users`, and `auth.mfa_factors`. Because ordinary `authenticated` users do not possess direct `SELECT` grants on `auth.sessions`, executing these checks inside `SECURITY DEFINER` functions owned by `postgres` enables session verification without granting users access to system tables.
- **Search Path Isolation:** Setting `search_path = ''` and using schema-qualified names (`public.profiles`, `auth.sessions`, etc.) prevents search-path hijacking attacks.

---

## 4. Reaffirmation of Native MFA REST API Exposure (Finding SEC-01)

### Status: **UNRESOLVED / LIVE SUPER ADMIN MFA BLOCKED**

- **Direct Provider Exposure:** Supabase Auth exposes `POST /auth/v1/factors` directly to any authenticated bearer of an AAL1 JWT.
- **Lack of Pre-Enrollment Hook:** GoTrue does not feature a pre-enrollment or factor-creation blocking hook.
- **Safety Determination:** Application-level approval checks in Next.js Server Actions cannot prevent direct HTTP requests to Supabase Auth's REST endpoints.
- **Enforcement:** The live Super Admin MFA lifecycle remains **BLOCKED**, and `STAFF_AUTH_REQUESTS_ENABLED=false` must remain disabled until a provider-level gateway or custom JWT hook is implemented and verified.
