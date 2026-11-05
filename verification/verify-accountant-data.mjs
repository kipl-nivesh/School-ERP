import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const transpile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const c=await import(url(transpile('src/features/accountant-dashboard/lib/financial-calculations.ts')));
const {financialLedger:ledger,reportingPeriods,ledgerMonths,classGroups,expenseCategories,accountantProfile}=await import(url(transpile('src/features/accountant-dashboard/data/mock-dashboard.ts')));
const ref=accountantProfile.referenceDate;
assert.equal(ledger.invoices.length,24);assert.equal(ledger.transactions.length,36);assert.equal(ledger.expenses.length,42);
for(const records of [ledger.invoices,ledger.transactions,ledger.expenses]) {
  assert.equal(new Set(records.map(r=>r.id)).size,records.length);
  assert.ok(records.every(r=>Number.isSafeInteger(r.amount)&&r.amount>0));
}
for(const t of ledger.transactions) {
  const invoice=ledger.invoices.find(i=>i.id===t.invoiceId);assert.ok(invoice);
  for(const key of ['studentId','classId','category'])assert.equal(t[key],invoice[key]);
  assert.ok(t.date>=invoice.billedDate&&t.date<=ref);
  assert.equal(t.date.slice(0,7),invoice.billedDate.slice(0,7),'no cross-month settlements in this demo');
}
for(const invoice of ledger.invoices) {
  const balance=c.invoiceBalance(invoice,ledger.transactions,ref);
  assert.ok(balance.outstanding>=0&&balance.collected>=0);
  assert.equal(invoice.amount,balance.collected+balance.outstanding);
  assert.ok(invoice.dueDate>=invoice.billedDate);
}
const expected={
  month:[127000,119800,7200,2640,71000,48800,2500],
  quarter:[369000,330360,38640,34080,208200,122160,7200],
  half:[702000,628560,73440,68880,402000,226560,13500],
};
const results=[];
for(const period of reportingPeriods) {
  const s=c.financialSummary(ledger,period,ref),months=c.monthlySummary(ledger,ledgerMonths,period,ref);
  assert.deepEqual([s.billed,s.collected,s.outstanding,s.overdue,s.paidExpenses,s.netCashFlow,s.unpaidExpenses],expected[period.id].map(n=>n*100));
  assert.equal(s.billed,s.collected+s.outstanding);assert.equal(s.outstanding,s.overdue+s.notYetDue);
  assert.ok(s.overdue<=s.outstanding&&s.overdue>=0);
  assert.equal(s.collected,c.sumAmounts(s.transactions.filter(t=>t.status==='Settled')));
  assert.equal(s.netCashFlow,s.collected-s.paidExpenses);
  assert.equal(s.collectionRate,s.collected/s.billed*100);
  const bucketNames=['Not yet due','1–30 days','31–60 days','Over 60 days'];
  const buckets=bucketNames.map(name=>s.balances.filter(b=>c.agingBucket(b.daysOverdue)===name).reduce((sum,b)=>sum+b.outstanding,0));
  assert.equal(buckets.reduce((a,b)=>a+b,0),s.outstanding);assert.equal(buckets.slice(1).reduce((a,b)=>a+b,0),s.overdue);
  const classTotals=classGroups.map(g=>s.balances.filter(b=>b.classId===g.id).reduce((a,b)=>({billed:a.billed+b.amount,collected:a.collected+b.collected,outstanding:a.outstanding+b.outstanding}),{billed:0,collected:0,outstanding:0}));
  for(const row of classTotals)assert.equal(row.billed,row.collected+row.outstanding);
  for(const key of ['billed','collected','outstanding'])assert.equal(classTotals.reduce((sum,r)=>sum+r[key],0),s[key]);
  assert.equal(expenseCategories.reduce((sum,category)=>sum+c.sumAmounts(s.expenses.filter(e=>e.category===category&&e.status==='Paid')),0),s.paidExpenses);
  assert.equal(s.paidExpenses+s.unpaidExpenses,c.sumAmounts(s.expenses));
  for(const key of ['billed','collected','outstanding','paidExpenses','netCashFlow'])assert.equal(months.reduce((sum,m)=>sum+m[key],0),s[key]);
  for(const m of months){assert.equal(m.billed,m.collected+m.outstanding);assert.equal(m.netCashFlow,m.collected-m.paidExpenses);}
  assert.equal(months.length,period.id==='month'?1:period.id==='quarter'?3:6);
  assert.equal(c.inPeriod(period.start,period),true);assert.equal(c.inPeriod(period.end,period),true);
  assert.equal(c.inPeriod(new Date(Date.parse(period.start+'T00:00:00Z')-86400000).toISOString().slice(0,10),period),false);
  const filters={query:'',status:'all',method:'all'};
  assert.equal(c.filterTransactions(s.transactions,filters).length,s.transactions.length);
  for(const status of ['Settled','Pending','Failed'])assert.ok(c.filterTransactions(s.transactions,{...filters,status}).every(t=>t.status===status));
  for(const method of ['Bank transfer','UPI','Card'])assert.ok(c.filterTransactions(s.transactions,{...filters,method}).every(t=>t.method===method));
  assert.equal(c.filterTransactions(s.transactions,{...filters,status:'Pending',method:'Card'}).length,0);
  results.push({period:period.caption,invoices:s.invoices.length,transactions:s.transactions.length,billed:c.formatINR(s.billed),collected:c.formatINR(s.collected),outstanding:c.formatINR(s.outstanding),overdue:c.formatINR(s.overdue),paidExpenses:c.formatINR(s.paidExpenses),netCashFlow:c.formatINR(s.netCashFlow),aging:buckets.map(c.formatINR)});
}
const all={query:'',status:'all',method:'all'};
assert.deepEqual(c.filterTransactions(ledger.transactions,{...all,query:'  tx-demo-61s  '}).map(t=>t.id),['TX-DEMO-61S']);
assert.equal(c.filterTransactions(ledger.transactions,{...all,query:'fic-101'}).length,2);
assert.equal(c.filterTransactions(ledger.transactions,{...all,query:'no-such-record'}).length,0);
assert.deepEqual([0,1,30,31,60,61,-1].map(c.agingBucket),['Not yet due','1–30 days','1–30 days','31–60 days','31–60 days','Over 60 days','Not yet due']);
assert.equal(c.daysOverdue('2026-10-01','2026-10-31'),30);assert.equal(c.daysOverdue('2026-10-31',ref),0);
assert.equal(c.formatINR(12345678),'₹1,23,456.78');assert.equal(c.formatINR(1),'₹0.01');assert.equal(c.formatINR(0),'₹0.00');assert.equal(c.formatINR(-100),'−₹1.00'.replace('−','-'));
assert.equal(c.financialSummary({invoices:[],transactions:[],expenses:[]},reportingPeriods[0],ref).netCashFlow,0);
// Failed/pending attempts never reduce an invoice balance; future settlements also do not.
const invoice={id:'boundary',amount:10000,dueDate:ref,billedDate:'2026-10-01'};
const attempts=[{invoiceId:'boundary',amount:10000,status:'Failed',date:ref},{invoiceId:'boundary',amount:10000,status:'Pending',date:ref},{invoiceId:'boundary',amount:10000,status:'Settled',date:'2026-11-01'}];
assert.equal(c.invoiceBalance(invoice,attempts,ref).outstanding,10000);
const negative=c.financialSummary({invoices:[],transactions:[],expenses:[{amount:100,date:ref,status:'Paid'}]},reportingPeriods[0],ref);assert.equal(negative.netCashFlow,-100);
console.log('PASS: integer-paise ledger, all reporting scopes, reconciliations, class/aging/category totals, settled-only cash, month boundaries, filters/search/empty state, currency, and negative cash-flow semantics.');
console.log(JSON.stringify(results,null,2));
