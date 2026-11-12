-- Review/test on an approved isolated target before release. No portal grants added.
begin;
create or replace function public.current_active_role() returns text
language sql stable security definer set search_path = '' as $$
  select rc.role_code
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = rc.profile_id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where public.current_school_id() = rc.school_id
    and m.valid_from <= now()
    and rc.id::text = auth.jwt()->>'session_id'
    and rc.profile_id = auth.uid()
    and rc.revoked_at is null
    and rc.expires_at > now()
    and p.account_status = 'active'
    and p.credential_reset_required = false
    and p.authorization_version = rc.authorization_version
    and m.membership_status = 'active'
    and (m.valid_until is null or m.valid_until > now())
    and s.status = 'active'
    -- Mandatory MFA check for School Admin
    and (
      rc.role_code <> 'admin'
      or (
        auth.jwt()->>'aal' = 'aal2'
        and exists (
          select 1 from auth.mfa_factors f
          where f.user_id = auth.uid()
            and f.status = 'verified'
            and f.factor_type = 'totp'
        )
        and exists (
          select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
          where a->>'method' = 'totp'
        )
      )
    )
  limit 1;
$$;

create or replace function public.current_role_has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_school_id() is not null and exists (
    select 1 from public.role_contexts c join public.user_roles m on m.id = c.assignment_id
    where c.id::text = auth.jwt()->>'session_id' and c.profile_id = auth.uid()
      and c.school_id = public.current_school_id() and m.school_id = c.school_id
      and m.profile_id = c.profile_id and m.role_code = c.role_code
      and m.membership_status = 'active' and m.valid_from <= now()
      and (m.valid_until is null or m.valid_until > now())
      and p_permission = any(m.permissions)
      and (p_permission not like 'security.%' and p_permission not in ('reports.export','marks.publish')
        or (auth.jwt()->>'aal' = 'aal2' and exists (
          select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) amr
          where amr->>'method' = 'password'
            and (amr->>'timestamp')::numeric between extract(epoch from now())-600 and extract(epoch from now()))))
      and case m.role_code
        when 'admin' then p_permission not like 'children.%'
          and (p_permission not like 'dashboard.%' or p_permission = 'dashboard.admin.view')
        when 'teacher' then p_permission = any(array['dashboard.teacher.view','students.read','attendance.read','attendance.write','homework.read','homework.write','marks.read','marks.write','reports.read','announcements.read','announcements.write','documents.read'])
        when 'accountant' then p_permission = any(array['dashboard.accountant.view','fees.read','fees.write','payments.read','payments.record','expenses.read','expenses.write','receipts.read','reports.read','reports.export','announcements.read','documents.read','audit.read'])
        when 'student' then p_permission = any(array['dashboard.student.view','students.read','attendance.read','homework.read','homework.write','marks.read','announcements.read','documents.read'])
        when 'parent' then p_permission = any(array['dashboard.parent.view','children.academics.read','children.fees.read','announcements.read','documents.read','receipts.read'])
        else false end
  )
$$;
revoke all on function public.current_role_has_permission(text) from public, anon;
grant execute on function public.current_role_has_permission(text) to authenticated;

