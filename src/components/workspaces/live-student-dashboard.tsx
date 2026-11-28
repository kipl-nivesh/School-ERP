import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { StudentDashboardData, StudentDashboardResult, StudentPanel } from '@/lib/student/dashboard-model';
import type { StudentWorkspaceKey } from '@/lib/student/student-workspace';
import { StudentModuleSkeleton, StudentWorkspaceShell } from './student-workspace-shell';
import styles from './live-admin-dashboard.module.css';
import student from './live-student-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

const headings = [
  ['profile', 'My profile'],
  ['attendance', 'Attendance'],
  ['timetable', 'Timetable'],
  ['homework', 'Homework'],
  ['exams', 'Upcoming exams'],
  ['results', 'Results'],
  ['announcements', 'Announcements'],
  ['fees', 'Fees and receipts'],
  ['materials', 'Documents and study materials'],
] as const;
type Section = (typeof headings)[number][0];

function Card({ id, icon, title, children }: { id: Section; icon: ReactNode; title?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id + '-heading'} className={styles.record + ' ' + student.card}>
      <h2 id={id + '-heading'}>
        {icon}
        {title ?? headings.find(([key]) => key === id)?.[1]}
      </h2>
      {children}
    </section>
  );
}

function Panel<T>({ value, children }: { value: StudentPanel<T>; children: (data: T) => ReactNode }) {
  return value.kind === 'unavailable' ? (
    <p className={styles.empty}>Information unavailable.</p>
  ) : (
    children(value.data)
  );
}

function Rows<T>({ items, empty, children }: { items: T[]; empty: string; children: (item: T) => ReactNode }) {
  return items.length ? (
    <ul className={student.rows}>
      {items.map((item, index) => (
        <li key={index}>{children(item)}</li>
      ))}
    </ul>
  ) : (
    <p className={styles.empty}>{empty}</p>
  );
}

export function StudentProfileCard({
  data,
  title,
  showSubjects = false,
}: {
  data: StudentDashboardData;
  title?: string;
  showSubjects?: boolean;
}) {
  const placement = data.placement;
  const subjects =
    showSubjects && data.timetable.kind === 'ready'
      ? [...new Set(data.timetable.data.map((period) => period.subject))].sort()
      : [];
  return (
    <Card id="profile" title={title} icon={<UserRound aria-hidden="true" />}>
      <dl className={student.fields}>
        <div>
          <dt>Name</dt>
          <dd>{data.profile.displayName}</dd>
        </div>
        <div>
          <dt>Student ID</dt>
          <dd>{data.profile.registration}</dd>
        </div>
        <div>
          <dt>School</dt>
          <dd>{data.profile.schoolName}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Active</dd>
        </div>
        {placement.kind === 'current' && (
          <>
            <div>
              <dt>Academic year</dt>
              <dd>{placement.data.academicYear}</dd>
            </div>
            <div>
              <dt>Class and section</dt>
              <dd>
                {placement.data.classroom} · {placement.data.section}
              </dd>
            </div>
          </>
        )}
        {showSubjects && (
          <div>
            <dt>Timetabled subjects</dt>
            <dd>{subjects.join(', ') || 'No subjects listed'}</dd>
          </div>
        )}
      </dl>
      {placement.kind !== 'current' && (
        <p className={styles.empty}>
          {placement.kind === 'none'
            ? 'No current enrollment.'
            : placement.kind === 'ambiguous'
              ? 'Multiple current enrollments. Class details are unavailable.'
              : 'Class details are unavailable.'}
        </p>
      )}
    </Card>
  );
}

