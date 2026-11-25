begin;

-- ============================================================================
-- MIGRATION 046: Consolidated Student Dashboard Performance Resolution
-- Preserves FORCE RLS, native auth, session binding, credential version,
-- subscription entitlement, publication/audience gates, and tenant isolation.
-- ============================================================================

-- 1. Drop any residual legacy student policy superseded by migrations 042-045.
drop policy if exists fee_payments_student_scoped on public.fee_payments;

-- 2. Enable UUID primary-key index lookup on role_contexts(id) inside
--    current_school_id() and current_active_role() (matching migration 045).
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select rc.school_id
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = p.id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where rc.id = case
      when auth.jwt()->>'session_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (auth.jwt()->>'session_id')::uuid
    end
    and case when jsonb_typeof(auth.jwt()->'exp')='number'
      then (auth.jwt()->>'exp')::numeric > extract(epoch from now()) else false end
    and coalesce(auth.jwt()->>'recovery','false') <> 'true'
    and coalesce(auth.jwt()->>'type','') <> 'recovery'
    and not exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array'
        then auth.jwt()->'amr' else '[]'::jsonb end) a
      where a->>'method' in ('recovery','password_recovery','otp_recovery')
    )
    and p.id = auth.uid()
    and p.account_status = 'active'
    and not p.credential_reset_required
    and rc.revoked_at is null
    and rc.expires_at > now()
    and rc.authorization_version = p.authorization_version
    and m.membership_status = 'active'
    and m.valid_from <= now()
    and (m.valid_until is null or m.valid_until > now())
    and s.status = 'active'
    and (
      (
        rc.role_code in ('admin', 'teacher', 'accountant')
        and public.staff_session_is_live()
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
      )
      or (rc.role_code = 'student' and public.student_session_is_live())
      or (rc.role_code = 'parent' and public.parent_session_is_live())
    )
  limit 1;
$function$;

create or replace function public.current_active_role()
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select rc.role_code
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = rc.profile_id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where rc.id = case
      when auth.jwt()->>'session_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (auth.jwt()->>'session_id')::uuid
    end
    and rc.profile_id = auth.uid()
    and rc.revoked_at is null
    and rc.expires_at > now()
    and p.account_status = 'active'
    and not p.credential_reset_required
    and p.authorization_version = rc.authorization_version
    and m.membership_status = 'active'
    and m.valid_from <= now()
    and (m.valid_until is null or m.valid_until > now())
    and s.status = 'active'
    and (
      (rc.role_code in ('admin','teacher','accountant') and public.staff_session_is_live() and (
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
      ))
      or (rc.role_code = 'student' and public.student_session_is_live())
      or (rc.role_code = 'parent' and public.parent_session_is_live())
    )
  limit 1;
$function$;

