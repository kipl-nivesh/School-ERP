'use client';

import { useState } from 'react';
import {
  Users,
  CalendarDays,
  GraduationCap,
  ClipboardList,
  FileText,
  Bell,
  Wallet,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
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
import { ParentQuickAccess } from './parent-quick-access';
import { ParentReveal } from './motion';
import { navigateToModule } from '@/lib/navigation/use-active-module';
import type { ParentSessionData } from '../types';

export function ParentPortal({
  activeModule = 'overview',
  sessionData
}: {
  activeModule?: string;
  sessionData?: ParentSessionData | null;
}) {
  const learners = sessionData ? [
    {
      id: 'student_a1',
      name: `${sessionData.student.name} (${sessionData.student.registrationNumber})`,
      firstName: sessionData.student.name,
      initials: 'S1',
      className: sessionData.student.className,
      rollNumber: '01',
      teacher: 'Teacher A (Senior Teacher)',
      tone: 'indigo' as const,
      attendance: [],
      marks: [],
      homework: [],
      installments: [],
      payments: [],
      timetable: [],
      exams: [],
      notices: [],
      reading: [],
      readingTarget: 0,
    }
  ] : children;

  const [selectedChildId, setSelectedChildId] = useState<ChildId>(sessionData ? 'student_a1' : 'aarav');
  const child = learners.find(c => c.id === selectedChildId) ?? learners[0];
  const schoolNoticeCount = sessionData ? 0 : schoolNotices.length;
  const summary = childSummary(child, parentProfile.referenceDate, schoolNoticeCount);

  return (
    <>
      {/* OVERVIEW MODULE */}
      {activeModule === 'overview' && (
        <div id="module-overview">
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <p className="pd-selection-summary" role="status" aria-live="polite">
            Viewing {child.name} · Class {child.className}. Key highlights below belong to {child.firstName}.
          </p>
          <ParentReveal key={child.id} className="pd-child-dashboard">
            <ParentStatsGrid child={child} summary={summary} />
            <ParentQuickAccess />
          </ParentReveal>
        </div>
      )}

      {/* MY CHILDREN MODULE */}
      {activeModule === 'children' && (
        <section id="children" aria-labelledby="children-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="children"
            title="My Children"
            subtitle="Linked student profiles and school enrollments"
            icon={Users}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            {learners.map(c => {
              const isSelected = c.id === child.id;
              const cSum = childSummary(c, parentProfile.referenceDate, schoolNotices.length);
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: 'var(--card)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{c.name}</h3>
                      <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Class {c.className} · {sessionData ? sessionData.schoolName : 'Brightcamp School'}</p>
                    </div>
                    {isSelected && (
                      <span className="pd-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>Active View</span>
                    )}
                  </div>
                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', fontSize: '11px' }}>
                    <div><dt style={{ color: 'var(--muted-foreground)' }}>Student ID</dt><dd style={{ fontWeight: 600 }}>{sessionData ? sessionData.student.registrationNumber : `BC-${c.id.toUpperCase()}-2026`}</dd></div>
                    <div><dt style={{ color: 'var(--muted-foreground)' }}>Roll No</dt><dd style={{ fontWeight: 600 }}>{c.rollNumber}</dd></div>
                    <div><dt style={{ color: 'var(--muted-foreground)' }}>Class Teacher</dt><dd style={{ fontWeight: 600 }}>{c.teacher}</dd></div>
                    <div><dt style={{ color: 'var(--muted-foreground)' }}>Attendance</dt><dd style={{ fontWeight: 600, color: 'var(--ad-green-ink)' }}>{cSum.attendance.percentage}%</dd></div>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ATTENDANCE MODULE */}
      {activeModule === 'attendance' && (
        <section id="attendance" aria-labelledby="attendance-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="attendance"
            title="Attendance Record"
            subtitle={`Daily school attendance register for ${child.firstName}`}
            icon={CalendarDays}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ marginTop: '16px' }}>
            <ParentReveal key={child.id} className="pd-child-dashboard">
              <ParentAttendance child={child} />
            </ParentReveal>
          </div>
        </section>
      )}

      {/* LEARNING PROGRESS MODULE */}
      {activeModule === 'progress' && (
        <section id="progress" aria-labelledby="progress-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="progress"
            title="Learning Progress & Milestones"
            subtitle={`Subject-wise mastery, academic scores, and milestones for ${child.firstName}`}
            icon={GraduationCap}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ marginTop: '16px' }}>
            <ParentReveal key={child.id} className="pd-child-dashboard">
              <ParentProgressHighlights child={child} />
              <div style={{ marginTop: '20px' }}>
                <ParentPerformance child={child} />
              </div>
            </ParentReveal>
          </div>
        </section>
      )}

      {/* HOMEWORK MODULE */}
      {activeModule === 'homework' && (
        <section id="homework" aria-labelledby="homework-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="homework"
            title="Homework & Active Tasks"
            subtitle={`Curriculum assignments and turn-in status for ${child.firstName}`}
            icon={ClipboardList}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ marginTop: '16px' }}>
            <ParentReveal key={child.id} className="pd-child-dashboard">
              <ParentHomework child={child} />
            </ParentReveal>
          </div>
        </section>
      )}

      {/* EXAMS MODULE */}
      {activeModule === 'exams' && (
        <section id="exams" aria-labelledby="exams-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="exams"
            title="Examinations & Daily Schedule"
            subtitle={`Assessment calendar and timetable for ${child.firstName}`}
            icon={FileText}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ marginTop: '16px' }}>
            <ParentReveal key={child.id} className="pd-child-dashboard">
              <div className="pd-two-columns">
                <ParentExams child={child} />
                <ParentTimetable child={child} />
              </div>
            </ParentReveal>
          </div>
        </section>
      )}

      {/* NOTICES MODULE */}
      {activeModule === 'notices' && (
        <section id="notices" aria-labelledby="notices-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="notices"
            title="School Notices & Parent Circulars"
            subtitle="Campus broadcasts, event invitations, and PTM notices"
            icon={Bell}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ marginTop: '16px' }}>
            <ParentReveal key={child.id} className="pd-child-dashboard">
              <ParentAnnouncements child={child} />
            </ParentReveal>
          </div>
        </section>
      )}

      {/* FEES MODULE */}
      {activeModule === 'fees' && (
        <section id="fees" aria-labelledby="fees-heading" className="pd-module-view">
          <ParentModuleHeader
            moduleId="fees"
            title="Fees & Receipts Overview"
            subtitle={`Term fee dues and settled receipts for ${child.firstName}`}
            icon={Wallet}
          />
          <ChildSwitcher learners={learners} selected={child} onSelect={setSelectedChildId} />
          <div style={{ marginTop: '16px' }}>
            <ParentReveal key={child.id} className="pd-child-dashboard">
              <ParentFees child={child} />
            </ParentReveal>
          </div>
        </section>
      )}
    </>
  );
}

function ParentModuleHeader({ moduleId, title, subtitle, icon: Icon }: { moduleId?: string; title: string; subtitle: string; icon: LucideIcon }) {
  const headingId = moduleId ? `${moduleId}-heading` : `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-heading`;
  return (
    <div className="pd-page-title" style={{ marginBottom: '22px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <button
            onClick={() => navigateToModule('overview')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 0, background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: 0 }}
            aria-label="Back to overview"
          >
            <ArrowLeft size={14} /> Overview
          </button>
          <span style={{ color: 'var(--muted-foreground)' }}>/</span>
          <span className="eyebrow" style={{ margin: 0 }}>Parent</span>
        </div>
        <h1 id={headingId} tabIndex={-1} style={{ fontSize: '24px', letterSpacing: '-0.7px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>{subtitle}</p>
      </div>
      <div className="pd-icon" style={{ width: '44px', height: '44px' }}>
        <Icon size={22} />
      </div>
    </div>
  );
}
