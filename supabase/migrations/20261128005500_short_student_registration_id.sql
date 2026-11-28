-- Migration 055: 8-digit YYYYNNNN Student Registration IDs + Legacy Aliases
-- Safe, transactional, idempotent migration preserving all UUID PKs/FKs, PINs,
-- guardian links, enrollments, attendance, marks, fees, receipts, and audit history.

begin;

create table if not exists public.student_registration_sequences (
  school_id uuid not null references public.schools(id) on delete cascade,
  admission_year integer not null check (admission_year between 2000 and 2099),
  last_sequence integer not null default 0 check (last_sequence >= 0 and last_sequence <= 9999),
  updated_at timestamptz not null default now(),
  primary key (school_id, admission_year)
);

alter table public.student_registration_sequences enable row level security;
alter table public.student_registration_sequences force row level security;
revoke all on table public.student_registration_sequences from public, anon, authenticated, service_role;

create table if not exists public.student_registration_aliases (
  school_id uuid not null,
  student_id uuid not null,
  legacy_registration_number text collate "C" not null check (
    length(legacy_registration_number) between 1 and 128
    and legacy_registration_number !~ '[[:cntrl:]]'
  ),
  created_at timestamptz not null default now(),
  primary key (school_id, legacy_registration_number),
  foreign key (student_id, school_id) references public.students(id, school_id) on delete cascade
);

create index if not exists student_registration_aliases_student_idx
  on public.student_registration_aliases (student_id, school_id);

alter table public.student_registration_aliases enable row level security;
alter table public.student_registration_aliases force row level security;
revoke all on table public.student_registration_aliases from public, anon, authenticated, service_role;
grant select on table public.student_registration_aliases to authenticated;

drop policy if exists student_registration_aliases_admin_read on public.student_registration_aliases;
create policy student_registration_aliases_admin_read
  on public.student_registration_aliases
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
    and public.staff_session_is_live()
    and public.current_role_has_permission('students.read')
  );

