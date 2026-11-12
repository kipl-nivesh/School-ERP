begin;
create or replace function public.issue_staff_invitation(p_email text,p_name text,p_role text,p_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare school uuid:=app_private.require_school_admin(); result uuid;
begin
 p_email:=lower(trim(p_email));
 p_name:=trim(p_name);
 if p_email is null or length(p_email)>254 or p_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    or p_name is null or length(p_name) not between 2 and 160 or p_name ~ '[[:cntrl:]]'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_role is null or p_role not in ('teacher','accountant') then
   raise exception 'Invalid invitation' using errcode='22023';
 end if;
 update public.staff_invitations set status='expired',updated_at=now()
 where school_id=school and lower(email)=p_email and role_code=p_role and status='pending' and expires_at<=now();
 insert into public.staff_invitations(school_id,email,display_name,role_code,invitation_token,invited_by)
 values(school,p_email,p_name,p_role,'sha256:'||p_token_hash,auth.uid()) returning id into result;
 insert into public.audit_events(actor_profile_id,event_type,school_id,details)
 values(auth.uid(),'staff_invitation_issued',school,jsonb_build_object('invitation_id',result));
 return result;
end $$;
commit;
