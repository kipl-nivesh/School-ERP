import { Bell, BookOpen, CalendarDays, ClipboardList, FileText, GraduationCap, Menu, UserRound, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Brand } from '@/components/shared/brand';
import type { StudentDashboardData, StudentDashboardResult, StudentPanel } from '@/lib/student/dashboard-model';
import styles from './live-admin-dashboard.module.css';
import student from './live-student-dashboard.module.css';

const headings = [
  ['profile', 'My profile'], ['attendance', 'Attendance'], ['timetable', 'Timetable'], ['homework', 'Homework'],
  ['exams', 'Upcoming exams'], ['results', 'Results'], ['announcements', 'Announcements'], ['fees', 'Fees and receipts'],
] as const;
type Section = typeof headings[number][0];

function Card({ id, icon, title, children }: { id: Section; icon: ReactNode; title?: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={id + '-heading'} className={styles.record + ' ' + student.card}>
    <h2 id={id + '-heading'}>{icon}{title ?? headings.find(([key]) => key === id)?.[1]}</h2>
    {children}
  </section>;
}

function Panel<T>({ value, children }: { value: StudentPanel<T>; children: (data: T) => ReactNode }) {
  return value.kind === 'unavailable' ? <p className={styles.empty}>Information unavailable.</p> : children(value.data);
}

function Rows<T>({ items, empty, children }: { items: T[]; empty: string; children: (item: T) => ReactNode }) {
  return items.length ? <ul className={student.rows}>{items.map((item, index) => <li key={index}>{children(item)}</li>)}</ul> :
    <p className={styles.empty}>{empty}</p>;
}

export function StudentProfileCard({ data, title }: { data: StudentDashboardData; title?: string }) {
  const placement = data.placement;
  return <Card id="profile" title={title} icon={<UserRound aria-hidden="true" />}>
    <dl className={student.fields}>
      <div><dt>Name</dt><dd>{data.profile.displayName}</dd></div>
      <div><dt>Student ID</dt><dd>{data.profile.registration}</dd></div>
      <div><dt>School</dt><dd>{data.profile.schoolName}</dd></div>
      <div><dt>Status</dt><dd>Active</dd></div>
      {placement.kind === 'current' && <>
        <div><dt>Academic year</dt><dd>{placement.data.academicYear}</dd></div>
        <div><dt>Class and section</dt><dd>{placement.data.classroom} · {placement.data.section}</dd></div>
      </>}
    </dl>
    {placement.kind !== 'current' && <p className={styles.empty}>{placement.kind === 'none' ? 'No current enrollment.' :
      placement.kind === 'ambiguous' ? 'Multiple current enrollments. Class details are unavailable.' : 'Class details are unavailable.'}</p>}
  </Card>;
}

export function StudentAttendanceCard({ value }: { value: StudentDashboardData['attendance'] }) {
  return <Card id="attendance" icon={<ClipboardList aria-hidden="true" />}>
    <Panel value={value}>{data => <dl className={student.fields}>
      <div><dt>Present</dt><dd>{data.present}</dd></div><div><dt>Absent</dt><dd>{data.absent}</dd></div>
      <div><dt>Late</dt><dd>{data.late}</dd></div><div><dt>Excused</dt><dd>{data.excused}</dd></div>
    </dl>}</Panel>
  </Card>;
}
export function StudentTimetableCard({ value, date }: { value: StudentDashboardData['timetable']; date: string }) {
  return <Card id="timetable" icon={<CalendarDays aria-hidden="true" />}>
    <p className={styles.limit}>Today’s timetable · Database date {date}. Period times are shown as scheduled.</p>
    <Panel value={value}>{rows => <Rows items={rows} empty="No periods scheduled for this date.">{row =>
      <><strong>{row.subject}</strong><span>{row.start} – {row.end}{row.room && ' · ' + row.room}</span></>}
    </Rows>}</Panel>
  </Card>;
}
export function StudentHomeworkCard({ value }: { value: StudentDashboardData['homework'] }) {
  return <Card id="homework" icon={<BookOpen aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No visible open homework.">{row =>
      <><strong>{row.title}</strong><span>{row.subject} · Due {row.due}</span></>}</Rows>}</Panel>
  </Card>;
}
export function StudentExamsCard({ value }: { value: StudentDashboardData['exams'] }) {
  return <Card id="exams" icon={<FileText aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No visible upcoming exams.">{row =>
      <><strong>{row.title}</strong><span>{row.subject} · {row.date}</span></>}</Rows>}</Panel>
  </Card>;
}
export function StudentResultsCard({ value }: { value: StudentDashboardData['results'] }) {
  return <Card id="results" icon={<GraduationCap aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No visible published results.">{row =>
      <><strong>{row.title}</strong><span>{row.subject} · {row.score} / {row.maximum} · Published</span></>}</Rows>}</Panel>
  </Card>;
}
export function StudentAnnouncementsCard({ value }: { value: StudentDashboardData['announcements'] }) {
  return <Card id="announcements" icon={<Bell aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No current announcements.">{row =>
      <><strong>{row.title}</strong><span>{row.content}</span></>}</Rows>}</Panel>
  </Card>;
}
function rupees(value: number) {
  const whole = Math.floor(value / 100).toLocaleString('en-IN');
  return '₹' + whole + '.' + String(value % 100).padStart(2, '0');
}
export function StudentFeesCard({ value }: { value: StudentDashboardData['fees'] }) {
  return <Card id="fees" icon={<Wallet aria-hidden="true" />}>
    <Panel value={value}>{({ invoices, receipts }) => <>
      <h3>Invoices</h3><Rows items={invoices} empty="No visible invoices.">{row =>
        <><strong>{row.title} · {row.number}</strong><span>{rupees(row.amountPaise - row.paidPaise)} outstanding · Due {row.due}</span></>}</Rows>
      <h3>Settled receipts</h3><Rows items={receipts} empty="No visible settled receipts.">{row =>
        <><strong>{row.number}</strong><span>{rupees(row.amountPaise)} · {row.date}</span></>}</Rows>
    </>}</Panel>
  </Card>;
}

