begin;
create function public.parent_student_purpose(p_student uuid, p_purpose text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_active_role() = 'parent' and public.current_school_id() is not null
    and exists (select 1 from public.student_guardian_relationships r
      join public.guardians g on g.id = r.guardian_id
      where r.student_id = p_student and r.school_id = public.current_school_id()
        and g.profile_id = auth.uid() and r.relationship_status = 'verified'
        and r.valid_from <= now() and (r.valid_until is null or r.valid_until > now())
        and case p_purpose
          when 'academic' then r.academic_access and public.current_role_has_permission('children.academics.read')
          when 'fee' then r.fee_access and public.current_role_has_permission('children.fees.read')
          else false end)
$$;
revoke all on function public.parent_student_purpose(uuid,text) from public,anon,service_role;
grant execute on function public.parent_student_purpose(uuid,text) to authenticated;

-- Restrict existing permissive policies. Neither purpose grants the other.
create policy students_parent_purpose on public.students as restrictive for select to authenticated
using (public.current_active_role() <> 'parent' or public.parent_student_purpose(id,'academic') or public.parent_student_purpose(id,'fee'));
create policy attendance_parent_purpose on public.attendance_records as restrictive for select to authenticated
using (public.current_active_role() <> 'parent' or public.parent_student_purpose(student_id,'academic'));
create policy marks_parent_purpose on public.marks_entries as restrictive for select to authenticated
using (public.current_active_role() <> 'parent' or public.parent_student_purpose(student_id,'academic'));
create policy invoices_parent_purpose on public.fee_invoices as restrictive for select to authenticated
using (public.current_active_role() <> 'parent' or public.parent_student_purpose(student_id,'fee'));
create policy payments_parent_purpose on public.fee_payments as restrictive for select to authenticated
using (public.current_active_role() <> 'parent' or public.parent_student_purpose(student_id,'fee'));
create policy relationships_parent_purpose on public.student_guardian_relationships as restrictive for select to authenticated
using (public.current_active_role() <> 'parent' or public.parent_student_purpose(student_id,'academic') or public.parent_student_purpose(student_id,'fee'));
create or replace function public.get_student_subscription_access(p_student_id uuid)
returns table(is_access_granted boolean,status text,trial_activated boolean,trial_ends_at timestamptz,current_period_expires_at timestamptz,remaining_seconds bigint)
language plpgsql stable security definer set search_path = '' as $$
declare stu public.students; sub public.student_subscriptions; school uuid; expiry timestamptz;
begin
 school:=public.current_school_id();
 if school is null then raise exception 'Access denied' using errcode='42501'; end if;
 select * into stu from public.students where id=p_student_id and school_id=school;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 if not exists(select 1 from public.user_roles m where m.profile_id=auth.uid() and m.school_id=school
  and m.role_code=(select rc.role_code from public.role_contexts rc where rc.id::text=auth.jwt()->>'session_id' and rc.profile_id=auth.uid() and rc.school_id=school and rc.revoked_at is null)
  and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now())
  and (m.role_code in ('admin','accountant') or (m.role_code='student' and stu.profile_id=auth.uid())
   or (m.role_code='parent' and exists(select 1 from public.student_guardian_relationships r
    join public.guardians g on g.id=r.guardian_id
    where r.student_id=stu.id and r.school_id=school and g.profile_id=auth.uid()
    and r.relationship_status='verified' and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()) and (public.parent_student_purpose(stu.id,'academic') or public.parent_student_purpose(stu.id,'fee'))))))
 then raise exception 'Access denied' using errcode='42501'; end if;
 if not exists(select 1 from public.user_roles sm where sm.profile_id=stu.profile_id and sm.school_id=school and sm.role_code='student' and sm.membership_status='active' and sm.valid_from<=now() and (sm.valid_until is null or sm.valid_until>now())) or stu.portal_access_status<>'active' or stu.enrollment_status<>'active' or not exists(
  select 1 from public.profiles where id=stu.profile_id and account_status='active' and not credential_reset_required)
 then return query select false,'activation_required'::text,false,null::timestamptz,null::timestamptz,0::bigint; return; end if;
 select * into sub from public.student_subscriptions where student_id=stu.id and school_id=school;
 if not found or not sub.trial_activated then
  return query select false,'unregistered'::text,false,null::timestamptz,null::timestamptz,0::bigint; return;
 end if;
 if sub.status_override='suspended' then
  return query select false,'suspended'::text,sub.trial_activated,sub.trial_ends_at,sub.current_period_expires_at,0::bigint; return;
 end if;
 expiry:=greatest(sub.trial_ends_at,sub.current_period_expires_at);
 return query select expiry>now() or public.is_payment_deferred_access_mode(),
  case when sub.current_period_expires_at>now() then 'subscription_active' when sub.trial_ends_at>now() then 'trial_active'
   when public.is_payment_deferred_access_mode() then 'payment_deferred_access' else 'expired' end,
  sub.trial_activated,sub.trial_ends_at,sub.current_period_expires_at,greatest(0,extract(epoch from expiry-now())::bigint);
end
$$;
commit;
