import type { Attendance, Child, Homework, HomeworkFilter, Installment, Mark, Payment, Period } from '../types';
export const percentage = (value: number, total: number) => total > 0 ? value / total * 100 : 0;
export const daysBetween = (from: string, to: string) => (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000;
export const formatINR = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(date + 'T12:00:00+05:30'));
export const formatTime = (time: string) => { const [h,m] = time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`; };
export function attendanceSummary(records: Attendance[]) {
  const present = records.filter(r => r.status === 'Present').length;
  const absent = records.filter(r => r.status === 'Absent').length;
  const leave = records.filter(r => r.status === 'Leave').length;
  return { present, absent, leave, total: records.length, percentage: percentage(present, records.length) };
}
export function marksSummary(marks: Mark[]) {
  const obtained = marks.reduce((sum,r) => sum+r.obtained,0);
  const maximum = marks.reduce((sum,r) => sum+r.maximum,0);
  const ordered = [...marks].sort((a,b) => percentage(b.obtained,b.maximum)-percentage(a.obtained,a.maximum));
  return { obtained, maximum, percentage: percentage(obtained,maximum), strongest: ordered[0], focus: ordered[ordered.length-1] };
}
export const filterHomework = (records: Homework[], filter: HomeworkFilter) => records.filter(r => filter === 'all' || (filter === 'completed' ? !!r.completedDate : !r.completedDate));
export function homeworkStatus(record: Homework, reference: string) {
  if (record.completedDate) return 'Completed';
  const days = daysBetween(reference, record.dueDate);
  return days < 0 ? 'Overdue' : days <= 1 ? 'Due soon' : 'Pending';
}
export function installmentSummary(item: Installment, payments: Payment[], reference: string) {
  const paid = payments.filter(r => r.installmentId === item.id && r.childId === item.childId).reduce((sum,r)=>sum+r.amount,0);
  const outstanding = item.amount-paid;
  const status = outstanding === 0 ? 'Paid' : item.dueDate < reference ? 'Overdue' : paid > 0 ? 'Partially paid' : 'Pending';
  return { ...item, paid, outstanding, status };
}
export function feeSummary(installments: Installment[], payments: Payment[], reference: string) {
  const rows = installments.map(item => installmentSummary(item,payments,reference));
  const total = rows.reduce((sum,r)=>sum+r.amount,0);
  const paid = rows.reduce((sum,r)=>sum+r.paid,0);
  const outstanding = total-paid;
  const unpaid = rows.filter(r=>r.outstanding>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const overdue = unpaid.filter(r=>r.status==='Overdue').reduce((sum,r)=>sum+r.outstanding,0);
  const next = unpaid.find(r=>r.dueDate>=reference);
  return { rows, total, paid, outstanding, overdue, next, percentage: percentage(paid,total) };
}
const minutes = (time: string) => { const [h,m] = time.split(':').map(Number); return h*60+m; };
export const periodStatus = (period: Period, time: string) => minutes(time)>=minutes(period.end)?'Completed':minutes(time)>=minutes(period.start)?'Current':'Upcoming';
export function childSummary(child: Child, reference: string, schoolNoticeCount: number) {
  return { attendance: attendanceSummary(child.attendance), academic: marksSummary(child.marks),
    pendingHomework: filterHomework(child.homework,'pending').length,
    fees: feeSummary(child.installments,child.payments,reference),
    exams: child.exams.filter(r=>r.date>=reference), noticeCount: schoolNoticeCount+child.notices.length };
}