-- 3. Statement-cached set-returning helpers built on read_student_portal_identity()
--    so PostgreSQL resolves Student section, class, and published marks sheets
--    once per statement instead of re-evaluating per candidate row.
create or replace function app_private.read_live_student_section()
returns table (school_id uuid, section_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  with me as (
    select i.school_id, i.student_id
    from public.read_student_portal_identity() i
  ),
  active_enr as (
    select e.school_id, e.section_id
    from me
    join public.enrollments e
      on e.student_id = me.student_id
     and e.school_id = me.school_id
    where e.valid_from <= current_date
      and (e.valid_until is null or e.valid_until >= current_date)
  )
  select a.school_id, a.section_id
  from active_enr a
  where (select count(*) from active_enr) = 1;
$function$;

create or replace function app_private.read_live_student_class()
returns table (school_id uuid, class_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  select sec.school_id, s.class_id
  from app_private.read_live_student_section() sec
  join public.sections s
    on s.id = sec.section_id
   and s.school_id = sec.school_id;
$function$;

create or replace function app_private.read_live_student_published_sheets()
returns table (school_id uuid, sheet_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  select ms.school_id, ms.id
  from app_private.read_live_student_section() sec
  join public.marks_sheets ms
    on ms.section_id = sec.section_id
   and ms.school_id = sec.school_id
  where ms.is_published is true;
$function$;

alter function app_private.read_live_student_section() owner to postgres;
alter function app_private.read_live_student_class() owner to postgres;
alter function app_private.read_live_student_published_sheets() owner to postgres;
revoke all on function app_private.read_live_student_section(),
  app_private.read_live_student_class(),
  app_private.read_live_student_published_sheets() from public, anon, authenticated, service_role;
grant execute on function app_private.read_live_student_section(),
  app_private.read_live_student_class(),
  app_private.read_live_student_published_sheets() to authenticated;

-- 4. Update Student RLS policies across all dashboard datasets to resolve
--    request-constant authorization checks once per statement (InitPlan) and
--    guard staff permissive policies so Student queries short-circuit immediately.

-- 4a. enrollments
alter policy enrollment_staff_read on public.enrollments using (
  (select public.current_active_role()) in ('admin'::text, 'teacher'::text, 'accountant'::text)
  and school_id = (select public.current_school_id())
  and public.staff_section_access(section_id, 'students.read'::text)
);

alter policy enrollments_parent_read on public.enrollments using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'parent'::text
  and public.parent_student_purpose(student_id, 'academic'::text)
);

-- 4b. sections, classes, academic_years
alter policy sections_tenant_scoped on public.sections using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text, 'student'::text, 'parent'::text])
);

alter policy sections_staff_permission on public.sections using (
  (select public.current_active_role()) <> all (array['admin'::text, 'teacher'::text, 'accountant'::text])
  or (select public.current_role_has_permission('academics.manage'::text))
  or (select public.current_role_has_permission('students.read'::text))
);

alter policy classes_tenant_scoped on public.classes using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text, 'student'::text, 'parent'::text])
);

alter policy classes_staff_permission on public.classes using (
  (select public.current_active_role()) <> all (array['admin'::text, 'teacher'::text, 'accountant'::text])
  or (select public.current_role_has_permission('academics.manage'::text))
  or (select public.current_role_has_permission('students.read'::text))
);

alter policy academic_years_tenant_scoped on public.academic_years using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text, 'student'::text, 'parent'::text])
);

-- 4c. attendance_records
alter policy attendance_student_read on public.attendance_records using (
  (school_id, student_id) in (
    select me.school_id, me.student_id from public.read_student_portal_identity() me
  )
);

alter policy attendance_subscription_gate on public.attendance_records using (
  (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text])
  or (
    (select public.current_active_role()) = 'student'::text
    and (school_id, student_id) in (
      select me.school_id, me.student_id from public.read_student_portal_identity() me
    )
  )
  or (
    (select public.current_active_role()) = 'parent'::text
    and public.portal_student_access(student_id)
  )
);

alter policy attendance_admin_scoped on public.attendance_records using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'admin'::text
);

alter policy attendance_teacher_scoped on public.attendance_records using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'teacher'::text
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.section_id = attendance_records.section_id
      and ta.school_id = (select public.current_school_id())
      and ta.teacher_profile_id = auth.uid()
  )
);

alter policy attendance_parent_scoped on public.attendance_records using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'parent'::text
  and exists (
    select 1 from public.student_guardian_relationships r
    join public.guardians g on g.id = r.guardian_id
    where r.student_id = attendance_records.student_id
      and r.school_id = (select public.current_school_id())
      and g.profile_id = auth.uid()
      and r.relationship_status = 'verified'::text
      and r.academic_access = true
  )
);

alter policy attendance_staff_permission on public.attendance_records using (
  (select public.current_active_role()) <> all (array['admin'::text, 'teacher'::text])
  or public.staff_enrollment_access(student_id, section_id, 'attendance.read'::text)
);

alter policy attendance_parent_purpose on public.attendance_records using (
  (select public.current_active_role()) <> 'parent'::text
  or public.parent_student_purpose(student_id, 'academic'::text)
);

