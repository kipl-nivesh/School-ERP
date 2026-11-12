-- =============================================================================
-- Migration 7: Multi-Tenant Foundation & School Isolation
-- Brightcamp Single-School to Multi-School SaaS Transformation
-- =============================================================================
-- 1. Tenant Foundation Table (public.schools)
-- 2. Scoped Membership & Role Contexts (user_roles, role_contexts)
-- 3. School-Scoped Domain Models & Foreign Keys
-- 4. Cross-School Foreign-Key Prevention (Composite Keys)
-- 5. Tenant-Aware Context Helpers (current_school_id)
-- 6. Tenant-Aware Row Level Security (RLS) for all school-owned tables
-- =============================================================================

begin;

-- =============================================================================
-- 1. Tenant Foundation Table: public.schools
-- =============================================================================

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 2 and 30 and code ~ '^[A-Z0-9_-]+$'),
  name text not null check (length(name) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'suspended', 'onboarding')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schools enable row level security;
alter table public.schools force row level security;
revoke all on table public.schools from public, anon, authenticated;

-- =============================================================================
-- 2. Scoped Membership & Role Contexts
-- =============================================================================

-- Add school_id to user_roles
alter table public.user_roles add column if not exists school_id uuid references public.schools(id) on delete restrict;

-- Drop obsolete single-tenant uniqueness constraints on user_roles
alter table public.user_roles drop constraint if exists user_roles_profile_id_role_code_key cascade;
alter table public.user_roles drop constraint if exists user_roles_id_profile_id_role_code_key cascade;

-- Establish multi-tenant uniqueness constraints on user_roles
alter table public.user_roles add constraint user_roles_profile_school_role_key unique (profile_id, school_id, role_code);
alter table public.user_roles add constraint user_roles_id_profile_school_role_key unique (id, profile_id, school_id, role_code);

-- Add school_id to role_contexts
alter table public.role_contexts add column if not exists school_id uuid references public.schools(id) on delete restrict;

-- Re-link role_contexts to user_roles with school_id enforcement
alter table public.role_contexts drop constraint if exists role_contexts_assignment_id_profile_id_role_code_fkey cascade;
alter table public.role_contexts drop constraint if exists role_contexts_assignment_membership_fkey cascade;
alter table public.role_contexts add constraint role_contexts_assignment_membership_fkey
  foreign key (assignment_id, profile_id, school_id, role_code)
  references public.user_roles(id, profile_id, school_id, role_code) on delete restrict;

create index if not exists role_contexts_school_idx on public.role_contexts (school_id, profile_id, expires_at);

-- =============================================================================
-- 3. Tenant-Aware Session Context Helper (current_school_id)
-- =============================================================================

create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select rc.school_id
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
                         and m.profile_id = rc.profile_id
                         and m.school_id = rc.school_id
                         and m.role_code = rc.role_code
  join public.schools s on s.id = rc.school_id
  where rc.id::text = auth.jwt()->>'session_id'
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
revoke all on function public.current_school_id() from public, anon;
grant execute on function public.current_school_id() to authenticated;

-- Update current_active_role to also verify that school_id is valid and active
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
  where rc.id::text = auth.jwt()->>'session_id'
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
revoke all on function public.current_active_role() from public, anon;
grant execute on function public.current_active_role() to authenticated;

-- =============================================================================
-- 4. School-Scoped Domain Tables & Uniqueness
-- =============================================================================

-- Academic Years
alter table public.academic_years add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.academic_years drop constraint if exists academic_years_label_key cascade;
alter table public.academic_years add constraint academic_years_school_label_key unique (school_id, label);
alter table public.academic_years add constraint academic_years_id_school_key unique (id, school_id);

-- Classes
alter table public.classes add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.classes drop constraint if exists classes_name_key cascade;
alter table public.classes add constraint classes_school_name_key unique (school_id, name);
alter table public.classes add constraint classes_id_school_key unique (id, school_id);