export function StudentAttendanceCard({ value }: { value: StudentDashboardData['attendance'] }) {
  return (
    <Card id="attendance" icon={<ClipboardList aria-hidden="true" />}>
      <Panel value={value}>
        {(data) => {
          const days = data.present + data.late + data.absent;
          return (
            <>
              <dl className={student.fields}>
                <div>
                  <dt>Present</dt>
                  <dd>{data.present}</dd>
                </div>
                <div>
                  <dt>Absent</dt>
                  <dd>{data.absent}</dd>
                </div>
                <div>
                  <dt>Late</dt>
                  <dd>{data.late}</dd>
                </div>
                <div>
                  <dt>Excused</dt>
                  <dd>{data.excused}</dd>
                </div>
                {data.history && (
                  <div>
                    <dt>Attendance rate · past 365 days</dt>
                    <dd>{days ? (((data.present + data.late) / days) * 100).toFixed(1) + '%' : 'No recorded days'}</dd>
                  </div>
                )}
              </dl>
              {data.history && (
                <>
                  <h3>Recent attendance · up to 60 records</h3>
                  <Rows items={data.history} empty="No attendance has been recorded.">
                    {(row) => (
                      <>
                        <strong>{row.date}</strong>
                        <span>{row.status}</span>
                      </>
                    )}
                  </Rows>
                </>
              )}
            </>
          );
        }}
      </Panel>
    </Card>
  );
}

export function StudentTimetableCard({
  value,
  date,
  weekly = false,
}: {
  value: StudentDashboardData['timetable'];
  date: string;
  weekly?: boolean;
}) {
  return (
    <Card id="timetable" icon={<CalendarDays aria-hidden="true" />}>
      <p className={styles.limit}>
        {weekly ? 'Weekly timetable' : 'Today’s timetable · Database date ' + date}. Period times are shown as scheduled.
      </p>
      <Panel value={value}>
        {(rows) => (
          <Rows items={rows} empty={weekly ? 'No periods scheduled.' : 'No periods scheduled for this date.'}>
            {(row) => (
              <>
                <strong>{row.subject}</strong>
                <span>
                  {weekly && row.day ? row.day + ' · ' : ''}
                  {row.start} – {row.end}
                  {row.room && ' · ' + row.room}
                </span>
              </>
            )}
          </Rows>
        )}
      </Panel>
    </Card>
  );
}

export function StudentHomeworkCard({ value }: { value: StudentDashboardData['homework'] }) {
  return (
    <Card id="homework" icon={<BookOpen aria-hidden="true" />}>
      <Panel value={value}>
        {(rows) => (
          <Rows items={rows} empty="No visible open homework.">
            {(row) => (
              <>
                <strong>{row.title}</strong>
                <span>
                  {row.subject} · Due {row.due}
                </span>
                {row.description && <p>{row.description}</p>}
              </>
            )}
          </Rows>
        )}
      </Panel>
    </Card>
  );
}

export function StudentExamsCard({ value }: { value: StudentDashboardData['exams'] }) {
  return (
    <Card id="exams" icon={<FileText aria-hidden="true" />}>
      <Panel value={value}>
        {(rows) => (
          <Rows items={rows} empty="No visible upcoming exams.">
            {(row) => (
              <>
                <strong>{row.title}</strong>
                <span>
                  {row.subject} · {row.date}
                  {row.start && row.end && ' · ' + row.start.slice(0, 5) + '–' + row.end.slice(0, 5)}
                  {row.venue && ' · ' + row.venue}
                </span>
              </>
            )}
          </Rows>
        )}
      </Panel>
    </Card>
  );
}

export function StudentResultsCard({ value }: { value: StudentDashboardData['results'] }) {
  return (
    <Card id="results" icon={<GraduationCap aria-hidden="true" />}>
      <Panel value={value}>
        {(rows) => (
          <Rows items={rows} empty="No visible published results.">
            {(row) => (
              <>
                <strong>{row.title}</strong>
                <span>
                  {row.subject} · {row.score} / {row.maximum} · Published
                  {row.passed === undefined ? '' : row.passed ? ' · Passed' : ' · Below passing mark'}
                </span>
              </>
            )}
          </Rows>
        )}
      </Panel>
    </Card>
  );
}

export function StudentAnnouncementsCard({ value }: { value: StudentDashboardData['announcements'] }) {
  return (
    <Card id="announcements" icon={<Bell aria-hidden="true" />}>
      <Panel value={value}>
        {(rows) => (
          <Rows items={rows} empty="No current announcements.">
            {(row) => (
              <>
                <strong>{row.title}</strong>
                <span>{row.content}</span>
              </>
            )}
          </Rows>
        )}
      </Panel>
    </Card>
  );
}

