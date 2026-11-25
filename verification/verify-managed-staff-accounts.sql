-- Execute only against a fresh, disposable local PostgreSQL database.
-- Minimal schema and signed-session stand-ins from migrations 001, 003, 005, 007, 009, 016 and 027.
\set ON_ERROR_STOP on
do $roles$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $roles$;
create schema auth;
create schema app_private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('fixture.actor',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(current_setting('fixture.jwt',true)::jsonb,'{}')$$;
create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz);
create table auth.mfa_factors(user_id uuid references auth.users,status text,factor_type text);
create table public.schools(id uuid primary key,status text);
create table public.profiles(id uuid primary key references auth.users,account_status text,credential_reset_required boolean);
create table public.staff_profiles(profile_id uuid references public.profiles,school_id uuid references public.schools,
 display_name text,email text,employee_code text unique,department text,phone text,is_active boolean default true,primary key(profile_id,school_id));
create table public.user_roles(id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles,
 school_id uuid references public.schools,role_code text,membership_status text check(membership_status in ('active','revoked')),
 permissions text[],valid_from timestamptz default now(),valid_until timestamptz,unique(profile_id,school_id,role_code));
create table public.staff_invitations(id uuid primary key default gen_random_uuid(),school_id uuid references public.schools,
 email text,display_name text,role_code text,invitation_token text unique,invited_by uuid references public.profiles,
 status text default 'pending',expires_at timestamptz default now()+interval '1 day',accepted_at timestamptz,updated_at timestamptz);
create unique index on public.staff_invitations(school_id,lower(email),role_code) where status='pending';
create table public.audit_events(actor_profile_id uuid,target_profile_id uuid,event_type text,school_id uuid,details jsonb);
alter table public.staff_profiles enable row level security;
alter table public.staff_profiles force row level security;
alter table public.staff_invitations enable row level security;
alter table public.staff_invitations force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
create function public.current_role_has_permission(p text) returns boolean language sql stable
 as $$select current_setting('fixture.role',true)='admin' and p<>coalesce(current_setting('fixture.denied_permission',true),'')$$;
create function public.staff_session_is_live() returns boolean language sql stable
 as $$select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)$$;
create function app_private.require_school_admin() returns uuid language plpgsql stable as $$
begin
 if current_setting('fixture.role',true) is distinct from 'admin' or auth.jwt()->>'aal' is distinct from 'aal2'
 then raise exception 'denied' using errcode='42501'; end if;
 return current_setting('fixture.school')::uuid;
end $$;
create function public.issue_staff_invitation(p_email text,p_name text,p_role text,p_hash text) returns uuid language plpgsql as $$
declare result uuid;
begin
 if not public.current_role_has_permission('security.roles.assign') or p_role not in ('teacher','accountant')
   then raise exception 'denied' using errcode='42501'; end if;
 insert into public.staff_invitations(school_id,email,display_name,role_code,invitation_token,invited_by)
 values(app_private.require_school_admin(),p_email,p_name,p_role,'sha256:'||p_hash,auth.uid()) returning id into result;
 return result;
end $$;
create function public.accept_staff_invitation(p_token text) returns boolean language sql as $$select false$$;
revoke execute on function public.accept_staff_invitation(text) from public;
grant execute on function public.accept_staff_invitation(text) to authenticated;

insert into public.schools values ('00000000-0000-0000-0000-00000000000a','active'),('00000000-0000-0000-0000-00000000000b','active');
insert into auth.users values
 ('10000000-0000-0000-0000-000000000001','admin@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000002','teacher@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000003','accountant@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000004','cross@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000005','legacy@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000006','race-teacher@example.invalid',now()),
 ('10000000-0000-0000-0000-000000000007','race-accountant@example.invalid',now());
insert into auth.mfa_factors values ('10000000-0000-0000-0000-000000000001','verified','totp');
insert into public.profiles values ('10000000-0000-0000-0000-000000000001','active',false),
 ('10000000-0000-0000-0000-000000000004','active',false);
insert into public.staff_profiles(profile_id,school_id,display_name,employee_code)
 values('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-00000000000b','Foreign staff','USED');
insert into public.user_roles(id,profile_id,school_id,role_code,membership_status,permissions)
 values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004',
 '00000000-0000-0000-0000-00000000000b','teacher','active',array['dashboard.teacher.view','homework.read']);

