export type ChildId = 'aarav' | 'ananya';
export type Tone = 'indigo' | 'sky' | 'emerald' | 'violet' | 'amber' | 'rose';
export interface ChildRecord { childId: ChildId }
export interface Attendance extends ChildRecord { date: string; status: 'Present' | 'Absent' | 'Leave' }
export interface Mark extends ChildRecord { id: string; subject: string; obtained: number; maximum: number; date: string }
export interface Homework extends ChildRecord { id: string; title: string; subject: string; teacher: string; dueDate: string; completedDate?: string }
export type HomeworkFilter = 'all' | 'pending' | 'completed';
export interface Installment extends ChildRecord { id: string; title: string; amount: number; dueDate: string }
export interface Payment extends ChildRecord { id: string; installmentId: string; amount: number; date: string; method: string }
export interface Period extends ChildRecord { period: number; subject: string; teacher: string; start: string; end: string; room: string }
export interface Exam extends ChildRecord { id: string; title: string; subject: string; date: string; start: string; end: string }
export interface Notice { id: string; title: string; date: string; category: 'Community' | 'Academics' | 'Reminder'; description: string }
export interface ChildNotice extends Notice, ChildRecord {}
export interface Reading extends ChildRecord { id: string; title: string; date: string }
export interface Child {
  id: ChildId; name: string; firstName: string; initials: string; className: string; rollNumber: string;
  teacher: string; tone: Tone; attendance: Attendance[]; marks: Mark[]; homework: Homework[];
  installments: Installment[]; payments: Payment[]; timetable: Period[]; exams: Exam[];
  notices: ChildNotice[]; reading: Reading[]; readingTarget: number;
}
