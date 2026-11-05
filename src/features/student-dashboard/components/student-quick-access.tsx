import { NotebookPen,Clock3,GraduationCap,CalendarCheck,Award,Megaphone,ArrowUpRight } from 'lucide-react';
import { studentQuickLinks } from '../data/mock-dashboard';
import { StudentReveal } from './motion';
const icons={homework:NotebookPen,timetable:Clock3,results:GraduationCap,attendance:CalendarCheck,achievements:Award,announcements:Megaphone};
export function StudentQuickAccess() {
  return <section className="sd-quick-section" aria-labelledby="student-quick-title"><header className="sd-section-header"><div><h2 id="student-quick-title">A little closer to everything</h2><p>Quick access · jump to a part of your learning space</p></div><span className="sd-label">Explore this page</span></header><nav className="sd-quick-grid" aria-label="Student quick access">{studentQuickLinks.map(item=>{const Icon=icons[item.icon];return <StudentReveal hover key={item.target} className={'sd-quick-card sd-tone-'+item.accent}><a href={'#'+item.target}><span className="sd-icon"><Icon size={20}/></span><div><h3>{item.title}</h3><p>{item.description}</p></div><ArrowUpRight size={16}/></a></StudentReveal>;})}</nav></section>;
}
