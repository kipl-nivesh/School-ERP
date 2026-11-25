'use client';

import { useActionState, useState } from 'react';
import { recordFeePayment } from '@/app/staff/fee-workspace-actions';

export function AccountantPaymentForm({ school, invoice, student, requestId }: {
  school: string; invoice: string; student: string; requestId: string;
}) {
  const [key] = useState(requestId);
  const [state, action, pending] = useActionState(recordFeePayment, { ok: false, message: '' });
  return <details>
    <summary>Record payment for this invoice</summary>
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="expectedSchool" value={school} />
      <input type="hidden" name="invoiceId" value={invoice} />
      <input type="hidden" name="studentId" value={student} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <fieldset disabled={pending || state.ok}>
        <label>Amount (₹)<input name="amountRupees" required inputMode="decimal" maxLength={18} /></label>
        <label>Payment method<select name="paymentMethod" required>
          <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option>
        </select></label>
        <label>Transaction reference<input name="transactionReference" required maxLength={100} /></label>
        <label>Notes (optional)<input name="notes" maxLength={2000} /></label>
        <button type="submit">{pending ? 'Recording…' : 'Record payment'}</button>
      </fieldset>
      {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
      {state.ok && <p>Reload the ledger before recording another payment for this invoice.</p>}
    </form>
  </details>;
}
