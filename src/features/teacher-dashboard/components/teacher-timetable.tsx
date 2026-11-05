import { Check, Clock3, MapPin, Calculator, FlaskConical, Coffee } from 'lucide-react';
import { timetable, getTeacherClass, periodStatus, teacherProfile, formatTeacherTime } from '../data/mock-dashboard';
import { TeacherSection } from './section';
import { TeacherReveal } from './motion';
export function TeacherTimetable() {
  return <TeacherSection title="Find your rhythm" description="Today’s timetable · sample teaching day" badge={formatTeacherTime(teacherProfile.referenceTime) + ' IST'}>
    {timetable.length ? <ol className="td-period-list">{timetable.map((period, index) => {
      const group = getTeacherClass(period.classId);
      const status = periodStatus(period);
      const Icon = group.subject === 'Science' ? FlaskConical : Calculator;
      return <li key={period.period}><TeacherReveal index={index} className={'td-period td-tone-' + group.accent + (status === 'Current' ? ' td-period-current' : '')}><div className="td-period-number"><span>PERIOD</span><strong>{period.period}</strong></div><div className="td-period-copy"><div className="td-period-title"><Icon size={15}/><h3>{group.subject}</h3><span>{group.name} {group.section}</span></div><p>{period.topic}</p><div className="td-period-meta"><span><Clock3 size={11}/>{formatTeacherTime(period.start)} – {formatTeacherTime(period.end)}</span><span><MapPin size={11}/>{group.room === 'Science lab' ? group.room : 'Room ' + group.room}</span></div></div><span className={'td-status td-status-' + status.toLowerCase()}>{status === 'Completed' && <Check size={11}/>}<span>{status}</span></span></TeacherReveal></li>;
    })}</ol> : <div className="td-empty"><Coffee size={30}/><h3>A little room to breathe</h3><p>No teaching periods in this sample schedule.</p></div>}
    <p className="td-footnote">School period 5 is unassigned to this teacher. Status reflects the fixed demo time, not your clock.</p>
  </TeacherSection>;
}
