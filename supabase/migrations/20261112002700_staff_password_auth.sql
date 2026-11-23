begin;

-- Password freshness comes from the provider-signed AMR, not JWT issue time
-- (refresh can change iat), browser state, or RPC parameters.
create function app_private.staff_token_is_current() returns boolean
language sql stable security invoker set search_path='' as $$
 select auth.jwt()->>'aal' in ('aal1','aal2')
   and case when jsonb_typeof(auth.jwt()->'exp')='number'
     then (auth.jwt()->>'exp')::numeric > extract(epoch from now()) else false end
   and exists (
     select 1
     from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array'
       then auth.jwt()->'amr' else '[]'::jsonb end) a
     where a->>'method'='password'
       and case when jsonb_typeof(a->'timestamp')='number'
         then (a->>'timestamp')::numeric between 0 and extract(epoch from now()) else false end
   )
$$;
alter function app_private.staff_token_is_current() owner to postgres;
revoke all on function app_private.staff_token_is_current() from public,anon,authenticated,service_role;

create function app_private.staff_password_is_recent() returns boolean
language sql stable security invoker set search_path='' as $$
 select public.staff_session_is_live() and exists (
   select 1
   from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array'
     then auth.jwt()->'amr' else '[]'::jsonb end) a
   where a->>'method'='password'
     and case when jsonb_typeof(a->'timestamp')='number'
       then (a->>'timestamp')::numeric between extract(epoch from now())-600 and extract(epoch from now())
       else false end
 )
$$;
alter function app_private.staff_password_is_recent() owner to postgres;
revoke all on function app_private.staff_password_is_recent() from public,anon,authenticated,service_role;

create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
 select rc.school_id from public.role_contexts rc
 join public.profiles p on p.id=rc.profile_id
 join public.user_roles m on m.id=rc.assignment_id and m.profile_id=p.id
  and m.school_id=rc.school_id and m.role_code=rc.role_code
 join public.schools s on s.id=rc.school_id
 where public.staff_session_is_live() and app_private.staff_token_is_current() and rc.id::text=auth.jwt()->>'session_id'
  and p.id=auth.uid() and p.account_status='active' and not p.credential_reset_required
  and rc.revoked_at is null and rc.expires_at>now() and rc.authorization_version=p.authorization_version
  and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now())
  and s.status='active'
 limit 1
$$;

create or replace function public.select_school_context(p_school uuid,p_role text) returns boolean
language plpgsql security definer set search_path='' as $$
declare m public.user_roles; p public.profiles; sid uuid;
begin
 if not public.staff_session_is_live() or app_private.staff_token_is_current() is not true or p_role is null or p_role not in ('admin','teacher','accountant') then return false; end if;
 select * into p from public.profiles where id=auth.uid() and account_status='active' and not credential_reset_required for update;
 if not found then return false; end if;
 select * into m from public.user_roles where profile_id=p.id and school_id=p_school and role_code=p_role
 and membership_status='active' and valid_from<=now() and (valid_until is null or valid_until>now());
 if not found or not exists(select 1 from public.schools where id=p_school and status='active') then return false; end if;
 if not (('dashboard.'||p_role||'.view')=any(m.permissions)) then return false; end if;
 sid:=(auth.jwt()->>'session_id')::uuid;
 insert into public.role_contexts(id,profile_id,role_code,assignment_id,school_id,authorization_version,expires_at)
 values(sid,p.id,p_role,m.id,p_school,p.authorization_version,least(to_timestamp((auth.jwt()->>'exp')::double precision),now()+interval '30 minutes'))
 on conflict(id) do update set role_code=excluded.role_code,assignment_id=excluded.assignment_id,school_id=excluded.school_id,
 authorization_version=excluded.authorization_version,expires_at=excluded.expires_at,context_version=public.role_contexts.context_version+1
 where public.role_contexts.profile_id=auth.uid() and public.role_contexts.revoked_at is null;
 if not found then return false; end if;
 insert into public.audit_events(actor_profile_id,event_type,school_id) values(p.id,'school_context_selected',p_school);
 return true;
end $$;

