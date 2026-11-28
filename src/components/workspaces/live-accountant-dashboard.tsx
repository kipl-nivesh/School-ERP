import { evaluatePermission } from '@/lib/auth/authorization';
import type { getAccountantRenderAccess } from '@/lib/staff/server';
import { readAccountantSupportingRecords } from '@/lib/services/live-workspace';
import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CreditCard,
  FolderOpen,
  Layers,
  Receipt,
} from 'lucide-react';
import { Suspense, type ReactNode } from 'react';
import { AccountantPaymentForm } from './accountant-payment-form';
import { AccountantFeeCommand, PrintAccountantReceipt } from './accountant-fee-command';
import { ReportManagement } from './report-management';
import { FinancialExportForm } from './financial-export-form';
import { StaffExpenseDrafts } from './staff-expense-drafts';
import { readReportsWorkspace, type ReportPage } from '@/lib/services/report-workspace';
import { readAccountantFinance, type AccountantFilters } from '@/lib/services/accountant-finance';
import { formatPaise, invoiceStatuses, paymentStatuses } from '@/lib/services/accountant-finance-fields';
import type { AccountantQuery, FinancePanel } from '@/lib/services/accountant-finance-fields';
import {
  resolveAccountantWorkspace,
  type AccountantWorkspaceKey,
} from '@/lib/staff/accountant-workspace';
import {
  AccountantModuleSkeleton,
  AccountantWorkspaceShell,
} from './accountant-workspace-shell';
import shell from './live-admin-dashboard.module.css';
import styles from './live-accountant-dashboard.module.css';

type FinanceResult = Awaited<ReturnType<typeof readAccountantFinance>>;
type FinanceReady = Extract<FinanceResult, { kind: 'ready' }>;
const route = '/staff/accountant';
type SupportingRecords = Awaited<ReturnType<typeof readAccountantSupportingRecords>>;
const recordAnchor = (title: string) => 'records-' + title.toLowerCase();

function financeLink(
  workspace: AccountantWorkspaceKey,
  filters: AccountantFilters,
  changes: Partial<AccountantFilters>,
  section?: string
) {
  const search = new URLSearchParams({ workspace });
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value && value !== 1) search.set(key, String(value));
  }
  return route + '?' + search.toString() + (section ? '#' + section : '');
}

function Panel<T>({ value, children }: { value: FinancePanel<T>; children: (data: T) => ReactNode }) {
  return value.kind === 'ready' ? (
    children(value.data)
  ) : (
    <p className={shell.empty}>
      {value.kind === 'denied' ? 'Permission required.' : 'Information unavailable.'}
    </p>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id + '-heading'} className={shell.record}>
      <h2 id={id + '-heading'}>{title}</h2>
      {children}
    </section>
  );
}

function Pages({
  workspace,
  filters,
  field,
  section,
  next,
}: {
  workspace: AccountantWorkspaceKey;
  filters: AccountantFilters;
  field: 'ledgerPage' | 'paymentPage' | 'structurePage';
  section: string;
  next: boolean;
}) {
  return (
    <nav aria-label={section + ' pages'} className={styles.pager}>
      {filters[field] > 1 && (
        <Link href={financeLink(workspace, filters, { [field]: filters[field] - 1 }, section)}>
          Previous
        </Link>
      )}
      <span>Page {filters[field]}</span>
      {next && filters[field] < 999 && (
        <Link href={financeLink(workspace, filters, { [field]: filters[field] + 1 }, section)}>
          Next
        </Link>
      )}
    </nav>
  );
}

