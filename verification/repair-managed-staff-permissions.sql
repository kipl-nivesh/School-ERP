-- Owner-approved maintenance only, after migration 030.
-- Replace all four NULL placeholders with the independently verified UUIDs.
-- Use one approved membership per transaction. No broad backfill.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $repair$
declare
  target_membership constant uuid := null; -- public.user_roles.id
  target_school constant uuid := null; -- public.schools.id
  target_profile constant uuid := null; -- public.profiles.id
  target_invitation constant uuid := null; -- accepted managed staff invitation
  repaired_role text;
begin
  if target_membership is null or target_school is null
    or target_profile is null or target_invitation is null then
    raise exception 'Supply the four reviewed identifiers before running the repair';
  end if;

  update public.user_roles m
    set permissions = app_private.default_managed_staff_permissions(m.role_code)
    where m.id = target_membership
      and m.school_id = target_school
      and m.profile_id = target_profile
      and m.role_code in ('teacher', 'accountant')
      and m.membership_status in ('active', 'suspended')
      and m.permissions = array['dashboard.' || m.role_code || '.view']
      and exists (
        select 1
        from public.staff_invitations i
        join public.audit_events e
          on e.school_id = i.school_id
          and e.event_type = 'staff_invitation_accepted'
          and e.details->>'invitation_id' = i.id::text
        where i.id = target_invitation
          and i.school_id = m.school_id
          and i.role_code = m.role_code
          and i.managed_staff is true
          and i.status = 'accepted'
          and i.accepted_at is not null
          and m.valid_from = i.accepted_at
          and e.actor_profile_id = m.profile_id
      )
    returning m.role_code into repaired_role;

  if not found then
    raise exception 'No matching dashboard-only managed membership repaired';
  end if;

  insert into public.audit_events(target_profile_id, event_type, school_id, details)
    values (target_profile, 'managed_staff_permissions_repaired', target_school,
      jsonb_build_object('membership_id', target_membership,
        'invitation_id', target_invitation, 'role', repaired_role));
end
$repair$;

commit;
