'use client';
import { useState } from 'react';
import { children, parentProfile, schoolNotices } from '../data/mock-dashboard';
import type { ChildId } from '../types';
import { childSummary } from '../lib/calculations';
import { ChildSwitcher } from './child-switcher';
import { ParentStatsGrid } from './parent-stats-grid';
import { ParentAttendance } from './parent-attendance';
import { ParentPerformance } from './parent-performance';
import { ParentHomework } from './parent-homework';
import { ParentFees } from './parent-fees';
import { ParentTimetable } from './parent-timetable';
import { ParentExams } from './parent-exams';
import { ParentAnnouncements } from './parent-announcements';
import { ParentProgressHighlights } from './parent-progress';
import { ParentReveal } from './motion';
export function ParentPortal() {
  const [selectedChildId,setSelectedChildId]=useState<ChildId>('aarav');
  const child=children.find(c=>c.id===selectedChildId)??children[0];
  const summary=childSummary(child,parentProfile.referenceDate,schoolNotices.length);
  return <><ChildSwitcher learners={children} selected={child} onSelect={setSelectedChildId}/><p className="pd-selection-summary" role="status" aria-live="polite">Viewing {child.name} · Class {child.className}. All learning, fee, and school-day details below belong to {child.firstName}.</p><ParentReveal key={child.id} className="pd-child-dashboard"><ParentStatsGrid child={child} summary={summary}/><div className="pd-two-columns"><ParentAttendance child={child}/><ParentPerformance child={child}/></div><div className="pd-two-columns"><ParentHomework child={child}/><ParentFees child={child}/></div><div className="pd-two-columns"><ParentTimetable child={child}/><ParentExams child={child}/></div><ParentAnnouncements child={child}/><ParentProgressHighlights child={child}/></ParentReveal></>;
}

