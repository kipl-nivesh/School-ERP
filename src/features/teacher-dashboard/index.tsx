'use client';

import {
  BookOpen,
  CalendarDays,
  CalendarCheck,
  NotebookPen,
  FileText,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { TeacherWelcomeBanner } from './components/teacher-welcome-banner';
import { TeacherStatsGrid } from './components/teacher-stats-grid';
import { TeacherTimetable } from './components/teacher-timetable';
import { TeacherClasses } from './components/teacher-classes';
import { TeacherAttendance } from './components/teacher-attendance';
import { TeacherHomework } from './components/teacher-homework';
import { TeacherExams } from './components/teacher-exams';
import { TeacherPerformance } from './components/teacher-performance';
import { TeacherAnnouncements } from './components/teacher-announcements';
import { TeacherQuickAccess } from './components/teacher-quick-access';
import { roleModuleIds } from '@/config/navigation';
import { useActiveModule, navigateToModule } from '@/lib/navigation/use-active-module';
import './teacher-dashboard.css';

export function TeacherDashboard() {
  const [activeModule] = useActiveModule(roleModuleIds.teacher, 'overview');

  return (
    <div className="teacher-demo">
      {/* OVERVIEW MODULE */}
      {activeModule === 'overview' && (
        <div id="module-overview">
          <TeacherWelcomeBanner />
          <TeacherStatsGrid />
          <TeacherQuickAccess />
          <TeacherAnnouncements />
        </div>
      )}

      {/* MY CLASSES MODULE */}
      {activeModule === 'classes' && (
        <section id="classes" aria-labelledby="classes-heading" className="td-module-view">
          <TeacherModuleHeader
            title="My Classes & Assigned Sections"
            subtitle="Classroom rosters, subject codes, and student enrollments"
            icon={BookOpen}
          />
          <TeacherClasses />
        </section>
      )}

      {/* ATTENDANCE MODULE */}
      {activeModule === 'attendance' && (
        <section id="attendance" aria-labelledby="attendance-heading" className="td-module-view">
          <TeacherModuleHeader
            title="Class Attendance Register"
            subtitle="Daily roll marking, weekly presence rates, and homeroom logs"
            icon={CalendarDays}
          />
          <TeacherAttendance />
        </section>
      )}

      {/* TIMETABLE MODULE */}
      {activeModule === 'timetable' && (
        <section id="timetable" aria-labelledby="timetable-heading" className="td-module-view">
          <TeacherModuleHeader
            title="Weekly Teaching Timetable"
            subtitle="Period times, instructional topics, and classroom allocations"
            icon={CalendarCheck}
          />
          <TeacherTimetable />
        </section>
      )}

      {/* HOMEWORK MODULE */}
      {activeModule === 'homework' && (
        <section id="homework" aria-labelledby="homework-heading" className="td-module-view">
          <TeacherModuleHeader
            title="Homework & Assignment Review"
            subtitle="Active tasks, submission tracking, and grading queue"
            icon={NotebookPen}
          />
          <TeacherHomework />
        </section>
      )}

      {/* EXAMS & MARKS MODULE */}
      {activeModule === 'exams' && (
        <section id="exams" aria-labelledby="exams-heading" className="td-module-view">
          <TeacherModuleHeader
            title="Exams & Performance Evaluation"
            subtitle="Term assessments, marks entry, and score distributions"
            icon={FileText}
          />
          <div className="td-learning-grid" style={{ marginBottom: '20px' }}>
            <TeacherExams />
            <TeacherPerformance />
          </div>
        </section>
      )}

      {/* FOOTER */}
      <p className="td-endnote">
        A little encouragement can change a whole school day. <span>All people, records, and activities shown are fictional.</span>
      </p>
    </div>
  );
}

function TeacherModuleHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="td-page-title" style={{ marginBottom: '22px' }}>
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
          <span className="eyebrow" style={{ margin: 0 }}>Teaching</span>
        </div>
        <h1 id={`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-heading`} tabIndex={-1} style={{ fontSize: '24px', letterSpacing: '-0.7px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>{subtitle}</p>
      </div>
      <div className="td-icon" style={{ width: '44px', height: '44px' }}>
        <Icon size={22} />
      </div>
    </div>
  );
}
