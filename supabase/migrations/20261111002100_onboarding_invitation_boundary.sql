-- Additive: preserve old rows; no tokens are regenerated or disclosed.
begin;
revoke insert, update, delete on public.school_onboarding_progress from public,anon,authenticated;
create or replace function public.save_school_onboarding(p_step integer,p_data jsonb) returns jsonb
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
commit;
