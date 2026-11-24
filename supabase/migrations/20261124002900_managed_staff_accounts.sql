begin;

-- Match the school-local lower() comparisons in all managed staff RPCs.
-- Preserve stored case and build the replacement before dropping the old constraint.
create unique index staff_profiles_school_employee_code_ci_key
  on public.staff_profiles (school_id, lower(employee_code))
  where employee_code is not null;

alter table public.staff_profiles drop constraint staff_profiles_employee_code_key restrict;

alter table public.user_roles drop constraint user_roles_membership_status_check;
alter table public.user_roles add constraint user_roles_membership_status_check
  check (membership_status in ('active','suspended','revoked'));

alter table public.staff_invitations
  add column managed_staff boolean not null default false,
  add column employee_code text,
  add column department text,
  add column phone text,
  add column start_active boolean not null default true;

-- All mutations resolve the school from the signed native Admin session.
create function app_private.managed_staff_school(p_permission text) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin();
begin
  if public.current_role_has_permission(p_permission) is not true
    or not exists (select 1 from auth.mfa_factors f
      where f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp')
    or not exists (select 1 from jsonb_array_elements(
      case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]'::jsonb end
    ) method where case jsonb_typeof(method) when 'object' then method->>'method' else method#>>'{}' end in ('totp','mfa'))
  then raise exception 'Access denied' using errcode='42501'; end if;
  return school;
end $$;
revoke all on function app_private.managed_staff_school(text) from public,anon,authenticated,service_role;

create function app_private.validate_managed_staff_details(p_code text,p_department text,p_phone text) returns void
language plpgsql immutable set search_path='' as $$
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$'
    or coalesce(length(p_department),0)>100 or coalesce(p_department,'') ~ '[[:cntrl:]]'
    or coalesce(p_phone,'') !~ '^[+0-9 ().-]{0,30}$'
  then raise exception 'Invalid staff details' using errcode='22023'; end if;
end $$;
revoke all on function app_private.validate_managed_staff_details(text,text,text) from public,anon,authenticated,service_role;

create function public.issue_managed_staff_invitation(
  p_email text,p_name text,p_role text,p_token_hash text,p_code text,p_department text,p_phone text,p_active boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.managed_staff_school('security.accounts.create'); invitation_id uuid;
begin
  perform app_private.validate_managed_staff_details(p_code,p_department,p_phone);
  if p_active is null then raise exception 'Invalid staff status' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(school::text,0));
  if exists(select 1 from public.staff_profiles s left join auth.users u on u.id=s.profile_id
    where s.school_id=school and (lower(s.employee_code)=lower(p_code)
      or lower(s.email)=lower(trim(p_email)) or lower(u.email)=lower(trim(p_email))))
    or exists(select 1 from public.staff_invitations i where i.school_id=school and i.status='pending'
      and i.expires_at>now() and (lower(i.employee_code)=lower(p_code) or lower(i.email)=lower(trim(p_email))))
  then raise exception 'Duplicate staff details' using errcode='23505'; end if;
  -- Reuse role-assign permission, token hashing, expiry, and invitation auditing.
  invitation_id:=public.issue_staff_invitation(p_email,p_name,p_role,p_token_hash);
  update public.staff_invitations set managed_staff=true,employee_code=p_code,
    department=nullif(p_department,''),phone=nullif(p_phone,''),start_active=p_active
  where id=invitation_id and school_id=school;
  return invitation_id;
end $$;

-- Only a live, exact bearer-token/email pair can start provider email confirmation.
-- This RPC returns no invitation or staff data.
create function public.managed_staff_invitation_matches(p_token text,p_email text) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(p_token ~ '^[0-9a-f]{64}$' and length(p_email)<=254 and exists(
    select 1 from public.staff_invitations i join public.schools s on s.id=i.school_id
    where i.managed_staff and i.status='pending' and i.expires_at>now() and s.status='active'
      and i.role_code in ('teacher','accountant') and lower(i.email)=lower(trim(p_email))
      and i.invitation_token='sha256:'||encode(sha256(convert_to(p_token,'UTF8')),'hex')
  ),false)
$$;

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
        array['dashboard.'||invitation.role_code||'.view']);
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