function rupees(value: number | bigint) {
  const paise = BigInt(value);
  const whole = (paise / BigInt(100)).toLocaleString('en-IN');
  return '₹' + whole + '.' + String(paise % BigInt(100)).padStart(2, '0');
}

export function StudentFeesCard({ value }: { value: StudentDashboardData['fees'] }) {
  return (
    <Card id="fees" icon={<Wallet aria-hidden="true" />}>
      <Panel value={value}>
        {({ invoices, receipts, paymentHistory }) => (
          <>
            {paymentHistory && (
              <p>
                <strong>Total outstanding</strong>{' '}
                {rupees(invoices.reduce((total, row) => total + BigInt(row.amountPaise - row.paidPaise), BigInt(0)))}
              </p>
            )}
            <h3>Invoices</h3>
            <Rows items={invoices} empty="No visible invoices.">
              {(row) => (
                <>
                  <strong>
                    {row.title} · {row.number}
                  </strong>
                  <span>
                    {rupees(row.amountPaise - row.paidPaise)} outstanding · Due {row.due}
                  </span>
                </>
              )}
            </Rows>
            {paymentHistory && (
              <>
                <h3>Payment history</h3>
                <Rows items={paymentHistory} empty="No posted payments.">
                  {(row) => (
                    <>
                      <strong>{row.number}</strong>
                      <span>
                        {rupees(row.amountPaise)} · {row.date} · {row.status}
                      </span>
                    </>
                  )}
                </Rows>
              </>
            )}
            <h3>Settled receipts</h3>
            <Rows items={receipts} empty="No visible settled receipts.">
              {(row) => (
                <>
                  <strong>{row.id ? <Link href={'/student/receipts/' + row.id}>{row.number}</Link> : row.number}</strong>
                  <span>
                    {rupees(row.amountPaise)} · {row.date}
                  </span>
                </>
              )}
            </Rows>
          </>
        )}
      </Panel>
    </Card>
  );
}

