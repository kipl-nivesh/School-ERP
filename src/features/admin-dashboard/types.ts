export type Accent = 'indigo' | 'violet' | 'emerald' | 'sky' | 'amber' | 'rose';
export interface AttendanceDay { date: string; label: string; present: number; absent: number }
export interface MonthlyCollection { month: string; amount: number }
export interface StudentGroup { label: string; grades: string; students: number; accent: Accent }
export interface SchoolEvent { title: string; date: string; category: string; description: string; accent: Accent }
export interface SampleActivity { title: string; description: string; timestamp: string; time: string; kind: 'admission' | 'attendance' | 'payment' | 'exam' | 'teacher'; accent: Accent }
export interface DashboardStat { label: string; value: string; detail: string; accent: Accent; icon: 'students' | 'teachers' | 'attendance' | 'collected' | 'pending' | 'exams' }
