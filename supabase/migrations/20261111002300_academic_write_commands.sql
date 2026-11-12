begin;
-- Prevent clients bypassing command validation and transactional audit records.
revoke insert,update,delete on public.attendance_records,public.homework_assignments from public,anon,authenticated;

create function public.save_attendance_atomic(p_section uuid,p_entries jsonb,p_school_id uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare school uuid:=public.current_school_id(); item jsonb; affected integer; saved integer:=0;
begin
  if school is null or public.staff_section_access(p_section,'attendance.write') is not true
    or (p_school_id is not null and p_school_id is distinct from school) then
    raise exception 'Attendance not authorized' using errcode='42501';
  end if;
  if p_entries is null or jsonb_typeof(p_entries)<>'array' then
    raise exception 'Invalid attendance entries' using errcode='22023';
  end if;
  if jsonb_array_length(p_entries) not between 1 and 200
    or (select count(distinct e->>'studentId') from jsonb_array_elements(p_entries) e) <> jsonb_array_length(p_entries) then
    raise exception 'Invalid attendance batch' using errcode='22023';
  end if;
  -- Stable student ordering prevents opposite-order batch deadlocks.
  for item in select e from jsonb_array_elements(p_entries) e order by e->>'studentId' loop
    if public.staff_enrollment_access((item->>'studentId')::uuid,p_section,'attendance.write') is not true
      or coalesce(item->>'status','') not in ('present','absent','late','excused')
      or length(coalesce(item->>'remarks',''))>1000 then
      raise exception 'Invalid or unauthorized attendance entry' using errcode='42501';
    end if;
    insert into public.attendance_records(school_id,student_id,section_id,attendance_date,status,remarks,recorded_by_profile_id)
    values(school,(item->>'studentId')::uuid,p_section,current_date,item->>'status',item->>'remarks',auth.uid())
    on conflict(student_id,attendance_date) do update set status=excluded.status,remarks=excluded.remarks,recorded_by_profile_id=excluded.recorded_by_profile_id
    where public.attendance_records.school_id=school and public.attendance_records.section_id=p_section;
    get diagnostics affected=row_count;
    if affected<>1 then raise exception 'Attendance section conflict' using errcode='23505'; end if;
    saved:=saved+1;
  end loop;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(auth.uid(),'attendance_saved',school,jsonb_build_object('section_id',p_section,'date',current_date,'count',saved));
  return saved;
end;
$$;

create function public.create_homework_atomic(p_id uuid,p_section uuid,p_subject text,p_title text,p_description text,p_due date,p_points integer,p_school_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare school uuid:=public.current_school_id(); prior public.homework_assignments;
begin
  if school is null or public.staff_section_access(p_section,'homework.write') is not true
    or (p_school_id is not null and p_school_id is distinct from school) then
    raise exception 'Homework not authorized' using errcode='42501';
  end if;
  if p_id is null or coalesce(length(trim(p_subject)),0) not between 1 and 80
    or coalesce(length(trim(p_title)),0) not between 1 and 200
    or p_description is null or length(p_description)>10000 or p_due is null or p_due<current_date
    or p_points is null or p_points not between 1 and 10000 then
    raise exception 'Invalid homework' using errcode='22023';
  end if;
  if public.current_active_role()='teacher' and not exists (
    select 1 from public.teacher_assignments a where a.school_id=school and a.section_id=p_section
      and a.teacher_profile_id=auth.uid() and a.subject_code=trim(p_subject)
      and a.valid_from<=current_date and (a.valid_until is null or a.valid_until>=current_date)) then
    raise exception 'Subject assignment required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
  select * into prior from public.homework_assignments where id=p_id;
  if found then
    if prior.school_id is distinct from school or prior.teacher_profile_id is distinct from auth.uid()
      or prior.section_id is distinct from p_section or prior.subject_code is distinct from trim(p_subject)
      or prior.title is distinct from trim(p_title) or prior.description is distinct from p_description
      or prior.due_date is distinct from p_due or prior.max_points is distinct from p_points then
      raise exception 'Homework request conflict' using errcode='23505';
    end if;
    return prior.id;
  end if;
  insert into public.homework_assignments(id,school_id,section_id,subject_code,title,description,due_date,max_points,teacher_profile_id)
    values(p_id,school,p_section,trim(p_subject),trim(p_title),p_description,p_due,p_points,auth.uid());
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(auth.uid(),'homework_created',school,jsonb_build_object('homework_id',p_id));
  return p_id;
end;
$$;
revoke all on function public.save_attendance_atomic(uuid,jsonb,uuid),public.create_homework_atomic(uuid,uuid,text,text,text,date,integer,uuid) from public,anon,service_role;
grant execute on function public.save_attendance_atomic(uuid,jsonb,uuid),public.create_homework_atomic(uuid,uuid,text,text,text,date,integer,uuid) to authenticated;
commit;
