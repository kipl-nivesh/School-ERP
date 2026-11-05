import type { ClassId, ExpenseCategory, FinancialLedger, PaymentMethod, ReportingPeriod } from '../types';
export const accountantProfile = { name: 'Neha Mehta', academicYear: '2026–27', referenceDate: '2026-10-31', timeZone: 'Asia/Kolkata' } as const;
export const reportingPeriods: ReportingPeriod[] = [
  {id:'month',label:'Current demo month',start:'2026-10-01',end:'2026-10-31',caption:'1–31 Oct 2026'},
  {id:'quarter',label:'Last 3 demo months',start:'2026-08-01',end:'2026-10-31',caption:'1 Aug–31 Oct 2026'},
  {id:'half',label:'Last 6 demo months',start:'2026-05-01',end:'2026-10-31',caption:'1 May–31 Oct 2026'},
];
export const classGroups: {id:ClassId;label:string;description:string}[] = [
  {id:'primary',label:'Grades 1–5',description:'Primary'}, {id:'middle',label:'Grades 6–8',description:'Middle'},
  {id:'secondary',label:'Grades 9–10',description:'Secondary'}, {id:'senior',label:'Grades 11–12',description:'Senior secondary'},
];
export const ledgerMonths = ['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'];
export const expenseCategories:ExpenseCategory[]=['Staff salaries','Utilities','Maintenance','Transport','Learning materials','Administration'];
const methods:PaymentMethod[]=['Bank transfer','UPI','Card'];
// Complete SMALL fictional ledger: four synthetic student invoices per month, not school-wide enrollment.
// All settled allocations occur in the invoice's billed month. No opening balances/cross-period allocations.
function createLedger():FinancialLedger {
  const ledger:FinancialLedger={invoices:[],transactions:[],expenses:[]};
  ledgerMonths.forEach((month,m)=>{
    classGroups.forEach((group,g)=>{
      const id=`INV-DEMO-${m+1}${g+1}`,studentId=`FIC-${101+m*4+g}`;
      const amount=([25000,22000,28000,32000][g]+m*1000)*100;
      const rate=[80,85,90,75,88,92][m];
      // Some fully settled invoices, others partial; no money rounding needed for these integer amounts.
      const paid=g===3?amount:amount*rate/100;
      const dueDate=m===5&&g<2?'2026-11-15':month+'-15';
      ledger.invoices.push({id,studentId,classId:group.id,billedDate:month+'-01',dueDate,amount,category:'Tuition'});
      ledger.transactions.push({id:`TX-DEMO-${m+1}${g+1}S`,invoiceId:id,studentId,classId:group.id,date:month+'-12',amount:paid,category:'Tuition',method:methods[(m+g)%3],status:'Settled'});
      if(g===0) ledger.transactions.push({id:`TX-DEMO-${m+1}${g+1}P`,invoiceId:id,studentId,classId:group.id,date:month+'-20',amount:amount-paid,category:'Tuition',method:'UPI',status:'Pending'});
      if(g===1) ledger.transactions.push({id:`TX-DEMO-${m+1}${g+1}F`,invoiceId:id,studentId,classId:group.id,date:month+'-21',amount:amount-paid,category:'Tuition',method:'Card',status:'Failed'});
    });
    expenseCategories.forEach((category,c)=>ledger.expenses.push({id:`EXP-DEMO-${m+1}${c+1}`,date:month+'-25',category,amount:([42000,5000,3500,6000,4000,2500][c]+m*[1000,100,150,200,100,50][c])*100,status:'Paid'}));
    ledger.expenses.push({id:`EXP-DEMO-${m+1}U`,date:month+'-28',category:'Maintenance',amount:(2000+m*100)*100,status:'Unpaid'});
  });
  return ledger;
}
export const financialLedger=createLedger();
export const reportPreviews=[
  {title:'Fee Collection Report',description:'Billing, settled receipts, and collection rate.',tone:'emerald'},
  {title:'Outstanding Fees Report',description:'Balances, due dates, and aging categories.',tone:'amber'},
  {title:'Expense Report',description:'Paid expense categories and unpaid obligations.',tone:'violet'},
  {title:'Monthly Cash Flow Report',description:'Collections less cash expenses paid.',tone:'indigo'},
  {title:'Class-Wise Collection Report',description:'Fee balances across four grade groups.',tone:'sky'},
  {title:'Payment History Report',description:'Settled, pending, and failed sample attempts.',tone:'rose'},
] as const;
