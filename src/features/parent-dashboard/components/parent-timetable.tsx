import { Clock3, CheckCircle2, Circle, MapPin } from 'lucide-react';
import type { Child } from '../types';
import { periodStatus, formatTime } from '../lib/calculations';
import { parentProfile } from '../data/mock-dashboard';
import { ParentSection } from './section';
export function ParentTimetable({child}:{child:Child}) {
  return <ParentSection id="parent-timetable" title="A window into their school day" description={'Today’s timetable · '+child.firstName+' · Class '+child.className} badge="4 Nov · 10:20 AM IST"><div className="pd-timetable">{child.timetable.length?child.timetable.map(p=>{const status=periodStatus(p,parentProfile.referenceTime),Icon=status==='Completed'?CheckCircle2:status==='Current'?Clock3:Circle;return <article key={p.period} data-period={p.period} className={status==='Current'?'pd-current':''}><span className="pd-period-number">{String(p.period).padStart(2,'0')}</span><div className="pd-period-info"><h3>{p.subject}</h3><p>{p.teacher}</p><span>{formatTime(p.start)} – {formatTime(p.end)}</span><small><MapPin size={12}/>{p.room}</small></div><span className={'pd-status pd-status-'+status.toLowerCase()}><Icon size={13}/>{status}</span></article>;}):<p className="pd-empty">No sample classes for this day.</p>}</div><p className="pd-panel-note">Statuses use the fixed fictional snapshot, rather than the current time.</p></ParentSection>;
}
