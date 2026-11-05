'use client';
import { useState } from 'react';
import { AnimatePresence,motion,useReducedMotion } from 'motion/react';
import { CheckCircle2,LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentAchievement } from '../types';
import { StudentSection } from './section';
import { BadgeArtwork } from './badge-artwork';
const filters=[{id:'all',label:'All'},{id:'earned',label:'Earned'},{id:'locked',label:'Locked'}] as const;
export function StudentAchievements({badges}:{badges:StudentAchievement[]}) {
  const [filter,setFilter]=useState<'all'|'earned'|'locked'>('all');
  const reduced=useReducedMotion();
  const earned=badges.filter(badge=>badge.earned).length;
  const shown=badges.filter(badge=>filter==='all'||(filter==='earned'?badge.earned:!badge.earned));
  return <StudentSection id="student-achievements" title="Little milestones. Big smiles." description="Achievement badges · a gentle celebration of effort" badge={earned+' earned'}><div className="sd-badges-toolbar"><p>Your journey is yours. Keep exploring at your own pace.</p><div className="sd-filter" role="group" aria-label="Achievement state filter">{filters.map(item=><Button key={item.id} variant="ghost" aria-pressed={filter===item.id} aria-controls="student-badge-results" onClick={()=>setFilter(item.id)}>{item.label}</Button>)}</div></div><p className="sd-filter-summary" role="status" aria-live="polite">Showing {shown.length} of {badges.length} demo badges · {earned} earned, {badges.length-earned} locked</p><div className="sd-badge-grid" id="student-badge-results"><AnimatePresence initial={false}>{shown.map(badge=><motion.article key={badge.id} data-badge-id={badge.id} className={'sd-badge-card sd-tone-'+badge.accent+(!badge.earned?' sd-badge-locked':'')} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} whileHover={!reduced?{y:-3}:undefined} transition={{duration:reduced?0:0.2}}><BadgeArtwork id={badge.id}/><h3>{badge.title}</h3><p>{badge.description}</p><span className="sd-badge-state">{badge.earned?<CheckCircle2 size={13}/>:<LockKeyhole size={13}/ >}{badge.earned?'Earned':'Locked'}</span><small>{badge.requirement}</small></motion.article>)}</AnimatePresence></div><p className="sd-footnote">Demo milestones. Keep learning at a pace that feels right for you.</p></StudentSection>;
}

