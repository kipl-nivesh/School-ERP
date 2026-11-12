-- =============================================================================
-- Migration 8: Student Subscription Foundation
-- Brightcamp Multi-School SaaS Monetization Engine
-- =============================================================================
-- 1. Subscription Plans Table (Daily INR 1, Monthly INR 30)
-- 2. Student Subscriptions Table (Immutable Trial & Cumulative Expiry)
-- 3. Subscription Ledger (Financial Transactions & Idempotency)
-- 4. Subscription Events (Audit Logging)
-- 5. Subscription Payment Intents (Checkout Preparation)
-- 6. Atomic Stored Procedures (activate_student_trial, extend_student_subscription_atomic)
-- 7. Query-Time Access Status Function (Zero now() in stored columns)
-- 8. Tenant-Aware Row Level Security (RLS)
-- =============================================================================

begin;

-- =============================================================================
-- 1. Subscription Plans Directory
-- =============================================================================

create table if not exists public.subscription_plans (
  id text primary key check (id in ('daily', 'monthly')),
  name text not null,
  duration_hours int not null check (duration_hours > 0),
  amount_paise bigint not null check (amount_paise >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;
alter table public.subscription_plans force row level security;
revoke all on table public.subscription_plans from public, anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;

-- Seed Standard Confirmed Plans:
-- Daily: INR 1 (100 paise) = 24 hours
-- Monthly: INR 30 (3000 paise) = 720 hours (30 days)
insert into public.subscription_plans (id, name, duration_hours, amount_paise)
values
  ('daily', 'Daily Access Pass', 24, 100),
  ('monthly', 'Monthly Access Pass (30 Days)', 720, 3000)
on conflict (id) do update set
  duration_hours = excluded.duration_hours,
  amount_paise = excluded.amount_paise,
  is_active = excluded.is_active;

-- =============================================================================
-- 2. Student Subscriptions Table
-- =============================================================================

create table if not exists public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  trial_activated boolean not null default false,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_expires_at timestamptz,
  status_override text check (status_override in ('suspended', 'exempt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (trial_activated = false and trial_started_at is null and trial_ends_at is null)
    or
    (trial_activated = true and trial_started_at is not null and trial_ends_at = trial_started_at + interval '240 hours')
  )
);

create index if not exists student_subscriptions_school_idx on public.student_subscriptions(school_id, student_id);

alter table public.student_subscriptions enable row level security;
alter table public.student_subscriptions force row level security;
revoke all on table public.student_subscriptions from public, anon, authenticated;
grant select on public.student_subscriptions to authenticated;

-- =============================================================================
-- 3. Subscription Ledger (Financial Transactions & Replay Defense)
-- =============================================================================

create table if not exists public.subscription_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  plan_id text not null references public.subscription_plans(id),
  amount_paise bigint not null check (amount_paise >= 0),
  duration_hours int not null check (duration_hours > 0),
  payment_method text not null default 'upi' check (payment_method in ('upi', 'card', 'netbanking', 'wallet', 'manual_grant')),
  gateway_payment_id text unique check (gateway_payment_id is null or length(gateway_payment_id) between 3 and 128),
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 128),
  previous_expiry timestamptz,
  new_expiry timestamptz not null,
  recorded_by_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (new_expiry > coalesce(previous_expiry, created_at - interval '1 second'))
);

create index if not exists subscription_ledger_student_idx on public.subscription_ledger(student_id, created_at desc);

alter table public.subscription_ledger enable row level security;
alter table public.subscription_ledger force row level security;
revoke all on table public.subscription_ledger from public, anon, authenticated;
grant select on public.subscription_ledger to authenticated;

-- Immutable ledger trigger (reject UPDATE and DELETE physically)
create or replace function public.reject_subscription_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Subscription ledger entries are immutable and cannot be updated or deleted'
    using errcode = '55P02';
end;
$$;

create or replace trigger trg_subscription_ledger_immutable
  before update or delete on public.subscription_ledger
  for each row execute function public.reject_subscription_ledger_mutation();

-- =============================================================================
-- 4. Subscription Events (Audit Trail)
-- =============================================================================

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  event_type text not null check (event_type in (
    'trial_activated', 'subscription_extended', 'subscription_expired',
    'payment_intent_created', 'payment_intent_failed', 'status_overridden'
  )),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists subscription_events_student_idx on public.subscription_events(student_id, occurred_at desc);

alter table public.subscription_events enable row level security;
alter table public.subscription_events force row level security;
revoke all on table public.subscription_events from public, anon, authenticated;
grant select on public.subscription_events to authenticated;

-- =============================================================================
-- 5. Subscription Payment Intents (Pre-Payment Tracking)
-- =============================================================================

create table if not exists public.subscription_payment_intents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  plan_id text not null references public.subscription_plans(id),
  amount_paise bigint not null check (amount_paise > 0),
  gateway_order_id text unique check (gateway_order_id is null or length(gateway_order_id) between 3 and 128),
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 128),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'expired')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sub_intents_student_idx on public.subscription_payment_intents(student_id, status);

