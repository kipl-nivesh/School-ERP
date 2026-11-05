import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const transpile = filename => ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleURL = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const calc = await import(moduleURL(transpile('src/features/parent-dashboard/lib/calculations.ts')));
const {children,schoolNotices,parentProfile,months} = await import(moduleURL(transpile('src/features/parent-dashboard/data/mock-dashboard.ts')));
const reference=parentProfile.referenceDate;
assert.deepEqual(children.map(c=>c.id),['aarav','ananya']);
const allIds=[];
const results=[];
for (const child of children) {
  for (const key of ['attendance','marks','homework','installments','payments','timetable','exams','notices','reading']) {
    assert.ok(child[key].length>0,key);
    assert.ok(child[key].every(r=>r.childId===child.id),'child association: '+key);
    for (const r of child[key]) if ('id' in r) allIds.push(r.id);
  }
  assert.equal(new Set(child.attendance.map(r=>r.date)).size,child.attendance.length);
  assert.equal(child.attendance.length,93);
  assert.ok(child.attendance.every(r=>r.date>='2026-07-01'&&r.date<=reference));
  const summary=calc.childSummary(child,reference,schoolNotices.length);
  assert.equal(summary.attendance.present+summary.attendance.absent+summary.attendance.leave,summary.attendance.total);
  const monthly=months.map(m=>calc.attendanceSummary(child.attendance.filter(r=>r.date.startsWith(m.id))));
  for (const key of ['present','absent','leave','total']) assert.equal(monthly.reduce((sum,m)=>sum+m[key],0),summary.attendance[key]);
  for (const m of child.marks) { assert.ok(m.obtained>=0&&m.obtained<=m.maximum&&m.maximum>0); assert.ok(m.date<=reference); }
  const all=calc.filterHomework(child.homework,'all'),pending=calc.filterHomework(child.homework,'pending'),completed=calc.filterHomework(child.homework,'completed');
  assert.equal(all.length,pending.length+completed.length);
  assert.equal(summary.pendingHomework,pending.length);
  assert.ok(pending.every(r=>!r.completedDate)); assert.ok(completed.every(r=>r.completedDate<=reference));
  const fees=summary.fees;
  assert.equal(fees.total,fees.paid+fees.outstanding);
  assert.equal(fees.paid,child.payments.reduce((sum,p)=>sum+p.amount,0));
  assert.equal(fees.outstanding,fees.rows.reduce((sum,r)=>sum+r.outstanding,0));
  assert.equal(fees.percentage,fees.paid/fees.total*100);
  for (const p of child.payments) {
    assert.ok(child.installments.some(i=>i.id===p.installmentId&&i.childId===p.childId));
    assert.ok(p.amount>0&&Number.isInteger(p.amount)); assert.ok(p.date<=reference);
  }
  for (const row of fees.rows) {
    assert.ok(row.paid>=0&&row.outstanding>=0);
    assert.equal(row.amount,row.paid+row.outstanding);
    assert.equal(row.status,row.outstanding===0?'Paid':row.dueDate<reference?'Overdue':row.paid>0?'Partially paid':'Pending');
  }
  assert.equal(fees.overdue,fees.rows.filter(r=>r.dueDate<reference).reduce((sum,r)=>sum+r.outstanding,0));
  assert.ok(fees.next.dueDate>=reference&&fees.next.outstanding>0);
  for (const [i,p] of child.timetable.entries()) {
    assert.ok(p.start<p.end);
    if (i) assert.ok(child.timetable[i-1].end<=p.start);
  }
  assert.deepEqual(child.timetable.map(p=>calc.periodStatus(p,parentProfile.referenceTime)),child.id==='aarav'?['Completed','Completed','Current','Upcoming','Upcoming','Upcoming']:['Completed','Completed','Current','Upcoming','Upcoming']);
  assert.equal(summary.exams.length,child.exams.length);
  assert.ok(child.exams.every(e=>e.date>=reference&&e.start<e.end));
  const noticeIds=[...schoolNotices,...child.notices].map(n=>n.id);
  assert.equal(new Set(noticeIds).size,summary.noticeCount);
  assert.ok(child.reading.every(r=>r.date<=reference));
  results.push({id:child.id,attendance:[summary.attendance.present,summary.attendance.absent,summary.attendance.leave,summary.attendance.percentage.toFixed(1)],marks:[summary.academic.obtained,summary.academic.maximum,summary.academic.percentage.toFixed(1)],homework:[all.length,pending.length,completed.length],fees:[fees.total,fees.paid,fees.outstanding,fees.percentage.toFixed(1),fees.overdue,fees.next.dueDate],countdowns:child.exams.map(e=>calc.daysBetween(reference,e.date)),notices:summary.noticeCount});
}
assert.equal(new Set(allIds).size,allIds.length,'record IDs globally unique');
assert.deepEqual(results,[
  {id:'aarav',attendance:[88,5,0,'94.6'],marks:[413,500,'82.6'],homework:[6,3,3],fees:[68000,50000,18000,'73.5',2000,'2026-11-15'],countdowns:[6,7,9],notices:5},
  {id:'ananya',attendance:[89,2,2,'95.7'],marks:[180,200,'90.0'],homework:[2,2,0],fees:[48000,24000,24000,'50.0',0,'2026-11-18'],countdowns:[8,12],notices:3},
]);
assert.deepEqual(children[0].homework.map(r=>calc.homeworkStatus(r,reference)),['Overdue','Due soon','Pending','Completed','Completed','Completed']);
assert.equal(calc.filterHomework(children[1].homework,'completed').length,0,'empty view');
assert.equal(calc.formatINR(123456),'₹1,23,456'); assert.equal(calc.formatINR(0),'₹0');
assert.equal(calc.daysBetween('2026-10-31','2026-11-02'),2);
assert.equal(calc.percentage(0,0),0);
assert.equal(calc.marksSummary([{obtained:40,maximum:50},{obtained:60,maximum:100}]).percentage,100/150*100);
assert.equal(calc.periodStatus({start:'10:20',end:'11:00'},'10:20'),'Current');
assert.equal(calc.periodStatus({start:'09:30',end:'10:20'},'10:20'),'Completed');
// Aggregate payment matching must not accept another child's payment for a reused installment ID.
assert.equal(calc.installmentSummary({id:'same',childId:'aarav',amount:100,dueDate:'2026-11-10'},[{installmentId:'same',childId:'ananya',amount:100}],reference).paid,0);
const boundary={id:'b',childId:'aarav',amount:100,dueDate:reference};
assert.equal(calc.installmentSummary(boundary,[],reference).status,'Pending');
assert.equal(calc.installmentSummary({...boundary,dueDate:'2026-11-03'},[],reference).status,'Overdue');
assert.equal(calc.installmentSummary(boundary,[{installmentId:'b',childId:'aarav',amount:30}],reference).status,'Partially paid');
assert.equal(calc.installmentSummary(boundary,[{installmentId:'b',childId:'aarav',amount:100}],reference).status,'Paid');
console.log('PASS: Parent child associations, attendance, weighted marks, homework, fees, statuses, INR, timetable, countdowns, notices, and empty view.');
console.log(JSON.stringify(results,null,2));