-- 4d. fee_invoices
alter policy invoices_student_read on public.fee_invoices using (
  (school_id, student_id) in (
    select me.school_id, me.student_id from public.read_student_portal_identity() me
  )
);

alter policy invoices_subscription_gate on public.fee_invoices using (
  (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text])
  or (
    (select public.current_active_role()) = 'student'::text
    and (school_id, student_id) in (
      select me.school_id, me.student_id from public.read_student_portal_identity() me
    )
  )
  or (
    (select public.current_active_role()) = 'parent'::text
    and public.portal_student_access(student_id)
  )
);

alter policy fee_invoices_admin_accountant on public.fee_invoices using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = any (array['admin'::text, 'accountant'::text])
);

alter policy fee_invoices_parent_scoped on public.fee_invoices using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'parent'::text
  and exists (
    select 1 from public.student_guardian_relationships r
    join public.guardians g on g.id = r.guardian_id
    where r.student_id = fee_invoices.student_id
      and r.school_id = (select public.current_school_id())
      and g.profile_id = auth.uid()
      and r.relationship_status = 'verified'::text
      and r.fee_access = true
  )
);

alter policy invoices_parent_purpose on public.fee_invoices using (
  (select public.current_active_role()) <> 'parent'::text
  or public.parent_student_purpose(student_id, 'fee'::text)
);

-- 4e. fee_payments
alter policy payments_student_read on public.fee_payments using (
  (school_id, student_id) in (
    select me.school_id, me.student_id from public.read_student_portal_identity() me
  )
);

alter policy payments_subscription_gate on public.fee_payments using (
  (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text])
  or (
    (select public.current_active_role()) = 'student'::text
    and (school_id, student_id) in (
      select me.school_id, me.student_id from public.read_student_portal_identity() me
    )
  )
  or (
    (select public.current_active_role()) = 'parent'::text
    and public.portal_student_access(student_id)
  )
);

alter policy fee_payments_admin_accountant on public.fee_payments using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = any (array['admin'::text, 'accountant'::text])
);

alter policy fee_payments_parent_scoped on public.fee_payments using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'parent'::text
  and exists (
    select 1 from public.student_guardian_relationships r
    join public.guardians g on g.id = r.guardian_id
    where r.student_id = fee_payments.student_id
      and r.school_id = (select public.current_school_id())
      and g.profile_id = auth.uid()
      and r.relationship_status = 'verified'::text
      and r.fee_access = true
  )
);

alter policy payments_parent_purpose on public.fee_payments using (
  (select public.current_active_role()) <> 'parent'::text
  or public.parent_student_purpose(student_id, 'fee'::text)
);

-- 4f. marks_sheets & marks_entries
alter policy marks_sheets_student_read on public.marks_sheets using (
  is_published is true
  and (school_id, id) in (
    select ps.school_id, ps.sheet_id from app_private.read_live_student_published_sheets() ps
  )
);

alter policy marks_staff_read on public.marks_sheets using (
  (select public.current_active_role()) in ('admin'::text, 'teacher'::text, 'accountant'::text)
  and school_id = (select public.current_school_id())
  and public.staff_section_access(section_id, 'marks.read'::text)
);

alter policy marks_sheets_parent_read on public.marks_sheets using (
  (select public.current_active_role()) = 'parent'::text
  and school_id = (select public.current_school_id())
  and is_published = true
  and exists (
    select 1 from public.student_guardian_relationships sgr
    join public.guardians g on g.id = sgr.guardian_id
    join public.enrollments e on e.student_id = sgr.student_id
    where g.profile_id = auth.uid()
      and sgr.school_id = (select public.current_school_id())
      and sgr.relationship_status = 'verified'::text
      and sgr.academic_access = true
      and sgr.valid_from <= now()
      and (sgr.valid_until is null or sgr.valid_until > now())
      and e.section_id = marks_sheets.section_id
      and e.school_id = (select public.current_school_id())
  )
);

