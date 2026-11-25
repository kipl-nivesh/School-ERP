begin;

-- Keep these defaults within the existing application and database role ceilings.
-- Apply them only when a managed invitation creates a new membership.
create function app_private.default_managed_staff_permissions(p_role text) returns text[]
language sql immutable set search_path='' as $$
  select case p_role
    when 'teacher' then array[
      'dashboard.teacher.view', 'students.read', 'attendance.read', 'attendance.write',
      'homework.read', 'homework.write', 'marks.read', 'marks.write', 'reports.read',
      'announcements.read', 'announcements.write', 'documents.read'
    ]::text[]
    when 'accountant' then array[
      'dashboard.accountant.view', 'fees.read', 'fees.write', 'payments.read', 'payments.record',
      'expenses.read', 'expenses.write', 'receipts.read', 'reports.read', 'reports.export',
      'announcements.read', 'documents.read', 'audit.read'
    ]::text[]
  end
$$;
alter function app_private.default_managed_staff_permissions(text) owner to postgres;
revoke all on function app_private.default_managed_staff_permissions(text)
  from public, anon, authenticated, service_role;

-- CREATE OR REPLACE preserves the existing RPC owner and execution grants.
create or replace function public.accept_staff_invitation(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare invitation public.staff_invitations; email_address text; candidate_school uuid;
begin
  if public.staff_session_is_live() is not true or p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  select email into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if email_address is null then return false; end if;
  select i.school_id into candidate_school from public.staff_invitations i
    where i.invitation_token='sha256:'||encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if candidate_school is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(candidate_school::text,0));
  select * into invitation from public.staff_invitations
    where school_id=candidate_school and invitation_token='sha256:'||encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  if not found or invitation.status<>'pending' or invitation.expires_at<=now()
    or invitation.role_code not in ('teacher','accountant') or lower(invitation.email) is distinct from lower(email_address)
    or not exists(select 1 from public.schools where id=candidate_school and status='active') then return false; end if;

  -- A family or administrator account must not be repurposed by a staff invitation.
  if invitation.managed_staff and exists(select 1 from public.user_roles m
    where m.profile_id=auth.uid() and m.role_code not in ('teacher','accountant')
      and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now()))
  then return false; end if;
  if invitation.managed_staff and (
    exists(select 1 from public.staff_profiles s where s.school_id=candidate_school
      and (s.profile_id=auth.uid() or lower(s.email)=lower(email_address)
        or lower(s.employee_code)=lower(invitation.employee_code)))
    or exists(select 1 from public.user_roles where profile_id=auth.uid() and school_id=candidate_school)
  ) then raise exception 'Duplicate staff details' using errcode='23505'; end if;
  if exists(select 1 from public.user_roles where profile_id=auth.uid() and school_id=candidate_school
    and role_code=invitation.role_code and membership_status='revoked') then return false; end if;

  insert into public.profiles(id,account_status,credential_reset_required)
    values(auth.uid(),'active',false) on conflict(id) do nothing;
  if not exists(select 1 from public.profiles where id=auth.uid() and account_status='active'
    and not credential_reset_required for update)
  then return false; end if;

  if invitation.managed_staff then
    insert into public.staff_profiles(profile_id,school_id,display_name,email,employee_code,department,phone,is_active)
      values(auth.uid(),candidate_school,invitation.display_name,email_address,invitation.employee_code,
        invitation.department,invitation.phone,invitation.start_active);
    insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
      values(auth.uid(),candidate_school,invitation.role_code,case when invitation.start_active then 'active' else 'suspended' end,
        app_private.default_managed_staff_permissions(invitation.role_code));
  else
    insert into public.staff_profiles(profile_id,school_id,display_name,email)
      values(auth.uid(),candidate_school,invitation.display_name,email_address) on conflict(profile_id,school_id) do nothing;
    insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
      values(auth.uid(),candidate_school,invitation.role_code,'active',array['dashboard.'||invitation.role_code||'.view'])
      on conflict(profile_id,school_id,role_code) do nothing;
  end if;
  update public.staff_invitations set status='accepted',accepted_at=now(),updated_at=now() where id=invitation.id;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(auth.uid(),'staff_invitation_accepted',candidate_school,jsonb_build_object('invitation_id',invitation.id));
  return true;
end $$;

commit;
