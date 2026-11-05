export type TeacherAccent = 'indigo' | 'sky' | 'violet' | 'emerald' | 'amber' | 'rose';
export type ClassId = '8A' | '9B' | '10A';
export interface TeacherClass { id: ClassId; name: string; section: string; subject: 'Mathematics' | 'Science'; students: number; present: number; room: string; accent: TeacherAccent }
export interface TeacherPeriod { period: number; classId: ClassId; start: string; end: string; topic: string }
export interface AttendanceDay { date: string; label: string; present: number; absent: number }
export interface HomeworkAssignment { id: string; title: string; classId: ClassId; dueDate: string; submitted: number; reviewed: number }
export interface TeacherExam { title: string; classId: ClassId; date: string; start: string; end: string; status: 'Scheduled' }
export interface ScoreGroup { score: number; count: number }
export interface ClassPerformance { classId: ClassId; scores: ScoreGroup[] }
export interface TeacherUpdate { title: string; description: string; date: string; category: string; accent: TeacherAccent; icon: 'notice' | 'calendar' | 'book' }
export interface TeacherActivity { title: string; description: string; timestamp: string; time: string; accent: TeacherAccent }
export interface TeacherStat { label: string; value: string; detail: string; accent: TeacherAccent; icon: 'classes' | 'students' | 'attendance' | 'homework' | 'exams' | 'periods' }
