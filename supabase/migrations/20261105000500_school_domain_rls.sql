-- Step 18 Migration 5: School Domain Schema, Financial Integrity & RLS Policies (Draft)
-- Extends the 18 foundation tables with domain entities, strict integer-paise financial constraints,
-- idempotency enforcement, payment immutability triggers, and role-scoped RLS policies.
-- LOCAL DRAFT ONLY. NOT EXECUTED ON PRODUCTION DATABASE.
begin;

-- =============================================================================
-- 1. Schema Enhancements on Existing Tables
-- =============================================================================

alter table public.school_configuration
  add column if not exists affiliation_code text,
  add column if not exists board text default 'CBSE',
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists currency_code text default 'INR',
  add column if not exists currency_symbol text default '₹',
  add column if not exists operational_hours text,
  add column if not exists emergency_contact text;

alter table public.staff_profiles
  add column if not exists employee_code text unique,
  add column if not exists department text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists is_active boolean not null default true;

alter table public.students
  add column if not exists roll_number text,
  add column if not exists date_of_birth date,
  add column if not exists gender text check (gender in ('male', 'female', 'other')),
  add column if not exists house text,
  add column if not exists blood_group text;

-- =============================================================================
-- 2. New Domain Tables
-- =============================================================================

-- Daily Attendance
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  remarks text,
  recorded_by_profile_id uuid not null references public.staff_profiles(profile_id),
  created_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);
create index if not exists attendance_section_date_idx on public.attendance_records(section_id, attendance_date);

-- Homework
create table if not exists public.homework_assignments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete restrict,
  subject_code text not null,
  title text not null check (length(title) between 1 and 200),
  description text not null,
  assigned_date date not null default current_date,
  due_date date not null,
  max_points integer not null check (max_points > 0),
  teacher_profile_id uuid not null references public.staff_profiles(profile_id),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  check (due_date >= assigned_date)
);
create index if not exists homework_section_idx on public.homework_assignments(section_id, status);

-- Exam Marksheets & Entries
create table if not exists public.marks_sheets (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete restrict,
  exam_name text not null check (length(exam_name) between 1 and 100),
  subject_code text not null,
  exam_date date not null,
  max_marks integer not null check (max_marks > 0),
  passing_marks integer not null check (passing_marks > 0 and passing_marks <= max_marks),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by_profile_id uuid not null references public.staff_profiles(profile_id),
  created_at timestamptz not null default now(),
  unique (section_id, exam_name, subject_code)
);

create table if not exists public.marks_entries (
  id uuid primary key default gen_random_uuid(),
  marks_sheet_id uuid not null references public.marks_sheets(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  marks_obtained numeric not null check (marks_obtained >= 0),
  remarks text,
  unique (marks_sheet_id, student_id)
);
create index if not exists marks_entries_student_idx on public.marks_entries(student_id);

-- Timetable
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete restrict,
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  period_number integer not null check (period_number between 1 and 10),
  start_time time not null,
  end_time time not null,
  subject_code text not null,
  room_number text not null,
  teacher_profile_id uuid not null references public.staff_profiles(profile_id),
  unique (section_id, day_of_week, period_number),
  unique (teacher_profile_id, day_of_week, period_number),
  check (end_time > start_time)
);

-- Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  content text not null,
  target_audience text not null check (target_audience in ('all', 'staff', 'students', 'parents')),
  category text not null default 'general',
  is_urgent boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  author_profile_id uuid not null references public.staff_profiles(profile_id),
  check (expires_at is null or expires_at > published_at)
);

-- =============================================================================
-- 3. Financial Schema & Integrity Constraints (Integer Paise)
-- =============================================================================

-- Fee Structure
create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  fee_category text not null check (fee_category in ('tuition', 'laboratory', 'library', 'sports', 'transport', 'admission', 'examination', 'other')),
  amount_paise bigint not null check (amount_paise > 0),
  frequency text not null check (frequency in ('monthly', 'quarterly', 'annual', 'one_time')),
  due_date date not null,
  created_at timestamptz not null default now(),
  unique (class_id, fee_category, frequency)
);

-- Student Fee Invoices
create table if not exists public.fee_invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  invoice_number text not null unique check (length(invoice_number) between 3 and 50),
  title text not null,
  issue_date date not null default current_date,
  due_date date not null,
  amount_paise bigint not null check (amount_paise > 0),
  paid_paise bigint not null default 0 check (paid_paise >= 0 and paid_paise <= amount_paise),
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  check (due_date >= issue_date)
);
create index if not exists fee_invoices_student_idx on public.fee_invoices(student_id, status);