create or replace function public.current_active_role() returns text
language sql stable security definer set search_path = '' as $$
  select rc.role_code
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = rc.profile_id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where public.current_school_id() = rc.school_id
    and m.valid_from <= now()
    and rc.id::text = auth.jwt()->>'session_id'
    and rc.profile_id = auth.uid()
    and rc.revoked_at is null
    and rc.expires_at > now()
    and p.account_status = 'active'
    and p.credential_reset_required = false
    and p.authorization_version = rc.authorization_version
    and m.membership_status = 'active'
    and (m.valid_until is null or m.valid_until > now())
    and s.status = 'active'
  limit 1;
$$;

create or replace function public.current_role_has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_school_id() is not null and exists (
    select 1 from public.role_contexts c join public.user_roles m on m.id = c.assignment_id
    where c.id::text = auth.jwt()->>'session_id' and c.profile_id = auth.uid()
      and c.school_id = public.current_school_id() and m.school_id = c.school_id
      and m.profile_id = c.profile_id and m.role_code = c.role_code
      and m.membership_status = 'active' and m.valid_from <= now()
      and (m.valid_until is null or m.valid_until > now())
      and p_permission = any(m.permissions)
      and (p_permission not like 'security.%' and p_permission not in ('reports.export','marks.publish','school.settings.write')
        or app_private.staff_password_is_recent())
      and case m.role_code
        when 'admin' then p_permission not like 'children.%'
          and (p_permission not like 'dashboard.%' or p_permission = 'dashboard.admin.view')
        when 'teacher' then p_permission = any(array['dashboard.teacher.view','students.read','attendance.read','attendance.write','homework.read','homework.write','marks.read','marks.write','reports.read','announcements.read','announcements.write','documents.read'])
        when 'accountant' then p_permission = any(array['dashboard.accountant.view','fees.read','fees.write','payments.read','payments.record','expenses.read','expenses.write','receipts.read','reports.read','reports.export','announcements.read','documents.read','audit.read'])
        when 'student' then p_permission = any(array['dashboard.student.view','students.read','attendance.read','homework.read','homework.write','marks.read','announcements.read','documents.read'])
        when 'parent' then p_permission = any(array['dashboard.parent.view','children.academics.read','children.fees.read','announcements.read','documents.read','receipts.read'])
        else false end
  )
$$;

create or replace function app_private.require_school_admin() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare school uuid:=public.current_school_id();
begin
 if school is null or public.current_active_role() is distinct from 'admin' or not app_private.staff_password_is_recent() then
 raise exception 'Access denied' using errcode='42501'; end if;
 return school;
end $$;

create or replace function public.review_school_registration(p_registration uuid,p_approve boolean,p_reason text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.school_registrations; target uuid; school uuid; membership uuid;
begin
 if not public.staff_session_is_live() or auth.jwt()->>'aal' is distinct from 'aal2'
 or not exists(select 1 from app_private.operators o join public.profiles p on p.id=o.profile_id where o.profile_id=auth.uid() and o.active and p.account_status='active' and not p.credential_reset_required)
 then raise exception 'Operator authorization required' using errcode='42501'; end if;
 select * into r from public.school_registrations where id=p_registration for update;
 if not found then raise exception 'Registration unavailable'; end if;
 if r.status='approved' and p_approve then return jsonb_build_object('school_id',r.provisioned_school_id); end if;
 if r.status<>'pending' then raise exception 'Registration is not pending'; end if;
 if not p_approve then
 if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'Rejection reason required'; end if;
 update public.school_registrations set status='rejected',rejection_reason=p_reason,approved_by=auth.uid()::text,updated_at=now() where id=r.id;
 else
 select id into target from auth.users where lower(email)=lower(r.admin_email) and email_confirmed_at is not null and (banned_until is null or banned_until<=now());
 if target is null then raise exception 'Confirmed applicant identity required before provisioning'; end if;
 insert into public.schools(code,name,status) values(r.school_code,r.school_name,'active') returning id into school;
 insert into public.profiles(id,account_status,credential_reset_required) values(target,'active',false) on conflict(id) do nothing;
 if not exists(select 1 from public.profiles where id=target and account_status='active' and not credential_reset_required) then raise exception 'Inactive target profile'; end if;
 insert into public.staff_profiles(profile_id,school_id,display_name,email) values(target,school,r.admin_name,r.admin_email);
 insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
 values(target,school,'admin','active',array['dashboard.admin.view','school.settings.read','school.settings.write','students.read','staff.read','academics.manage','admissions.read','admissions.write']) returning id into membership;
 insert into public.school_onboarding_progress(school_id,last_saved_by) values(school,target);
 update public.school_registrations set status='approved',approved_at=now(),approved_by=auth.uid()::text,provisioned_school_id=school,provisioned_admin_profile_id=target,updated_at=now() where id=r.id;
 end if;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'registration_reviewed',school,jsonb_build_object('registration_id',r.id,'approved',p_approve));
 return jsonb_build_object('school_id',school,'approved',p_approve);
