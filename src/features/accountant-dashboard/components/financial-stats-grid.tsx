import { Receipt,Wallet,Clock3,CircleAlert,BriefcaseBusiness,ArrowLeftRight } from 'lucide-react';
import { financialSummary,formatINR } from '../lib/financial-calculations';
import type { ReportingPeriod } from '../types';
import { FinanceReveal } from './motion';
export function FinancialStatsGrid({summary,period}:{summary:ReturnType<typeof financialSummary>;period:ReportingPeriod}) {
  const stats=[{label:'Total fees billed',value:summary.billed,detail:'Invoices issued in window',icon:Receipt,tone:'indigo'},{label:'Total fees collected',value:summary.collected,detail:'Settled cash receipts only',icon:Wallet,tone:'emerald'},{label:'Outstanding fees',value:summary.outstanding,detail:'Selected invoices · as of 31 Oct',icon:Clock3,tone:'amber'},{label:'Overdue fees',value:summary.overdue,detail:'Included in outstanding',icon:CircleAlert,tone:'rose'},{label:'Total expenses',value:summary.paidExpenses,detail:'Cash expenses paid in window',icon:BriefcaseBusiness,tone:'violet'},{label:'Net cash flow',value:summary.netCashFlow,detail:'Collections less paid expenses',icon:ArrowLeftRight,tone:'sky'}];
  return <section aria-label={'Financial statistics · '+period.caption} className="ac-stats">{stats.map(({label,value,detail,icon:Icon,tone},i)=><FinanceReveal key={label} className={'ac-stat ac-tone-'+tone} index={i} hover><span className="ac-icon"><Icon size={18}/></span><h2>{label}</h2><strong data-kpi={label}>{formatINR(value)}</strong><p>{detail}</p><small>{period.caption}</small></FinanceReveal>)}</section>;
}
