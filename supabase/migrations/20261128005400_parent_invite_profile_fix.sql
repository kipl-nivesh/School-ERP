-- Migration 054: Clear default credential_reset_required on verified invited Parent activation
-- When a guardian is invited via auth.admin.inviteUserByEmail and confirms their email,
-- profiles may carry the table default (account_status='invited', credential_reset_required=true).
-- Parents authenticate via passwordless OTP only; suspended/disabled profiles remain blocked.

begin;

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
  if exists(select 1 from public.profiles where id = target_id and account_status in ('suspended', 'disabled')) then
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
  if exists(select 1 from public.profiles where id = target_id and account_status in ('suspended', 'disabled')) then
    return jsonb_build_object('ok', false, 'reason', 'unavailable');
  end if;

  insert into public.profiles (id, account_status, credential_reset_required)
  values (target_id, 'active', false)
  on conflict (id) do update set
    account_status = 'active',
    credential_reset_required = false
  where public.profiles.account_status in ('invited', 'active');

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

commit;
