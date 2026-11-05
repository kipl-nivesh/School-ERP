-- Step 14 incremental review artifact. NOT EXECUTED. Depends on 20261105000100.
begin;
create table public.school_configuration (
 id boolean primary key default true check (id), display_name text not null check (length(display_name) between 1 and 160)
);
create table public.staff_profiles (
 profile_id uuid primary key references public.profiles(id) on delete restrict,
 display_name text not null check (length(display_name) between 1 and 160)
);
create table public.academic_years (
 id uuid primary key default gen_random_uuid(), label text not null unique,
 starts_on date not null, ends_on date not null, check (ends_on >= starts_on)
);
create table public.classes (
 id uuid primary key default gen_random_uuid(), name text not null unique check (length(name) between 1 and 80)
);
create table public.sections (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id),
 academic_year_id uuid not null references public.academic_years(id), name text not null,
 unique (class_id, academic_year_id, name), unique (id, academic_year_id)
);
create table public.students (
 id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id),
 registration_number text collate "C" not null unique,
 display_name text not null, enrollment_status text not null default 'inactive' check (enrollment_status in ('active','inactive','withdrawn')),
 relationship_version bigint not null default 1 check (relationship_version > 0),
 check (length(registration_number) between 1 and 128 and registration_number !~ '[[:cntrl:]]')
);
create table public.guardians (
 id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id),
 display_name text not null, unique (id, profile_id)
);
create table public.student_guardian_relationships (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 guardian_id uuid not null references public.guardians(id),
 relationship_status text not null default 'pending' check (relationship_status in ('pending','verified','revoked')),
 academic_access boolean not null default false, fee_access boolean not null default false,
 valid_from timestamptz not null default now(), valid_until timestamptz,
 relationship_version bigint not null default 1 check (relationship_version > 0),
 unique (id, student_id, guardian_id), check (valid_until is null or valid_until > valid_from)
);
create table public.parent_login_identities (
 profile_id uuid primary key, role_code text not null default 'parent' check (role_code = 'parent'),
 student_id uuid not null references public.students(id), guardian_id uuid not null unique,
 relationship_id uuid not null, login_eligible boolean not null default false,
 mapping_version bigint not null default 1 check (mapping_version > 0),
 foreign key (profile_id, role_code) references public.user_roles(profile_id, role_code),
 foreign key (guardian_id, profile_id) references public.guardians(id, profile_id),
 foreign key (relationship_id, student_id, guardian_id) references public.student_guardian_relationships(id, student_id, guardian_id)
);
-- Atomic concurrent inserts/updates cannot commit two eligible Parent mappings for one Student.
-- PK profile_id also fixes each Parent login identity to exactly one Student.
create unique index parent_login_one_eligible_student on public.parent_login_identities(student_id) where login_eligible;
create table public.enrollments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 academic_year_id uuid not null references public.academic_years(id), section_id uuid not null,
 valid_from date not null, valid_until date,
 foreign key (section_id, academic_year_id) references public.sections(id, academic_year_id),
 check (valid_until is null or valid_until >= valid_from)
);
create table public.teacher_assignments (
 id uuid primary key default gen_random_uuid(), teacher_profile_id uuid not null references public.staff_profiles(profile_id),
 section_id uuid not null, academic_year_id uuid not null, subject_code text not null,
 valid_from date not null, valid_until date,
 foreign key (section_id, academic_year_id) references public.sections(id, academic_year_id),
 check (valid_until is null or valid_until >= valid_from)
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), actor_profile_id uuid,
 target_profile_id uuid, event_type text not null, occurred_at timestamptz not null default now()
);
create index student_guardian_scope_idx on public.student_guardian_relationships(student_id, guardian_id, relationship_status);
create index enrollment_scope_idx on public.enrollments(student_id, academic_year_id, section_id);
create index teacher_assignment_scope_idx on public.teacher_assignments(teacher_profile_id, section_id, valid_from, valid_until);
alter table public.school_configuration enable row level security;
alter table public.school_configuration force row level security;
revoke all on table public.school_configuration from public, anon, authenticated;
alter table public.staff_profiles enable row level security;
alter table public.staff_profiles force row level security;
revoke all on table public.staff_profiles from public, anon, authenticated;
alter table public.academic_years enable row level security;
alter table public.academic_years force row level security;
revoke all on table public.academic_years from public, anon, authenticated;
alter table public.classes enable row level security;
alter table public.classes force row level security;
revoke all on table public.classes from public, anon, authenticated;
alter table public.sections enable row level security;
alter table public.sections force row level security;
revoke all on table public.sections from public, anon, authenticated;
alter table public.students enable row level security;
alter table public.students force row level security;
revoke all on table public.students from public, anon, authenticated;
alter table public.guardians enable row level security;
alter table public.guardians force row level security;
revoke all on table public.guardians from public, anon, authenticated;
alter table public.student_guardian_relationships enable row level security;
alter table public.student_guardian_relationships force row level security;
revoke all on table public.student_guardian_relationships from public, anon, authenticated;
alter table public.parent_login_identities enable row level security;
alter table public.parent_login_identities force row level security;
revoke all on table public.parent_login_identities from public, anon, authenticated;
alter table public.enrollments enable row level security;
alter table public.enrollments force row level security;
revoke all on table public.enrollments from public, anon, authenticated;
alter table public.teacher_assignments enable row level security;
alter table public.teacher_assignments force row level security;
revoke all on table public.teacher_assignments from public, anon, authenticated;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
revoke all on table public.audit_events from public, anon, authenticated;
-- Domain reads/writes remain default-deny until verified purpose/assignment/context policies exist.
-- Verified link dates/status, distinct Student/Parent profiles, active accounts, context invalidation,
-- overlap-free enrollment/assignment history and last-Super-Admin concurrency require reviewed commands.
-- No account, school record, credential, PIN verifier, Storage bucket or financial ledger is seeded.
commit;