-- Sections
alter table public.sections add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.sections drop constraint if exists sections_class_id_academic_year_id_name_key cascade;
alter table public.sections drop constraint if exists sections_id_academic_year_id_key cascade;
alter table public.sections add constraint sections_school_class_year_name_key unique (school_id, class_id, academic_year_id, name);
alter table public.sections add constraint sections_id_school_key unique (id, school_id);
alter table public.sections add constraint sections_id_year_school_key unique (id, academic_year_id, school_id);

-- Cross-School Prevention on Sections
alter table public.sections drop constraint if exists sections_class_school_fkey cascade;
alter table public.sections add constraint sections_class_school_fkey
  foreign key (class_id, school_id) references public.classes(id, school_id) on delete restrict;

alter table public.sections drop constraint if exists sections_academic_year_school_fkey cascade;
alter table public.sections add constraint sections_academic_year_school_fkey
  foreign key (academic_year_id, school_id) references public.academic_years(id, school_id) on delete restrict;

-- Staff Profiles: Convert to multi-tenant composite primary key (profile_id, school_id)
alter table public.teacher_assignments drop constraint if exists teacher_assignments_teacher_profile_id_fkey cascade;
alter table public.attendance_records drop constraint if exists attendance_records_recorded_by_profile_id_fkey cascade;
alter table public.homework_assignments drop constraint if exists homework_assignments_teacher_profile_id_fkey cascade;
alter table public.marks_sheets drop constraint if exists marks_sheets_created_by_profile_id_fkey cascade;
alter table public.timetable_slots drop constraint if exists timetable_slots_teacher_profile_id_fkey cascade;
alter table public.announcements drop constraint if exists announcements_author_profile_id_fkey cascade;
alter table public.fee_payments drop constraint if exists fee_payments_collected_by_profile_id_fkey cascade;
alter table public.operating_expenses drop constraint if exists operating_expenses_approved_by_profile_id_fkey cascade;

alter table public.staff_profiles add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.staff_profiles drop constraint if exists staff_profiles_pkey cascade;
alter table public.staff_profiles drop constraint if exists staff_profiles_profile_school_key cascade;
alter table public.staff_profiles add constraint staff_profiles_pkey primary key (profile_id, school_id);
alter table public.staff_profiles add constraint staff_profiles_profile_school_key unique (profile_id, school_id);

-- Students
alter table public.students add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.students drop constraint if exists students_registration_number_key cascade;
alter table public.students add constraint students_school_registration_number_key unique (school_id, registration_number);
alter table public.students add constraint students_id_school_key unique (id, school_id);
create index if not exists students_school_reg_idx on public.students(school_id, registration_number);

-- Student-Guardian Relationships
alter table public.student_guardian_relationships add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.student_guardian_relationships drop constraint if exists sgr_student_school_fkey cascade;
alter table public.student_guardian_relationships add constraint sgr_student_school_fkey
  foreign key (student_id, school_id) references public.students(id, school_id) on delete restrict;
alter table public.student_guardian_relationships drop constraint if exists student_guardian_relationships_unique_pair cascade;
alter table public.student_guardian_relationships add constraint student_guardian_relationships_unique_pair unique (school_id, student_id, guardian_id);
alter table public.student_guardian_relationships add constraint student_guardian_relationships_id_school_key unique (id, school_id);

-- Parent Login Identities
alter table public.parent_login_identities add column if not exists school_id uuid references public.schools(id) on delete restrict;
drop index if exists public.parent_login_one_eligible_student;
create unique index parent_login_one_eligible_student on public.parent_login_identities(school_id, student_id) where login_eligible;

-- Enrollments
alter table public.enrollments add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.enrollments drop constraint if exists enrollments_student_school_fkey cascade;
alter table public.enrollments add constraint enrollments_student_school_fkey
  foreign key (student_id, school_id) references public.students(id, school_id) on delete restrict;
alter table public.enrollments drop constraint if exists enrollments_section_year_school_fkey cascade;
alter table public.enrollments add constraint enrollments_section_year_school_fkey
  foreign key (section_id, academic_year_id, school_id) references public.sections(id, academic_year_id, school_id) on delete restrict;

