begin;

create table public.staff_expense_drafts (
  id uuid primary key,
  school_id uuid not null references public.schools(id),
  created_by uuid not null,
  category text not null check (category in ('utilities','supplies','maintenance','salaries','events','other')),
  payee text not null check (length(payee) between 1 and 160),
  amount_paise bigint not null check (amount_paise between 1 and 9007199254740991),
  expense_date date not null,
  payment_method text not null check (payment_method in ('cash','upi','card','bank_transfer','cheque')),
  description text not null check (length(description) between 1 and 2000),
  status text not null default 'draft' check (status in ('draft','submitted','cancelled','posted')),
  revision integer not null default 1 check (revision>0),
  updated_at timestamptz not null default now(),
  foreign key (created_by,school_id) references public.staff_profiles(profile_id,school_id)
);
create index staff_expense_drafts_school_updated on public.staff_expense_drafts(school_id,updated_at desc);
alter table public.staff_expense_drafts enable row level security;
alter table public.staff_expense_drafts force row level security;
revoke all on public.staff_expense_drafts from public,anon,authenticated,service_role;
grant select on public.staff_expense_drafts to authenticated;
create policy staff_expense_draft_read on public.staff_expense_drafts for select to authenticated using (
  school_id=public.current_school_id() and public.current_role_has_permission('expenses.read')
  and (public.current_active_role()='admin'
    or (public.current_active_role()='accountant' and created_by=auth.uid()))
);

create function public.manage_staff_expense_draft(
  p_school uuid,p_id uuid,p_intent text,p_revision integer,p_category text,p_payee text,p_amount bigint,
  p_date date,p_method text,p_description text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  school uuid := public.current_school_id();
  actor uuid := auth.uid();
  active_role text := public.current_active_role();
  expense public.staff_expense_drafts%rowtype;
begin
  if school is null or school is distinct from p_school or actor is null or p_id is null
    or coalesce(active_role,'') not in ('accountant','admin')
    or public.current_role_has_permission('expenses.write') is not true then
    raise exception 'Expense change not authorized' using errcode='42501';
  end if;
  if p_intent='approve' then
    if active_role<>'admin' or app_private.require_school_admin() is distinct from school then
      raise exception 'Expense approval not authorized' using errcode='42501';
    end if;
  elsif active_role<>'accountant' then
    raise exception 'Accountant draft required' using errcode='42501';
  end if;
  if p_intent in ('create','edit') and (
    p_payee is null or length(btrim(p_payee)) not between 1 and 160 or p_payee ~ '[[:cntrl:]]'
    or p_description is null or length(btrim(p_description)) not between 1 and 2000
    or p_amount is null or p_amount not between 1 and 9007199254740991
    or p_date is null or not isfinite(p_date) or p_date>current_date
  ) then raise exception 'Invalid expense details' using errcode='22023'; end if;

  if p_intent='create' then
    insert into public.staff_expense_drafts(id,school_id,created_by,category,payee,amount_paise,
      expense_date,payment_method,description)
    values(p_id,school,actor,p_category,btrim(p_payee),p_amount,p_date,p_method,btrim(p_description));
  else
    select * into expense from public.staff_expense_drafts where id=p_id and school_id=school for update;
    if not found or (p_intent='approve' and expense.created_by=actor)
      or (p_intent is distinct from 'approve' and expense.created_by is distinct from actor) then
      raise exception 'Expense draft unavailable' using errcode='42501';
    end if;
    if expense.revision is distinct from p_revision then raise exception 'Expense draft changed' using errcode='40001'; end if;
    if p_intent='edit' and expense.status='draft' then
      update public.staff_expense_drafts set category=p_category,payee=btrim(p_payee),amount_paise=p_amount,
        expense_date=p_date,payment_method=p_method,description=btrim(p_description),
        revision=revision+1,updated_at=now() where id=p_id and school_id=school;
    elsif (p_intent='submit' and expense.status='draft')
      or (p_intent='cancel' and expense.status in ('draft','submitted')) then
      update public.staff_expense_drafts set status=case p_intent when 'submit' then 'submitted' else 'cancelled' end,
        revision=revision+1,updated_at=now() where id=p_id and school_id=school;
    elsif p_intent='approve' and expense.status='submitted' then
      insert into public.operating_expenses(id,school_id,voucher_number,category,payee,amount_paise,
        expense_date,payment_method,description,approved_by_profile_id)
      values(p_id,school,'EXP-'||p_id::text,expense.category,expense.payee,expense.amount_paise,
        expense.expense_date,expense.payment_method,expense.description,actor);
      update public.staff_expense_drafts set status='posted',revision=revision+1,updated_at=now()
        where id=p_id and school_id=school;
    else raise exception 'Expense state does not allow that change' using errcode='22023';
    end if;
  end if;
  insert into public.audit_events(actor_profile_id,event_type,school_id,details)
    values(actor,'staff_expense_'||p_intent,school,jsonb_build_object('id',p_id,'expected_revision',p_revision));
  return p_id;
end $$;

alter function public.manage_staff_expense_draft(uuid,uuid,text,integer,text,text,bigint,date,text,text) owner to postgres;
revoke all on function public.manage_staff_expense_draft(uuid,uuid,text,integer,text,text,bigint,date,text,text)
  from public,anon,service_role;
grant execute on function public.manage_staff_expense_draft(uuid,uuid,text,integer,text,text,bigint,date,text,text)
  to authenticated;

commit;
