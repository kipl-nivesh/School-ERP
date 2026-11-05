import { CalendarDays } from 'lucide-react';
import type { Child } from '../types';
import { daysBetween, formatDate, formatTime } from '../lib/calculations';
import { parentProfile } from '../data/mock-dashboard';
import { ParentSection } from './section';
export function ParentExams({child}:{child:Child}) {
  const exams=child.exams.filter(e=>e.date>=parentProfile.referenceDate);
  return <ParentSection id="parent-exams" title="The next learning milestones" description={'Upcoming exams · '+child.firstName+' · Class '+child.className} badge="A little preparation helps"><div className="pd-exam-list">{exams.length?exams.map((e,i)=><article key={e.id} data-exam-id={e.id} className={'pd-tone-'+['indigo','sky','violet'][i%3]}><div className="pd-exam-date"><CalendarDays size={19}/><strong>{formatDate(e.date)}</strong></div><div><span className="pd-subject">{e.title} · Class {child.className}</span><h3>{e.subject}</h3><p>{formatTime(e.start)} – {formatTime(e.end)} IST</p></div><span className="pd-days">{daysBetween(parentProfile.referenceDate,e.date)}<small>days to go</small></span></article>):<p className="pd-empty">No upcoming sample examinations.</p>}</div><div className="pd-encouragement"><span>Room for a calm routine.</span><p>A short recap together can make the next school day feel a little more familiar.</p></div><p className="pd-panel-note">Calendar-day countdowns from 4 Nov 2026. Dates are fictional.</p></ParentSection>;
}
