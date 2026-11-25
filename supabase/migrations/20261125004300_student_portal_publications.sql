begin;

-- Keep caller RLS in force while avoiding planner expansion of Student-only
-- policies through enrollment, profile and published-sheet policies.
create function public.student_owns_portal_record(p_school uuid, p_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.read_student_portal_identity() me
    where me.school_id=p_school and me.student_id=p_student
  );
$$;

create function public.student_has_published_sheet(p_school uuid, p_sheet uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.read_student_portal_identity() me
    join public.enrollments e on e.student_id=me.student_id and e.school_id=me.school_id
    join public.marks_sheets ms on ms.section_id=e.section_id and ms.school_id=e.school_id
    where me.school_id=p_school and ms.id=p_sheet and ms.is_published is true
  );
$$;

alter function public.student_owns_portal_record(uuid,uuid) owner to postgres;
alter function public.student_has_published_sheet(uuid,uuid) owner to postgres;
revoke all on function public.student_owns_portal_record(uuid,uuid),
  public.student_has_published_sheet(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.student_owns_portal_record(uuid,uuid),
  public.student_has_published_sheet(uuid,uuid) to authenticated;

alter policy enrollments_student_read on public.enrollments
  using (public.student_owns_portal_record(school_id,student_id));
alter policy attendance_student_read on public.attendance_records
  using (public.student_owns_portal_record(school_id,student_id));
alter policy invoices_student_read on public.fee_invoices
  using (public.student_owns_portal_record(school_id,student_id));
alter policy payments_student_read on public.fee_payments
  using (public.student_owns_portal_record(school_id,student_id));
alter policy marks_sheets_student_read on public.marks_sheets
  using (is_published is true and public.student_has_published_sheet(school_id,id));
alter policy marks_student_read on public.marks_entries
  using (public.student_owns_portal_record(school_id,student_id)
    and public.student_has_published_sheet(school_id,marks_sheet_id));
alter policy homework_student_read on public.homework_assignments
  using (status='active' and public.student_current_section_access(school_id,section_id));
alter policy timetable_student_read on public.timetable_slots
  using (public.student_current_section_access(school_id,section_id));

-- Publication of a schedule never grants access to a marks sheet or result.
create table public.student_exam_schedule (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  section_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 160),
  subject_code text not null check (length(btrim(subject_code)) between 1 and 30),
  exam_date date not null,
  starts_at time,
  ends_at time,
  venue text check (length(venue) <= 160),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  updated_at timestamptz not null default now(),
  foreign key (section_id,school_id) references public.sections(id,school_id),
  check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);

-- Plain-text content is stored as a school record and never interpreted as HTML.
-- Audience identifiers are tenant-scoped foreign keys.
create table public.student_portal_materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  section_id uuid,
  class_id uuid,
  student_id uuid,
  audience text not null check (audience in ('school','class','section','student')),
  kind text not null check (kind in ('document','study_material')),
  title text not null check (length(btrim(title)) between 1 and 160),
  content text not null check (length(btrim(content)) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  updated_at timestamptz not null default now(),
  foreign key (section_id,school_id) references public.sections(id,school_id),
  foreign key (student_id,school_id) references public.students(id,school_id),
  foreign key (class_id,school_id) references public.classes(id,school_id),
  check ((audience='school' and class_id is null and section_id is null and student_id is null) or
    (audience='class' and class_id is not null and section_id is null and student_id is null) or
    (audience='section' and class_id is null and section_id is not null and student_id is null) or
    (audience='student' and class_id is null and section_id is null and student_id is not null))
);

create index student_exam_schedule_school_section_date_idx
  on public.student_exam_schedule(school_id,section_id,exam_date);
create index student_materials_school_updated_idx
  on public.student_portal_materials(school_id,updated_at desc);

