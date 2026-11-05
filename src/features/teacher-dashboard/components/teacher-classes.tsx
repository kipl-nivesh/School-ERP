import { Calculator, FlaskConical, Users, ArrowUpRight } from 'lucide-react';
import { assignedClasses } from '../data/mock-dashboard';
import { TeacherSection } from './section';
import { TeacherReveal } from './motion';
export function TeacherClasses() {
  return <TeacherSection title="Your classroom communities" description="My classes · a place for every learner" badge={assignedClasses.length + ' classes'}><div className="td-class-list">{assignedClasses.map(group => {
    const Icon = group.subject === 'Science' ? FlaskConical : Calculator;
    return <TeacherReveal className={'td-class-card td-tone-' + group.accent} key={group.id} hover><div className="td-class-top"><span className="td-icon"><Icon size={21}/></span><span className="td-class-section">SECTION {group.section}</span></div><h3>{group.name} <span>{group.section}</span></h3><p>{group.subject}</p><div className="td-class-bottom"><span><Users size={13}/>{group.students} students</span><strong>{(group.present / group.students * 100).toFixed(1)}% present</strong></div><span className="td-class-note">{group.present} present · {group.students - group.present} absent <ArrowUpRight size={13} aria-hidden="true"/></span></TeacherReveal>;
  })}</div></TeacherSection>;
}
