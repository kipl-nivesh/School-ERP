-- =============================================================================
-- UNAPPLIED SQL MIGRATION DRAFT (NOT FOR EXECUTION IN LOCAL DEV OR PROD)
-- Location: docs/architecture/drafts/20261118002700_portal_school_context_and_rls_draft.sql
-- Status: ARCHITECTURAL DESIGN DRAFT ONLY. NEVER APPLIED TO ANY DATABASE.
-- Description: Additive Student & Parent SQL context validation, versioned PIN
--              credential lifecycle, safe multi-role current_school_id() resolver,
--              recovery-token rejection, and student/parent Row Level Security.
-- Prerequisites: Migrations 1 through 26 must be present.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Student PIN Credential Versioning, Atomic Rotation & Revocation
-- =============================================================================

-- Add credential_version to public.pin_credentials
alter table public.pin_credentials
  add column if not exists credential_version integer not null default 1 check (credential_version >= 1);

create index if not exists pin_credentials_version_lookup_idx
  on public.pin_credentials (student_id, credential_namespace, credential_version, status);

-- Atomic Student PIN Rotation Function
-- Invokable exclusively by authorized School Admin with security.accounts.update
create or replace function public.rotate_student_pin(
  p_student_id uuid,
  p_new_pin_hash text,
  p_new_salt text,
  p_expected_version int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_rec record;
  v_new_version int;
begin
  v_school := public.current_school_id();
  if v_school is null or public.current_active_role() <> 'admin' or not public.current_role_has_permission('security.accounts.update') then
    raise exception 'Unauthorized: Only School Admin can rotate Student PIN credentials.' using errcode = '42501';
  end if;

  if p_new_pin_hash is null or length(p_new_pin_hash) < 32 or p_new_salt is null or length(p_new_salt) < 16 then
    raise exception 'Invalid credential parameters.' using errcode = '22023';
  end if;

  -- Lock student record and ensure it belongs to the current school
  perform 1 from public.students
  where id = p_student_id and school_id = v_school
  for update;
  if not found then
    raise exception 'Student not found in active school.' using errcode = 'P0002';
  end if;

  -- Lock and retrieve pin_credential record
  select * into v_rec
  from public.pin_credentials
  where student_id = p_student_id and credential_namespace = 'student'
  for update;

  if not found then
    raise exception 'PIN credential not found for student.' using errcode = 'P0002';
  end if;

  if v_rec.status = 'revoked' then
    raise exception 'Cannot rotate a permanently revoked PIN credential.' using errcode = '22000';
  end if;

  if v_rec.credential_version <> p_expected_version then
    raise exception 'Concurrency conflict: Credential version mismatch.' using errcode = '40001';
  end if;

  v_new_version := v_rec.credential_version + 1;

  update public.pin_credentials
  set pin_hash = p_new_pin_hash,
      salt = p_new_salt,
      credential_version = v_new_version,
      failed_attempts = 0,
      locked_until = null,
      status = 'active',
      updated_at = now()
  where id = v_rec.id;

  -- Audit log immutable event
  insert into public.pin_audit_logs (actor_profile_id, target_profile_id, student_id, action, details)
  values (
    auth.uid(),
    v_rec.profile_id,
    p_student_id,
    'student_pin_rotated',
    jsonb_build_object('old_version', v_rec.credential_version, 'new_version', v_new_version, 'school_id', v_school)
  );

  return jsonb_build_object('success', true, 'student_id', p_student_id, 'credential_version', v_new_version);
end;
$$;

alter function public.rotate_student_pin(uuid, text, text, int) owner to postgres;
revoke all on function public.rotate_student_pin(uuid, text, text, int) from public, anon;
grant execute on function public.rotate_student_pin(uuid, text, text, int) to authenticated;

-- Atomic Student PIN Revocation Function
-- Invokable exclusively by authorized School Admin
create or replace function public.revoke_student_pin(
  p_student_id uuid,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_rec record;
begin
  v_school := public.current_school_id();
  if v_school is null or public.current_active_role() <> 'admin' or not (
    public.current_role_has_permission('security.accounts.suspend') or
    public.current_role_has_permission('security.accounts.update')
  ) then
    raise exception 'Unauthorized: Only School Admin can revoke Student PIN credentials.' using errcode = '42501';
  end if;

  -- Lock student record in active school
  perform 1 from public.students
  where id = p_student_id and school_id = v_school
  for update;
  if not found then
    raise exception 'Student not found in active school.' using errcode = 'P0002';
  end if;

  select * into v_rec
  from public.pin_credentials
  where student_id = p_student_id and credential_namespace = 'student'
  for update;

  if not found then
    raise exception 'PIN credential not found.' using errcode = 'P0002';
  end if;

  update public.pin_credentials
  set status = 'revoked',
      updated_at = now()
  where id = v_rec.id;

  insert into public.pin_audit_logs (actor_profile_id, target_profile_id, student_id, action, details)
  values (
    auth.uid(),
    v_rec.profile_id,
    p_student_id,
    'student_pin_revoked',
    jsonb_build_object('reason', coalesce(p_reason, 'administrative_action'), 'school_id', v_school, 'revoked_version', v_rec.credential_version)
  );

  return jsonb_build_object('success', true, 'student_id', p_student_id, 'status', 'revoked');
end;
$$;

alter function public.revoke_student_pin(uuid, text) owner to postgres;
revoke all on function public.revoke_student_pin(uuid, text) from public, anon;
grant execute on function public.revoke_student_pin(uuid, text) to authenticated;

-- =============================================================================
-- 2. Dedicated Student & Parent Portal Liveness Helpers
-- =============================================================================

-- Helper: Verify Native Student Request & Evidence
create or replace function public.is_native_student_request() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(
    auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'
    and auth.jwt()->>'role' = 'authenticated'
    and (auth.jwt()->>'aud' = 'authenticated' or auth.jwt()->'aud' @> '["authenticated"]'::jsonb)
    and auth.uid() is not null
    and case when jsonb_typeof(auth.jwt()->'exp') = 'number' then (auth.jwt()->>'exp')::numeric > extract(epoch from now()) else false end
    -- Reject any password recovery or OTP recovery tokens
    and not exists (
      select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
      where a->>'method' in ('recovery', 'password_recovery', 'otp_recovery')
    )
    and (auth.jwt()->>'recovery' is null or auth.jwt()->>'recovery' <> 'true')
    and (auth.jwt()->>'type' is null or auth.jwt()->>'type' <> 'recovery'),
    false
  );
$$;

alter function public.is_native_student_request() owner to postgres;
revoke all on function public.is_native_student_request() from public, anon;
grant execute on function public.is_native_student_request() to authenticated;

-- Helper: Student Session Liveness Verification
create or replace function public.student_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_native_student_request()
    and exists (
      select 1 from auth.sessions s
      join auth.users u on u.id = s.user_id
      where s.id::text = auth.jwt()->>'session_id'
        and s.user_id = auth.uid()
        and (u.banned_until is null or u.banned_until <= now())
    )
    -- Student must be an active student with active portal status
    and exists (
      select 1 from public.students stu
      join public.profiles p on p.id = stu.profile_id
      join public.pin_credentials pc on pc.student_id = stu.id and pc.credential_namespace = 'student'
      where stu.profile_id = auth.uid()
        and stu.enrollment_status = 'active'
        and stu.portal_access_status = 'active'
        and p.account_status = 'active'
        and not p.credential_reset_required
        and pc.status = 'active'
        and (pc.expires_at is null or pc.expires_at > now())
        and (pc.locked_until is null or pc.locked_until <= now())
        -- Database-enforced Student PIN credential version check
        and pc.credential_version = (
          select rc.context_version
          from public.role_contexts rc
          where rc.id::text = auth.jwt()->>'session_id'
            and rc.profile_id = auth.uid()
        )
    )
    -- Strict Role Isolation: Student MUST NOT possess any active Staff role
    and not exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid()
        and ur.role_code in ('admin', 'teacher', 'accountant')
        and ur.membership_status = 'active'
        and ur.valid_from <= now()
        and (ur.valid_until is null or ur.valid_until > now())
    );
$$;

alter function public.student_session_is_live() owner to postgres;
revoke all on function public.student_session_is_live() from public, anon;
grant execute on function public.student_session_is_live() to authenticated;

-- Helper: Verify Native Parent Request & Evidence
create or replace function public.is_native_parent_request() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(
    auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'
    and auth.jwt()->>'role' = 'authenticated'
    and (auth.jwt()->>'aud' = 'authenticated' or auth.jwt()->'aud' @> '["authenticated"]'::jsonb)
    and auth.uid() is not null
    and case when jsonb_typeof(auth.jwt()->'exp') = 'number' then (auth.jwt()->>'exp')::numeric > extract(epoch from now()) else false end
    and not exists (
      select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
      where a->>'method' in ('recovery', 'password_recovery', 'otp_recovery')
    )
    and (auth.jwt()->>'recovery' is null or auth.jwt()->>'recovery' <> 'true')
    and (auth.jwt()->>'type' is null or auth.jwt()->>'type' <> 'recovery'),
    false
  );
$$;

alter function public.is_native_parent_request() owner to postgres;
revoke all on function public.is_native_parent_request() from public, anon;
grant execute on function public.is_native_parent_request() to authenticated;

-- Helper: Parent Session Liveness Verification
create or replace function public.parent_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_native_parent_request()
    and exists (
      select 1 from auth.sessions s
      join auth.users u on u.id = s.user_id
      where s.id::text = auth.jwt()->>'session_id'
        and s.user_id = auth.uid()
        and (u.banned_until is null or u.banned_until <= now())
    )
    -- Parent profile must be active guardian with at least one verified active relationship
    and exists (
      select 1 from public.guardians g
      join public.profiles p on p.id = g.profile_id
      join public.student_guardian_relationships r on r.guardian_id = g.id
      join public.students s on s.id = r.student_id
      where g.profile_id = auth.uid()
        and p.account_status = 'active'
        and not p.credential_reset_required
        and r.relationship_status = 'verified'
        and r.valid_from <= now()
        and (r.valid_until is null or r.valid_until > now())
        and s.enrollment_status = 'active'
    )
    -- Strict Role Isolation: Parent MUST NOT possess any active Staff role
    and not exists (
      select 1 from public.user_roles ur
      where ur.profile_id = auth.uid()
        and ur.role_code in ('admin', 'teacher', 'accountant')
        and ur.membership_status = 'active'
        and ur.valid_from <= now()
        and (ur.valid_until is null or ur.valid_until > now())
    );
$$;

alter function public.parent_session_is_live() owner to postgres;
revoke all on function public.parent_session_is_live() from public, anon;
grant execute on function public.parent_session_is_live() to authenticated;

-- =============================================================================
-- 3. Unified, Role-Partitioned current_school_id() & current_active_role()
-- =============================================================================

-- Safe Replacement of current_school_id()
-- Preserves ALL Staff password AMR and Admin AAL2/TOTP checks.
-- Adds isolated Student and Parent branches.
create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select rc.school_id
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = p.id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where rc.id::text = auth.jwt()->>'session_id'
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
      -- Branch A: Staff roles (Admin, Teacher, Accountant)
      -- STRICTLY preserves password AMR, email confirmed, and Admin AAL2/TOTP
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
      or
      -- Branch B: Student role
      (
        rc.role_code = 'student'
        and public.student_session_is_live()
      )
      or
      -- Branch C: Parent role
      (
        rc.role_code = 'parent'
        and public.parent_session_is_live()
      )
    )
  limit 1;
