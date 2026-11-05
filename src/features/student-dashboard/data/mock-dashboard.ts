import type { StudentSubject, StudentPeriod, StudentHomework, AttendanceRecord, AttendanceMonth, StudentMark, StudentExam, StudentAchievement, StudentGoal, StudentAnnouncement, StudentStat, StudentQuickLink } from '../types';
import { summarizeAttendance, summarizeHomework, summarizeMarks, percentage } from '../lib/calculations';

export const studentProfile = { firstName: 'Aarav', className: 'Class VIII', section: 'A', academicYear: '2026–27', referenceDate: '2026-11-04', referenceTime: '10:20', timeZone: 'Asia/Kolkata' } as const;
export const studentSubjects: StudentSubject[] = [
  { id: 'mathematics', name: 'Mathematics', shortName: 'Maths', teacher: 'Ms Aanya Rao', accent: 'indigo' },
  { id: 'english', name: 'English', shortName: 'English', teacher: 'Ms Meera Sen', accent: 'rose' },
  { id: 'science', name: 'Science', shortName: 'Science', teacher: 'Mr Rohan Shah', accent: 'sky' },
  { id: 'social-science', name: 'Social Science', shortName: 'Social Science', teacher: 'Mr Dev Verma', accent: 'amber' },
  { id: 'computer-science', name: 'Computer Science', shortName: 'Computing', teacher: 'Mr Karan Das', accent: 'violet' },
];
export const studentTimetable: StudentPeriod[] = [
  { period: 1, subjectId: 'mathematics', start: '08:30', end: '09:15', room: '204', topic: 'Linear equations' },
  { period: 2, subjectId: 'english', start: '09:20', end: '10:05', room: '204', topic: 'Stories & perspectives' },
  { period: 3, subjectId: 'science', start: '10:15', end: '11:00', room: 'Science lab', topic: 'Inside the atom' },
  { period: 4, subjectId: 'mathematics', start: '11:15', end: '12:00', room: '204', topic: 'Algebra workshop' },
  { period: 5, subjectId: 'social-science', start: '12:05', end: '12:50', room: '204', topic: 'Reading our world' },
  { period: 6, subjectId: 'computer-science', start: '13:00', end: '13:45', room: 'Computer lab', topic: 'Thinking in algorithms' },
];
export const studentHomework: StudentHomework[] = [
  { id: 'algebra-practice', title: 'Algebra practice', subjectId: 'mathematics', assignedDate: '2026-10-30', dueDate: '2026-11-03', progress: 60 },
  { id: 'science-worksheet', title: 'Science worksheet', subjectId: 'science', assignedDate: '2026-11-02', dueDate: '2026-11-05', progress: 30 },
  { id: 'map-discovery', title: 'Map discovery journal', subjectId: 'social-science', assignedDate: '2026-11-03', dueDate: '2026-11-09', progress: 0 },
  { id: 'reading-reflection', title: 'A chapter, a new perspective', subjectId: 'english', assignedDate: '2026-10-29', dueDate: '2026-11-04', completedDate: '2026-11-03', progress: 100 },
  { id: 'logic-puzzles', title: 'Little logic challenges', subjectId: 'computer-science', assignedDate: '2026-10-30', dueDate: '2026-11-03', completedDate: '2026-11-02', progress: 100 },
  { id: 'geometry-sketchbook', title: 'Geometry sketchbook', subjectId: 'mathematics', assignedDate: '2026-11-02', dueDate: '2026-11-06', completedDate: '2026-11-03', progress: 100 },
];
// Deterministic fictional calendar: weekdays Jul 1–Nov 4 plus two specified school Saturdays.
const absentDates = new Set(['2026-07-16', '2026-08-12', '2026-09-08', '2026-09-23', '2026-10-08']);
const schoolSaturdays = new Set(['2026-10-10', '2026-10-24']);
function createAttendanceRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  for (let cursor = Date.UTC(2026, 6, 1); cursor <= Date.parse(studentProfile.referenceDate + "T00:00:00Z"); cursor += 86400000) {
    const day = new Date(cursor);
    const date = day.toISOString().slice(0, 10);
    const weekday = day.getUTCDay();
    if ((weekday === 0 || weekday === 6) && !schoolSaturdays.has(date)) continue;
    records.push({ date, status: absentDates.has(date) ? 'Absent' : 'Present' });
  }
  return records;
}
export const studentAttendance = createAttendanceRecords();
export const attendanceSummary = summarizeAttendance(studentAttendance);
export const attendanceMonths: AttendanceMonth[] = [
  { month: '2026-07', label: 'Jul' }, { month: '2026-08', label: 'Aug' },
  { month: '2026-09', label: 'Sep' }, { month: '2026-10', label: 'Oct' }, { month: '2026-11', label: 'Nov' },
].map(month => { const summary = summarizeAttendance(studentAttendance.filter(record => record.date.startsWith(month.month))); return { ...month, scheduled: summary.scheduled, present: summary.present, absent: summary.absent }; });
export const studentMarks: StudentMark[] = [
  { subjectId: 'mathematics', obtained: 82, maximum: 100, date: '2026-10-23', assessment: 'Term I assessment' },
  { subjectId: 'english', obtained: 78, maximum: 100, date: '2026-10-26', assessment: 'Term I assessment' },
  { subjectId: 'science', obtained: 87, maximum: 100, date: '2026-10-27', assessment: 'Term I assessment' },
  { subjectId: 'social-science', obtained: 74, maximum: 100, date: '2026-10-28', assessment: 'Term I assessment' },
  { subjectId: 'computer-science', obtained: 92, maximum: 100, date: '2026-10-30', assessment: 'Term I assessment' },
];
export const academicSummary = summarizeMarks(studentMarks);
export const homeworkSummary = summarizeHomework(studentHomework);
export const studentExams: StudentExam[] = [
  { id: 'math-unit-test', title: 'Unit Test II', subjectId: 'mathematics', date: '2026-11-10', start: '09:00', end: '10:00', preparation: 'Try a little algebra practice' },
  { id: 'science-unit-test', title: 'Unit Test II', subjectId: 'science', date: '2026-11-11', start: '09:00', end: '10:00', preparation: 'Revisit your science notes' },
  { id: 'english-unit-test', title: 'Unit Test II', subjectId: 'english', date: '2026-11-13', start: '09:00', end: '10:00', preparation: 'Make room for a chapter' },
];
export const readingChapters = [
  { title: 'The curious traveller · chapter 1', date: '2026-10-30' },
  { title: 'The curious traveller · chapter 2', date: '2026-11-01' },
  { title: 'The curious traveller · chapter 3', date: '2026-11-02' },
  { title: 'The curious traveller · chapter 4', date: '2026-11-03' },
];
export const sciencePractice = [{ title: 'Atoms around us', date: '2026-11-02' }, { title: 'A closer look at molecules', date: '2026-11-03' }];
const subjectScore = (id: StudentMark['subjectId']) => { const mark=studentMarks.find(item=>item.subjectId===id); return mark?percentage(mark.obtained,mark.maximum):0; };
export const studentAchievements: StudentAchievement[] = [
  { id: 'attendance', title: 'Attendance Star', description: 'Showing up for new discoveries.', requirement: 'Demo milestone: at least 90% attendance', earned: attendanceSummary.percentage >= 90, accent: 'amber' },
  { id: 'homework', title: 'Homework Hero', description: 'Small tasks, thoughtful effort.', requirement: 'Complete 3 sample assignments', earned: homeworkSummary.completed >= 3, accent: 'indigo' },
  { id: 'science', title: 'Science Explorer', description: 'Keep asking wonderful questions.', requirement: 'Demo science result of 85/100 or more', earned: subjectScore('science') >= 85, accent: 'sky' },
  { id: 'reading', title: 'Reading Champion', description: 'A new world on every page.', requirement: 'Read 6 chapters · ' + readingChapters.length + ' explored so far', earned: readingChapters.length >= 6, accent: 'violet' },
  { id: 'mathematics', title: 'Math Achiever', description: 'Build confidence, one problem at a time.', requirement: 'Demo maths result of 90/100 or more', earned: subjectScore('mathematics') >= 90, accent: 'emerald' },
];
export const earnedBadgeCount = studentAchievements.filter(badge => badge.earned).length;
export const studentGoals: StudentGoal[] = [
  { id: 'homework-goal', title: 'One task at a time', current: homeworkSummary.completed, target: homeworkSummary.total, unit: 'assignments completed', caption: 'Every thoughtful effort counts.', accent: 'indigo' },
  { id: 'reading-goal', title: 'A few more pages', current: readingChapters.length, target: 6, unit: 'chapters explored', caption: 'Find a story you love getting lost in.', accent: 'violet' },
  { id: 'science-goal', title: 'Stay curious', current: sciencePractice.length, target: 3, unit: 'science explorations', caption: 'Wonder is a wonderful place to start.', accent: 'sky' },
];
export const studentAnnouncements: StudentAnnouncement[] = [
  { id: 'sports', title: 'A day for school spirit', category: 'Sports Day', date: '2026-11-20', description: 'Join a day of teamwork, movement, and cheering one another on.', icon: 'sports', accent: 'emerald' },
  { id: 'science-fair', title: 'Big ideas from curious minds', category: 'Science Exhibition', date: '2026-11-27', description: 'Bring your questions and explore the Young Innovators Fair.', icon: 'science', accent: 'sky' },
  { id: 'exam-plan', title: 'Your next learning milestone', category: 'Examination Schedule', date: '2026-11-06', description: 'Sample reminder: make a little time to plan your Unit Test II revision.', icon: 'exams', accent: 'amber' },
  { id: 'library', title: 'Find your next favourite story', category: 'Library Week', date: '2026-11-09', description: 'Discover a book, share a recommendation, and enjoy a quiet chapter.', icon: 'library', accent: 'violet' },
];
export const studentStats: StudentStat[] = [
  { label: 'Attendance', value: attendanceSummary.percentage.toFixed(1) + '%', detail: attendanceSummary.present + ' of ' + attendanceSummary.scheduled + ' school days', icon: 'attendance', accent: 'emerald' },
  { label: 'Academic average', value: academicSummary.percentage.toFixed(1) + '%', detail: 'Term I · across ' + studentMarks.length + ' subjects', icon: 'average', accent: 'indigo' },
  { label: 'Pending homework', value: String(homeworkSummary.pending), detail: 'A little progress at your pace', icon: 'homework', accent: 'amber' },
  { label: 'Upcoming exams', value: String(studentExams.length), detail: 'Class assessments · November', icon: 'exams', accent: 'sky' },
  { label: 'Achievement badges', value: String(earnedBadgeCount), detail: 'Earned in this demo snapshot', icon: 'badges', accent: 'violet' },
  { label: 'Today’s classes', value: String(studentTimetable.length), detail: 'Teaching periods in this sample', icon: 'classes', accent: 'rose' },
];
export const studentQuickLinks: StudentQuickLink[] = [
  { title: 'My homework', description: 'Find your next small step', target: 'student-homework', icon: 'homework', accent: 'indigo' },
  { title: 'My timetable', description: 'Your rhythm for the school day', target: 'student-timetable', icon: 'timetable', accent: 'sky' },
  { title: 'Exam results', description: 'See your learning milestones', target: 'student-performance', icon: 'results', accent: 'violet' },
  { title: 'Attendance', description: 'Every school day counts', target: 'student-attendance', icon: 'attendance', accent: 'emerald' },
  { title: 'Achievements', description: 'Celebrate thoughtful effort', target: 'student-achievements', icon: 'achievements', accent: 'amber' },
  { title: 'Announcements', description: 'Around your school community', target: 'student-announcements', icon: 'announcements', accent: 'rose' },
];
