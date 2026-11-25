begin;

-- Read one active credential only after reserving an attempt. The service
-- endpoint is server-only and never exposes the verifier to the browser.
create function public.begin_student_pin_attempt(p_school text, p_registration text)
returns table (profile_id uuid, student_id uuid, school_id uuid, email text,
               pin_hash text, salt text, credential_version integer)
language plpgsql security definer set search_path = '' as $$
declare
  attempt_key text;
  attempts public.auth_rate_limits%rowtype;
begin
  if p_school is null or p_registration is null or p_school !~ '^[A-Z0-9_-]{3,20}$'
     or char_length(p_registration) not between 1 and 80 then return; end if;

  attempt_key := 'student-pin:' || encode(sha256(convert_to(
    jsonb_build_array(p_school, p_registration)::text, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(attempt_key, 0));
  select * into attempts from public.auth_rate_limits a where a.key = attempt_key for update;
  if attempts.locked_until > now() then return; end if;
  if attempts.first_attempt_at <= now() - interval '15 minutes'
     or attempts.locked_until <= now() then
    delete from public.auth_rate_limits a where a.key = attempt_key;
  end if;
  insert into public.auth_rate_limits as a (key, bucket)
    values (attempt_key, 'student-pin')
    on conflict (key) do update set attempt_count = a.attempt_count + 1,
      last_attempt_at = now(),
      locked_until = case when a.attempt_count + 1 >= 5 then now() + interval '15 minutes' end;

  return query
    select s.profile_id, s.id, s.school_id, u.email::text, c.pin_hash, c.salt, c.credential_version
    from public.students s
    join public.schools sc on sc.id = s.school_id
    join public.profiles p on p.id = s.profile_id
    join auth.users u on u.id = s.profile_id
    join public.pin_credentials c on c.student_id = s.id and c.school_id = s.school_id
      and c.profile_id = s.profile_id and c.credential_namespace = 'student'
    where upper(sc.code) = p_school and upper(btrim(s.registration_number)) = p_registration
      and not exists (
        select 1 from public.students duplicate where duplicate.school_id = sc.id
          and upper(btrim(duplicate.registration_number)) = p_registration and duplicate.id <> s.id
      )
      and not exists (
        select 1 from public.schools duplicate where upper(duplicate.code) = p_school and duplicate.id <> sc.id
      )
      and sc.status = 'active' and s.enrollment_status = 'active' and s.portal_access_status = 'active'
      and p.account_status = 'active' and not p.credential_reset_required
      and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())
      and c.status = 'active' and c.algorithm = 'pbkdf2-sha256' and c.iterations = 100000
      and (c.expires_at is null or c.expires_at > now())
      and (c.locked_until is null or c.locked_until <= now())
      and exists (
        select 1 from public.user_roles r where r.school_id = s.school_id and r.profile_id = s.profile_id
          and r.role_code = 'student' and 'dashboard.student.view' = any(r.permissions)
          and r.membership_status = 'active' and r.valid_from <= now()
          and (r.valid_until is null or r.valid_until > now())
      )
      and not exists (
        select 1 from public.user_roles r where r.profile_id = s.profile_id
          and r.role_code <> 'student' and r.membership_status = 'active' and r.valid_from <= now()
          and (r.valid_until is null or r.valid_until > now())
      );
end;
$$;

-- Bind the native session only after the trusted server verified the PIN and
-- exchanged the Auth OTP. Recheck credential version under the Student row lock.
create function public.bind_student_pin_session(
  p_session uuid, p_student uuid, p_profile uuid, p_school uuid, p_version integer
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  assignment uuid;
  auth_version bigint;
begin
  perform 1 from public.students s
  where s.id = p_student and s.profile_id = p_profile and s.school_id = p_school
    and s.portal_access_status = 'active' and s.enrollment_status = 'active' for update;
  if not found then return false; end if;

  select r.id, p.authorization_version into assignment, auth_version
  from public.user_roles r
  join public.profiles p on p.id = r.profile_id
  join public.schools sc on sc.id = r.school_id
  join auth.sessions sess on sess.id = p_session and sess.user_id = p.id
  join auth.users u on u.id = p.id
  join public.pin_credentials c on c.student_id = p_student and c.profile_id = p.id
    and c.school_id = sc.id and c.credential_namespace = 'student'
  where r.profile_id = p_profile and r.school_id = p_school and r.role_code = 'student'
    and 'dashboard.student.view' = any(r.permissions)
    and r.membership_status = 'active' and r.valid_from <= now() and (r.valid_until is null or r.valid_until > now())
    and p.account_status = 'active' and not p.credential_reset_required and sc.status = 'active'
    and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())
    and sess.created_at > now() - interval '5 minutes' and (sess.not_after is null or sess.not_after > now())
    and c.credential_version = p_version and c.status = 'active'
    and (c.expires_at is null or c.expires_at > now()) and (c.locked_until is null or c.locked_until <= now())
    and not exists (
      select 1 from public.user_roles other where other.profile_id = p_profile
        and other.role_code <> 'student' and other.membership_status = 'active' and other.valid_from <= now()
        and (other.valid_until is null or other.valid_until > now())
    );
  if not found then return false; end if;

  insert into public.role_contexts
    (id, profile_id, role_code, assignment_id, context_version, authorization_version, expires_at, school_id)
  values (p_session, p_profile, 'student', assignment, p_version, auth_version, now() + interval '8 hours', p_school)
  on conflict (id) do nothing;
  return found;
end;
$$;

-- Reuse the installed project-specific native-token verifier. Scope liveness to
-- the exact bound school and membership and reject expired or revoked contexts.
create or replace function public.student_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_native_student_request() and exists (
    select 1 from public.role_contexts rc
    join auth.sessions ses on ses.id = rc.id and ses.user_id = rc.profile_id
    join auth.users u on u.id = rc.profile_id
    join public.schools sc on sc.id = rc.school_id
    join public.profiles p on p.id = rc.profile_id
    join public.user_roles r on r.id = rc.assignment_id and r.profile_id = rc.profile_id
      and r.school_id = rc.school_id and r.role_code = 'student'
    join public.students s on s.profile_id = rc.profile_id and s.school_id = rc.school_id
    join public.pin_credentials c on c.student_id = s.id and c.school_id = rc.school_id
      and c.profile_id = rc.profile_id and c.credential_namespace = 'student'
    where rc.id::text = auth.jwt()->>'session_id' and rc.profile_id = auth.uid()
      and rc.role_code = 'student' and rc.revoked_at is null and rc.expires_at > now()
      and (ses.not_after is null or ses.not_after > now()) and (u.banned_until is null or u.banned_until <= now())
      and sc.status = 'active' and p.account_status = 'active' and not p.credential_reset_required
      and p.authorization_version = rc.authorization_version and r.membership_status = 'active'
      and 'dashboard.student.view' = any(r.permissions)
      and r.valid_from <= now() and (r.valid_until is null or r.valid_until > now())
      and s.enrollment_status = 'active' and s.portal_access_status = 'active'
      and c.credential_version = rc.context_version and c.status = 'active'
      and (c.expires_at is null or c.expires_at > now()) and (c.locked_until is null or c.locked_until <= now())
      and not exists (
        select 1 from public.user_roles other where other.profile_id = rc.profile_id
          and other.role_code <> 'student' and other.membership_status = 'active' and other.valid_from <= now()
          and (other.valid_until is null or other.valid_until > now())
      )
  );
$$;

create function public.read_student_portal_identity()
returns table (school_id uuid, student_id uuid, school_name text, display_name text,
               registration_number text, database_date date)
language sql stable security definer set search_path = '' as $$
  select s.school_id, s.id, sc.name, s.display_name, s.registration_number, current_date
  from public.students s join public.schools sc on sc.id = s.school_id
  where public.student_session_is_live() and s.profile_id = auth.uid()
    and s.school_id = public.current_school_id() and public.portal_student_access(s.id);
$$;

create function public.revoke_student_portal_session() returns void
language sql security definer set search_path = '' as $$
  update public.role_contexts rc set revoked_at = now()
  where rc.id::text = auth.jwt()->>'session_id' and rc.profile_id = auth.uid()
    and rc.role_code = 'student' and rc.revoked_at is null;
$$;
alter function public.revoke_student_portal_session() owner to postgres;
revoke all on function public.revoke_student_portal_session() from public, anon, authenticated, service_role;
grant execute on function public.revoke_student_portal_session() to authenticated;

-- Link an independently verified native Student identity to a pending
-- admission. Keep existing bindings, staff and family users out of this flow.
create function public.link_pending_student_identity(p_student uuid, p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  target uuid;
begin
  if school is null or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2' or public.staff_session_is_live() is not true
    or public.current_role_has_permission('admissions.write') is not true
    or public.current_role_has_permission('security.accounts.create') is not true
    or p_email is null or length(p_email) not between 3 and 254 then return false; end if;

  perform 1 from public.students where id=p_student and school_id=school
    and portal_access_status='pending_activation' and enrollment_status='active' and profile_id is null for update;
  if not found then return false; end if;
  select u.id into target from auth.users u where lower(u.email)=lower(btrim(p_email))
    and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())
    and u.is_sso_user is false and not exists (
      select 1 from auth.users other where lower(other.email)=lower(btrim(p_email)) and other.id<>u.id
    ) for update;
  if not found or target=auth.uid() or exists(select 1 from public.students where profile_id=target)
     or exists(select 1 from public.guardians where profile_id=target)
     or exists(select 1 from public.staff_profiles where profile_id=target)
     or exists(select 1 from public.user_roles where profile_id=target) then return false; end if;

  insert into public.profiles(id,account_status,credential_reset_required)
    values(target,'active',false) on conflict(id) do nothing;
  if not exists(select 1 from public.profiles where id=target and account_status='active' and not credential_reset_required) then
    return false;
  end if;
  insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
    values(target,school,'student','active',array['dashboard.student.view']);
  update public.students set profile_id=target where id=p_student and school_id=school;
  insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id,details)
    values(auth.uid(),target,'student_identity_bound',school,jsonb_build_object('student_id',p_student));
  return true;