-- Teacher Assignments
alter table public.teacher_assignments add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.teacher_assignments drop constraint if exists teacher_assignments_teacher_school_fkey cascade;
alter table public.teacher_assignments add constraint teacher_assignments_teacher_school_fkey
  foreign key (teacher_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;
alter table public.teacher_assignments drop constraint if exists teacher_assignments_section_year_school_fkey cascade;
alter table public.teacher_assignments add constraint teacher_assignments_section_year_school_fkey
  foreign key (section_id, academic_year_id, school_id) references public.sections(id, academic_year_id, school_id) on delete restrict;

-- Attendance Records
alter table public.attendance_records add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.attendance_records drop constraint if exists attendance_student_school_fkey cascade;
alter table public.attendance_records add constraint attendance_student_school_fkey
  foreign key (student_id, school_id) references public.students(id, school_id) on delete restrict;
alter table public.attendance_records drop constraint if exists attendance_section_school_fkey cascade;
alter table public.attendance_records add constraint attendance_section_school_fkey
  foreign key (section_id, school_id) references public.sections(id, school_id) on delete restrict;
alter table public.attendance_records drop constraint if exists attendance_recorded_by_fkey cascade;
alter table public.attendance_records add constraint attendance_recorded_by_fkey
  foreign key (recorded_by_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;

-- Homework Assignments
alter table public.homework_assignments add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.homework_assignments drop constraint if exists homework_section_school_fkey cascade;
alter table public.homework_assignments add constraint homework_section_school_fkey
  foreign key (section_id, school_id) references public.sections(id, school_id) on delete restrict;
alter table public.homework_assignments drop constraint if exists homework_teacher_fkey cascade;
alter table public.homework_assignments add constraint homework_teacher_fkey
  foreign key (teacher_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;

-- Marks Sheets & Entries
alter table public.marks_sheets add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.marks_sheets drop constraint if exists marks_sheets_section_school_fkey cascade;
alter table public.marks_sheets add constraint marks_sheets_section_school_fkey
  foreign key (section_id, school_id) references public.sections(id, school_id) on delete restrict;
alter table public.marks_sheets drop constraint if exists marks_sheets_created_by_fkey cascade;
alter table public.marks_sheets add constraint marks_sheets_created_by_fkey
  foreign key (created_by_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;
alter table public.marks_sheets add constraint marks_sheets_id_school_key unique (id, school_id);

alter table public.marks_entries add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.marks_entries drop constraint if exists marks_entries_sheet_school_fkey cascade;
alter table public.marks_entries add constraint marks_entries_sheet_school_fkey
  foreign key (marks_sheet_id, school_id) references public.marks_sheets(id, school_id) on delete cascade;
alter table public.marks_entries drop constraint if exists marks_entries_student_school_fkey cascade;
alter table public.marks_entries add constraint marks_entries_student_school_fkey
  foreign key (student_id, school_id) references public.students(id, school_id) on delete restrict;
-- Timetable Slots
alter table public.timetable_slots add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.timetable_slots drop constraint if exists timetable_section_school_fkey cascade;
alter table public.timetable_slots add constraint timetable_section_school_fkey
  foreign key (section_id, school_id) references public.sections(id, school_id) on delete restrict;
alter table public.timetable_slots drop constraint if exists timetable_teacher_fkey cascade;
alter table public.timetable_slots add constraint timetable_teacher_fkey
  foreign key (teacher_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;

-- Announcements
alter table public.announcements add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.announcements drop constraint if exists announcements_author_fkey cascade;
alter table public.announcements add constraint announcements_author_fkey
  foreign key (author_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;

-- Fee Structures
alter table public.fee_structures add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.fee_structures drop constraint if exists fee_structures_class_id_fee_category_frequency_key cascade;
alter table public.fee_structures drop constraint if exists fee_structures_school_class_cat_freq_key cascade;
alter table public.fee_structures add constraint fee_structures_school_class_cat_freq_key
  unique (school_id, class_id, fee_category, frequency);
alter table public.fee_structures drop constraint if exists fee_structures_class_school_fkey cascade;
alter table public.fee_structures add constraint fee_structures_class_school_fkey
  foreign key (class_id, school_id) references public.classes(id, school_id) on delete restrict;

-- Fee Invoices
alter table public.fee_invoices add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.fee_invoices drop constraint if exists fee_invoices_invoice_number_key cascade;
alter table public.fee_invoices add constraint fee_invoices_school_invoice_number_key unique (school_id, invoice_number);
alter table public.fee_invoices add constraint fee_invoices_id_school_key unique (id, school_id);
alter table public.fee_invoices drop constraint if exists fee_invoices_student_school_fkey cascade;
alter table public.fee_invoices add constraint fee_invoices_student_school_fkey
  foreign key (student_id, school_id) references public.students(id, school_id) on delete restrict;
alter table public.fee_invoices drop constraint if exists fee_invoices_academic_year_school_fkey cascade;
alter table public.fee_invoices add constraint fee_invoices_academic_year_school_fkey
  foreign key (academic_year_id, school_id) references public.academic_years(id, school_id) on delete restrict;

-- Fee Payments
alter table public.fee_payments add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.fee_payments drop constraint if exists fee_payments_receipt_number_key cascade;
alter table public.fee_payments add constraint fee_payments_school_receipt_number_key unique (school_id, receipt_number);
alter table public.fee_payments drop constraint if exists fee_payments_student_school_fkey cascade;
alter table public.fee_payments add constraint fee_payments_student_school_fkey
  foreign key (student_id, school_id) references public.students(id, school_id) on delete restrict;
alter table public.fee_payments drop constraint if exists fee_payments_invoice_school_fkey cascade;
alter table public.fee_payments add constraint fee_payments_invoice_school_fkey
  foreign key (invoice_id, school_id) references public.fee_invoices(id, school_id) on delete restrict;
alter table public.fee_payments drop constraint if exists fee_payments_collected_by_fkey cascade;
alter table public.fee_payments add constraint fee_payments_collected_by_fkey
  foreign key (collected_by_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;

-- Operating Expenses
alter table public.operating_expenses add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.operating_expenses drop constraint if exists operating_expenses_voucher_number_key cascade;
alter table public.operating_expenses add constraint operating_expenses_school_voucher_number_key unique (school_id, voucher_number);
alter table public.operating_expenses drop constraint if exists operating_expenses_approved_by_fkey cascade;
alter table public.operating_expenses add constraint operating_expenses_approved_by_fkey
  foreign key (approved_by_profile_id, school_id) references public.staff_profiles(profile_id, school_id) on delete restrict;

-- PIN Credentials
alter table public.pin_credentials add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.pin_credentials drop constraint if exists uq_pin_credential cascade;
alter table public.pin_credentials drop constraint if exists pin_credentials_school_profile_ns_key cascade;
alter table public.pin_credentials add constraint pin_credentials_school_profile_ns_key unique (school_id, profile_id, credential_namespace, student_id);

-- Audit Events
alter table public.audit_events add column if not exists school_id uuid references public.schools(id) on delete set null;
create index if not exists audit_events_school_idx on public.audit_events(school_id, occurred_at);

-- =============================================================================
-- 5. Tenant-Aware Row Level Security (RLS) Policies
-- =============================================================================

-- Helper: Drops policy if exists without raising errors
do $$
declare
  r record;
begin
  -- Drop all existing pre-multi-tenant domain policies from Migration 5
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'school_configuration', 'classes', 'sections', 'students',
        'attendance_records', 'homework_assignments', 'marks_sheets', 'marks_entries',
        'timetable_slots', 'fee_structures', 'fee_invoices', 'fee_payments',
        'operating_expenses', 'announcements'
      )
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

-- Schools Directory Policy
create policy schools_active_member_select on public.schools
  for select to authenticated
  using (
    id = public.current_school_id()
  );

create policy schools_anon_active_select on public.schools
  for select to anon
  using (
    status = 'active'
  );

grant select on public.schools to authenticated;
grant select (id, code, name, status) on public.schools to anon;
grant select, insert, update on public.guardians, public.student_guardian_relationships, public.parent_login_identities to authenticated;
grant select on public.audit_events to authenticated;

-- Academic Years Policy
create policy academic_years_tenant_scoped on public.academic_years
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and (
      public.current_active_role() in ('admin', 'teacher', 'accountant', 'student', 'parent')
    )
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

-- Classes Policy
create policy classes_tenant_scoped on public.classes
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and (
      public.current_active_role() in ('admin', 'teacher', 'accountant', 'student', 'parent')
    )
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

-- Sections Policy
create policy sections_tenant_scoped on public.sections
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and (
      public.current_active_role() in ('admin', 'teacher', 'accountant', 'student', 'parent')
    )
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

-- Students Policy
create policy students_admin_scoped on public.students
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

create policy students_staff_scoped on public.students
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() in ('teacher', 'accountant')
  );

create policy students_self_scoped on public.students
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and profile_id = auth.uid()
  );

create policy students_parent_scoped on public.students
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'parent'
    and exists (
      select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = students.id
        and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid()
        and r.relationship_status = 'verified'
    )
  );

-- Attendance Records Policy
create policy attendance_admin_scoped on public.attendance_records
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'admin'
  );

create policy attendance_teacher_scoped on public.attendance_records
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'teacher'
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.section_id = attendance_records.section_id
        and ta.school_id = public.current_school_id()
        and ta.teacher_profile_id = auth.uid()
    )
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() = 'teacher'
    and recorded_by_profile_id = auth.uid()
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.section_id = attendance_records.section_id
        and ta.school_id = public.current_school_id()
        and ta.teacher_profile_id = auth.uid()
    )
  );