$$;

alter function public.current_school_id() owner to postgres;
revoke all on function public.current_school_id() from public, anon;
grant execute on function public.current_school_id() to authenticated;

-- Safe Replacement of current_active_role()
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
  where rc.school_id = public.current_school_id()
    and rc.id::text = auth.jwt()->>'session_id'
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

alter function public.current_active_role() owner to postgres;
revoke all on function public.current_active_role() from public, anon;
grant execute on function public.current_active_role() to authenticated;

-- =============================================================================
-- 4. Student Row Level Security (RLS) Policies
-- =============================================================================


-- Avoid a policy planning cycle between students and enrollments. The original
-- Teacher rule queried enrollments, whose new Student policy queries students.
create or replace function public.staff_student_assigned(p_student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.current_active_role() = 'teacher' and exists (
  select 1 from public.enrollments e
  where e.student_id = p_student and e.school_id = public.current_school_id()
    and public.staff_enrollment_access(p_student,e.section_id,'students.read')
 )
$$;
alter function public.staff_student_assigned(uuid) owner to postgres;
revoke all on function public.staff_student_assigned(uuid) from public,anon,service_role;
grant execute on function public.staff_student_assigned(uuid) to authenticated;
drop policy students_teacher_assigned on public.students;
drop policy if exists students_teacher_assigned on public.students;
create policy students_teacher_assigned on public.students for select to authenticated
using (school_id=public.current_school_id() and public.staff_student_assigned(id));

-- Students Table: Student can select only their own record in their active school
drop policy if exists students_student_read on public.students;
create policy students_student_read on public.students
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and profile_id = auth.uid()
    and school_id = public.current_school_id()
  );

