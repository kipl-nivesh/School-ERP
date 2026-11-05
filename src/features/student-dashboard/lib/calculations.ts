import type { AttendanceRecord, StudentHomework, HomeworkFilter, HomeworkStatus, StudentMark, StudentSubject, SubjectId, StudentPeriod } from '../types';

export const percentage = (value: number, maximum: number) => maximum > 0 ? value / maximum * 100 : 0;
// Calendar-day differences use explicit UTC midnights, independent of browser timezone/DST.
export const daysBetween = (from: string, to: string) => (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000;
export const minutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
export function studentPeriodStatus(period: StudentPeriod, referenceTime: string): 'Completed' | 'Current' | 'Upcoming' {
  const reference = minutes(referenceTime);
  return reference >= minutes(period.end) ? 'Completed' : reference >= minutes(period.start) ? 'Current' : 'Upcoming';
}
export function getStudentSubject(id: SubjectId, subjects: StudentSubject[]): StudentSubject {
  const subject = subjects.find(item => item.id === id);
  if (!subject) throw new Error('Unknown demo subject: ' + id);
  return subject;
}
export function homeworkStatus(item: StudentHomework, referenceDate: string): HomeworkStatus {
  if (item.completedDate) return 'Completed';
  const days = daysBetween(referenceDate, item.dueDate);
  return days < 0 ? 'Overdue' : days <= 1 ? 'Due soon' : 'Pending';
}
export function filterStudentHomework(items: StudentHomework[], filter: HomeworkFilter) {
  return items.filter(item => filter === 'all' || (filter === 'completed' ? !!item.completedDate : !item.completedDate));
}
export function summarizeHomework(items: StudentHomework[]) {
  const completed = items.filter(item => !!item.completedDate).length;
  return { total: items.length, completed, pending: items.length - completed };
}
export function summarizeAttendance(records: AttendanceRecord[]) {
  const present = records.filter(item => item.status === 'Present').length;
  return { scheduled: records.length, present, absent: records.length - present, percentage: percentage(present, records.length) };
}
export function summarizeMarks(marks: StudentMark[]) {
  const obtained = marks.reduce((sum, item) => sum + item.obtained, 0);
  const maximum = marks.reduce((sum, item) => sum + item.maximum, 0);
  const ordered = [...marks].sort((a, b) => percentage(b.obtained, b.maximum) - percentage(a.obtained, a.maximum));
  return { obtained, maximum, percentage: percentage(obtained, maximum), strongest: ordered[0] ?? null, focus: ordered[ordered.length - 1] ?? null };
}
export const formatStudentDate = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'Asia/Kolkata' }).format(new Date(date + 'T12:00:00+05:30'));
export const formatStudentTime = (time: string) => { const [hour, minute] = time.split(':').map(Number); return (hour % 12 || 12) + ':' + String(minute).padStart(2, '0') + (hour < 12 ? ' AM' : ' PM'); };
