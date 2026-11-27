-- Migration 050: Student Identity Provisioning, Diagnostic Status & Native MFA Preservation
-- 1. Removes the 600-second accountant_export_mfa_is_fresh() bottleneck from
--    link_pending_student_identity and manage_student_portal_pin while preserving
--    strict native Admin AAL2 MFA, staff_session_is_live(), permissions and tenant isolation.
-- 2. Adds inspect_student_identity_status and record_student_identity_invitation RPCs
--    to support complete, verifiable Admin Student provisioning without bypassing verification.

begin;

create or replace function public.link_pending_student_identity(p_student uuid, p_email text)
returns boolean language sql security definer set search_path = '' as $$
  select app_private.link_pending_student_identity(p_student, p_email);
$$;

create or replace function public.manage_student_portal_pin(p_student uuid, p_intent text, p_hash text, p_salt text)
returns boolean language sql security definer set search_path = '' as $$
  select app_private.manage_student_portal_pin(p_student, p_intent, p_hash, p_salt);
$$;

alter function public.link_pending_student_identity(uuid, text) owner to postgres;
alter function public.manage_student_portal_pin(uuid, text, text, text) owner to postgres;
revoke all on function public.link_pending_student_identity(uuid, text),
  public.manage_student_portal_pin(uuid, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.link_pending_student_identity(uuid, text),
  public.manage_student_portal_pin(uuid, text, text, text) to authenticated;

create or replace function public.inspect_student_identity_status(p_student uuid, p_email text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  stu public.students%rowtype;
  linked_email text;
  linked_confirmed boolean := false;
  clean_email text;
  target_id uuid;
  target_confirmed timestamptz;
  target_banned timestamptz;
  target_sso boolean;
  email_count integer;
  candidate_status text := null;
begin
  if school is null or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('students.read') is not true then
    return jsonb_build_object('authorized', false);
  end if;

  select * into stu from public.students where id = p_student and school_id = school;
  if not found then
    return jsonb_build_object('authorized', true, 'student_found', false);
  end if;

  if stu.profile_id is not null then
    select u.email, (u.email_confirmed_at is not null)
      into linked_email, linked_confirmed
    from auth.users u
    where u.id = stu.profile_id;
  end if;

  if p_email is not null then
    if public.current_role_has_permission('admissions.write') is not true
      or public.current_role_has_permission('security.accounts.create') is not true then
      return jsonb_build_object('authorized', false);
    end if;

    clean_email := lower(btrim(p_email));
    if length(clean_email) not between 3 and 254 or clean_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      candidate_status := 'invalid_email';
    elsif stu.enrollment_status <> 'active' then
      candidate_status := 'inactive_enrollment';
    elsif stu.profile_id is not null or stu.portal_access_status <> 'pending_activation' then
      candidate_status := 'student_not_pending';
    else
      select count(*) into email_count from auth.users u where lower(u.email) = clean_email;
      if email_count = 0 then
        candidate_status := 'not_found';
      elsif email_count > 1 then
        candidate_status := 'unavailable';
      else
        select u.id, u.email_confirmed_at, u.banned_until, u.is_sso_user
          into target_id, target_confirmed, target_banned, target_sso
        from auth.users u
        where lower(u.email) = clean_email
        limit 1;

        if target_sso is true or (target_banned is not null and target_banned > now()) then
          candidate_status := 'unavailable';
        elsif target_id = auth.uid()
          or exists(select 1 from public.staff_profiles where profile_id = target_id)
          or exists(select 1 from public.user_roles where profile_id = target_id and role_code <> 'student') then
          candidate_status := 'conflict_staff';
        elsif exists(select 1 from public.guardians where profile_id = target_id) then
          candidate_status := 'conflict_guardian';
        elsif exists(select 1 from public.students where profile_id = target_id) then
          candidate_status := 'conflict_student';
        elsif exists(select 1 from public.user_roles where profile_id = target_id) then
          candidate_status := 'conflict_other_role';
        elsif target_confirmed is null then
          candidate_status := 'unconfirmed';
        elsif exists(select 1 from public.profiles where id = target_id and (account_status <> 'active' or credential_reset_required)) then
          candidate_status := 'inactive_profile';
        else
          candidate_status := 'ready_to_link';
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'authorized', true,
    'student_found', true,
    'enrollment_status', stu.enrollment_status,
    'portal_access_status', stu.portal_access_status,
    'identity_linked', stu.profile_id is not null,
    'linked_email', linked_email,
    'linked_email_confirmed', coalesce(linked_confirmed, false),
    'candidate_status', candidate_status
  );
end;
$$;

create or replace function public.record_student_identity_invitation(p_student uuid, p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  clean_email text := lower(btrim(coalesce(p_email, '')));
begin
  if school is null or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('admissions.write') is not true
    or public.current_role_has_permission('security.accounts.create') is not true
    or length(clean_email) not between 3 and 254 then
    return false;
  end if;

  perform 1 from public.students
  where id = p_student and school_id = school
    and enrollment_status = 'active'
    and portal_access_status = 'pending_activation'
    and profile_id is null;
  if not found then
    return false;
  end if;

  insert into public.audit_events(actor_profile_id, event_type, school_id, details)
  values (
    auth.uid(),
    'student_identity_invited',
    school,
    jsonb_build_object('student_id', p_student, 'email_hash', encode(sha256(convert_to(clean_email, 'UTF8')), 'hex'))
  );
  return true;
end;
$$;

alter function public.inspect_student_identity_status(uuid, text) owner to postgres;
alter function public.record_student_identity_invitation(uuid, text) owner to postgres;
revoke all on function public.inspect_student_identity_status(uuid, text),
  public.record_student_identity_invitation(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.inspect_student_identity_status(uuid, text),
  public.record_student_identity_invitation(uuid, text) to authenticated;

commit;
