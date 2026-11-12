begin;
-- Binding requires an existing confirmed native identity; no Auth account is created here.
create function public.bind_school_student_identity(p_registration text,p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); student public.students; target uuid;
begin
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
revoke all on function public.bind_school_student_identity(text,text) from public,anon,service_role;
grant execute on function public.bind_school_student_identity(text,text) to authenticated;
alter function public.bind_school_student_identity(text,text) owner to postgres;
create function public.verify_school_guardian(p_registration text,p_guardian uuid,p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); target uuid; student uuid; existing uuid;
begin
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
revoke all on function public.verify_school_guardian(text,uuid,text) from public,anon,service_role;
grant execute on function public.verify_school_guardian(text,uuid,text) to authenticated;
alter function public.verify_school_guardian(text,uuid,text) owner to postgres;
create function public.list_school_guardians() returns table(guardian_id uuid,registration_number text,display_name text,relationship_status text)
language plpgsql stable security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin();
begin return query select g.id,s.registration_number,g.display_name,r.relationship_status from public.student_guardian_relationships r
 join public.students s on s.id=r.student_id and s.school_id=r.school_id join public.guardians g on g.id=r.guardian_id where r.school_id=school order by s.registration_number,g.id limit 500; end $$;
revoke all on function public.list_school_guardians() from public,anon,service_role;
grant execute on function public.list_school_guardians() to authenticated;
commit;