create function public.manage_school_staff(
  p_membership uuid,p_intent text,p_name text default null,p_code text default null,p_department text default null,p_phone text default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare permission text; school uuid; target public.user_roles; reset_email text;
begin
  permission:=case p_intent when 'edit' then 'security.accounts.update'
    when 'activate' then 'security.accounts.suspend' when 'deactivate' then 'security.accounts.suspend'
    when 'reset' then 'security.credentials.reset' end;
  if permission is null then return false; end if;
  school:=app_private.managed_staff_school(permission);
  perform pg_advisory_xact_lock(hashtextextended(school::text,0));

  select m.* into target from public.user_roles m join public.staff_profiles s
    on s.profile_id=m.profile_id and s.school_id=m.school_id
    where m.id=p_membership and m.school_id=school and m.role_code in ('teacher','accountant')
      and m.membership_status in ('active','suspended') and m.valid_from<=now()
      and (m.valid_until is null or m.valid_until>now()) for update of m;
  if not found or exists(select 1 from public.user_roles m where m.profile_id=target.profile_id
    and m.school_id=school and m.role_code not in ('teacher','accountant')) then return false; end if;

  if p_intent='edit' then
    perform app_private.validate_managed_staff_details(p_code,p_department,p_phone);
    if p_name is null or length(trim(p_name)) not between 2 and 160 or p_name ~ '[[:cntrl:]]'
    then raise exception 'Invalid staff details' using errcode='22023'; end if;
    if exists(select 1 from public.staff_profiles s where s.school_id=school and s.profile_id<>target.profile_id
      and lower(s.employee_code)=lower(p_code))
      or exists(select 1 from public.staff_invitations i where i.school_id=school and i.status='pending'
      and i.expires_at>now() and lower(i.employee_code)=lower(p_code))
    then raise exception 'Duplicate employee ID' using errcode='23505'; end if;
    update public.staff_profiles set display_name=trim(p_name),employee_code=p_code,
      department=nullif(p_department,''),phone=nullif(p_phone,'')
      where profile_id=target.profile_id and school_id=school;
  elsif p_intent in ('activate','deactivate') then
    if p_intent='activate' then
      if not exists(select 1 from public.profiles p where p.id=target.profile_id and p.account_status='active'
        and not p.credential_reset_required) then return false; end if;
      update public.user_roles set membership_status='active' where id=target.id and membership_status='suspended';
    else
      update public.user_roles set membership_status='suspended'
        where profile_id=target.profile_id and school_id=school and role_code in ('teacher','accountant')
          and membership_status='active';
    end if;
    update public.staff_profiles set is_active=exists(select 1 from public.user_roles m
      where m.profile_id=target.profile_id and m.school_id=school and m.membership_status='active'
        and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now()))
      where profile_id=target.profile_id and school_id=school;
  else
    select email into reset_email from auth.users where id=target.profile_id and email_confirmed_at is not null;
    if reset_email is null or target.membership_status <> 'active' then return false; end if;
  end if;
  insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id,details)
    values(auth.uid(),target.profile_id,'managed_staff_'||p_intent,school,jsonb_build_object('membership_id',target.id));
  return true;
end $$;

create function public.list_managed_school_staff(p_search text,p_status text,p_role text,p_offset integer)
returns table(membership_id uuid,display_name text,email text,employee_code text,department text,phone text,role_code text,account_status text)
language plpgsql stable security definer set search_path='' as $$
declare school uuid:=app_private.managed_staff_school('staff.read');
begin
  if coalesce(length(p_search),81)>80 or p_status is null or p_status not in ('','active','inactive')
    or p_role is null or p_role not in ('','teacher','accountant') or p_offset is null or p_offset not between 0 and 24975
  then raise exception 'Invalid filters' using errcode='22023'; end if;
  return query
  select case when exists(select 1 from public.user_roles other
    where other.profile_id=s.profile_id and other.school_id=school
      and other.role_code not in ('teacher','accountant')) then null else m.id end,
    s.display_name::text,coalesce(u.email,s.email)::text,s.employee_code,s.department,s.phone,m.role_code,
    case when m.id is null then 'unassigned' when m.membership_status='revoked' then 'revoked'
      when m.valid_from>now() or (m.valid_until is not null and m.valid_until<=now())
        or p.account_status<>'active' or p.credential_reset_required then 'unavailable'
      when m.membership_status='active' and p.account_status='active' and not p.credential_reset_required then 'active'
      else 'inactive' end
  from public.staff_profiles s
  join public.profiles p on p.id=s.profile_id
  left join auth.users u on u.id=s.profile_id
  left join public.user_roles m on m.profile_id=s.profile_id and m.school_id=s.school_id and m.role_code in ('admin','teacher','accountant')
  where s.school_id=school
    and (p_role='' or m.role_code=p_role)
    and (p_status='' or (p_status='active')=coalesce(m.membership_status='active'
      and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now())
      and p.account_status='active' and not p.credential_reset_required,false))
    and (p_search='' or strpos(lower(concat_ws(' ',s.display_name,coalesce(u.email,s.email),s.employee_code,s.department)),lower(p_search))>0)
  order by s.display_name,s.profile_id,m.id offset p_offset limit 26;
end $$;

revoke all on function public.issue_managed_staff_invitation(text,text,text,text,text,text,text,boolean),
  public.manage_school_staff(uuid,text,text,text,text,text),public.list_managed_school_staff(text,text,text,integer),
  public.managed_staff_invitation_matches(text,text) from public,anon,authenticated,service_role;
grant execute on function public.issue_managed_staff_invitation(text,text,text,text,text,text,text,boolean),
  public.manage_school_staff(uuid,text,text,text,text,text),public.list_managed_school_staff(text,text,text,integer) to authenticated;
grant execute on function public.managed_staff_invitation_matches(text,text) to anon,authenticated;
commit;
