-- Step 24B local draft. Operator grants are infrastructure-managed, not a school role.
begin;
create table app_private.operators (
 profile_id uuid primary key references public.profiles(id), active boolean not null default false
);
revoke all on app_private.operators from public,anon,authenticated,service_role;
alter table app_private.operators enable row level security;
alter table app_private.operators force row level security;
create function public.list_school_memberships() returns table(school_id uuid,school_name text,role_code text)
language sql stable security definer set search_path='' as $$
 select s.id,s.name,m.role_code from public.user_roles m join public.schools s on s.id=m.school_id
 join public.profiles p on p.id=m.profile_id
 where public.staff_session_is_live() and p.id=auth.uid() and p.account_status='active' and not p.credential_reset_required
 and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now()) and s.status='active'
$$;
create function public.select_school_context(p_school uuid,p_role text) returns boolean
language plpgsql security definer set search_path='' as $$
declare m public.user_roles; p public.profiles; sid uuid;
begin
 if not public.staff_session_is_live() or p_role not in ('admin','teacher','accountant') then return false; end if;
 select * into p from public.profiles where id=auth.uid() and account_status='active' and not credential_reset_required for update;
 if not found then return false; end if;
 select * into m from public.user_roles where profile_id=p.id and school_id=p_school and role_code=p_role
 and membership_status='active' and valid_from<=now() and (valid_until is null or valid_until>now());
 if not found or not exists(select 1 from public.schools where id=p_school and status='active') then return false; end if;
 if p_role='admin' and (auth.jwt()->>'aal' is distinct from 'aal2' or not exists(select 1 from auth.mfa_factors where user_id=p.id and status='verified')) then return false; end if;
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

create function app_private.require_school_admin() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare school uuid:=public.current_school_id();
begin
 if school is null or public.current_active_role() is distinct from 'admin' or auth.jwt()->>'aal' is distinct from 'aal2' then
 raise exception 'Access denied' using errcode='42501'; end if;
 return school;
end $$;
revoke all on function app_private.require_school_admin() from public,anon,authenticated,service_role;

create function public.activate_school_student(p_student uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); stu public.students; expiry timestamptz;
begin
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

-- Approval is reachable only with a genuine native operator session and private allowlist grant.
create function public.review_school_registration(p_registration uuid,p_approve boolean,p_reason text default null) returns jsonb
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
 if target is null or not exists(select 1 from auth.mfa_factors where user_id=target and status='verified' and factor_type='totp') then raise exception 'Confirmed email and native verified MFA required before provisioning'; end if;
 insert into public.schools(code,name,status) values(r.school_code,r.school_name,'active') returning id into school;
 insert into public.profiles(id,account_status,credential_reset_required) values(target,'active',false) on conflict(id) do nothing;
 if not exists(select 1 from public.profiles where id=target and account_status='active' and not credential_reset_required) then raise exception 'Inactive target profile'; end if;
 insert into public.staff_profiles(profile_id,school_id,display_name,email) values(target,school,r.admin_name,r.admin_email);
 insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
 values(target,school,'admin','active',array['dashboard.admin.view','school.settings.read','school.settings.write','students.read','staff.read','academics.manage','admissions.read','admissions.write']) returning id into membership;
 insert into public.mfa_factor_trust_registry(profile_id,factor_id,approved_by,status)
 select target,id::text,auth.uid(),'active' from auth.mfa_factors where user_id=target and status='verified' and factor_type='totp'
 on conflict(factor_id) do nothing;
 insert into public.school_onboarding_progress(school_id,last_saved_by) values(school,target);
 update public.school_registrations set status='approved',approved_at=now(),approved_by=auth.uid()::text,provisioned_school_id=school,provisioned_admin_profile_id=target,updated_at=now() where id=r.id;
 end if;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'registration_reviewed',school,jsonb_build_object('registration_id',r.id,'approved',p_approve));
 return jsonb_build_object('school_id',school,'approved',p_approve);
end $$;
-- Retire owner-identity and caller-supplied operator-ID paths, including service-role grants.
revoke all on function public.provision_approved_school(uuid,text,uuid),public.reject_school_registration(uuid,text,text),public.bootstrap_initial_school_admin_mfa(uuid,uuid,text) from public,anon,authenticated,service_role;

create function public.registration_status(p_registration uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.staff_session_is_live() then raise exception 'Access denied' using errcode='42501'; end if;
 select jsonb_build_object('id',r.id,'status',r.status,'school_id',r.provisioned_school_id,'reason',r.rejection_reason) into result
 from public.school_registrations r join auth.users u on lower(u.email)=lower(r.admin_email)
 where r.id=p_registration and u.id=auth.uid() and u.email_confirmed_at is not null;
 if result is null then raise exception 'Access denied' using errcode='42501'; end if; return result;
end $$;

create function public.save_school_onboarding(p_step integer,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); item jsonb; section_name text; year_id uuid; class_id uuid; section_id uuid; student uuid; guardian uuid; saved public.school_onboarding_progress;
begin
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
 for item in select * from jsonb_array_elements(p_data->'invitations') loop
 insert into public.staff_invitations(school_id,email,display_name,role_code,invitation_token,invited_by)
 values(school,lower(item->>'email'),item->>'displayName',item->>'roleCode',gen_random_uuid()::text,auth.uid()) on conflict do nothing;
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
revoke all on function public.list_school_memberships(),public.select_school_context(uuid,text),public.activate_school_student(uuid),public.review_school_registration(uuid,boolean,text),public.registration_status(uuid),public.save_school_onboarding(integer,jsonb) from public,anon,service_role;
grant execute on function public.list_school_memberships(),public.select_school_context(uuid,text),public.activate_school_student(uuid),public.review_school_registration(uuid,boolean,text),public.registration_status(uuid),public.save_school_onboarding(integer,jsonb) to authenticated;
commit;