function StudentNavigation() {
  return <nav aria-label="Student dashboard">
    {headings.map(([id, name]) => <a key={id} href={'#' + id}>{name}</a>)}
  </nav>;
}

/** Rendered with isolated test fixtures until an authorized portal entry point is available. */
export function LiveStudentDashboard({ result }: { result: StudentDashboardResult }) {
  if (result.kind === 'unavailable') return <main className={styles.main}>
    <h1>Student dashboard</h1><p role="status" className={styles.empty}>Student dashboard information is unavailable.</p>
  </main>;
  const data = result.data;
  return <div className={styles.shell}>
    <aside className={styles.sidebar}><Brand /><StudentNavigation /></aside>
    <div className={styles.workspace}>
      <header className={styles.header}><div className={styles.identity}>
        <GraduationCap aria-hidden="true" /><div><strong>{data.profile.schoolName}</strong><span>Student workspace</span></div>
      </div></header>
      <details className={styles.mobile}><summary><Menu aria-hidden="true" /> Student navigation</summary><StudentNavigation /></details>
      <main className={styles.main}>
        <div className={styles.hero}><p>Student dashboard</p><h1>{data.profile.displayName}</h1></div>
        <div className={student.grid}>
          <StudentProfileCard data={data} /><StudentAttendanceCard value={data.attendance} />
          <StudentTimetableCard value={data.timetable} date={data.databaseDate} /><StudentHomeworkCard value={data.homework} />
          <StudentExamsCard value={data.exams} /><StudentResultsCard value={data.results} />
          <StudentAnnouncementsCard value={data.announcements} /><StudentFeesCard value={data.fees} />
        </div>
      </main>
    </div>
  </div>;
}
