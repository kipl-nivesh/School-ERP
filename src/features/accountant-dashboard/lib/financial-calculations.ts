import type { FinancialLedger, Invoice, PaymentFilters, ReportingPeriod, Transaction } from '../types';
export const sumAmounts=(records:{amount:number}[])=>records.reduce((sum,r)=>sum+r.amount,0);
export const percentage=(value:number,total:number)=>total>0?value/total*100:0;
export const formatINR=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(paise/100);
export const formatDate=(date:string)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(date+'T12:00:00+05:30'));
export const monthLabel=(month:string)=>new Intl.DateTimeFormat('en-IN',{month:'short',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
export const inPeriod=(date:string,period:ReportingPeriod)=>date>=period.start&&date<=period.end;
export const daysOverdue=(dueDate:string,reference:string)=>(Date.parse(reference+'T00:00:00Z')-Date.parse(dueDate+'T00:00:00Z'))/86400000;
export function invoiceBalance(invoice:Invoice,transactions:Transaction[],reference:string) {
  const collected=sumAmounts(transactions.filter(t=>t.invoiceId===invoice.id&&t.status==='Settled'&&t.date<=reference));
  return {...invoice,collected,outstanding:invoice.amount-collected,daysOverdue:daysOverdue(invoice.dueDate,reference)};
}
export const agingBucket=(days:number)=>days<=0?'Not yet due':days<=30?'1–30 days':days<=60?'31–60 days':'Over 60 days';
export function financialSummary(ledger:FinancialLedger,period:ReportingPeriod,reference:string) {
  const invoices=ledger.invoices.filter(i=>inPeriod(i.billedDate,period));
  const transactions=ledger.transactions.filter(t=>inPeriod(t.date,period));
  const expenses=ledger.expenses.filter(e=>inPeriod(e.date,period));
  const balances=invoices.map(i=>invoiceBalance(i,ledger.transactions,reference));
  const billed=sumAmounts(invoices),collected=sumAmounts(transactions.filter(t=>t.status==='Settled'));
  const outstanding=balances.reduce((sum,b)=>sum+b.outstanding,0);
  const overdue=balances.filter(b=>b.daysOverdue>0).reduce((sum,b)=>sum+b.outstanding,0);
  const paidExpenses=sumAmounts(expenses.filter(e=>e.status==='Paid'));
  return {invoices,transactions,expenses,balances,billed,collected,outstanding,overdue,notYetDue:outstanding-overdue,paidExpenses,unpaidExpenses:sumAmounts(expenses.filter(e=>e.status==='Unpaid')),netCashFlow:collected-paidExpenses,collectionRate:percentage(collected,billed)};
}
export function monthlySummary(ledger:FinancialLedger,months:string[],period:ReportingPeriod,reference:string) {
  return months.filter(month=>month>=period.start.slice(0,7)&&month<=period.end.slice(0,7)).map(month=>({month,...financialSummary(ledger,{...period,start:month+'-01',end:month===period.end.slice(0,7)?period.end:new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10)},reference)}));
}
export function filterTransactions(records:Transaction[],filters:PaymentFilters) {
  const query=filters.query.trim().toLowerCase();
  return records.filter(t=>(!query||t.id.toLowerCase().includes(query)||t.studentId.toLowerCase().includes(query))&&(filters.status==='all'||t.status===filters.status)&&(filters.method==='all'||t.method===filters.method)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