-- Payments & Receipts (Immutable once settled)
create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  invoice_id uuid references public.fee_invoices(id) on delete restrict,
  receipt_number text not null unique check (length(receipt_number) between 3 and 50),
  amount_paise bigint not null check (amount_paise > 0),
  payment_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'cheque')),
  transaction_reference text not null check (length(transaction_reference) between 1 and 100),
  notes text,
  idempotency_key text not null unique check (length(idempotency_key) between 8 and 128),
  status text not null default 'settled' check (status in ('draft', 'settled', 'refunded')),
  collected_by_profile_id uuid not null references public.staff_profiles(profile_id),
  created_at timestamptz not null default now()
);
create index if not exists fee_payments_invoice_idx on public.fee_payments(invoice_id);
create index if not exists fee_payments_student_idx on public.fee_payments(student_id, payment_date);

-- Operating Expenses
create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  voucher_number text not null unique check (length(voucher_number) between 3 and 50),
  category text not null check (category in ('utilities', 'supplies', 'maintenance', 'salaries', 'events', 'other')),
  payee text not null check (length(payee) between 1 and 160),
  amount_paise bigint not null check (amount_paise > 0),
  expense_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'cheque')),
  description text not null,
  approved_by_profile_id uuid not null references public.staff_profiles(profile_id),
  created_at timestamptz not null default now()
);

-- Receipt sequence for sequential, audit-compliant receipt numbering
create sequence if not exists public.fee_payments_receipt_seq start with 1001;
alter sequence public.fee_payments_receipt_seq owner to postgres;
grant usage on sequence public.fee_payments_receipt_seq to authenticated;

-- Financial Immutability & State Transition Trigger
-- Enforces:
-- 1. Settled payments are immutable: cannot be updated or deleted.
-- 2. Permitted non-settled updates return NEW; permitted non-settled deletes return OLD (never silently cancelled).
-- 3. Explicit financial state transitions ('draft' -> 'settled' / 'failed').
-- 4. Financial attributes (student, invoice, amount, idempotency key) cannot be tampered with during settlement.
create or replace function app_private.reject_settled_payment_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- 1. If existing record is settled, reject all updates and deletes
  if old.status = 'settled' then
    raise exception 'Settled payment receipts are immutable financial records and cannot be updated or deleted. Corrections must be recorded as separate audit adjustments.'
      using errcode = '55P02';
  end if;

  -- 2. Handle DELETE on non-settled payments
  if tg_op = 'DELETE' then
    -- Must return OLD so non-settled rows are actually deleted, not silently cancelled!
    return old;
  end if;

  -- 3. Handle UPDATE on non-settled payments
  if tg_op = 'UPDATE' then
    if old.status = 'draft' then
      if new.status not in ('draft', 'settled', 'failed') then
        raise exception 'Invalid payment state transition from % to %.', old.status, new.status
          using errcode = '22023';
      end if;

      -- If transitioning to settled, core financial identity must not be modified
      if new.status = 'settled' then
        if new.student_id <> old.student_id
           or (new.invoice_id is distinct from old.invoice_id)
           or new.amount_paise <> old.amount_paise
           or new.idempotency_key <> old.idempotency_key then
          raise exception 'Financial attributes cannot be modified during payment settlement.'
            using errcode = '55P02';
        end if;
      end if;
    elsif old.status = 'failed' then
      if new.status <> 'failed' then
        raise exception 'Failed payments cannot be modified or settled. A new payment transaction must be initiated.'
          using errcode = '55P02';
      end if;
    else
      raise exception 'Unknown payment status %.', old.status
        using errcode = '22023';
    end if;

    -- Return NEW so valid updates take effect
    return new;
  end if;

  return null;
end;
$$;
revoke all on function app_private.reject_settled_payment_change() from public, anon, authenticated;

drop trigger if exists fee_payments_immutable on public.fee_payments;
create trigger fee_payments_immutable before update or delete on public.fee_payments
  for each row execute function app_private.reject_settled_payment_change();