create policy attendance_student_scoped on public.attendance_records
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = attendance_records.student_id
        and s.school_id = public.current_school_id()
        and s.profile_id = auth.uid()
    )
  );

create policy attendance_parent_scoped on public.attendance_records
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'parent'
    and exists (
      select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = attendance_records.student_id
        and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid()
        and r.relationship_status = 'verified'
        and r.academic_access = true
    )
  );

-- Fee Invoices Policy
create policy fee_invoices_admin_accountant on public.fee_invoices
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  );

create policy fee_invoices_student_scoped on public.fee_invoices
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = fee_invoices.student_id
        and s.school_id = public.current_school_id()
        and s.profile_id = auth.uid()
    )
  );

create policy fee_invoices_parent_scoped on public.fee_invoices
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'parent'
    and exists (
      select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = fee_invoices.student_id
        and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid()
        and r.relationship_status = 'verified'
        and r.fee_access = true
    )
  );

-- Fee Payments Policy
create policy fee_payments_admin_accountant on public.fee_payments
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  );

create policy fee_payments_student_scoped on public.fee_payments
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'student'
    and exists (
      select 1 from public.students s
      where s.id = fee_payments.student_id
        and s.school_id = public.current_school_id()
        and s.profile_id = auth.uid()
    )
  );

create policy fee_payments_parent_scoped on public.fee_payments
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() = 'parent'
    and exists (
      select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = fee_payments.student_id
        and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid()
        and r.relationship_status = 'verified'
        and r.fee_access = true
    )
  );

