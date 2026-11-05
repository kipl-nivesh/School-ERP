import { BookOpen, ClipboardCheck, HeartHandshake } from 'lucide-react';
import type { Child } from '../types';
import { filterHomework, percentage } from '../lib/calculations';
import { ParentSection } from './section';
import { ParentProgress } from './motion';
export function ParentProgressHighlights({child}:{child:Child}) {
  const completed=filterHomework(child.homework,'completed').length;
  const goals=[{id:'homework',title:'Thoughtful effort',detail:'assignments completed',value:completed,total:child.homework.length,icon:ClipboardCheck,tone:'indigo'},{id:'reading',title:'A story at a time',detail:'chapters explored',value:child.reading.length,total:child.readingTarget,icon:BookOpen,tone:'violet'}];
  return <ParentSection id="parent-progress" title="Celebrate the little steps" description={child.firstName+'’s progress highlights · encouragement over comparison'} badge="Growing at their own pace"><div className="pd-goals">{goals.map(({id,title,detail,value,total,icon:Icon,tone})=><article key={id} className={'pd-tone-'+tone}><span className="pd-icon"><Icon size={21}/></span><div><h3>{title}</h3><p>{value}/{total} {detail}</p><div className="pd-progress" role="progressbar" aria-label={child.firstName+' '+detail} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}><ParentProgress value={percentage(value,total)}/></div></div></article>)}<article className="pd-family-note pd-tone-emerald"><HeartHandshake size={28}/><div><h3>A few minutes, together.</h3><p>{child.firstName} {child.reading.length>=child.readingTarget?'has reached this demo reading goal. Ask about a favourite chapter.':'is exploring new stories. Ask what surprised them on the page today.'}</p></div></article></div></ParentSection>;
}
