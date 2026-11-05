import { LayoutDashboard, Users, BookOpen, CalendarDays, Wallet, ClipboardList, MessageCircle, GraduationCap, FileText } from 'lucide-react';
import type { Role } from './roles';
export const navigation = {
    admin: [{ label: 'School community', icon: Users }, { label: 'Academics', icon: BookOpen }, { label: 'Attendance', icon: CalendarDays }, { label: 'Finance', icon: Wallet }],
    teacher: [{ label: 'My classes', icon: BookOpen }, { label: 'Attendance', icon: CalendarDays }, { label: 'Assignments', icon: ClipboardList }, { label: 'Messages', icon: MessageCircle }],
    student: [{ label: 'My learning', icon: BookOpen }, { label: 'Assignments', icon: ClipboardList }, { label: 'Timetable', icon: CalendarDays }, { label: 'My results', icon: GraduationCap }],
    parent: [{ label: 'My child', icon: Users }, { label: 'Learning progress', icon: BookOpen }, { label: 'School updates', icon: MessageCircle }, { label: 'Fees', icon: Wallet }],
    accountant: [{ label: 'Fee overview', icon: Wallet }, { label: 'Payments', icon: ClipboardList }, { label: 'Financial reports', icon: FileText }, { label: 'Records', icon: Users }]
} satisfies Record<Role, {
    label: string;
    icon: typeof LayoutDashboard;
}[]>;
