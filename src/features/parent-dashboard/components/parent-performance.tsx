import { useState } from 'react';
import { Sparkles, Lightbulb, GraduationCap } from 'lucide-react';
import type { Child } from '../types';
import { marksSummary, percentage, formatDate } from '../lib/calculations';
import { ParentSection } from './section';
import { ParentProgress } from './motion';

export function ParentPerformance({ child }: { child: Child }) {
  const isLive = child.id === 'student_a1';
  const [subject, setSubject] = useState('all');
  const summary = marksSummary(child.marks);
  const shown = child.marks.filter(m => subject === 'all' || m.id === subject);

  if (isLive && child.marks.length === 0) {
    return (
      <ParentSection
        id="parent-results"
        title="Learning & Assessments"
        description={'Academic performance · ' + child.firstName + ' · ' + child.className}
        badge="Official Assessment"
      >
        <div className="pd-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <GraduationCap size={36} style={{ margin: '0 auto 12px', color: 'var(--muted-foreground)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No published assessment marks recorded yet</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            Subject-wise assessment results will appear here as terms conclude and grades are submitted by teachers.
          </p>
        </div>
        <p className="pd-panel-note">Grading and report cards are governed by institutional evaluation policies.</p>
      </ParentSection>
    );
  }

  return (
    <ParentSection
      id="parent-results"
      title="Learning, one discovery at a time"
      description={'Academic performance · ' + child.firstName + ' · Term I'}
      badge={isLive ? 'Official Assessment' : 'Their own journey'}
    >
      <div className="pd-academic-overview">
        <strong className="pd-big-number">{summary.percentage.toFixed(1)}<small>%</small></strong>
        <div>
          <strong>Overall academic average</strong>
          <p>{summary.obtained}/{summary.maximum} marks · all {child.marks.length} subjects</p>
        </div>
      </div>
      <div className="pd-control">
        <label htmlFor="parent-academic-subject">Explore a subject</label>
        <select id="parent-academic-subject" value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="all">All subjects</option>
          {child.marks.map(m => <option key={m.id} value={m.id}>{m.subject}</option>)}
        </select>
      </div>
      <p className="pd-view-summary" role="status">
        {subject === 'all' ? 'Showing all ' + shown.length + ' subjects' : shown[0]?.subject + ' · ' + percentage(shown[0]?.obtained ?? 0, shown[0]?.maximum ?? 0).toFixed(1) + '%'}
      </p>
      <figure className="pd-marks-chart">
        <figcaption className="sr-only">Term I subject marks for {child.name}, with maximum scores. Values are shown alongside each percentage bar.</figcaption>
        {shown.map((m, i) => (
          <div className={'pd-mark-row pd-tone-' + ['indigo', 'rose', 'sky', 'amber', 'violet'][i % 5]} key={m.id}>
            <div><span>{m.subject}</span><strong>{m.obtained}/{m.maximum}</strong></div>
            <div className="pd-progress" role="img" aria-label={m.subject + ': ' + percentage(m.obtained, m.maximum).toFixed(1) + ' percent'}>
              <ParentProgress value={percentage(m.obtained, m.maximum)} />
            </div>
          </div>
        ))}
      </figure>
      <div className="pd-strengths">
        <p><Sparkles size={17} /><span>A strength to celebrate<strong>{summary.strongest?.subject} · {percentage(summary.strongest?.obtained ?? 0, summary.strongest?.maximum ?? 0).toFixed(0)}%</strong></span></p>
        <p><Lightbulb size={17} /><span>Room to explore<strong>{summary.focus?.subject} · a little practice together</strong></span></p>
      </div>
      <details className="pd-details">
        <summary>View examination results</summary>
        <table>
          <caption>{child.name} · Term I assessment</caption>
          <thead><tr><th scope="col">Subject</th><th scope="col">Marks</th><th scope="col">Date</th></tr></thead>
          <tbody>
            {[...child.marks].sort((a, b) => b.date.localeCompare(a.date)).map(m => (
              <tr key={m.id}>
                <th scope="row">{m.subject}</th>
                <td>{m.obtained}/{m.maximum}</td>
                <td>{formatDate(m.date)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><th scope="row">Total</th><td>{summary.obtained}/{summary.maximum}</td><td>{summary.percentage.toFixed(1)}%</td></tr></tfoot>
        </table>
      </details>
    </ParentSection>
  );
}
