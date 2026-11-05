import { ClipboardCheck, Calculator, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { homework, homeworkTotals, getTeacherClass, teacherProfile, formatTeacherDate } from '../data/mock-dashboard';
import { TeacherSection } from './section';
import { HomeworkProgress } from './motion';
export function TeacherHomework() {
  return <TeacherSection title="A little practice. A lot of progress." description="Homework overview · sample assignments" badge={homeworkTotals.pending + ' awaiting review'}><div className="td-homework-list">{homework.map(assignment => {
    const group = getTeacherClass(assignment.classId);
    const pending = assignment.submitted - assignment.reviewed;
    const overdue = assignment.dueDate < teacherProfile.referenceDate && assignment.submitted < group.students;
    const Icon = group.subject === 'Science' ? FlaskConical : Calculator;
    return <article key={assignment.id} className={'td-homework td-tone-' + group.accent}><div className="td-homework-top"><span className="td-icon"><Icon size={19}/></span><div><h3>{assignment.title}</h3><p>{group.subject} · {group.name} {group.section}</p></div><span className={'td-status ' + (overdue ? 'td-status-overdue' : 'td-status-upcoming')}>{overdue ? 'Overdue' : 'Collecting'}</span></div><div className="td-homework-counts"><span><strong>{assignment.submitted}/{group.students}</strong> submitted</span><span>Due {formatTeacherDate(assignment.dueDate)}</span></div><div className="td-progress td-progress-submission" role="progressbar" aria-label={assignment.title + ' submissions'} aria-valuenow={assignment.submitted} aria-valuemin={0} aria-valuemax={group.students}><HomeworkProgress percent={assignment.submitted / group.students * 100}/></div><div className="td-homework-bottom"><span><ClipboardCheck size={13}/>{assignment.reviewed} reviewed · <strong>{pending} pending review</strong><small>{group.students - assignment.submitted} not submitted</small></span><Button variant="outline" disabled aria-label={'Review ' + assignment.title + ' — coming soon'}>Review · soon</Button></div></article>;
  })}</div></TeacherSection>;
}
