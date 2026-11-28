-- Migration 052: Complete Parent Portal Auth, RLS, Publications & Admin Management
-- 1. Hardens parent_session_is_live() with role_contexts binding, email confirmation,
--    and strict role isolation (excludes Staff and Student roles).
-- 2. Adds Parent OTP precheck, persistent rate limiting / resend cooldown,
--    bind_parent_portal_session(), read_parent_portal_identity(), and revoke_parent_portal_session().
-- 3. Adds Parent RLS policies for student_exam_schedule, student_portal_materials, and linked child profiles.
-- 4. Adds Admin AAL2-MFA-gated RPCs for Parent invitation/linking, multi-child management,
--    relationship updates, suspension/reactivation with session revocation, and audit logging.

begin;

-- =============================================================================
-- 1. Parent Session Liveness & Binding
-- =============================================================================

create or replace function public.parent_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_native_parent_request()
    and exists (
      select 1
      from public.role_contexts rc
      join auth.sessions ses on ses.id = rc.id and ses.user_id = rc.profile_id
      join auth.users u on u.id = rc.profile_id
      join public.schools sc on sc.id = rc.school_id
      join public.profiles p on p.id = rc.profile_id
      join public.user_roles r on r.id = rc.assignment_id
        and r.profile_id = rc.profile_id
        and r.school_id = rc.school_id
        and r.role_code = 'parent'
      join public.guardians g on g.profile_id = rc.profile_id
      where rc.id::text = auth.jwt()->>'session_id'
        and rc.profile_id = auth.uid()
        and rc.role_code = 'parent'
        and rc.revoked_at is null
        and rc.expires_at > now()
        and (ses.not_after is null or ses.not_after > now())
        and u.email_confirmed_at is not null
        and (u.banned_until is null or u.banned_until <= now())
        and sc.status = 'active'
        and p.account_status = 'active'
        and not p.credential_reset_required
        and p.authorization_version = rc.authorization_version
        and r.membership_status = 'active'
        and 'dashboard.parent.view' = any(r.permissions)
        and r.valid_from <= now()
        and (r.valid_until is null or r.valid_until > now())
        and exists (
          select 1
          from public.student_guardian_relationships sgr
          join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
          where sgr.guardian_id = g.id
            and sgr.school_id = rc.school_id
            and sgr.relationship_status = 'verified'
            and sgr.valid_from <= now()
            and (sgr.valid_until is null or sgr.valid_until > now())
            and (sgr.academic_access = true or sgr.fee_access = true)
            and s.enrollment_status = 'active'
        )
        and not exists (
          select 1 from public.user_roles other
          where other.profile_id = rc.profile_id
            and other.role_code <> 'parent'
            and other.membership_status = 'active'
            and other.valid_from <= now()
            and (other.valid_until is null or other.valid_until > now())
        )
    );
$$;

alter function public.parent_session_is_live() owner to postgres;
revoke all on function public.parent_session_is_live() from public, anon, service_role;
grant execute on function public.parent_session_is_live() to authenticated;

-- Pre-check whether an email is an eligible verified guardian (returns boolean only; never leaks details)
create or replace function public.precheck_parent_otp_target(p_email text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  clean_email text;
  uid uuid;
begin
  if p_email is null then return false; end if;
  clean_email := lower(btrim(p_email));
  if length(clean_email) not between 3 and 254 or clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return false;
  end if;

  select u.id into uid
  from auth.users u
  where lower(u.email) = clean_email
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= now())
    and u.is_sso_user is not true
  limit 1;
  if uid is null then return false; end if;

  return exists (
    select 1
    from public.profiles p
    join public.guardians g on g.profile_id = p.id
    join public.user_roles r on r.profile_id = p.id and r.role_code = 'parent'
    join public.schools sc on sc.id = r.school_id
    where p.id = uid
      and p.account_status = 'active'
      and not p.credential_reset_required
      and sc.status = 'active'
      and r.membership_status = 'active'
      and 'dashboard.parent.view' = any(r.permissions)
      and r.valid_from <= now()
      and (r.valid_until is null or r.valid_until > now())
      and exists (
        select 1
        from public.student_guardian_relationships sgr
        join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
        where sgr.guardian_id = g.id
          and sgr.school_id = r.school_id
          and sgr.relationship_status = 'verified'
          and sgr.valid_from <= now()
          and (sgr.valid_until is null or sgr.valid_until > now())
          and (sgr.academic_access = true or sgr.fee_access = true)
          and s.enrollment_status = 'active'
      )
      and not exists (
        select 1 from public.user_roles other
        where other.profile_id = p.id
          and other.role_code <> 'parent'
          and other.membership_status = 'active'
          and other.valid_from <= now()
          and (other.valid_until is null or other.valid_until > now())
      )
  );
