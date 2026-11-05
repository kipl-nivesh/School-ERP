-- Step 14 staff authorization metadata and narrowly scoped commands. NOT EXECUTED.
begin;
revoke create on schema public from public, anon, authenticated;
alter table public.user_roles add column permissions text[] not null default '{}';
alter table public.user_roles add constraint user_roles_known_permissions check (permissions <@ array['dashboard.admin.view','dashboard.teacher.view','dashboard.student.view','dashboard.parent.view','dashboard.accountant.view','school.settings.read','school.settings.write','admissions.read','admissions.write','students.read','staff.read','academics.manage','attendance.read','attendance.write','homework.read','homework.write','marks.read','marks.write','marks.publish','fees.read','fees.write','payments.read','payments.record','expenses.read','expenses.write','receipts.read','reports.read','reports.export','announcements.read','announcements.write','documents.read','audit.read','children.academics.read','children.fees.read','security.accounts.create','security.accounts.update','security.accounts.suspend','security.credentials.reset','security.sessions.revoke','security.roles.assign','security.roles.revoke','security.permissions.assign','security.permissions.revoke','security.super_admin.grant','security.super_admin.revoke']::text[]);
-- Native issuer pinned to this owner-designated development project. Review before any other target.
create schema app_private;
revoke all on schema app_private from public, anon, authenticated;
create function public.is_native_staff_request() returns boolean
language sql stable security invoker set search_path = '' as $$
 select coalesce(auth.jwt()->>'iss' = 'https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1'
 and auth.jwt()->>'role' = 'authenticated' and (auth.jwt()->>'aud' = 'authenticated' or auth.jwt()->'aud' @> '["authenticated"]'::jsonb) and auth.uid() is not null
 and exists (select 1 from jsonb_array_elements(auth.jwt()->'amr') a where a->>'method' = 'password'), false)
$$;
revoke all on function public.is_native_staff_request() from public, anon;
grant execute on function public.is_native_staff_request() to authenticated;

-- Read-only own-session check, no profile/role input. Auth internals must be reviewed on target.
create function public.staff_session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
 select public.is_native_staff_request() and exists (
  select 1 from auth.sessions s join auth.users u on u.id=s.user_id
  where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
   and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())
 )
$$;
alter function public.staff_session_is_live() owner to postgres;
revoke all on function public.staff_session_is_live() from public, anon;
grant execute on function public.staff_session_is_live() to authenticated;

-- Approval creation is deliberately absent: independently reviewed operator workflow required.
create table public.staff_mfa_enrollment_approvals (
 profile_id uuid primary key references public.profiles(id),
 approved_by uuid not null references public.profiles(id),
 approval_reference text not null check (length(approval_reference) between 1 and 200),
 issued_at timestamptz not null default now(),
 valid_until timestamptz not null,
 consumed_at timestamptz,
 check (profile_id <> approved_by),
 check (valid_until > issued_at and valid_until <= issued_at + interval '10 minutes')
);
alter table public.staff_mfa_enrollment_approvals enable row level security;
alter table public.staff_mfa_enrollment_approvals force row level security;
revoke all on table public.staff_mfa_enrollment_approvals from public, anon, authenticated;
create function public.consume_staff_mfa_enrollment_approval() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if not public.staff_session_is_live() then return false; end if;
 -- Serialize application enrollment attempts. Native Auth lifecycle still needs live verification.
 perform 1 from public.profiles where id=auth.uid() and account_status='active'
  and not credential_reset_required for update;
 if not found then return false; end if;
 if exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then return false; end if;
 if not exists(select 1 from public.admin_privileges a join public.user_roles m on m.profile_id=a.profile_id
  where a.profile_id=auth.uid() and a.privilege_status='active' and m.role_code='admin'
  and m.membership_status='active' and m.valid_from<=now() and (m.valid_until is null or m.valid_until>now())) then return false; end if;
 update public.staff_mfa_enrollment_approvals e set consumed_at=now()
 where e.profile_id=auth.uid() and e.consumed_at is null and e.issued_at<=now() and e.valid_until>now()
 and exists(select 1 from public.profiles p join public.admin_privileges a on a.profile_id=p.id
  join public.user_roles m on m.profile_id=p.id and m.role_code='admin'
  where p.id=e.approved_by and p.account_status='active' and not p.credential_reset_required
  and a.privilege_status='active' and m.membership_status='active' and m.valid_from<=now()
  and (m.valid_until is null or m.valid_until>now()));
 if not found then return false; end if;
 insert into public.audit_events(actor_profile_id,target_profile_id,event_type)
 values(auth.uid(),auth.uid(),'mfa_enrollment_approval_consumed');
 return true;
end
$$;
alter function public.consume_staff_mfa_enrollment_approval() owner to postgres;
revoke all on function public.consume_staff_mfa_enrollment_approval() from public, anon;
grant execute on function public.consume_staff_mfa_enrollment_approval() to authenticated;

-- Only self authorization metadata, never arbitrary domain/person records. No recursive policies.
grant select on public.profiles, public.user_roles, public.admin_privileges, public.role_contexts to authenticated;
create policy profiles_self_metadata on public.profiles for select to authenticated
 using (public.staff_session_is_live() and id = auth.uid());
create policy memberships_self_metadata on public.user_roles for select to authenticated
 using (public.staff_session_is_live() and profile_id = auth.uid());
