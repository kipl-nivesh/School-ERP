'use server';
import { revalidatePath } from 'next/cache';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { evaluatePermission } from '@/lib/auth/authorization';
import type { CollectPaymentInput } from '@/lib/domain/dashboard-contracts';
import { isRecordId } from '@/lib/services/management-contracts';
import { readFinanceWorkspace, type FinancePage } from '@/lib/services/fee-workspace';

export interface FeePaymentActionState {
  readonly ok: boolean;
  readonly message: string;
  readonly receiptNumber?: string;
  readonly isDuplicate?: boolean;
}

const failed: FeePaymentActionState = {
  ok: false,
  message: 'Payment collection could not be completed. Check your permissions and entries.',
};

export async function filterFinance(_previous: FinancePage, form: FormData): Promise<FinancePage> {
  return readFinanceWorkspace(form);
}

export async function recordFeePayment(
  _state: FeePaymentActionState,
  form: FormData
): Promise<FeePaymentActionState> {
  const access = await getStaffAccess();
  const school = access?.context.schoolId;
  if (!access || !school || !['admin', 'accountant'].includes(access.role) ||
      !evaluatePermission(access.context, 'payments.record', Date.now()).allowed) {
    return failed;
  }
  const expectedSchool = form.get('expectedSchool');
  if (expectedSchool !== null && expectedSchool !== school) return failed;

  const val = (key: string) => {
    const item = form.get(key);
    return typeof item === 'string' ? item.trim() : '';
  };

  const studentId = val('studentId');
  const invoiceId = val('invoiceId');
  const amountPaiseInput = val('amountPaise');
  const amountRupeesInput = val('amountRupees');
  const paymentMethod = val('paymentMethod');
  const transactionReference = val('transactionReference');
  const idempotencyKey = val('idempotencyKey');
  const notes = val('notes');

  // Input validation
  if (!isRecordId(studentId)) {
    return { ok: false, message: 'Valid student identifier is required.' };
  }
  if (!isRecordId(invoiceId)) {
    return { ok: false, message: 'Valid invoice identifier is required.' };
  }

  let amountPaise = 0;
  if (amountPaiseInput) {
    if (!/^[1-9]\d*$/.test(amountPaiseInput)) {
      return { ok: false, message: 'Amount in paise must be a positive integer.' };
    }
    amountPaise = Number(amountPaiseInput);
  } else if (amountRupeesInput) {
    if (!/^\d+(\.\d{1,2})?$/.test(amountRupeesInput)) {
      return { ok: false, message: 'Amount in rupees must be a valid number (up to 2 decimal places).' };
    }
    const [rupeesStr, paiseStr = ''] = amountRupeesInput.split('.');
    const rupees = Number(rupeesStr) || 0;
    const paise = Number(paiseStr.padEnd(2, '0')) || 0;
    amountPaise = rupees * 100 + paise;
  }

  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    return { ok: false, message: 'Payment amount must be greater than zero.' };
  }

  const validMethods = ['cash', 'upi', 'card', 'bank_transfer', 'cheque'] as const;
  if (!validMethods.includes(paymentMethod as (typeof validMethods)[number])) {
    return { ok: false, message: 'Select a supported payment method.' };
  }

  if (!transactionReference || transactionReference.length > 100) {
    return { ok: false, message: 'Transaction reference is required (up to 100 characters).' };
  }

  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return { ok: false, message: 'Unique request key must be between 8 and 128 characters.' };
  }

  if (notes.length > 2000) {
    return { ok: false, message: 'Notes must not exceed 2000 characters.' };
  }

  const input: CollectPaymentInput = {
    studentId,
    invoiceId,
    amountPaise,
    paymentMethod: paymentMethod as CollectPaymentInput['paymentMethod'],
    transactionReference,
    idempotencyKey,
    notes: notes || undefined,
  };

  try {
    const { data, error } = await (await staffClient(true)).rpc('collect_fee_payment_atomic', {
      p_school_id: school, p_student_id: input.studentId, p_invoice_id: invoiceId,
      p_amount_paise: input.amountPaise, p_payment_method: input.paymentMethod,
      p_transaction_reference: input.transactionReference, p_idempotency_key: input.idempotencyKey,
      p_notes: input.notes ?? null,
    });
    if (error || !data || !['settled', 'idempotent_duplicate'].includes(data.status) ||
        !isRecordId(data.payment_id ?? '') || !/^REC-[0-9]{4}-[0-9]+$/.test(data.receipt_number ?? '')) return failed;

    revalidatePath(`/staff/${access.role}`);
    const isDuplicate = data.status === 'idempotent_duplicate';
    return {
      ok: true,
      isDuplicate,
      receiptNumber: data.receipt_number,
      message: isDuplicate ? `Existing payment confirmed. Receipt: ${data.receipt_number}` :
        `Payment recorded. Receipt: ${data.receipt_number}`,
    };
  } catch {
    return {
      ok: false,
      message: 'Payment collection failed due to a system error. Retry with the same request key.',
    };
  }
}
