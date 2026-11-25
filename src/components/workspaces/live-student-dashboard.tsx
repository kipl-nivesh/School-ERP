import { Bell, BookOpen, CalendarDays, ClipboardList, FileText, GraduationCap, Menu, UserRound, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { logoutStudent } from '@/app/login/student/actions';
import { Brand } from '@/components/shared/brand';
import type { StudentDashboardData, StudentDashboardResult, StudentPanel } from '@/lib/student/dashboard-model';
import styles from './live-admin-dashboard.module.css';
import student from './live-student-dashboard.module.css';

const headings = [
  ['profile', 'My profile'], ['attendance', 'Attendance'], ['timetable', 'Timetable'], ['homework', 'Homework'],
  ['exams', 'Upcoming exams'], ['results', 'Results'], ['announcements', 'Announcements'], ['fees', 'Fees and receipts'], ['materials', 'Documents and study materials'],
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

export function StudentProfileCard({ data, title, showSubjects = false }: { data: StudentDashboardData; title?: string; showSubjects?: boolean }) {
  const placement = data.placement;
  const subjects = showSubjects && data.timetable.kind === 'ready' ? [...new Set(data.timetable.data.map(period => period.subject))].sort() : [];
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
      {showSubjects && <div><dt>Timetabled subjects</dt><dd>{subjects.join(', ') || 'No subjects listed'}</dd></div>}
    </dl>
    {placement.kind !== 'current' && <p className={styles.empty}>{placement.kind === 'none' ? 'No current enrollment.' :
      placement.kind === 'ambiguous' ? 'Multiple current enrollments. Class details are unavailable.' : 'Class details are unavailable.'}</p>}
  </Card>;
}

export function StudentAttendanceCard({ value }: { value: StudentDashboardData['attendance'] }) {
  return <Card id="attendance" icon={<ClipboardList aria-hidden="true" />}>
    <Panel value={value}>{data => {
      const days = data.present + data.late + data.absent;
      return <><dl className={student.fields}>
      <div><dt>Present</dt><dd>{data.present}</dd></div><div><dt>Absent</dt><dd>{data.absent}</dd></div>
      <div><dt>Late</dt><dd>{data.late}</dd></div><div><dt>Excused</dt><dd>{data.excused}</dd></div>
      {data.history && <div><dt>Attendance rate · past 365 days</dt><dd>{days ? ((data.present + data.late) / days * 100).toFixed(1) + '%' : 'No recorded days'}</dd></div>}
    </dl>
    {data.history && <><h3>Recent attendance · up to 60 records</h3><Rows items={data.history} empty="No attendance has been recorded.">{row =>
      <><strong>{row.date}</strong><span>{row.status}</span></>}</Rows></>}
    </>;
    }}</Panel>
  </Card>;
}
export function StudentTimetableCard({ value, date, weekly = false }: { value: StudentDashboardData['timetable']; date: string; weekly?: boolean }) {
  return <Card id="timetable" icon={<CalendarDays aria-hidden="true" />}>
    <p className={styles.limit}>{weekly ? 'Weekly timetable' : 'Today’s timetable · Database date ' + date}. Period times are shown as scheduled.</p>
    <Panel value={value}>{rows => <Rows items={rows} empty={weekly ? 'No periods scheduled.' : 'No periods scheduled for this date.'}>{row =>
      <><strong>{row.subject}</strong><span>{weekly && row.day ? row.day + ' · ' : ''}{row.start} – {row.end}{row.room && ' · ' + row.room}</span></>}
    </Rows>}</Panel>
  </Card>;
}
export function StudentHomeworkCard({ value }: { value: StudentDashboardData['homework'] }) {
  return <Card id="homework" icon={<BookOpen aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No visible open homework.">{row =>
      <><strong>{row.title}</strong><span>{row.subject} · Due {row.due}</span>{row.description && <p>{row.description}</p>}</>}</Rows>}</Panel>
  </Card>;
}
export function StudentExamsCard({ value }: { value: StudentDashboardData['exams'] }) {
  return <Card id="exams" icon={<FileText aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No visible upcoming exams.">{row =>
      <><strong>{row.title}</strong><span>{row.subject} · {row.date}{row.start && row.end && ' · ' + row.start.slice(0, 5) + '–' + row.end.slice(0, 5)}{row.venue && ' · ' + row.venue}</span></>}</Rows>}</Panel>
  </Card>;
}
export function StudentResultsCard({ value }: { value: StudentDashboardData['results'] }) {
  return <Card id="results" icon={<GraduationCap aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No visible published results.">{row =>
      <><strong>{row.title}</strong><span>{row.subject} · {row.score} / {row.maximum} · Published{row.passed === undefined ? '' : row.passed ? ' · Passed' : ' · Below passing mark'}</span></>}</Rows>}</Panel>
  </Card>;
}
export function StudentAnnouncementsCard({ value }: { value: StudentDashboardData['announcements'] }) {
  return <Card id="announcements" icon={<Bell aria-hidden="true" />}>
    <Panel value={value}>{rows => <Rows items={rows} empty="No current announcements.">{row =>
      <><strong>{row.title}</strong><span>{row.content}</span></>}</Rows>}</Panel>
  </Card>;
}
function rupees(value: number | bigint) {
  const paise = BigInt(value);
  const whole = (paise / BigInt(100)).toLocaleString('en-IN');
  return '₹' + whole + '.' + String(paise % BigInt(100)).padStart(2, '0');
}
export function StudentFeesCard({ value }: { value: StudentDashboardData['fees'] }) {
  return <Card id="fees" icon={<Wallet aria-hidden="true" />}>
    <Panel value={value}>{({ invoices, receipts, paymentHistory }) => <>
      {paymentHistory && <p><strong>Total outstanding</strong> {rupees(invoices.reduce(
        (total, row) => total + BigInt(row.amountPaise - row.paidPaise), BigInt(0)))}</p>}
      <h3>Invoices</h3><Rows items={invoices} empty="No visible invoices.">{row =>
        <><strong>{row.title} · {row.number}</strong><span>{rupees(row.amountPaise - row.paidPaise)} outstanding · Due {row.due}</span></>}</Rows>
      {paymentHistory && <><h3>Payment history</h3><Rows items={paymentHistory} empty="No posted payments.">{row =>
        <><strong>{row.number}</strong><span>{rupees(row.amountPaise)} · {row.date} · {row.status}</span></>}</Rows></>}
      <h3>Settled receipts</h3><Rows items={receipts} empty="No visible settled receipts.">{row =>
        <><strong>{row.id ? <Link href={'/student/receipts/' + row.id}>{row.number}</Link> : row.number}</strong><span>{rupees(row.amountPaise)} · {row.date}</span></>}</Rows>
    </>}</Panel>
  </Card>;
}