insert into public.staff_invitations(school_id,email,display_name,role_code,invitation_token,invited_by)
values ('00000000-0000-0000-0000-00000000000a','legacy@example.invalid','Legacy Teacher','teacher',
  'sha256:'||encode(sha256(convert_to(repeat('d',64),'UTF8')),'hex'),
  '10000000-0000-0000-0000-000000000001');

\ir verify-managed-staff-preflight.sql
\ir ../supabase/migrations/20261124002900_managed_staff_accounts.sql
\ir ../supabase/migrations/20261124003000_managed_staff_default_permissions.sql

-- Run the same catalog checks supplied for hosted verification.
\ir verify-managed-staff-postflight.sql

do $$
begin
  if has_function_privilege('anon','public.accept_staff_invitation(text)','EXECUTE')
    or not has_function_privilege('authenticated','public.accept_staff_invitation(text)','EXECUTE')
    or has_function_privilege('anon','public.manage_school_staff(uuid,text,text,text,text,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.manage_school_staff(uuid,text,text,text,text,text)','EXECUTE')
    or not has_function_privilege('anon','public.managed_staff_invitation_matches(text,text)','EXECUTE')
    or has_function_privilege('authenticated','app_private.managed_staff_school(text)','EXECUTE')
    or has_function_privilege('authenticated','app_private.default_managed_staff_permissions(text)','EXECUTE')
    or has_function_privilege('anon','app_private.default_managed_staff_permissions(text)','EXECUTE')
    or has_function_privilege('service_role','app_private.default_managed_staff_permissions(text)','EXECUTE')
  then raise exception 'unexpected RPC privileges'; end if;
end $$;

do $$
declare school constant uuid:='00000000-0000-0000-0000-00000000000a';
  foreign_school constant uuid:='00000000-0000-0000-0000-00000000000b';
  admin constant uuid:='10000000-0000-0000-0000-000000000001';
  teacher constant uuid:='10000000-0000-0000-0000-000000000002';
  accountant constant uuid:='10000000-0000-0000-0000-000000000003';
  teacher_grants constant text[] := array[
    'dashboard.teacher.view','students.read','attendance.read','attendance.write',
    'homework.read','homework.write','marks.read','marks.write','reports.read',
    'announcements.read','announcements.write','documents.read'];
  accountant_grants constant text[] := array[
    'dashboard.accountant.view','fees.read','fees.write','payments.read','payments.record',
    'expenses.read','expenses.write','receipts.read','reports.read','reports.export',
    'announcements.read','documents.read','audit.read'];
  token text:=repeat('a',64); inactive_token text:=repeat('c',64);
  membership uuid; invite uuid; role_name text;
