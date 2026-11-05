'use client';
import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import type { PeriodId } from '../types';
import { accountantProfile,financialLedger,ledgerMonths,reportingPeriods } from '../data/mock-dashboard';
import { financialSummary,monthlySummary } from '../lib/financial-calculations';
import { AccountantWelcomeBanner } from './accountant-welcome-banner';
import { FinancialStatsGrid } from './financial-stats-grid';
import { FeeCollectionAnalytics } from './fee-collection-analytics';
import { ClassWiseFees } from './class-wise-fees';
import { PaymentHistory } from './payment-history';
import { OutstandingFees } from './outstanding-fees';
import { ExpenseOverview } from './expense-overview';
import { MonthlyCashFlow } from './monthly-cash-flow';
import { FinancialAlerts } from './financial-alerts';
export function FinancialWorkspace() {
  const [periodId,setPeriodId]=useState<PeriodId>('half');
  const period=reportingPeriods.find(p=>p.id===periodId)??reportingPeriods[2];
  const summary=financialSummary(financialLedger,period,accountantProfile.referenceDate),months=monthlySummary(financialLedger,ledgerMonths,period,accountantProfile.referenceDate);
  return <><AccountantWelcomeBanner period={period}/><div className="ac-period-toolbar"><div><span className="ac-icon ac-tone-emerald"><CalendarRange size={20}/></span><div><h2>One window. Connected totals.</h2><p>Billing, cash, grade groups, and balances follow this selection.</p></div></div><div className="ac-period-control"><label htmlFor="accountant-reporting-period">Reporting period</label><select id="accountant-reporting-period" value={periodId} onChange={e=>setPeriodId(e.target.value as PeriodId)}>{reportingPeriods.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></div></div><p className="ac-scope" role="status" aria-live="polite">{period.caption} · {summary.invoices.length} fictional invoices · {summary.transactions.length} sample payment attempts · balances aged at 31 Oct 2026.</p><div className="ac-ledger-notice"><strong>Independent demo ledger</strong><p>Four synthetic student invoices per month, May–October 2026. This small illustration is separate from Admin and Parent demo datasets. No opening balances, refunds, discounts, or adjustments. Pending/failed attempts are not cash.</p></div><FinancialStatsGrid summary={summary} period={period}/><div className="ac-two-columns"><FeeCollectionAnalytics summary={summary} months={months} period={period}/><OutstandingFees summary={summary} period={period}/></div><ClassWiseFees summary={summary} period={period}/><PaymentHistory key={period.id} transactions={summary.transactions} period={period}/><div className="ac-two-columns"><ExpenseOverview summary={summary} period={period}/><MonthlyCashFlow summary={summary} months={months} period={period}/></div><FinancialAlerts summary={summary} period={period}/></>;
}
