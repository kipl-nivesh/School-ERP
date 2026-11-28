import 'server-only';
import { evaluateDashboardAccess, evaluatePermission } from '../auth/authorization';
import { getAccountantRenderAccess, staffClient } from '../staff/server';
import { readAccountantInvoiceTotals, readAccountantPaymentTotals } from './accountant-render-totals';
import { accountantMayRequestExport } from '../staff/accountant-export-mfa';
import { validAttendanceDate } from './attendance-fields';
import { isRecordId } from './management-contracts';
import { invoiceBalance, invoiceStatuses, invoiceTotals, parsePaise, paymentStatuses, settledTotal } from './accountant-finance-fields';
import type { AccountantQuery, FinancePanel, InvoiceAmount, ScopedAmount } from './accountant-finance-fields';
import type { AccountantWorkspaceKey } from '../staff/accountant-workspace';

const pageSize = 20;
const totalsLimit = 500;
const denied = { kind: 'denied' } as const;
const unavailable = { kind: 'unavailable' } as const;
const ready = <T>(data: T): FinancePanel<T> => ({ kind: 'ready', data });

function parseFilters(query: AccountantQuery) {
  function field(key: string, valid: (value: string) => boolean) {
    const value = query[key];
    if (value === undefined || value === '') return '';
    if (typeof value !== 'string' || !valid(value)) throw new Error('Invalid filter');
    return value;
  }
  const page = (key: string) => Number(field(key, value => /^[1-9][0-9]{0,2}$/.test(value)) || 1);
  const dateFrom = field('dateFrom', validAttendanceDate);
  const dateTo = field('dateTo', validAttendanceDate);
  if (dateFrom && dateTo && dateFrom > dateTo) throw new Error('Invalid date range');
  return {
    dateFrom, dateTo,
    classId: field('classId', isRecordId), studentId: field('studentId', isRecordId),
    receiptId: field('receiptId', isRecordId),
    invoiceStatus: field('invoiceStatus', value => invoiceStatuses.some(status => value === status)),
    paymentStatus: field('paymentStatus', value => paymentStatuses.some(status => value === status)),
    ledgerPage: page('ledgerPage'), paymentPage: page('paymentPage'), structurePage: page('structurePage'),
  };
}
export type AccountantFilters = ReturnType<typeof parseFilters>;

type Invoice = InvoiceAmount & { student_id: string; invoice_number: string; title: string; issue_date: string; status: string };
type Payment = ScopedAmount & { student_id: string; receipt_number?: string; transaction_reference?: string; status: string;
  payment_date: string; payment_method: string };
type Structure = ScopedAmount & { class_id: string; fee_category: string; frequency: string; due_date: string };
type SchoolClass = { id: string; name: string; school_id: string };
type Scoped = { id: string; school_id: string };
type Rows = { data: unknown; error: unknown; count?: number | null };

function scoped<T extends Scoped>(response: Rows, school: string): T[] {
  if (response.error || !Array.isArray(response.data) ||
      response.data.some(row => !row || row.school_id !== school || typeof row.id !== 'string') ||
      new Set(response.data.map(row => row.id)).size !== response.data.length) throw new Error('Unverified finance rows');
  return response.data as T[];
}
async function panel<T>(allowed: boolean, load: () => Promise<T>): Promise<FinancePanel<T>> {
  if (!allowed) return denied;
  try { return ready(await load()); } catch { return unavailable; }
}
function paginated<T, R>(rows: T[], project: (row: T) => R) {
  return { items: rows.slice(0, pageSize).map(project), next: rows.length > pageSize };
}
function complete<T>(rows: T[], count: number | null | undefined) {
  if (count !== rows.length || rows.length > totalsLimit) throw new Error('Incomplete aggregate');
  return rows;
}
function paymentView(row: Payment, receiptVisible: boolean) {
  if (!paymentStatuses.some(status => row.status === status)) throw new Error('Invalid payment status');
  return {
    id: row.id, studentId: row.student_id, amount: parsePaise(row.amount_paise), date: row.payment_date,
    method: row.payment_method, status: row.status,
    receiptNumber: receiptVisible && row.status === 'settled' ? row.receipt_number ?? null : null,
    reference: row.transaction_reference ?? null,
  };
}

