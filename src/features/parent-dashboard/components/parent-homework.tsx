import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Circle, Clock3, CircleAlert, BookOpen } from 'lucide-react';
import type { Child, HomeworkFilter } from '../types';
import { filterHomework, homeworkStatus, formatDate } from '../lib/calculations';
import { parentProfile } from '../data/mock-dashboard';
import { ParentSection } from './section';

export function ParentHomework({ child }: { child: Child }) {
  const isLive = child.id === 'student_a1';
  const [filter, setFilter] = useState<HomeworkFilter>('pending');
  const reduced = useReducedMotion();
  const shown = filterHomework(child.homework, filter);
  const counts = {
    all: child.homework.length,
    pending: filterHomework(child.homework, 'pending').length,
    completed: filterHomework(child.homework, 'completed').length
  };

  if (isLive && child.homework.length === 0) {
    return (
      <ParentSection
        id="parent-homework"
        title="Homework & Coursework Tasks"
        description={'Homework overview · ' + child.firstName + ' (' + child.className + ')'}
        badge="Official Curriculum"
      >
        <div className="pd-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <BookOpen size={36} style={{ margin: '0 auto 12px', color: 'var(--muted-foreground)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No active homework assignments</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            There are no pending homework assignments published for {child.className} at this time.
          </p>
        </div>
        <p className="pd-panel-note">Official homework assignments are published by classroom teachers.</p>
      </ParentSection>
    );
  }

  return (
    <ParentSection
      id="parent-homework"
      title="Small tasks. Growing confidence."
      description={'Homework overview · ' + child.firstName}
      badge={isLive ? 'Official Curriculum' : 'View only'}
    >
      <div className="pd-filters" role="group" aria-label="Homework status filter">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button type="button" key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}<span>{counts[f]}</span>
          </button>
        ))}
      </div>
      <p className="pd-view-summary" role="status">
        {shown.length} {filter === 'all' ? 'total' : filter} {shown.length === 1 ? 'assignment' : 'assignments'} for {child.firstName}
      </p>
      <motion.div
        key={filter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.16 }}
        className="pd-homework-list"
      >
        {shown.length ? shown.map(item => {
          const status = homeworkStatus(item, parentProfile.referenceDate);
          const Icon = status === 'Completed' ? CheckCircle2 : status === 'Overdue' ? CircleAlert : status === 'Due soon' ? Clock3 : Circle;
          return (
            <article key={item.id} data-homework-id={item.id} className="pd-homework-item">
              <div>
                <span className="pd-subject">{item.subject}</span>
                <h3>{item.title}</h3>
                <p>{item.teacher} · Due {formatDate(item.dueDate)}</p>
              </div>
              <span className={'pd-status pd-status-' + status.toLowerCase().replace(' ', '-')}>
                <Icon size={13} />{status}
              </span>
              {item.completedDate && <small>Sample completion · {formatDate(item.completedDate)}</small>}
            </article>
          );
        }) : (
          <div className="pd-empty">
            <BookOpen size={27} />
            <h3>No completed assignments yet</h3>
            <p>{child.firstName}’s tasks are still in progress. Choose Pending or All to see what’s next.</p>
          </div>
        )}
      </motion.div>
      {!isLive && <p className="pd-panel-note">Fictional teacher-reported status. Submissions are unavailable in this preview.</p>}
    </ParentSection>
  );
}