alter policy marks_student_read on public.marks_entries using (
  (school_id, student_id) in (
    select me.school_id, me.student_id from public.read_student_portal_identity() me
  )
  and (school_id, marks_sheet_id) in (
    select ps.school_id, ps.sheet_id from app_private.read_live_student_published_sheets() ps
  )
);

alter policy marks_subscription_gate on public.marks_entries using (
  (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text])
  or (
    (select public.current_active_role()) = 'student'::text
    and (school_id, student_id) in (
      select me.school_id, me.student_id from public.read_student_portal_identity() me
    )
  )
  or (
    (select public.current_active_role()) = 'parent'::text
    and public.portal_student_access(student_id)
  )
);

alter policy marks_entries_staff_read on public.marks_entries using (
  (select public.current_active_role()) in ('admin'::text, 'teacher'::text)
  and school_id = (select public.current_school_id())
  and app_private.marks_entry_staff_visible(marks_sheet_id, school_id, student_id)
);

alter policy marks_parent_read on public.marks_entries using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'parent'::text
  and public.parent_student_purpose(student_id, 'academic'::text)
  and exists (
    select 1 from public.marks_sheets ms
    where ms.id = marks_entries.marks_sheet_id
      and ms.school_id = marks_entries.school_id
      and ms.is_published = true
  )
);

alter policy marks_parent_purpose on public.marks_entries using (
  (select public.current_active_role()) <> 'parent'::text
  or public.parent_student_purpose(student_id, 'academic'::text)
);

-- 4g. timetable_slots
alter policy timetable_student_read on public.timetable_slots using (
  (school_id, section_id) in (
    select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
  )
);

alter policy student_current_timetable_section on public.timetable_slots using (
  (select public.current_active_role()) is distinct from 'student'::text
  or (school_id, section_id) in (
    select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
  )
);

alter policy timetable_staff_read on public.timetable_slots using (
  (select public.current_active_role()) in ('admin'::text, 'teacher'::text, 'accountant'::text)
  and school_id = (select public.current_school_id())
  and (
    (select public.current_role_has_permission('academics.manage'::text))
    or public.staff_section_access(section_id, 'students.read'::text)
  )
);

alter policy timetable_parent_read on public.timetable_slots using (
  (select public.current_active_role()) = 'parent'::text
  and school_id = (select public.current_school_id())
  and exists (
    select 1 from public.student_guardian_relationships sgr
    join public.guardians g on g.id = sgr.guardian_id
    join public.enrollments e on e.student_id = sgr.student_id
    where g.profile_id = auth.uid()
      and sgr.school_id = (select public.current_school_id())
      and sgr.relationship_status = 'verified'::text
      and sgr.academic_access = true
      and sgr.valid_from <= now()
      and (sgr.valid_until is null or sgr.valid_until > now())
      and e.section_id = timetable_slots.section_id
      and e.school_id = (select public.current_school_id())
  )
);

-- 4h. homework_assignments
alter policy homework_student_read on public.homework_assignments using (
  status = 'active'::text
  and (school_id, section_id) in (
    select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
  )
);

alter policy student_current_homework_section on public.homework_assignments using (
  (select public.current_active_role()) is distinct from 'student'::text
  or (school_id, section_id) in (
    select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
  )
);

alter policy homework_staff_read on public.homework_assignments using (
  (select public.current_active_role()) in ('admin'::text, 'teacher'::text, 'accountant'::text)
  and school_id = (select public.current_school_id())
  and public.staff_section_access(section_id, 'homework.read'::text)
);

alter policy homework_parent_read on public.homework_assignments using (
  (select public.current_active_role()) = 'parent'::text
  and school_id = (select public.current_school_id())
  and status = 'active'::text
  and exists (
    select 1 from public.student_guardian_relationships sgr
    join public.guardians g on g.id = sgr.guardian_id
    join public.enrollments e on e.student_id = sgr.student_id
    where g.profile_id = auth.uid()
      and sgr.school_id = (select public.current_school_id())
      and sgr.relationship_status = 'verified'::text
      and sgr.academic_access = true
      and sgr.valid_from <= now()
      and (sgr.valid_until is null or sgr.valid_until > now())
      and e.section_id = homework_assignments.section_id
      and e.school_id = (select public.current_school_id())
  )
);