end;
$$;

alter function public.precheck_parent_otp_target(text) owner to postgres;
revoke all on function public.precheck_parent_otp_target(text) from public, service_role;
grant execute on function public.precheck_parent_otp_target(text) to anon, authenticated;

-- Persistent rate limit & resend cooldown for Parent OTP ('send' or 'verify')
create or replace function public.check_parent_otp_rate_limit(p_email text, p_kind text, p_reset boolean default false)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = '' as $$
declare
  clean_email text;
  attempt_key text;
  rec public.auth_rate_limits%rowtype;
  max_attempts integer;
  cooldown_seconds integer := 60;
  lock_minutes integer := 15;
  since_last integer;
begin
  if p_email is null or p_kind not in ('send', 'verify') then
    return query select false, 60;
    return;
  end if;
  clean_email := lower(btrim(p_email));
  attempt_key := 'parent-otp-' || p_kind || ':' || encode(sha256(convert_to(clean_email, 'UTF8')), 'hex');

  if p_reset and p_kind = 'verify' then
    if auth.uid() is null then
      return query select false, 60;
      return;
    end if;
    delete from public.auth_rate_limits where key = attempt_key;
    return query select true, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(attempt_key, 0));
  select * into rec from public.auth_rate_limits a where a.key = attempt_key for update;

  if rec.locked_until is not null and rec.locked_until > now() then
    return query select false, greatest(1, ceil(extract(epoch from (rec.locked_until - now())))::integer);
    return;
  end if;

  if found and (rec.first_attempt_at <= now() - interval '15 minutes' or (rec.locked_until is not null and rec.locked_until <= now())) then
    delete from public.auth_rate_limits where key = attempt_key;
    found := false;
  end if;

  if p_kind = 'send' and found then
    since_last := floor(extract(epoch from (now() - rec.last_attempt_at)))::integer;
    if since_last < cooldown_seconds then
      return query select false, (cooldown_seconds - since_last);
      return;
    end if;
  end if;

  max_attempts := 5;
  insert into public.auth_rate_limits as a (key, bucket, attempt_count, first_attempt_at, last_attempt_at)
  values (attempt_key, 'parent-otp-' || p_kind, 1, now(), now())
  on conflict (key) do update set
    attempt_count = a.attempt_count + 1,
    last_attempt_at = now(),
    locked_until = case when a.attempt_count + 1 >= max_attempts then now() + make_interval(mins => lock_minutes) else null end;

  return query select true, 0;
end;
$$;

alter function public.check_parent_otp_rate_limit(text, text, boolean) owner to postgres;
revoke all on function public.check_parent_otp_rate_limit(text, text, boolean) from public, service_role;
grant execute on function public.check_parent_otp_rate_limit(text, text, boolean) to anon, authenticated;