begin
  if not exists(select 1 from public.staff_profiles
    where school_id=foreign_school and display_name='Foreign staff' and employee_code='USED')
    then raise exception 'existing staff record changed'; end if;
  if not exists(select 1 from public.user_roles where school_id=foreign_school
    and id='20000000-0000-0000-0000-000000000001'
    and permissions=array['dashboard.teacher.view','homework.read'])
    then raise exception 'existing custom permissions changed'; end if;
  perform set_config('fixture.actor','10000000-0000-0000-0000-000000000005',false);
  if not public.accept_staff_invitation(repeat('d',64))
    then raise exception 'existing legacy invitation failed'; end if;
  if not exists(select 1 from public.staff_profiles where school_id=school
      and profile_id=auth.uid() and employee_code is null)
    then raise exception 'legacy staff profile was not provisioned'; end if;
  if not exists(select 1 from public.user_roles where school_id=school and profile_id=auth.uid()
    and permissions=array['dashboard.teacher.view'])
    then raise exception 'legacy invitation permissions changed'; end if;

  perform set_config('fixture.actor',admin::text,false);
  perform set_config('fixture.school',school::text,false);
  perform set_config('fixture.jwt','{"aal":"aal2","amr":[{"method":"password"},{"method":"totp"}]}',false);
  foreach role_name in array array['teacher','accountant'] loop
    perform set_config('fixture.role',role_name,false);
    begin
      perform public.issue_managed_staff_invitation('teacher@example.invalid','Teacher','teacher',repeat('f',64),'EMP1',null,null,true);
      raise exception 'non-admin could issue invitation';
    exception when insufficient_privilege then null; end;
  end loop;
  perform set_config('fixture.role','admin',false);
  perform set_config('fixture.jwt','{"aal":"aal2","amr":[{"method":"password"}]}',false);
  begin
    perform public.issue_managed_staff_invitation('teacher@example.invalid','Teacher','teacher',repeat('f',64),'EMP1',null,null,true);
    raise exception 'missing TOTP proof accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('fixture.jwt','{"aal":"aal2","amr":[{"method":"password"},{"method":"totp"}]}',false);
  invite:=public.issue_managed_staff_invitation('teacher@example.invalid','Teacher','teacher',
    encode(sha256(convert_to(token,'UTF8')),'hex'),'EMP1','Science',null,true);

  begin
    perform public.issue_managed_staff_invitation('teacher@example.invalid','Duplicate','accountant',repeat('f',64),'OTHER',null,null,true);
    raise exception 'duplicate email accepted';
  exception when unique_violation then null; end;
  begin
    perform public.issue_managed_staff_invitation('different@example.invalid','Duplicate','accountant',repeat('e',64),'emp1',null,null,true);
    raise exception 'duplicate employee ID accepted';
  exception when unique_violation then null; end;
  begin
    perform public.issue_managed_staff_invitation('another@example.invalid','Duplicate','accountant',repeat('e',64),'EMP1',null,null,true);
    raise exception 'exact duplicate employee ID accepted';
  exception when unique_violation then null; end;
  if public.manage_school_staff('20000000-0000-0000-0000-000000000001','deactivate') then raise exception 'cross-school mutation accepted'; end if;
  if exists(select 1 from public.list_managed_school_staff('','', '',0) where employee_code='USED') then raise exception 'foreign staff leaked'; end if;
  if not public.managed_staff_invitation_matches(token,'teacher@example.invalid')
    or public.managed_staff_invitation_matches(token,'wrong@example.invalid') then raise exception 'invitation verification incorrect'; end if;
  perform set_config('fixture.actor',teacher::text,false);
  if not public.accept_staff_invitation(token) or public.accept_staff_invitation(token) then raise exception 'invitation redemption or replay failed'; end if;
  select id into membership from public.user_roles where profile_id=teacher and school_id=school
    and role_code='teacher' and membership_status='active' and permissions=teacher_grants;
  if membership is null or not exists(select 1 from public.staff_profiles where profile_id=teacher and department='Science') then raise exception 'teacher provisioning incomplete'; end if;
  insert into public.user_roles(profile_id,school_id,role_code,membership_status,permissions)
    values(teacher,foreign_school,'teacher','active',array['dashboard.teacher.view']);

  perform set_config('fixture.actor',admin::text,false);
  if not public.manage_school_staff(membership,'edit','Teacher Updated','EMP2','Math',null)
    or not public.manage_school_staff(membership,'deactivate') then raise exception 'edit or suspension failed'; end if;
  if not exists(select 1 from public.user_roles where id=membership and membership_status='suspended')
    or not exists(select 1 from public.user_roles where profile_id=teacher and school_id=foreign_school and membership_status='active')
    or not exists(select 1 from public.profiles where id=teacher and account_status='active')
    then raise exception 'school-local suspension failed'; end if;
  if not public.manage_school_staff(membership,'activate') or not public.manage_school_staff(membership,'reset') then raise exception 'reactivation or reset scope failed'; end if;
  if not exists(select 1 from public.user_roles where id=membership
    and membership_status='active' and permissions=teacher_grants)
    then raise exception 'Teacher grants changed after suspension and reactivation'; end if;
  if not exists(select 1 from public.list_managed_school_staff('teacher@example.invalid','active','teacher',0)
    where membership_id=membership and employee_code='EMP2') then raise exception 'staff search or role filter failed'; end if;

  perform public.issue_managed_staff_invitation('accountant@example.invalid','Accountant','accountant',
    encode(sha256(convert_to(inactive_token,'UTF8')),'hex'),'used',null,null,false);
  perform set_config('fixture.actor',accountant::text,false);
  if not public.accept_staff_invitation(inactive_token) then raise exception 'Accountant invitation not accepted'; end if;
  if not exists(select 1 from public.user_roles where profile_id=accountant and school_id=school
    and role_code='accountant' and membership_status='suspended' and permissions=accountant_grants)
    then raise exception 'inactive Accountant provisioning failed'; end if;
  if (select count(*) from public.staff_profiles where lower(employee_code)='used') <> 2
    then raise exception 'cross-school employee code reuse failed'; end if;
  perform set_config('fixture.actor',admin::text,false);
  begin
    perform public.manage_school_staff(membership,'edit','Teacher Updated','USED',null,null);
    raise exception 'mixed-case same-school edit accepted';
  exception when unique_violation then null; end;
  begin
    update public.staff_profiles set employee_code='used' where school_id=school and profile_id=teacher;
    raise exception 'database index allowed same-school duplicate';
  exception when unique_violation then null; end;
  if not exists(select 1 from public.audit_events where target_profile_id=teacher and event_type='managed_staff_reset')
    then raise exception 'management audit missing'; end if;
