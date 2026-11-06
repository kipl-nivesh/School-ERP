'use client';

import React, { useState } from 'react';
import {
  IndianRupee,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Plus,
  Printer,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  MetricCard,
  StatusBadge,
  SearchFilterBar,
  PaginationControls,
  ModalDialog,
} from './workspace-ui';
import { AccountantService } from '@/lib/services/development-adapter';
import type { PolicyContext } from '@/lib/auth/types';
import type {
  PaymentReceiptRecord,
  ExpenseRecord,
} from '@/lib/domain/dashboard-contracts';

const devAccountantContext: PolicyContext = {
  source: 'verified-server-session' as const,
  profileId: 'stf-acc-1',
  accountStatus: 'active' as const,
  credentialResetRequired: false,
  authorizationVersion: 1,
  currentAuthorizationVersion: 1,
  session: {
    id: 'dev-acc-session',
    profileId: 'stf-acc-1',
    verifiedAt: Date.now(),
    authenticatedAt: Date.now() - 60000,
    expiresAt: Date.now() + 3600000,
    revoked: false,
    assurance: 'aal1' as const,
    reauthenticatedAt: Date.now() - 1000,
  },
  activeRole: {
    sessionId: 'dev-acc-session',
    profileId: 'stf-acc-1',
    role: 'accountant' as const,
    assignmentId: 'mem-accountant',
    version: 1,
    currentVersion: 1,
    expiresAt: Date.now() + 1800000,
    revoked: false,
  },
  assignments: [
    {
      id: 'mem-accountant',
      profileId: 'stf-acc-1',
      role: 'accountant' as const,
      status: 'active' as const,
      validFrom: Date.now() - 3600000,
      validUntil: null,
      permissions: [
        'dashboard.accountant.view',
        'fees.read',
        'fees.write',
        'payments.read',
        'payments.record',
        'expenses.read',
        'expenses.write',
        'receipts.read',
        'reports.read',
        'reports.export',
        'announcements.read',
        'documents.read',
        'audit.read',
      ],
    },
  ],
} as unknown as PolicyContext;

type AccountantTab =
  | 'overview'
  | 'structures'
  | 'ledger'
  | 'collect'
  | 'receipts'
  | 'outstanding'
  | 'expenses'
  | 'reports';

