'use client';

import { useState } from 'react';
import { CalendarRange, ArrowLeft, Wallet, ClipboardList, FileText, Calculator, BarChart3, type LucideIcon } from 'lucide-react';
import type { PeriodId } from '../types';
import { accountantProfile, financialLedger, ledgerMonths, reportingPeriods } from '../data/mock-dashboard';
import { financialSummary, monthlySummary } from '../lib/financial-calculations';
import { AccountantWelcomeBanner } from './accountant-welcome-banner';
import { FinancialStatsGrid } from './financial-stats-grid';
import { FeeCollectionAnalytics } from './fee-collection-analytics';
import { ClassWiseFees } from './class-wise-fees';
import { PaymentHistory } from './payment-history';
import { OutstandingFees } from './outstanding-fees';
import { ExpenseOverview } from './expense-overview';
import { MonthlyCashFlow } from './monthly-cash-flow';
import { FinancialAlerts } from './financial-alerts';
import { FinancialReports } from './financial-reports';
import { AccountantQuickAccess } from './accountant-quick-access';
import { navigateToModule } from '@/lib/navigation/use-active-module';

export function FinancialWorkspace({ activeModule = 'overview' }: { activeModule?: string }) {
  const [periodId, setPeriodId] = useState<PeriodId>('half');
  const period = reportingPeriods.find(p => p.id === periodId) ?? reportingPeriods[2];
  const summary = financialSummary(financialLedger, period, accountantProfile.referenceDate);
  const months = monthlySummary(financialLedger, ledgerMonths, period, accountantProfile.referenceDate);

  const periodSelector = (
    <div className="ac-period-toolbar" style={{ marginBottom: '20px' }}>
      <div>
        <span className="ac-icon ac-tone-emerald"><CalendarRange size={20} /></span>
        <div>
          <h2>One window. Connected totals.</h2>
          <p>Billing, cash, grade groups, and balances follow this selection.</p>
        </div>
      </div>
      <div className="ac-period-control">
        <label htmlFor="accountant-reporting-period">Reporting period</label>
        <select
          id="accountant-reporting-period"
          value={periodId}
          onChange={e => setPeriodId(e.target.value as PeriodId)}
        >
          {reportingPeriods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <>
      {/* OVERVIEW MODULE */}
      {activeModule === 'overview' && (
        <div id="module-overview">
          <AccountantWelcomeBanner period={period} />
          {periodSelector}
          <p className="ac-scope" role="status" aria-live="polite">
            {period.caption} · {summary.invoices.length} fictional invoices · {summary.transactions.length} sample payment attempts · balances aged at 31 Oct 2026.
          </p>
          <div className="ac-ledger-notice">
            <strong>Independent demo ledger</strong>
            <p>Four synthetic student invoices per month, May–October 2026. This small illustration is separate from Admin and Parent demo datasets. No opening balances, refunds, discounts, or adjustments. Pending/failed attempts are not cash.</p>
          </div>
          <FinancialStatsGrid summary={summary} period={period} />
          <FinancialAlerts summary={summary} period={period} />
          <AccountantQuickAccess />
        </div>
      )}

      {/* STUDENT FEE LEDGER MODULE */}
      {activeModule === 'ledger' && (
        <section id="ledger" aria-labelledby="ledger-heading" className="ac-module-view">
          <AccountantModuleHeader
            title="Student Fee Ledger"
            subtitle={`Aged receivables, overdue invoices, and student account balances for ${period.label}`}
            icon={Wallet}
          />
          {periodSelector}
          <OutstandingFees summary={summary} period={period} />
        </section>
      )}

      {/* COLLECTIONS MODULE */}
      {activeModule === 'collections' && (
        <section id="collections" aria-labelledby="collections-heading" className="ac-module-view">
          <AccountantModuleHeader
            title="Collections & Payment History"
            subtitle={`Monthly collection velocity and settlement receipts for ${period.label}`}
            icon={ClipboardList}
          />
          {periodSelector}
          <div className="ac-two-columns" style={{ marginBottom: '20px' }}>
            <FeeCollectionAnalytics summary={summary} months={months} period={period} />
          </div>
          <PaymentHistory key={period.id} transactions={summary.transactions} period={period} />
        </section>
      )}

      {/* INVOICES & CASH FLOW MODULE */}
      {activeModule === 'invoices' && (
        <section id="invoices" aria-labelledby="invoices-heading" className="ac-module-view">
          <AccountantModuleHeader
            title="Invoices & Operating Cash Flow"
            subtitle={`Operating expenses, net cash flow, and monthly financial balance for ${period.label}`}
            icon={FileText}
          />
          {periodSelector}
          <div className="ac-two-columns">
            <ExpenseOverview summary={summary} period={period} />
            <MonthlyCashFlow summary={summary} months={months} period={period} />
          </div>
        </section>
      )}

      {/* FEE STRUCTURES MODULE */}
      {activeModule === 'structures' && (
        <section id="structures" aria-labelledby="structures-heading" className="ac-module-view">
          <AccountantModuleHeader
            title="Class-Wise Fee Structures"
            subtitle={`Assigned fee slabs, tuition components, and grade-level billing for ${period.label}`}
            icon={Calculator}
          />
          {periodSelector}
          <ClassWiseFees summary={summary} period={period} />
        </section>
      )}

      {/* REPORTS MODULE */}
      {activeModule === 'reports' && (
        <section id="reports" aria-labelledby="reports-heading" className="ac-module-view">
          <AccountantModuleHeader
            title="Financial Reports & Statements"
            subtitle="Standardized trial balance, collection reports, and reconciliation statements"
            icon={BarChart3}
          />
          <FinancialReports />
        </section>
      )}
    </>
  );
}

function AccountantModuleHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="ac-page-title" style={{ marginBottom: '22px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <button
            onClick={() => navigateToModule('overview')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 0, background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: 0 }}
            aria-label="Back to overview"
          >
            <ArrowLeft size={14} /> Overview
          </button>
          <span style={{ color: 'var(--muted-foreground)' }}>/</span>
          <span className="eyebrow" style={{ margin: 0 }}>Finance</span>
        </div>
        <h1 id={`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-heading`} tabIndex={-1} style={{ fontSize: '24px', letterSpacing: '-0.7px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>{subtitle}</p>
      </div>
      <div className="ac-icon" style={{ width: '44px', height: '44px' }}>
        <Icon size={22} />
      </div>
    </div>
  );
}