end $$;

-- Seed two conflicting pending invitations to exercise the final acceptance
-- boundary independently of the managed issuance checks.
insert into public.staff_invitations(
  school_id,email,display_name,role_code,invitation_token,invited_by,managed_staff,employee_code
)
select '00000000-0000-0000-0000-00000000000a', email, 'Race Fixture', role_code,
  'sha256:'||encode(sha256(convert_to(repeat(token_character,64),'UTF8')),'hex'),
  '10000000-0000-0000-0000-000000000001', true, code
from (values ('race-teacher@example.invalid','teacher','1','Race01'),
             ('race-accountant@example.invalid','accountant','2','rACE01'))
  as fixture(email,role_code,token_character,code);

create extension dblink;
create function public.fixture_accept_invitation(actor uuid, token_character text)
returns text language plpgsql as $$
begin
  perform set_config('fixture.actor',actor::text,true);
  return public.accept_staff_invitation(repeat(token_character,64))::text;
exception when unique_violation then
  return sqlstate;
end $$;

do $race$
declare connection text := format(
  'host=127.0.0.1 port=%s dbname=%L user=%L',
  current_setting('port'), current_database(), current_user);
  second_pid integer;
  outcome text;
  deadline timestamptz;
begin
  perform dblink_connect('first', connection);
  perform dblink_connect('second', connection);
  perform dblink_exec('second', 'set statement_timeout = ''15s''');
  select pid into second_pid from dblink('second','select pg_backend_pid()') as remote(pid integer);
  perform dblink_exec('first', 'begin');
  select result into outcome from dblink('first',
    $$select public.fixture_accept_invitation('10000000-0000-0000-0000-000000000006','1')$$)
    as remote(result text);
  if outcome is distinct from 'true' then raise exception 'first acceptance failed'; end if;
  perform dblink_send_query('second',
    $$select public.fixture_accept_invitation('10000000-0000-0000-0000-000000000007','2')$$);
  deadline := clock_timestamp() + interval '5 seconds';
  loop
    exit when exists(select 1 from pg_locks where pid=second_pid and locktype='advisory' and not granted);
    if clock_timestamp() >= deadline then raise exception 'second acceptance did not wait for school lock'; end if;
    perform pg_sleep(0.02);
  end loop;
  perform dblink_exec('first', 'commit');
  select result into outcome from dblink_get_result('second') as remote(result text);
  if outcome is distinct from '23505' then raise exception 'duplicate acceptance was not rejected'; end if;
  perform dblink_disconnect('first');
  perform dblink_disconnect('second');
end $race$;

do $$
declare winner constant uuid := '10000000-0000-0000-0000-000000000006';
  loser constant uuid := '10000000-0000-0000-0000-000000000007';
begin
  if not exists(select 1 from public.staff_profiles where profile_id=winner and employee_code='Race01')
    or not exists(select 1 from public.user_roles where profile_id=winner and role_code='teacher')
    or exists(select 1 from public.profiles where id=loser)
    or exists(select 1 from public.staff_profiles where profile_id=loser)
    or exists(select 1 from public.user_roles where profile_id=loser)
    or exists(select 1 from public.audit_events where actor_profile_id=loser)
    or not exists(select 1 from public.staff_invitations where email='race-teacher@example.invalid' and status='accepted')
    or not exists(select 1 from public.staff_invitations where email='race-accountant@example.invalid' and status='pending')
  then raise exception 'concurrent acceptance left incorrect or partially provisioned records'; end if;
end $$;
select 'Managed staff provisioning and authorization contracts passed' as result;
