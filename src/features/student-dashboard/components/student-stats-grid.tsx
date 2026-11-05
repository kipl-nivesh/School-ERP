import { CalendarCheck, ChartNoAxesCombined, NotebookPen, GraduationCap, Award, Clock3 } from 'lucide-react';
import { studentStats } from '../data/mock-dashboard';
import { StudentReveal } from './motion';
const icons={attendance:CalendarCheck,average:ChartNoAxesCombined,homework:NotebookPen,exams:GraduationCap,badges:Award,classes:Clock3};
export function StudentStatsGrid() {return <section className="sd-stats-grid" aria-label="Student statistics">{studentStats.map((stat,index)=>{const Icon=icons[stat.icon];return <StudentReveal key={stat.icon} index={index} hover className={'sd-stat sd-tone-'+stat.accent}><div className="sd-stat-top"><span className="sd-icon"><Icon size={20}/></span><span className="sd-stat-dot" aria-hidden="true"/></div><h2>{stat.label}</h2><strong>{stat.value}</strong><p>{stat.detail}</p></StudentReveal>;})}</section>;}
