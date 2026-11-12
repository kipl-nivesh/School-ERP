-- Local draft only. Preserve invitation records; replace bearer values with digests.
begin;
update public.staff_invitations set invitation_token='sha256:'||encode(sha256(convert_to(invitation_token,'UTF8')),'hex')
 where invitation_token not like 'sha256:%';
create function app_private.hash_invitation_token() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.invitation_token !~ '^sha256:[0-9a-f]{64}$' then
 new.invitation_token:='sha256:'||encode(sha256(convert_to(new.invitation_token,'UTF8')),'hex'); end if;
 return new;
end $$;
revoke all on function app_private.hash_invitation_token() from public,anon,authenticated,service_role;
create trigger invitations_hash_only before insert or update of invitation_token on public.staff_invitations
 for each row execute function app_private.hash_invitation_token();
create function public.issue_staff_invitation(p_email text,p_name text,p_role text,p_token_hash text) returns uuid
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); result uuid;
begin
 if p_token_hash !~ '^[0-9a-f]{64}$' or p_role not in ('teacher','accountant') then raise exception 'Invalid invitation'; end if;
 insert into public.staff_invitations(school_id,email,display_name,role_code,invitation_token,invited_by)
 values(school,lower(trim(p_email)),p_name,p_role,'sha256:'||p_token_hash,auth.uid()) returning id into result;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'staff_invitation_issued',school,jsonb_build_object('invitation_id',result));
 return result;
end $$;
create function public.revoke_staff_invitation(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin();
begin
 update public.staff_invitations set status='revoked',updated_at=now() where id=p_id and school_id=school and status='pending';
 if not found then return false; end if;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'staff_invitation_revoked',school,jsonb_build_object('invitation_id',p_id));
 return true;
end $$;
create function public.accept_staff_invitation(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare invitation public.staff_invitations; email_address text;
begin
 if not public.staff_session_is_live() or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
 select email into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into invitation from public.staff_invitations
 where invitation_token='sha256:'||encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or invitation.status<>'pending' or invitation.expires_at<=now() or lower(invitation.email) is distinct from lower(email_address)
 or not exists(select 1 from public.schools where id=invitation.school_id and status='active') then return false; end if;
 insert into public.profiles(id,account_status,credential_reset_required) values(auth.uid(),'active',false) on conflict(id) do nothing;
 if not exists(select 1 from public.profiles where id=auth.uid() and account_status='active' and not credential_reset_required) then return false; end if;
 if exists(select 1 from public.user_roles where profile_id=auth.uid() and school_id=invitation.school_id and role_code=invitation.role_code and membership_status='revoked') then return false; end if;
 insert into public.staff_profiles(profile_id,school_id,display_name,email) values(auth.uid(),invitation.school_id,invitation.display_name,email_address) on conflict(profile_id,school_id) do nothing;
 insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
 values(auth.uid(),invitation.school_id,invitation.role_code,'active',array['dashboard.'||invitation.role_code||'.view']) on conflict(profile_id,school_id,role_code) do nothing;
 update public.staff_invitations set status='accepted',accepted_at=now(),updated_at=now() where id=invitation.id;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details) values(auth.uid(),'staff_invitation_accepted',invitation.school_id,jsonb_build_object('invitation_id',invitation.id));
 return true;
end $$;
revoke all on function public.issue_staff_invitation(text,text,text,text),public.revoke_staff_invitation(uuid),public.accept_staff_invitation(text) from public,anon,service_role;
grant execute on function public.issue_staff_invitation(text,text,text,text),public.revoke_staff_invitation(uuid),public.accept_staff_invitation(text) to authenticated;
-- Membership provisioning must go through checked commands, not direct invitation edits.
revoke insert,update on public.staff_invitations from authenticated;
commit;
