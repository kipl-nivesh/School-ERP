import type { InvoiceStatus, PaymentStatus } from './fee-fields';

export type AccountantQuery = Record<string, string | string[] | undefined>;
export type FinancePanel<T> = { kind: 'ready'; data: T } | { kind: 'denied' | 'unavailable' };
export type ScopedAmount = { school_id: string; id: string; amount_paise: unknown };
export type InvoiceAmount = ScopedAmount & { paid_paise: unknown; due_date: string };

export const invoiceStatuses: readonly InvoiceStatus[] = ['unpaid', 'partial', 'paid', 'overdue'];
export const paymentStatuses: readonly PaymentStatus[] = ['draft', 'settled', 'refunded'];

export function parsePaise(value: unknown): bigint {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value)) return BigInt(value);
  throw new Error('Invalid paise amount');
}

export function formatPaise(value: bigint): string {
  return '₹' + (value / BigInt(100)).toLocaleString('en-IN') + '.' +
    String(value % BigInt(100)).padStart(2, '0');
}

export function invoiceBalance(row: InvoiceAmount) {
  const amount = parsePaise(row.amount_paise);
  const paid = parsePaise(row.paid_paise);
  if (amount <= BigInt(0) || paid > amount) throw new Error('Invalid invoice balance');
  return { amount, paid, outstanding: amount - paid };
}

export function invoiceTotals(rows: InvoiceAmount[], today: string) {
  let assigned = BigInt(0), outstanding = BigInt(0), overdue = BigInt(0);
  for (const row of rows) {
    const balance = invoiceBalance(row);
    assigned += balance.amount;
    outstanding += balance.outstanding;
    if (row.due_date < today) overdue += balance.outstanding;
  }
  return { assigned, outstanding, overdue };
}

export function settledTotal(rows: (ScopedAmount & { status: string })[]) {
  return rows.reduce((sum, row) => sum + (row.status === 'settled' ? parsePaise(row.amount_paise) : BigInt(0)), BigInt(0));
}
