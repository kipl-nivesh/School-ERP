begin;
create table app_private.academic_requests (
  school_id uuid not null references public.schools(id), request_id uuid not null,
  actor_id uuid not null references public.profiles(id), kind text not null,
  payload_hash text not null, result jsonb not null, primary key(school_id,request_id)
);
revoke all on app_private.academic_requests from public,anon,authenticated,service_role;
alter table app_private.academic_requests enable row level security;
alter table app_private.academic_requests force row level security;
alter table public.homework_assignments add column revision integer not null default 1 check(revision>0);
alter table public.timetable_slots add column revision integer not null default 1 check(revision>0);
revoke insert,update,delete on public.classes,public.sections,public.teacher_assignments,public.timetable_slots from public,anon,authenticated;

create function public.manage_academics(p_request uuid,p_kind text,p_id uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  school uuid:=public.current_school_id(); permission text; fingerprint text; prior app_private.academic_requests;
  section public.sections; homework public.homework_assignments; slot public.timetable_slots;
  teacher uuid; subject text; day text; starts time; ends time; revision integer; result jsonb;
begin
  if school is null or auth.uid() is null then raise exception 'Access denied' using errcode='42501'; end if;
  if p_request is null or p_id is null or p_data is null or jsonb_typeof(p_data)<>'object'
    or octet_length(p_data::text)>30000 or p_kind is null
    or p_kind not in ('class','section','assignment','timetable','homework') then
    raise exception 'Invalid command' using errcode='22023';
  end if;
  permission:=case when p_kind='homework' then 'homework.write' else 'academics.manage' end;
  if public.current_role_has_permission(permission) is not true
    or (p_kind<>'homework' and public.current_active_role() is distinct from 'admin') then
    raise exception 'Access denied' using errcode='42501';
  end if;
  fingerprint:=encode(sha256(convert_to(jsonb_build_object('id',p_id,'data',p_data)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(school::text||p_request::text,2));
  select * into prior from app_private.academic_requests where school_id=school and request_id=p_request;
  if found then
    if prior.actor_id is distinct from auth.uid() or prior.kind is distinct from p_kind or prior.payload_hash is distinct from fingerprint then
      raise exception 'Request conflict' using errcode='23505'; end if;
    return prior.result;
  end if;
  if p_kind in ('class','section') and coalesce(length(trim(p_data->>'name')),0) not between 1 and 80 then
    raise exception 'Name required' using errcode='22023'; end if;
  if p_kind='class' then
    insert into public.classes(id,school_id,name) values(p_id,school,trim(p_data->>'name'));
  elsif p_kind='section' then
    if not exists(select 1 from public.classes where id=(p_data->>'classId')::uuid and school_id=school)
      or not exists(select 1 from public.academic_years where id=(p_data->>'yearId')::uuid and school_id=school) then
      raise exception 'Class or year unavailable' using errcode='42501'; end if;
    insert into public.sections(id,school_id,class_id,academic_year_id,name)
      values(p_id,school,(p_data->>'classId')::uuid,(p_data->>'yearId')::uuid,trim(p_data->>'name'));
  elsif p_kind in ('assignment','timetable') then
    select * into section from public.sections where id=(p_data->>'sectionId')::uuid and school_id=school;
    if not found then raise exception 'Section unavailable' using errcode='42501'; end if;
    teacher:=(p_data->>'teacherId')::uuid; subject:=trim(p_data->>'subject');
    if coalesce(length(subject),0) not between 1 and 80 then raise exception 'Subject required' using errcode='22023'; end if;
    if not exists(select 1 from public.user_roles m join public.profiles p on p.id=m.profile_id
      join public.staff_profiles s on s.profile_id=m.profile_id and s.school_id=m.school_id
      where m.school_id=school and m.profile_id=teacher and m.role_code='teacher' and m.membership_status='active'
        and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now()) and p.account_status='active' and s.is_active) then
      raise exception 'Teacher unavailable' using errcode='42501'; end if;
    if p_kind='assignment' then
      if (p_data->>'validFrom')::date is null then raise exception 'Start date required' using errcode='22023'; end if;
      perform pg_advisory_xact_lock(hashtextextended(school::text||teacher::text||section.id::text||subject,4));
      if exists(select 1 from public.teacher_assignments a where a.school_id=school and a.teacher_profile_id=teacher
        and a.section_id=section.id and a.subject_code=subject
        and (a.valid_until is null or a.valid_until>=(p_data->>'validFrom')::date)
        and (nullif(p_data->>'validUntil','')::date is null or a.valid_from<=nullif(p_data->>'validUntil','')::date)) then
        raise exception 'Overlapping subject assignment' using errcode='23505'; end if;
      insert into public.teacher_assignments(id,school_id,teacher_profile_id,section_id,academic_year_id,subject_code,valid_from,valid_until)
        values(p_id,school,teacher,section.id,section.academic_year_id,subject,(p_data->>'validFrom')::date,nullif(p_data->>'validUntil','')::date);
    else
      if not exists(select 1 from public.teacher_assignments a where a.school_id=school and a.teacher_profile_id=teacher
        and a.section_id=section.id and a.subject_code=subject and a.valid_from<=current_date and (a.valid_until is null or a.valid_until>=current_date)) then
        raise exception 'Current subject assignment required' using errcode='42501'; end if;
      day:=p_data->>'day'; starts:=(p_data->>'start')::time; ends:=(p_data->>'end')::time;
      if starts is null or ends is null or ends<=starts or coalesce(length(p_data->>'room'),0) not between 1 and 80 then raise exception 'Invalid slot' using errcode='22023'; end if;
      perform pg_advisory_xact_lock(hashtextextended(school::text,3));
      select * into slot from public.timetable_slots where id=p_id and school_id=school for update;
      if coalesce(slot.revision,0) is distinct from (p_data->>'revision')::integer then raise exception 'Stale timetable revision' using errcode='40001'; end if;
      if exists(select 1 from public.timetable_slots t where t.school_id=school and t.id<>p_id and t.day_of_week=day
        and (t.teacher_profile_id=teacher or t.section_id=section.id) and t.start_time<ends and t.end_time>starts) then
        raise exception 'Timetable overlap' using errcode='23505'; end if;
      insert into public.timetable_slots(id,school_id,section_id,day_of_week,period_number,start_time,end_time,subject_code,room_number,teacher_profile_id)
      values(p_id,school,section.id,day,(p_data->>'period')::integer,starts,ends,subject,p_data->>'room',teacher)
      on conflict(id) do update set day_of_week=excluded.day_of_week,period_number=excluded.period_number,start_time=excluded.start_time,
        end_time=excluded.end_time,subject_code=excluded.subject_code,room_number=excluded.room_number,
        teacher_profile_id=excluded.teacher_profile_id,section_id=excluded.section_id,revision=public.timetable_slots.revision+1
      where public.timetable_slots.school_id=school returning public.timetable_slots.revision into revision;
      if not found then raise exception 'Slot unavailable' using errcode='42501'; end if;
    end if;
  elsif p_kind='homework' then
    select * into homework from public.homework_assignments where id=p_id and school_id=school for update;
    if not found or public.staff_section_access(homework.section_id,'homework.write') is not true
      or (public.current_active_role()='teacher' and (homework.teacher_profile_id is distinct from auth.uid() or not exists (
        select 1 from public.teacher_assignments a where a.school_id=school and a.teacher_profile_id=auth.uid()
        and a.section_id=homework.section_id and a.subject_code=homework.subject_code and a.valid_from<=current_date
        and (a.valid_until is null or a.valid_until>=current_date)))) then raise exception 'Homework unavailable' using errcode='42501'; end if;
    if homework.revision is distinct from (p_data->>'revision')::integer then raise exception 'Stale homework revision' using errcode='40001'; end if;
    if coalesce(length(trim(p_data->>'title')),0) not between 1 and 200 or p_data->>'description' is null
      or length(p_data->>'description')>10000 or coalesce(p_data->>'status','') not in ('active','closed')
      or (p_data->>'points')::integer is null or (p_data->>'points')::integer not between 1 and 10000
      or (p_data->>'due')::date is null then raise exception 'Invalid homework' using errcode='22023'; end if;
    update public.homework_assignments set title=trim(p_data->>'title'),description=p_data->>'description',due_date=(p_data->>'due')::date,
      max_points=(p_data->>'points')::integer,status=p_data->>'status',revision=homework.revision+1 where id=p_id returning public.homework_assignments.revision into revision;
  end if;
  result:=jsonb_build_object('id',p_id,'revision',revision);
  insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'academic_'||p_kind||'_saved',school,jsonb_build_object('id',p_id));
  insert into app_private.academic_requests values(school,p_request,auth.uid(),p_kind,fingerprint,result);
  return result;
end;
$$;
revoke all on function public.manage_academics(uuid,text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.manage_academics(uuid,text,uuid,jsonb) to authenticated;
commit;
