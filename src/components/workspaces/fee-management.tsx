'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  CheckCircle2,
  CreditCard,
  DollarSign,
  Filter,
  History,
  Layers,
  Printer,
  Receipt,
  Search,
  Users,
  X,
} from 'lucide-react';
import { filterFinance, recordFeePayment } from '@/app/staff/fee-workspace-actions';
import {
  formatPaise,
  type FinanceOptions,
  type FinancePage,
  type FinanceTab,
  type StudentFeeAccountRow,
} from '@/lib/services/fee-fields';
import styles from './fee-management.module.css';

function makeIdempotencyKey(prefix = 'pay'): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`;
}

interface FeeManagementProps {
  initial: FinancePage;
  options: FinanceOptions;
  canReadStudents: boolean;
  canCollect: boolean;
}

export function FeeManagement({
  initial,
  options,
  canReadStudents,
  canCollect,
}: FeeManagementProps) {
  const [result, filterAction, isFiltering] = useActionState(filterFinance, initial);
  const [collectionState, collectionAction, isCollecting] = useActionState(recordFeePayment, {
    ok: false,
    message: '',
  });
  const [, startTransition] = useTransition();

  // Local tab and filter states
  const ready = result.kind === 'ready';
  const activeTab: FinanceTab = ready ? result.activeTab : 'summary';

  // Collection form state
  const [collectStudentId, setCollectStudentId] = useState(
    (ready && result.prefillStudentId) || ''
  );
  const [collectInvoiceId, setCollectInvoiceId] = useState(
    (ready && result.prefillInvoiceId) || ''
  );
  const [collectAmountRupees, setCollectAmountRupees] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => makeIdempotencyKey());

  function switchTab(tab: FinanceTab, extra: Record<string, string> = {}) {
    startTransition(() => {
      const formData = new FormData();
      formData.set('tab', tab);
      Object.entries(extra).forEach(([k, v]) => formData.set(k, v));
      filterAction(formData);
    });
  }

  function handleCollectFromInvoice(invoice: StudentFeeAccountRow) {
    setCollectStudentId(invoice.studentId);
    setCollectInvoiceId(invoice.id);
    const balanceRupees = (invoice.balancePaise / 100).toFixed(2);
    setCollectAmountRupees(balanceRupees);
    setIdempotencyKey(makeIdempotencyKey(`inv-${invoice.id.slice(0, 6)}`));
    switchTab('collect', { studentId: invoice.studentId, invoiceId: invoice.id });
  }

  if (result.kind === 'denied') {
    return (
      <section className={styles.card} aria-labelledby="finance-denied-heading">
        <h2 id="finance-denied-heading" className={styles.cardTitle}>
          Finance Workspace Unavailable
        </h2>
        <p className={styles.notice} role="status">
          Your current school membership does not hold permissions to read fee structures or payment records.
        </p>
      </section>
    );
  }

  if (result.kind === 'error') {
    return (
      <section className={styles.card} aria-labelledby="finance-error-heading">
        <h2 id="finance-error-heading" className={styles.cardTitle}>
          Financial Records Error
        </h2>
        <p className={styles.error} role="alert">
          {result.message || 'Financial records could not be loaded. Please refresh to try again.'}
        </p>
      </section>
    );
  }

  if (result.kind === 'invalid') {
    return (
      <section className={styles.card} aria-labelledby="finance-invalid-heading">
        <h2 id="finance-invalid-heading" className={styles.cardTitle}>
          Invalid Financial Request
        </h2>
        <p className={styles.error} role="alert">
          {result.message || 'The requested filters or parameters were invalid.'}
        </p>
        <button type="button" onClick={() => switchTab('summary')} className={styles.actionBtn}>
          Back to Financial Overview
        </button>
      </section>
    );
  }

  const {
    summary,
    structures,
    accounts,
    payments,
    recentPayments,
    studentLedger,
    selectedReceipt,
    filters,
    page,
    next,
    canReadFees,
    canReadReceipts,
  } = result;

  return (
    <div className={styles.wrapper} aria-busy={isFiltering || isCollecting}>
      {/* Navigation Tabs */}
      <nav className={styles.tabs} aria-label="Finance Workspace Navigation">
        <button
          type="button"
          onClick={() => switchTab('summary')}
          className={`${styles.tabBtn} ${activeTab === 'summary' ? styles.tabBtnActive : ''}`}
        >
          <DollarSign size={16} aria-hidden="true" /> Overview
        </button>
        {canReadFees && (
          <button
            type="button"
            onClick={() => switchTab('structures')}
            className={`${styles.tabBtn} ${activeTab === 'structures' ? styles.tabBtnActive : ''}`}
          >
            <Layers size={16} aria-hidden="true" /> Fee Structures
          </button>
        )}
        {canReadFees && (
          <button
            type="button"
            onClick={() => switchTab('accounts')}
            className={`${styles.tabBtn} ${activeTab === 'accounts' ? styles.tabBtnActive : ''}`}
          >
            <Users size={16} aria-hidden="true" /> Student Accounts
          </button>
        )}
        {canReadReceipts && (
          <button
            type="button"
            onClick={() => switchTab('payments')}
            className={`${styles.tabBtn} ${activeTab === 'payments' ? styles.tabBtnActive : ''}`}
          >
            <History size={16} aria-hidden="true" /> Payment History & Receipts
          </button>
        )}
        {canCollect && (
          <button
            type="button"
            onClick={() => switchTab('collect')}
            className={`${styles.tabBtn} ${activeTab === 'collect' ? styles.tabBtnActive : ''}`}
          >
            <CreditCard size={16} aria-hidden="true" /> Collect Payment
          </button>
        )}
      </nav>

      {/* TAB 1: SUMMARY OVERVIEW */}
      {activeTab === 'summary' && (
        <div className={styles.wrapper}>
          {/* Metrics Grid */}
          <section className={styles.metricsGrid} aria-label="Financial Summary Cards">
            <div className={styles.metricCard}>
              <span className={styles.metricCardLabel}>Total Billed</span>
              <span className={styles.metricCardValue}>{formatPaise(summary.totalBilledPaise)}</span>
              <span className={styles.metricCardHint}>{summary.totalInvoicesCount} invoices issued</span>
            </div>
            <div className={`${styles.metricCard} ${styles.metricCardCollected}`}>
              <span className={styles.metricCardLabel}>Total Collected</span>
              <span className={styles.metricCardValue}>{formatPaise(summary.totalCollectedPaise)}</span>
              <span className={styles.metricCardHint}>{summary.settledPaymentsCount} settled payments</span>
            </div>
            <div className={`${styles.metricCard} ${styles.metricCardOutstanding}`}>
              <span className={styles.metricCardLabel}>Outstanding Balance</span>
              <span className={styles.metricCardValue}>{formatPaise(summary.totalOutstandingPaise)}</span>
              <span className={styles.metricCardHint}>Across all active invoices</span>
            </div>
            <div className={`${styles.metricCard} ${styles.metricCardOverdue}`}>
              <span className={styles.metricCardLabel}>Overdue Amount</span>
              <span className={styles.metricCardValue}>{formatPaise(summary.totalOverduePaise)}</span>
              <span className={styles.metricCardHint}>Past scheduled due date</span>
            </div>
          </section>

          {/* Quick Actions & Recent Payments */}
          <section className={styles.card} aria-labelledby="recent-payments-heading">
            <div className={styles.cardHeader}>
              <div>
                <h2 id="recent-payments-heading" className={styles.cardTitle}>
                  Recent Settled Payments
                </h2>
                <p className={styles.cardSubtitle}>
                  Latest payments verified and settled in this school tenant
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {canCollect && (
                  <button
                    type="button"
                    onClick={() => switchTab('collect')}
                    className={styles.actionBtn}
                  >
                    <CreditCard size={15} aria-hidden="true" /> Record Collection
                  </button>
                )}
                {canReadFees && (
                  <button
                    type="button"
                    onClick={() => switchTab('accounts')}
                    className={styles.secondaryBtn}
                  >
                    <Users size={15} aria-hidden="true" /> View Student Ledgers
                  </button>
                )}
              </div>
            </div>

            {recentPayments.length > 0 ? (
              <div className={styles.tableWrapper} role="region" aria-label="Recent payments" tabIndex={0}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Receipt Number</th>
                      <th scope="col">Date</th>
                      <th scope="col">Student</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Method</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map(p => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.receiptNumber}</strong>
                        </td>
                        <td>{p.paymentDate}</td>
                        <td>{p.studentName ?? p.studentId}</td>
                        <td>
                          <strong>{formatPaise(p.amountPaise)}</strong>
                        </td>
                        <td>
                          <span style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            {p.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{p.transactionReference}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => switchTab('payments', { receiptId: p.id })}
                            className={styles.secondaryBtn}
                            style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          >
                            <Receipt size={13} aria-hidden="true" /> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.notice}>No settled payments recorded yet for this school session.</p>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: FEE STRUCTURES */}
      {activeTab === 'structures' && (
        <section className={styles.card} aria-labelledby="fee-structures-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="fee-structures-heading" className={styles.cardTitle}>
                Fee Structures Directory
              </h2>
              <p className={styles.cardSubtitle}>
                Standard school billing schedules and rates by class and category
              </p>
            </div>
          </div>

          {/* Filters */}
          <form action={filterAction} className={styles.controls} aria-label="Fee Structure Filters">
            <input type="hidden" name="tab" value="structures" />
            <label>
              Class
              <select name="classId" defaultValue={filters.classId}>
                <option value="">All Classes</option>
                {options.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select name="category" defaultValue={filters.category}>
                <option value="">All Categories</option>
                <option value="tuition">Tuition</option>
                <option value="laboratory">Laboratory</option>
                <option value="library">Library</option>
                <option value="sports">Sports</option>
                <option value="transport">Transport</option>
                <option value="admission">Admission</option>
                <option value="examination">Examination</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button type="submit" disabled={isFiltering}>
              <Filter size={15} aria-hidden="true" /> Apply Filters
            </button>
          </form>

          {/* Structures Table */}
          {structures.length > 0 ? (
            <div className={styles.tableWrapper} role="region" aria-label="Fee structures" tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Class</th>
                    <th scope="col">Category</th>
                    <th scope="col">Frequency</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Due Date</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map(fs => (
                    <tr key={fs.id}>
                      <td>
                        <strong>{fs.className}</strong>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>{fs.feeCategory}</span>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>{fs.frequency.replace('_', ' ')}</span>
                      </td>
                      <td>
                        <strong>{formatPaise(fs.amountPaise)}</strong>
                      </td>
                      <td>{fs.dueDate}</td>
                      <td>
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#0284c7', fontSize: '0.8rem' }}>
                            Inspect
                          </summary>
                          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#475569' }}>
                            <p>Structure ID: {fs.id}</p>
                            <p>Created: {fs.createdAt.split('T')[0]}</p>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.notice}>No fee structures found matching the selected filters.</p>
          )}

          {/* Pagination */}
          <form action={filterAction} className={styles.pager} aria-label="Fee Structure Pagination">
            <input type="hidden" name="tab" value="structures" />
            <input type="hidden" name="classId" value={filters.classId} />
            <input type="hidden" name="category" value={filters.category} />
            <button
              name="page"
              value={page - 1}
              disabled={isFiltering || page <= 1}
              type="submit"
            >
              Previous
            </button>
            <span aria-live="polite">Page {page}</span>
            <button
              name="page"
              value={page + 1}
              disabled={isFiltering || !next}
              type="submit"
            >
              Next
            </button>
          </form>

          <p className={styles.helpText}>
            Note: Fee structures are read-only in this workspace. Direct creation and modifications require
            an approved atomic migration procedure.
          </p>
        </section>
      )}

      {/* TAB 3: STUDENT FEE ACCOUNTS & INVOICES */}
      {activeTab === 'accounts' && (
        <section className={styles.card} aria-labelledby="student-accounts-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="student-accounts-heading" className={styles.cardTitle}>
                Student Fee Accounts & Invoices
              </h2>
              <p className={styles.cardSubtitle}>
                Manage student billing ledgers, outstanding balances, and invoice statuses
              </p>
            </div>
          </div>

          {/* Student Ledger Drill-down (if selected) */}
          {studentLedger && (
            <div className={styles.ledgerContainer} role="region" aria-label="Student Fee Ledger">
              <div className={styles.ledgerHeader}>
                <div>
                  <span className={styles.ledgerStudentName}>
                    {studentLedger.studentName ?? `Student ID: ${studentLedger.studentId}`}
                  </span>
                  {studentLedger.registrationNumber && (
                    <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                      (Reg: {studentLedger.registrationNumber})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => switchTab('accounts')}
                  className={styles.secondaryBtn}
                  style={{ minHeight: '32px', padding: '0.2rem 0.6rem' }}
                >
                  <X size={15} aria-hidden="true" /> Close Ledger
                </button>
              </div>

              <div className={styles.ledgerMeta}>
                <div>
                  Total Billed: <strong>{formatPaise(studentLedger.totalBilledPaise)}</strong>
                </div>
                <div>
                  Total Paid: <strong>{formatPaise(studentLedger.totalPaidPaise)}</strong>
                </div>
                <div>
                  Outstanding Balance:{' '}
                  <strong style={{ color: studentLedger.balancePaise > 0 ? '#d97706' : '#059669' }}>
                    {formatPaise(studentLedger.balancePaise)}
                  </strong>
                </div>
              </div>

              {/* Invoices belonging to this student */}
              <div style={{ marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 750, marginBottom: '0.4rem' }}>
                  Student Invoices ({studentLedger.invoices.length})
                </h3>
                {studentLedger.invoices.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Title</th>
                          <th>Amount</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Status</th>
                          <th>Due Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentLedger.invoices.map(inv => (
                          <tr key={inv.id}>
                            <td>{inv.invoiceNumber}</td>
                            <td>{inv.title}</td>
                            <td>{formatPaise(inv.amountPaise)}</td>
                            <td>{formatPaise(inv.paidPaise)}</td>
                            <td>
                              <strong>{formatPaise(inv.balancePaise)}</strong>
                            </td>
                            <td>
                              <span
                                className={`${styles.badge} ${
                                  inv.status === 'paid'
                                    ? styles.badgePaid
                                    : inv.status === 'partial'
                                    ? styles.badgePartial
                                    : inv.status === 'overdue'
                                    ? styles.badgeOverdue
                                    : styles.badgeUnpaid
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td>{inv.dueDate}</td>
                            <td>
                              {canCollect && inv.balancePaise > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleCollectFromInvoice(inv)}
                                  className={styles.actionBtn}
                                  style={{ minHeight: '30px', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                                >
                                  Collect
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.helpText}>No invoices for this student.</p>
                )}
              </div>
            </div>
          )}

          {/* Filters Form */}
          <form action={filterAction} className={styles.controls} aria-label="Student Account Filters">
            <input type="hidden" name="tab" value="accounts" />
            <label>
              {canReadStudents ? 'Search Student Name / Reg #' : 'Student ID or Invoice #'}
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder={canReadStudents ? 'e.g. Aarav or BC-2026' : 'e.g. inv-2026 or UUID'}
                maxLength={80}
              />
            </label>
            <label>
              Academic Year
              <select name="yearId" defaultValue={filters.yearId}>
                <option value="">All Academic Years</option>
                {options.years.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={filters.status}>
                <option value="">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
            <button type="submit" disabled={isFiltering}>
              <Search size={15} aria-hidden="true" /> Search Accounts
            </button>
          </form>

          {/* Invoices List */}
          {accounts.length > 0 ? (
            <div className={styles.tableWrapper} role="region" aria-label="Student accounts" tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Invoice #</th>
                    <th scope="col">Title</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Outstanding</th>
                    <th scope="col">Status</th>
                    <th scope="col">Due Date</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.studentName ?? inv.studentId}</strong>
                        {inv.registrationNumber && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            {inv.registrationNumber}
                          </span>
                        )}
                      </td>
                      <td>{inv.invoiceNumber}</td>
                      <td>{inv.title}</td>
                      <td>{formatPaise(inv.amountPaise)}</td>
                      <td>{formatPaise(inv.paidPaise)}</td>
                      <td>
                        <strong>{formatPaise(inv.balancePaise)}</strong>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            inv.status === 'paid'
                              ? styles.badgePaid
                              : inv.status === 'partial'
                              ? styles.badgePartial
                              : inv.status === 'overdue'
                              ? styles.badgeOverdue
                              : styles.badgeUnpaid
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td>{inv.dueDate}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => switchTab('accounts', { studentId: inv.studentId })}
                            className={styles.secondaryBtn}
                            style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          >
                            Ledger
                          </button>
                          {canCollect && inv.balancePaise > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCollectFromInvoice(inv)}
                              className={styles.actionBtn}
                              style={{ minHeight: '30px', padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.notice}>No student fee accounts or invoices match these filters.</p>
          )}

          {/* Pagination */}
          <form action={filterAction} className={styles.pager} aria-label="Student Account Pagination">
            <input type="hidden" name="tab" value="accounts" />
            <input type="hidden" name="search" value={filters.search} />
            <input type="hidden" name="yearId" value={filters.yearId} />
            <input type="hidden" name="status" value={filters.status} />
            <button
              name="page"
              value={page - 1}
              disabled={isFiltering || page <= 1}
              type="submit"
            >
              Previous
            </button>
            <span aria-live="polite">Page {page}</span>
            <button
              name="page"
              value={page + 1}
              disabled={isFiltering || !next}
              type="submit"
            >
              Next
            </button>
          </form>
        </section>
      )}

      {/* TAB 4: PAYMENT HISTORY & RECEIPTS */}
      {activeTab === 'payments' && (
        <section className={styles.card} aria-labelledby="payment-history-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="payment-history-heading" className={styles.cardTitle}>
                Payment History & Receipts
              </h2>
              <p className={styles.cardSubtitle}>
                Audit trail of settled payments, transaction references, and official receipts
              </p>
            </div>
          </div>

          {/* Selected Official Receipt View */}
          {selectedReceipt && (
            <div className={styles.receiptCard} role="region" aria-label="Payment Receipt Detail">
              <div className={styles.receiptTop}>
                <div>
                  <h3 className={styles.receiptTitle}>Payment Receipt</h3>
                  <p className={styles.receiptNumber}>{selectedReceipt.receiptNumber}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={styles.secondaryBtn}
                    style={{ minHeight: '32px', padding: '0.2rem 0.6rem' }}
                  >
                    <Printer size={15} aria-hidden="true" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('payments')}
                    className={styles.secondaryBtn}
                    style={{ minHeight: '32px', padding: '0.2rem 0.6rem' }}
                  >
                    <X size={15} aria-hidden="true" /> Close
                  </button>
                </div>
              </div>

              <div className={styles.receiptGrid}>
                <div className={styles.receiptField}>
                  <dt>Student</dt>
                  <dd>{selectedReceipt.studentName ?? selectedReceipt.studentId}</dd>
                  {selectedReceipt.registrationNumber && (
                    <dd style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Reg: {selectedReceipt.registrationNumber}
                    </dd>
                  )}
                </div>
                <div className={styles.receiptField}>
                  <dt>Payment Date</dt>
                  <dd>{selectedReceipt.paymentDate}</dd>
                </div>
                <div className={styles.receiptField}>
                  <dt>Payment Method</dt>
                  <dd style={{ textTransform: 'capitalize' }}>
                    {selectedReceipt.paymentMethod.replace('_', ' ')}
                  </dd>
                </div>
                <div className={styles.receiptField}>
                  <dt>Transaction Reference</dt>
                  <dd>{selectedReceipt.transactionReference}</dd>
                </div>
                <div className={styles.receiptField}>
                  <dt>Invoice Reference</dt>
                  <dd>{selectedReceipt.invoiceNumber ?? selectedReceipt.invoiceId ?? 'Direct Account'}</dd>
                </div>
                <div className={styles.receiptField}>
                  <dt>Amount Paid</dt>
                  <dd className={styles.receiptAmount}>{formatPaise(selectedReceipt.amountPaise)}</dd>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div style={{ fontSize: '0.82rem', color: '#475569', background: '#f8fbff', padding: '0.5rem', borderRadius: '0.4rem' }}>
                  <strong>Notes:</strong> {selectedReceipt.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <span className={styles.receiptStamp}>Settled & Verified</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Collected By: {selectedReceipt.collectedByProfileId}
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          <form action={filterAction} className={styles.controls} aria-label="Payment History Filters">
            <input type="hidden" name="tab" value="payments" />
            <label>
              Search Receipt / Ref
              <input
                type="search"
                name="search"
                defaultValue={filters.search}
                placeholder="e.g. REC-2026-1042 or UPI ref"
                maxLength={80}
              />
            </label>
            <label>
              Payment Method
              <select name="paymentMethod" defaultValue={filters.paymentMethod}>
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>
            <label>
              Date From
              <input type="date" name="dateFrom" defaultValue={filters.dateFrom} />
            </label>
            <label>
              Date To
              <input type="date" name="dateTo" defaultValue={filters.dateTo} />
            </label>
            <button type="submit" disabled={isFiltering}>
              <Search size={15} aria-hidden="true" /> Filter Payments
            </button>
          </form>

          {/* Payments Table */}
          {payments.length > 0 ? (
            <div className={styles.tableWrapper} role="region" aria-label="Payment history" tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Receipt Number</th>
                    <th scope="col">Date</th>
                    <th scope="col">Student</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Method</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Status</th>
                    <th scope="col">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.receiptNumber}</strong>
                      </td>
                      <td>{p.paymentDate}</td>
                      <td>{p.studentName ?? p.studentId}</td>
                      <td>
                        <strong>{formatPaise(p.amountPaise)}</strong>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{p.transactionReference}</td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeSettled}`}>
                          <CheckCircle2 size={12} aria-hidden="true" /> {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => switchTab('payments', { receiptId: p.id })}
                          className={styles.secondaryBtn}
                          style={{ minHeight: '30px', padding: '0.2rem 0.55rem', fontSize: '0.78rem' }}
                        >
                          <Receipt size={13} aria-hidden="true" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.notice}>No payment records found matching these criteria.</p>
          )}

          {/* Pagination */}
          <form action={filterAction} className={styles.pager} aria-label="Payment History Pagination">
            <input type="hidden" name="tab" value="payments" />
            <input type="hidden" name="search" value={filters.search} />
            <input type="hidden" name="paymentMethod" value={filters.paymentMethod} />
            <input type="hidden" name="dateFrom" value={filters.dateFrom} />
            <input type="hidden" name="dateTo" value={filters.dateTo} />
            <button
              name="page"
              value={page - 1}
              disabled={isFiltering || page <= 1}
              type="submit"
            >
              Previous
            </button>
            <span aria-live="polite">Page {page}</span>
            <button
              name="page"
              value={page + 1}
              disabled={isFiltering || !next}
              type="submit"
            >
              Next
            </button>
          </form>
        </section>
      )}

      {/* TAB 5: COLLECT PAYMENT FORM */}
      {activeTab === 'collect' && (
        <section className={styles.card} aria-labelledby="collect-payment-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="collect-payment-heading" className={styles.cardTitle}>
                Record Fee Collection
              </h2>
              <p className={styles.cardSubtitle}>
                Execute atomic fee settlement with duplicate-request protection and sequential receipts
              </p>
            </div>
          </div>

          {collectionState.message && (
            <div
              className={collectionState.ok ? styles.success : styles.error}
              role="status"
            >
              {collectionState.message}
            </div>
          )}

          <form action={collectionAction} className={styles.collectionForm} aria-label="Fee Collection Form">
            <div className={styles.formGrid}>
              <label className={styles.formField}>
                Student Identifier (UUID) *
                <input
                  name="studentId"
                  value={collectStudentId}
                  onChange={e => setCollectStudentId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  required
                  maxLength={36}
                />
                <span className={styles.helpText}>From student account or enrollment record</span>
              </label>

              <label className={styles.formField}>
                Target Invoice Identifier (UUID) *
                <input
                  name="invoiceId"
                  value={collectInvoiceId}
                  onChange={e => setCollectInvoiceId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  required
                  maxLength={36}
                />
                <span className={styles.helpText}>Target invoice row locked atomically</span>
              </label>

              <label className={styles.formField}>
                Payment Amount (in INR ₹) *
                <input
                  name="amountRupees"
                  type="text"
                  value={collectAmountRupees}
                  onChange={e => setCollectAmountRupees(e.target.value)}
                  placeholder="e.g. 1500.00"
                  required
                  maxLength={15}
                />
                <span className={styles.helpText}>
                  Stored strictly as integer paise. Cannot exceed remaining invoice balance.
                </span>
              </label>

              <label className={styles.formField}>
                Payment Method *
                <select name="paymentMethod" required>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </label>

              <label className={styles.formField}>
                Transaction Reference / Instrument # *
                <input
                  name="transactionReference"
                  placeholder="e.g. UPI-TXN-10293 or Cash Voucher #12"
                  required
                  maxLength={100}
                />
                <span className={styles.helpText}>Bank reference or receipt instrument identifier</span>
              </label>

              <label className={styles.formField}>
                Idempotency Request Key *
                <input
                  name="idempotencyKey"
                  value={idempotencyKey}
                  onChange={e => setIdempotencyKey(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <span className={styles.helpText}>
                  Protects against accidental double-charges. Keep the same key if retrying a network timeout.
                </span>
              </label>
            </div>

            <label className={styles.formField}>
              Notes & Remarks (Optional)
              <textarea
                name="notes"
                placeholder="Optional notes regarding this fee transaction..."
                maxLength={2000}
              />
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isCollecting}
                className={styles.actionBtn}
              >
                {isCollecting ? 'Recording Payment…' : 'Settle & Issue Receipt'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectStudentId('');
                  setCollectInvoiceId('');
                  setCollectAmountRupees('');
                  setIdempotencyKey(`pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
                }}
                className={styles.secondaryBtn}
              >
                Clear Form
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