-- Bind native Parent session to role_contexts after verifyOtp
create or replace function public.bind_parent_portal_session(p_session uuid, p_profile uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  assignment_id uuid;
  bound_school uuid;
  auth_version bigint;
begin
  if auth.uid() is null or p_profile is distinct from auth.uid()
    or p_session is null or p_session::text is distinct from auth.jwt()->>'session_id'
    or public.is_native_parent_request() is not true then
    return false;
  end if;

  select r.id, r.school_id, p.authorization_version
    into assignment_id, bound_school, auth_version
  from public.user_roles r
  join public.profiles p on p.id = r.profile_id
  join public.schools sc on sc.id = r.school_id
  join auth.sessions ses on ses.id = p_session and ses.user_id = p.id
  join auth.users u on u.id = p.id
  join public.guardians g on g.profile_id = p.id
  where r.profile_id = p_profile
    and r.role_code = 'parent'
    and 'dashboard.parent.view' = any(r.permissions)
    and r.membership_status = 'active'
    and r.valid_from <= now()
    and (r.valid_until is null or r.valid_until > now())
    and p.account_status = 'active'
    and not p.credential_reset_required
    and sc.status = 'active'
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= now())
    and ses.created_at > now() - interval '10 minutes'
    and (ses.not_after is null or ses.not_after > now())
    and exists (
      select 1
      from public.student_guardian_relationships sgr
      join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
      where sgr.guardian_id = g.id
        and sgr.school_id = r.school_id
        and sgr.relationship_status = 'verified'
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and (sgr.academic_access = true or sgr.fee_access = true)
        and s.enrollment_status = 'active'
    )
    and not exists (
      select 1 from public.user_roles other
      where other.profile_id = p_profile
        and other.role_code <> 'parent'
        and other.membership_status = 'active'
        and other.valid_from <= now()
        and (other.valid_until is null or other.valid_until > now())
    )
  order by r.id asc
  limit 1;

  if assignment_id is null or bound_school is null then
    return false;
  end if;

  insert into public.role_contexts
    (id, profile_id, role_code, assignment_id, context_version, authorization_version, expires_at, school_id)
  values
    (p_session, p_profile, 'parent', assignment_id, 1, auth_version, now() + interval '8 hours', bound_school)
  on conflict (id) do nothing;

  return exists (
    select 1 from public.role_contexts rc
    where rc.id = p_session
      and rc.profile_id = p_profile
      and rc.role_code = 'parent'
      and rc.school_id = bound_school
      and rc.revoked_at is null
      and rc.expires_at > now()
  );
end;
$$;

alter function public.bind_parent_portal_session(uuid, uuid) owner to postgres;
revoke all on function public.bind_parent_portal_session(uuid, uuid) from public, anon, service_role;
grant execute on function public.bind_parent_portal_session(uuid, uuid) to authenticated;

-- Read verified Parent identity and linked children list in one request
create or replace function public.read_parent_portal_identity()
returns table (
  guardian_id uuid,
  profile_id uuid,
  school_id uuid,
  school_name text,
  display_name text,
  database_date date,
  children jsonb
)
language sql stable security definer set search_path = '' as $$
  select
    g.id as guardian_id,
    g.profile_id,
    sc.id as school_id,
    sc.name as school_name,
    g.display_name,
    current_date as database_date,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'relationship_id', sgr.id,
          'student_id', s.id,
          'student_name', s.display_name,
          'full_name', s.display_name,
          'registration_number', s.registration_number,
          'academic_access', (sgr.academic_access and public.current_role_has_permission('children.academics.read')),
          'fee_access', (sgr.fee_access and public.current_role_has_permission('children.fees.read')),
          'relationship_version', sgr.relationship_version,
          'section_id', enr.section_id,
          'academic_year_id', enr.academic_year_id,
          'class_name', cls.name,
          'section_name', sec.name,
          'academic_year', ay.label
        )
        order by s.registration_number, s.id
      )
      from public.student_guardian_relationships sgr
      join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
      left join lateral (
        select e.section_id, e.academic_year_id
        from public.enrollments e
        where e.student_id = s.id
          and e.school_id = s.school_id
          and e.valid_from <= current_date
          and (e.valid_until is null or e.valid_until >= current_date)
        order by e.valid_from desc
        limit 1
      ) enr on true
      left join public.sections sec on sec.id = enr.section_id and sec.school_id = s.school_id
      left join public.classes cls on cls.id = sec.class_id and cls.school_id = s.school_id
      left join public.academic_years ay on ay.id = enr.academic_year_id and ay.school_id = s.school_id
      where sgr.guardian_id = g.id
        and sgr.school_id = sc.id
        and sgr.relationship_status = 'verified'
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and (
          (sgr.academic_access and public.current_role_has_permission('children.academics.read'))
          or (sgr.fee_access and public.current_role_has_permission('children.fees.read'))
        )
        and s.enrollment_status = 'active'
    ), '[]'::jsonb) as children
  from public.guardians g
  join public.schools sc on sc.id = public.current_school_id()
  where public.parent_session_is_live()
    and public.current_active_role() = 'parent'
    and g.profile_id = auth.uid();
