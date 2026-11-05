import { Users, BookOpen, CalendarCheck, Wallet, Clock3, ClipboardList } from 'lucide-react';
import { dashboardStats } from '../data/mock-dashboard';
import { Reveal } from './motion';
const icons = { students: Users, teachers: BookOpen, attendance: CalendarCheck, collected: Wallet, pending: Clock3, exams: ClipboardList };
export function AdminStatsGrid() {
  return <section aria-label="School statistics" className="ad-stats-grid">{dashboardStats.map((stat, index) => { const Icon = icons[stat.icon]; return <Reveal key={stat.icon} index={index} hover className={'ad-stat ad-tone-' + stat.accent}><div className="ad-stat-top"><span className="ad-icon"><Icon size={20}/></span><span className="ad-stat-dot" aria-hidden="true"/></div><h2>{stat.label}</h2><strong className="ad-stat-value">{stat.value}</strong><p>{stat.detail}</p></Reveal>; })}</section>;
}
