-- Step 23 Additive Migration: Multi-School Registration, Onboarding & School Management
-- Depends on migrations 1 through 8. Non-destructive, additive only.

begin;

-- ============================================================================
-- 1. System Feature Flags & Payment-Deferred Launch Mode
-- ============================================================================
create table if not exists public.system_feature_flags (
  flag_name text primary key,
  enabled boolean not null default false,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.system_feature_flags enable row level security;
alter table public.system_feature_flags force row level security;

revoke all on table public.system_feature_flags from public, anon, authenticated;
grant select on table public.system_feature_flags to anon, authenticated, service_role;
grant all on table public.system_feature_flags to service_role;

-- All users can read feature flags
create policy feature_flags_read_policy on public.system_feature_flags
  for select to anon, authenticated
  using (true);

-- Seed payment-deferred access mode flag (default true for pre-gateway launch period)
insert into public.system_feature_flags (flag_name, enabled, description, metadata)
values (
  'payment_deferred_access_mode',
  true,
  'Enables temporary ERP feature access for eligible students and parents prior to payment gateway production launch without recording fabricated transactions.',
  jsonb_build_object('transition_policy', 'explicit_grace_period_notice', 'phase', 'pre_gateway_launch')
)
on conflict (flag_name) do update
set description = excluded.description, metadata = excluded.metadata;

-- Helper to check if payment-deferred mode is active
create or replace function public.is_payment_deferred_access_mode() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select enabled from public.system_feature_flags where flag_name = 'payment_deferred_access_mode'),
    true
  );
$$;

revoke all on function public.is_payment_deferred_access_mode() from public;
grant execute on function public.is_payment_deferred_access_mode() to anon, authenticated, service_role;

-- Add details column to audit_events if missing for rich audit payloads
alter table public.audit_events add column if not exists details jsonb default '{}'::jsonb;