-- Enrollments Table: Student can select only their own enrollments in their school
drop policy if exists enrollments_student_read on public.enrollments;
create policy enrollments_student_read on public.enrollments
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and student_id in (
      select id from public.students
      where profile_id = auth.uid()
        and school_id = public.current_school_id()
    )
  );

-- Attendance Table: Student can select only their own attendance in their school
drop policy if exists attendance_student_read on public.attendance_records;
create policy attendance_student_read on public.attendance_records
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and student_id in (
      select id from public.students
      where profile_id = auth.uid()
        and school_id = public.current_school_id()
    )
  );

-- Marks Sheets Table: Student can select only published mark sheets in their enrolled section
drop policy if exists marks_sheets_student_read on public.marks_sheets;
create policy marks_sheets_student_read on public.marks_sheets
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and is_published = true
    and exists (
      select 1 from public.enrollments e
      join public.students s on s.id = e.student_id
      where s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
        and e.section_id = marks_sheets.section_id
        and e.school_id = public.current_school_id()
    )
  );

-- Marks Table: Student can select only their own marks for PUBLISHED mark sheets
drop policy if exists marks_student_read on public.marks_entries;
create policy marks_student_read on public.marks_entries
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and student_id in (
      select id from public.students
      where profile_id = auth.uid()
        and school_id = public.current_school_id()
    )
    and exists (
      select 1 from public.marks_sheets ms
      where ms.id = marks_sheet_id
        and ms.is_published = true
        and ms.school_id = public.current_school_id()
    )
  );