end $$;

create or replace function public.activate_school_student(p_student uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); stu public.students; expiry timestamptz;
begin
 if public.current_role_has_permission('admissions.write') is not true then raise exception 'Access denied' using errcode='42501'; end if;

 select * into stu from public.students where id=p_student and school_id=school for update;
 if not found or stu.portal_access_status not in ('pending_activation','active') or stu.enrollment_status<>'active'
 or not exists(select 1 from public.profiles where id=stu.profile_id and account_status='active' and not credential_reset_required)
 then raise exception 'Student is not eligible' using errcode='42501'; end if;
 expiry:=public.activate_student_trial(stu.id,school);
 update public.students set portal_access_status='active',portal_activated_at=coalesce(portal_activated_at,now()),portal_activated_by=auth.uid() where id=stu.id;
 if stu.portal_access_status='pending_activation' then
 insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id) values(auth.uid(),stu.profile_id,'student_activated',school); end if;
 return jsonb_build_object('student_id',stu.id,'trial_ends_at',expiry);
end $$;

create or replace function public.bind_school_student_identity(p_registration text,p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); student public.students; target uuid;
begin
 if public.current_role_has_permission('admissions.write') is not true then raise exception 'Access denied' using errcode='42501'; end if;

 select * into student from public.students where school_id=school and registration_number=p_registration for update;
 if not found or student.portal_access_status<>'pending_activation' then raise exception 'Pending student required'; end if;
 select id into target from auth.users where lower(email)=lower(p_email) and email_confirmed_at is not null and (banned_until is null or banned_until<=now());
 if target is null or student.profile_id is not null and student.profile_id<>target then raise exception 'Verified identity unavailable'; end if;
 insert into public.profiles(id,account_status,credential_reset_required) values(target,'active',false) on conflict(id) do nothing;
 if not exists(select 1 from public.profiles where id=target and account_status='active' and not credential_reset_required) then raise exception 'Inactive identity'; end if;
 update public.students set profile_id=target where id=student.id;
 insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions) values(target,school,'student','active',array['dashboard.student.view'])
 on conflict(profile_id,school_id,role_code) do nothing;
 insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id) values(auth.uid(),target,'student_identity_bound',school);
 return true;
end $$;

create or replace function public.verify_school_guardian(p_registration text,p_guardian uuid,p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); target uuid; student uuid; existing uuid;
begin
 if public.current_role_has_permission('admissions.write') is not true then raise exception 'Access denied' using errcode='42501'; end if;

 select id into student from public.students where school_id=school and registration_number=p_registration for update;
 if student is null or not exists(select 1 from public.student_guardian_relationships where school_id=school and student_id=student and guardian_id=p_guardian) then raise exception 'Relationship unavailable'; end if;
 select id into target from auth.users where lower(email)=lower(p_email) and email_confirmed_at is not null and (banned_until is null or banned_until<=now());
 if target is null or exists(select 1 from public.students where id=student and profile_id=target) then raise exception 'Independent verified guardian required'; end if;
 select profile_id into existing from public.guardians where id=p_guardian for update;
 if existing is not null and existing<>target then raise exception 'Identity already bound'; end if;
 insert into public.profiles(id,account_status,credential_reset_required) values(target,'active',false) on conflict(id) do nothing;
 if not exists(select 1 from public.profiles where id=target and account_status='active' and not credential_reset_required) then raise exception 'Inactive identity'; end if;
 update public.guardians set profile_id=target where id=p_guardian;
 insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions) values(target,school,'parent','active',array['dashboard.parent.view','children.academics.read','children.fees.read']) on conflict(profile_id,school_id,role_code) do nothing;
 update public.student_guardian_relationships set relationship_status='verified',academic_access=true,fee_access=true,relationship_version=relationship_version+1
 where school_id=school and student_id=student and guardian_id=p_guardian and relationship_status='pending';
 if not found then raise exception 'Pending relationship required'; end if;
 insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id) values(auth.uid(),target,'guardian_relationship_verified',school);
 return true;
