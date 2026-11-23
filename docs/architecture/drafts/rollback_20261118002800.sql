-- =============================================================================
-- RECOVERY ROLLBACK SCRIPT FOR MIGRATION 28
-- File: docs/architecture/drafts/rollback_20261118002800.sql
-- Description: Reverts Migration 28 cleanly and restores Migration 27 baseline.
-- =============================================================================

begin;

-- 1. Remove Migration 28 RLS Policies
drop policy if exists students_student_read on public.students;
drop policy if exists enrollments_student_read on public.enrollments;
drop policy if exists attendance_student_read on public.attendance_records;
drop policy if exists marks_sheets_student_read on public.marks_sheets;
drop policy if exists marks_student_read on public.marks_entries;
drop policy if exists homework_student_read on public.homework_assignments;
drop policy if exists timetable_student_read on public.timetable_slots;
drop policy if exists invoices_student_read on public.fee_invoices;
drop policy if exists payments_student_read on public.fee_payments;

drop policy if exists enrollments_parent_read on public.enrollments;
drop policy if exists relationships_parent_read on public.student_guardian_relationships;
drop policy if exists guardians_parent_read on public.guardians;
drop policy if exists marks_sheets_parent_read on public.marks_sheets;
drop policy if exists marks_parent_read on public.marks_entries;
drop policy if exists homework_parent_read on public.homework_assignments;
drop policy if exists timetable_parent_read on public.timetable_slots;
drop policy if exists announcements_portal_read on public.announcements;
drop policy if exists pin_audit_logs_admin_read on public.pin_audit_logs;

-- Restore Migration 27 students_teacher_assigned policy
drop policy if exists students_teacher_assigned on public.students;
create policy students_teacher_assigned on public.students for select to authenticated
using (school_id = public.current_school_id() and exists (
  select 1 from public.enrollments e
  where e.student_id = students.id and e.school_id = public.current_school_id()
    and public.staff_enrollment_access(students.id, e.section_id, 'students.read')
));

-- 2. Restore Migration 27 current_school_id() definition (Staff only)
create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
 select rc.school_id from public.role_contexts rc
 join public.profiles p on p.id = rc.profile_id
 join public.user_roles m on m.id = rc.assignment_id and m.profile_id = p.id
  and m.school_id = rc.school_id and m.role_code = rc.role_code
 join public.schools s on s.id = rc.school_id
 where public.staff_session_is_live() and app_private.staff_token_is_current() and rc.id::text = auth.jwt()->>'session_id'
  and p.id = auth.uid() and p.account_status = 'active' and not p.credential_reset_required
  and rc.revoked_at is null and rc.expires_at > now() and rc.authorization_version = p.authorization_version
  and m.membership_status = 'active' and m.valid_from <= now() and (m.valid_until is null or m.valid_until > now())
  and s.status = 'active'
 limit 1
$$;

-- 3. Restore Migration 27 current_active_role() definition (Staff only)
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
  limit 1;
$$;

-- 4. Drop Portal Liveness and PIN Functions
drop function if exists public.is_native_student_request();
drop function if exists public.student_session_is_live();
drop function if exists public.is_native_parent_request();
drop function if exists public.parent_session_is_live();
drop function if exists public.rotate_student_pin(uuid, text, text, int);
drop function if exists public.revoke_student_pin(uuid, text);
drop function if exists public.staff_student_assigned(uuid);

-- 5. Drop PIN Audit Logs Table
drop table if exists public.pin_audit_logs;

-- 6. Revert Migration Ledger Entry
delete from supabase_migrations.schema_migrations where version = '20261118002800';

commit;
