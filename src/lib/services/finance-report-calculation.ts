import { schoolCalendarDate } from '../timezone/school-timezone';
import { invoiceBalance, invoiceStatuses, parsePaise } from './accountant-finance-fields';
import { isValidDateString, type FinanceReportMetrics } from './report-fields';
import type { PaymentMethod } from './fee-fields';

export { schoolCalendarDate };

export const FINANCE_REPORT_LIMIT = 1000;

type ReportResponse<T> = { data: T[] | null; count: number | null; error: unknown };
type Invoice = { amount_paise: unknown; paid_paise: unknown; due_date: string; status: string };
type Payment = { amount_paise: unknown; payment_method: unknown; status: string };
const paymentMethods = new Set<unknown>(['cash', 'upi', 'card', 'bank_transfer', 'cheque']);
const zero = BigInt(0);

export function checkedFinanceRows<T>(response: ReportResponse<T>, offset = 0, limit = FINANCE_REPORT_LIMIT): T[] {
  const { data, count, error } = response;
  if (error || !Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0 ||
      data.length !== Math.min(limit, Math.max(0, count - offset))) {
    throw new Error('Finance records are incomplete');
  }
  return data;
}

export function reportInvoiceBalance(invoice: Invoice) {
  if (!invoiceStatuses.some(status => status === invoice.status) || !isValidDateString(invoice.due_date)) {
    throw new Error('Invalid invoice record');
  }
  return invoiceBalance({ ...invoice, id: '', school_id: '' });
}

export function calculateFinanceReport(
  invoicesResult: ReportResponse<Invoice>,
  paymentsResult: ReportResponse<Payment>,
  schoolDate: string | null,
): FinanceReportMetrics {
  const invoices = checkedFinanceRows(invoicesResult);
  const payments = checkedFinanceRows(paymentsResult);
  if (invoicesResult.count !== invoices.length || paymentsResult.count !== payments.length) {
    throw new Error('Finance summary exceeds the supported row limit');
  }
  let billed = zero, outstanding = zero, overdue = zero, collected = zero;
  for (const invoice of invoices) {
    const balance = reportInvoiceBalance(invoice);
    billed += balance.amount;
    outstanding += balance.outstanding;
    if (schoolDate && invoice.due_date < schoolDate) overdue += balance.outstanding;
  }
  const methods = new Map<PaymentMethod | 'unknown', { count: number; total: bigint }>();
  for (const payment of payments) {
    if (payment.status !== 'settled') throw new Error('Unexpected payment status');
    const amount = parsePaise(payment.amount_paise);
    collected += amount;
    const method = paymentMethods.has(payment.payment_method) ? payment.payment_method as PaymentMethod : 'unknown';
    const row = methods.get(method) ?? { count: 0, total: zero };
    row.count += 1;
    row.total += amount;
    methods.set(method, row);
  }
  const rateBasisPoints = billed > zero ? collected * BigInt(10000) / billed : null;
  return {
    totalBilledPaise: billed.toString(),
    totalCollectedPaise: collected.toString(),
    outstandingPaise: outstanding.toString(),
    overduePaise: schoolDate ? overdue.toString() : null,
    collectionRatePercent: rateBasisPoints !== null && rateBasisPoints <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(rateBasisPoints) / 100 : null,
    methodBreakdown: [...methods].map(([method, { count, total }]) => ({
      method, count, totalPaise: total.toString(),
      sharePercent: collected > zero ? Number((total * BigInt(100) + collected / BigInt(2)) / collected) : 0,
    })),
  };
}