-- Homework Table: Student can select active homework in their enrolled section
drop policy if exists homework_student_read on public.homework_assignments;
create policy homework_student_read on public.homework_assignments
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and status = 'active'
    and exists (
      select 1 from public.enrollments e
      join public.students s on s.id = e.student_id
      where s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
        and e.section_id = homework_assignments.section_id
        and e.school_id = public.current_school_id()
    )
  );

-- Timetable Table: Student can select timetable slots in their enrolled section
drop policy if exists timetable_student_read on public.timetable_slots;
create policy timetable_student_read on public.timetable_slots
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and exists (
      select 1 from public.enrollments e
      join public.students s on s.id = e.student_id
      where s.profile_id = auth.uid()
        and s.school_id = public.current_school_id()
        and e.section_id = timetable_slots.section_id
        and e.school_id = public.current_school_id()
    )
  );

-- Fee Invoices Table: Student can select only their own invoices
drop policy if exists invoices_student_read on public.fee_invoices;
create policy invoices_student_read on public.fee_invoices
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and student_id in (
      select id from public.students
      where profile_id = auth.uid()
        and school_id = public.current_school_id()
    )
  );

-- Fee Payments Table: Student can select only their own settled receipts
drop policy if exists payments_student_read on public.fee_payments;
create policy payments_student_read on public.fee_payments
  for select to authenticated
  using (
    public.current_active_role() = 'student'
    and school_id = public.current_school_id()
    and student_id in (
      select id from public.students
      where profile_id = auth.uid()
        and school_id = public.current_school_id()
    )
  );

-- =============================================================================
-- 5. Parent Row Level Security (RLS) & Purpose Enforcement
-- =============================================================================

-- parent_student_purpose() (from migration 20) now evaluates reliably
-- because current_school_id() and current_active_role() resolve Parent context.


-- Parent schedule and published-sheet policies require the child's authorized enrollment.
drop policy if exists enrollments_parent_read on public.enrollments;
create policy enrollments_parent_read on public.enrollments for select to authenticated
using (
 school_id=public.current_school_id() and public.current_active_role()='parent'
 and public.parent_student_purpose(student_id,'academic')
);

