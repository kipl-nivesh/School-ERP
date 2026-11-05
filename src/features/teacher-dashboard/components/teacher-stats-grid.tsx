import { BookOpen, Users, CalendarCheck, ClipboardCheck, GraduationCap, Clock3 } from 'lucide-react';
import { teacherStats } from '../data/mock-dashboard';
import { TeacherReveal } from './motion';
const icons = { classes: BookOpen, students: Users, attendance: CalendarCheck, homework: ClipboardCheck, exams: GraduationCap, periods: Clock3 };
export function TeacherStatsGrid() {
  return <section className="td-stats-grid" aria-label="Teacher statistics">{teacherStats.map((stat, index) => {
    const Icon = icons[stat.icon];
    return <TeacherReveal key={stat.icon} className={'td-stat td-tone-' + stat.accent} index={index} hover><div className="td-stat-top"><span className="td-icon"><Icon size={20}/></span><span className="td-stat-dot" aria-hidden="true"/></div><h2>{stat.label}</h2><strong>{stat.value}</strong><p>{stat.detail}</p></TeacherReveal>;
  })}</section>;
}
