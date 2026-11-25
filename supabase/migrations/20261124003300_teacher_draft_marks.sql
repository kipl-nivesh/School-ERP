begin;

-- Teachers save entries through the command, never direct table writes.
-- Other roles continue to use their existing table privileges and policies.
do $policies$
declare relation text;
begin
  foreach relation in array array['marks_sheets','marks_entries'] loop
    execute format('create policy teacher_no_direct_insert on public.%I as restrictive for insert to authenticated with check (public.current_active_role() is distinct from ''teacher'')',relation);
    execute format('create policy teacher_no_direct_update on public.%I as restrictive for update to authenticated using (public.current_active_role() is distinct from ''teacher'') with check (public.current_active_role() is distinct from ''teacher'')',relation);
    execute format('create policy teacher_no_direct_delete on public.%I as restrictive for delete to authenticated using (public.current_active_role() is distinct from ''teacher'')',relation);
  end loop;
end
$policies$;

create function public.save_teacher_draft_mark(
  p_school uuid, p_exam uuid, p_student uuid, p_score numeric, p_expected numeric
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  school uuid := public.current_school_id();
  actor uuid := auth.uid();
  exam public.marks_sheets%rowtype;
  entry public.marks_entries%rowtype;
begin
  if school is null or school is distinct from p_school or actor is null
    or public.current_active_role() is distinct from 'teacher'
    or public.current_role_has_permission('marks.write') is not true
    or public.current_role_has_permission('marks.read') is not true
    or public.current_role_has_permission('students.read') is not true then
    raise exception 'Marks change not authorized' using errcode='42501';
  end if;
  select * into exam from public.marks_sheets where id=p_exam and school_id=school for update;
  if not found or exam.is_published or exam.published_at is not null then
    raise exception 'Draft exam unavailable' using errcode='42501';
  end if;
  perform 1 from public.teacher_assignments a
    where a.school_id=school and a.section_id=exam.section_id and a.subject_code=exam.subject_code
      and a.teacher_profile_id=actor and a.valid_from<=current_date
      and (a.valid_until is null or a.valid_until>=current_date)
    for share;
  if not found then raise exception 'Current subject assignment required' using errcode='42501'; end if;
  perform 1 from public.enrollments e
    where e.school_id=school and e.section_id=exam.section_id and e.student_id=p_student
      and e.valid_from<=exam.exam_date and (e.valid_until is null or e.valid_until>=exam.exam_date)
      and e.valid_from<=current_date and (e.valid_until is null or e.valid_until>=current_date)
    for share;
  if not found then raise exception 'Student enrollment unavailable' using errcode='42501'; end if;
  if p_score is null or p_score<0 or p_score>exam.max_marks or round(p_score,2)<>p_score then
    raise exception 'Invalid marks' using errcode='22023';
  end if;
  select * into entry from public.marks_entries
    where school_id=school and marks_sheet_id=exam.id and student_id=p_student for update;
  if entry.id is not null and entry.marks_obtained=p_score then return entry.id; end if;
  if entry.marks_obtained is distinct from p_expected then
    raise exception 'Marks changed; reload the exam' using errcode='40001';
  end if;
  if entry.id is null then
    insert into public.marks_entries(school_id,marks_sheet_id,student_id,marks_obtained)
      values(school,exam.id,p_student,p_score) returning * into entry;
  else
    update public.marks_entries set marks_obtained=p_score where school_id=school and id=entry.id;
  end if;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(actor,'teacher_draft_mark_saved',school,
      jsonb_build_object('exam_id',exam.id,'entry_id',entry.id,'student_id',p_student,
        'previous_score',p_expected,'score',p_score));
  return entry.id;
end $$;
alter function public.save_teacher_draft_mark(uuid,uuid,uuid,numeric,numeric) owner to postgres;
revoke all on function public.save_teacher_draft_mark(uuid,uuid,uuid,numeric,numeric) from public,anon,service_role;
grant execute on function public.save_teacher_draft_mark(uuid,uuid,uuid,numeric,numeric) to authenticated;

commit;
