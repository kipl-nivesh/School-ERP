import { Clock3, GraduationCap } from 'lucide-react';
import { upcomingExams, getTeacherClass, formatTeacherDate, formatTeacherTime } from '../data/mock-dashboard';
import { TeacherSection } from './section';
export function TeacherExams() {
  return <TeacherSection title="Ready for the next milestone" description="Upcoming examinations · fictional schedule" badge={upcomingExams.length + ' assessments'}><ol className="td-exam-list">{upcomingExams.map(exam => {
    const group = getTeacherClass(exam.classId);
    return <li key={exam.classId} className={'td-exam td-tone-' + group.accent}><div className="td-exam-date"><strong>{formatTeacherDate(exam.date, {day:'2-digit'})}</strong><span>{formatTeacherDate(exam.date,{month:'short'})}</span></div><div className="td-exam-copy"><span className="td-exam-subject"><GraduationCap size={12}/>{group.subject} · {group.name} {group.section}</span><h3>{exam.title}</h3><p><Clock3 size={11}/>{formatTeacherTime(exam.start)} – {formatTeacherTime(exam.end)}</p><span className="td-status td-status-upcoming">{exam.status}</span></div><time className="sr-only" dateTime={exam.date}>{formatTeacherDate(exam.date,{day:'numeric',month:'long',year:'numeric'})}</time></li>;
  })}</ol><div className="td-exam-note"><GraduationCap size={22}/><p>A little preparation goes a long way.<br/><strong>Make space for questions and curiosity.</strong></p></div></TeacherSection>;
}
