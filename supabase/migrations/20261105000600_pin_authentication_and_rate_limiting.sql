-- =============================================================================
-- Migration: 20261105000600_pin_authentication_and_rate_limiting.sql
-- Description: PIN Credential Management, MFA Factor Trust Registry,
--              Durable Auth Rate Limiting & Audit Logging.
-- Status: LOCAL DRAFT ONLY. (Do not execute against production database).
-- =============================================================================

begin;

-- 1. Pin Credentials Table
-- Secure storage for peppered & salted PBKDF2 PIN verifiers.
-- Plaintext PINs are NEVER stored, returned, or logged.
create table if not exists public.pin_credentials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  credential_namespace text not null check (credential_namespace in ('student', 'parent')),
  student_id uuid references public.students(id) on delete cascade,
  pin_hash text not null,
  salt text not null,
  iterations integer not null default 100000 check (iterations >= 10000),
  algorithm text not null default 'pbkdf2-sha256',
  status text not null default 'active' check (status in ('active', 'locked', 'revoked')),
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint uq_pin_credential unique (profile_id, credential_namespace, student_id)
);

-- 2. Durable Auth Rate Limiting Table
-- Atomic distributed rate-limit tracking across serverless instances
create table if not exists public.auth_rate_limits (
  key text primary key,
  bucket text not null,
  attempt_count integer not null default 1 check (attempt_count >= 1),
  locked_until timestamptz,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now()
);

-- 3. MFA Factor Trust Registry Table
-- Requires school administration approval before an MFA factor can satisfy School Admin AAL2
create table if not exists public.mfa_factor_trust_registry (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  factor_id text not null unique,
  approved_by uuid not null references public.profiles(id),
  approved_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'revoked'))
);

-- 4. PIN Audit Logs Table
-- Complete immutable audit trail for PIN issuance, rotation, and reset
create table if not exists public.pin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  target_profile_id uuid references public.profiles(id),
  student_id uuid references public.students(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- 5. Enable and Force RLS on all 4 new tables
alter table public.pin_credentials enable row level security;
alter table public.pin_credentials force row level security;

alter table public.auth_rate_limits enable row level security;
alter table public.auth_rate_limits force row level security;

alter table public.mfa_factor_trust_registry enable row level security;
alter table public.mfa_factor_trust_registry force row level security;

alter table public.pin_audit_logs enable row level security;
alter table public.pin_audit_logs force row level security;

-- 6. Revoke direct table manipulation from clients
revoke all on public.pin_credentials from anon, authenticated;
revoke all on public.auth_rate_limits from anon, authenticated;
revoke all on public.mfa_factor_trust_registry from anon, authenticated;
revoke all on public.pin_audit_logs from anon, authenticated;

-- 7. School Admin Audit View Policy
create policy pin_audit_admin_read on public.pin_audit_logs
  for select to authenticated
  using (
    public.current_active_role() = 'admin' and
    public.current_role_has_permission('audit.view')
  );

-- 8. Atomic Rate Limit Evaluation Function
create or replace function public.record_auth_rate_limit(
  p_key text,
  p_max_attempts int default 5,
  p_lockout_seconds int default 900
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_now timestamptz := now();
  v_rec record;
  v_locked boolean := false;
  v_retry_after int := 0;
begin
  select * into v_rec from public.auth_rate_limits where key = p_key for update;
  
  if not found then
    insert into public.auth_rate_limits (key, bucket, attempt_count, first_attempt_at, last_attempt_at)
    values (p_key, split_part(p_key, ':', 1), 1, v_now, v_now)
    returning * into v_rec;
  else
    -- Check if previous lockout expired
    if v_rec.locked_until is not null and v_rec.locked_until <= v_now then
      update public.auth_rate_limits
      set attempt_count = 1, locked_until = null, first_attempt_at = v_now, last_attempt_at = v_now
      where key = p_key
      returning * into v_rec;
    else
      -- Increment attempts
      update public.auth_rate_limits
      set attempt_count = attempt_count + 1,
          last_attempt_at = v_now,
          locked_until = case
            when attempt_count + 1 >= p_max_attempts then v_now + (p_lockout_seconds || ' seconds')::interval
            else locked_until
          end
      where key = p_key
      returning * into v_rec;
    end if;
  end if;

  if v_rec.locked_until is not null and v_rec.locked_until > v_now then
    v_locked := true;
    v_retry_after := ceil(extract(epoch from (v_rec.locked_until - v_now)))::int;
  end if;

  return jsonb_build_object(
    'allowed', not v_locked and (p_max_attempts - v_rec.attempt_count) > 0,
    'attempts', v_rec.attempt_count,
    'remaining', greatest(0, p_max_attempts - v_rec.attempt_count),
    'locked', v_locked,
    'retry_after_seconds', v_retry_after
  );
end;
$$;

alter function public.record_auth_rate_limit(text, int, int) owner to postgres;
grant execute on function public.record_auth_rate_limit(text, int, int) to authenticated, anon;

-- 9. Rate Limit Reset Function
create or replace function public.reset_auth_rate_limit(p_key text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.auth_rate_limits where key = p_key;
end;
$$;

alter function public.reset_auth_rate_limit(text) owner to postgres;
grant execute on function public.reset_auth_rate_limit(text) to authenticated;

-- 10. MFA Factor Trust Verification Helper
create or replace function public.verify_mfa_factor_trusted(
  p_profile_id uuid,
  p_factor_id text
) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.mfa_factor_trust_registry
    where profile_id = p_profile_id
      and factor_id = p_factor_id
      and status = 'active'
  );
$$;

alter function public.verify_mfa_factor_trusted(uuid, text) owner to postgres;
grant execute on function public.verify_mfa_factor_trusted(uuid, text) to authenticated;

-- 11. School Admin MFA Factor Approval Procedure
create or replace function public.approve_mfa_factor(
  p_target_profile_id uuid,
  p_factor_id text
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Only School Admin with active context can approve MFA factors
  if public.current_active_role() <> 'admin' or not public.current_role_has_permission('security.accounts.manage') then
    raise exception 'Unauthorized: Only School Admin can approve MFA factors.' using errcode = '42501';
  end if;

  insert into public.mfa_factor_trust_registry (profile_id, factor_id, approved_by, approved_at, status)
  values (p_target_profile_id, p_factor_id, auth.uid(), now(), 'active')
  on conflict (factor_id) do update set status = 'active', approved_by = auth.uid(), approved_at = now();

  insert into public.pin_audit_logs (actor_profile_id, target_profile_id, action, details)
  values (auth.uid(), p_target_profile_id, 'mfa_factor_approved', jsonb_build_object('factor_id', p_factor_id));

  return true;
end;
$$;

alter function public.approve_mfa_factor(uuid, text) owner to postgres;
grant execute on function public.approve_mfa_factor(uuid, text) to authenticated;

commit;
