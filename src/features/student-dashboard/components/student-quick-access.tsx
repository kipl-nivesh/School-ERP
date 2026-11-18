'use client';

import { NotebookPen, Clock3, GraduationCap, CalendarCheck, Award, Megaphone, ArrowUpRight } from 'lucide-react';
import { studentQuickLinks } from '../data/mock-dashboard';
import { StudentReveal } from './motion';
import { navigateToModule } from '@/lib/navigation/use-active-module';

const icons = {
  homework: NotebookPen,
  timetable: Clock3,
  results: GraduationCap,
  attendance: CalendarCheck,
  achievements: Award,
  announcements: Megaphone,
};

const targetModuleMap: Record<string, string> = {
  'student-homework': 'homework',
  'student-timetable': 'timetable',
  'student-performance': 'results',
  'student-attendance': 'attendance',
  'student-achievements': 'results',
  'student-announcements': 'notices',
};

export function StudentQuickAccess() {
  return (
    <section className="sd-quick-section" aria-labelledby="student-quick-title">
      <header className="sd-section-header">
        <div>
          <h2 id="student-quick-title">A little closer to everything</h2>
          <p>Quick access · jump to a part of your learning space</p>
        </div>
        <span className="sd-label">Explore modules</span>
      </header>
      <nav className="sd-quick-grid" aria-label="Student quick access">
        {studentQuickLinks.map(item => {
          const Icon = icons[item.icon];
          const mod = targetModuleMap[item.target] || 'overview';
          return (
            <a
              key={item.target}
              href={`#${mod}`}
              onClick={(e) => {
                e.preventDefault();
                navigateToModule(mod);
              }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <StudentReveal hover className={'sd-quick-card sd-tone-' + item.accent}>
                <span className="sd-icon"><Icon size={20} /></span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                    Open module <ArrowUpRight size={13} aria-hidden="true" />
                  </span>
                </div>
              </StudentReveal>
            </a>
          );
        })}
      </nav>
    </section>
  );
}