function StudentOverviewSection({ data }: { data: StudentDashboardData }) {
  const att = data.attendance.kind === 'ready' ? data.attendance.data : null;
  const attDays = att ? att.present + att.late + att.absent : 0;
  const attRate = att ? (attDays ? `${(((att.present + att.late) / attDays) * 100).toFixed(1)}%` : 'No days') : '—';
  const homeworkCount = data.homework.kind === 'ready' ? data.homework.data.length : '—';
  const examCount = data.exams.kind === 'ready' ? data.exams.data.length : '—';
  const feeOutstanding =
    data.fees.kind === 'ready'
      ? rupees(
          data.fees.data.invoices.reduce(
            (total, row) => total + BigInt(row.amountPaise - row.paidPaise),
            BigInt(0)
          )
        )
      : '—';

  return (
    <>
      <div id="overview" className={styles.hero}>
        <p>Student dashboard</p>
        <h1>{data.profile.displayName}</h1>
        <span>
          {data.profile.schoolName} · {data.profile.registration}
        </span>
      </div>
      <dl className={teacherStyles.metrics}>
        <div>
          <dt>Attendance rate</dt>
          <dd>{attRate}</dd>
        </div>
        <div>
          <dt>Open homework</dt>
          <dd>{homeworkCount}</dd>
        </div>
        <div>
          <dt>Upcoming exams</dt>
          <dd>{examCount}</dd>
        </div>
        <div>
          <dt>Fee balance</dt>
          <dd>{feeOutstanding}</dd>
        </div>
      </dl>
      <StudentProfileCard data={data} />
      <section className={styles.section} aria-label="Student modules">
        <h2>Quick module access</h2>
        <div className={styles.shortcuts}>
          <Link href="/student/dashboard?workspace=profile">
            <UserRound size={18} aria-hidden="true" />
            <span>My Profile</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=timetable">
            <CalendarDays size={18} aria-hidden="true" />
            <span>Timetable &amp; Subjects</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=attendance">
            <ClipboardList size={18} aria-hidden="true" />
            <span>Attendance</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=homework">
            <BookOpen size={18} aria-hidden="true" />
            <span>Homework</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=exams">
            <Award size={18} aria-hidden="true" />
            <span>Exams &amp; Results</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=fees">
            <Wallet size={18} aria-hidden="true" />
            <span>Fees &amp; Receipts</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=materials">
            <FolderOpen size={18} aria-hidden="true" />
            <span>Study Materials</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/student/dashboard?workspace=announcements">
            <Bell size={18} aria-hidden="true" />
            <span>Announcements</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}

export function StudentModuleContent({
  result,
  workspace,
}: {
  result: StudentDashboardResult;
  workspace: StudentWorkspaceKey;
}) {
  if (result.kind === 'unavailable') {
    return (
      <>
        <div className={styles.hero}>
          <p>Student dashboard</p>
          <h1>Student portal</h1>
        </div>
        <p role="status" className={styles.empty}>
          Student dashboard information is unavailable.
        </p>
      </>
    );
  }
  const data = result.data;

  switch (workspace) {
    case 'overview':
      return <StudentOverviewSection data={data} />;
    case 'profile':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>My Profile</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <StudentProfileCard data={data} showSubjects />
        </>
      );
    case 'timetable':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Timetable &amp; Subjects</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <StudentTimetableCard value={data.timetable} date={data.databaseDate} weekly />
        </>
      );
    case 'attendance':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Attendance</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <StudentAttendanceCard value={data.attendance} />
        </>
      );
    case 'homework':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Homework</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <StudentHomeworkCard value={data.homework} />
        </>
      );
    case 'exams':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Exams &amp; Results</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <div className={student.grid}>
            <StudentExamsCard value={data.exams} />
            <StudentResultsCard value={data.results} />
          </div>
        </>
      );
    case 'fees':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Fees &amp; Receipts</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <StudentFeesCard value={data.fees} />
        </>
      );
    case 'materials':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Study Materials</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <Card id="materials" icon={<FileText aria-hidden="true" />}>
            <Panel value={data.materials ?? { kind: 'unavailable' }}>
              {(rows) => (
                <Rows items={rows} empty="No published documents or study materials.">
                  {(row) => (
                    <>
                      <strong>
                        <a href={'/student/materials/' + row.id}>{row.title}</a>
                      </strong>
                      <span>{row.kind === 'document' ? 'Document' : 'Study material'}</span>
                    </>
                  )}
                </Rows>
              )}
            </Panel>
          </Card>
        </>
      );
    case 'announcements':
      return (
        <>
          <div className={styles.hero}>
            <p>Student dashboard</p>
            <h1>Announcements</h1>
            <span>
              {data.profile.displayName} · {data.profile.registration}
            </span>
          </div>
          <StudentAnnouncementsCard value={data.announcements} />
        </>
      );
  }
}

export function StudentDashboardLoading() {
  return (
    <div className={styles.shell} data-role="student">
      <aside className={styles.sidebar} aria-hidden="true" />
      <div className={styles.workspace}>
        <header className={styles.header} aria-hidden="true" />
        <main className={styles.main}>
          <StudentModuleSkeleton />
        </main>
      </div>
    </div>
  );
}

export function LiveStudentDashboard({
  result,
  workspace = 'overview',
}: {
  result: StudentDashboardResult;
  workspace?: StudentWorkspaceKey;
}) {
  if (result.kind === 'unavailable') {
    return (
      <main className={styles.main}>
        <h1>Student dashboard</h1>
        <p role="status" className={styles.empty}>
          Student dashboard information is unavailable.
        </p>
      </main>
    );
  }
  const { profile } = result.data;
  return (
    <StudentWorkspaceShell
      schoolName={profile.schoolName}
      studentName={profile.displayName}
      registration={profile.registration}
    >
      <StudentModuleContent result={result} workspace={workspace} />
    </StudentWorkspaceShell>
  );
}
