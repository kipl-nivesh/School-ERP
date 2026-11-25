begin;

set local lock_timeout = '5s';

-- These expressions depend only on the current request, not on the candidate
-- invoice or payment row. Uncorrelated scalar subqueries let PostgreSQL
-- evaluate them once per statement while retaining the original predicates.
alter policy invoices_staff_permission on public.fee_invoices using (
  (select public.current_active_role()) not in ('admin', 'accountant')
  or (select public.current_role_has_permission('fees.read'))
);

alter policy payments_staff_permission on public.fee_payments using (
  (select public.current_active_role()) not in ('admin', 'accountant')
  or (select public.current_role_has_permission('payments.read'))
  or (select public.current_role_has_permission('receipts.read'))
);

-- Keep the existing marks-sheet and enrollment checks under the caller's
-- RLS. Non-inlined invoker functions keep the nested marks-sheet policy
-- plans out of the outer marks-entry policy plan.
create function app_private.marks_entry_sheet_visible(p_sheet uuid, p_school uuid)
returns boolean
language plpgsql stable security invoker set search_path = ''
as $$
begin
  return exists (
    select 1 from public.marks_sheets sheet
    where sheet.id = p_sheet and sheet.school_id = p_school
  );
end;
$$;

create function app_private.marks_entry_staff_visible(p_sheet uuid, p_school uuid, p_student uuid)
returns boolean
language plpgsql stable security invoker set search_path = ''
as $$
begin
  return exists (
    select 1 from public.marks_sheets sheet
    where sheet.id = p_sheet and sheet.school_id = p_school
      and public.staff_enrollment_access(p_student, sheet.section_id, 'marks.read')
  );
end;
$$;

revoke all on function app_private.marks_entry_sheet_visible(uuid, uuid),
  app_private.marks_entry_staff_visible(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function app_private.marks_entry_sheet_visible(uuid, uuid),
  app_private.marks_entry_staff_visible(uuid, uuid, uuid)
  to authenticated;

alter policy marks_entries_staff_read on public.marks_entries using (
  school_id = (select public.current_school_id())
  and app_private.marks_entry_staff_visible(marks_sheet_id, school_id, student_id)
);

alter policy marks_entries_teacher_subject_scope on public.marks_entries using (
  (select public.current_active_role()) is distinct from 'teacher' or (
    (select public.current_role_has_permission('marks.read'))
    and school_id = (select public.current_school_id())
    and app_private.marks_entry_sheet_visible(marks_sheet_id, school_id)
  )
);

commit;
