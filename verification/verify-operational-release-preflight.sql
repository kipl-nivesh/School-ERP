-- Owner-run catalog check before migrations 030–038. Verify project reference in the Dashboard first.
begin transaction read only;
set local statement_timeout = '20s';

with prerequisites(signature) as (
  values ('public.accept_staff_invitation(text)'),
    ('public.current_school_id()'), ('public.current_active_role()'),
    ('public.current_role_has_permission(text)'), ('app_private.require_school_admin()'),
    ('app_private.staff_password_is_recent()'), ('public.staff_session_is_live()'),
    ('public.manage_academics(uuid,text,uuid,jsonb)'),
    ('public.save_attendance_atomic(uuid,jsonb,uuid)'),
    ('public.create_homework_atomic(uuid,uuid,text,text,text,date,integer,uuid)'),
    ('public.collect_fee_payment_atomic(uuid,uuid,bigint,text,text,text,text,uuid)')
), pending(signature) as (
  values ('app_private.default_managed_staff_permissions(text)'),
    ('public.update_academic_lifecycle(uuid,text,uuid,text,text,uuid,date)'),
    ('public.save_teacher_draft_mark(uuid,uuid,uuid,numeric,numeric)'),
    ('public.configure_school_fee(uuid,uuid,uuid,text,text,bigint,date,bigint,date)'),
    ('public.assign_school_fee(uuid,uuid,uuid,date)'),
    ('public.manage_teacher_staff_announcement(uuid,uuid,text,text,text)'),
    ('public.manage_staff_expense_draft(uuid,uuid,text,integer,text,text,bigint,date,text,text)'),
    ('public.export_school_finance_invoices(uuid,date,date)'),
    ('app_private.accountant_export_mfa_is_fresh()')
), required(table_name, columns) as (
  values ('public.classes','id,school_id,name'), ('public.sections','id,school_id,class_id,academic_year_id,name'),
    ('public.schools','id,status'), ('public.academic_years','id,school_id,starts_on,ends_on'),
    ('public.staff_profiles','profile_id,school_id,is_active'), ('public.profiles','id,account_status,credential_reset_required'),
    ('public.user_roles','id,profile_id,school_id,role_code,membership_status,valid_from,valid_until,permissions'),
    ('public.staff_invitations','id,school_id,role_code,managed_staff,status,accepted_at'),
    ('public.teacher_assignments','id,school_id,section_id,academic_year_id,teacher_profile_id,subject_code,valid_from,valid_until'),
    ('public.enrollments','school_id,section_id,academic_year_id,student_id,valid_from,valid_until'),
    ('public.students','id,school_id,enrollment_status'),
    ('public.homework_assignments','school_id,section_id,subject_code'),
    ('public.marks_sheets','id,school_id,section_id,subject_code,exam_date,max_marks,is_published,published_at'),
    ('public.marks_entries','id,school_id,marks_sheet_id,student_id,marks_obtained'),
    ('public.fee_structures','id,school_id,class_id,fee_category,frequency,amount_paise,due_date'),
    ('public.fee_invoices','id,school_id,student_id,academic_year_id,invoice_number,issue_date,due_date,amount_paise,paid_paise,status'),
    ('public.fee_payments','school_id,idempotency_key'),
    ('public.operating_expenses','id,school_id,voucher_number,category,payee,amount_paise,expense_date,payment_method,description,approved_by_profile_id'),
    ('public.announcements','id,school_id,author_profile_id,target_audience,title,content,published_at,expires_at'),
    ('public.audit_events','actor_profile_id,target_profile_id,school_id,event_type,details'),
    ('auth.mfa_factors','user_id,status,factor_type')
), missing_columns as (
  select r.table_name||'.'||c.name as name
  from required r cross join lateral unnest(string_to_array(r.columns,',')) as c(name)
  where not exists(select 1 from pg_attribute a where a.attrelid=to_regclass(r.table_name)
    and a.attname=c.name and a.attnum>0 and not a.attisdropped)
)
select jsonb_build_object(
  'run_as',current_user,
  'migration_029_index', (select pg_get_indexdef(indexrelid) from pg_index
    where indexrelid=to_regclass('public.staff_profiles_school_employee_code_ci_key') and indisvalid and indisunique),
  'migration_029_status_check',(select pg_get_constraintdef(oid) from pg_constraint
    where conrelid=to_regclass('public.user_roles') and conname='user_roles_membership_status_check' and convalidated),
  'missing_columns',coalesce((select jsonb_agg(name order by name) from missing_columns),'[]'),
  'prerequisites',(select jsonb_object_agg(x.signature,jsonb_build_object(
    'present',p.oid is not null,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,
    'settings',p.proconfig,'execute_authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE')))
    from prerequisites x left join pg_proc p on p.oid=to_regprocedure(x.signature)),
  'pending_rpcs_present',coalesce((select jsonb_agg(signature) from pending where to_regprocedure(signature) is not null),'[]'),
  'pending_tables_present',coalesce((select jsonb_agg(name) from (values
    ('app_private.fee_assignment_commands'),('public.staff_expense_drafts')) t(name) where to_regclass(name) is not null),'[]'),
  'force_rls', (select jsonb_object_agg(r.table_name,c.relrowsecurity and c.relforcerowsecurity)
    from required r left join pg_class c on c.oid=to_regclass(r.table_name) where r.table_name like 'public.%'),
  'required_keys', (select jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid)))
    from pg_index i where i.indisunique and i.indisvalid and i.indimmediate and i.indrelid in
    (to_regclass('public.staff_profiles'),to_regclass('public.students'),to_regclass('public.fee_invoices'),
     to_regclass('public.fee_payments'),to_regclass('public.marks_entries'),to_regclass('public.fee_structures'))),
  'enabled_membership_trigger',exists(select 1 from pg_trigger where
    tgrelid=to_regclass('public.user_roles') and tgname='membership_context_invalidation' and tgenabled in ('O','A')),
  'migration_history_table',to_regclass('supabase_migrations.schema_migrations') is not null
) as operational_preflight;

-- Compare the migration ledger independently of object presence.
select version,name from supabase_migrations.schema_migrations
where version between '20261124002900' and '20261124003800'
order by version;

rollback;
