begin;
create function public.portal_student_access(p_student uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare allowed boolean;
begin
 select a.is_access_granted into allowed from public.get_student_subscription_access(p_student) a;
 return coalesce(allowed,false);
exception when insufficient_privilege then return false;
end $$;
revoke all on function public.portal_student_access(uuid) from public,anon,service_role;
grant execute on function public.portal_student_access(uuid) to authenticated;
-- Restrictive policies AND with existing purpose/assignment RLS; cannot broaden access.
create policy students_subscription_gate on public.students as restrictive for select to authenticated
 using(public.current_active_role() in ('admin','teacher','accountant') or public.portal_student_access(id));
create policy attendance_subscription_gate on public.attendance_records as restrictive for select to authenticated
 using(public.current_active_role() in ('admin','teacher','accountant') or public.portal_student_access(student_id));
create policy invoices_subscription_gate on public.fee_invoices as restrictive for select to authenticated
 using(public.current_active_role() in ('admin','teacher','accountant') or public.portal_student_access(student_id));
create policy payments_subscription_gate on public.fee_payments as restrictive for select to authenticated
 using(public.current_active_role() in ('admin','teacher','accountant') or public.portal_student_access(student_id));
create policy marks_subscription_gate on public.marks_entries as restrictive for select to authenticated
 using(public.current_active_role() in ('admin','teacher','accountant') or public.portal_student_access(student_id));
create policy relationships_subscription_gate on public.student_guardian_relationships as restrictive for select to authenticated
 using(public.current_active_role() in ('admin','teacher','accountant') or public.portal_student_access(student_id));
commit;
