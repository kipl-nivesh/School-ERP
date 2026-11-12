begin;
-- Admission/identity lifecycle commands own multi-record mutations.
revoke insert, update, delete on public.students, public.enrollments from public,anon,authenticated;
-- School-owned contact drafts never establish a verified guardian identity.
create table public.admission_guardian_contacts (
  student_id uuid primary key, school_id uuid not null,
  guardian_name text not null check (length(guardian_name) between 1 and 160),
  phone text not null check (length(phone) between 3 and 40),
  email text not null check (length(email) <= 254),
  foreign key (student_id,school_id) references public.students(id,school_id)
);
alter table public.admission_guardian_contacts enable row level security;
alter table public.admission_guardian_contacts force row level security;
revoke all on public.admission_guardian_contacts from public,anon,authenticated;
grant select on public.admission_guardian_contacts to authenticated;
create policy admission_contacts_admin_read on public.admission_guardian_contacts for select to authenticated
using (school_id = public.current_school_id() and public.current_active_role() = 'admin'
  and public.current_role_has_permission('admissions.read'));

create function public.admit_student_atomic(p_input jsonb, p_school_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  school uuid := public.current_school_id();
  section public.sections%rowtype;
  student public.students%rowtype;
  guardian uuid;
  class_name text;
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
  insert into public.students(school_id,registration_number,display_name,date_of_birth,gender,enrollment_status,portal_access_status)
  values(school,'BC-'||gen_random_uuid()::text,trim(p_input->>'fullName'),(p_input->>'dateOfBirth')::date,
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
revoke all on function public.admit_student_atomic(jsonb,uuid) from public,anon,service_role;
grant execute on function public.admit_student_atomic(jsonb,uuid) to authenticated;
commit;
