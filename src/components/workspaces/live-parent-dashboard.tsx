import { Menu, UsersRound } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import type { ParentDashboardResult } from '@/lib/parent/dashboard-model';
import {
  StudentAnnouncementsCard, StudentAttendanceCard, StudentExamsCard, StudentFeesCard,
  StudentHomeworkCard, StudentProfileCard, StudentResultsCard, StudentTimetableCard,
} from './live-student-dashboard';
import styles from './live-admin-dashboard.module.css';
import cards from './live-student-dashboard.module.css';
import parent from './live-parent-dashboard.module.css';

const sections = [
  ['profile', 'Child profile'], ['attendance', 'Attendance'], ['timetable', 'Timetable'], ['homework', 'Homework'],
  ['exams', 'Upcoming exams'], ['results', 'Published results'], ['announcements', 'Announcements'], ['fees', 'Fees and receipts'],
];

function ParentNavigation({ ready }: { ready: boolean }) {
  return <nav aria-label="Parent dashboard">
    <a href="#children">Linked children</a>
    {ready && sections.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
  </nav>;
}

/** This component is exercised with isolated fixtures while the protected route remains disabled. */
export function LiveParentDashboard({ result }: { result: ParentDashboardResult }) {
  if (result.kind === 'unavailable') return <main className={styles.main}>
    <h1>Parent dashboard</h1><p role="status" className={styles.empty}>Parent dashboard information is unavailable.</p>
  </main>;

  const ready = result.kind === 'ready';
  const data = ready ? result.data : null;
  return <div className={styles.shell} data-role="parent">
    <aside className={styles.sidebar}>
      <Brand />
      <div className={styles.sidebarRoleBadge}>
        <span>Parent workspace</span>
      </div>
      <ParentNavigation ready={ready} />
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}><div className={styles.identity}>
        <UsersRound aria-hidden="true" /><div><strong>Parent workspace</strong><span>Linked student records</span></div>
      </div></header>
      <details className={styles.mobile}><summary><Menu aria-hidden="true" /> Parent navigation</summary><ParentNavigation ready={ready} /></details>
      <main className={styles.main}>
        <div className={styles.hero}><p>Parent dashboard</p><h1>{result.parentName}</h1></div>
        <section id="children" aria-labelledby="children-heading" className={styles.record + ' ' + cards.card}>
          <h2 id="children-heading"><UsersRound aria-hidden="true" />Linked children</h2>
          <ul className={parent.children}>
            {result.children.map(child => <li key={child.id}>
              <a href={'?child=' + encodeURIComponent(child.id) + '#children'}
                aria-current={ready && result.selectedChild === child.id ? 'true' : undefined}>{child.name}</a>
            </li>)}
          </ul>
          {!ready && <p className={styles.empty}>Select a child to see their school records.</p>}
        </section>
        {data && <div className={cards.grid}>
          <StudentProfileCard data={data} title="Child profile" /><StudentAttendanceCard value={data.attendance} />
          <StudentTimetableCard value={data.timetable} date={data.databaseDate} /><StudentHomeworkCard value={data.homework} />
          <StudentExamsCard value={data.exams} /><StudentResultsCard value={data.results} />
          <StudentAnnouncementsCard value={data.announcements} /><StudentFeesCard value={data.fees} />
        </div>}
      </main>
    </div>
  </div>;
}
