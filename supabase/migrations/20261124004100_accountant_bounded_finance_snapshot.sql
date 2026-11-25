begin;

-- One bounded statement per dataset. The sentinel is produced inside SQL,
-- where a PostgREST row cap cannot turn an incomplete response into a total.
create function public.read_accountant_finance_snapshot(p_school uuid, p_dataset text)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_school is null
    or p_school is distinct from public.current_school_id()
    or auth.uid() is null
    or public.current_active_role() is distinct from 'accountant' then
    raise exception 'Accountant finance snapshot not authorized' using errcode = '42501';
  end if;

  if p_dataset = 'invoices' then
    if public.current_role_has_permission('fees.read') is not true then
      raise exception 'Invoice snapshot not authorized' using errcode = '42501';
    end if;
    select case when count(*) > 1000 then
      jsonb_build_object('complete', false)
    else
      jsonb_build_object('complete', true, 'count', count(*),
        'rows', coalesce(jsonb_agg(to_jsonb(r) - 'issue_date' order by r.issue_date desc, r.id), '[]'::jsonb))
    end into result
    from (
      select i.id, i.school_id, i.student_id, i.invoice_number, i.title,
        i.amount_paise::text, i.paid_paise::text, i.due_date, i.status, i.issue_date
      from public.fee_invoices i
      where i.school_id = p_school
      order by i.issue_date desc, i.id
      limit 1001
    ) r;
  elsif p_dataset = 'settled_payments' then
    if public.current_role_has_permission('payments.read') is not true
      and public.current_role_has_permission('receipts.read') is not true then
      raise exception 'Payment snapshot not authorized' using errcode = '42501';
    end if;
    select case when count(*) > 1000 then
      jsonb_build_object('complete', false)
    else
      jsonb_build_object('complete', true, 'count', count(*),
        'rows', coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb))
    end into result
    from (
      select p.id, p.school_id, p.amount_paise::text, p.payment_method, p.status
      from public.fee_payments p
      where p.school_id = p_school and p.status = 'settled'
      order by p.id
      limit 1001
    ) r;
  else
    raise exception 'Unsupported finance snapshot dataset' using errcode = '22023';
  end if;

  return result;
end;
$$;

revoke all on function public.read_accountant_finance_snapshot(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.read_accountant_finance_snapshot(uuid, text)
  to authenticated;

commit;
