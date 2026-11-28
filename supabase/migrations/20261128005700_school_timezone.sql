-- Migration 057: School-Scoped IANA Timezone Configuration, Verification & Date-Deriving RPCs
-- Configures Brightcamp International School (BRIGHTCAMP / 4dd494f6-c109-4ca9-b244-fe744b3de33f)
-- to Asia/Kolkata without globally hardcoding Asia/Kolkata for other schools.

begin;

alter table public.schools
  add column if not exists timezone text,
  add column if not exists timezone_verified boolean not null default false,
  add column if not exists timezone_verified_at timestamptz,
  add column if not exists timezone_verified_by uuid references public.profiles(id);

create or replace function public.school_local_date(
  p_school uuid,
  p_at timestamptz default now()
)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.timezone_verified is true and s.timezone is not null
      then (coalesce(p_at, now()) at time zone s.timezone)::date
    else (coalesce(p_at, now()) at time zone 'UTC')::date
  end
  from public.schools s
  where s.id = p_school;
$$;

alter function public.school_local_date(uuid, timestamptz) owner to postgres;
-- Called only by the definer RPCs below, after those RPCs establish school scope.
revoke all on function public.school_local_date(uuid, timestamptz) from public, anon, authenticated, service_role;

-- Configure Brightcamp International School ONLY
update public.schools
set timezone = 'Asia/Kolkata',
    timezone_verified = true,
    timezone_verified_at = now(),
    updated_at = now()
where id = '4dd494f6-c109-4ca9-b244-fe744b3de33f'
  and upper(code) = 'BRIGHTCAMP';

-- Admin AAL2 MFA RPC to configure & verify the active school's IANA timezone
create or replace function public.admin_update_school_timezone(
  p_timezone text,
  p_verify boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  school uuid := public.current_school_id();
  clean_tz text := btrim(coalesce(p_timezone, ''));
  is_valid_tz boolean := false;
  verify_flag boolean := coalesce(p_verify, true);
begin
  if school is null
    or public.current_active_role() is distinct from 'admin'
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.staff_session_is_live() is not true
    or public.current_role_has_permission('school.settings.write') is not true then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;

  if length(clean_tz) not between 1 and 80 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_timezone');
  end if;

  select exists(
    select 1 from pg_catalog.pg_timezone_names tz where tz.name = clean_tz
  ) into is_valid_tz;

  if not is_valid_tz then
    return jsonb_build_object('ok', false, 'reason', 'invalid_timezone');
  end if;

  update public.schools
  set timezone = clean_tz,
      timezone_verified = verify_flag,
      timezone_verified_at = case when verify_flag then now() else null end,
      timezone_verified_by = case when verify_flag then auth.uid() else null end,
      updated_at = now()
  where id = school;

  insert into public.audit_events (actor_profile_id, event_type, school_id, details)
  values (
    auth.uid(),
    'school_timezone_updated',
    school,
    jsonb_build_object('timezone', clean_tz, 'verified', verify_flag)
  );

  return jsonb_build_object('ok', true, 'timezone', clean_tz, 'verified', verify_flag);
end;
$$;

alter function public.admin_update_school_timezone(text, boolean) owner to postgres;
revoke all on function public.admin_update_school_timezone(text, boolean) from public, anon, service_role;
grant execute on function public.admin_update_school_timezone(text, boolean) to authenticated;

-- Update Student & Parent portal identity RPCs to derive database_date in the school's timezone
create or replace function public.read_student_portal_identity()
returns table (school_id uuid, student_id uuid, school_name text, display_name text,
               registration_number text, database_date date)
language sql stable security definer set search_path = '' as $$
  select s.school_id, s.id, sc.name, s.display_name, s.registration_number,
         public.school_local_date(s.school_id)
  from app_private.read_live_student_scope() live
  join public.students s on s.id = live.student_id and s.school_id = live.school_id
  join public.schools sc on sc.id = live.school_id
  join public.student_subscriptions sub on sub.student_id = s.id and sub.school_id = s.school_id
  where sub.trial_activated is true
    and sub.status_override is distinct from 'suspended'
    and (greatest(sub.trial_ends_at, sub.current_period_expires_at) > now()
      or public.is_payment_deferred_access_mode()) is true;
$$;

create or replace function public.read_parent_portal_identity()
returns table (
  guardian_id uuid,
  profile_id uuid,
  school_id uuid,
  school_name text,
  display_name text,
  database_date date,
  children jsonb
)
language sql stable security definer set search_path = '' as $$
  select
    g.id as guardian_id,
    g.profile_id,
    sc.id as school_id,
    sc.name as school_name,
    g.display_name,
    public.school_local_date(sc.id) as database_date,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'relationship_id', sgr.id,
          'student_id', s.id,
          'student_name', s.display_name,
          'full_name', s.display_name,
          'registration_number', s.registration_number,
          'academic_access', (sgr.academic_access and public.current_role_has_permission('children.academics.read')),
          'fee_access', (sgr.fee_access and public.current_role_has_permission('children.fees.read')),
          'relationship_version', sgr.relationship_version,
          'section_id', enr.section_id,
          'academic_year_id', enr.academic_year_id,
          'class_name', cls.name,
          'section_name', sec.name,
          'academic_year', ay.label
        )
        order by s.registration_number, s.id
      )
      from public.student_guardian_relationships sgr
      join public.students s on s.id = sgr.student_id and s.school_id = sgr.school_id
      left join lateral (
        select e.section_id, e.academic_year_id
        from public.enrollments e
        where e.student_id = s.id
          and e.school_id = s.school_id
          and e.valid_from <= public.school_local_date(sc.id)
          and (e.valid_until is null or e.valid_until >= public.school_local_date(sc.id))
        order by e.valid_from desc
        limit 1
      ) enr on true
      left join public.sections sec on sec.id = enr.section_id and sec.school_id = s.school_id
      left join public.classes cls on cls.id = sec.class_id and cls.school_id = s.school_id
      left join public.academic_years ay on ay.id = enr.academic_year_id and ay.school_id = s.school_id
      where sgr.guardian_id = g.id
        and sgr.school_id = sc.id
        and sgr.relationship_status = 'verified'
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and (
          (sgr.academic_access and public.current_role_has_permission('children.academics.read'))
          or (sgr.fee_access and public.current_role_has_permission('children.fees.read'))
        )
        and s.enrollment_status = 'active'
    ), '[]'::jsonb) as children
  from public.guardians g
  join public.schools sc on sc.id = public.current_school_id()
  where public.parent_session_is_live()
    and g.profile_id = auth.uid();