$$;

alter function public.read_parent_portal_identity() owner to postgres;
revoke all on function public.read_parent_portal_identity() from public, anon, service_role;
grant execute on function public.read_parent_portal_identity() to authenticated;

create or replace function public.revoke_parent_portal_session() returns void
language sql security definer set search_path = '' as $$
  update public.role_contexts rc
  set revoked_at = now()
  where rc.id::text = auth.jwt()->>'session_id'
    and rc.profile_id = auth.uid()
    and rc.role_code = 'parent'
    and rc.revoked_at is null;
$$;

alter function public.revoke_parent_portal_session() owner to postgres;
revoke all on function public.revoke_parent_portal_session() from public, anon, service_role;
grant execute on function public.revoke_parent_portal_session() to authenticated;

-- =============================================================================
-- 2. Parent RLS Policies for Exam Schedules, Study Materials & Child Profiles
-- =============================================================================

drop policy if exists student_exam_schedule_parent_read on public.student_exam_schedule;
create policy student_exam_schedule_parent_read on public.student_exam_schedule
  for select to authenticated
  using (
    status = 'published'
    and (select public.current_active_role()) = 'parent'
    and school_id = (select public.current_school_id())
    and (select public.current_role_has_permission('children.academics.read'))
    and exists (
      select 1
      from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id and e.school_id = sgr.school_id
      where g.profile_id = auth.uid()
        and sgr.school_id = (select public.current_school_id())
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and e.section_id = student_exam_schedule.section_id
        and e.valid_from <= current_date
        and (e.valid_until is null or e.valid_until >= current_date)
    )
  );

drop policy if exists student_materials_parent_read on public.student_portal_materials;
create policy student_materials_parent_read on public.student_portal_materials
  for select to authenticated
  using (
    status = 'published'
    and (select public.current_active_role()) = 'parent'
    and school_id = (select public.current_school_id())
    and (select public.current_role_has_permission('children.academics.read'))
    and exists (
      select 1
      from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id and e.school_id = sgr.school_id
      join public.sections sec on sec.id = e.section_id and sec.school_id = e.school_id
      where g.profile_id = auth.uid()
        and sgr.school_id = (select public.current_school_id())
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and e.valid_from <= current_date
        and (e.valid_until is null or e.valid_until >= current_date)
        and (
          student_portal_materials.audience = 'school'
          or (student_portal_materials.audience = 'class' and sec.class_id = student_portal_materials.class_id)
          or (student_portal_materials.audience = 'section' and e.section_id = student_portal_materials.section_id)
          or (student_portal_materials.audience = 'student' and sgr.student_id = student_portal_materials.student_id)
        )
    )
  );

drop policy if exists profiles_parent_children_read on public.profiles;
create policy profiles_parent_children_read on public.profiles
  for select to authenticated
  using (
    (select public.current_active_role()) = 'parent'
    and exists (
      select 1
      from public.students s
      join public.student_guardian_relationships sgr on sgr.student_id = s.id and sgr.school_id = s.school_id
      join public.guardians g on g.id = sgr.guardian_id
      where s.profile_id = profiles.id
        and s.school_id = (select public.current_school_id())
        and g.profile_id = auth.uid()
        and sgr.relationship_status = 'verified'
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
    )
  );

-- =============================================================================
-- 3. Admin Parent Account & Guardian Relationship Management RPCs
-- =============================================================================

