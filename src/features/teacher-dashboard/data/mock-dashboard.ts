import type { TeacherClass, ClassId, TeacherPeriod, AttendanceDay, HomeworkAssignment, TeacherExam, ClassPerformance, TeacherUpdate, TeacherActivity, TeacherStat } from '../types';

// Fixed fictional snapshot. Status never depends on the viewer's clock.
export const teacherProfile = {
  name: 'Aanya Rao', displayName: 'Ms Aanya Rao', initials: 'AR',
  department: 'Mathematics & Science', academicYear: '2026–27',
  referenceDate: '2026-11-04', referenceTime: '10:20', timeZone: 'Asia/Kolkata',
  homeroom: 'Class VIII · Section A',
} as const;
export const assignedClasses: TeacherClass[] = [
  { id: '8A', name: 'Class VIII', section: 'A', subject: 'Mathematics', students: 42, present: 40, room: '204', accent: 'indigo' },
  { id: '9B', name: 'Class IX', section: 'B', subject: 'Science', students: 38, present: 36, room: 'Science lab', accent: 'sky' },
  { id: '10A', name: 'Class X', section: 'A', subject: 'Mathematics', students: 40, present: 38, room: '302', accent: 'violet' },
];
export function getTeacherClass(id: ClassId): TeacherClass {
  const item = assignedClasses.find(group => group.id === id);
  if (!item) throw new Error('Unknown demo class: ' + id);
  return item;
}
export const totalStudents = assignedClasses.reduce((total, group) => total + group.students, 0);
export const presentToday = assignedClasses.reduce((total, group) => total + group.present, 0);
export const attendancePercent = presentToday / totalStudents * 100;
export const timetable: TeacherPeriod[] = [
  { period: 1, classId: '8A', start: '08:30', end: '09:15', topic: 'Linear equations' },
  { period: 2, classId: '9B', start: '09:20', end: '10:05', topic: 'Atoms & molecules' },
  { period: 3, classId: '10A', start: '10:15', end: '11:00', topic: 'Triangles & similarity' },
  { period: 4, classId: '8A', start: '11:15', end: '12:00', topic: 'Algebra workshop' },
  { period: 6, classId: '9B', start: '13:00', end: '13:45', topic: 'Science lab practice' },
];
export const toMinutes = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
export function periodStatus(period: TeacherPeriod): 'Completed' | 'Current' | 'Upcoming' {
  const reference = toMinutes(teacherProfile.referenceTime);
  if (reference >= toMinutes(period.end)) return 'Completed';
  return reference >= toMinutes(period.start) ? 'Current' : 'Upcoming';
}
export const weeklyAttendance: AttendanceDay[] = [
  { date: '2026-10-29', label: 'Thu', present: 109, absent: totalStudents - 109 },
  { date: '2026-10-30', label: 'Fri', present: 112, absent: totalStudents - 112 },
  { date: '2026-11-02', label: 'Mon', present: 110, absent: totalStudents - 110 },
  { date: '2026-11-03', label: 'Tue', present: 116, absent: totalStudents - 116 },
  { date: teacherProfile.referenceDate, label: 'Wed', present: presentToday, absent: totalStudents - presentToday },
];
export const weeklyAttendancePercent = weeklyAttendance.reduce((n, day) => n + day.present, 0) / (totalStudents * weeklyAttendance.length) * 100;
export const homework: HomeworkAssignment[] = [
  { id: 'algebra', title: 'Algebra practice', classId: '8A', dueDate: '2026-11-03', submitted: 38, reviewed: 24 },
  { id: 'science', title: 'Science worksheet', classId: '9B', dueDate: '2026-11-05', submitted: 34, reviewed: 22 },
  { id: 'geometry', title: 'Geometry exercises', classId: '10A', dueDate: '2026-11-06', submitted: 36, reviewed: 28 },
];
export const homeworkTotals = homework.reduce((total, assignment) => ({
  expected: total.expected + getTeacherClass(assignment.classId).students,
  submitted: total.submitted + assignment.submitted,
  reviewed: total.reviewed + assignment.reviewed,
  pending: total.pending + assignment.submitted - assignment.reviewed,
}), { expected: 0, submitted: 0, reviewed: 0, pending: 0 });
export const upcomingExams: TeacherExam[] = [
  { title: 'Unit Test II', classId: '8A', date: '2026-11-10', start: '09:00', end: '10:00', status: 'Scheduled' },
  { title: 'Term assessment', classId: '9B', date: '2026-11-16', start: '09:00', end: '10:30', status: 'Scheduled' },
  { title: 'Term assessment', classId: '10A', date: '2026-11-16', start: '11:00', end: '12:30', status: 'Scheduled' },
];
// Aggregate score frequencies only. No identifiable student records.
export const performance: ClassPerformance[] = [
  { classId: '8A', scores: [{ score: 90, count: 14 }, { score: 75, count: 16 }, { score: 60, count: 9 }, { score: 40, count: 3 }] },
  { classId: '9B', scores: [{ score: 90, count: 10 }, { score: 75, count: 14 }, { score: 60, count: 10 }, { score: 40, count: 4 }] },
  { classId: '10A', scores: [{ score: 90, count: 16 }, { score: 75, count: 14 }, { score: 60, count: 8 }, { score: 40, count: 2 }] },
];
export const classAverage = (item: ClassPerformance) => item.scores.reduce((sum, group) => sum + group.score * group.count, 0) / getTeacherClass(item.classId).students;
export const performanceTotalMarks = performance.reduce((total, item) => total + item.scores.reduce((sum, group) => sum + group.score * group.count, 0), 0);
export const overallAverage = performanceTotalMarks / totalStudents;
export const performanceBands = [
  { label: 'Thriving', range: '85–100 marks', min: 85, max: 100, accent: 'emerald' },
  { label: 'On track', range: '70–84 marks', min: 70, max: 84, accent: 'indigo' },
  { label: 'Building confidence', range: '50–69 marks', min: 50, max: 69, accent: 'sky' },
  { label: 'Extra support', range: 'Below 50 marks', min: 0, max: 49, accent: 'amber' },
].map(band => ({ ...band, count: performance.reduce((total, item) => total + item.scores.filter(group => group.score >= band.min && group.score <= band.max).reduce((sum, group) => sum + group.count, 0), 0) }));
export const studentsNeedingSupport = performanceBands[performanceBands.length - 1].count;
export const announcements: TeacherUpdate[] = [
  { title: 'Parent–Teacher Connect', description: 'Prepare a few learning highlights for your class conversations.', date: '2026-11-13', category: 'School community', accent: 'violet', icon: 'notice' },
  { title: 'Assessment preparation', description: 'Sample reminder: review the Unit Test II learning plan.', date: '2026-11-06', category: 'Academic reminder', accent: 'amber', icon: 'calendar' },
  { title: 'Reading hour', description: 'Bring a favourite book to the shared classroom reading session.', date: '2026-11-05', category: 'School announcement', accent: 'emerald', icon: 'book' },
];
export const activities: TeacherActivity[] = [
  { title: 'Science worksheet assigned', description: 'Class IX B · sample assignment prepared', timestamp: '2026-11-04T09:50:00+05:30', time: '9:50 AM', accent: 'sky' },
  { title: 'Geometry reviews updated', description: 'Class X A · 28 sample submissions reviewed', timestamp: '2026-11-04T09:20:00+05:30', time: '9:20 AM', accent: 'violet' },
  { title: 'Daily register updated', description: 'All three classes · 114 present, 6 absent', timestamp: '2026-11-04T09:05:00+05:30', time: '9:05 AM', accent: 'emerald' },
];
export const teacherStats: TeacherStat[] = [
  { label: 'My classes', value: String(assignedClasses.length), detail: 'Mathematics & Science', accent: 'indigo', icon: 'classes' },
  { label: 'Total students', value: String(totalStudents), detail: 'Across your assigned classes', accent: 'sky', icon: 'students' },
  { label: 'Today’s attendance', value: attendancePercent.toFixed(1) + '%', detail: presentToday + ' of ' + totalStudents + ' present', accent: 'emerald', icon: 'attendance' },
  { label: 'Pending homework reviews', value: String(homeworkTotals.pending), detail: 'Submitted work awaiting review', accent: 'amber', icon: 'homework' },
  { label: 'Upcoming exams', value: String(upcomingExams.length), detail: 'Class assessments · November', accent: 'violet', icon: 'exams' },
  { label: 'Today’s periods', value: String(timetable.length), detail: 'Teaching periods in this sample', accent: 'rose', icon: 'periods' },
];
export const quickAccess = [
  { label: 'Take attendance', description: 'A little care, every school day', icon: 'attendance', accent: 'emerald' },
  { label: 'My classes', description: 'Your classroom communities', icon: 'classes', accent: 'indigo' },
  { label: 'Assign homework', description: 'Keep curious minds exploring', icon: 'homework', accent: 'sky' },
  { label: 'Enter marks', description: 'Capture those learning milestones', icon: 'marks', accent: 'amber' },
  { label: 'View timetable', description: 'Find your rhythm for the day', icon: 'periods', accent: 'violet' },
  { label: 'Student progress', description: 'Celebrate every step forward', icon: 'progress', accent: 'rose' },
] as const;
export const formatTeacherDate = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat('en-IN', { ...options, timeZone: teacherProfile.timeZone }).format(new Date(date + 'T12:00:00+05:30'));
export const formatTeacherTime = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return (hours % 12 || 12) + ':' + String(minutes).padStart(2, '0') + (hours < 12 ? ' AM' : ' PM'); };