-- Transactional Fee Collection Stored Procedure
-- Provides atomic invoice row locking, balance checking, idempotency collision detection,
-- sequential receipt numbering, invoice balance updates, and audit logging.
create or replace function public.collect_fee_payment_atomic(
  p_student_id uuid,
  p_invoice_id uuid,
  p_amount_paise bigint,
  p_payment_method text,
  p_transaction_reference text,
  p_idempotency_key text,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_session_live boolean;
  v_role text;
  v_invoice public.fee_invoices;
  v_new_paid bigint;
  v_new_status text;
  v_receipt_number text;
  v_seq_val bigint;
  v_payment_id uuid;
  v_existing public.fee_payments;
  v_remaining bigint;
begin
  -- 1. Check live session
  v_session_live := public.staff_session_is_live();
  if not v_session_live then
    return jsonb_build_object('success', false, 'error', 'Unauthenticated or revoked session', 'code', 'UNAUTHENTICATED');
  end if;

  -- 2. Verify active accountant or admin role context with valid permissions
  v_role := public.current_active_role();
  if v_role not in ('admin', 'accountant') or not public.current_role_has_permission('payments.record') then
    return jsonb_build_object('success', false, 'error', 'Insufficient permissions for fee collection', 'code', 'PERMISSION_DENIED');
  end if;

  -- 3. Idempotency Check
  select * into v_existing from public.fee_payments where idempotency_key = p_idempotency_key;
  if found then
    -- Ensure payment payload matches existing record; reject conflicting parameters with same key
    if v_existing.student_id <> p_student_id
       or (v_existing.invoice_id is distinct from p_invoice_id and p_invoice_id <> '00000000-0000-0000-0000-000000000000'::uuid)
       or v_existing.amount_paise <> p_amount_paise
       or v_existing.payment_method <> p_payment_method then
      return jsonb_build_object(
        'success', false,
        'error', 'Idempotency key collision: a payment with this idempotency key already exists with different parameters.',
        'code', 'IDEMPOTENCY_CONFLICT'
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'receipt_number', v_existing.receipt_number,
      'payment_id', v_existing.id,
      'amount_paise', v_existing.amount_paise,
      'message', 'Duplicate request recognized; returning existing settled receipt.'
    );
  end if;

  -- 4. Lock invoice row for atomic update
  select * into v_invoice from public.fee_invoices where id = p_invoice_id and student_id = p_student_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Target fee invoice not found', 'code', 'NOT_FOUND');
  end if;

  v_remaining := v_invoice.amount_paise - v_invoice.paid_paise;
  if p_amount_paise <= 0 or p_amount_paise > v_remaining then
    return jsonb_build_object('success', false, 'error', 'Payment amount exceeds invoice balance', 'code', 'INVALID_AMOUNT');
  end if;

  -- 5. Generate sequential receipt number using dedicated sequence
  v_seq_val := nextval('public.fee_payments_receipt_seq'::regclass);
  v_receipt_number := 'REC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq_val::text, 4, '0');
  v_payment_id := gen_random_uuid();

  -- 6. Insert settled payment
  insert into public.fee_payments (
    id, student_id, invoice_id, receipt_number, amount_paise, payment_date,
    payment_method, transaction_reference, notes, idempotency_key, status, collected_by_profile_id
  ) values (
    v_payment_id, p_student_id, p_invoice_id, v_receipt_number, p_amount_paise, current_date,
    p_payment_method, p_transaction_reference, p_notes, p_idempotency_key, 'settled', auth.uid()
  );

  -- 7. Update invoice balances
  v_new_paid := v_invoice.paid_paise + p_amount_paise;
  v_new_status := case when v_new_paid >= v_invoice.amount_paise then 'paid' else 'partial' end;

  update public.fee_invoices
  set paid_paise = v_new_paid, status = v_new_status
  where id = v_invoice.id;

  -- 8. Append immutable audit trail
  insert into public.audit_events (actor_profile_id, target_profile_id, event_type)
  values (auth.uid(), p_student_id, 'fee_payment_collected');

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_number', v_receipt_number,
    'amount_paise', p_amount_paise,
    'new_invoice_status', v_new_status,
    'remaining_balance_paise', v_invoice.amount_paise - v_new_paid
  );
end;
$$;
alter function public.collect_fee_payment_atomic(uuid, uuid, bigint, text, text, text, text) owner to postgres;
revoke all on function public.collect_fee_payment_atomic(uuid, uuid, bigint, text, text, text, text) from public, anon;
grant execute on function public.collect_fee_payment_atomic(uuid, uuid, bigint, text, text, text, text) to authenticated;

