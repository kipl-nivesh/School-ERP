import { Megaphone, GraduationCap, Bell, ArrowUpRight } from 'lucide-react';
import type { Child, Notice } from '../types';
import { schoolNotices } from '../data/mock-dashboard';
import { formatDate } from '../lib/calculations';
import { ParentSection } from './section';
function NoticeList({notices}:{notices:Notice[]}) {
  return <div className="pd-notice-list">{notices.map(n=>{const Icon=n.category==='Community'?Megaphone:n.category==='Academics'?GraduationCap:Bell;return <article key={n.id} data-notice-id={n.id}><span className={'pd-icon pd-tone-'+(n.category==='Community'?'emerald':n.category==='Academics'?'violet':'amber')}><Icon size={19}/></span><div><span className="pd-subject">{n.category} · {formatDate(n.date)}</span><h3>{n.title}</h3><p>{n.description}</p></div></article>;})}</div>;
}
export function ParentAnnouncements({child}:{child:Child}) {
  return <ParentSection id="parent-notices" title="Around our school community" description="Important dates, gentle reminders, and shared moments." badge={schoolNotices.length+child.notices.length+' notices'}><div className="pd-notice-columns"><div><h3 className="pd-list-heading"><Megaphone size={16}/>For every family</h3><NoticeList notices={schoolNotices}/></div><div><h3 className="pd-list-heading"><ArrowUpRight size={16}/>For {child.firstName} · Class {child.className}</h3>{child.notices.length?<NoticeList notices={child.notices}/>:<p className="pd-empty">No child-specific notices in this snapshot.</p>}</div></div></ParentSection>;
}
