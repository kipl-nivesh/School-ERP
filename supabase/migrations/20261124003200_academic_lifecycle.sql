begin;

create function public.update_academic_lifecycle(
  p_school uuid, p_kind text, p_id uuid, p_expected text, p_name text,
  p_replacement uuid, p_effective date
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  school uuid := app_private.require_school_admin();
  assignment public.teacher_assignments%rowtype;
  replacement_id uuid;
begin
  if p_school is distinct from school or public.current_role_has_permission('academics.manage') is not true then
    raise exception 'Academic change not authorized' using errcode='42501';
  end if;
  if p_kind in ('rename_class','rename_section') then
    if p_name is null or length(btrim(p_name)) not between 1 and 80 or p_name ~ '[[:cntrl:]]' then
      raise exception 'Invalid academic label' using errcode='22023';
    end if;
    if p_kind='rename_class' then
      update public.classes set name=btrim(p_name)
        where id=p_id and school_id=school and name=p_expected;
    else
      update public.sections set name=btrim(p_name)
        where id=p_id and school_id=school and name=p_expected;
    end if;
    if not found then raise exception 'Record unavailable or changed' using errcode='40001'; end if;
  elsif p_kind in ('end_assignment','replace_assignment') then
    select * into assignment from public.teacher_assignments
      where id=p_id and school_id=school for update;
    if not found then raise exception 'Assignment unavailable' using errcode='42501'; end if;
    if p_expected is distinct from coalesce(assignment.valid_until::text,'') then
      raise exception 'Assignment changed' using errcode='40001';
    end if;
    -- Keep the old assignment and all references. The change starts on a
    -- future date, after at least one day of the original assignment.
    if p_effective is null or not isfinite(p_effective) or p_effective<=current_date
      or p_effective<=assignment.valid_from
      or (assignment.valid_until is not null and p_effective>assignment.valid_until) then
      raise exception 'Invalid effective date' using errcode='22023';
    end if;
    if p_kind='replace_assignment' then
      if p_replacement is null or p_replacement=assignment.teacher_profile_id or not exists (
        select 1 from public.user_roles m
        join public.profiles p on p.id=m.profile_id
        join public.staff_profiles s on s.profile_id=m.profile_id and s.school_id=m.school_id
        where m.school_id=school and m.profile_id=p_replacement and m.role_code='teacher'
          and m.membership_status='active' and m.valid_from<=now()
          and (m.valid_until is null or m.valid_until>now())
          and p.account_status='active' and not p.credential_reset_required and s.is_active
      ) then raise exception 'Replacement teacher unavailable' using errcode='42501'; end if;
      -- Match the existing add-assignment command's overlap lock.
      perform pg_advisory_xact_lock(hashtextextended(
        school::text||p_replacement::text||assignment.section_id::text||assignment.subject_code,4));
      if exists (
        select 1 from public.teacher_assignments a
        where a.school_id=school and a.teacher_profile_id=p_replacement
          and a.section_id=assignment.section_id and a.subject_code=assignment.subject_code
          and (a.valid_until is null or a.valid_until>=p_effective)
          and (assignment.valid_until is null or a.valid_from<=assignment.valid_until)
      ) then raise exception 'Overlapping replacement assignment' using errcode='23505'; end if;
      insert into public.teacher_assignments(school_id,teacher_profile_id,section_id,academic_year_id,subject_code,valid_from,valid_until)
        values(school,p_replacement,assignment.section_id,assignment.academic_year_id,
          assignment.subject_code,p_effective,assignment.valid_until)
        returning id into replacement_id;
    elsif p_replacement is not null then
      raise exception 'Unexpected replacement teacher' using errcode='22023';
    end if;
    update public.teacher_assignments set valid_until=p_effective-1 where id=p_id and school_id=school;
  else
    raise exception 'Unsupported academic change' using errcode='22023';
  end if;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(auth.uid(),'academic_'||p_kind,school,jsonb_strip_nulls(
      jsonb_build_object('id',p_id,'replacement_assignment_id',replacement_id,'effective_date',p_effective)));
  return p_id;
end $$;
alter function public.update_academic_lifecycle(uuid,text,uuid,text,text,uuid,date) owner to postgres;
revoke all on function public.update_academic_lifecycle(uuid,text,uuid,text,text,uuid,date) from public,anon,service_role;
grant execute on function public.update_academic_lifecycle(uuid,text,uuid,text,text,uuid,date) to authenticated;

commit;