end $$;

create or replace function public.list_school_guardians() returns table(guardian_id uuid,registration_number text,display_name text,relationship_status text)
language plpgsql stable security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin();
begin
 if public.current_role_has_permission('admissions.read') is not true then raise exception 'Access denied' using errcode='42501'; end if;
 return query select g.id,s.registration_number,g.display_name,r.relationship_status from public.student_guardian_relationships r
 join public.students s on s.id=r.student_id and s.school_id=r.school_id join public.guardians g on g.id=r.guardian_id where r.school_id=school order by s.registration_number,g.id limit 500; end $$;

create or replace function public.save_school_onboarding(p_step integer,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); item jsonb; section_name text; year_id uuid; class_id uuid; section_id uuid; student uuid; guardian uuid; saved public.school_onboarding_progress;
begin
 if public.current_role_has_permission('school.settings.write') is not true then raise exception 'Access denied' using errcode='42501'; end if;

 if p_step not between 1 and 8 or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>200000 then raise exception 'Invalid step'; end if;
 perform 1 from public.schools where id=school for update;
 select id into year_id from public.academic_years where school_id=school order by starts_on desc limit 1;
 if p_step=1 then
 update public.schools set name=p_data->>'schoolName' where id=school;
 elsif p_step=2 then
 insert into public.academic_years(school_id,label,starts_on,ends_on) values(school,p_data->>'label',(p_data->>'startsOn')::date,(p_data->>'endsOn')::date)
 on conflict(school_id,label) do update set starts_on=excluded.starts_on,ends_on=excluded.ends_on;
 elsif p_step=3 then
 if year_id is null then raise exception 'Academic year required'; end if;
 for item in select * from jsonb_array_elements(p_data->'classes') loop
 insert into public.classes(school_id,name) values(school,item->>'className') on conflict(school_id,name) do update set name=excluded.name returning id into class_id;
 for section_name in select jsonb_array_elements_text(item->'sections') loop
 insert into public.sections(school_id,class_id,academic_year_id,name) values(school,class_id,year_id,section_name) on conflict on constraint sections_school_class_year_name_key do nothing;
 end loop; end loop;
 elsif p_step=4 then
 -- Onboarding confirms invitations issued by the secure delivery workflow. It
 -- must not create unreachable UUID bearer tokens or persist raw secrets.
 for item in select * from jsonb_array_elements(p_data->'invitations') loop
 if not exists (
   select 1 from public.staff_invitations i
   where i.school_id=school and i.email=lower(item->>'email')
     and i.role_code=item->>'roleCode' and i.status in ('pending','accepted')
     and (i.status='accepted' or i.expires_at>now())
     and exists(select 1 from public.audit_events a where a.school_id=school
       and a.event_type='staff_invitation_issued' and a.details->>'invitation_id'=i.id::text)
 ) then raise exception 'Issue and deliver the invitation before completing this step' using errcode='42501'; end if;
 end loop;
 elsif p_step=5 then
 if year_id is null then raise exception 'Academic year required'; end if;
 for item in select * from jsonb_array_elements(p_data->'students') loop
 select s.id into section_id from public.sections s join public.classes c on c.id=s.class_id and c.school_id=s.school_id
 where s.school_id=school and s.academic_year_id=year_id and c.name=item->>'className' and s.name=item->>'sectionName';
 if section_id is null then raise exception 'Section unavailable'; end if;
 insert into public.students(school_id,registration_number,display_name,enrollment_status)
 values(school,item->>'registrationNumber',item->>'fullName','active') on conflict(school_id,registration_number) do update set display_name=excluded.display_name returning id into student;
 if not exists(select 1 from public.enrollments where student_id=student and academic_year_id=year_id and school_id=school) then
 insert into public.enrollments(student_id,school_id,academic_year_id,section_id,valid_from) values(student,school,year_id,section_id,current_date);
 end if;
 end loop;
 elsif p_step=6 then
 for item in select * from jsonb_array_elements(p_data->'guardians') loop
 select id into student from public.students where school_id=school and registration_number=item->>'studentRegistrationNumber';
 if student is null then raise exception 'Student unavailable'; end if;
 -- A school-owned relationship draft stores contact details; no PIN identity is inferred.
 select g.id into guardian from public.guardians g join public.student_guardian_relationships r on r.guardian_id=g.id where r.student_id=student and r.school_id=school and g.display_name=item->>'guardianName' limit 1;
 if guardian is null then
 insert into public.guardians(display_name) values(item->>'guardianName') returning id into guardian;
 insert into public.student_guardian_relationships(school_id,student_id,guardian_id,relationship_status,academic_access,fee_access) values(school,student,guardian,'pending',false,false);
 end if;
 end loop;
 elsif p_step=7 then
 for student in select id from public.students where school_id=school and
 (coalesce((p_data->>'activateAll')::boolean,false) or registration_number in (select jsonb_array_elements_text(p_data->'activatedStudentRegistrationNumbers'))) loop
 perform public.activate_school_student(student);
 end loop;
 elsif p_step=8 then
 if not exists(select 1 from public.school_onboarding_progress where school_id=school and completed_steps @> array[1,2,3,4,5,6,7]) then raise exception 'Complete previous steps first'; end if;
 end if;
 insert into public.school_onboarding_progress(school_id,current_step,completed_steps,step_data,last_saved_by,is_completed,completed_at)
 values(school,p_step,array[p_step],jsonb_build_object(p_step::text,p_data),auth.uid(),p_step=8,case when p_step=8 then now() end)
 on conflict(school_id) do update set current_step=excluded.current_step,
 completed_steps=(select array_agg(distinct x) from unnest(public.school_onboarding_progress.completed_steps||excluded.completed_steps) x),
 step_data=public.school_onboarding_progress.step_data||excluded.step_data,last_saved_by=auth.uid(),updated_at=now(),
 is_completed=public.school_onboarding_progress.is_completed or excluded.is_completed,completed_at=coalesce(public.school_onboarding_progress.completed_at,excluded.completed_at)
 returning * into saved;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'onboarding_step_saved',school,jsonb_build_object('step',p_step));
 return to_jsonb(saved);
