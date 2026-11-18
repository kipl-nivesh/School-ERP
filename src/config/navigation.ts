import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  Wallet,
  ClipboardList,
  GraduationCap,
  FileText,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
  NotebookPen,
  UserRound,
  Bell,
  Calculator,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './roles';

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly category?: string;
}

export const navigation: Record<Role, readonly NavigationItem[]> = {
  admin: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: GraduationCap, category: 'People' },
    { id: 'staff', label: 'Staff', icon: Users, category: 'People' },
    { id: 'admissions', label: 'Admissions', icon: ClipboardList, category: 'People' },
    { id: 'classes', label: 'Classes', icon: BookOpen, category: 'Academics' },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays, category: 'Academics' },
    { id: 'timetable', label: 'Timetable', icon: CalendarCheck, category: 'Academics' },
    { id: 'homework', label: 'Homework', icon: NotebookPen, category: 'Academics' },
    { id: 'exams', label: 'Exams', icon: FileText, category: 'Academics' },
    { id: 'fees', label: 'Fees', icon: Wallet, category: 'Finance' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, category: 'Operations' },
    { id: 'reports', label: 'Reports', icon: BarChart3, category: 'Analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'Operations' },
    { id: 'audit', label: 'Audit', icon: ShieldCheck, category: 'Operations' },
  ],
  teacher: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'classes', label: 'My Classes', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays },
    { id: 'timetable', label: 'Timetable', icon: CalendarCheck },
    { id: 'homework', label: 'Homework', icon: NotebookPen },
    { id: 'exams', label: 'Exams & Marks', icon: FileText },
  ],
  student: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays },
    { id: 'timetable', label: 'Timetable', icon: CalendarCheck },
    { id: 'homework', label: 'Homework', icon: BookOpen },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'results', label: 'Results', icon: GraduationCap },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'fees', label: 'Fees', icon: Wallet },
  ],
  parent: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'children', label: 'My Children', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays },
    { id: 'progress', label: 'Learning Progress', icon: BookOpen },
    { id: 'homework', label: 'Homework', icon: ClipboardList },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'fees', label: 'Fees', icon: Wallet },
  ],
  accountant: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'ledger', label: 'Student Fee Ledger', icon: Wallet },
    { id: 'collections', label: 'Collections', icon: ClipboardList },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'structures', label: 'Fee Structures', icon: Calculator },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ],
};

export const roleModuleIds: Record<Role, readonly string[]> = {
  admin: navigation.admin.map(item => item.id),
  teacher: navigation.teacher.map(item => item.id),
  student: navigation.student.map(item => item.id),
  parent: navigation.parent.map(item => item.id),
  accountant: navigation.accountant.map(item => item.id),
};
