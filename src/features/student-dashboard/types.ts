export type StudentAccent = 'indigo' | 'sky' | 'violet' | 'amber' | 'emerald' | 'rose';
export type SubjectId = 'mathematics' | 'english' | 'science' | 'social-science' | 'computer-science';
export interface StudentSubject { id: SubjectId; name: string; shortName: string; teacher: string; accent: StudentAccent }
export interface StudentPeriod { period: number; subjectId: SubjectId; start: string; end: string; room: string; topic: string }
export interface StudentHomework { id: string; title: string; subjectId: SubjectId; assignedDate: string; dueDate: string; completedDate?: string; progress: number }
export type HomeworkFilter = 'all' | 'pending' | 'completed';
export type HomeworkStatus = 'Completed' | 'Pending' | 'Due soon' | 'Overdue';
export interface AttendanceRecord { date: string; status: 'Present' | 'Absent' }
export interface AttendanceMonth { month: string; label: string; scheduled: number; present: number; absent: number }
export interface StudentMark { subjectId: SubjectId; obtained: number; maximum: number; date: string; assessment: string }
export interface StudentExam { id: string; title: string; subjectId: SubjectId; date: string; start: string; end: string; preparation: string }
export type BadgeId = 'attendance' | 'homework' | 'science' | 'reading' | 'mathematics';
export interface StudentAchievement { id: BadgeId; title: string; description: string; requirement: string; earned: boolean; accent: StudentAccent }
export interface StudentGoal { id: string; title: string; current: number; target: number; unit: string; caption: string; accent: StudentAccent }
export interface StudentAnnouncement { id: string; title: string; category: string; date: string; description: string; icon: 'sports' | 'science' | 'exams' | 'library'; accent: StudentAccent }
export interface StudentStat { label: string; value: string; detail: string; icon: 'attendance' | 'average' | 'homework' | 'exams' | 'badges' | 'classes'; accent: StudentAccent }
export interface StudentQuickLink { title: string; description: string; target: string; icon: 'homework' | 'timetable' | 'results' | 'attendance' | 'achievements' | 'announcements'; accent: StudentAccent }
