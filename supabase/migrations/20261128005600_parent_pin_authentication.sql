-- Migration 056: Parent ID (Student Registration ID) + 6-Digit Parent PIN Authentication
-- Separate credential_namespace = 'parent', account + identifier rate limiting,
-- 5-attempt lockout, multi-guardian disambiguation, session invalidation on reset,
-- and session-bound single-use OTP PIN recovery.

begin;

create unique index if not exists uq_parent_pin_per_profile
  on public.pin_credentials (profile_id)
  where credential_namespace = 'parent' and student_id is null;

create table if not exists app_private.parent_pin_recovery_tokens (
  token_hash text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table app_private.parent_pin_recovery_tokens enable row level security;
alter table app_private.parent_pin_recovery_tokens force row level security;
revoke all on table app_private.parent_pin_recovery_tokens from public, anon, authenticated, service_role;

-- Server-only Parent PIN attempt lookup (service_role only; never exposed to browser).
create or replace function public.begin_parent_pin_attempt(
  p_school text,
  p_registration text,
  p_guardian_email text default null
)
returns table (
  profile_id uuid,
  school_id uuid,
  email text,
  pin_hash text,
  salt text,
  credential_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_school text;
  clean_reg text;
  clean_email text;
  ident_key text;
  acct_key text;
  attempts public.auth_rate_limits%rowtype;
  acct_attempts public.auth_rate_limits%rowtype;
  matched_count integer := 0;
  matched_profile uuid;
begin
  if p_school is null or p_registration is null then
    return;
  end if;
  clean_school := upper(btrim(p_school));
  clean_reg := upper(btrim(p_registration));
  clean_email := lower(btrim(coalesce(p_guardian_email, '')));

  if clean_school !~ '^[A-Z0-9_-]{3,20}$' or char_length(clean_reg) not between 1 and 80 then
    return;
  end if;

  ident_key := 'parent-pin-ident:' || encode(sha256(convert_to(
    jsonb_build_array(clean_school, clean_reg, clean_email)::text, 'UTF8')), 'hex');

  perform pg_advisory_xact_lock(hashtextextended(ident_key, 0));
  select * into attempts from public.auth_rate_limits a where a.key = ident_key for update;
  if attempts.locked_until is not null and attempts.locked_until > now() then
    return;
  end if;
  if found and (attempts.first_attempt_at <= now() - interval '15 minutes'
     or (attempts.locked_until is not null and attempts.locked_until <= now())) then
    delete from public.auth_rate_limits a where a.key = ident_key;
  end if;
  insert into public.auth_rate_limits as a (key, bucket)
    values (ident_key, 'parent-pin')
    on conflict (key) do update set
      attempt_count = a.attempt_count + 1,
      last_attempt_at = now(),
      locked_until = case when a.attempt_count + 1 >= 5 then now() + interval '15 minutes' else null end;

  -- Resolve matching active verified guardians for this school + student registration ID (or legacy alias)
  select count(distinct g.profile_id), min(g.profile_id::text)::uuid
    into matched_count, matched_profile
  from public.students s
  join public.schools sc on sc.id = s.school_id
  join public.student_guardian_relationships sgr on sgr.student_id = s.id and sgr.school_id = s.school_id
  join public.guardians g on g.id = sgr.guardian_id
  join public.profiles p on p.id = g.profile_id
  join auth.users u on u.id = g.profile_id
  where upper(sc.code) = clean_school
    and (
      upper(btrim(s.registration_number)) = clean_reg
      or exists (
        select 1 from public.student_registration_aliases a
        where a.student_id = s.id
          and a.school_id = s.school_id
          and upper(btrim(a.legacy_registration_number)) = clean_reg
      )
    )
    and not exists (
      select 1 from public.schools duplicate where upper(duplicate.code) = clean_school and duplicate.id <> sc.id
    )
    and sc.status = 'active'
    and s.enrollment_status = 'active'
    and sgr.relationship_status = 'verified'
    and sgr.valid_from <= now()
    and (sgr.valid_until is null or sgr.valid_until > now())
    and (sgr.academic_access = true or sgr.fee_access = true)
    and p.account_status = 'active'
    and not p.credential_reset_required
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= now())
    and (clean_email = '' or lower(u.email::text) = clean_email)
    and exists (
      select 1 from public.user_roles r
      where r.school_id = s.school_id
        and r.profile_id = g.profile_id
        and r.role_code = 'parent'
        and 'dashboard.parent.view' = any(r.permissions)
        and r.membership_status = 'active'
        and r.valid_from <= now()
        and (r.valid_until is null or r.valid_until > now())
    )
    and not exists (
      select 1 from public.user_roles r
      where r.profile_id = g.profile_id
        and r.role_code <> 'parent'
        and r.membership_status = 'active'
        and r.valid_from <= now()
        and (r.valid_until is null or r.valid_until > now())
    );

  -- Disambiguation: never pick arbitrarily if multiple verified guardians match
  if matched_count <> 1 or matched_profile is null then
    return;
  end if;

  -- Account-level rate limit prevents alternate-Student-ID lockout bypass
  acct_key := 'parent-pin-acct:' || encode(sha256(convert_to(matched_profile::text, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(acct_key, 0));
  select * into acct_attempts from public.auth_rate_limits a where a.key = acct_key for update;
  if acct_attempts.locked_until is not null and acct_attempts.locked_until > now() then
    return;
  end if;
  if found and (acct_attempts.first_attempt_at <= now() - interval '15 minutes'
     or (acct_attempts.locked_until is not null and acct_attempts.locked_until <= now())) then
    delete from public.auth_rate_limits a where a.key = acct_key;
  end if;
  insert into public.auth_rate_limits as a (key, bucket)
    values (acct_key, 'parent-pin-acct')
    on conflict (key) do update set
      attempt_count = a.attempt_count + 1,
      last_attempt_at = now(),
      locked_until = case when a.attempt_count + 1 >= 5 then now() + interval '15 minutes' else null end;

  return query
    select p.id, sc.id, u.email::text, c.pin_hash, c.salt, c.credential_version
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.user_roles r on r.profile_id = p.id and r.role_code = 'parent' and r.membership_status = 'active'
    join public.schools sc on sc.id = r.school_id and upper(sc.code) = clean_school
    join public.pin_credentials c on c.profile_id = p.id
      and c.credential_namespace = 'parent'
      and c.student_id is null
    where p.id = matched_profile
      and c.status = 'active'
      and c.algorithm = 'pbkdf2-sha256'
      and c.iterations = 100000
      and (c.expires_at is null or c.expires_at > now())
      and (c.locked_until is null or c.locked_until <= now())
    limit 1;
end;
$$;

alter function public.begin_parent_pin_attempt(text, text, text) owner to postgres;
revoke all on function public.begin_parent_pin_attempt(text, text, text) from public, anon, authenticated;
grant execute on function public.begin_parent_pin_attempt(text, text, text) to service_role;

create or replace function public.reset_parent_pin_attempts(
  p_school text,
  p_registration text,
  p_profile uuid,
  p_guardian_email text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_school text := upper(btrim(coalesce(p_school, '')));
  clean_reg text := upper(btrim(coalesce(p_registration, '')));
  clean_email text := lower(btrim(coalesce(p_guardian_email, '')));
  ident_key text;
  acct_key text;
begin
  ident_key := 'parent-pin-ident:' || encode(sha256(convert_to(
    jsonb_build_array(clean_school, clean_reg, clean_email)::text, 'UTF8')), 'hex');
  delete from public.auth_rate_limits where key = ident_key;

  if p_profile is not null then
    acct_key := 'parent-pin-acct:' || encode(sha256(convert_to(p_profile::text, 'UTF8')), 'hex');
    delete from public.auth_rate_limits where key = acct_key;
  end if;
end;
$$;

alter function public.reset_parent_pin_attempts(text, text, uuid, text) owner to postgres;
revoke all on function public.reset_parent_pin_attempts(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.reset_parent_pin_attempts(text, text, uuid, text) to service_role;

create or replace function public.bind_parent_pin_session(
  p_session uuid,
  p_profile uuid,
  p_school uuid,
  p_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_id uuid;
  auth_version bigint;
  acct_key text;
begin
  perform 1 from public.profiles p where p.id = p_profile and p.account_status = 'active' and not p.credential_reset_required for update;
  if not found then
    return false;
  end if;

  select r.id, p.authorization_version
    into assignment_id, auth_version
  from public.user_roles r
  join public.profiles p on p.id = r.profile_id
  join public.schools sc on sc.id = r.school_id
  join auth.sessions ses on ses.id = p_session and ses.user_id = p.id
  join auth.users u on u.id = p.id
  join public.guardians g on g.profile_id = p.id
  join public.pin_credentials c on c.profile_id = p.id
    and c.credential_namespace = 'parent'
    and c.student_id is null
  where r.profile_id = p_profile
    and r.school_id = p_school
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
    and ses.created_at > now() - interval '5 minutes'
    and (ses.not_after is null or ses.not_after > now())
    and c.credential_version = p_version
    and c.status = 'active'
    and (c.expires_at is null or c.expires_at > now())
    and (c.locked_until is null or c.locked_until <= now())
    and exists (
      select 1
      from public.student_guardian_relationships sgr
      join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
      where sgr.guardian_id = g.id
        and sgr.school_id = p_school
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
  limit 1;

  if not found then
    return false;
  end if;

  insert into public.role_contexts
    (id, profile_id, school_id, role_code, assignment_id, authorization_version, context_version, expires_at)
  values
    (p_session, p_profile, p_school, 'parent', assignment_id, auth_version, p_version, now() + interval '12 hours')
  on conflict (id) do update set
    profile_id = excluded.profile_id,
    school_id = excluded.school_id,
    role_code = 'parent',
    assignment_id = excluded.assignment_id,
    authorization_version = excluded.authorization_version,
    context_version = excluded.context_version,
    revoked_at = null,
    expires_at = excluded.expires_at;

  acct_key := 'parent-pin-acct:' || encode(sha256(convert_to(p_profile::text, 'UTF8')), 'hex');
  delete from public.auth_rate_limits where key = acct_key;

  insert into public.pin_audit_logs (actor_profile_id, target_profile_id, action, details)
  values (p_profile, p_profile, 'parent_pin_login', jsonb_build_object('school_id', p_school));

  return true;
end;
$$;

alter function public.bind_parent_pin_session(uuid, uuid, uuid, integer) owner to postgres;
revoke all on function public.bind_parent_pin_session(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.bind_parent_pin_session(uuid, uuid, uuid, integer) to service_role;

-- Short-lived, single-use, session-bound recovery token after OTP verification
create or replace function public.issue_parent_pin_recovery_token(
  p_session uuid,
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_session is null or p_session::text is distinct from auth.jwt()->>'session_id'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  if not exists (
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
      and exists (
        select 1 from public.student_guardian_relationships sgr
        join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
        where sgr.guardian_id = g.id
          and sgr.school_id = r.school_id
          and sgr.relationship_status = 'verified'
          and (sgr.academic_access = true or sgr.fee_access = true)
          and s.enrollment_status = 'active'
      )
  ) then
    return false;
  end if;

  delete from app_private.parent_pin_recovery_tokens where profile_id = uid;
  insert into app_private.parent_pin_recovery_tokens (token_hash, profile_id, session_id, expires_at)
  values (p_token_hash, uid, p_session, now() + interval '10 minutes');

  return true;
end;
$$;

alter function public.issue_parent_pin_recovery_token(uuid, text) owner to postgres;
revoke all on function public.issue_parent_pin_recovery_token(uuid, text) from public, anon, service_role;
grant execute on function public.issue_parent_pin_recovery_token(uuid, text) to authenticated;

create or replace function public.complete_parent_pin_recovery(
  p_session uuid,
  p_token_hash text,
  p_hash text,
  p_salt text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  tok app_private.parent_pin_recovery_tokens%rowtype;
  acct_key text;
begin
  if uid is null or p_session is null or p_session::text is distinct from auth.jwt()->>'session_id'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
    or p_salt is null or p_salt !~ '^[0-9a-f]{32}$' then
    return false;
  end if;

  select * into tok
  from app_private.parent_pin_recovery_tokens
  where token_hash = p_token_hash
    and profile_id = uid
    and session_id = p_session
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  update app_private.parent_pin_recovery_tokens
  set used_at = now()
  where token_hash = tok.token_hash;

  insert into public.pin_credentials as c
    (profile_id, credential_namespace, student_id, pin_hash, salt, iterations, algorithm, status, failed_attempts, locked_until, credential_version, created_by)
  values
    (uid, 'parent', null, p_hash, p_salt, 100000, 'pbkdf2-sha256', 'active', 0, null, 1, uid)
  on conflict (profile_id) where credential_namespace = 'parent' and student_id is null
  do update set
    pin_hash = excluded.pin_hash,
    salt = excluded.salt,
    iterations = 100000,
    algorithm = 'pbkdf2-sha256',
    status = 'active',
    failed_attempts = 0,
    locked_until = null,
    credential_version = c.credential_version + 1,
    updated_at = now(),
    created_by = uid;

  -- Invalidate all existing Parent sessions after PIN reset
  update public.profiles
  set authorization_version = authorization_version + 1
  where id = uid;

  update public.role_contexts
  set revoked_at = now()
  where profile_id = uid and role_code = 'parent' and revoked_at is null;

  acct_key := 'parent-pin-acct:' || encode(sha256(convert_to(uid::text, 'UTF8')), 'hex');
  delete from public.auth_rate_limits where key = acct_key;

  insert into public.pin_audit_logs (actor_profile_id, target_profile_id, action, details)
  values (uid, uid, 'parent_pin_recovered', jsonb_build_object('via', 'verified_email_otp'));

  return true;
end;
$$;

alter function public.complete_parent_pin_recovery(uuid, text, text, text) owner to postgres;
revoke all on function public.complete_parent_pin_recovery(uuid, text, text, text) from public, anon, service_role;
grant execute on function public.complete_parent_pin_recovery(uuid, text, text, text) to authenticated;

-- Admin AAL2 MFA Parent PIN activation / reset
create or replace function public.admin_manage_parent_pin(
  p_profile uuid,
  p_intent text,
  p_hash text,
  p_salt text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  school uuid := public.current_school_id();
  req_perm text;
  acct_key text;
begin
  if p_intent not in ('activate', 'reset')
    or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
    or p_salt is null or p_salt !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  req_perm := case when p_intent = 'reset' then 'security.credentials.reset' else 'security.accounts.create' end;

  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('security.accounts.update') is not true
    or public.current_role_has_permission(req_perm) is not true then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  if not exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.guardians g on g.profile_id = p.id
    join public.user_roles r on r.profile_id = p.id and r.school_id = school and r.role_code = 'parent'
    join public.student_guardian_relationships sgr on sgr.guardian_id = g.id and sgr.school_id = school
    where p.id = p_profile
      and p.account_status = 'active'
      and not p.credential_reset_required
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and r.membership_status = 'active'
      and sgr.relationship_status = 'verified'
  ) or exists (
    select 1 from public.user_roles other where other.profile_id = p_profile and other.role_code <> 'parent'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  insert into public.pin_credentials as c
    (profile_id, credential_namespace, student_id, pin_hash, salt, iterations, algorithm, status, failed_attempts, locked_until, credential_version, created_by)
  values
    (p_profile, 'parent', null, p_hash, p_salt, 100000, 'pbkdf2-sha256', 'active', 0, null, 1, auth.uid())
  on conflict (profile_id) where credential_namespace = 'parent' and student_id is null
  do update set
    pin_hash = excluded.pin_hash,
    salt = excluded.salt,
    iterations = 100000,
    algorithm = 'pbkdf2-sha256',
    status = 'active',
    failed_attempts = 0,
    locked_until = null,
    credential_version = c.credential_version + 1,
    updated_at = now(),
    created_by = auth.uid();

  update public.profiles
  set authorization_version = authorization_version + 1
  where id = p_profile;

  update public.role_contexts
  set revoked_at = now()
  where profile_id = p_profile and school_id = school and role_code = 'parent' and revoked_at is null;

  acct_key := 'parent-pin-acct:' || encode(sha256(convert_to(p_profile::text, 'UTF8')), 'hex');
  delete from public.auth_rate_limits where key = acct_key;

  insert into public.pin_audit_logs (actor_profile_id, target_profile_id, action, details)
  values (auth.uid(), p_profile, 'parent_pin_' || p_intent, jsonb_build_object('school_id', school));

  insert into public.audit_events (actor_profile_id, target_profile_id, event_type, school_id, details)
  values (auth.uid(), p_profile, 'parent_pin_' || p_intent, school, jsonb_build_object('intent', p_intent));

  return jsonb_build_object('ok', true);
end;
$$;

alter function public.admin_manage_parent_pin(uuid, text, text, text) owner to postgres;
revoke all on function public.admin_manage_parent_pin(uuid, text, text, text) from public, anon, service_role;
grant execute on function public.admin_manage_parent_pin(uuid, text, text, text) to authenticated;

create or replace function public.admin_revoke_parent_sessions(p_profile uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  school uuid := public.current_school_id();
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('security.accounts.update') is not true then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  if not exists (
    select 1
    from public.guardians g
    join public.student_guardian_relationships sgr on sgr.guardian_id = g.id
    where g.profile_id = p_profile and sgr.school_id = school
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  update public.profiles
  set authorization_version = authorization_version + 1
  where id = p_profile;

  update public.role_contexts
  set revoked_at = now()
  where profile_id = p_profile and school_id = school and role_code = 'parent' and revoked_at is null;

  insert into public.audit_events (actor_profile_id, target_profile_id, event_type, school_id)
  values (auth.uid(), p_profile, 'parent_sessions_revoked', school);

  return jsonb_build_object('ok', true);
end;
$$;

alter function public.admin_revoke_parent_sessions(uuid) owner to postgres;
revoke all on function public.admin_revoke_parent_sessions(uuid) from public, anon, service_role;
grant execute on function public.admin_revoke_parent_sessions(uuid) to authenticated;

-- Extend admin_list_parent_accounts with PIN status
create or replace function public.admin_list_parent_accounts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  school uuid := public.current_school_id();
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('students.read') is not true then
    return jsonb_build_object('authorized', false, 'parents', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'authorized', true,
    'parents', coalesce((
      select jsonb_agg(item order by item->>'display_name')
      from (
        select jsonb_build_object(
          'guardian_id', g.id,
          'profile_id', g.profile_id,
          'display_name', g.display_name,
          'email', u.email,
          'email_confirmed', (u.email_confirmed_at is not null),
          'account_status', coalesce(p.account_status, 'unlinked'),
          'membership_status', coalesce(r.membership_status, 'none'),
          'pin_status', coalesce(pc.status, 'not_set'),
          'pin_updated_at', pc.updated_at,
          'children', coalesce((
            select jsonb_agg(jsonb_build_object(
              'relationship_id', sgr2.id,
              'student_id', s.id,
              'student_name', s.display_name,
              'registration_number', s.registration_number,
              'relationship_status', sgr2.relationship_status,
              'academic_access', sgr2.academic_access,
              'fee_access', sgr2.fee_access,
              'relationship_version', sgr2.relationship_version
            ) order by s.display_name)
            from public.student_guardian_relationships sgr2
            join public.students s on s.id = sgr2.student_id and s.school_id = sgr2.school_id
            where sgr2.guardian_id = g.id and sgr2.school_id = school
          ), '[]'::jsonb)
        ) as item
        from public.guardians g
        left join public.profiles p on p.id = g.profile_id
        left join auth.users u on u.id = g.profile_id
        left join public.user_roles r on r.profile_id = g.profile_id and r.school_id = school and r.role_code = 'parent'
        left join public.pin_credentials pc on pc.profile_id = g.profile_id and pc.credential_namespace = 'parent' and pc.student_id is null
        where exists (
          select 1 from public.student_guardian_relationships sgr3
          where sgr3.guardian_id = g.id and sgr3.school_id = school
        )
      ) sub
    ), '[]'::jsonb)
  );
end;
$$;

commit;