function StudentNavigation() {
  return <nav aria-label="Student dashboard">
    {headings.map(([id, name]) => <a key={id} href={'#' + id}>{name}</a>)}
  </nav>;
}

export function LiveStudentDashboard({ result }: { result: StudentDashboardResult }) {
  if (result.kind === 'unavailable') return <main className={styles.main}>
    <h1>Student dashboard</h1><p role="status" className={styles.empty}>Student dashboard information is unavailable.</p>
  </main>;
  const data = result.data;
  return <div className={styles.shell} data-role="student">
    <aside className={styles.sidebar}>
      <Brand />
      <div className={styles.sidebarRoleBadge}>
        <span>Student workspace</span>
      </div>
      <StudentNavigation />
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}><div className={styles.identity}>
        <GraduationCap aria-hidden="true" /><div><strong>{data.profile.schoolName}</strong><span>Student workspace</span></div>
      </div><form action={logoutStudent}><button type="submit">Sign out</button></form></header>
      <details className={styles.mobile}><summary><Menu aria-hidden="true" /> Student navigation</summary><StudentNavigation /></details>
      <main className={styles.main}>
        <div className={styles.hero}><p>Student dashboard</p><h1>{data.profile.displayName}</h1></div>
        <div className={student.grid}>
          <StudentProfileCard data={data} showSubjects /><StudentAttendanceCard value={data.attendance} />
          <StudentTimetableCard value={data.timetable} date={data.databaseDate} weekly /><StudentHomeworkCard value={data.homework} />
          <StudentExamsCard value={data.exams} /><StudentResultsCard value={data.results} />
          <StudentAnnouncementsCard value={data.announcements} /><StudentFeesCard value={data.fees} />
          <Card id="materials" icon={<FileText aria-hidden="true" />}>
            <Panel value={data.materials ?? { kind: 'unavailable' }}>{rows =>
              <Rows items={rows} empty="No published documents or study materials.">{row =>
                <><strong><a href={'/student/materials/' + row.id}>{row.title}</a></strong>
                  <span>{row.kind === 'document' ? 'Document' : 'Study material'}</span></>}</Rows>}
            </Panel>
          </Card>
        </div>
      </main>
    </div>
  </div>;
}