-- Operating Expenses Policy
create policy expenses_admin_accountant on public.operating_expenses
  for all to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  )
  with check (
    school_id = public.current_school_id()
    and public.current_active_role() in ('admin', 'accountant')
  );

-- =============================================================================
-- 6. Update Fee Collection Stored Procedure with school_id
-- =============================================================================

create or replace function public.collect_fee_payment_atomic(
  p_student_id uuid,
  p_invoice_id uuid,
  p_amount_paise bigint,
  p_payment_method text,
  p_transaction_reference text,
  p_idempotency_key text,
  p_notes text default null,
  p_school_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_invoice public.fee_invoices%rowtype;
  v_existing_payment public.fee_payments%rowtype;
  v_payment_id uuid;
  v_receipt_number text;
  v_collector_id uuid;
  v_school_id uuid;
  v_remaining_balance bigint;
  v_new_paid_paise bigint;
  v_new_status text;
begin
  -- Collector must be authenticated with accountant or admin role
  if public.current_active_role() not in ('admin', 'accountant') then
    raise exception 'Unauthorized payment collection attempt' using errcode = '42501';
  end if;
  v_collector_id := auth.uid();

  -- Resolve school_id from active context or parameter (prevent cross-tenant client tampering)
  if public.current_school_id() is not null then
    if p_school_id is not null and p_school_id <> public.current_school_id() then
      raise exception 'Cross-tenant payment collection forbidden' using errcode = '42501';
    end if;
    v_school_id := public.current_school_id();
  else
    v_school_id := p_school_id;
  end if;

  if v_school_id is null then
    raise exception 'Missing authorized school context' using errcode = '42501';
  end if;

  -- 1. Idempotency Check
  select * into v_existing_payment
  from public.fee_payments
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_payment.student_id <> p_student_id
       or v_existing_payment.invoice_id <> p_invoice_id
       or v_existing_payment.amount_paise <> p_amount_paise
       or v_existing_payment.payment_method <> p_payment_method
       or v_existing_payment.transaction_reference <> p_transaction_reference
       or v_existing_payment.school_id <> v_school_id then
      raise exception 'Idempotency key collision with differing payload parameters'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'status', 'idempotent_duplicate',
      'payment_id', v_existing_payment.id,
      'receipt_number', v_existing_payment.receipt_number,
      'amount_paise', v_existing_payment.amount_paise,
      'payment_status', v_existing_payment.status
    );
  end if;

  -- 2. Lock Invoice Row & Enforce School Isolation
  select * into v_invoice
  from public.fee_invoices
  where id = p_invoice_id and student_id = p_student_id and school_id = v_school_id
  for update;

  if not found then
    raise exception 'Invoice % not found for student % in school %', p_invoice_id, p_student_id, v_school_id
      using errcode = 'P0002';
  end if;

  v_remaining_balance := v_invoice.amount_paise - v_invoice.paid_paise;
  if p_amount_paise > v_remaining_balance then
    raise exception 'Payment amount (% paise) exceeds remaining balance (% paise)',
      p_amount_paise, v_remaining_balance
      using errcode = '22003';
  end if;

  -- 3. Generate Receipt Number
  v_receipt_number := 'REC-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.receipt_number_seq')::text, 6, '0');

  -- 4. Insert Settled Payment
  insert into public.fee_payments (
    student_id, invoice_id, receipt_number, amount_paise,
    payment_method, transaction_reference, notes,
    idempotency_key, status, collected_by_profile_id, school_id
  ) values (
    p_student_id, p_invoice_id, v_receipt_number, p_amount_paise,
    p_payment_method, p_transaction_reference, p_notes,
    p_idempotency_key, 'settled', v_collector_id, v_school_id
  ) returning id into v_payment_id;

  -- 5. Update Invoice Balance & Status
  v_new_paid_paise := v_invoice.paid_paise + p_amount_paise;
  if v_new_paid_paise = v_invoice.amount_paise then
    v_new_status := 'paid';
  else
    v_new_status := 'partial';
  end if;

  update public.fee_invoices
  set paid_paise = v_new_paid_paise,
      status = v_new_status
  where id = p_invoice_id;

  -- 6. Record Audit Event
  insert into public.audit_events (
    actor_profile_id, target_profile_id, event_type, school_id
  ) values (
    v_collector_id, p_student_id, 'fee_payment_collected', v_school_id
  );

  return jsonb_build_object(
    'status', 'settled',
    'payment_id', v_payment_id,
    'receipt_number', v_receipt_number,
    'amount_paise', p_amount_paise,
    'new_paid_paise', v_new_paid_paise,
    'remaining_balance_paise', (v_invoice.amount_paise - v_new_paid_paise),
    'invoice_status', v_new_status
  );
end;
$$;
revoke all on function public.collect_fee_payment_atomic(uuid, uuid, bigint, text, text, text, text, uuid) from public, anon;
grant execute on function public.collect_fee_payment_atomic(uuid, uuid, bigint, text, text, text, text, uuid) to authenticated;

commit;
