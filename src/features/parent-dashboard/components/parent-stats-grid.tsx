import { CalendarCheck, GraduationCap, ClipboardList, Wallet, CalendarClock, Megaphone } from 'lucide-react';
import type { Child } from '../types';
import { childSummary, formatINR } from '../lib/calculations';
import { ParentReveal } from './motion';
export function ParentStatsGrid({child,summary}:{child:Child;summary:ReturnType<typeof childSummary>}) {
  const stats=[
    {label:'Attendance',value:summary.attendance.percentage.toFixed(1)+'%',detail:`${summary.attendance.present} of ${summary.attendance.total} school days`,icon:CalendarCheck,tone:'emerald'},
    {label:'Academic average',value:summary.academic.percentage.toFixed(1)+'%',detail:'Term I · weighted by marks',icon:GraduationCap,tone:'indigo'},
    {label:'Pending homework',value:String(summary.pendingHomework),detail:'Assignments to explore',icon:ClipboardList,tone:'amber'},
    {label:'Pending fees',value:formatINR(summary.fees.outstanding),detail:'Total outstanding balance',icon:Wallet,tone:'rose'},
    {label:'Upcoming exams',value:String(summary.exams.length),detail:'From the demo snapshot',icon:CalendarClock,tone:'sky'},
    {label:'School notices',value:String(summary.noticeCount),detail:'School-wide + child notices',icon:Megaphone,tone:'violet'},
  ];
  return <section aria-label={'At a glance for '+child.name} className="pd-stats" data-child-id={child.id}>{stats.map(({label,value,detail,icon:Icon,tone},i)=><ParentReveal key={label} className={'pd-stat pd-tone-'+tone} index={i} hover><div><span className="pd-icon"><Icon size={19}/></span><span className="pd-stat-label">{label}</span></div><strong className="pd-stat-value">{value}</strong><p>{detail}</p></ParentReveal>)}</section>;
}