create or replace function public.list_admin_parent_accounts()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  rows jsonb;
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('students.read') is not true then
    return jsonb_build_object('authorized', false, 'parents', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(parent_row order by parent_row->>'display_name'), '[]'::jsonb)
    into rows
  from (
    select jsonb_build_object(
      'guardian_id', g.id,
      'profile_id', g.profile_id,
      'display_name', g.display_name,
      'email', u.email,
      'email_confirmed', (u.email_confirmed_at is not null),
      'account_status', coalesce(p.account_status, 'pending_activation'),
      'membership_status', coalesce(ur.membership_status, 'pending'),
      'children', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'relationship_id', sgr.id,
            'student_id', s.id,
            'student_name', s.display_name,
            'registration_number', s.registration_number,
            'relationship_status', sgr.relationship_status,
            'academic_access', sgr.academic_access,
            'fee_access', sgr.fee_access,
            'relationship_version', sgr.relationship_version
          )
          order by s.registration_number
        )
        from public.student_guardian_relationships sgr
        join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
        where sgr.guardian_id = g.id
          and sgr.school_id = school
      ), '[]'::jsonb)
    ) as parent_row
    from public.guardians g
    left join public.profiles p on p.id = g.profile_id
    left join auth.users u on u.id = g.profile_id
    left join public.user_roles ur on ur.profile_id = g.profile_id and ur.school_id = school and ur.role_code = 'parent'
    where exists (
      select 1 from public.student_guardian_relationships sgr2
      where sgr2.guardian_id = g.id and sgr2.school_id = school
    )
  ) sub;

  return jsonb_build_object('authorized', true, 'parents', rows);
end;
$$;

alter function public.list_admin_parent_accounts() owner to postgres;
revoke all on function public.list_admin_parent_accounts() from public, anon, service_role;
grant execute on function public.list_admin_parent_accounts() to authenticated;