$$;

-- Update admit_student_atomic to use school_local_date for admission year & enrollment valid_from
create or replace function public.admit_student_atomic(p_input jsonb, p_school_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  section public.sections%rowtype;
  student public.students%rowtype;
  guardian uuid;
  class_name text;
  school_today date;
  admission_year integer;
  new_reg text;
begin
  if school is null or public.current_active_role() is distinct from 'admin'
     or public.current_role_has_permission('admissions.write') is not true
     or (p_school_id is not null and p_school_id is distinct from school) then
    raise exception 'Admission not authorized' using errcode = '42501';
  end if;
  school_today := public.school_local_date(school);
  if p_input is null or jsonb_typeof(p_input) <> 'object'
     or coalesce(length(trim(p_input->>'fullName')),0) not between 1 and 160
     or coalesce(length(trim(p_input->>'guardianName')),0) not between 1 and 160
     or coalesce(length(trim(p_input->>'guardianPhone')),0) not between 3 and 40
     or coalesce(length(p_input->>'guardianEmail'),0) > 254
     or coalesce(p_input->>'gender','') not in ('male','female','other')
     or p_input->>'dateOfBirth' is null or (p_input->>'dateOfBirth')::date > school_today then
    raise exception 'Invalid admission input' using errcode = '22023';
  end if;
  select * into section from public.sections where id = (p_input->>'sectionId')::uuid
    and class_id = (p_input->>'classId')::uuid and school_id = school for share;
  if not found then raise exception 'Section unavailable' using errcode = '42501'; end if;
  select name into class_name from public.classes where id = section.class_id and school_id = school;

  admission_year := extract(year from school_today)::integer;
  new_reg := app_private.next_student_registration_number(school, admission_year);

  insert into public.students(school_id,registration_number,display_name,date_of_birth,gender,enrollment_status,portal_access_status)
  values(school,new_reg,trim(p_input->>'fullName'),(p_input->>'dateOfBirth')::date,
    p_input->>'gender','active','pending_activation') returning * into student;
  insert into public.enrollments(school_id,student_id,academic_year_id,section_id,valid_from)
    values(school,student.id,section.academic_year_id,section.id,school_today);
  insert into public.guardians(display_name) values(trim(p_input->>'guardianName')) returning id into guardian;
  insert into public.student_guardian_relationships(school_id,student_id,guardian_id,relationship_status,academic_access,fee_access)
    values(school,student.id,guardian,'pending',false,false);
  insert into public.admission_guardian_contacts(student_id,school_id,guardian_name,phone,email)
    values(student.id,school,trim(p_input->>'guardianName'),trim(p_input->>'guardianPhone'),coalesce(trim(p_input->>'guardianEmail'),''));
  insert into public.audit_events(actor_profile_id,event_type,school_id) values(auth.uid(),'student_admitted',school);
  return jsonb_build_object('id',student.id,'admissionNumber',student.registration_number,'rollNumber','',
    'fullName',student.display_name,'classId',section.class_id,'className',class_name,
    'sectionId',section.id,'sectionName',section.name,'gender',student.gender,'dateOfBirth',student.date_of_birth,
    'guardianName',trim(p_input->>'guardianName'),'guardianPhone',trim(p_input->>'guardianPhone'),
    'guardianEmail',coalesce(trim(p_input->>'guardianEmail'),''),'status','active','admissionDate',school_today);
end;
$$;

-- Use the school's calendar date for collection and the receipt year.
create or replace function public.collect_fee_payment_atomic(
  p_student_id uuid, p_invoice_id uuid, p_amount_paise bigint,
  p_payment_method text, p_transaction_reference text, p_idempotency_key text,
  p_notes text default null, p_school_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid := public.current_school_id();
  v_role text := public.current_active_role();
  v_invoice public.fee_invoices%rowtype;
  v_payment public.fee_payments%rowtype;
  v_paid bigint;
  v_payment_date date;
begin
  if auth.uid() is null or v_school is null or v_role is null
     or v_role not in ('admin', 'accountant')
     or (p_school_id is not null and p_school_id is distinct from v_school)
     or not exists (
       select 1 from public.role_contexts c join public.user_roles m on m.id = c.assignment_id
       where c.id = (auth.jwt()->>'session_id')::uuid and c.profile_id = auth.uid()
         and c.school_id = v_school and m.school_id = v_school
         and m.profile_id = auth.uid() and m.role_code = v_role
         and m.membership_status = 'active' and m.valid_from <= now()
         and (m.valid_until is null or m.valid_until > now())
         and 'payments.record' = any(m.permissions)
     ) then
    raise exception 'Payment collection not authorized' using errcode = '42501';
  end if;
  if p_student_id is null or p_invoice_id is null or p_amount_paise is null or p_amount_paise <= 0
     or p_payment_method is null or p_payment_method not in ('cash','upi','card','bank_transfer','cheque')
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128
     or p_transaction_reference is null or length(p_transaction_reference) not between 1 and 100
     or length(p_notes) > 2000 then
    raise exception 'Invalid payment input' using errcode = '22023';
  end if;
  -- Serialize retries before reading the idempotency record, including different invoices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key, 0));
  select * into v_payment from public.fee_payments where idempotency_key = p_idempotency_key;
  if found then
    if v_payment.school_id is distinct from v_school
       or v_payment.student_id is distinct from p_student_id
       or v_payment.invoice_id is distinct from p_invoice_id
       or v_payment.amount_paise is distinct from p_amount_paise
       or v_payment.payment_method is distinct from p_payment_method
       or v_payment.transaction_reference is distinct from p_transaction_reference
       or v_payment.notes is distinct from p_notes or v_payment.status <> 'settled' then
      raise exception 'Payment request conflict' using errcode = '23505';
    end if;
    return jsonb_build_object('status','idempotent_duplicate','payment_id',v_payment.id,
      'receipt_number',v_payment.receipt_number,'amount_paise',v_payment.amount_paise,'payment_status',v_payment.status);
  end if;
  select * into v_invoice from public.fee_invoices
    where id = p_invoice_id and student_id = p_student_id and school_id = v_school for update;
  if not found then
    raise exception 'Invoice unavailable' using errcode = '42501';
  end if;
  if p_amount_paise > v_invoice.amount_paise - v_invoice.paid_paise then
    raise exception 'Amount exceeds outstanding balance' using errcode = '22003';
  end if;
  v_payment_date := public.school_local_date(v_school);
  insert into public.fee_payments (school_id,student_id,invoice_id,receipt_number,amount_paise,
    payment_method,transaction_reference,notes,idempotency_key,status,collected_by_profile_id,payment_date)
  values (v_school,p_student_id,p_invoice_id,
    'REC-' || to_char(v_payment_date,'YYYY') || '-' || nextval('public.fee_payments_receipt_seq'::regclass)::text,
    p_amount_paise,p_payment_method,p_transaction_reference,p_notes,p_idempotency_key,'settled',auth.uid(),v_payment_date)
  returning * into v_payment;
  v_paid := v_invoice.paid_paise + p_amount_paise;
  update public.fee_invoices set paid_paise = v_paid,
    status = case when v_paid = amount_paise then 'paid' else 'partial' end
    where id = p_invoice_id and school_id = v_school;
  insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id)
    select auth.uid(),s.profile_id,'fee_payment_collected',v_school from public.students s
    where s.id = p_student_id and s.school_id = v_school;
  return jsonb_build_object('status','settled','payment_id',v_payment.id,
    'receipt_number',v_payment.receipt_number,'amount_paise',p_amount_paise,'new_paid_paise',v_paid,
    'remaining_balance_paise',v_invoice.amount_paise-v_paid,
    'invoice_status',case when v_paid = v_invoice.amount_paise then 'paid' else 'partial' end);
end;
$$;

commit;
