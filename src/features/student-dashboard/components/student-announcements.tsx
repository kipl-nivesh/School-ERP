import { Trophy,FlaskConical,CalendarDays,BookOpen } from 'lucide-react';
import { studentAnnouncements } from '../data/mock-dashboard';
import { formatStudentDate } from '../lib/calculations';
import { StudentSection } from './section';
const icons={sports:Trophy,science:FlaskConical,exams:CalendarDays,library:BookOpen};
export function StudentAnnouncements() {
  return <StudentSection id="student-announcements" title="Around your school" description="School announcements · fictional dates and notices" badge="Community corner"><ul className="sd-announcement-grid">{studentAnnouncements.map(item=>{const Icon=icons[item.icon];return <li key={item.id} className={'sd-announcement sd-tone-'+item.accent}><span className="sd-icon"><Icon size={19}/></span><div><div className="sd-announcement-category"><span>{item.category}</span><time dateTime={item.date}>{formatStudentDate(item.date)}</time></div><h3>{item.title}</h3><p>{item.description}</p></div></li>;})}</ul></StudentSection>;
}
