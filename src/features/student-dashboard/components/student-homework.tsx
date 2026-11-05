'use client';
import { useState } from 'react';
import { AnimatePresence,motion,useReducedMotion } from 'motion/react';
import { CheckCircle2,BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentHomework as Homework,StudentSubject,HomeworkFilter } from '../types';
import { filterStudentHomework,summarizeHomework,homeworkStatus,getStudentSubject,formatStudentDate } from '../lib/calculations';
import { StudentSection } from './section';
import { SubjectIcon } from './subject-icon';
import { StudentProgress } from './motion';
const filters=[{id:'all',label:'All'},{id:'pending',label:'Pending'},{id:'completed',label:'Completed'}] as const;
export function StudentHomework({assignments,subjects,referenceDate}:{assignments:Homework[];subjects:StudentSubject[];referenceDate:string}) {
  const [filter,setFilter]=useState<HomeworkFilter>('pending');
  const reduced=useReducedMotion();
  const summary=summarizeHomework(assignments);
  const shown=filterStudentHomework(assignments,filter);
  return <StudentSection id="student-homework" title="A little practice, a little progress" description="Your homework tracker · read-only demo assignments" badge={summary.pending+' to finish'}><div className="sd-filter" role="group" aria-label="Homework status filter">{filters.map(item=><Button key={item.id} variant="ghost" onClick={()=>setFilter(item.id)} aria-pressed={filter===item.id} aria-controls="student-homework-results">{item.label}</Button>)}</div><p className="sd-filter-summary" role="status" aria-live="polite">Showing {shown.length} of {summary.total} assignments · {summary.completed} completed overall</p><div id="student-homework-results" className="sd-homework-results"><AnimatePresence initial={false}>{shown.map(item=>{const subject=getStudentSubject(item.subjectId,subjects);const status=homeworkStatus(item,referenceDate);return <motion.article key={item.id} data-homework-id={item.id} className={'sd-homework-card sd-tone-'+subject.accent} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:0.16}}><div className="sd-homework-top"><span className="sd-icon"><SubjectIcon subjectId={subject.id}/></span><div><h3>{item.title}</h3><p>{subject.name} · {subject.teacher}</p></div><span className={'sd-status sd-status-'+status.toLowerCase().replace(' ','-')}>{status==='Completed'&&<CheckCircle2 size={11}/ >}{status}</span></div><div className="sd-homework-dates"><span>Assigned {formatStudentDate(item.assignedDate)}</span><span>Due {formatStudentDate(item.dueDate)}</span></div><div className="sd-progress-caption"><span>Sample progress</span><strong>{item.progress}%</strong></div><div className="sd-progress" role="progressbar" aria-label={item.title+' sample progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}><StudentProgress value={item.progress}/></div>{item.completedDate&&<p className="sd-completed-note"><CheckCircle2 size={12}/>Completed {formatStudentDate(item.completedDate)} · sample record</p>}</motion.article>;})}</AnimatePresence>{!shown.length&&<div className="sd-empty-state"><BookOpen size={26}/><h3>A little breathing room</h3><p>No assignments in this view.</p></div>}</div><p className="sd-footnote">Explore the filters. This preview does not submit or save homework.</p></StudentSection>;
}
