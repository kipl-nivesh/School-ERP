with expected(signature,authenticated_expected,definer_expected) as (
  values ('public.accept_staff_invitation(text)',true,true),
    ('app_private.default_managed_staff_permissions(text)',false,false),
    ('public.update_academic_lifecycle(uuid,text,uuid,text,text,uuid,date)',true,true),
    ('public.save_teacher_draft_mark(uuid,uuid,uuid,numeric,numeric)',true,true),
    ('public.configure_school_fee(uuid,uuid,uuid,text,text,bigint,date,bigint,date)',true,true),
    ('public.assign_school_fee(uuid,uuid,uuid,date)',true,true),
    ('public.manage_teacher_staff_announcement(uuid,uuid,text,text,text)',true,true),
    ('public.manage_staff_expense_draft(uuid,uuid,text,integer,text,text,bigint,date,text,text)',true,true),
    ('public.export_school_finance_invoices(uuid,date,date)',true,true),
    ('app_private.accountant_export_mfa_is_fresh()',false,false)
), objects as (
  select e.*, p.oid, p.proowner, p.prosecdef, p.proconfig, p.proacl
  from expected e left join pg_proc p on p.oid=to_regprocedure(e.signature)
)
select jsonb_build_object(
  'rpc', (select jsonb_object_agg(signature,jsonb_build_object(
    'present',oid is not null,'owner',pg_get_userbyid(proowner),'settings',proconfig,
    'definer',prosecdef,'expected_definer',definer_expected,
    'execute_authenticated',has_function_privilege('authenticated',oid,'EXECUTE'),
    'expected_authenticated',authenticated_expected,
    'execute_anon',has_function_privilege('anon',oid,'EXECUTE'),
    'execute_service_role',has_function_privilege('service_role',oid,'EXECUTE'),
    'execute_public',case when oid is not null then exists (
      select 1 from aclexplode(coalesce(proacl,acldefault('f',proowner))) pg_acl
      where pg_acl.grantee=0 and pg_acl.privilege_type='EXECUTE'
    ) end
  )) from objects),
  'tables',(select jsonb_object_agg(t.name,jsonb_build_object(
    'present',c.oid is not null,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),
    'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT'),
    'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE'),
    'authenticated_delete',has_table_privilege('authenticated',c.oid,'DELETE')))
    from (values ('app_private.fee_assignment_commands'),('public.staff_expense_drafts'),('public.fee_structures'),
      ('public.homework_assignments'),('public.marks_sheets'),('public.marks_entries'),('public.announcements')) t(name)
    left join pg_class c on c.oid=to_regclass(t.name)),
  'policies',(select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p
    where p.schemaname='public' and p.tablename in
      ('staff_expense_drafts','homework_assignments','marks_sheets','marks_entries','announcements')),
  'export_checks_fresh_accountant_mfa',coalesce((
    select position('app_private.accountant_export_mfa_is_fresh()' in pg_get_functiondef(oid))>0
    from objects where signature='public.export_school_finance_invoices(uuid,date,date)'),false),
  'migration_history',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations
    where version between '20261124003000' and '20261124003800')
) as operational_postflight;
