-- Run only on the local synthetic operational fixture after migration 038.
begin;

insert into auth.users(id,email) values('34343434-3434-4434-8434-343434343434','export-step-up@example.invalid');
insert into public.profiles(id,account_status,credential_reset_required)
values('34343434-3434-4434-8434-343434343434','active',false);
insert into public.staff_profiles(profile_id,school_id,display_name)
values('34343434-3434-4434-8434-343434343434','11111111-1111-4111-8111-111111111111','Export Step-Up Fixture');
insert into public.user_roles(id,profile_id,school_id,role_code,membership_status,permissions)
values('35353535-3535-4535-8535-353535353535','34343434-3434-4434-8434-343434343434',
  '11111111-1111-4111-8111-111111111111','accountant','active',app_private.default_managed_staff_permissions('accountant'));
insert into auth.sessions(id,user_id)
values('36363636-3636-4636-8636-363636363636','34343434-3434-4434-8434-343434343434');
insert into auth.mfa_factors(id,user_id,factor_type,status)
values('fixture-export-totp','34343434-3434-4434-8434-343434343434','totp','verified');
insert into public.role_contexts(id,profile_id,school_id,role_code,assignment_id,authorization_version,expires_at)
select '36363636-3636-4636-8636-363636363636',id,'11111111-1111-4111-8111-111111111111','accountant',
  '35353535-3535-4535-8535-353535353535',authorization_version,now()+interval '1 hour'
from public.profiles where id='34343434-3434-4434-8434-343434343434';

set local role authenticated;
do $$
declare
  school constant uuid := '11111111-1111-4111-8111-111111111111';
  actor constant text := '34343434-3434-4434-8434-343434343434';
  epoch constant bigint := floor(extract(epoch from now()));
  claims jsonb;
  evidence jsonb;
begin
  perform set_config('request.jwt.claim.sub',actor,true);
  claims := jsonb_build_object(
    'iss','https://yedvkcwkflhbqumjwknh.supabase.co/auth/v1','role','authenticated','aud','authenticated',
    'session_id','36363636-3636-4636-8636-363636363636','aal','aal2','exp',epoch+3600);
  foreach evidence in array array[
    jsonb_build_array(jsonb_build_object('method','password','timestamp',epoch-80),jsonb_build_object('method','totp')),
    jsonb_build_array(jsonb_build_object('method','password','timestamp',epoch-80),jsonb_build_object('method','totp','timestamp',epoch-601)),
    jsonb_build_array(jsonb_build_object('method','password','timestamp',epoch-20),jsonb_build_object('method','totp','timestamp',epoch-40)),
    jsonb_build_array(jsonb_build_object('method','password','timestamp',epoch-601),jsonb_build_object('method','totp','timestamp',epoch-20)),
    jsonb_build_array(jsonb_build_object('method','password','timestamp',epoch-80),jsonb_build_object('method','totp','timestamp',epoch+10))
  ] loop
    perform set_config('request.jwt.claims',(claims||jsonb_build_object('amr',evidence))::text,true);
    begin
      perform public.export_school_finance_invoices(school,current_date,current_date);
      raise exception 'Export accepted invalid MFA evidence';
    exception when insufficient_privilege then null; end;
  end loop;
  evidence := jsonb_build_array(jsonb_build_object('method','password','timestamp',epoch-80),
    jsonb_build_object('method','totp','timestamp',epoch-20));
  perform set_config('request.jwt.claims',(claims||jsonb_build_object('amr',evidence))::text,true);
  if jsonb_typeof(public.export_school_finance_invoices(school,current_date,current_date)) is distinct from 'array' then
    raise exception 'Export with fresh native MFA did not return a report';
  end if;
  begin
    perform public.export_school_finance_invoices('22222222-2222-4222-8222-222222222222',current_date,current_date);
    raise exception 'Export accepted a foreign school';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.audit_events where event_type='financial_invoice_export'
      and actor_profile_id='34343434-3434-4434-8434-343434343434')<>1 then
    raise exception 'Expected exactly one successful export audit event';
  end if;
end $$;

rollback;
select 'PASS: fresh native Accountant export, stale and malformed MFA denial, and school isolation.';
