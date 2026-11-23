import { Clock3, CheckCircle2, Circle, MapPin } from 'lucide-react';
import type { Child } from '../types';
import { periodStatus, formatTime } from '../lib/calculations';
import { parentProfile } from '../data/mock-dashboard';
import { ParentSection } from './section';

export function ParentTimetable({ child }: { child: Child }) {
  const isLive = child.id === 'student_a1';

  if (isLive && child.timetable.length === 0) {
    return (
      <ParentSection
        id="parent-timetable"
        title="Daily Timetable"
        description={'Class schedule · ' + child.firstName + ' · ' + child.className}
        badge="Official Schedule"
      >
        <div className="pd-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <Clock3 size={36} style={{ margin: '0 auto 12px', color: 'var(--muted-foreground)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No timetable slots published yet</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            Weekly class schedules for {child.className} have not been published yet.
          </p>
        </div>
        <p className="pd-panel-note">Classroom schedules are maintained by the academic coordinator.</p>
      </ParentSection>
    );
  }

  return (
    <ParentSection
      id="parent-timetable"
      title="A window into their school day"
      description={'Today’s timetable · ' + child.firstName + ' · Class ' + child.className}
      badge="4 Nov · 10:20 AM IST"
    >
      <div className="pd-timetable">
        {child.timetable.length ? child.timetable.map(p => {
          const status = periodStatus(p, parentProfile.referenceTime);
          const Icon = status === 'Completed' ? CheckCircle2 : status === 'Current' ? Clock3 : Circle;
          return (
            <article key={p.period} data-period={p.period} className={status === 'Current' ? 'pd-current' : ''}>
              <span className="pd-period-number">{String(p.period).padStart(2, '0')}</span>
              <div className="pd-period-info">
                <h3>{p.subject}</h3>
                <p>{p.teacher}</p>
                <span>{formatTime(p.start)} – {formatTime(p.end)}</span>
                <small><MapPin size={12} />{p.room}</small>
              </div>
              <span className={'pd-status pd-status-' + status.toLowerCase()}><Icon size={13} />{status}</span>
            </article>
          );
        }) : <p className="pd-empty">No classes scheduled for this day.</p>}
      </div>
      {!isLive && <p className="pd-panel-note">Statuses use the fixed fictional snapshot, rather than the current time.</p>}
    </ParentSection>
  );
}
