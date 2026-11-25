begin;

-- Resolve the same native Student session checks through its UUID primary key.
create function app_private.read_live_student_scope()
returns table (school_id uuid, student_id uuid)
language sql stable security definer set search_path = '' as $$
    select rc.school_id, s.id from public.role_contexts rc
    join auth.sessions ses on ses.id = rc.id and ses.user_id = rc.profile_id
    join auth.users u on u.id = rc.profile_id
    join public.schools sc on sc.id = rc.school_id
    join public.profiles p on p.id = rc.profile_id
    join public.user_roles r on r.id = rc.assignment_id and r.profile_id = rc.profile_id
      and r.school_id = rc.school_id and r.role_code = 'student'
    join public.students s on s.profile_id = rc.profile_id and s.school_id = rc.school_id
    join public.pin_credentials c on c.student_id = s.id and c.school_id = rc.school_id
      and c.profile_id = rc.profile_id and c.credential_namespace = 'student'
    where rc.id = case when auth.jwt()->>'session_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (auth.jwt()->>'session_id')::uuid end
        and public.is_native_student_request() and rc.profile_id = auth.uid()
      and rc.role_code = 'student' and rc.revoked_at is null and rc.expires_at > now()
      and (ses.not_after is null or ses.not_after > now()) and (u.banned_until is null or u.banned_until <= now())
      and sc.status = 'active' and p.account_status = 'active' and not p.credential_reset_required
      and p.authorization_version = rc.authorization_version and r.membership_status = 'active'
      and 'dashboard.student.view' = any(r.permissions)
      and r.valid_from <= now() and (r.valid_until is null or r.valid_until > now())
      and s.enrollment_status = 'active' and s.portal_access_status = 'active'
      and c.credential_version = rc.context_version and c.status = 'active'
      and (c.expires_at is null or c.expires_at > now()) and (c.locked_until is null or c.locked_until <= now())
      and not exists (
        select 1 from public.user_roles other where other.profile_id = rc.profile_id
          and other.role_code <> 'student' and other.membership_status = 'active' and other.valid_from <= now()
          and (other.valid_until is null or other.valid_until > now())
      )
$$;

alter function app_private.read_live_student_scope() owner to postgres;
revoke all on function app_private.read_live_student_scope() from public, anon, authenticated, service_role;

create or replace function public.student_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app_private.read_live_student_scope());
$$;

-- The verified session already establishes school, role, membership and
-- credential validity. Resolve the existing Student entitlement in that scope.
create or replace function public.read_student_portal_identity()
returns table (school_id uuid, student_id uuid, school_name text, display_name text,
               registration_number text, database_date date)
language sql stable security definer set search_path = '' as $$
  select s.school_id, s.id, sc.name, s.display_name, s.registration_number, current_date
  from app_private.read_live_student_scope() live
  join public.students s on s.id = live.student_id and s.school_id = live.school_id
  join public.schools sc on sc.id = live.school_id
  join public.student_subscriptions sub on sub.student_id = s.id and sub.school_id = s.school_id
  where sub.trial_activated is true
    and sub.status_override is distinct from 'suspended'
    and (greatest(sub.trial_ends_at, sub.current_period_expires_at) > now()
      or public.is_payment_deferred_access_mode()) is true;
$$;

-- Resolve the identity once per statement. The caller's remaining permissive
-- and restrictive enrollment policies continue to apply.
alter policy enrollments_student_read on public.enrollments
  using ((school_id, student_id) in (
    select me.school_id, me.student_id from public.read_student_portal_identity() me
  ));

commit;