alter table public.subscription_payment_intents enable row level security;
alter table public.subscription_payment_intents force row level security;
revoke all on table public.subscription_payment_intents from public, anon, authenticated;
grant select, insert, update on public.subscription_payment_intents to authenticated;

-- =============================================================================
-- 6. Atomic Stored Procedures
-- =============================================================================

-- Stored Procedure: Atomic Free Trial Activation
-- Strictly activates trial only when student account is activated.
-- Once trial is activated, trial_started_at and trial_ends_at are IMMUTABLE.
create or replace function public.activate_student_trial(
  p_student_id uuid,
  p_school_id uuid
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_sub public.student_subscriptions%rowtype;
  v_now timestamptz := clock_timestamp();
  v_trial_end timestamptz;
begin
  -- Verify student belongs to specified school
  if not exists (
    select 1 from public.students
    where id = p_student_id and school_id = p_school_id
  ) then
    raise exception 'Student % does not belong to school %', p_student_id, p_school_id
      using errcode = '23503';
  end if;

  -- Lock row to prevent race conditions during activation
  select * into v_sub
  from public.student_subscriptions
  where student_id = p_student_id
  for update;

  if not found then
    v_trial_end := v_now + interval '240 hours';
    insert into public.student_subscriptions (
      student_id, school_id, trial_activated, trial_started_at, trial_ends_at, current_period_expires_at
    ) values (
      p_student_id, p_school_id, true, v_now, v_trial_end, v_trial_end
    );

    insert into public.subscription_events (student_id, school_id, event_type, metadata)
    values (p_student_id, p_school_id, 'trial_activated', jsonb_build_object(
      'trial_started_at', v_now,
      'trial_ends_at', v_trial_end,
      'duration_hours', 240
    ));

    return v_trial_end;
  end if;

  -- If trial already activated, NEVER reset it! Return existing trial_ends_at
  if v_sub.trial_activated then
    return v_sub.trial_ends_at;
  end if;

  -- Activate pending record
  v_trial_end := v_now + interval '240 hours';
  update public.student_subscriptions
  set trial_activated = true,
      trial_started_at = v_now,
      trial_ends_at = v_trial_end,
      current_period_expires_at = greatest(coalesce(current_period_expires_at, v_now), v_trial_end),
      updated_at = v_now
  where student_id = p_student_id;

  insert into public.subscription_events (student_id, school_id, event_type, metadata)
  values (p_student_id, p_school_id, 'trial_activated', jsonb_build_object(
    'trial_started_at', v_now,
    'trial_ends_at', v_trial_end,
    'duration_hours', 240
  ));

  return v_trial_end;
end;
$$;
revoke all on function public.activate_student_trial(uuid, uuid) from public, anon, authenticated;
grant execute on function public.activate_student_trial(uuid, uuid) to service_role;

-- Stored Procedure: Atomic Subscription Extension
-- Enforces:
-- 1. Idempotency (replay attack defense)
-- 2. Cumulative stacking: max(current_period_expires_at, now()) + plan duration
-- 3. Never shortens existing entitlement
-- 4. Atomic row locking (FOR UPDATE)
create or replace function public.extend_student_subscription_atomic(
  p_student_id uuid,
  p_school_id uuid,
  p_plan_id text,
  p_idempotency_key text,
  p_gateway_payment_id text default null,
  p_recorded_by uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_sub public.student_subscriptions%rowtype;
  v_existing_ledger public.subscription_ledger%rowtype;
  v_now timestamptz := clock_timestamp();
  v_base_time timestamptz;
  v_new_expiry timestamptz;
  v_duration interval;
begin
  -- Verify student belongs to specified school
  if not exists (
    select 1 from public.students
    where id = p_student_id and school_id = p_school_id
  ) then
    raise exception 'Student % does not belong to school %', p_student_id, p_school_id
      using errcode = '23503';
  end if;

  -- 1. Check idempotency in ledger
  select * into v_existing_ledger
  from public.subscription_ledger
  where idempotency_key = p_idempotency_key
     or (p_gateway_payment_id is not null and gateway_payment_id = p_gateway_payment_id);

  if found then
    -- Check for idempotency payload collision
    if v_existing_ledger.student_id <> p_student_id
       or v_existing_ledger.school_id <> p_school_id
       or v_existing_ledger.plan_id <> p_plan_id then
      raise exception 'Idempotency key or gateway payment ID already used with different parameters (payload collision)'
        using errcode = '42710';
    end if;

    -- Idempotent duplicate: return existing details without applying extension twice
    return jsonb_build_object(
      'status', 'idempotent_duplicate',
      'ledger_id', v_existing_ledger.id,
      'new_expiry', v_existing_ledger.new_expiry,
      'amount_paise', v_existing_ledger.amount_paise,
      'plan_id', v_existing_ledger.plan_id
    );
  end if;

  -- 2. Verify active subscription plan
  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active = true;

  if not found then
    raise exception 'Invalid or inactive subscription plan: %', p_plan_id using errcode = '22023';
  end if;
  v_duration := (v_plan.duration_hours || ' hours')::interval;

  -- 3. Lock subscription row
  select * into v_sub
  from public.student_subscriptions
  where student_id = p_student_id
  for update;

  if not found then
    -- Row does not exist yet; initialize base from now
    v_base_time := v_now;
    v_new_expiry := v_base_time + v_duration;

    insert into public.student_subscriptions (
      student_id, school_id, trial_activated, current_period_expires_at
    ) values (
      p_student_id, p_school_id, false, v_new_expiry
    );
  else
    -- Cumulative stacking: if current subscription is still active in the future,
    -- add duration to current expiry; if expired, add duration to current clock time.
    if v_sub.current_period_expires_at is not null and v_sub.current_period_expires_at > v_now then
      v_base_time := v_sub.current_period_expires_at;
    else
      v_base_time := v_now;
    end if;

    v_new_expiry := v_base_time + v_duration;

    update public.student_subscriptions
    set current_period_expires_at = v_new_expiry,
        updated_at = v_now
    where student_id = p_student_id;
  end if;

  -- 4. Record transaction in subscription ledger
  insert into public.subscription_ledger (
    student_id, school_id, plan_id, amount_paise, duration_hours,
    gateway_payment_id, idempotency_key, previous_expiry, new_expiry, recorded_by_profile_id
  ) values (
    p_student_id, p_school_id, p_plan_id, v_plan.amount_paise, v_plan.duration_hours,
    p_gateway_payment_id, p_idempotency_key, v_sub.current_period_expires_at, v_new_expiry, p_recorded_by
  );

  -- 5. Record audit event
  insert into public.subscription_events (
    student_id, school_id, event_type, metadata
  ) values (
    p_student_id, p_school_id, 'subscription_extended',
    jsonb_build_object(
      'plan_id', p_plan_id,
      'amount_paise', v_plan.amount_paise,
      'duration_hours', v_plan.duration_hours,
      'previous_expiry', v_sub.current_period_expires_at,
      'new_expiry', v_new_expiry,
      'idempotency_key', p_idempotency_key,
      'gateway_payment_id', p_gateway_payment_id
    )
  );

  return jsonb_build_object(
    'status', 'success',
    'student_id', p_student_id,
    'plan_id', p_plan_id,
    'previous_expiry', v_sub.current_period_expires_at,
    'new_expiry', v_new_expiry,
    'amount_paise', v_plan.amount_paise
  );
end;
$$;
revoke all on function public.extend_student_subscription_atomic(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.extend_student_subscription_atomic(uuid, uuid, text, text, text, uuid) to service_role;

-- =============================================================================
-- 7. Query-Time Access Status Function (Zero now() in stored columns)
-- =============================================================================

create or replace function public.get_student_subscription_access(
  p_student_id uuid
) returns table (
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
    return query select false, 'unregistered', false, null::timestamptz, null::timestamptz, 0::bigint;
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
    v_granted := false;
    v_rem := 0;
    v_status := 'expired';
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
revoke all on function public.get_student_subscription_access(uuid) from public, anon;
grant execute on function public.get_student_subscription_access(uuid) to authenticated, service_role;

-- =============================================================================
-- 8. Tenant-Aware Row Level Security (RLS) Policies
-- =============================================================================

-- Subscription Plans Directory (Readable by anon and authenticated users)
create policy sub_plans_select on public.subscription_plans
  for select to anon, authenticated
  using (is_active = true);

-- Student Subscriptions Policy
create policy sub_student_self on public.student_subscriptions
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = student_subscriptions.student_id
        and s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
    )
  );

create policy sub_parent_child on public.student_subscriptions
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'parent'
    and exists (
      select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = student_subscriptions.student_id
        and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid()
        and r.relationship_status = 'verified'
    )
  );

create policy sub_staff_scoped on public.student_subscriptions
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant', 'teacher')
  );

-- Subscription Ledger Policy
create policy sub_ledger_student_self on public.subscription_ledger
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = subscription_ledger.student_id
        and s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
    )
  );

create policy sub_ledger_parent_child on public.subscription_ledger
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'parent'
    and exists (
      select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = subscription_ledger.student_id
        and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid()
        and r.relationship_status = 'verified'
    )
  );

create policy sub_ledger_staff_scoped on public.subscription_ledger
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  );

-- Subscription Events Policy
create policy sub_events_admin_scoped on public.subscription_events
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

-- Subscription Payment Intents Policy
create policy sub_intents_student_self on public.subscription_payment_intents
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = subscription_payment_intents.student_id
        and s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
    )
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = subscription_payment_intents.student_id
        and s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
    )
  );

commit;