async function SupportingPanels({ records }: { records: Promise<SupportingRecords> }) {
  const rows = await records;
  if (!rows.length) {
    return <p className={shell.empty}>No accessible announcements or supporting records.</p>;
  }
  return (
    <>
      {rows.map((record) => (
        <Section key={record.title} id={recordAnchor(record.title)} title={record.title}>
          {record.unavailable ? (
            <p role="status">These records could not be loaded.</p>
          ) : !record.rows.length ? (
            <p>No accessible records.</p>
          ) : (
            <>
              <p className={shell.limit}>Showing up to 50 records.</p>
              <ul className={styles.rows}>
                {record.rows.map((row, index) => (
                  <li key={index}>
                    <dl>
                      {record.columns.map((column, cell) => (
                        <div key={column}>
                          <dt>{column.replaceAll('_', ' ')}</dt>
                          <dd>{row[cell]}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      ))}
    </>
  );
}

async function FinanceReportPanel({ report }: { report: Promise<ReportPage> }) {
  return <ReportManagement initial={await report} financeOnly />;
}

async function FinanceTotals({ data }: { data: FinanceReady }) {
  const [invoices, collected] = await Promise.all([data.invoiceTotals, data.collected]);
  const invoiceMetric = (key: 'assigned' | 'outstanding' | 'overdue') => {
    const value = invoices.kind === 'ready' ? invoices.data[key] : null;
    return value === null ? 'Unavailable' : formatPaise(value);
  };
  return (
    <div className={styles.cards}>
      <article>
        <h3>Total fees assigned</h3>
        <strong>{invoiceMetric('assigned')}</strong>
      </article>
      <article>
        <h3>Total collected</h3>
        <strong>{collected.kind === 'ready' ? formatPaise(collected.data) : 'Unavailable'}</strong>
      </article>
      <article>
        <h3>Outstanding balance</h3>
        <strong>{invoiceMetric('outstanding')}</strong>
      </article>
      <article>
        <h3>Overdue fees</h3>
        <strong>{invoiceMetric('overdue')}</strong>
      </article>
    </div>
  );
}

function FinanceFiltersSection({
  workspace,
  data,
}: {
  workspace: AccountantWorkspaceKey;
  data: FinanceReady;
}) {
  const { filters } = data;
  if (!data.feesAllowed && !data.paymentsAllowed) return null;
  return (
    <Section id="filters" title="Finance filters">
      <form action={route} className={styles.filters}>
        <input type="hidden" name="workspace" value={workspace} />
        {filters.studentId && <input type="hidden" name="studentId" value={filters.studentId} />}
        {filters.classId && <input type="hidden" name="classId" value={filters.classId} />}
        <label>
          From
          <input type="date" name="dateFrom" defaultValue={filters.dateFrom} />
        </label>
        <label>
          To
          <input type="date" name="dateTo" defaultValue={filters.dateTo} />
        </label>
        {workspace === 'ledger' && data.feesAllowed && (
          <label>
            Invoice status
            <select name="invoiceStatus" defaultValue={filters.invoiceStatus}>
              <option value="">All</option>
              {invoiceStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        )}
        {workspace === 'payments' && data.paymentsAllowed && (
          <label>
            Payment status
            <select name="paymentStatus" defaultValue={filters.paymentStatus}>
              <option value="">All visible</option>
              {paymentStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        )}
        <button type="submit">Apply filters</button>
        <Link href={`${route}?workspace=${workspace}`}>Clear</Link>
      </form>
      <p className={shell.limit}>Dates filter invoice issue dates and payment dates.</p>
    </Section>
  );
}

export function AccountantDashboardView({
  workspace,
  data,
  records,
  report,
}: {
  workspace: AccountantWorkspaceKey;
  data: FinanceResult;
  records?: Promise<SupportingRecords>;
  report?: Promise<ReportPage>;
}) {
  if (data.kind !== 'ready') {
    return (
      <main className={shell.main}>
        <h1>Accountant dashboard</h1>
        <p role="status">
          {data.kind === 'invalid'
            ? 'The finance filters are invalid.'
            : data.kind === 'denied'
              ? 'Accountant access is required.'
              : 'Finance information is unavailable.'}
        </p>
        <Link href={`${route}?workspace=overview`}>Return to overview</Link>
      </main>
    );
  }

  const { filters } = data;
  const canShowLedger = data.feesAllowed;
  const canShowPayments = data.paymentsAllowed;
  const canShowStructures = data.feesAllowed;
  const canShowReports = data.canReport;

  return (
    <AccountantWorkspaceShell
      schoolName={data.schoolName ?? 'Active school'}
      canShowLedger={canShowLedger}
      canShowPayments={canShowPayments}
      canShowStructures={canShowStructures}
      canShowReports={canShowReports}
    >
      <Suspense fallback={<AccountantModuleSkeleton />}>
        {workspace === 'overview' && (
          <>
            <div id="overview" className={shell.hero}>
              <p>Finance</p>
              <h1>Accountant dashboard</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            <Section id="totals" title="School finance overview">
              <p className={shell.limit}>
                All-time totals for the active school. Overdue totals require a verified school timezone.
              </p>
              <Suspense fallback={<p role="status">Loading finance totals…</p>}>
                <FinanceTotals data={data} />
              </Suspense>
            </Section>
            <Section id="recent" title="Recent settled payments">
              <Panel value={data.recent}>
                {(rows) =>
                  rows.length ? (
                    <ul className={styles.rows}>
                      {rows.map((row) => (
                        <li key={row.id}>
                          <strong>{formatPaise(row.amount)}</strong>
                          <span>
                            {row.date} · {row.method.replaceAll('_', ' ')}
                          </span>
                          {row.receiptNumber && (
                            <Link href={financeLink('payments', filters, { receiptId: row.id }, 'receipt')}>
                              {row.receiptNumber}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No settled payments.</p>
                  )
                }
              </Panel>
            </Section>
            <section className={shell.section} aria-label="Accountant modules">
              <h2>Quick module access</h2>
              <div className={shell.shortcuts}>
                {canShowLedger && (
                  <Link href={`${route}?workspace=ledger`}>
                    <BookOpen size={18} aria-hidden="true" />
                    <span>Balances &amp; Ledger</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
                {canShowPayments && (
                  <Link href={`${route}?workspace=payments`}>
                    <CreditCard size={18} aria-hidden="true" />
                    <span>Payments &amp; Receipts</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
                {canShowStructures && (
                  <Link href={`${route}?workspace=structures`}>
                    <Layers size={18} aria-hidden="true" />
                    <span>Fee Structures</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
                <Link href={`${route}?workspace=expenses`}>
                  <Receipt size={18} aria-hidden="true" />
                  <span>Expenses</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                {canShowReports && (
                  <Link href={`${route}?workspace=reports`}>
                    <BarChart3 size={18} aria-hidden="true" />
                    <span>Financial Reports</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
                <Link href={`${route}?workspace=records`}>
                  <FolderOpen size={18} aria-hidden="true" />
                  <span>Announcements &amp; Records</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </section>
          </>
        )}

        {workspace === 'ledger' && (
          <>
            <div className={shell.hero}>
              <p>Finance</p>
              <h1>Balances &amp; Student Ledger</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            <FinanceFiltersSection workspace="ledger" data={data} />
            <Section id="ledger" title="Student fee ledger">
              {filters.studentId && (
                <p>
                  Student {filters.studentId} ·{' '}
                  <Link href={financeLink('ledger', filters, { studentId: '', ledgerPage: 1, paymentPage: 1 }, 'ledger')}>
                    All students
                  </Link>
                </p>
              )}
              <Panel value={data.ledger}>
                {({ items, next }) => (
                  <>
                    {items.length ? (
                      <ul className={styles.rows}>
                        {items.map((row) => (
                          <li key={row.id}>
                            <strong>
                              {row.number} · {row.title}
                            </strong>
                            <Link href={financeLink('ledger', filters, { studentId: row.studentId, ledgerPage: 1, paymentPage: 1 }, 'ledger')}>
                              Student {row.studentId}
                            </Link>
                            <span>
                              {row.status} · Due {row.due}
                            </span>
                            <span>
                              Assigned {formatPaise(row.amount)} · Paid {formatPaise(row.paid)} · Due{' '}
                              {formatPaise(row.outstanding)}
                            </span>
                            {data.canCollect && row.outstanding > 0 && (
                              <AccountantPaymentForm
                                school={data.schoolId}
                                invoice={row.id}
                                student={row.studentId}
                                requestId={randomUUID()}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No invoices match these filters.</p>
                    )}
                    <Pages workspace="ledger" filters={filters} field="ledgerPage" section="ledger" next={next} />
                  </>
                )}
              </Panel>
            </Section>
          </>
        )}

        {workspace === 'payments' && (
          <>
            <div className={shell.hero}>
              <p>Finance</p>
              <h1>Payments &amp; Receipts</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            <FinanceFiltersSection workspace="payments" data={data} />
            <Section id="payments" title="Fee collection history">
              <Panel value={data.history}>
                {({ items, next }) => (
                  <>
                    {items.length ? (
                      <ul className={styles.rows}>
                        {items.map((row) => (
                          <li key={row.id}>
                            <strong>
                              {formatPaise(row.amount)} · {row.status}
                            </strong>
                            <span>
                              {row.date} · {row.method.replaceAll('_', ' ')}
                            </span>
                            {row.reference && <span>Reference {row.reference}</span>}
                            <Link href={financeLink('payments', filters, { studentId: row.studentId, ledgerPage: 1, paymentPage: 1 }, 'payments')}>
                              Student {row.studentId}
                            </Link>
                            {row.receiptNumber && (
                              <Link href={financeLink('payments', filters, { receiptId: row.id }, 'receipt')}>
                                View receipt {row.receiptNumber}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No payments match these filters.</p>
                    )}
                    <Pages workspace="payments" filters={filters} field="paymentPage" section="payments" next={next} />
                  </>
                )}
              </Panel>
            </Section>
            {filters.receiptId && (
              <div className={styles.receipt}>
                <Section id="receipt" title="Payment receipt">
                  <Panel value={data.receipt}>
                    {(row) =>
                      row ? (
                        <>
                          <p>
                            <strong>{row.receiptNumber}</strong> · {data.schoolName}
                          </p>
                          <p>Student {row.studentId}</p>
                          <p>
                            {row.date} · {row.method.replaceAll('_', ' ')} · Settled
                          </p>
                          <p>
                            <strong>{formatPaise(row.amount)}</strong>
                          </p>
                          <PrintAccountantReceipt />
                        </>
                      ) : (
                        <p>This receipt is unavailable.</p>
                      )
                    }
                  </Panel>
                </Section>
              </div>
            )}
          </>
        )}

        {workspace === 'structures' && (
          <>
            <div className={shell.hero}>
              <p>Finance</p>
              <h1>Fee Structures &amp; Assignments</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            <Section id="structures" title="Fee structures by class">
              {data.canConfigure && data.classes.kind === 'ready' && data.classes.data.length > 0 && (
                <AccountantFeeCommand
                  school={data.schoolId}
                  id={randomUUID()}
                  fields={{ kind: 'create', classes: data.classes.data }}
                />
              )}
              <p className={shell.limit}>
                Class applies to fee structures. Invoices and payments do not store a class assignment.
              </p>
              {data.classes.kind === 'ready' && (
                <form action={route} className={styles.filters}>
                  <input type="hidden" name="workspace" value="structures" />
                  {Object.entries(filters)
                    .filter(([key, value]) => key !== 'classId' && key !== 'structurePage' && value && value !== 1)
                    .map(([key, value]) => (
                      <input key={key} type="hidden" name={key} value={value} />
                    ))}
                  <label>
                    Class
                    <select name="classId" defaultValue={filters.classId}>
                      <option value="">All classes</option>
                      {filters.classId && !data.classes.data.some((row) => row.id === filters.classId) && (
                        <option value={filters.classId}>Current filter</option>
                      )}
                      {data.classes.data.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Filter structures</button>
                </form>
              )}
              <Panel value={data.structures}>
                {({ items, next }) => (
                  <>
                    {items.length ? (
                      <ul className={styles.rows}>
                        {items.map((row) => (
                          <li key={row.id}>
                            <strong>
                              {row.category} · {formatPaise(row.amount)}
                            </strong>
                            <span>
                              {data.classes.kind === 'ready'
                                ? data.classes.data.find((item) => item.id === row.classId)?.name ?? row.classId
                                : row.classId}
                              {' · '}
                              {row.frequency.replaceAll('_', ' ')} · Due {row.due}
                            </span>
                            {data.canConfigure && (
                              <>
                                <AccountantFeeCommand
                                  school={data.schoolId}
                                  id={row.id}
                                  fields={{ kind: 'edit', amount: row.amount.toString(), due: row.due }}
                                />
                                <AccountantFeeCommand
                                  school={data.schoolId}
                                  id={row.id}
                                  fields={{ kind: 'assign', due: row.due }}
                                />
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No fee structures match this filter.</p>
                    )}
                    <Pages
                      workspace="structures"
                      filters={filters}
                      field="structurePage"
                      section="structures"
                      next={next}
                    />
                  </>
                )}
              </Panel>
            </Section>
          </>
        )}

        {workspace === 'expenses' && (
          <>
            <div className={shell.hero}>
              <p>Finance</p>
              <h1>Expenses</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            <StaffExpenseDrafts role="accountant" />
          </>
        )}

        {workspace === 'reports' && (
          <>
            <div className={shell.hero}>
              <p>Finance</p>
              <h1>Financial Reports &amp; Exports</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            {report ? (
              <Section id="financial-reports" title="Financial reports">
                <Suspense fallback={<p role="status">Loading financial reports…</p>}>
                  <FinanceReportPanel report={report} />
                </Suspense>
                {data.canRequestExport ? (
                  <FinancialExportForm key={data.schoolId} school={data.schoolId} />
                ) : (
                  <p>Invoice export requires financial export permission and fresh MFA.</p>
                )}
              </Section>
            ) : (
              <p className={shell.empty}>Financial reports permission is required.</p>
            )}
          </>
        )}

        {workspace === 'records' && (
          <>
            <div className={shell.hero}>
              <p>Finance</p>
              <h1>Announcements &amp; Records</h1>
              <span>{data.schoolName ?? 'Active school'}</span>
            </div>
            {records ? (
              <Suspense fallback={<p role="status">Loading supporting records…</p>}>
                <SupportingPanels records={records} />
              </Suspense>
            ) : (
              <p className={shell.empty}>No accessible announcements or supporting records.</p>
            )}
          </>
        )}
      </Suspense>
    </AccountantWorkspaceShell>
  );
}

export function AccountantDashboardLoading() {
  return (
    <div className={shell.shell} data-role="accountant">
      <aside className={shell.sidebar} aria-hidden="true" />
      <div className={shell.workspace}>
        <header className={shell.header} aria-hidden="true" />
        <main className={shell.main}>
          <AccountantModuleSkeleton />
        </main>
      </div>
    </div>
  );
}

export async function LiveAccountantDashboard({
  access,
  query,
}: {
  access: NonNullable<Awaited<ReturnType<typeof getAccountantRenderAccess>>>;
  query: AccountantQuery;
}) {
  const { context } = access;
  const workspace = resolveAccountantWorkspace(query.workspace, query);
  const now = context.session.verifiedAt;
  const canReport =
    evaluatePermission(context, 'fees.read', now).allowed &&
    evaluatePermission(context, 'reports.read', now).allowed;

  const form = new FormData();
  form.set('category', 'finance');

  const records =
    workspace === 'records' && context.schoolId
      ? readAccountantSupportingRecords(context.schoolId)
      : undefined;
  const report =
    workspace === 'reports' && canReport ? readReportsWorkspace(form, true) : undefined;
  const data = await readAccountantFinance(query, workspace);

  return (
    <AccountantDashboardView
      workspace={workspace}
      data={data}
      records={records}
      report={data.kind === 'ready' && data.canReport ? report : undefined}
    />
  );
}
