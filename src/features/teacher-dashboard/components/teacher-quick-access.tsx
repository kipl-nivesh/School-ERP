'use client';

import { CalendarCheck, BookOpen, ClipboardPlus, PencilLine, Clock3, ChartNoAxesCombined, ArrowUpRight } from 'lucide-react';
import { quickAccess } from '../data/mock-dashboard';
import { TeacherReveal } from './motion';
import { navigateToModule } from '@/lib/navigation/use-active-module';

const icons = {
  attendance: CalendarCheck,
  classes: BookOpen,
  homework: ClipboardPlus,
  marks: PencilLine,
  periods: Clock3,
  progress: ChartNoAxesCombined,
};

const moduleMap: Record<string, string> = {
  attendance: 'attendance',
  classes: 'classes',
  homework: 'homework',
  marks: 'exams',
  periods: 'timetable',
  progress: 'exams',
};

export function TeacherQuickAccess() {
  return (
    <section className="td-quick-section" aria-labelledby="teacher-quick-heading">
      <header className="td-section-header">
        <div>
          <h2 id="teacher-quick-heading">A little closer to everything</h2>
          <p>Quick access · Select a tool to open its dedicated teaching module</p>
        </div>
        <span className="td-label">Teaching shortcuts</span>
      </header>
      <div className="td-quick-grid">
        {quickAccess.map((item) => {
          const Icon = icons[item.icon];
          const targetModule = moduleMap[item.icon] || 'overview';
          return (
            <a
              key={item.label}
              href={`#${targetModule}`}
              onClick={(e) => {
                e.preventDefault();
                navigateToModule(targetModule);
              }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <TeacherReveal hover className={`td-quick-card td-tone-${item.accent}`}>
                <span className="td-icon"><Icon size={20} /></span>
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                    Open module <ArrowUpRight size={13} aria-hidden="true" />
                  </span>
                </div>
              </TeacherReveal>
            </a>
          );
        })}
      </div>
    </section>
  );
}
