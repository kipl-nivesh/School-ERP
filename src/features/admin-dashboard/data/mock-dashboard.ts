import type { AttendanceDay, MonthlyCollection, StudentGroup, SchoolEvent, SampleActivity, DashboardStat } from '../types';
export const mockSchool = { name: 'Brightcamp School', academicYear: '2026–27', snapshotDate: '2026-11-04', teachers: 68 } as const;
export const studentDistribution: StudentGroup[] = [
  { label: 'Primary', grades: 'Classes I–V', students: 480, accent: 'indigo' },
  { label: 'Middle school', grades: 'Classes VI–VIII', students: 336, accent: 'sky' },
  { label: 'High school', grades: 'Classes IX–X', students: 264, accent: 'violet' },
  { label: 'Higher secondary', grades: 'Classes XI–XII', students: 168, accent: 'amber' },
];
export const totalStudents = studentDistribution.reduce((total, group) => total + group.students, 0);
export const attendance: AttendanceDay[] = [
  { date: '2026-10-29', label: 'Thu', present: 1167, absent: 81 },
  { date: '2026-10-30', label: 'Fri', present: 1174, absent: 74 },
  { date: '2026-11-02', label: 'Mon', present: 1158, absent: 90 },
  { date: '2026-11-03', label: 'Tue', present: 1190, absent: 58 },
  { date: mockSchool.snapshotDate, label: 'Wed', present: 1183, absent: 65 },
];
export const monthlyCollections: MonthlyCollection[] = [
  { month: 'Apr', amount: 180000 }, { month: 'May', amount: 210000 },
  { month: 'Jun', amount: 195000 }, { month: 'Jul', amount: 240000 },
  { month: 'Aug', amount: 225000 }, { month: 'Sep', amount: 265000 },
  { month: 'Oct', amount: 280000 }, { month: 'Nov', amount: 250000 },
];
export const fees = {
  collected: monthlyCollections.reduce((total, month) => total + month.amount, 0),
  pending: 235000,
};
export const assessedFees = fees.collected + fees.pending;
export const collectionPercent = fees.collected / assessedFees * 100;
export const todayAttendance = attendance[attendance.length - 1];
export const attendancePercent = todayAttendance.present / totalStudents * 100;
export const weeklyAttendancePercent = attendance.reduce((n, day) => n + day.present, 0) / (totalStudents * attendance.length) * 100;
export const examSchedule = [
  { title: 'Unit Test II · Primary', date: '2026-11-09' },
  { title: 'Unit Test II · Middle school', date: '2026-11-10' },
  { title: 'Term assessment · High school', date: '2026-11-16' },
  { title: 'Practical assessment · Higher secondary', date: '2026-11-23' },
];
export const upcomingEvents: SchoolEvent[] = [
  { title: 'Unit Test II', date: examSchedule[0].date, category: 'Academics', description: 'Primary school · Classes I–V', accent: 'violet' },
  { title: 'Parent–Teacher Connect', date: '2026-11-13', category: 'Community', description: 'Conversations that help learners grow', accent: 'sky' },
  { title: 'Annual Sports Day', date: '2026-11-20', category: 'Sports', description: 'A day for teamwork and school spirit', accent: 'emerald' },
  { title: 'Young Innovators Fair', date: '2026-11-27', category: 'Science', description: 'Big ideas from curious young minds', accent: 'amber' },
];
export const recentActivities: SampleActivity[] = [
  { title: 'New admission recorded', description: 'Sample student BC-1248 · Class VI', timestamp: '2026-11-04T10:40:00+05:30', time: '10:40 AM', kind: 'admission', accent: 'indigo' },
  { title: 'Attendance updated', description: 'Daily register · 1,183 present, 65 absent', timestamp: '2026-11-04T10:15:00+05:30', time: '10:15 AM', kind: 'attendance', accent: 'emerald' },
  { title: 'Fee payment recorded', description: 'Sample receipt DEMO-008 · ₹15,000; included in November total', timestamp: '2026-11-04T09:50:00+05:30', time: '9:50 AM', kind: 'payment', accent: 'sky' },
  { title: 'Exam schedule published', description: 'Four assessment sessions scheduled for November', timestamp: '2026-11-04T09:30:00+05:30', time: '9:30 AM', kind: 'exam', accent: 'violet' },
  { title: 'Teacher profile updated', description: 'Sample staff BC-T068 · Science department', timestamp: '2026-11-04T09:10:00+05:30', time: '9:10 AM', kind: 'teacher', accent: 'amber' },
];
export const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
export const formatNumber = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);
export const formatDemoDate = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'Asia/Kolkata' }).format(new Date(date + 'T12:00:00+05:30'));
export const dashboardStats: DashboardStat[] = [
  { label: 'Total students', value: formatNumber(totalStudents), detail: 'Across Classes I–XII', accent: 'indigo', icon: 'students' },
  { label: 'Total teachers', value: formatNumber(mockSchool.teachers), detail: 'Teaching team · demo roster', accent: 'violet', icon: 'teachers' },
  { label: 'Today’s attendance', value: attendancePercent.toFixed(1) + '%', detail: formatNumber(todayAttendance.present) + ' of ' + formatNumber(totalStudents) + ' present', accent: 'emerald', icon: 'attendance' },
  { label: 'Total fee collected', value: formatINR(fees.collected), detail: 'Apr–Nov 2026 · year to date', accent: 'sky', icon: 'collected' },
  { label: 'Pending fees', value: formatINR(fees.pending), detail: 'Balance of assessed fees', accent: 'amber', icon: 'pending' },
  { label: 'Upcoming exams', value: String(examSchedule.length), detail: 'Assessment sessions · November', accent: 'rose', icon: 'exams' },
];