create or replace function public.inspect_parent_candidate_email(p_email text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  clean_email text;
  target_id uuid;
  target_confirmed timestamptz;
  target_banned timestamptz;
  target_sso boolean;
  existing_guardian_id uuid;
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('admissions.write') is not true
    or public.current_role_has_permission('security.accounts.create') is not true then
    return jsonb_build_object('authorized', false);
  end if;

  if p_email is null then
    return jsonb_build_object('authorized', true, 'status', 'invalid_email');
  end if;
  clean_email := lower(btrim(p_email));
  if length(clean_email) not between 3 and 254 or clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('authorized', true, 'status', 'invalid_email');
  end if;

  select u.id, u.email_confirmed_at, u.banned_until, u.is_sso_user
    into target_id, target_confirmed, target_banned, target_sso
  from auth.users u
  where lower(u.email) = clean_email
  limit 1;

  if target_id is null then
    return jsonb_build_object('authorized', true, 'status', 'not_found');
  end if;
  if target_sso is true or (target_banned is not null and target_banned > now()) then
    return jsonb_build_object('authorized', true, 'status', 'unavailable');
  end if;
  if target_id = auth.uid()
    or exists(select 1 from public.staff_profiles where profile_id = target_id)
    or exists(select 1 from public.user_roles where profile_id = target_id and role_code <> 'parent') then
    return jsonb_build_object('authorized', true, 'status', 'conflict_other_role');
  end if;
  if exists(select 1 from public.students where profile_id = target_id) then
    return jsonb_build_object('authorized', true, 'status', 'conflict_student');
  end if;
  if target_confirmed is null then
    return jsonb_build_object('authorized', true, 'status', 'unconfirmed', 'profile_id', target_id);
  end if;
  if exists(select 1 from public.profiles where id = target_id and (account_status <> 'active' or credential_reset_required)) then
    return jsonb_build_object('authorized', true, 'status', 'inactive_profile', 'profile_id', target_id);
  end if;

  select g.id into existing_guardian_id from public.guardians g where g.profile_id = target_id;
  return jsonb_build_object(
    'authorized', true,
    'status', case when existing_guardian_id is not null then 'existing_guardian' else 'ready_to_link' end,
    'profile_id', target_id,
    'guardian_id', existing_guardian_id
  );
end;
$$;

alter function public.inspect_parent_candidate_email(text) owner to postgres;
revoke all on function public.inspect_parent_candidate_email(text) from public, anon, service_role;
grant execute on function public.inspect_parent_candidate_email(text) to authenticated;

create or replace function public.admin_provision_parent_link(
  p_student uuid,
  p_guardian_name text,
  p_email text,
  p_academic_access boolean default true,
  p_fee_access boolean default true
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  stu public.students%rowtype;
  clean_email text;
  clean_name text;
  target_id uuid;
  target_confirmed timestamptz;
  target_banned timestamptz;
  target_sso boolean;
  g_id uuid;
  rel_id uuid;
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('admissions.write') is not true
    or public.current_role_has_permission('security.accounts.create') is not true then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  select * into stu from public.students where id = p_student and school_id = school;
  if not found or stu.enrollment_status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'inactive_student');
  end if;

  clean_email := lower(btrim(coalesce(p_email, '')));
  clean_name := btrim(coalesce(p_guardian_name, ''));
  if length(clean_name) not between 2 and 160 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_name');
  end if;
  if length(clean_email) not between 3 and 254 or clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;

  select u.id, u.email_confirmed_at, u.banned_until, u.is_sso_user
    into target_id, target_confirmed, target_banned, target_sso
  from auth.users u
  where lower(u.email) = clean_email
  limit 1;

  if target_id is null then
    return jsonb_build_object('ok', false, 'reason', 'account_not_found');
  end if;
  if target_sso is true or (target_banned is not null and target_banned > now()) then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;
  if target_id = auth.uid()
    or exists(select 1 from public.staff_profiles where profile_id = target_id)
    or exists(select 1 from public.user_roles where profile_id = target_id and role_code <> 'parent')
    or exists(select 1 from public.students where profile_id = target_id) then
    return jsonb_build_object('ok', false, 'reason', 'role_conflict');
  end if;
  if target_confirmed is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed');
  end if;

  insert into public.profiles (id, account_status)
  values (target_id, 'active')
  on conflict (id) do nothing;

  select id into g_id from public.guardians where profile_id = target_id;
  if g_id is null then
    insert into public.guardians (profile_id, display_name)
    values (target_id, clean_name)
    returning id into g_id;
  else
    update public.guardians set display_name = clean_name where id = g_id;
  end if;

  insert into public.user_roles (profile_id, school_id, role_code, membership_status, permissions)
  values (
    target_id,
    school,
    'parent',
    'active',
    array['dashboard.parent.view','children.academics.read','children.fees.read','announcements.read','documents.read','receipts.read']
  )
  on conflict (profile_id, school_id, role_code) do update set
    membership_status = 'active',
    permissions = array['dashboard.parent.view','children.academics.read','children.fees.read','announcements.read','documents.read','receipts.read'];

  insert into public.student_guardian_relationships
    (school_id, student_id, guardian_id, relationship_status, academic_access, fee_access)
  values
    (school, stu.id, g_id, 'verified', coalesce(p_academic_access, true), coalesce(p_fee_access, true))
  on conflict (school_id, student_id, guardian_id) do update set
    relationship_status = 'verified',
    academic_access = coalesce(p_academic_access, true),
    fee_access = coalesce(p_fee_access, true),
    relationship_version = public.student_guardian_relationships.relationship_version + 1
  returning id into rel_id;

  insert into public.audit_events (actor_profile_id, target_profile_id, event_type, school_id, details)
  values (
    auth.uid(),
    target_id,
    'parent_relationship_linked',
    school,
    jsonb_build_object(
      'student_id', stu.id,
      'guardian_id', g_id,
      'relationship_id', rel_id,
      'academic_access', coalesce(p_academic_access, true),
      'fee_access', coalesce(p_fee_access, true)
    )
  );

  return jsonb_build_object('ok', true, 'guardian_id', g_id, 'relationship_id', rel_id);
end;
$$;

alter function public.admin_provision_parent_link(uuid, text, text, boolean, boolean) owner to postgres;
revoke all on function public.admin_provision_parent_link(uuid, text, text, boolean, boolean) from public, anon, service_role;
grant execute on function public.admin_provision_parent_link(uuid, text, text, boolean, boolean) to authenticated;

create or replace function public.admin_update_guardian_relationship(
  p_relationship uuid,
  p_status text,
  p_academic_access boolean,
  p_fee_access boolean
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  rel public.student_guardian_relationships%rowtype;
  g_profile uuid;
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('admissions.write') is not true
    or public.current_role_has_permission('security.accounts.update') is not true then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  if p_status not in ('verified', 'pending', 'revoked') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select * into rel
  from public.student_guardian_relationships
  where id = p_relationship and school_id = school
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select profile_id into g_profile from public.guardians where id = rel.guardian_id;

  update public.student_guardian_relationships
  set relationship_status = p_status,
      academic_access = coalesce(p_academic_access, false),
      fee_access = coalesce(p_fee_access, false),
      relationship_version = relationship_version + 1
  where id = rel.id and school_id = school;

  if p_status <> 'verified' or (not coalesce(p_academic_access, false) and not coalesce(p_fee_access, false)) then
    if g_profile is not null then
      update public.role_contexts
      set revoked_at = now()
      where profile_id = g_profile and school_id = school and role_code = 'parent' and revoked_at is null;
    end if;
  end if;

  insert into public.audit_events (actor_profile_id, target_profile_id, event_type, school_id, details)
  values (
    auth.uid(),
    g_profile,
    'parent_relationship_updated',
    school,
    jsonb_build_object(
      'relationship_id', rel.id,
      'student_id', rel.student_id,
      'status', p_status,
      'academic_access', coalesce(p_academic_access, false),
      'fee_access', coalesce(p_fee_access, false)
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

alter function public.admin_update_guardian_relationship(uuid, text, boolean, boolean) owner to postgres;
revoke all on function public.admin_update_guardian_relationship(uuid, text, boolean, boolean) from public, anon, service_role;
grant execute on function public.admin_update_guardian_relationship(uuid, text, boolean, boolean) to authenticated;

create or replace function public.admin_set_parent_account_status(
  p_profile uuid,
  p_status text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  req_perm text;
begin
  if p_status not in ('active', 'suspended') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  req_perm := case when p_status = 'suspended' then 'security.accounts.suspend' else 'security.accounts.update' end;

  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission(req_perm) is not true then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  if not exists (
    select 1
    from public.guardians g
    join public.student_guardian_relationships sgr on sgr.guardian_id = g.id
    where g.profile_id = p_profile and sgr.school_id = school
  ) or exists (
    select 1 from public.user_roles ur where ur.profile_id = p_profile and ur.role_code <> 'parent'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  update public.user_roles
  set membership_status = case when p_status = 'suspended' then 'suspended' else 'active' end
  where profile_id = p_profile and school_id = school and role_code = 'parent';

  update public.profiles
  set account_status = p_status,
      authorization_version = authorization_version + 1
  where id = p_profile;

  if p_status = 'suspended' then
    update public.role_contexts
    set revoked_at = now()
    where profile_id = p_profile and school_id = school and role_code = 'parent' and revoked_at is null;
  end if;

  insert into public.audit_events (actor_profile_id, target_profile_id, event_type, school_id, details)
  values (
    auth.uid(),
    p_profile,
    case when p_status = 'suspended' then 'parent_account_suspended' else 'parent_account_reactivated' end,
    school,
    jsonb_build_object('status', p_status)
  );

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

alter function public.admin_set_parent_account_status(uuid, text) owner to postgres;
revoke all on function public.admin_set_parent_account_status(uuid, text) from public, anon, service_role;
grant execute on function public.admin_set_parent_account_status(uuid, text) to authenticated;

commit;