alter table public.student_exam_schedule enable row level security;
alter table public.student_exam_schedule force row level security;
alter table public.student_portal_materials enable row level security;
alter table public.student_portal_materials force row level security;
revoke all on public.student_exam_schedule,public.student_portal_materials from public,anon,authenticated,service_role;
grant select on public.student_exam_schedule,public.student_portal_materials to authenticated;

create policy student_exam_schedule_admin_read on public.student_exam_schedule for select to authenticated
using (school_id=public.current_school_id() and public.current_active_role()='admin'
  and public.current_role_has_permission('marks.publish'));
create policy student_exam_schedule_published_read on public.student_exam_schedule for select to authenticated
using (status='published' and public.current_active_role()='student'
  and public.student_current_section_access(school_id,section_id));

create function public.student_current_class_access(p_school uuid, p_class uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.sections s where s.school_id=p_school and s.class_id=p_class
    and public.student_current_section_access(p_school,s.id));
$$;
alter function public.student_current_class_access(uuid,uuid) owner to postgres;
revoke all on function public.student_current_class_access(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.student_current_class_access(uuid,uuid) to authenticated;

create policy student_materials_admin_read on public.student_portal_materials for select to authenticated
using (school_id=public.current_school_id() and public.current_active_role()='admin'
  and public.current_role_has_permission('academics.manage') and public.current_role_has_permission('documents.read'));
create policy student_materials_published_read on public.student_portal_materials for select to authenticated
using (status='published' and public.current_active_role()='student' and school_id=public.current_school_id()
  and exists (select 1 from public.read_student_portal_identity() me where me.school_id=student_portal_materials.school_id
    and (audience='school' or (audience='student' and me.student_id=student_portal_materials.student_id)
      or (audience='class' and public.student_current_class_access(student_portal_materials.school_id,student_portal_materials.class_id))
      or (audience='section' and public.student_current_section_access(student_portal_materials.school_id,student_portal_materials.section_id)))));

create function public.manage_student_exam_schedule(p_school uuid, p_id uuid, p_section uuid,
  p_title text, p_subject text, p_date date, p_start time, p_end time, p_venue text, p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_school is null or p_school is distinct from public.current_school_id()
    or public.current_active_role() is distinct from 'admin' or public.staff_session_is_live() is not true
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.current_role_has_permission('marks.publish') is not true
    or app_private.accountant_export_mfa_is_fresh() is not true
    or p_status is null or p_status not in ('draft','published','archived')
    or (p_id is null and p_status='archived') then return false; end if;

  if p_status='archived' then
    update public.student_exam_schedule set status='archived', updated_at=now()
      where id=p_id and school_id=p_school and status<>'archived';
  elsif p_id is not null then
    update public.student_exam_schedule set status=p_status, updated_at=now()
      where id=p_id and school_id=p_school and status<>'archived' and status<>p_status;
  else
    perform 1 from public.sections where id=p_section and school_id=p_school for key share;
    if not found then return false; end if;
    insert into public.student_exam_schedule(school_id,section_id,title,subject_code,exam_date,starts_at,ends_at,venue,status)
    values(p_school,p_section,btrim(p_title),btrim(p_subject),p_date,p_start,p_end,nullif(btrim(p_venue),''),p_status)
    returning id into p_id;
  end if;
  if not found then return false; end if;
  insert into public.audit_events(actor_profile_id,school_id,event_type,details)
  values(auth.uid(),p_school,'student_exam_schedule_changed',jsonb_build_object('schedule_id',p_id,'status',p_status));
  return true;
end;
$$;

create function public.manage_student_portal_material(p_school uuid, p_id uuid, p_section uuid, p_class uuid,
  p_registration text, p_audience text, p_kind text, p_title text, p_content text, p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if p_school is null or p_school is distinct from public.current_school_id()
    or public.current_active_role() is distinct from 'admin' or public.staff_session_is_live() is not true
    or auth.jwt()->>'aal' is distinct from 'aal2'
    or public.current_role_has_permission('academics.manage') is not true
    or public.current_role_has_permission('documents.read') is not true
    or p_status is null or p_status not in ('draft','published','archived')
    or (p_id is null and p_status='archived') then return false; end if;

  if p_id is not null then
    update public.student_portal_materials set status=p_status, updated_at=now()
      where id=p_id and school_id=p_school and status<>'archived' and status<>p_status;
  else
    if p_audience is null or p_audience not in ('school','class','section','student') then return false; end if;
    if p_audience='student' then
      select s.id into target from public.students s where s.school_id=p_school
        and upper(btrim(s.registration_number))=upper(btrim(p_registration))
        and not exists (select 1 from public.students other where other.school_id=s.school_id
          and upper(btrim(other.registration_number))=upper(btrim(p_registration)) and other.id<>s.id)
        for key share;
      if not found then return false; end if;
    elsif p_audience='class' then
      perform 1 from public.classes where id=p_class and school_id=p_school for key share;
      if not found then return false; end if;
    elsif p_audience='section' then
      perform 1 from public.sections where id=p_section and school_id=p_school for key share;
      if not found then return false; end if;
    end if;
    insert into public.student_portal_materials(school_id,section_id,class_id,student_id,audience,kind,title,content,status)
    values(p_school,case when p_audience='section' then p_section end,
      case when p_audience='class' then p_class end,target,p_audience,p_kind,
      btrim(p_title),btrim(p_content),p_status) returning id into p_id;
  end if;
  if not found then return false; end if;
  insert into public.audit_events(actor_profile_id,school_id,event_type,details)
  values(auth.uid(),p_school,'student_portal_material_changed',jsonb_build_object('material_id',p_id,'status',p_status));
  return true;
end;
$$;

alter function public.manage_student_exam_schedule(uuid,uuid,uuid,text,text,date,time,time,text,text) owner to postgres;
alter function public.manage_student_portal_material(uuid,uuid,uuid,uuid,text,text,text,text,text,text) owner to postgres;
revoke all on function public.manage_student_exam_schedule(uuid,uuid,uuid,text,text,date,time,time,text,text),
  public.manage_student_portal_material(uuid,uuid,uuid,uuid,text,text,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.manage_student_exam_schedule(uuid,uuid,uuid,text,text,date,time,time,text,text),
  public.manage_student_portal_material(uuid,uuid,uuid,uuid,text,text,text,text,text,text) to authenticated;

-- Student identity and PIN changes also verify the fresh native password and
-- TOTP evidence at the database boundary. Existing role and tenant checks
-- remain inside the original functions, which are moved out of the API.
alter function public.link_pending_student_identity(uuid,text) set schema app_private;
alter function public.manage_student_portal_pin(uuid,text,text,text) set schema app_private;
revoke all on function app_private.link_pending_student_identity(uuid,text),
  app_private.manage_student_portal_pin(uuid,text,text,text) from public,anon,authenticated,service_role;

create function public.link_pending_student_identity(p_student uuid, p_email text)
returns boolean language sql security definer set search_path='' as $$
  select case when app_private.accountant_export_mfa_is_fresh() then
    app_private.link_pending_student_identity(p_student,p_email) else false end;
$$;
create function public.manage_student_portal_pin(p_student uuid,p_intent text,p_hash text,p_salt text)
returns boolean language sql security definer set search_path='' as $$
  select case when app_private.accountant_export_mfa_is_fresh() then
    app_private.manage_student_portal_pin(p_student,p_intent,p_hash,p_salt) else false end;
$$;
alter function public.link_pending_student_identity(uuid,text) owner to postgres;
alter function public.manage_student_portal_pin(uuid,text,text,text) owner to postgres;
revoke all on function public.link_pending_student_identity(uuid,text),
  public.manage_student_portal_pin(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.link_pending_student_identity(uuid,text),
  public.manage_student_portal_pin(uuid,text,text,text) to authenticated;

commit;
