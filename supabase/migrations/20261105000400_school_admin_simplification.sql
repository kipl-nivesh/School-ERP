-- Step 18 Migration 4: School Admin-Only Architecture Simplification (Draft / Non-destructive)
-- Removes Super Admin dependencies; establishes School Admin as highest application authority with mandatory AAL2 MFA.
-- LOCAL DRAFT ONLY. NOT EXECUTED ON PRODUCTION DATABASE.
begin;

-- 1. Update user_roles permission ceiling constraint to remove legacy super_admin permissions
alter table public.user_roles drop constraint if exists user_roles_known_permissions;
alter table public.user_roles add constraint user_roles_known_permissions check (
  permissions <@ array[
    'dashboard.admin.view','dashboard.teacher.view','dashboard.student.view','dashboard.parent.view','dashboard.accountant.view',
    'school.settings.read','school.settings.write','admissions.read','admissions.write',
    'students.read','staff.read','academics.manage','attendance.read','attendance.write',
    'homework.read','homework.write','marks.read','marks.write','marks.publish',
    'fees.read','fees.write','payments.read','payments.record','expenses.read',
    'expenses.write','receipts.read','reports.read','reports.export',
    'announcements.read','announcements.write','documents.read','audit.read',
    'children.academics.read','children.fees.read',
    'security.accounts.create','security.accounts.update','security.accounts.suspend',
    'security.credentials.reset','security.sessions.revoke','security.roles.assign',
    'security.roles.revoke','security.permissions.assign','security.permissions.revoke'
  ]::text[]
);

-- 2. Update staff context activation: School Admin requires AAL2 MFA directly
create or replace function public.activate_staff_context(requested_role text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  m public.user_roles;
  sid uuid;
  expiry timestamptz;
begin
  if not public.staff_session_is_live() or requested_role not in ('admin','teacher','accountant') then
    return false;
  end if;

  sid := (auth.jwt()->>'session_id')::uuid;
  expiry := least(to_timestamp((auth.jwt()->>'exp')::double precision), now() + interval '30 minutes');
  if sid is null or expiry <= now() then
    return false;
  end if;

  select * into p from public.profiles where id = auth.uid() for update;
  if not found or p.account_status <> 'active' or p.credential_reset_required then
    return false;
  end if;

  select * into m from public.user_roles
  where profile_id = p.id and role_code = requested_role
    and membership_status = 'active'
    and valid_from <= now()
    and (valid_until is null or valid_until > now());
  if not found then
    return false;
  end if;

  -- Mandatory MFA: School Admin requires verified AAL2 assurance AND verified TOTP factor in auth.mfa_factors
  -- AND session AMR claims confirming an approved multi-factor method was verified in the current session
  if requested_role = 'admin' and auth.jwt()->>'aal' is distinct from 'aal2' then
    return false;
  end if;

  if requested_role = 'admin' and not exists (
    select 1 from auth.mfa_factors
    where user_id = auth.uid()
      and status = 'verified'
      and factor_type = 'totp'
  ) then
    return false;
  end if;

  if requested_role = 'admin' and not exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
    where a->>'method' in ('totp', 'mfa')
  ) then
    return false;
  end if;

  -- Role assignment must contain the respective dashboard view permission
  if not (('dashboard.' || requested_role || '.view') = any(m.permissions)) then
    return false;
  end if;

  insert into public.role_contexts(id,profile_id,role_code,assignment_id,authorization_version,expires_at)
  values(sid,p.id,requested_role,m.id,p.authorization_version,expiry)
  on conflict(id) do update set
    role_code=excluded.role_code,
    assignment_id=excluded.assignment_id,
    authorization_version=excluded.authorization_version,
    context_version=public.role_contexts.context_version+1,
    expires_at=excluded.expires_at,
    revoked_at=null
  where public.role_contexts.profile_id=auth.uid() and public.role_contexts.revoked_at is null;

  if not found then
    return false;
  end if;

  insert into public.audit_events(actor_profile_id,target_profile_id,event_type)
  values(p.id,p.id,'staff_context_activated');

  return true;
end;
$$;

alter function public.activate_staff_context(text) owner to postgres;
revoke all on function public.activate_staff_context(text) from public, anon;
grant execute on function public.activate_staff_context(text) to authenticated;

-- 3. Non-destructive deprecation of admin_privileges:
-- Detach the tier context invalidation trigger so mutations do not affect staff context
drop trigger if exists tier_context_invalidation on public.admin_privileges;

-- Revoke client select grant and drop policy
drop policy if exists tier_self_metadata on public.admin_privileges;
revoke select on public.admin_privileges from authenticated;

-- Table remains in place to preserve non-destructive migration ordering.

-- 4. Fail-closed deprecation for legacy consume_staff_mfa_enrollment_approval RPC
create or replace function public.consume_staff_mfa_enrollment_approval() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  -- SEC-01 resolution: Native GoTrue MFA enrollment handles TOTP directly.
  -- This RPC is deprecated and fails closed to prevent stale reliance on custom approval slots.
  return false;
end;
$$;

alter function public.consume_staff_mfa_enrollment_approval() owner to postgres;
revoke all on function public.consume_staff_mfa_enrollment_approval() from public, anon;
grant execute on function public.consume_staff_mfa_enrollment_approval() to authenticated;

commit;