-- Ensure Parent can select only their own verified guardian relationships
drop policy if exists relationships_parent_read on public.student_guardian_relationships;
create policy relationships_parent_read on public.student_guardian_relationships
  for select to authenticated
  using (
    public.current_active_role() = 'parent'
    and school_id = public.current_school_id()
    and guardian_id in (
      select id from public.guardians
      where profile_id = auth.uid()
    )
  );

-- Guardians Table: Parent can select only their own guardian profile
drop policy if exists guardians_parent_read on public.guardians;
create policy guardians_parent_read on public.guardians
  for select to authenticated
  using (
    public.current_active_role() = 'parent'
    and profile_id = auth.uid()
  );

-- Marks Sheets Table: Parent can select only published mark sheets for their verified academic-permission children
drop policy if exists marks_sheets_parent_read on public.marks_sheets;
create policy marks_sheets_parent_read on public.marks_sheets
  for select to authenticated
  using (
    public.current_active_role() = 'parent'
    and school_id = public.current_school_id()
    and is_published = true
    and exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id
      where g.profile_id = auth.uid()
        and sgr.school_id = public.current_school_id()
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and e.section_id = marks_sheets.section_id
        and e.school_id = public.current_school_id()
    )
  );


-- Published results also require a permissive Parent rule on the entry table.
drop policy if exists marks_parent_read on public.marks_entries;
create policy marks_parent_read on public.marks_entries for select to authenticated
using (
 school_id=public.current_school_id() and public.current_active_role()='parent'
 and public.parent_student_purpose(student_id,'academic')
 and exists (
  select 1 from public.marks_sheets ms
  where ms.id=marks_sheet_id and ms.school_id=marks_entries.school_id and ms.is_published=true
 )
);

-- Homework Table: Parent can select active homework for their verified academic-permission children
drop policy if exists homework_parent_read on public.homework_assignments;
create policy homework_parent_read on public.homework_assignments
  for select to authenticated
  using (
    public.current_active_role() = 'parent'
    and school_id = public.current_school_id()
    and status = 'active'
    and exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id
      where g.profile_id = auth.uid()
        and sgr.school_id = public.current_school_id()
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and e.section_id = homework_assignments.section_id
        and e.school_id = public.current_school_id()
    )
  );

-- Timetable Table: Parent can select timetable slots for their verified academic-permission children
drop policy if exists timetable_parent_read on public.timetable_slots;
create policy timetable_parent_read on public.timetable_slots
  for select to authenticated
  using (
    public.current_active_role() = 'parent'
    and school_id = public.current_school_id()
    and exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id
      where g.profile_id = auth.uid()
        and sgr.school_id = public.current_school_id()
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
        and sgr.valid_from <= now()
        and (sgr.valid_until is null or sgr.valid_until > now())
        and e.section_id = timetable_slots.section_id
        and e.school_id = public.current_school_id()
    )
  );

-- Announcements Table: Role-partitioned published announcements
drop policy if exists announcements_portal_read on public.announcements;
create policy announcements_portal_read on public.announcements
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      (public.current_active_role() = 'student' and target_audience in ('all', 'students'))
      or
      (public.current_active_role() = 'parent' and target_audience in ('all', 'parents'))
    )
  );


-- =============================================================================
-- Ensure is_native_staff_request strictly verifies the production issuer
-- =============================================================================
create or replace function public.is_native_staff_request() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(
    auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'
    and auth.jwt()->>'role' = 'authenticated'
    and (auth.jwt()->>'aud' = 'authenticated' or auth.jwt()->'aud' @> '["authenticated"]'::jsonb)
    and auth.uid() is not null
    and case when jsonb_typeof(auth.jwt()->'exp')='number' then (auth.jwt()->>'exp')::numeric > extract(epoch from now()) else false end
    and not exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end) a
      where a->>'method' in ('recovery','password_recovery','otp_recovery')
    )
    and coalesce(auth.jwt()->>'recovery','false') <> 'true'
    and coalesce(auth.jwt()->>'type','') <> 'recovery',
    false
  );
$$;
alter function public.is_native_staff_request() owner to postgres;
revoke all on function public.is_native_staff_request() from public, anon;
grant execute on function public.is_native_staff_request() to authenticated;


-- =============================================================================
-- 6. Record Migration 28 in Schema Ledger
-- =============================================================================
insert into supabase_migrations.schema_migrations (version, name)
values ('20261118002800', 'portal_school_context_and_rls')
on conflict (version) do nothing;

commit;