-- 4i. student_exam_schedule
alter policy student_exam_schedule_published_read on public.student_exam_schedule using (
  status = 'published'::text
  and (select public.current_active_role()) = 'student'::text
  and (school_id, section_id) in (
    select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
  )
);

alter policy student_exam_schedule_admin_read on public.student_exam_schedule using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'admin'::text
  and (select public.current_role_has_permission('marks.publish'::text))
);

-- 4j. student_portal_materials
alter policy student_materials_published_read on public.student_portal_materials using (
  status = 'published'::text
  and (select public.current_active_role()) = 'student'::text
  and school_id = (select public.current_school_id())
  and (
    audience = 'school'::text
    or (
      audience = 'student'::text
      and (school_id, student_id) in (
        select me.school_id, me.student_id from public.read_student_portal_identity() me
      )
    )
    or (
      audience = 'class'::text
      and (school_id, class_id) in (
        select c.school_id, c.class_id from app_private.read_live_student_class() c
      )
    )
    or (
      audience = 'section'::text
      and (school_id, section_id) in (
        select sec.school_id, sec.section_id from app_private.read_live_student_section() sec
      )
    )
  )
);

alter policy student_materials_admin_read on public.student_portal_materials using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = 'admin'::text
  and (select public.current_role_has_permission('academics.manage'::text))
  and (select public.current_role_has_permission('documents.read'::text))
);

-- 4k. announcements
alter policy announcements_portal_read on public.announcements using (
  school_id = (select public.current_school_id())
  and published_at <= now()
  and (expires_at is null or expires_at > now())
  and (
    ((select public.current_active_role()) = 'student'::text and target_audience = any (array['all'::text, 'students'::text]))
    or ((select public.current_active_role()) = 'parent'::text and target_audience = any (array['all'::text, 'parents'::text]))
  )
);

alter policy announcements_staff_read on public.announcements using (
  school_id = (select public.current_school_id())
  and (select public.current_active_role()) = any (array['admin'::text, 'teacher'::text, 'accountant'::text])
  and (select public.current_role_has_permission('announcements.read'::text))
  and target_audience = any (array['all'::text, 'staff'::text])
  and published_at <= now()
  and (expires_at is null or expires_at > now())
);

-- 5. Supporting composite indexes for bounded Student dashboard queries
create index if not exists idx_enrollments_school_student_dates
  on public.enrollments (school_id, student_id, valid_from, valid_until);
create index if not exists idx_attendance_school_student_date
  on public.attendance_records (school_id, student_id, attendance_date desc);
create index if not exists idx_fee_invoices_school_student_due
  on public.fee_invoices (school_id, student_id, due_date);
create index if not exists idx_fee_payments_school_student_status_date
  on public.fee_payments (school_id, student_id, status, payment_date desc);
create index if not exists idx_marks_entries_school_student_sheet
  on public.marks_entries (school_id, student_id, marks_sheet_id);
create index if not exists idx_marks_sheets_school_section_pub_date
  on public.marks_sheets (school_id, section_id, is_published, exam_date);
create index if not exists idx_timetable_slots_school_section
  on public.timetable_slots (school_id, section_id);
create index if not exists idx_homework_school_section_status_due
  on public.homework_assignments (school_id, section_id, status, due_date);
create index if not exists idx_exam_schedule_school_section_status_date
  on public.student_exam_schedule (school_id, section_id, status, exam_date);
create index if not exists idx_portal_materials_school_status_updated
  on public.student_portal_materials (school_id, status, updated_at desc);
create index if not exists idx_announcements_school_audience_pub
  on public.announcements (school_id, target_audience, published_at desc);

commit;
