import { CalendarCheck, BookOpen, ClipboardPlus, PencilLine, Clock3, ChartNoAxesCombined, ArrowUpRight } from 'lucide-react';
import { quickAccess } from '../data/mock-dashboard';
import { TeacherReveal } from './motion';
const icons = { attendance: CalendarCheck, classes: BookOpen, homework: ClipboardPlus, marks: PencilLine, periods: Clock3, progress: ChartNoAxesCombined };
export function TeacherQuickAccess() {
  return <section className="td-quick-section"><header className="td-section-header"><div><h2>A little closer to everything</h2><p>Quick access · teaching tools planned for future steps</p></div><span className="td-label">Coming soon</span></header><div className="td-quick-grid">{quickAccess.map(item=>{const Icon=icons[item.icon];return <TeacherReveal hover key={item.label} className={'td-quick-card td-tone-'+item.accent}><span className="td-icon"><Icon size={20}/></span><div><h3>{item.label}</h3><p>{item.description}</p><span>Coming soon</span></div><ArrowUpRight size={14} aria-hidden="true"/></TeacherReveal>;})}</div></section>;
}