-- =============================================================================
-- 4. Row Level Security & Access Policies
-- =============================================================================

-- Enable & Force RLS on all domain tables
alter table public.attendance_records enable row level security;
alter table public.attendance_records force row level security;
revoke all on table public.attendance_records from public, anon, authenticated;

alter table public.homework_assignments enable row level security;
alter table public.homework_assignments force row level security;
revoke all on table public.homework_assignments from public, anon, authenticated;

alter table public.marks_sheets enable row level security;
alter table public.marks_sheets force row level security;
revoke all on table public.marks_sheets from public, anon, authenticated;

alter table public.marks_entries enable row level security;
alter table public.marks_entries force row level security;
revoke all on table public.marks_entries from public, anon, authenticated;

alter table public.timetable_slots enable row level security;
alter table public.timetable_slots force row level security;
revoke all on table public.timetable_slots from public, anon, authenticated;

alter table public.announcements enable row level security;
alter table public.announcements force row level security;
revoke all on table public.announcements from public, anon, authenticated;

alter table public.fee_structures enable row level security;
alter table public.fee_structures force row level security;
revoke all on table public.fee_structures from public, anon, authenticated;

alter table public.fee_invoices enable row level security;
alter table public.fee_invoices force row level security;
revoke all on table public.fee_invoices from public, anon, authenticated;

alter table public.fee_payments enable row level security;
alter table public.fee_payments force row level security;
revoke all on table public.fee_payments from public, anon, authenticated;

alter table public.operating_expenses enable row level security;
alter table public.operating_expenses force row level security;
revoke all on table public.operating_expenses from public, anon, authenticated;

-- Table Grants
grant select on public.school_configuration, public.academic_years, public.classes, public.sections,
  public.students, public.staff_profiles, public.enrollments, public.teacher_assignments,
  public.attendance_records, public.homework_assignments, public.marks_sheets, public.marks_entries,
  public.timetable_slots, public.announcements, public.fee_structures, public.fee_invoices,
  public.fee_payments, public.operating_expenses to authenticated;

grant insert, update on public.school_configuration, public.classes, public.sections, public.students,
  public.staff_profiles, public.enrollments, public.teacher_assignments, public.attendance_records,
  public.homework_assignments, public.marks_sheets, public.marks_entries, public.timetable_slots,
  public.announcements, public.fee_structures, public.fee_invoices, public.fee_payments,
  public.operating_expenses to authenticated;

-- Helper 1: Database-Validated Active Role Context (Prevents Recursive Policy Subqueries)
-- Validates:
-- 1. Authenticated user identity (auth.uid() = rc.profile_id = m.profile_id)
-- 2. Current provider session ID (rc.id::text = auth.jwt()->>'session_id')
-- 3. Live session evidence (public.staff_session_is_live() checks auth.sessions, auth.users)
-- 4. Active profile status (p.account_status = 'active' and not p.credential_reset_required)
-- 5. Stale version invalidation (p.authorization_version = rc.authorization_version)
-- 6. Role context expiration (rc.expires_at > now())
-- 7. Role context revocation (rc.revoked_at is null)
-- 8. Valid active role membership in public.user_roles (m.membership_status = 'active', valid_from <= now, valid_until)
-- 9. Permissions ceiling (dashboard.<role>.view is present in m.permissions)
-- 10. Mandatory MFA for admin role (AAL2 + TOTP factor verified + AMR confirms TOTP/MFA)
-- Security Definer bypasses RLS on identity tables to eliminate recursive policy loops.
create or replace function public.current_active_role() returns text
language sql stable security definer set search_path = '' as $$
  select rc.role_code
  from public.role_contexts rc
  join public.profiles p on p.id = rc.profile_id
  join public.user_roles m on m.id = rc.assignment_id
  where rc.id::text = auth.jwt()->>'session_id'
    and rc.profile_id = auth.uid()
    and rc.revoked_at is null
    and rc.expires_at > now()
    and p.account_status = 'active'
    and not p.credential_reset_required
    and p.authorization_version = rc.authorization_version
    and m.profile_id = auth.uid()
    and m.role_code = rc.role_code
    and m.membership_status = 'active'
    and m.valid_from <= now()
    and (m.valid_until is null or m.valid_until > now())
    and (('dashboard.' || rc.role_code || '.view') = any(m.permissions))
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
          where a->>'method' in ('totp', 'mfa')
        )
      )
    )
  limit 1;
