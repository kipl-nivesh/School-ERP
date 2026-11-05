import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Circle, Clock3, CircleAlert, BookOpen } from 'lucide-react';
import type { Child, HomeworkFilter } from '../types';
import { filterHomework, homeworkStatus, formatDate } from '../lib/calculations';
import { parentProfile } from '../data/mock-dashboard';
import { ParentSection } from './section';
export function ParentHomework({child}:{child:Child}) {
  const [filter,setFilter]=useState<HomeworkFilter>('pending');
  const reduced=useReducedMotion(),shown=filterHomework(child.homework,filter);
  const counts={all:child.homework.length,pending:filterHomework(child.homework,'pending').length,completed:filterHomework(child.homework,'completed').length};
  return <ParentSection id="parent-homework" title="Small tasks. Growing confidence." description={'Homework overview · '+child.firstName} badge="View only"><div className="pd-filters" role="group" aria-label="Homework status filter">{(['all','pending','completed'] as const).map(f=><button type="button" key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f[0].toUpperCase()+f.slice(1)}<span>{counts[f]}</span></button>)}</div><p className="pd-view-summary" role="status">{shown.length} {filter==='all'?'total':filter} {shown.length===1?'assignment':'assignments'} for {child.firstName}</p><motion.div key={filter} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:reduced?0:.16}} className="pd-homework-list">{shown.length?shown.map(item=>{const status=homeworkStatus(item,parentProfile.referenceDate), Icon=status==='Completed'?CheckCircle2:status==='Overdue'?CircleAlert:status==='Due soon'?Clock3:Circle;return <article key={item.id} data-homework-id={item.id} className="pd-homework-item"><div><span className="pd-subject">{item.subject}</span><h3>{item.title}</h3><p>{item.teacher} · Due {formatDate(item.dueDate)}</p></div><span className={'pd-status pd-status-'+status.toLowerCase().replace(' ','-')}><Icon size={13}/>{status}</span>{item.completedDate&&<small>Sample completion · {formatDate(item.completedDate)}</small>}</article>;}):<div className="pd-empty"><BookOpen size={27}/><h3>No completed assignments yet</h3><p>{child.firstName}’s tasks are still in progress. Choose Pending or All to see what’s next.</p></div>}</motion.div><p className="pd-panel-note">Fictional teacher-reported status. Submissions are unavailable in this preview.</p></ParentSection>;
}