export function AccountantWorkspace({ context }: { context?: PolicyContext } = {}) {
  const activeContext = context || devAccountantContext;
  const [activeTab, setActiveTab] = useState<AccountantTab>('overview');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const summaryResult = AccountantService.getFinancialSummary(activeContext);
  const summary = summaryResult.success ? summaryResult.data : null;

  const structuresResult = AccountantService.listFeeStructures(activeContext);
  const structures = structuresResult.success ? structuresResult.data : [];

  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptPage, setReceiptPage] = useState(1);
  const receiptsResult = AccountantService.listReceipts(activeContext, {
    page: receiptPage,
    pageSize: 5,
    search: receiptSearch,
  });
  const receipts = receiptsResult.success ? receiptsResult.data : null;

  // Selected student for ledger
  const [selectedStudentId, setSelectedStudentId] = useState('stu-101');
  const ledgerResult = AccountantService.getStudentLedger(activeContext, selectedStudentId);
  const ledger = ledgerResult.success ? ledgerResult.data : null;

  // Collect Payment Form Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [paymentAmountRupees, setPaymentAmountRupees] = useState(15000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque'>('upi');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('Q3 Term balance fee');

  // New Expense Form Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseRecord['category']>('supplies');
  const [expPayee, setExpPayee] = useState('');
  const [expAmountRupees, setExpAmountRupees] = useState(5000);
  const [expMethod, setExpMethod] = useState<ExpenseRecord['paymentMethod']>('bank_transfer');
  const [expDesc, setExpDesc] = useState('');

  // Selected receipt for printing/previewing
  const [viewReceipt, setViewReceipt] = useState<PaymentReceiptRecord | null>(null);

  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaise = Math.round(paymentAmountRupees * 100);
    const idempotencyKey = `idemp-${selectedStudentId}-${Date.now()}`;

    const res = AccountantService.collectPayment(activeContext, {
      studentId: selectedStudentId,
      invoiceId: 'inv-101',
      amountPaise,
      paymentMethod,
      transactionReference: paymentRef || `MANUAL-${Date.now()}`,
      notes: paymentNotes,
      idempotencyKey,
    });

    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Payment successfully recorded' });
      setIsCollectModalOpen(false);
      setPaymentRef('');
      if (res.data) setViewReceipt(res.data);
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaise = Math.round(expAmountRupees * 100);
    const res = AccountantService.recordExpense(
      activeContext,
      expCategory,
      expPayee,
      amountPaise,
      expMethod,
      expDesc
    );

    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Expense recorded successfully' });
      setIsExpenseModalOpen(false);
      setExpPayee('');
      setExpDesc('');
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="font-semibold">Bursar & Accounts Workspace</span>
          <span className="text-emerald-600 font-normal">| Connected to Development Financial Ledger (Immutable Records)</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">Logged in: Ramesh Iyer (Chief Accountant)</span>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold hover:opacity-75">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-medium text-slate-600">
        {[
          { id: 'overview', label: 'Financial Summary', icon: IndianRupee },
          { id: 'ledger', label: 'Student Fee Ledger', icon: FileSpreadsheet },
          { id: 'receipts', label: 'Receipts & Transactions', icon: Receipt },
          { id: 'outstanding', label: 'Aging & Overdue', icon: AlertTriangle },
          { id: 'structures', label: 'Fee Structures', icon: CreditCard },
          { id: 'expenses', label: 'Expenses & Vouchers', icon: TrendingDown },
          { id: 'reports', label: 'Financial Reports', icon: TrendingUp },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AccountantTab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                isActive ? 'bg-slate-900 text-white font-semibold' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title="Total Billed"
              value={`₹${((summary?.totalBilledPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={IndianRupee}
              tone="indigo"
            />
            <MetricCard
              title="Collected"
              value={`₹${((summary?.totalCollectedPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={TrendingUp}
              tone="emerald"
            />
            <MetricCard
              title="Outstanding"
              value={`₹${((summary?.totalOutstandingPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={AlertTriangle}
              tone="amber"
            />
            <MetricCard
              title="Overdue"
              value={`₹${((summary?.totalOverduePaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={AlertCircle}
              tone="rose"
            />
            <MetricCard
              title="Total Expenses"
              value={`₹${((summary?.totalExpensesPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={TrendingDown}
              tone="rose"
            />
            <MetricCard
              title="Net Cash Flow"
              value={`₹${((summary?.netCashFlowPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={Receipt}
              tone="emerald"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Recent Payment Receipts</span>
                <button onClick={() => setActiveTab('receipts')} className="text-xs text-indigo-600 hover:underline">
                  All Receipts
                </button>
              </h3>
              <div className="space-y-2 text-xs">
                {receipts?.items.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900">{r.studentName}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{r.receiptNumber} | {r.paymentMethod.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">₹{(r.amountPaise / 100).toLocaleString('en-IN')}</p>
                      <span className="text-[10px] text-slate-400">{r.paymentDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Financial Actions</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setIsCollectModalOpen(true)}
                  className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-900 font-semibold text-left hover:bg-indigo-100/70 transition-colors"
                >
                  <Plus className="w-4 h-4 mb-1 text-indigo-600" />
                  Collect Student Fee
                </button>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-900 font-semibold text-left hover:bg-rose-100/70 transition-colors"
                >
                  <TrendingDown className="w-4 h-4 mb-1 text-rose-600" />
                  Record Expense Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT FEE LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Account Ledger</h2>
              <p className="text-xs text-slate-500">Itemized billing and payment receipts for student accounts.</p>
            </div>
            <button
              onClick={() => setIsCollectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              <span>Collect Fee</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-700">Select Student:</span>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="p-1 border border-slate-200 rounded text-slate-900 font-medium"
            >
              <option value="stu-101">Aarav Sharma (Class 10-A, Roll 01)</option>
              <option value="stu-201">Ananya Sharma (Class 6-B, Roll 14)</option>
            </select>
          </div>

          {ledger && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Student:</span>
                  <p className="font-bold text-slate-900">{ledger.studentName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Billed:</span>
                  <p className="font-bold text-slate-900">₹{(ledger.totalBilledPaise / 100).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Collected:</span>
                  <p className="font-bold text-emerald-700">₹{(ledger.totalCollectedPaise / 100).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <p className="font-bold text-rose-700">₹{(ledger.balancePaise / 100).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Invoices</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Invoice No</th>
                        <th className="py-2 px-3">Title</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Paid</th>
                        <th className="py-2 px-3">Balance</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.invoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="py-2 px-3 font-mono">{inv.invoiceNumber}</td>
                          <td className="py-2 px-3 font-semibold">{inv.title}</td>
                          <td className="py-2 px-3 text-slate-500">{inv.dueDate}</td>
                          <td className="py-2 px-3 font-mono">₹{(inv.amountPaise / 100).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 font-mono text-emerald-700">₹{(inv.paidPaise / 100).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 font-mono text-rose-700 font-bold">₹{(inv.balancePaise / 100).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3"><StatusBadge status={inv.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Settled Payment Receipts (Immutable)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Ref No</th>
                        <th className="py-2 px-3">Cashier</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.payments.map(p => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono font-medium">{p.receiptNumber}</td>
                          <td className="py-2 px-3 text-slate-500">{p.paymentDate}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">₹{(p.amountPaise / 100).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 uppercase text-[10px]">{p.paymentMethod}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{p.transactionReference}</td>
                          <td className="py-2 px-3">{p.collectedByName}</td>
                          <td className="py-2 px-3"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECEIPTS & TRANSACTIONS */}
      {activeTab === 'receipts' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Receipts & Payment Audit Log</h2>
              <p className="text-xs text-slate-500">Official settled receipts with verified transaction hashes.</p>
            </div>
            <button
              onClick={() => setIsCollectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              <span>Collect Fee</span>
            </button>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search receipt number, student name, reference..."
            onSearch={setReceiptSearch}
          />

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Transaction Ref</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts?.items.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{r.receiptNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.studentName}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">₹{(r.amountPaise / 100).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-indigo-700">{r.paymentMethod}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{r.transactionReference}</td>
                    <td className="py-2.5 px-3 text-slate-500">{r.paymentDate}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setViewReceipt(r)}
                        className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {receipts && receipts.totalPages > 1 && (
            <PaginationControls
              page={receipts.page}
              totalPages={receipts.totalPages}
              onPageChange={setReceiptPage}
            />
          )}
        </div>
      )}

      {/* TAB 4: AGING & OVERDUE */}
      {activeTab === 'outstanding' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Aging Schedule & Overdue Dues</h2>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
              <span className="text-slate-500">Current (0–30 Days)</span>
              <p className="text-lg font-bold text-slate-900">₹{((summary?.agingSummary.currentPaise || 0) / 100).toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-center">
              <span className="text-amber-700 font-semibold">31–60 Days Overdue</span>
              <p className="text-lg font-bold text-amber-900">₹{((summary?.agingSummary.past30DaysPaise || 0) / 100).toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-center">
              <span className="text-rose-700 font-semibold">61–90 Days Overdue</span>
              <p className="text-lg font-bold text-rose-900">₹0.00</p>
            </div>
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-center">
              <span className="text-rose-700 font-semibold">90+ Days Critical</span>
              <p className="text-lg font-bold text-rose-900">₹0.00</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FEE STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Class Fee Structures</h2>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Billing Cycle</th>
                  <th className="py-2.5 px-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {structures.map(fs => (
                  <tr key={fs.id}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{fs.className}</td>
                    <td className="py-2.5 px-3 capitalize font-medium">{fs.feeCategory}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">₹{(fs.amountPaise / 100).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 capitalize">{fs.frequency}</td>
                    <td className="py-2.5 px-3 text-slate-500">{fs.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: EXPENSES & VOUCHERS */}
      {activeTab === 'expenses' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Operating Expenses & Vouchers</h2>
              <p className="text-xs text-slate-500">Record school maintenance, utilities, supplies, and vendor payouts.</p>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Voucher No</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Payee</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { v: 'EXP-2026-018', cat: 'utilities', payee: 'State Electricity Board', amt: '₹24,500.00', m: 'bank_transfer', d: 'October power consumption', dt: '2026-10-25' },
                ].map((e, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-mono font-medium">{e.v}</td>
                    <td className="py-2.5 px-3 capitalize font-semibold text-slate-800">{e.cat}</td>
                    <td className="py-2.5 px-3">{e.payee}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{e.amt}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px]">{e.m}</td>
                    <td className="py-2.5 px-3 text-slate-600">{e.d}</td>
                    <td className="py-2.5 px-3 text-slate-500">{e.dt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Financial Reports & Exports</h2>
          <p className="text-xs text-slate-500">Generate verified financial statements and audit balance sheets.</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Quarterly Fee Collection Statement (Q3)</p>
                <p className="text-slate-500 text-[11px]">PDF / CSV export</p>
              </div>
              <button
                onClick={() => setNotice({ type: 'success', text: 'Exported Q3 Statement to encrypted audit log' })}
                className="px-2.5 py-1 rounded bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Export
              </button>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Operating Expense Audit Sheet</p>
                <p className="text-slate-500 text-[11px]">Itemized vouchers</p>
              </div>
              <button
                onClick={() => setNotice({ type: 'success', text: 'Exported Expense Audit Sheet' })}
                className="px-2.5 py-1 rounded bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT */}
      <ModalDialog
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="Fee Payment Collection & Receipt Issuance"
      >
        <form onSubmit={handleCollectPayment} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Student</label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            >
              <option value="stu-101">Aarav Sharma (Class 10-A, Roll 01)</option>
              <option value="stu-201">Ananya Sharma (Class 6-B, Roll 14)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount to Collect (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={paymentAmountRupees}
                onChange={e => setPaymentAmountRupees(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque')}
                className="w-full p-2 border border-slate-200 rounded-lg uppercase font-semibold"
              >
                <option value="upi">UPI / QR</option>
                <option value="cash">Cash</option>
                <option value="card">Debit / Credit Card</option>
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Cheque No *</label>
            <input
              type="text"
              required
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              placeholder="e.g. UPI/20261105/984124"
              className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Receipt Notes</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCollectModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
            >
              Confirm & Issue Receipt
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: RECORD EXPENSE */}
      <ModalDialog
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Operating Expense Voucher"
      >
        <form onSubmit={handleRecordExpense} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={expCategory}
              onChange={e => setExpCategory(e.target.value as ExpenseRecord['category'])}
              className="w-full p-2 border border-slate-200 rounded-lg capitalize font-semibold"
            >
              <option value="utilities">Utilities (Power, Water, Internet)</option>
              <option value="supplies">Lab & Classroom Supplies</option>
              <option value="maintenance">Campus Repairs & Maintenance</option>
              <option value="salaries">Faculty & Staff Salaries</option>
              <option value="events">Events & Sports</option>
              <option value="other">Miscellaneous</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Disbursement Method</label>
            <select
              value={expMethod}
              onChange={e => setExpMethod(e.target.value as ExpenseRecord['paymentMethod'])}
              className="w-full p-2 border border-slate-200 rounded-lg capitalize font-semibold"
            >
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Petty Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Corporate Card</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payee / Vendor Name *</label>
              <input
                type="text"
                required
                value={expPayee}
                onChange={e => setExpPayee(e.target.value)}
                placeholder="e.g. Oxford Stationery"
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={expAmountRupees}
                onChange={e => setExpAmountRupees(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description & Purpose *</label>
            <input
              type="text"
              required
              value={expDesc}
              onChange={e => setExpDesc(e.target.value)}
              placeholder="e.g. Science lab glassware replacement"
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700"
            >
              Record Voucher
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: VIEW / PRINT RECEIPT */}
      {viewReceipt && (
        <ModalDialog
          isOpen={!!viewReceipt}
          onClose={() => setViewReceipt(null)}
          title={`Official Fee Receipt — #${viewReceipt.receiptNumber}`}
        >
          <div className="space-y-4 text-xs font-mono border border-slate-200 p-4 rounded-xl bg-slate-50/50">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-bold text-sm text-slate-900 font-sans">BRIGHTCAMP SCHOOL</h3>
              <p className="text-[10px] text-slate-500 font-sans">Knowledge Park, Gurugram | Affiliation: CBSE/AFF/2026</p>
              <p className="text-xs font-bold text-emerald-800 mt-1">OFFICIAL PAYMENT RECEIPT</p>
            </div>
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between"><span>Receipt No:</span><span className="font-bold">{viewReceipt.receiptNumber}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{viewReceipt.paymentDate}</span></div>
              <div className="flex justify-between"><span>Student Name:</span><span className="font-bold">{viewReceipt.studentName}</span></div>
              <div className="flex justify-between"><span>Payment Mode:</span><span className="uppercase">{viewReceipt.paymentMethod}</span></div>
              <div className="flex justify-between"><span>Transaction Ref:</span><span>{viewReceipt.transactionReference}</span></div>
              <div className="flex justify-between"><span>Cashier:</span><span>{viewReceipt.collectedByName}</span></div>
            </div>
            <div className="border-t border-b border-dashed border-slate-300 py-2 flex justify-between text-sm font-bold text-slate-900">
              <span>AMOUNT PAID:</span>
              <span className="text-emerald-700">₹{(viewReceipt.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-center text-[10px] text-slate-500">
              <p>Status: SETTLED (Immutable Financial Record)</p>
              <p className="mt-1">This is a system-generated receipt. No signature required.</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewReceipt(null)}
                className="px-3 py-1 bg-slate-900 text-white rounded font-sans text-xs font-semibold"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