end;
$$;
alter function public.link_pending_student_identity(uuid,text) owner to postgres;
revoke all on function public.link_pending_student_identity(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.link_pending_student_identity(uuid,text) to authenticated;

create function public.manage_student_portal_pin(p_student uuid, p_intent text, p_hash text, p_salt text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  target public.students%rowtype;
begin
  if school is null or public.current_active_role() is distinct from 'admin'
     or auth.jwt()->>'aal' is distinct from 'aal2' or public.staff_session_is_live() is not true
     or p_intent is null or p_intent not in ('activate','reset','suspend')
     or public.current_role_has_permission(case p_intent
          when 'suspend' then 'security.accounts.suspend'
          when 'activate' then 'security.accounts.create'
          else 'security.credentials.reset' end) is not true then
    return false;
  end if;
  select * into target from public.students s where s.id = p_student and s.school_id = school for update;
  if not found or target.profile_id is null or target.portal_access_status = 'disabled' then return false; end if;

  if p_intent = 'activate' and public.current_role_has_permission('admissions.write') is not true then return false; end if;

  if p_intent = 'suspend' then
    if target.portal_access_status <> 'active' then return false; end if;
    update public.students set portal_access_status = 'suspended' where id = target.id and school_id = school;
  else
    if target.enrollment_status <> 'active' or p_hash is null or p_hash !~ '^[a-f0-9]{64}$'
      or p_salt is null or p_salt !~ '^[a-f0-9]{32}$'
      or (p_intent = 'reset' and target.portal_access_status <> 'active')
      or (p_intent = 'activate' and target.portal_access_status not in ('pending_activation','suspended'))
      or not exists (
        select 1 from public.profiles p join auth.users u on u.id = p.id where p.id = target.profile_id
          and p.account_status = 'active' and not p.credential_reset_required and u.email_confirmed_at is not null
      )
      or not exists (
        select 1 from public.user_roles r where r.profile_id = target.profile_id and r.school_id = school
          and r.role_code = 'student' and 'dashboard.student.view' = any(r.permissions)
          and r.membership_status = 'active' and r.valid_from <= now()
          and (r.valid_until is null or r.valid_until > now())
      )
      or exists (
        select 1 from public.user_roles r where r.profile_id = target.profile_id and r.role_code <> 'student'
          and r.membership_status = 'active' and r.valid_from <= now() and (r.valid_until is null or r.valid_until > now())
      ) then return false; end if;

    insert into public.pin_credentials as c
      (school_id, profile_id, student_id, credential_namespace, pin_hash, salt, created_by)
    values (school, target.profile_id, target.id, 'student', p_hash, p_salt, auth.uid())
    on conflict (school_id, profile_id, credential_namespace, student_id) do update
      set pin_hash = excluded.pin_hash, salt = excluded.salt, credential_version = c.credential_version + 1,
          algorithm = 'pbkdf2-sha256', iterations = 100000, status = 'active', failed_attempts = 0,
          locked_until = null, expires_at = null, updated_at = now()
      where c.status <> 'revoked';
    if not found then return false; end if;
    if p_intent = 'activate' then
      if target.portal_access_status = 'pending_activation' then
        perform public.activate_student_trial(target.id, school);
      end if;
      update public.students set portal_access_status = 'active',
        portal_activated_at = coalesce(portal_activated_at, now()), portal_activated_by = auth.uid()
      where id = target.id and school_id = school;
    end if;
  end if;

  update public.role_contexts set revoked_at = now()
  where profile_id = target.profile_id and school_id = school and role_code = 'student' and revoked_at is null;
  insert into public.pin_audit_logs(actor_profile_id, target_profile_id, student_id, action, details)
  values (auth.uid(), target.profile_id, target.id, 'student_portal_' || p_intent, jsonb_build_object('school_id', school));
  return true;
end;
$$;

alter function public.begin_student_pin_attempt(text,text) owner to postgres;
alter function public.bind_student_pin_session(uuid,uuid,uuid,uuid,integer) owner to postgres;
alter function public.read_student_portal_identity() owner to postgres;
alter function public.manage_student_portal_pin(uuid,text,text,text) owner to postgres;
revoke all on function public.begin_student_pin_attempt(text,text),
  public.bind_student_pin_session(uuid,uuid,uuid,uuid,integer),
  public.read_student_portal_identity(), public.manage_student_portal_pin(uuid,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.begin_student_pin_attempt(text,text),
  public.bind_student_pin_session(uuid,uuid,uuid,uuid,integer) to service_role;
grant execute on function public.read_student_portal_identity(),
  public.manage_student_portal_pin(uuid,text,text,text) to authenticated;

-- Existing Student SELECT policies remain in force. Limit class-wide learning
-- content to one current enrollment and keep all Student writes denied.
create function public.student_current_section_access(p_school uuid, p_section uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.student_session_is_live() and p_school = public.current_school_id()
    and (select count(*) = 1 and bool_and(e.section_id = p_section)
      from public.students s join public.enrollments e on e.student_id = s.id and e.school_id = s.school_id
      where s.profile_id = auth.uid() and s.school_id = p_school and public.portal_student_access(s.id)
        and e.valid_from <= current_date and (e.valid_until is null or e.valid_until >= current_date));
$$;
alter function public.student_current_section_access(uuid,uuid) owner to postgres;
revoke all on function public.student_current_section_access(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.student_current_section_access(uuid,uuid) to authenticated;

create policy student_current_homework_section on public.homework_assignments as restrictive for select to authenticated
using (public.current_active_role() is distinct from 'student' or public.student_current_section_access(school_id,section_id));
create policy student_current_timetable_section on public.timetable_slots as restrictive for select to authenticated
using (public.current_active_role() is distinct from 'student' or public.student_current_section_access(school_id,section_id));

do $policies$
declare table_name text;
begin
  foreach table_name in array array['attendance_records','marks_sheets','marks_entries','fee_invoices','fee_payments'] loop
    execute format('create policy student_no_insert on public.%I as restrictive for insert to authenticated with check (public.current_active_role() is distinct from ''student'')', table_name);
    execute format('create policy student_no_update on public.%I as restrictive for update to authenticated using (public.current_active_role() is distinct from ''student'') with check (public.current_active_role() is distinct from ''student'')', table_name);
    execute format('create policy student_no_delete on public.%I as restrictive for delete to authenticated using (public.current_active_role() is distinct from ''student'')', table_name);
  end loop;
end;
$policies$;

commit;
