import { CalendarCheck, GraduationCap, ClipboardList, Wallet, CalendarClock, Megaphone } from 'lucide-react';
import type { Child } from '../types';
import { childSummary, formatINR } from '../lib/calculations';
import { ParentReveal } from './motion';

export function ParentStatsGrid({ child, summary }: { child: Child; summary: ReturnType<typeof childSummary> }) {
  const isLive = child.id === 'student_a1';
  const stats = [
    {
      label: 'Attendance',
      value: summary.attendance.total > 0 ? summary.attendance.percentage.toFixed(1) + '%' : '0.0%',
      detail: summary.attendance.total > 0 ? `${summary.attendance.present} of ${summary.attendance.total} school days` : (isLive ? 'No recorded days yet' : '0 of 0 school days'),
      icon: CalendarCheck,
      tone: 'emerald'
    },
    {
      label: 'Academic average',
      value: summary.academic.maximum > 0 ? summary.academic.percentage.toFixed(1) + '%' : (isLive ? '—' : '0.0%'),
      detail: summary.academic.maximum > 0 ? 'Term I · weighted by marks' : (isLive ? 'No published assessments' : 'Term I · weighted by marks'),
      icon: GraduationCap,
      tone: 'indigo'
    },
    {
      label: 'Pending homework',
      value: String(summary.pendingHomework),
      detail: summary.pendingHomework > 0 ? 'Assignments to explore' : (isLive ? 'No pending assignments' : 'Assignments to explore'),
      icon: ClipboardList,
      tone: 'amber'
    },
    {
      label: 'Pending fees',
      value: formatINR(summary.fees.outstanding),
      detail: summary.fees.outstanding > 0 ? 'Total outstanding balance' : (isLive ? 'All fee dues clear' : 'Total outstanding balance'),
      icon: Wallet,
      tone: 'rose'
    },
    {
      label: 'Upcoming exams',
      value: String(summary.exams.length),
      detail: isLive ? (summary.exams.length > 0 ? 'Upcoming term assessments' : 'No upcoming exams') : 'From the demo snapshot',
      icon: CalendarClock,
      tone: 'sky'
    },
    {
      label: 'School notices',
      value: String(summary.noticeCount),
      detail: isLive ? (summary.noticeCount > 0 ? 'Active school circulars' : 'No active circulars') : 'School-wide + child notices',
      icon: Megaphone,
      tone: 'violet'
    },
  ];

  return (
    <section aria-label={'At a glance for ' + child.name} className="pd-stats" data-child-id={child.id}>
      {stats.map(({ label, value, detail, icon: Icon, tone }, i) => (
        <ParentReveal key={label} className={'pd-stat pd-tone-' + tone} index={i} hover>
          <div>
            <span className="pd-icon"><Icon size={19} /></span>
            <span className="pd-stat-label">{label}</span>
          </div>
          <strong className="pd-stat-value">{value}</strong>
          <p>{detail}</p>
        </ParentReveal>
      ))}
    </section>
  );
}
