import { CalendarClock,CircleAlert,ClipboardCheck,FileSearch } from 'lucide-react';
import type { ReportingPeriod } from '../types';
import { financialSummary,formatINR } from '../lib/financial-calculations';
import { FinanceSection } from './section';
export function FinancialAlerts({summary,period}:{summary:ReturnType<typeof financialSummary>;period:ReportingPeriod}) {
  const alerts=[
    {title:'Upcoming tuition due dates',category:'Fee schedule',date:'15 Nov 2026',description:`${formatINR(summary.notYetDue)} is not yet due among the selected invoices. ${summary.notYetDue?'The next sample due date is 15 November.':'No future-due balance in this window.'}`,severity:'Information',icon:CalendarClock,tone:'sky'},
    {title:'Review aged fee balances',category:'Outstanding review',date:'31 Oct 2026',description:`${formatINR(summary.overdue)} of selected invoices is overdue. Review the aging breakdown before planning any follow-up.`,severity:'Attention',icon:CircleAlert,tone:'rose'},
    {title:'Month-end reconciliation',category:'Ledger review',date:'31 Oct 2026',description:`Review ${period.caption} settled receipts against invoice allocations and paid expenses.`,severity:'Reminder',icon:ClipboardCheck,tone:'amber'},
    {title:'Keep obligations separate',category:'Expense review',date:'2 Nov 2026',description:`${formatINR(summary.unpaidExpenses)} in sample unpaid obligations is excluded from cash flow.`,severity:'Information',icon:FileSearch,tone:'violet'},
  ];
  return <FinanceSection id="accountant-alerts" title="A few things to keep in view" description="Fictional financial alerts · no messages or notifications are sent" badge="Preview reminders"><div className="ac-alerts">{alerts.map(({title,category,date,description,severity,icon:Icon,tone})=><article key={title} className={'ac-tone-'+tone}><span className="ac-icon"><Icon size={19}/></span><div><span className="ac-subtitle">{category} · {date}</span><h3>{title}</h3><p>{description}</p><span className="ac-severity">{severity}</span></div></article>)}</div></FinanceSection>;
}