$$;
alter function public.current_active_role() owner to postgres;
revoke all on function public.current_active_role() from public, anon;
grant execute on function public.current_active_role() to authenticated;

-- Helper 2: Database-Validated Permission Evaluator
create or replace function public.current_role_has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.role_contexts rc
    join public.profiles p on p.id = rc.profile_id
    join public.user_roles m on m.id = rc.assignment_id
    where rc.id::text = auth.jwt()->>'session_id'
      and rc.profile_id = auth.uid()
      and rc.revoked_at is null
      and rc.expires_at > now()
      and p.account_status = 'active'
      and not p.credential_reset_required
      and p.authorization_version = rc.authorization_version
      and m.profile_id = auth.uid()
      and m.role_code = rc.role_code
      and m.membership_status = 'active'
      and m.valid_from <= now()
      and (m.valid_until is null or m.valid_until > now())
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
            where a->>'method' in ('totp', 'mfa')
          )
        )
      )
      and (
        p_permission = any(m.permissions)
        or (rc.role_code = 'admin' and p_permission = any(array[
          'school.settings.read','school.settings.write','admissions.read','admissions.write',
          'students.read','staff.read','academics.manage','attendance.read','attendance.write',
          'homework.read','homework.write','marks.read','marks.write','marks.publish',
          'fees.read','fees.write','payments.read','payments.record','expenses.read','expenses.write',
          'receipts.read','reports.read','reports.export','announcements.read','announcements.write',
          'audit.read'
        ]::text[]))
      )
  );
$$;
alter function public.current_role_has_permission(text) owner to postgres;
revoke all on function public.current_role_has_permission(text) from public, anon;
grant execute on function public.current_role_has_permission(text) to authenticated;

-- =============================================================================
-- 4. Row Level Security Policies
-- =============================================================================

-- School Admin Full Management Policies
create policy admin_all_attendance on public.attendance_records for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_homework on public.homework_assignments for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_marks_sheets on public.marks_sheets for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_marks_entries on public.marks_entries for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_fee_structures on public.fee_structures for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_fee_invoices on public.fee_invoices for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_fee_payments on public.fee_payments for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_operating_expenses on public.operating_expenses for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_announcements on public.announcements for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

create policy admin_all_timetable on public.timetable_slots for all to authenticated
  using (public.current_active_role() = 'admin')
  with check (public.current_active_role() = 'admin');

-- Teacher Assigned-Class Scoped Policies
create policy teacher_assigned_attendance on public.attendance_records for all to authenticated
  using (
    public.current_active_role() = 'teacher'
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_profile_id = auth.uid()
        and ta.section_id = public.attendance_records.section_id
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  )
  with check (
    public.current_active_role() = 'teacher'
    and recorded_by_profile_id = auth.uid()
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_profile_id = auth.uid()
        and ta.section_id = public.attendance_records.section_id
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  );

create policy teacher_assigned_homework on public.homework_assignments for all to authenticated
  using (
    public.current_active_role() = 'teacher'
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_profile_id = auth.uid()
        and ta.section_id = public.homework_assignments.section_id
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  )
  with check (
    public.current_active_role() = 'teacher'
    and teacher_profile_id = auth.uid()
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_profile_id = auth.uid()
        and ta.section_id = public.homework_assignments.section_id
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  );

