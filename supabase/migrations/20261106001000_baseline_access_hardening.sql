-- Local Step 24A correction. Never applied to production.
begin;
create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
 select rc.school_id from public.role_contexts rc
 join public.profiles p on p.id=rc.profile_id
 join public.user_roles m on m.id=rc.assignment_id and m.profile_id=p.id
  and m.school_id=rc.school_id and m.role_code=rc.role_code
 join public.schools s on s.id=rc.school_id
 where public.staff_session_is_live() and rc.id::text=auth.jwt()->>'session_id'
  and p.id=auth.uid() and p.account_status='active' and not p.credential_reset_required
  and rc.revoked_at is null and rc.expires_at>now() and rc.authorization_version=p.authorization_version
  and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now())
  and s.status='active' and (m.role_code<>'admin' or auth.jwt()->>'aal'='aal2')
 limit 1
$$;
revoke all on function public.current_school_id() from public, anon;
grant execute on function public.current_school_id() to authenticated;

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
  and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now())
  and (m.role_code in ('admin','accountant') or (m.role_code='student' and stu.profile_id=auth.uid())
   or (m.role_code='parent' and exists(select 1 from public.student_guardian_relationships r
    join public.guardians g on g.id=r.guardian_id
    where r.student_id=stu.id and r.school_id=school and g.profile_id=auth.uid()
    and r.relationship_status='verified' and r.valid_from<=now() and (r.valid_until is null or r.valid_until>now()) and r.fee_access))))
 then raise exception 'Access denied' using errcode='42501'; end if;
 if stu.portal_access_status<>'active' or stu.enrollment_status<>'active' or not exists(
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
revoke all on function public.get_student_subscription_access(uuid) from public, anon, service_role;
grant execute on function public.get_student_subscription_access(uuid) to authenticated;
-- Existing definer routines use current_user=postgres as authorization. That is always
-- the owner inside these functions. Quarantine client execution pending reviewed replacements.
revoke all on function public.activate_student_portal_access(uuid,uuid) from public, anon, authenticated;
commit;