create or replace function app_private.next_student_registration_number(
  p_school uuid,
  p_year integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  seq_row public.student_registration_sequences%rowtype;
  max_existing integer := 0;
  year_prefix text;
  next_seq integer;
  candidate text;
begin
  if p_school is null or p_year is null or p_year not between 2000 and 2099 then
    raise exception 'Invalid school or admission year' using errcode = '22023';
  end if;

  year_prefix := to_char(p_year, 'FM0000');
  perform pg_advisory_xact_lock(hashtextextended('student-reg-seq:' || p_school::text || ':' || year_prefix, 0));

  select * into seq_row
  from public.student_registration_sequences s
  where s.school_id = p_school and s.admission_year = p_year
  for update;

  select coalesce(max(substring(st.registration_number from 5 for 4)::integer), 0)
    into max_existing
  from public.students st
  where st.school_id = p_school
    and st.registration_number ~ ('^' || year_prefix || '[0-9]{4}$');

  next_seq := greatest(coalesce(seq_row.last_sequence, 0), max_existing);

  loop
    next_seq := next_seq + 1;
    if next_seq > 9999 then
      raise exception 'Annual student registration sequence exhausted for school % and year %', p_school, p_year
        using errcode = '22003';
    end if;

    candidate := year_prefix || to_char(next_seq, 'FM0000');

    exit when not exists (
      select 1 from public.students st
      where st.school_id = p_school
        and upper(btrim(st.registration_number)) = candidate
    ) and not exists (
      select 1 from public.student_registration_aliases a
      where a.school_id = p_school
        and upper(btrim(a.legacy_registration_number)) = candidate
    );
  end loop;

  insert into public.student_registration_sequences (school_id, admission_year, last_sequence, updated_at)
  values (p_school, p_year, next_seq, now())
  on conflict (school_id, admission_year) do update set
    last_sequence = excluded.last_sequence,
    updated_at = now();

  return candidate;
end;
$$;

alter function app_private.next_student_registration_number(uuid, integer) owner to postgres;
revoke all on function app_private.next_student_registration_number(uuid, integer) from public, anon, authenticated, service_role;

-- Backfill existing students without 8-digit YYYYNNNN IDs deterministically
do $$
declare
  rec record;
  new_reg text;
begin
  for rec in
    select
      s.id as student_id,
      s.school_id,
      s.registration_number as old_reg,
      coalesce(
        (
          select extract(year from min(e.valid_from))::integer
          from public.enrollments e
          where e.student_id = s.id and e.school_id = s.school_id
        ),
        extract(year from current_date)::integer
      ) as admission_year,
      (
        select min(e.valid_from)
        from public.enrollments e
        where e.student_id = s.id and e.school_id = s.school_id
      ) as first_enrolled_at
    from public.students s
    where s.registration_number !~ '^[0-9]{8}$'
    order by s.school_id, admission_year, first_enrolled_at nulls last, s.display_name collate "C", s.id
  loop
    insert into public.student_registration_aliases (school_id, student_id, legacy_registration_number)
    values (rec.school_id, rec.student_id, rec.old_reg)
    on conflict (school_id, legacy_registration_number) do nothing;

    new_reg := app_private.next_student_registration_number(rec.school_id, rec.admission_year);

    update public.students
    set registration_number = new_reg
    where id = rec.student_id and school_id = rec.school_id;
  end loop;
end;
$$;

-- Update atomic student admission RPC to generate YYYYNNNN IDs
create or replace function public.admit_student_atomic(p_input jsonb, p_school_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  section public.sections%rowtype;
  student public.students%rowtype;
  guardian uuid;
  class_name text;
  admission_year integer;
  new_reg text;
begin
  if school is null or public.current_active_role() is distinct from 'admin'
     or public.current_role_has_permission('admissions.write') is not true
     or (p_school_id is not null and p_school_id is distinct from school) then
    raise exception 'Admission not authorized' using errcode = '42501';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object'
     or coalesce(length(trim(p_input->>'fullName')),0) not between 1 and 160
     or coalesce(length(trim(p_input->>'guardianName')),0) not between 1 and 160
     or coalesce(length(trim(p_input->>'guardianPhone')),0) not between 3 and 40
     or coalesce(length(p_input->>'guardianEmail'),0) > 254
     or coalesce(p_input->>'gender','') not in ('male','female','other')
     or p_input->>'dateOfBirth' is null or (p_input->>'dateOfBirth')::date > current_date then
    raise exception 'Invalid admission input' using errcode = '22023';
  end if;
  select * into section from public.sections where id = (p_input->>'sectionId')::uuid
    and class_id = (p_input->>'classId')::uuid and school_id = school for share;
  if not found then raise exception 'Section unavailable' using errcode = '42501'; end if;
  select name into class_name from public.classes where id = section.class_id and school_id = school;

  admission_year := extract(year from current_date)::integer;
  new_reg := app_private.next_student_registration_number(school, admission_year);

  insert into public.students(school_id,registration_number,display_name,date_of_birth,gender,enrollment_status,portal_access_status)
  values(school,new_reg,trim(p_input->>'fullName'),(p_input->>'dateOfBirth')::date,
    p_input->>'gender','active','pending_activation') returning * into student;
  insert into public.enrollments(school_id,student_id,academic_year_id,section_id,valid_from)
    values(school,student.id,section.academic_year_id,section.id,current_date);
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
    'guardianEmail',coalesce(trim(p_input->>'guardianEmail'),''),'status','active','admissionDate',current_date);
end;
$$;

-- Update Student PIN attempt lookup to support both 8-digit registration IDs and legacy aliases
create or replace function public.begin_student_pin_attempt(p_school text, p_registration text)
returns table (profile_id uuid, student_id uuid, school_id uuid, email text,
               pin_hash text, salt text, credential_version integer)
language plpgsql security definer set search_path = '' as $$
declare
  attempt_key text;
  attempts public.auth_rate_limits%rowtype;
begin
  if p_school is null or p_registration is null or p_school !~ '^[A-Z0-9_-]{3,20}$'
     or char_length(p_registration) not between 1 and 80 then return; end if;

  attempt_key := 'student-pin:' || encode(sha256(convert_to(
    jsonb_build_array(p_school, p_registration)::text, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(attempt_key, 0));
  select * into attempts from public.auth_rate_limits a where a.key = attempt_key for update;
  if attempts.locked_until > now() then return; end if;
  if attempts.first_attempt_at <= now() - interval '15 minutes'
     or attempts.locked_until <= now() then
    delete from public.auth_rate_limits a where a.key = attempt_key;
  end if;
  insert into public.auth_rate_limits as a (key, bucket)
    values (attempt_key, 'student-pin')
    on conflict (key) do update set attempt_count = a.attempt_count + 1,
      last_attempt_at = now(),
      locked_until = case when a.attempt_count + 1 >= 5 then now() + interval '15 minutes' end;

  return query
    select s.profile_id, s.id, s.school_id, u.email::text, c.pin_hash, c.salt, c.credential_version
    from public.students s
    join public.schools sc on sc.id = s.school_id
    join public.profiles p on p.id = s.profile_id
    join auth.users u on u.id = s.profile_id
    join public.pin_credentials c on c.student_id = s.id and c.school_id = s.school_id
      and c.profile_id = s.profile_id and c.credential_namespace = 'student'
    where upper(sc.code) = p_school
      and (
        upper(btrim(s.registration_number)) = p_registration
        or exists (
          select 1 from public.student_registration_aliases a
          where a.student_id = s.id
            and a.school_id = s.school_id
            and upper(btrim(a.legacy_registration_number)) = p_registration
        )
      )
      and not exists (
        select 1 from public.students duplicate
        where duplicate.school_id = sc.id
          and duplicate.id <> s.id
          and (
            upper(btrim(duplicate.registration_number)) = p_registration
            or exists (
              select 1 from public.student_registration_aliases da
              where da.student_id = duplicate.id
                and da.school_id = duplicate.school_id
                and upper(btrim(da.legacy_registration_number)) = p_registration
            )
          )
      )
      and not exists (
        select 1 from public.schools duplicate where upper(duplicate.code) = p_school and duplicate.id <> sc.id
      )
      and sc.status = 'active' and s.enrollment_status = 'active' and s.portal_access_status = 'active'
      and p.account_status = 'active' and not p.credential_reset_required
      and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())
      and c.status = 'active' and c.algorithm = 'pbkdf2-sha256' and c.iterations = 100000
      and (c.expires_at is null or c.expires_at > now())
      and (c.locked_until is null or c.locked_until <= now())
      and exists (
        select 1 from public.user_roles r where r.school_id = s.school_id and r.profile_id = s.profile_id
          and r.role_code = 'student' and 'dashboard.student.view' = any(r.permissions)
          and r.membership_status = 'active' and r.valid_from <= now()
          and (r.valid_until is null or r.valid_until > now())
      )
      and not exists (
        select 1 from public.user_roles r where r.profile_id = s.profile_id
          and r.role_code <> 'student' and r.membership_status = 'active' and r.valid_from <= now()
          and (r.valid_until is null or r.valid_until > now())
      );
end;
$$;

create or replace function public.list_accountant_fee_students(
  p_school uuid,
  p_student_ids uuid[]
)
returns table (id uuid, school_id uuid, display_name text, registration_number text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.school_id, s.display_name, s.registration_number
  from public.students s
  where p_school is not null
    and s.school_id = p_school
    and p_school = public.current_school_id()
    and public.current_active_role() in ('accountant', 'admin')
    and public.staff_session_is_live() is true
    and (
      public.current_role_has_permission('fees.read')
      or public.current_role_has_permission('payments.read')
      or public.current_role_has_permission('receipts.read')
    )
    and p_student_ids is not null
    and s.id = any(p_student_ids);
$$;

alter function public.list_accountant_fee_students(uuid, uuid[]) owner to postgres;
revoke all on function public.list_accountant_fee_students(uuid, uuid[]) from public, anon, service_role;
grant execute on function public.list_accountant_fee_students(uuid, uuid[]) to authenticated;

commit;