-- ============================================================================
-- 2. School Registration Requests
-- ============================================================================
create table if not exists public.school_registrations (
  id uuid primary key default gen_random_uuid(),
  school_name text not null check (length(trim(school_name)) between 3 and 160),
  school_code text not null check (school_code ~ '^[A-Z0-9_-]{3,20}$'),
  school_email text not null check (school_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  contact_number text not null check (length(trim(contact_number)) between 7 and 20),
  address_line text not null check (length(trim(address_line)) between 3 and 255),
  city text not null check (length(trim(city)) between 2 and 100),
  state text not null check (length(trim(state)) between 2 and 100),
  postal_code text not null check (length(trim(postal_code)) between 3 and 20),
  admin_name text not null check (length(trim(admin_name)) between 2 and 160),
  admin_email text not null check (admin_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  approved_at timestamptz,
  approved_by text,
  provisioned_school_id uuid references public.schools(id) on delete set null,
  provisioned_admin_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normalized unique constraints on active/pending registrations
create unique index if not exists uq_school_registrations_code_pending
  on public.school_registrations (upper(school_code))
  where status in ('pending', 'approved');

create unique index if not exists uq_school_registrations_school_email_pending
  on public.school_registrations (lower(school_email))
  where status = 'pending';

create unique index if not exists uq_school_registrations_admin_email_pending
  on public.school_registrations (lower(admin_email))
  where status = 'pending';

alter table public.school_registrations enable row level security;
alter table public.school_registrations force row level security;

revoke all on table public.school_registrations from public, anon, authenticated;
grant insert on table public.school_registrations to anon, authenticated;
grant select, update, delete on table public.school_registrations to service_role;

-- Allow anonymous or authenticated applicant to submit registration
create policy school_registrations_insert_policy on public.school_registrations
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and provisioned_school_id is null
    and provisioned_admin_profile_id is null
    and approved_at is null
  );

-- ============================================================================
-- 3. School Onboarding Progress (8-Step Guided Wizard)
-- ============================================================================
create table if not exists public.school_onboarding_progress (
  school_id uuid primary key references public.schools(id) on delete cascade,
  current_step integer not null default 1 check (current_step between 1 and 8),
  completed_steps integer[] not null default '{}',
  step_data jsonb not null default '{}'::jsonb,
  is_completed boolean not null default false,
  completed_at timestamptz,
  last_saved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.school_onboarding_progress enable row level security;
alter table public.school_onboarding_progress force row level security;

revoke all on table public.school_onboarding_progress from public, anon, authenticated;
grant select, insert, update on table public.school_onboarding_progress to authenticated;
grant all on table public.school_onboarding_progress to service_role;

create policy onboarding_progress_admin_policy on public.school_onboarding_progress
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

-- ============================================================================
-- 4. Staff Invitations (Teacher & Accountant Invitations)
-- ============================================================================
create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  display_name text not null check (length(trim(display_name)) between 2 and 160),
  role_code text not null check (role_code in ('teacher', 'accountant')),
  invitation_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_staff_invitations_school_email_role
  on public.staff_invitations (school_id, lower(email), role_code)
  where status = 'pending';

alter table public.staff_invitations enable row level security;
alter table public.staff_invitations force row level security;

revoke all on table public.staff_invitations from public, anon, authenticated;
grant select, insert, update on table public.staff_invitations to authenticated;
grant all on table public.staff_invitations to service_role;

create policy staff_invitations_admin_policy on public.staff_invitations
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

-- ============================================================================
-- 5. Student Portal Activation Decoupling
-- ============================================================================
alter table public.students add column if not exists portal_access_status text
  not null default 'pending_activation'
  check (portal_access_status in ('pending_activation', 'active', 'suspended', 'disabled'));

alter table public.students add column if not exists portal_activated_at timestamptz;
alter table public.students add column if not exists portal_activated_by uuid references public.profiles(id);

create index if not exists idx_students_portal_status
  on public.students (school_id, portal_access_status);

-- ============================================================================
-- 6. RPC: Submit School Registration
-- ============================================================================
create or replace function public.submit_school_registration(
  p_school_name text,
  p_school_code text,
  p_school_email text,
  p_contact_number text,
  p_address_line text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_admin_name text,
  p_admin_email text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_normalized_code text;
  v_normalized_school_email text;
  v_normalized_admin_email text;
  v_reg_id uuid;
begin
  -- Normalize code and emails
  v_normalized_code := upper(trim(p_school_code));
  v_normalized_school_email := lower(trim(p_school_email));
  v_normalized_admin_email := lower(trim(p_admin_email));

  -- Validate code format
  if v_normalized_code !~ '^[A-Z0-9_-]{3,20}$' then
    raise exception 'Invalid school code format. Must be 3-20 uppercase alphanumeric characters.'
      using errcode = '22023';
  end if;

  -- Validate that school code is not already in use by active school
  if exists (select 1 from public.schools where upper(code) = v_normalized_code) then
    raise exception 'School code % is already registered.', v_normalized_code
      using errcode = '23505';
  end if;

  -- Validate that school code is not already in pending registration
  if exists (select 1 from public.school_registrations where upper(school_code) = v_normalized_code and status in ('pending', 'approved')) then
    raise exception 'A registration application with school code % is already pending review.', v_normalized_code
      using errcode = '23505';
  end if;

  -- Insert registration application
  insert into public.school_registrations (
    school_name,
    school_code,
    school_email,
    contact_number,
    address_line,
    city,
    state,
    postal_code,
    admin_name,
    admin_email,
    status
  ) values (
    trim(p_school_name),
    v_normalized_code,
    v_normalized_school_email,
    trim(p_contact_number),
    trim(p_address_line),
    trim(p_city),
    trim(p_state),
    trim(p_postal_code),
    trim(p_admin_name),
    v_normalized_admin_email,
    'pending'
  )
  returning id into v_reg_id;

  -- Log audit event
  insert into public.audit_events (
    actor_profile_id,
    target_profile_id,
    event_type,
    details
  ) values (
    auth.uid(),
    null,
    'school_registration_submitted',
    jsonb_build_object(
      'registration_id', v_reg_id,
      'school_name', trim(p_school_name),
      'school_code', v_normalized_code,
      'admin_email', v_normalized_admin_email
    )
  );

  return jsonb_build_object(
    'status', 'success',
    'registration_id', v_reg_id,
    'school_code', v_normalized_code,
    'message', 'Registration submitted successfully and is pending administrative review.'
  );
end;
$$;

revoke all on function public.submit_school_registration from public;
grant execute on function public.submit_school_registration(text, text, text, text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- ============================================================================
-- 7. RPC: Provision Approved School (Trusted Server Operator Workflow)
-- ============================================================================
create or replace function public.provision_approved_school(
  p_registration_id uuid,
  p_operator_id text,
  p_admin_auth_user_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reg public.school_registrations%rowtype;
  v_school_id uuid;
  v_acad_id uuid;
  v_admin_role_id uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
begin
  -- Idempotency check: if already approved and provisioned, return cached provisioning
  select * into v_reg from public.school_registrations where id = p_registration_id for update;
  if not found then
    raise exception 'School registration % not found.', p_registration_id using errcode = '02000';
  end if;

  if v_reg.status = 'approved' and v_reg.provisioned_school_id is not null then
    return jsonb_build_object(
      'status', 'success',
      'idempotent', true,
      'school_id', v_reg.provisioned_school_id,
      'admin_profile_id', v_reg.provisioned_admin_profile_id,
      'school_code', v_reg.school_code
    );
  end if;

  if v_reg.status <> 'pending' then
    raise exception 'Registration % is in state % and cannot be approved.', p_registration_id, v_reg.status
      using errcode = '55000';
  end if;

  -- 1. Create or get School
  insert into public.schools (code, name, status)
  values (v_reg.school_code, v_reg.school_name, 'active')
  on conflict (code) do update set name = excluded.name, status = 'active'
  returning id into v_school_id;

  -- 2. Create Initial Academic Year for School
  insert into public.academic_years (school_id, label, starts_on, ends_on)
  values (
    v_school_id,
    to_char(v_now, 'YYYY') || '-' || to_char(v_now + interval '1 year', 'YY'),
    date_trunc('year', v_now)::date,
    (date_trunc('year', v_now) + interval '1 year' - interval '1 day')::date
  )
  on conflict do nothing
  returning id into v_acad_id;

  -- 3. Ensure School Configuration Row Exists
  insert into public.school_configuration (id, display_name)
  values (true, v_reg.school_name)
  on conflict (id) do update set display_name = excluded.display_name;

  -- 4. Provision School Admin Profile & Membership
  insert into public.profiles (id, account_status, credential_reset_required, authorization_version)
  values (p_admin_auth_user_id, 'active', false, 1)
  on conflict (id) do update set account_status = 'active';

  insert into public.staff_profiles (profile_id, school_id, display_name)
  values (p_admin_auth_user_id, v_school_id, v_reg.admin_name)
  on conflict (profile_id, school_id) do update set display_name = excluded.display_name;

  insert into public.user_roles (id, profile_id, school_id, role_code, membership_status)
  values (v_admin_role_id, p_admin_auth_user_id, v_school_id, 'admin', 'active')
  on conflict (profile_id, school_id, role_code) do update set membership_status = 'active';

  -- 5. Initialize Onboarding Progress
  insert into public.school_onboarding_progress (school_id, current_step, completed_steps, step_data, is_completed, last_saved_by)
  values (
    v_school_id,
    1,
    '{}',
    jsonb_build_object(
      'school_name', v_reg.school_name,
      'school_code', v_reg.school_code,
      'contact_number', v_reg.contact_number,
      'address_line', v_reg.address_line,
      'city', v_reg.city,
      'state', v_reg.state,
      'postal_code', v_reg.postal_code,
      'admin_name', v_reg.admin_name,
      'admin_email', v_reg.admin_email
    ),
    false,
    p_admin_auth_user_id
  )
  on conflict (school_id) do nothing;

  -- 6. Update Registration status
  update public.school_registrations
  set status = 'approved',
      approved_at = v_now,
      approved_by = p_operator_id,
      provisioned_school_id = v_school_id,
      provisioned_admin_profile_id = p_admin_auth_user_id,
      updated_at = v_now
  where id = p_registration_id;

  -- 7. Audit log
  insert into public.audit_events (
    actor_profile_id,
    target_profile_id,
    event_type,
    details
  ) values (
    null,
    p_admin_auth_user_id,
    'school_approved_and_provisioned',
    jsonb_build_object(
      'registration_id', p_registration_id,
      'school_id', v_school_id,
      'school_code', v_reg.school_code,
      'operator_id', p_operator_id
    )
  );

  return jsonb_build_object(
    'status', 'success',
    'school_id', v_school_id,
    'school_code', v_reg.school_code,
    'admin_profile_id', p_admin_auth_user_id,
    'academic_year_id', v_acad_id
  );
end;
$$;

revoke all on function public.provision_approved_school(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.provision_approved_school(uuid, text, uuid) to service_role;

-- ============================================================================
-- 8. RPC: Reject School Registration (Trusted Server Operator Workflow)
-- ============================================================================
create or replace function public.reject_school_registration(
  p_registration_id uuid,
  p_operator_id text,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reg public.school_registrations%rowtype;
begin
  select * into v_reg from public.school_registrations where id = p_registration_id for update;
  if not found then
    raise exception 'School registration % not found.', p_registration_id using errcode = '02000';
  end if;

  if v_reg.status <> 'pending' then
    raise exception 'Registration % is in state % and cannot be rejected.', p_registration_id, v_reg.status
      using errcode = '55000';
  end if;

  update public.school_registrations
  set status = 'rejected',
      rejection_reason = p_reason,
      approved_by = p_operator_id,
      updated_at = clock_timestamp()
  where id = p_registration_id;

  insert into public.audit_events (
    actor_profile_id,
    target_profile_id,
    event_type,
    details
  ) values (
    null,
    null,
    'school_registration_rejected',
    jsonb_build_object(
      'registration_id', p_registration_id,
      'school_code', v_reg.school_code,
      'operator_id', p_operator_id,
      'reason', p_reason
    )
  );

  return jsonb_build_object('status', 'success', 'registration_id', p_registration_id);
end;
$$;

revoke all on function public.reject_school_registration(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reject_school_registration(uuid, text, text) to service_role;

-- ============================================================================
-- 9. RPC: Initial School Admin MFA Bootstrap (Deadlock-Free Factor Trust)
-- ============================================================================
create or replace function public.bootstrap_initial_school_admin_mfa(
  p_school_id uuid,
  p_admin_profile_id uuid,
  p_factor_id text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  -- 1. Verify target profile holds active School Admin role for the school
  if not exists (
    select 1 from public.user_roles
    where profile_id = p_admin_profile_id
      and school_id = p_school_id
      and role_code = 'admin'
      and membership_status = 'active'
  ) then
    raise exception 'Profile % is not an active School Admin for school %', p_admin_profile_id, p_school_id
      using errcode = '42501';
  end if;

  -- 2. Verify no active trusted MFA factor already exists (strict bootstrap safeguard)
  if exists (
    select 1 from public.mfa_factor_trust_registry
    where profile_id = p_admin_profile_id
      and status = 'active'
      and factor_id <> p_factor_id
  ) then
    raise exception 'Initial MFA factor trust already established. Standard approval procedure required.'
      using errcode = '55000';
  end if;

  -- 3. Register factor as active in trust registry
  insert into public.mfa_factor_trust_registry (
    profile_id,
    factor_id,
    approved_by,
    approved_at,
    status
  ) values (
    p_admin_profile_id,
    p_factor_id,
    p_admin_profile_id,
    clock_timestamp(),
    'active'
  )
  on conflict (factor_id) do update
  set status = 'active', approved_at = clock_timestamp();

  -- 4. Audit log
  insert into public.audit_events (
    actor_profile_id,
    target_profile_id,
    event_type,
    details
  ) values (
    p_admin_profile_id,
    p_admin_profile_id,
    'initial_admin_mfa_bootstrapped',
    jsonb_build_object(
      'school_id', p_school_id,
      'factor_id', p_factor_id
    )
  );

  return jsonb_build_object('status', 'success', 'factor_id', p_factor_id);
end;
$$;

revoke all on function public.bootstrap_initial_school_admin_mfa(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.bootstrap_initial_school_admin_mfa(uuid, uuid, text) to service_role;

-- ============================================================================
-- 10. RPC: Student Portal Activation (Starts Exact 240-Hour Free Trial)
-- ============================================================================
create or replace function public.activate_student_portal_access(
  p_student_id uuid,
  p_school_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_stu public.students%rowtype;
  v_trial_end timestamptz;
  v_caller_role text := public.current_active_role();
  v_caller_school uuid := public.current_school_id();
  v_is_service_role boolean := (coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), auth.jwt()->>'role', current_setting('role', true)) = 'service_role');
begin
  -- 1. Authorization: service_role OR School Admin of the same school
  if not v_is_service_role and current_user <> 'postgres' then
    if v_caller_role <> 'admin' or v_caller_school <> p_school_id then
      raise exception 'Unauthorized to activate student portal access.' using errcode = '42501';
    end if;
  end if;

  -- 2. Verify student exists and belongs to school
  select * into v_stu from public.students where id = p_student_id and school_id = p_school_id for update;
  if not found then
    raise exception 'Student % does not belong to school %', p_student_id, p_school_id using errcode = '23503';
  end if;

  -- 3. Update student portal status to active
  update public.students
  set portal_access_status = 'active',
      portal_activated_at = coalesce(portal_activated_at, clock_timestamp()),
      portal_activated_by = auth.uid()
  where id = p_student_id and school_id = p_school_id;

  -- 4. Invoke trusted activate_student_trial (starts 240h trial exactly once)
  v_trial_end := public.activate_student_trial(p_student_id, p_school_id);

  -- 5. Audit log
  insert into public.audit_events (
    actor_profile_id,
    target_profile_id,
    event_type,
    details
  ) values (
    auth.uid(),
    v_stu.profile_id,
    'student_portal_activated',
    jsonb_build_object(
      'student_id', p_student_id,
      'school_id', p_school_id,
      'trial_ends_at', v_trial_end
    )
  );

  return jsonb_build_object(
    'status', 'success',
    'student_id', p_student_id,
    'portal_access_status', 'active',
    'trial_ends_at', v_trial_end
  );
end;
$$;

revoke all on function public.activate_student_portal_access(uuid, uuid) from public, anon;
grant execute on function public.activate_student_portal_access(uuid, uuid) to authenticated, service_role;

-- ============================================================================
-- 11. Update get_student_subscription_access for Payment-Deferred Launch Mode
-- ============================================================================
create or replace function public.get_student_subscription_access(p_student_id uuid)
returns table (
  is_access_granted boolean,
  status text,
  trial_activated boolean,
  trial_ends_at timestamptz,
  current_period_expires_at timestamptz,
  remaining_seconds bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_sub public.student_subscriptions%rowtype;
  v_now timestamptz := clock_timestamp();
  v_effective_expiry timestamptz;
  v_rem bigint := 0;
  v_granted boolean := false;
  v_status text := 'unsubscribed';
  v_deferred boolean := public.is_payment_deferred_access_mode();
begin
  -- Authorization check: Caller must be service_role, superuser (no JWT claims), staff in same school, student self, or verified parent
  if coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), auth.jwt()->>'role', current_setting('role', true)) <> 'service_role'
     and auth.uid() is not null
     and not exists (
    -- Staff in same school
    select 1 from public.staff_profiles sp
    join public.profiles p on p.id = sp.profile_id
    join public.students s on s.school_id = sp.school_id
    where sp.profile_id = auth.uid() and s.id = p_student_id and p.account_status = 'active'
    union all
    -- Student self
    select 1 from public.students s
    where s.id = p_student_id and s.profile_id = auth.uid()
    union all
    -- Verified Guardian of child
    select 1 from public.student_guardian_relationships r
    join public.guardians g on g.id = r.guardian_id
    where r.student_id = p_student_id and g.profile_id = auth.uid() and r.relationship_status = 'verified'
  ) then
    raise exception 'Unauthorized to query subscription access for student %', p_student_id
      using errcode = '42501';
  end if;

  select * into v_sub
  from public.student_subscriptions
  where student_id = p_student_id;

  if not found then
    -- If in payment-deferred launch mode, unregistered students also receive provisional access without falsified ledger
    if v_deferred then
      return query select true, 'payment_deferred_access', false, null::timestamptz, null::timestamptz, 8640000::bigint;
    else
      return query select false, 'unregistered', false, null::timestamptz, null::timestamptz, 0::bigint;
    end if;
    return;
  end if;

  if v_sub.status_override = 'suspended' then
    return query select false, 'suspended', v_sub.trial_activated, v_sub.trial_ends_at, v_sub.current_period_expires_at, 0::bigint;
    return;
  end if;

  if v_sub.status_override = 'exempt' then
    return query select true, 'exempt', v_sub.trial_activated, v_sub.trial_ends_at, v_sub.current_period_expires_at, 8640000::bigint;
    return;
  end if;

  -- Determine effective expiry: greatest of trial_ends_at and current_period_expires_at
  v_effective_expiry := coalesce(v_sub.current_period_expires_at, v_sub.trial_ends_at);

  if v_effective_expiry is not null and v_effective_expiry > v_now then
    v_granted := true;
    v_rem := extract(epoch from (v_effective_expiry - v_now))::bigint;
    if v_sub.current_period_expires_at is not null and v_sub.current_period_expires_at > v_now then
      v_status := 'subscription_active';
    else
      v_status := 'trial_active';
    end if;
  else
    -- If active trial/subscription expired: check payment-deferred launch mode
    if v_deferred then
      v_granted := true;
      v_rem := 8640000;
      v_status := 'payment_deferred_access';
    else
      v_granted := false;
      v_rem := 0;
      v_status := 'expired';
    end if;
  end if;

  return query select
    v_granted,
    v_status,
    v_sub.trial_activated,
    v_sub.trial_ends_at,
    v_sub.current_period_expires_at,
    v_rem;
end;
$$;

revoke all on function public.get_student_subscription_access(uuid) from public;
grant execute on function public.get_student_subscription_access(uuid) to anon, authenticated, service_role;

commit;
