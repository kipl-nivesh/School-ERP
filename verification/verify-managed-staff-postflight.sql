-- Run after migration 029. This block returns catalog metadata only.
begin transaction read only;
set local statement_timeout = '20s';

with expected_rpc(signature, anon_expected, authenticated_expected, definer_expected) as (
  values
    ('app_private.managed_staff_school(text)', false, false, true),
    ('app_private.validate_managed_staff_details(text,text,text)', false, false, false),
    ('public.issue_managed_staff_invitation(text,text,text,text,text,text,text,boolean)', false, true, true),
    ('public.managed_staff_invitation_matches(text,text)', true, true, true),
    ('public.manage_school_staff(uuid,text,text,text,text,text)', false, true, true),
    ('public.list_managed_school_staff(text,text,text,integer)', false, true, true),
    ('public.accept_staff_invitation(text)', false, true, true)
), report(section, object_name, evidence) as (
  select '01 constraints', e.name, jsonb_build_object(
    'present', c.oid is not null, 'expected_present', e.expected_present,
    'validated', c.convalidated, 'definition', pg_get_constraintdef(c.oid))
  from (values ('public.user_roles', 'user_roles_membership_status_check', true),
               ('public.staff_profiles', 'staff_profiles_employee_code_key', false))
    as e(table_name, name, expected_present)
  left join pg_constraint c on c.conrelid = to_regclass(e.table_name) and c.conname = e.name
  union all
  select '02 employee-code index', e.name, jsonb_build_object(
    'present', i.indexrelid is not null, 'unique', i.indisunique, 'valid', i.indisvalid,
    'immediate', i.indimmediate, 'definition', pg_get_indexdef(i.indexrelid))
  from (values ('public.staff_profiles_school_employee_code_ci_key')) as e(name)
  left join pg_index i on i.indexrelid = to_regclass(e.name)
    and i.indrelid = 'public.staff_profiles'::regclass
  union all
  select '03 invitation columns', e.name, jsonb_build_object(
    'present', a.attnum is not null, 'type', format_type(a.atttypid, a.atttypmod),
    'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid))
  from (values ('managed_staff'), ('employee_code'), ('department'), ('phone'), ('start_active')) as e(name)
  left join pg_attribute a on a.attrelid = 'public.staff_invitations'::regclass
    and a.attname = e.name and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  union all
  select '04 RPC and ACL', e.signature, jsonb_build_object(
    'present', p.oid is not null, 'owner', pg_get_userbyid(p.proowner),
    'owner_bypasses_rls', r.rolbypassrls or r.rolsuper,
    'definer', p.prosecdef, 'expected_definer', e.definer_expected,
    'settings', p.proconfig, 'arguments', pg_get_function_arguments(p.oid),
    'returns', pg_get_function_result(p.oid),
    'public_execute', case when p.oid is not null then exists (
      select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where a.grantee = 0 and a.privilege_type = 'EXECUTE'
    ) end,
    'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'anon_expected', e.anon_expected,
    'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    'authenticated_expected', e.authenticated_expected,
    'service_role_execute', has_function_privilege('service_role', p.oid, 'EXECUTE'))
  from expected_rpc e
  left join pg_proc p on p.oid = to_regprocedure(e.signature)
  left join pg_roles r on r.oid = p.proowner
  union all
  select '05 tables and RLS', e.name, jsonb_build_object(
    'present', c.oid is not null, 'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
    'anon_insert', has_table_privilege('anon', c.oid, 'INSERT'),
    'anon_update', has_table_privilege('anon', c.oid, 'UPDATE'),
    'authenticated_insert', has_table_privilege('authenticated', c.oid, 'INSERT'),
    'authenticated_update', has_table_privilege('authenticated', c.oid, 'UPDATE'))
  from (values ('public.profiles'), ('public.user_roles'), ('public.staff_profiles'),
               ('public.staff_invitations'), ('public.schools'), ('public.audit_events'),
               ('public.role_contexts')) as e(name)
  left join pg_class c on c.oid = to_regclass(e.name)
  union all
  select '06 triggers', e.name || '.' || t.tgname, jsonb_build_object(
    'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid))
  from (values ('public.user_roles'), ('public.staff_invitations')) as e(name)
  join pg_trigger t on t.tgrelid = to_regclass(e.name) and not t.tgisinternal
)
select section, object_name, evidence from report order by section, object_name;

rollback;