export async function readAccountantFinance(query: AccountantQuery, workspace: AccountantWorkspaceKey = 'overview') {
  const access = await getAccountantRenderAccess();
  const school = access?.context.schoolId;
  if (!access || !school || access.role !== 'accountant' ||
      !evaluateDashboardAccess(access.context, 'accountant', Date.now()).allowed) return denied;

  let filters: AccountantFilters;
  try { filters = parseFilters(query); } catch { return { kind: 'invalid' } as const; }
  const allowed = (permission: string) => evaluatePermission(access.context, permission, Date.now()).allowed;
  const fees = allowed('fees.read');
  const payments = allowed('payments.read');
  const receipts = allowed('receipts.read');
  const canCollect = fees && allowed('payments.record');
  const canConfigure = fees && allowed('fees.write');
  const canReport = fees && allowed('reports.read');
  const canRequestExport = accountantMayRequestExport(access.context, Date.now());
  if ((!fees && !payments && !receipts) || workspace === 'expenses' || workspace === 'reports' || workspace === 'records') {
    return { kind: 'ready', schoolId: school, filters, schoolName: access.schoolName,
      feesAllowed: fees, paymentsAllowed: payments || receipts,
      invoiceTotals: Promise.resolve(denied), collected: Promise.resolve(denied), ledger: denied, history: denied, recent: denied,
      receipt: denied, structures: denied, classes: denied, canCollect, canConfigure,
      canReport, canRequestExport } as const;
  }

  try {
    const client = await staffClient();
    // The current schema has no verified school timezone. Withhold overdue totals.
    const range = (page: number) => [(page - 1) * pageSize, page * pageSize] as const;
    const historyFields = 'id,school_id,student_id,amount_paise::text,payment_date,payment_method,status';
    const receiptFields = historyFields + ',receipt_number';
    const visibleFields = (receipts ? receiptFields : historyFields) + (payments ? ',transaction_reference' : '');
    const selectedStudent = (row: { student_id: string }) => !filters.studentId || row.student_id === filters.studentId;
    const summary = workspace === 'overview'
      ? panel(fees, async () => {
          const result = await readAccountantInvoiceTotals(school);
          return invoiceTotals(complete(scoped<InvoiceAmount>(result, school), result.count), null);
        })
      : Promise.resolve(denied);
    const collected = workspace === 'overview'
      ? panel(payments || receipts, async () => {
          const result = await readAccountantPaymentTotals(school);
          return settledTotal(complete(scoped<Payment>(result, school), result.count));
        })
      : Promise.resolve(denied);
    const [ledger, history, recent, receipt, structures, classes] = await Promise.all([
      workspace === 'ledger'
        ? panel(fees, async () => {
            let request = client.from('fee_invoices')
              .select('id,school_id,student_id,invoice_number,title,issue_date,due_date,amount_paise::text,paid_paise::text,status')
              .eq('school_id', school);
            if (filters.studentId) request = request.eq('student_id', filters.studentId);
            if (filters.invoiceStatus) request = request.eq('status', filters.invoiceStatus);
            if (filters.dateFrom) request = request.gte('issue_date', filters.dateFrom);
            if (filters.dateTo) request = request.lte('issue_date', filters.dateTo);
            return paginated(scoped<Invoice>(await request.order('issue_date', { ascending: false }).order('id')
              .range(...range(filters.ledgerPage)), school), row => {
              if (!selectedStudent(row)) throw new Error('Invoice student mismatch');
              return { id: row.id, studentId: row.student_id, number: row.invoice_number, title: row.title,
              due: row.due_date, status: row.status, ...invoiceBalance(row) };
            });
          })
        : Promise.resolve(denied),
      workspace === 'payments'
        ? panel(payments || receipts, async () => {
            let request = client.from('fee_payments').select(visibleFields).eq('school_id', school);
            if (!payments) request = request.eq('status', 'settled');
            if (filters.studentId) request = request.eq('student_id', filters.studentId);
            if (filters.paymentStatus) request = request.eq('status', filters.paymentStatus);
            if (filters.dateFrom) request = request.gte('payment_date', filters.dateFrom);
            if (filters.dateTo) request = request.lte('payment_date', filters.dateTo);
            return paginated(scoped<Payment>(await request.order('payment_date', { ascending: false }).order('id')
              .range(...range(filters.paymentPage)), school), row => {
              if (!selectedStudent(row) || (!payments && row.status !== 'settled')) throw new Error('Payment scope mismatch');
              return paymentView(row, receipts);
            });
          })
        : Promise.resolve(denied),
      workspace === 'overview'
        ? panel(payments || receipts, async () => scoped<Payment>(await client.from('fee_payments').select(visibleFields)
            .eq('school_id', school).eq('status', 'settled').order('payment_date', { ascending: false })
            .order('id').limit(5), school).map(row => {
            if (row.status !== 'settled') throw new Error('Unexpected recent payment status');
            return paymentView(row, receipts);
          }))
        : Promise.resolve(denied),
      workspace === 'payments'
        ? panel(receipts, async () => {
            if (!filters.receiptId) return null;
            const rows = scoped<Payment>(await client.from('fee_payments').select(receiptFields)
              .eq('school_id', school).eq('id', filters.receiptId).eq('status', 'settled').limit(2), school);
            if (rows.length !== 1 || rows[0].id !== filters.receiptId || rows[0].status !== 'settled') return null;
            return paymentView(rows[0], true);
          })
        : Promise.resolve(denied),
      workspace === 'structures'
        ? panel(fees, async () => {
            let request = client.from('fee_structures').select('id,school_id,class_id,fee_category,amount_paise::text,frequency,due_date')
              .eq('school_id', school);
            if (filters.classId) request = request.eq('class_id', filters.classId);
            return paginated(scoped<Structure>(await request.order('due_date').order('id')
              .range(...range(filters.structurePage)), school), row => ({
              id: row.id, classId: row.class_id, category: row.fee_category,
              amount: parsePaise(row.amount_paise), frequency: row.frequency, due: row.due_date,
            }));
          })
        : Promise.resolve(denied),
      workspace === 'structures'
        ? panel(fees, async () => scoped<SchoolClass>(await client.rpc('list_accountant_fee_classes', { p_school: school }), school))
        : Promise.resolve(denied),
    ]);
    return { kind: 'ready', schoolId: school, schoolName: access.schoolName, filters,
      feesAllowed: fees, paymentsAllowed: payments || receipts,
      invoiceTotals: summary, collected,
      ledger, history, recent, receipt, structures, classes, canCollect, canConfigure, canReport, canRequestExport } as const;
  } catch { return unavailable; }
}