create policy teacher_assigned_marks_sheets on public.marks_sheets for all to authenticated
  using (
    public.current_active_role() = 'teacher'
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_profile_id = auth.uid()
        and ta.section_id = public.marks_sheets.section_id
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  )
  with check (
    public.current_active_role() = 'teacher'
    and created_by_profile_id = auth.uid()
    and exists (
      select 1 from public.teacher_assignments ta
      where ta.teacher_profile_id = auth.uid()
        and ta.section_id = public.marks_sheets.section_id
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  );

create policy teacher_assigned_marks_entries on public.marks_entries for all to authenticated
  using (
    public.current_active_role() = 'teacher'
    and exists (
      select 1 from public.marks_sheets ms
      join public.teacher_assignments ta on ta.section_id = ms.section_id
      where ms.id = public.marks_entries.marks_sheet_id
        and ta.teacher_profile_id = auth.uid()
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  )
  with check (
    public.current_active_role() = 'teacher'
    and exists (
      select 1 from public.marks_sheets ms
      join public.teacher_assignments ta on ta.section_id = ms.section_id
      where ms.id = public.marks_entries.marks_sheet_id
        and ta.teacher_profile_id = auth.uid()
        and ta.valid_from <= current_date
        and (ta.valid_until is null or ta.valid_until >= current_date)
    )
  );

create policy teacher_assigned_timetable on public.timetable_slots for select to authenticated
  using (
    public.current_active_role() = 'teacher'
    and teacher_profile_id = auth.uid()
  );

-- Accountant Financial Policies
create policy accountant_financial_read on public.fee_structures for select to authenticated
  using (public.current_active_role() in ('admin', 'accountant'));

create policy accountant_invoices_all on public.fee_invoices for all to authenticated
  using (public.current_active_role() in ('admin', 'accountant'))
  with check (public.current_active_role() in ('admin', 'accountant'));

create policy accountant_payments_all on public.fee_payments for all to authenticated
  using (public.current_active_role() in ('admin', 'accountant'))
  with check (public.current_active_role() in ('admin', 'accountant'));

create policy accountant_expenses_all on public.operating_expenses for all to authenticated
  using (public.current_active_role() in ('admin', 'accountant'))
  with check (public.current_active_role() in ('admin', 'accountant'));

-- Student Self-Access Policies
create policy student_attendance_self on public.attendance_records for select to authenticated
  using (student_id = auth.uid());

create policy student_homework_self on public.homework_assignments for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
        and e.section_id = public.homework_assignments.section_id
    )
  );

create policy student_marks_sheets_self on public.marks_sheets for select to authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
        and e.section_id = public.marks_sheets.section_id
    )
  );

create policy student_marks_entries_self on public.marks_entries for select to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1 from public.marks_sheets ms
      where ms.id = public.marks_entries.marks_sheet_id
        and ms.is_published = true
    )
  );

create policy student_timetable_self on public.timetable_slots for select to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
        and e.section_id = public.timetable_slots.section_id
    )
  );

create policy student_invoices_self on public.fee_invoices for select to authenticated
  using (student_id = auth.uid());

create policy student_payments_self on public.fee_payments for select to authenticated
  using (student_id = auth.uid());

-- Parent Verified-Child Scoped Policies
create policy parent_attendance_child on public.attendance_records for select to authenticated
  using (
    exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      where g.profile_id = auth.uid()
        and sgr.student_id = public.attendance_records.student_id
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
    )
  );

create policy parent_homework_child on public.homework_assignments for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id
      where g.profile_id = auth.uid()
        and e.section_id = public.homework_assignments.section_id
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
    )
  );

create policy parent_marks_sheets_child on public.marks_sheets for select to authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id
      where g.profile_id = auth.uid()
        and e.section_id = public.marks_sheets.section_id
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
    )
  );

create policy parent_marks_entries_child on public.marks_entries for select to authenticated
  using (
    exists (
      select 1 from public.marks_sheets ms
      where ms.id = public.marks_entries.marks_sheet_id
        and ms.is_published = true
    )
    and exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      where g.profile_id = auth.uid()
        and sgr.student_id = public.marks_entries.student_id
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
    )
  );

create policy parent_timetable_child on public.timetable_slots for select to authenticated
  using (
    exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      join public.enrollments e on e.student_id = sgr.student_id
      where g.profile_id = auth.uid()
        and e.section_id = public.timetable_slots.section_id
        and sgr.relationship_status = 'verified'
        and sgr.academic_access = true
    )
  );

create policy parent_invoices_child on public.fee_invoices for select to authenticated
  using (
    exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      where g.profile_id = auth.uid()
        and sgr.student_id = public.fee_invoices.student_id
        and sgr.relationship_status = 'verified'
        and sgr.fee_access = true
    )
  );

create policy parent_payments_child on public.fee_payments for select to authenticated
  using (
    exists (
      select 1 from public.student_guardian_relationships sgr
      join public.guardians g on g.id = sgr.guardian_id
      where g.profile_id = auth.uid()
        and sgr.student_id = public.fee_payments.student_id
        and sgr.relationship_status = 'verified'
        and sgr.fee_access = true
    )
  );

-- Read-only Broadcast Policies
create policy read_announcements on public.announcements for select to authenticated
  using (
    expires_at is null or expires_at > now()
  );

commit;