create function public.staff_section_access(p_section uuid, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_role_has_permission(p_permission) and exists (
    select 1 from public.sections s where s.id = p_section and s.school_id = public.current_school_id()
    and (public.current_active_role() = 'admin' or
      (public.current_active_role() = 'teacher' and exists (
        select 1 from public.teacher_assignments a where a.section_id = s.id
        and a.academic_year_id = s.academic_year_id and a.school_id = s.school_id
        and a.teacher_profile_id = auth.uid() and a.valid_from <= current_date
        and (a.valid_until is null or a.valid_until >= current_date)))))
$$;
revoke all on function public.staff_section_access(uuid,text) from public, anon;
grant execute on function public.staff_section_access(uuid,text) to authenticated;

create function public.staff_enrollment_access(p_student uuid, p_section uuid, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.staff_section_access(p_section,p_permission) and exists (
    select 1 from public.enrollments e where e.student_id = p_student and e.section_id = p_section
      and e.school_id = public.current_school_id() and e.valid_from <= current_date
      and (e.valid_until is null or e.valid_until >= current_date))
$$;
revoke all on function public.staff_enrollment_access(uuid,uuid,text) from public, anon;
grant execute on function public.staff_enrollment_access(uuid,uuid,text) to authenticated;

drop policy students_staff_scoped on public.students;
create policy students_teacher_assigned on public.students for select to authenticated using (
  school_id = public.current_school_id() and public.current_active_role() = 'teacher'
  and exists (select 1 from public.enrollments e where e.student_id = students.id
    and public.staff_enrollment_access(students.id,e.section_id,'students.read')));

-- Restrictive policies intersect existing permissive policies rather than widening them.
create policy attendance_staff_permission on public.attendance_records as restrictive for all to authenticated
using (public.current_active_role() not in ('admin','teacher') or
  public.staff_enrollment_access(student_id,section_id,'attendance.read'))
with check (recorded_by_profile_id = auth.uid() and public.staff_enrollment_access(student_id,section_id,'attendance.write')
  and (public.current_active_role() = 'admin' or attendance_date = current_date));

create policy classes_staff_permission on public.classes as restrictive for all to authenticated
using (public.current_active_role() not in ('admin','teacher','accountant') or
  public.current_role_has_permission('academics.manage') or public.current_role_has_permission('students.read'))
with check (public.current_role_has_permission('academics.manage'));
create policy sections_staff_permission on public.sections as restrictive for all to authenticated
using (public.current_active_role() not in ('admin','teacher','accountant') or
  public.current_role_has_permission('academics.manage') or public.current_role_has_permission('students.read'))
with check (public.current_role_has_permission('academics.manage'));
create policy students_admin_permission on public.students as restrictive for all to authenticated
using (public.current_active_role() <> 'admin' or public.current_role_has_permission('students.read'))
with check (public.current_active_role() = 'admin' and public.current_role_has_permission('admissions.write'));

create policy invoices_staff_permission on public.fee_invoices as restrictive for select to authenticated
using (public.current_active_role() not in ('admin','accountant') or public.current_role_has_permission('fees.read'));
create policy payments_staff_permission on public.fee_payments as restrictive for select to authenticated
using (public.current_active_role() not in ('admin','accountant') or public.current_role_has_permission('payments.read') or public.current_role_has_permission('receipts.read'));
create policy expenses_staff_permission on public.operating_expenses as restrictive for select to authenticated
using (public.current_role_has_permission('expenses.read'));

create policy staff_directory_read on public.staff_profiles for select to authenticated
using (school_id = public.current_school_id() and public.current_role_has_permission('staff.read'));
create policy enrollment_staff_read on public.enrollments for select to authenticated
using (school_id = public.current_school_id() and public.staff_section_access(section_id,'students.read'));
create policy assignment_staff_read on public.teacher_assignments for select to authenticated
using (school_id = public.current_school_id() and
  (public.current_role_has_permission('academics.manage') or (teacher_profile_id = auth.uid()
   and public.current_active_role() = 'teacher' and valid_from <= current_date
   and (valid_until is null or valid_until >= current_date))));
create policy audit_staff_read on public.audit_events for select to authenticated
using (school_id = public.current_school_id() and public.current_role_has_permission('audit.read'));
create policy homework_staff_read on public.homework_assignments for select to authenticated
using (school_id = public.current_school_id() and public.staff_section_access(section_id,'homework.read'));
create policy homework_staff_insert on public.homework_assignments for insert to authenticated
with check (school_id = public.current_school_id() and teacher_profile_id = auth.uid()
  and public.staff_section_access(section_id,'homework.write'));
create policy timetable_staff_read on public.timetable_slots for select to authenticated
using (school_id = public.current_school_id() and
  (public.current_role_has_permission('academics.manage') or public.staff_section_access(section_id,'students.read')));
create policy marks_staff_read on public.marks_sheets for select to authenticated
using (school_id = public.current_school_id() and public.staff_section_access(section_id,'marks.read'));
create policy marks_entries_staff_read on public.marks_entries for select to authenticated
using (school_id = public.current_school_id() and exists (
  select 1 from public.marks_sheets m where m.id = marks_sheet_id and m.school_id = marks_entries.school_id
  and public.staff_enrollment_access(student_id,m.section_id,'marks.read')));
create policy fee_structures_staff_read on public.fee_structures for select to authenticated
using (school_id = public.current_school_id() and public.current_role_has_permission('fees.read'));
create policy announcements_staff_read on public.announcements for select to authenticated
using (school_id = public.current_school_id() and public.current_active_role() in ('admin','teacher','accountant')
  and public.current_role_has_permission('announcements.read') and target_audience in ('all','staff')
  and published_at <= now() and (expires_at is null or expires_at > now()));
commit;
