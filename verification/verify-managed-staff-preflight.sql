-- Run in the verified disposable project's SQL Editor before migration 029.
begin transaction read only;
set local statement_timeout = '20s';

with old_key as (
  select oid, conindid, pg_get_constraintdef(oid) as definition
  from pg_constraint
  where conrelid = 'public.staff_profiles'::regclass
    and conname = 'staff_profiles_employee_code_key' and contype = 'u'
), dependencies as (
  select distinct d.classid, d.objid, d.objsubid, d.deptype
  from old_key k
  join pg_depend d on
    (d.refclassid = 'pg_constraint'::regclass and d.refobjid = k.oid)
    or (d.refclassid = 'pg_class'::regclass and d.refobjid = k.conindid)
  where not (d.classid = 'pg_class'::regclass and d.objid = k.conindid)
), duplicate_groups as (
  select count(*) as records
  from public.staff_profiles
  where employee_code is not null
  group by school_id, lower(employee_code)
  having count(*) > 1
)
select
  (select definition from old_key) as old_global_constraint,
  (select count(*) from duplicate_groups) as duplicate_groups,
  (select coalesce(sum(records), 0) from duplicate_groups) as records_in_duplicate_groups,
  (select count(*) from public.staff_profiles where school_id is null) as missing_school_count,
  (select attnotnull from pg_attribute
     where attrelid = 'public.staff_profiles'::regclass
       and attname = 'school_id' and not attisdropped) as school_not_null,
  coalesce((select jsonb_agg(jsonb_build_object(
    'object', pg_describe_object(classid, objid, objsubid),
    'dependency_type', deptype) order by classid, objid, objsubid, deptype)
    from dependencies), '[]'::jsonb) as dependent_objects,
  to_regclass('public.staff_profiles_school_employee_code_ci_key') is not null
    as replacement_index_already_exists;

rollback;