end $$;

create or replace function public.issue_staff_invitation(p_email text,p_name text,p_role text,p_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); result uuid;
begin
 if public.current_role_has_permission('security.roles.assign') is not true then raise exception 'Access denied' using errcode='42501'; end if;

 p_email:=lower(trim(p_email));
 p_name:=trim(p_name);
 if p_email is null or length(p_email)>254 or p_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    or p_name is null or length(p_name) not between 2 and 160 or p_name ~ '[[:cntrl:]]'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_role is null or p_role not in ('teacher','accountant') then
   raise exception 'Invalid invitation' using errcode='22023';
 end if;
 update public.staff_invitations set status='expired',updated_at=now()
 where school_id=school and lower(email)=p_email and role_code=p_role and status='pending' and expires_at<=now();
 insert into public.staff_invitations(school_id,email,display_name,role_code,invitation_token,invited_by)
 values(school,p_email,p_name,p_role,'sha256:'||p_token_hash,auth.uid()) returning id into result;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details)
 values(auth.uid(),'staff_invitation_issued',school,jsonb_build_object('invitation_id',result));
 return result;
end $$;

create or replace function public.revoke_staff_invitation(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin();
begin
 if public.current_role_has_permission('security.roles.revoke') is not true then raise exception 'Access denied' using errcode='42501'; end if;

 update public.staff_invitations set status='revoked',updated_at=now() where id=p_id and school_id=school and status='pending';
 if not found then return false; end if;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'staff_invitation_revoked',school,jsonb_build_object('invitation_id',p_id));
 return true;
end $$;

-- Existing direct school settings grants must enforce the same write boundary.
drop policy school_settings_admin on public.school_settings;
create policy school_settings_admin_read on public.school_settings for select to authenticated
 using(school_id=public.current_school_id() and public.current_active_role()='admin');
create policy school_settings_admin_insert on public.school_settings for insert to authenticated
 with check(school_id=public.current_school_id() and public.current_active_role()='admin'
   and public.current_role_has_permission('school.settings.write'));
create policy school_settings_admin_update on public.school_settings for update to authenticated
 using(school_id=public.current_school_id() and public.current_active_role()='admin'
   and public.current_role_has_permission('school.settings.write'))
 with check(school_id=public.current_school_id() and public.current_active_role()='admin'
   and public.current_role_has_permission('school.settings.write'));

-- The legacy RPC has no school argument and has no live application caller.
revoke all on function public.activate_staff_context(text) from public,anon,authenticated,service_role;
commit;
