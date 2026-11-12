begin;
-- Recovery sessions need not carry a password AMR. They still require a native,
-- confirmed, live identity. This command grants no role or application context.
create function public.staff_recovery_scope() returns jsonb
language sql stable security definer set search_path='' as $$
  select case when
    auth.uid() is not null
    and auth.jwt()->>'iss'='https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'
    and auth.jwt()->>'role'='authenticated'
    and (auth.jwt()->>'aud'='authenticated' or auth.jwt()->'aud' @> '["authenticated"]'::jsonb)
    and case when jsonb_typeof(auth.jwt()->'exp')='number' then (auth.jwt()->>'exp')::numeric>extract(epoch from now()) else false end
    and exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
      where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid() and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=now()))
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active')
    and exists(select 1 from public.user_roles m join public.schools s on s.id=m.school_id
      where m.profile_id=auth.uid() and m.role_code in ('admin','teacher','accountant') and m.membership_status='active'
        and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now()) and s.status='active')
    then jsonb_build_object('eligible',true,'requires_mfa',exists(
      select 1 from public.user_roles m join public.schools s on s.id=m.school_id
      where m.profile_id=auth.uid() and m.role_code='admin' and m.membership_status='active'
        and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now()) and s.status='active'))
    else null end
$$;
revoke all on function public.staff_recovery_scope() from public,anon,service_role;
grant execute on function public.staff_recovery_scope() to authenticated;
commit;
