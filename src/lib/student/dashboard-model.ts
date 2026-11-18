export type StudentPanel<T> = { kind: 'ready'; data: T } | { kind: 'unavailable' };
export type StudentProfile = { displayName: string; registration: string; schoolName: string; status: 'active' };
export type StudentPlacement = { classroom: string; section: string; academicYear: string };
export type StudentAttendance = { present: number; absent: number; late: number; excused: number };
export type StudentPeriod = { subject: string; start: string; end: string; room: string };
export type StudentHomework = { title: string; subject: string; due: string };
export type StudentExam = { title: string; subject: string; date: string };
export type StudentResult = StudentExam & { score: number; maximum: number };
export type StudentAnnouncement = { title: string; content: string };
export type StudentFees = {
  invoices: { number: string; title: string; due: string; amountPaise: number; paidPaise: number }[];
  receipts: { number: string; date: string; amountPaise: number }[];
};
export type StudentDashboardData = {
  profile: StudentProfile;
  placement: { kind: 'current'; data: StudentPlacement } | { kind: 'none' | 'ambiguous' | 'unavailable' };
  databaseDate: string;
  attendance: StudentPanel<StudentAttendance>;
  timetable: StudentPanel<StudentPeriod[]>;
  homework: StudentPanel<StudentHomework[]>;
  exams: StudentPanel<StudentExam[]>;
  results: StudentPanel<StudentResult[]>;
  announcements: StudentPanel<StudentAnnouncement[]>;
  fees: StudentPanel<StudentFees>;
};
export type StudentDashboardResult = { kind: 'ready'; data: StudentDashboardData } | { kind: 'unavailable' };
