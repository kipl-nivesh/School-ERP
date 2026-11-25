import 'server-only';
import { cache } from 'react';
import { staffClient } from '../staff/server';
import { FINANCE_REPORT_LIMIT } from './finance-report-calculation';
import type { InvoiceStatus } from './fee-fields';

type InvoiceSnapshotRow = {
  id: string;
  school_id: string;
  student_id: string;
  invoice_number: string;
  title: string;
  amount_paise: string;
  paid_paise: string;
  due_date: string;
  status: InvoiceStatus;
};
type PaymentSnapshotRow = {
  id: string;
  school_id: string;
  amount_paise: string;
  payment_method: string;
  status: string;
};

async function readSnapshot<T extends { id: string; school_id: string }>(
  schoolId: string,
  dataset: 'invoices' | 'settled_payments',
) {
  const result = await (await staffClient()).rpc('read_accountant_finance_snapshot', {
    p_school: schoolId,
    p_dataset: dataset,
  });
  if (result.error) return { data: null, count: null, error: result.error };
  const snapshot = result.data as { complete?: unknown; count?: unknown; rows?: unknown } | null;
  const rows = snapshot?.rows;
  const count = snapshot?.count;
  if (snapshot?.complete !== true || typeof count !== 'number' || !Number.isSafeInteger(count) ||
      count < 0 || count > FINANCE_REPORT_LIMIT || !Array.isArray(rows) || rows.length !== count ||
      rows.some(row => !row || row.school_id !== schoolId || typeof row.id !== 'string') ||
      new Set(rows.map(row => row.id)).size !== rows.length) {
    return { data: null, count: null, error: { message: 'Incomplete or invalid finance snapshot' } };
  }
  return { data: rows as T[], count, error: null };
}

// Share only within one server render. The database independently checks the
// active school, current role and permission for each dataset.
export const readAccountantInvoiceTotals = cache((schoolId: string) =>
  readSnapshot<InvoiceSnapshotRow>(schoolId, 'invoices'));

export const readAccountantPaymentTotals = cache((schoolId: string) =>
  readSnapshot<PaymentSnapshotRow>(schoolId, 'settled_payments'));
