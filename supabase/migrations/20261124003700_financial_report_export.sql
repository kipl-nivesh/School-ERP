begin;

create function public.export_school_finance_invoices(p_school uuid,p_from date,p_to date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  school uuid := public.current_school_id();
  actor uuid := auth.uid();
  report jsonb;
begin
  if school is null or school is distinct from p_school or actor is null
    or coalesce(public.current_active_role(),'') not in ('admin','accountant')
    or (auth.jwt()->>'aal') is distinct from 'aal2'
    or not exists(select 1 from auth.mfa_factors f where f.user_id=actor and f.status='verified' and f.factor_type='totp')
    or not exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array'
        then auth.jwt()->'amr' else '[]'::jsonb end) a where a->>'method'='totp'
    )
    or app_private.staff_password_is_recent() is not true
    or public.current_role_has_permission('reports.export') is not true
    or public.current_role_has_permission('reports.read') is not true
    or public.current_role_has_permission('fees.read') is not true then
    raise exception 'Financial export not authorized' using errcode='42501';
  end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to)
    or p_from>p_to or p_to-p_from>365 then
    raise exception 'Invalid export date range' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.issued,r.number),'[]'::jsonb) into report
  from (
    select i.invoice_number as number,i.issue_date as issued,i.due_date as due,i.status,
      i.amount_paise::text as billed_paise,i.paid_paise::text as paid_paise,
      (i.amount_paise-i.paid_paise)::text as outstanding_paise
    from public.fee_invoices i where i.school_id=school and i.issue_date between p_from and p_to
    order by i.issue_date,i.invoice_number limit 501
  ) r;
  if jsonb_array_length(report)>500 then
    raise exception 'Export exceeds 500 invoices; shorten date range' using errcode='54000';
  end if;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(actor,'financial_invoice_export',school,jsonb_build_object('from',p_from,'to',p_to,'rows',jsonb_array_length(report)));
  return report;
end $$;

alter function public.export_school_finance_invoices(uuid,date,date) owner to postgres;
revoke all on function public.export_school_finance_invoices(uuid,date,date) from public,anon,service_role;
grant execute on function public.export_school_finance_invoices(uuid,date,date) to authenticated;

commit;
