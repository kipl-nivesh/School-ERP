import { Clock3,MapPin,Check } from 'lucide-react';
import { studentTimetable,studentProfile,studentSubjects } from '../data/mock-dashboard';
import { getStudentSubject,studentPeriodStatus,formatStudentTime } from '../lib/calculations';
import { StudentSection } from './section';
import { StudentReveal } from './motion';
import { SubjectIcon } from './subject-icon';
export function StudentTimetable() {
  return <StudentSection id="student-timetable" title="Your day, one discovery at a time" description="Today’s timetable · fictional school day" badge={formatStudentTime(studentProfile.referenceTime)+' IST'}><ol className="sd-period-list">{studentTimetable.map((period,index)=>{const subject=getStudentSubject(period.subjectId,studentSubjects);const status=studentPeriodStatus(period,studentProfile.referenceTime);return <li key={period.period}><StudentReveal index={index} className={'sd-period sd-tone-'+subject.accent+(status==='Current'?' sd-period-current':'')}><div className="sd-period-number"><span>PERIOD</span><strong>{period.period}</strong></div><div className="sd-period-copy"><div className="sd-period-title"><SubjectIcon subjectId={subject.id} size={16}/><h3>{subject.name}</h3></div><p>{subject.teacher} · {period.topic}</p><div className="sd-period-meta"><span><Clock3 size={11}/>{formatStudentTime(period.start)} – {formatStudentTime(period.end)}</span><span><MapPin size={11}/>{period.room.includes('lab')?period.room:'Room '+period.room}</span></div></div><span className={'sd-status sd-status-'+status.toLowerCase()}>{status==='Completed'&&<Check size={11}/ >}{status}</span></StudentReveal></li>;})}</ol><p className="sd-footnote">Statuses reflect the fixed demo time of {formatStudentTime(studentProfile.referenceTime)}, not your clock.</p></StudentSection>;
}
