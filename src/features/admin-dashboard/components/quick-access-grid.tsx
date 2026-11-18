'use client';

import { Users, BookOpen, CalendarCheck, Wallet, GraduationCap, ChartNoAxesCombined, ArrowUpRight } from 'lucide-react';
import { Reveal } from './motion';
import { navigateToModule } from '@/lib/navigation/use-active-module';

const modules = [
  { id: 'students', label: 'Student management', description: 'Admissions & student records', icon: Users, accent: 'indigo' },
  { id: 'staff', label: 'Teacher management', description: 'Your teaching community', icon: BookOpen, accent: 'violet' },
  { id: 'attendance', label: 'Attendance', description: 'Every learner, every day', icon: CalendarCheck, accent: 'emerald' },
  { id: 'fees', label: 'Fees', description: 'Collections & fee records', icon: Wallet, accent: 'sky' },
  { id: 'exams', label: 'Examinations', description: 'Assessments & results', icon: GraduationCap, accent: 'amber' },
  { id: 'reports', label: 'Reports', description: 'A clearer school perspective', icon: ChartNoAxesCombined, accent: 'rose' },
];

export function QuickAccessGrid() {
  return (
    <section className="ad-quick-section" aria-labelledby="quick-access-heading">
      <header className="ad-section-header">
        <div>
          <h2 id="quick-access-heading">Your school, within reach</h2>
          <p>Quick access · Select any module to open its dedicated view</p>
        </div>
        <span className="ad-label">Module shortcuts</span>
      </header>
      <div className="ad-quick-grid">
        {modules.map(({ id, label, description, icon: Icon, accent }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              navigateToModule(id);
            }}
            className="ad-quick-link"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Reveal hover className={`ad-quick-card ad-tone-${accent}`}>
              <span className="ad-icon"><Icon size={20} /></span>
              <div>
                <h3>{label}</h3>
                <p>{description}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                  Open module <ArrowUpRight size={13} aria-hidden="true" />
                </span>
              </div>
            </Reveal>
          </a>
        ))}
      </div>
    </section>
  );
}
