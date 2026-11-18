'use client';

import {
  UserRound,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  FileText,
  GraduationCap,
  Bell,
  Wallet,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { StudentWelcomeBanner } from './components/student-welcome-banner';
import { StudentStatsGrid } from './components/student-stats-grid';
import { StudentTimetable } from './components/student-timetable';
import { StudentHomework } from './components/student-homework';
import { StudentAttendance } from './components/student-attendance';
import { StudentPerformance } from './components/student-performance';
import { StudentExams } from './components/student-exams';
import { StudentAchievements } from './components/student-achievements';
import { StudentLearningProgress } from './components/student-learning-progress';
import { StudentAnnouncements } from './components/student-announcements';
import { StudentQuickAccess } from './components/student-quick-access';
import {
  studentHomework,
  studentSubjects,
  studentProfile,
  studentMarks,
  studentAchievements,
} from './data/mock-dashboard';
import { roleModuleIds } from '@/config/navigation';
import { useActiveModule, navigateToModule } from '@/lib/navigation/use-active-module';
import './student-dashboard.css';

export function StudentDashboard() {
  const [activeModule] = useActiveModule(roleModuleIds.student, 'overview');

  return (
    <div className="student-demo">
      {/* OVERVIEW MODULE */}
      {activeModule === 'overview' && (
        <div id="module-overview">
          <StudentWelcomeBanner />
          <StudentStatsGrid />
          <StudentQuickAccess />
          <StudentAnnouncements />
        </div>
      )}

      {/* PROFILE MODULE */}
      {activeModule === 'profile' && (
        <section id="profile" aria-labelledby="profile-heading" className="sd-module-view">
          <StudentModuleHeader
            title="Student Profile & Enrollment"
            subtitle={`${studentProfile.firstName} · ${studentProfile.className} ${studentProfile.section}`}
            icon={UserRound}
          />
          <div className="sd-panel">
            <header className="sd-section-header">
              <div>
                <h2>Academic Enrollment Details</h2>
                <p>Official registration records for {studentProfile.academicYear}</p>
              </div>
              <span className="sd-label">Active Enrollment</span>
            </header>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '12px' }}>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Full Name</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>{studentProfile.firstName} Sharma</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Student ID</dt><dd style={{ fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>BC-STU-2026-0814</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Class & Section</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>{studentProfile.className} · {studentProfile.section}</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Roll Number</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>08</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Homeroom Teacher</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>Ms Aanya Rao</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Academic Year</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>{studentProfile.academicYear}</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Guardian</dt><dd style={{ fontWeight: 700, marginTop: '4px' }}>Rajesh Sharma (Father)</dd></div>
              <div><dt style={{ color: 'var(--muted-foreground)', fontSize: '10px' }}>Access Status</dt><dd style={{ fontWeight: 700, marginTop: '4px', color: 'var(--ad-green-ink)' }}>Active Student Account</dd></div>
            </dl>
          </div>
        </section>
      )}

      {/* ATTENDANCE MODULE */}
      {activeModule === 'attendance' && (
        <section id="attendance" aria-labelledby="attendance-heading" className="sd-module-view">
          <StudentModuleHeader
            title="Attendance Record"
            subtitle="Daily school attendance, monthly breakdown, and overall percentage"
            icon={CalendarDays}
          />
          <StudentAttendance />
        </section>
      )}

      {/* TIMETABLE MODULE */}
      {activeModule === 'timetable' && (
        <section id="timetable" aria-labelledby="timetable-heading" className="sd-module-view">
          <StudentModuleHeader
            title="School Day Timetable"
            subtitle="Today’s classes, classroom locations, and subject teachers"
            icon={CalendarCheck}
          />
          <StudentTimetable />
        </section>
      )}

      {/* HOMEWORK MODULE */}
      {activeModule === 'homework' && (
        <section id="homework" aria-labelledby="homework-heading" className="sd-module-view">
          <StudentModuleHeader
            title="My Homework & Assignments"
            subtitle="Open learning tasks, progress tracking, and submission deadlines"
            icon={BookOpen}
          />
          <StudentHomework
            assignments={studentHomework}
            subjects={studentSubjects}
            referenceDate={studentProfile.referenceDate}
          />
        </section>
      )}

      {/* EXAMS MODULE */}
      {activeModule === 'exams' && (
        <section id="exams" aria-labelledby="exams-heading" className="sd-module-view">
          <StudentModuleHeader
            title="Upcoming Examinations"
            subtitle="Test dates, assessment sessions, and syllabus preparation"
            icon={FileText}
          />
          <StudentExams />
        </section>
      )}

      {/* RESULTS MODULE */}
      {activeModule === 'results' && (
        <section id="results" aria-labelledby="results-heading" className="sd-module-view">
          <StudentModuleHeader
            title="Academic Results & Achievements"
            subtitle="Term assessments, subject performance, and earned milestone badges"
            icon={GraduationCap}
          />
          <div className="sd-insights-grid" style={{ marginBottom: '20px' }}>
            <StudentPerformance marks={studentMarks} subjects={studentSubjects} />
            <StudentLearningProgress />
          </div>
          <StudentAchievements badges={studentAchievements} />
        </section>
      )}

      {/* NOTICES MODULE */}
      {activeModule === 'notices' && (
        <section id="notices" aria-labelledby="notices-heading" className="sd-module-view">
          <StudentModuleHeader
            title="School Notices & Announcements"
            subtitle="Campus updates, club activities, and community circulars"
            icon={Bell}
          />
          <StudentAnnouncements />
        </section>
      )}

      {/* FEES MODULE */}
      {activeModule === 'fees' && (
        <section id="fees" aria-labelledby="fees-heading" className="sd-module-view">
          <StudentModuleHeader
            title="Fees & Receipts Overview"
            subtitle="Term fee dues, verified payment receipts, and balance summary"
            icon={Wallet}
          />
          <div className="sd-panel">
            <header className="sd-section-header">
              <div>
                <h2>Term Fee Status · {studentProfile.academicYear}</h2>
                <p>Read-only fee records · Managed by School Administration</p>
              </div>
              <span className="sd-label" style={{ color: 'var(--ad-green-ink)' }}>Current Dues Cleared</span>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--background)' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Term II Tuition</span>
                <strong style={{ display: 'block', fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>₹16,000</strong>
                <span style={{ fontSize: '10px', color: 'var(--ad-green-ink)' }}>Paid in full</span>
              </div>
              <div style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--background)' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Laboratory & Activity</span>
                <strong style={{ display: 'block', fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>₹3,000</strong>
                <span style={{ fontSize: '10px', color: 'var(--ad-green-ink)' }}>Paid in full</span>
              </div>
              <div style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--background)' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>Outstanding Balance</span>
                <strong style={{ display: 'block', fontSize: '18px', fontWeight: 800, margin: '4px 0', color: 'var(--primary)' }}>₹0.00</strong>
                <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>No pending dues</span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', background: 'var(--indigo-soft)', padding: '10px 14px', borderRadius: '8px' }}>
              Brightcamp School ERP enforces consolidated school billing. Individual student payment gateway transactions are not required.
            </p>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <p className="sd-endnote">
        A little curiosity goes a long way. <span>All people, records, and achievements shown are fictional.</span>
      </p>
    </div>
  );
}

function StudentModuleHeader({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <div className="sd-page-title" style={{ marginBottom: '22px' }}>
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
          <span className="eyebrow" style={{ margin: 0 }}>Student</span>
        </div>
        <h1 id={`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-heading`} tabIndex={-1} style={{ fontSize: '24px', letterSpacing: '-0.7px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>{subtitle}</p>
      </div>
      <div className="sd-icon" style={{ width: '44px', height: '44px' }}>
        <Icon size={22} />
      </div>
    </div>
  );
}
