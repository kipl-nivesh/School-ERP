begin;

-- 1. Drop legacy duplicate student RLS policies superseded by migrations 042-043.
drop policy if exists attendance_student_scoped on public.attendance_records;
drop policy if exists fee_invoices_student_scoped on public.fee_invoices;
drop policy if exists payments_student_scoped on public.fee_payments;

-- 2. Guard marks_entries_staff_read with active staff role check so Student
--    and Parent queries short-circuit without evaluating staff enrollment subqueries.
alter policy marks_entries_staff_read on public.marks_entries using (
  (public.current_active_role() in ('admin', 'teacher'))
  and school_id = public.current_school_id()
  and app_private.marks_entry_staff_visible(marks_sheet_id, school_id, student_id)
);

-- 3. Remove redundant self-call to current_school_id() inside current_active_role()
--    (which previously triggered nested student_session_is_live() checks per row).
create or replace function public.current_active_role()
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select rc.role_code
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = rc.profile_id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where rc.id::text = auth.jwt()->>'session_id'
    and rc.profile_id = auth.uid()
    and rc.revoked_at is null
    and rc.expires_at > now()
    and p.account_status = 'active'
    and not p.credential_reset_required
    and p.authorization_version = rc.authorization_version
    and m.membership_status = 'active'
    and m.valid_from <= now()
    and (m.valid_until is null or m.valid_until > now())
    and s.status = 'active'
    and (
      (rc.role_code in ('admin','teacher','accountant') and public.staff_session_is_live() and (
        rc.role_code <> 'admin'
        or (
          auth.jwt()->>'aal' = 'aal2'
          and exists (
            select 1 from auth.mfa_factors f
            where f.user_id = auth.uid()
              and f.status = 'verified'
              and f.factor_type = 'totp'
          )
          and exists (
            select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
            where a->>'method' = 'totp'
          )
        )
      ))
      or (rc.role_code = 'student' and public.student_session_is_live())
      or (rc.role_code = 'parent' and public.parent_session_is_live())
    )
  limit 1;
$function$;

-- 4. Clear student-pin rate limit lockout upon Admin PIN reset or activation.
create or replace function app_private.manage_student_portal_pin(p_student uuid, p_intent text, p_hash text, p_salt text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  school uuid := public.current_school_id();
  school_code text;
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

    select sc.code into school_code from public.schools sc where sc.id = school;
    if school_code is not null and target.registration_number is not null then
      delete from public.auth_rate_limits
      where key = 'student-pin:' || encode(sha256(convert_to(
        jsonb_build_array(upper(school_code), upper(btrim(target.registration_number)))::text, 'UTF8')), 'hex');
    end if;

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
$function$;

revoke all on function app_private.manage_student_portal_pin(uuid,text,text,text) from public,anon,authenticated,service_role;

commit;
