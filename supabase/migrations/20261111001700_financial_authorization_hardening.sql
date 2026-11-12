-- Additive remediation. NOT applied by the implementation task.
begin;

-- These legacy endpoints let callers choose/reset throttling buckets. Do not expose
-- them until a trusted, server-owned rate limiter replaces their protocol.
revoke all on function public.record_auth_rate_limit(text, integer, integer) from public, anon, authenticated, service_role;
revoke all on function public.reset_auth_rate_limit(text) from public, anon, authenticated, service_role;
revoke all on function public.verify_mfa_factor_trusted(uuid, text) from public, anon, authenticated;
revoke all on function public.approve_mfa_factor(uuid, text) from public, anon, authenticated;

-- Settlement and ledger balances may only be changed by reviewed atomic commands.
revoke insert, update, delete on public.fee_payments, public.fee_invoices,
  public.operating_expenses, public.subscription_payment_intents from public, anon, authenticated;
drop function if exists public.collect_fee_payment_atomic(uuid, uuid, bigint, text, text, text, text);

create or replace function public.collect_fee_payment_atomic(
  p_student_id uuid, p_invoice_id uuid, p_amount_paise bigint,
  p_payment_method text, p_transaction_reference text, p_idempotency_key text,
  p_notes text default null, p_school_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid := public.current_school_id();
  v_role text := public.current_active_role();
  v_invoice public.fee_invoices%rowtype;
  v_payment public.fee_payments%rowtype;
  v_paid bigint;
begin
  if auth.uid() is null or v_school is null or v_role is null
     or v_role not in ('admin', 'accountant')
     or (p_school_id is not null and p_school_id is distinct from v_school)
     or not exists (
       select 1 from public.role_contexts c join public.user_roles m on m.id = c.assignment_id
       where c.id = (auth.jwt()->>'session_id')::uuid and c.profile_id = auth.uid()
         and c.school_id = v_school and m.school_id = v_school
         and m.profile_id = auth.uid() and m.role_code = v_role
         and m.membership_status = 'active' and m.valid_from <= now()
         and (m.valid_until is null or m.valid_until > now())
         and 'payments.record' = any(m.permissions)
     ) then
    raise exception 'Payment collection not authorized' using errcode = '42501';
  end if;
  if p_student_id is null or p_invoice_id is null or p_amount_paise is null or p_amount_paise <= 0
     or p_payment_method is null or p_payment_method not in ('cash','upi','card','bank_transfer','cheque')
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128
     or p_transaction_reference is null or length(p_transaction_reference) not between 1 and 100
     or length(p_notes) > 2000 then
    raise exception 'Invalid payment input' using errcode = '22023';
  end if;
  -- Serialize retries before reading the idempotency record, including different invoices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key, 0));
  select * into v_payment from public.fee_payments where idempotency_key = p_idempotency_key;
  if found then
    if v_payment.school_id is distinct from v_school
       or v_payment.student_id is distinct from p_student_id
       or v_payment.invoice_id is distinct from p_invoice_id
       or v_payment.amount_paise is distinct from p_amount_paise
       or v_payment.payment_method is distinct from p_payment_method
       or v_payment.transaction_reference is distinct from p_transaction_reference
       or v_payment.notes is distinct from p_notes or v_payment.status <> 'settled' then
      raise exception 'Payment request conflict' using errcode = '23505';
    end if;
    return jsonb_build_object('status','idempotent_duplicate','payment_id',v_payment.id,
      'receipt_number',v_payment.receipt_number,'amount_paise',v_payment.amount_paise,'payment_status',v_payment.status);
  end if;
  select * into v_invoice from public.fee_invoices
    where id = p_invoice_id and student_id = p_student_id and school_id = v_school for update;
  if not found then
    raise exception 'Invoice unavailable' using errcode = '42501';
  end if;
  if p_amount_paise > v_invoice.amount_paise - v_invoice.paid_paise then
    raise exception 'Amount exceeds outstanding balance' using errcode = '22003';
  end if;
  insert into public.fee_payments (school_id,student_id,invoice_id,receipt_number,amount_paise,
    payment_method,transaction_reference,notes,idempotency_key,status,collected_by_profile_id)
  values (v_school,p_student_id,p_invoice_id,
    'REC-' || to_char(current_date,'YYYY') || '-' || nextval('public.fee_payments_receipt_seq'::regclass)::text,
    p_amount_paise,p_payment_method,p_transaction_reference,p_notes,p_idempotency_key,'settled',auth.uid())
  returning * into v_payment;
  v_paid := v_invoice.paid_paise + p_amount_paise;
  update public.fee_invoices set paid_paise = v_paid,
    status = case when v_paid = amount_paise then 'paid' else 'partial' end
    where id = p_invoice_id and school_id = v_school;
  insert into public.audit_events(actor_profile_id,target_profile_id,event_type,school_id)
    select auth.uid(),s.profile_id,'fee_payment_collected',v_school from public.students s
    where s.id = p_student_id and s.school_id = v_school;
  return jsonb_build_object('status','settled','payment_id',v_payment.id,
    'receipt_number',v_payment.receipt_number,'amount_paise',p_amount_paise,'new_paid_paise',v_paid,
    'remaining_balance_paise',v_invoice.amount_paise-v_paid,
    'invoice_status',case when v_paid = v_invoice.amount_paise then 'paid' else 'partial' end);
end;
$$;
revoke all on function public.collect_fee_payment_atomic(uuid,uuid,bigint,text,text,text,text,uuid) from public,anon,service_role;
grant execute on function public.collect_fee_payment_atomic(uuid,uuid,bigint,text,text,text,text,uuid) to authenticated;
commit;
