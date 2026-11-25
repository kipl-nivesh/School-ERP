begin;

-- Preserve invoice snapshots when fee structures change. An assignment is
-- unique for a student, structure, and billing due date.
create table app_private.fee_assignment_commands (
  school_id uuid not null,
  structure_id uuid not null references public.fee_structures(id),
  student_id uuid not null,
  billing_due date not null,
  invoice_id uuid not null,
  primary key (school_id, structure_id, student_id, billing_due),
  foreign key (invoice_id, school_id) references public.fee_invoices(id, school_id),
  foreign key (student_id, school_id) references public.students(id, school_id)
);
alter table app_private.fee_assignment_commands enable row level security;
alter table app_private.fee_assignment_commands force row level security;
revoke all on table app_private.fee_assignment_commands from public,anon,authenticated,service_role;
revoke insert,update,delete on public.fee_structures from public,anon,authenticated;

create function public.configure_school_fee(
  p_school uuid,p_id uuid,p_class uuid,p_category text,p_frequency text,
  p_amount bigint,p_due date,p_expected_amount bigint,p_expected_due date
) returns uuid
language plpgsql security definer set search_path='' as $$
declare school uuid := public.current_school_id(); changed uuid;
begin
  if school is null or school is distinct from p_school or auth.uid() is null
    or coalesce(public.current_active_role(),'') not in ('admin','accountant')
    or public.current_role_has_permission('fees.write') is not true then
    raise exception 'Fee configuration not authorized' using errcode='42501';
  end if;
  if p_id is null or p_amount is null or p_amount not between 1 and 9007199254740991
    or p_due is null or not isfinite(p_due)
    or (p_expected_amount is null) <> (p_expected_due is null) then
    raise exception 'Invalid fee configuration' using errcode='22023';
  end if;
  if p_expected_amount is null then
    if not exists(select 1 from public.classes where id=p_class and school_id=school) then
      raise exception 'Class unavailable' using errcode='42501';
    end if;
    insert into public.fee_structures(id,school_id,class_id,fee_category,frequency,amount_paise,due_date)
      values(p_id,school,p_class,p_category,p_frequency,p_amount,p_due) returning id into changed;
  else
    update public.fee_structures set amount_paise=p_amount,due_date=p_due
      where id=p_id and school_id=school and amount_paise=p_expected_amount and due_date=p_expected_due
      returning id into changed;
    if changed is null then raise exception 'Fee structure unavailable or changed' using errcode='40001'; end if;
  end if;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(auth.uid(),'fee_structure_saved',school,jsonb_build_object('id',changed,
      'previous_amount_paise',p_expected_amount,'amount_paise',p_amount,'previous_due',p_expected_due,'due',p_due));
  return changed;
end $$;

create function public.assign_school_fee(p_school uuid,p_structure uuid,p_student uuid,p_due date) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  school uuid := public.current_school_id();
  structure public.fee_structures%rowtype;
  year_id uuid;
  invoice uuid;
begin
  if school is null or school is distinct from p_school or auth.uid() is null
    or coalesce(public.current_active_role(),'') not in ('admin','accountant')
    or public.current_role_has_permission('fees.write') is not true then
    raise exception 'Fee assignment not authorized' using errcode='42501';
  end if;
  if p_due is null or not isfinite(p_due) or p_structure is null or p_student is null then
    raise exception 'Invalid fee assignment' using errcode='22023';
  end if;
  select * into structure from public.fee_structures where id=p_structure and school_id=school for share;
  if not found then raise exception 'Fee structure unavailable' using errcode='42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(school::text||p_structure::text||p_student::text||p_due::text,34));
  select invoice_id into invoice from app_private.fee_assignment_commands
    where school_id=school and structure_id=p_structure and student_id=p_student and billing_due=p_due;
  if found then return invoice; end if;
  if p_due<current_date then raise exception 'Invalid fee due date' using errcode='22023'; end if;

  -- Require exactly one current enrollment in this structure's class and year.
  select e.academic_year_id into strict year_id
    from public.enrollments e
    join public.sections s on s.id=e.section_id and s.school_id=e.school_id
    join public.academic_years y on y.id=e.academic_year_id and y.school_id=e.school_id
    join public.students pupil on pupil.id=e.student_id and pupil.school_id=e.school_id
    where e.school_id=school and e.student_id=p_student and s.class_id=structure.class_id
      and pupil.enrollment_status='active'
      and e.valid_from<=current_date and (e.valid_until is null or e.valid_until>=current_date)
      and current_date between y.starts_on and y.ends_on and p_due<=y.ends_on
    for share of e,s,y,pupil;

  invoice := gen_random_uuid();
  insert into public.fee_invoices(id,school_id,student_id,academic_year_id,invoice_number,title,due_date,amount_paise)
    values(invoice,school,p_student,year_id,'FEE-'||invoice::text,
      initcap(structure.fee_category)||' fee',p_due,structure.amount_paise);
  insert into app_private.fee_assignment_commands values(school,p_structure,p_student,p_due,invoice);
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(auth.uid(),'fee_assigned',school,jsonb_build_object('invoice_id',invoice,
      'structure_id',p_structure,'student_id',p_student,'amount_paise',structure.amount_paise));
  return invoice;
exception when no_data_found or too_many_rows then
  raise exception 'Eligible enrollment unavailable' using errcode='42501';
end $$;

alter function public.configure_school_fee(uuid,uuid,uuid,text,text,bigint,date,bigint,date) owner to postgres;
alter function public.assign_school_fee(uuid,uuid,uuid,date) owner to postgres;
revoke all on function public.configure_school_fee(uuid,uuid,uuid,text,text,bigint,date,bigint,date),
  public.assign_school_fee(uuid,uuid,uuid,date) from public,anon,service_role;
grant execute on function public.configure_school_fee(uuid,uuid,uuid,text,text,bigint,date,bigint,date),
  public.assign_school_fee(uuid,uuid,uuid,date) to authenticated;

commit;
