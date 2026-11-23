import { Megaphone, GraduationCap, Bell, ArrowUpRight } from 'lucide-react';
import type { Child, Notice } from '../types';
import { schoolNotices } from '../data/mock-dashboard';
import { formatDate } from '../lib/calculations';
import { ParentSection } from './section';

function NoticeList({ notices }: { notices: Notice[] }) {
  return (
    <div className="pd-notice-list">
      {notices.map(n => {
        const Icon = n.category === 'Community' ? Megaphone : n.category === 'Academics' ? GraduationCap : Bell;
        return (
          <article key={n.id} data-notice-id={n.id}>
            <span className={'pd-icon pd-tone-' + (n.category === 'Community' ? 'emerald' : n.category === 'Academics' ? 'violet' : 'amber')}>
              <Icon size={19} />
            </span>
            <div>
              <span className="pd-subject">{n.category} · {formatDate(n.date)}</span>
              <h3>{n.title}</h3>
              <p>{n.description}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ParentAnnouncements({ child }: { child: Child }) {
  const isLive = child.id === 'student_a1';
  const notices = isLive ? [] : schoolNotices;
  const childNotices = child.notices;
  const totalCount = notices.length + childNotices.length;

  if (isLive && totalCount === 0) {
    return (
      <ParentSection
        id="parent-notices"
        title="Around our school community"
        description="Important dates, gentle reminders, and shared circulars."
        badge="Official Circulars"
      >
        <div className="pd-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <Megaphone size={36} style={{ margin: '0 auto 12px', color: 'var(--muted-foreground)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No active school circulars</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            Official notices, events, and announcements for {child.className} will be broadcast here as they are published.
          </p>
        </div>
        <p className="pd-panel-note">School broadcasts are published by administrators under role-based authorization.</p>
      </ParentSection>
    );
  }

  return (
    <ParentSection
      id="parent-notices"
      title="Around our school community"
      description="Important dates, gentle reminders, and shared moments."
      badge={totalCount + ' notices'}
    >
      <div className="pd-notice-columns">
        <div>
          <h3 className="pd-list-heading"><Megaphone size={16} />For every family</h3>
          {notices.length ? <NoticeList notices={notices} /> : <p className="pd-empty">No school-wide notices.</p>}
        </div>
        <div>
          <h3 className="pd-list-heading"><ArrowUpRight size={16} />For {child.firstName} · Class {child.className}</h3>
          {childNotices.length ? <NoticeList notices={childNotices} /> : <p className="pd-empty">{isLive ? 'No student-specific circulars on record.' : 'No child-specific notices in this snapshot.'}</p>}
        </div>
      </div>
    </ParentSection>
  );
}
