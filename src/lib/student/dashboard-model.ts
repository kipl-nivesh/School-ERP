export type StudentPanel<T> = { kind: 'ready'; data: T } | { kind: 'unavailable' };
export type StudentProfile = { displayName: string; registration: string; schoolName: string; status: 'active' };
export type StudentPlacement = { classroom: string; section: string; academicYear: string };
export type StudentAttendance = { present: number; absent: number; late: number; excused: number; history?: { date: string; status: string }[] };
export type StudentPeriod = { day?: string; subject: string; start: string; end: string; room: string };
export type StudentHomework = { title: string; subject: string; due: string; description?: string };
export type StudentExam = { title: string; subject: string; date: string; start?: string; end?: string; venue?: string };
export type StudentResult = StudentExam & { score: number; maximum: number; passed?: boolean };
export type StudentAnnouncement = { title: string; content: string };
export type StudentFees = {
  invoices: { number: string; title: string; due: string; amountPaise: number; paidPaise: number }[];
  receipts: { id?: string; number: string; date: string; amountPaise: number }[];
  paymentHistory?: { number: string; date: string; amountPaise: number; status: string }[];
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
  materials?: StudentPanel<{ id: string; title: string; kind: string }[]>;
};
export type StudentDashboardResult = { kind: 'ready'; data: StudentDashboardData } | { kind: 'unavailable' };