create policy tier_self_metadata on public.admin_privileges for select to authenticated
 using (public.staff_session_is_live() and profile_id = auth.uid());
create policy contexts_current_session on public.role_contexts for select to authenticated
 using (public.staff_session_is_live() and profile_id = auth.uid() and id::text = auth.jwt()->>'session_id');

create function app_private.reject_audit_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin raise exception 'Audit events are append-only'; end
$$;
revoke all on function app_private.reject_audit_change() from public, anon, authenticated;
create trigger audit_events_immutable before update or delete on public.audit_events
 for each row execute function app_private.reject_audit_change();
create trigger audit_events_no_truncate before truncate on public.audit_events
 for each statement execute function app_private.reject_audit_change();

-- Definer ownership is deployment infrastructure only; app users never receive its credentials.
-- These commands accept no profile/session/MFA/grant supplied by a client.
create function public.activate_staff_context(requested_role text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare p public.profiles; m public.user_roles; sid uuid; expiry timestamptz;
begin
 if not public.staff_session_is_live() or requested_role not in ('admin','teacher','accountant') then return false; end if;
 sid := (auth.jwt()->>'session_id')::uuid;
 expiry := least(to_timestamp((auth.jwt()->>'exp')::double precision), now() + interval '30 minutes');
 if sid is null or expiry <= now() then return false; end if;
 select * into p from public.profiles where id = auth.uid() for update;
 if not found or p.account_status <> 'active' or p.credential_reset_required then return false; end if;
 select * into m from public.user_roles where profile_id = p.id and role_code = requested_role
 and membership_status = 'active' and valid_from <= now() and (valid_until is null or valid_until > now());
 if not found then return false; end if;
 if exists(select 1 from public.admin_privileges where profile_id=p.id and privilege_status='pending') then return false; end if;
 if exists(select 1 from public.admin_privileges where profile_id=p.id and privilege_status='active') then
  if auth.jwt()->>'aal' is distinct from 'aal2' or not exists(select 1 from public.user_roles
   where profile_id=p.id and role_code='admin' and membership_status='active' and valid_from<=now()
   and (valid_until is null or valid_until>now())) then return false; end if;
 end if;
 if not (('dashboard.' || requested_role || '.view') = any(m.permissions))
 and not (requested_role='admin' and exists(select 1 from public.admin_privileges where profile_id=p.id and privilege_status='active')) then return false; end if;
 insert into public.role_contexts(id,profile_id,role_code,assignment_id,authorization_version,expires_at)
 values(sid,p.id,requested_role,m.id,p.authorization_version,expiry)
 on conflict(id) do update set role_code=excluded.role_code, assignment_id=excluded.assignment_id,
  authorization_version=excluded.authorization_version, context_version=public.role_contexts.context_version+1,
  expires_at=excluded.expires_at, revoked_at=null
 where public.role_contexts.profile_id=auth.uid() and public.role_contexts.revoked_at is null;
 if not found then return false; end if;
 insert into public.audit_events(actor_profile_id,target_profile_id,event_type) values(p.id,p.id,'staff_context_activated');
 return true;
end
$$;
create function public.revoke_staff_context() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if not public.staff_session_is_live() then return false; end if;
 update public.role_contexts set revoked_at=now(),context_version=context_version+1
 where profile_id=auth.uid() and id::text=auth.jwt()->>'session_id' and revoked_at is null;
 insert into public.audit_events(actor_profile_id,target_profile_id,event_type) values(auth.uid(),auth.uid(),'staff_context_revoked');
 return true;
end
$$;
alter function public.activate_staff_context(text) owner to postgres;
alter function public.revoke_staff_context() owner to postgres;
revoke all on function public.activate_staff_context(text), public.revoke_staff_context() from public, anon;
grant execute on function public.activate_staff_context(text), public.revoke_staff_context() to authenticated;

-- Security-state changes invalidate all application contexts, not just newly issued JWTs.
create function app_private.invalidate_staff_contexts() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
 if tg_table_name='profiles' then
  update public.role_contexts set revoked_at=now(),context_version=context_version+1 where profile_id=new.id and revoked_at is null;
  insert into public.audit_events(actor_profile_id,target_profile_id,event_type) values(auth.uid(),new.id,'profile_security_changed');
 else
  if tg_op='DELETE' then pid:=old.profile_id; else pid:=new.profile_id; end if;
  update public.profiles set authorization_version=authorization_version+1 where id=pid;
  if tg_op='UPDATE' and old.profile_id is distinct from new.profile_id then
   update public.profiles set authorization_version=authorization_version+1 where id=old.profile_id;
  end if;
 end if;
 return null;
end
$$;
alter function app_private.invalidate_staff_contexts() owner to postgres;
revoke all on function app_private.invalidate_staff_contexts() from public, anon, authenticated;
create trigger profile_context_invalidation after update on public.profiles for each row
 when (old.account_status is distinct from new.account_status or old.credential_reset_required is distinct from new.credential_reset_required
 or old.authorization_version is distinct from new.authorization_version) execute function app_private.invalidate_staff_contexts();
create trigger membership_context_invalidation after insert or update or delete on public.user_roles
 for each row execute function app_private.invalidate_staff_contexts();
create trigger tier_context_invalidation after insert or update or delete on public.admin_privileges
 for each row execute function app_private.invalidate_staff_contexts();
-- No IAM creation/grant APIs or permissive domain policies. Last-admin/independent approval commands remain deferred.
commit;
