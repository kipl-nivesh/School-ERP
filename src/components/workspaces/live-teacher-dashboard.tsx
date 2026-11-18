import Link from 'next/link';
import { BookOpen, CalendarDays, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, NotebookPen, Users } from 'lucide-react';
import { logoutStaff } from '@/app/login/staff/actions';
import { Brand } from '@/components/shared/brand';
import { readTeacherDashboard, type TeacherQuery } from '@/lib/services/teacher-dashboard';
import { evaluatePermission } from '@/lib/auth/authorization';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';
import { TeacherAttendance } from './teacher-attendance';
import { TeacherHomework } from './teacher-homework';
import { TeacherTimetable } from './teacher-timetable';
import { TeacherExams } from './teacher-exams';

type Access = Parameters<typeof readTeacherDashboard>[0];
type Ready = Extract<Awaited<ReturnType<typeof readTeacherDashboard>>, { kind: 'ready' }>;
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const subjects = (section: Pick<Ready['rows'][number], 'assignment'>) =>
  [...new Set(section.assignment.map(item => item.subject_code))].sort().join(', ');

function teacherLink(filters: Ready['filters'], changes: Partial<Ready['filters']>, anchor: string) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value && value !== 1) query.set(key, String(value));
  }
  return '/staff/teacher' + (query.size ? '?' + query.toString() : '') + '#' + anchor;
}

function Navigation({ permitted, attendance, homework, timetable, exams }: {
  permitted: boolean; attendance: boolean; homework: boolean; timetable: boolean; exams: boolean;
}) {
  const home = attendance || homework || timetable || exams ? '/staff/teacher' : '';
  return <nav aria-label="Teacher workspace">
    <Link href={home + '#overview'}><LayoutDashboard size={18} /> Overview</Link>
    {permitted && <>
      <Link href={home + '#my-classes'}><BookOpen size={18} /> My Classes</Link>
      <Link href="/staff/teacher?workspace=timetable#teacher-schedule" aria-current={timetable ? 'page' : undefined}>
        <CalendarDays size={18} /> Timetable
      </Link>
    </>}
    <Link href="/staff/teacher?workspace=attendance#attendance-overview" aria-current={attendance ? 'page' : undefined}>
      <ClipboardList size={18} /> Attendance
    </Link>
    {attendance && <>
      <Link href="#class-attendance">Class Attendance</Link>
      <Link href="#attendance-history">Attendance History</Link>
    </>}
    <Link href="/staff/teacher?workspace=homework#homework-overview" aria-current={homework ? 'page' : undefined}>
      <NotebookPen size={18} /> Homework
    </Link>
    <Link href="/staff/teacher?workspace=exams#teacher-exams" aria-current={exams ? 'page' : undefined}>
      <FileText size={18} /> Exams &amp; Marks
    </Link>
  </nav>;
}

function Directory({ data }: { data: Ready }) {
  const { filters, detail } = data;
  const years = new Map(data.options.map(row => [row.academic_year_id, row.year.label]));
  const classes = new Map(data.options.map(row => [row.class_id, row.classroom.name]));
  const sections = new Map(data.options.map(row => [row.id, row.classroom.name + ' / ' + row.name]));
  return <>
    <section id="my-classes" className={styles.section}>
      <h2>My Classes</h2>
      <div className={styles.record}>
        <form action="/staff/teacher" className={styles.forms + ' ' + teacherStyles.filters}>
          {([['Academic year', 'year', years], ['Class', 'classId', classes], ['Section', 'section', sections]] as const).map(([label, key, options]) =>
            <label key={key}>{label}
              <select name={key} defaultValue={filters[key]}>
                <option value="">All</option>
                {filters[key] && !options.has(filters[key]) && <option value={filters[key]}>Current filter</option>}
                {[...options].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>)}
          <button type="submit">Apply filters</button>
        </form>
        {data.moreOptions && <p className={styles.limit}>Filter choices show the first 200 assigned sections. The directory includes all matching assignments.</p>}
        {data.rows.length === 0 ? <p className={styles.empty}>No assigned sections on this page.</p> :
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Assigned classes and sections">
            <table>
              <thead><tr><th>Class and section</th><th>Academic year</th><th>Subjects</th><th>Students</th></tr></thead>
              <tbody>{data.rows.map(row => <tr key={row.id}>
                <td><Link className={teacherStyles.textLink} href={teacherLink(filters, { detail: row.id, rosterPage: 1 }, 'class-detail')}>
                  {row.classroom.name} / {row.name}
                </Link></td><td>{row.year.label}</td><td>{subjects(row)}</td><td>{row.studentCount}</td>
              </tr>)}</tbody>
            </table>
          </div>}
        <nav aria-label="Class pages" className={teacherStyles.pagination}>
          {filters.page > 1 && <Link href={teacherLink(filters, { page: filters.page - 1, detail: '', rosterPage: 1 }, 'my-classes')}>Previous</Link>}
          <span>Page {filters.page}</span>
          {data.hasNext && <Link href={teacherLink(filters, { page: filters.page + 1, detail: '', rosterPage: 1 }, 'my-classes')}>Next</Link>}
        </nav>
      </div>
    </section>
    {(detail || data.detailDenied) && <section id="class-detail" className={styles.section}>
      <h2>Class roster</h2>
      {data.detailDenied && <p className={styles.failure}>This section is unavailable in your current Teacher assignments.</p>}
      {detail && <div className={styles.record}>
        <h3>{detail.section.classroom.name} / {detail.section.name}</h3>
        <p>{detail.section.year.label} · {subjects(detail.section)} · {detail.studentCount} students</p>
        {detail.students.length === 0 ? <p className={styles.empty}>No current enrollments on this page.</p> :
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Authorized student roster">
            <table><thead><tr><th>Student</th><th>Registration number</th><th>Enrollment status</th></tr></thead>
              <tbody>{detail.students.map(student => <tr key={student.id}>
                <td>{student.display_name}</td><td>{student.registration_number}</td><td>{student.enrollment_status}</td>
              </tr>)}</tbody>
            </table>
          </div>}
        <nav aria-label="Roster pages" className={teacherStyles.pagination}>
          {filters.rosterPage > 1 && <Link href={teacherLink(filters, { rosterPage: filters.rosterPage - 1 }, 'class-detail')}>Previous</Link>}
          <span>Page {filters.rosterPage}</span>
          {detail.hasNext && <Link href={teacherLink(filters, { rosterPage: filters.rosterPage + 1 }, 'class-detail')}>Next</Link>}
        </nav>
      </div>}
    </section>}
  </>;
}

export function TeacherDashboardLoading() {
  return <p className={styles.loading} role="status">Loading Teacher workspace…</p>;
}

export async function LiveTeacherDashboard({ access, query }: { access: Access; query: TeacherQuery }) {
  const attendance = query.workspace === 'attendance';
  const homework = query.workspace === 'homework';
  const timetable = query.workspace === 'timetable';
  const exams = query.workspace === 'exams';
  const inModule = attendance || homework || timetable || exams;
  const data = inModule ? null : await readTeacherDashboard(access, query);
  const canOpenClasses = inModule
    ? evaluatePermission(access.context, 'students.read', access.context.session.verifiedAt).allowed
    : data?.kind === 'ready';
  return <div className={styles.shell} data-role="teacher">
    <aside className={styles.sidebar}>
      <Brand />
      <div className={styles.sidebarRoleBadge}>
        <span>Teacher workspace</span>
      </div>
      <Navigation permitted={canOpenClasses} attendance={attendance} homework={homework} timetable={timetable} exams={exams} />
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.identity}><Users aria-hidden="true" size={20} />
          <div><strong>{access.schoolName}</strong><span>Teacher · {access.context.profileId.slice(0, 8)}</span></div>
        </div>
        <form action={logoutStaff}><button className={styles.signOut} type="submit"><LogOut size={16} /> Sign out</button></form>
      </header>
      <details className={styles.mobile}><summary><Menu size={18} /> Teacher navigation</summary>
        <Navigation permitted={canOpenClasses} attendance={attendance} homework={homework} timetable={timetable} exams={exams} /></details>
      <main className={styles.main}>
        {attendance && <TeacherAttendance access={access} query={query} />}
        {homework && <TeacherHomework access={access} query={query} />}
        {timetable && <TeacherTimetable access={access} query={query} />}
        {exams && <TeacherExams access={access} query={query} />}
        {data && <>
        <section id="overview" className={styles.hero}><p>Teacher workspace</p><h1>Teaching overview</h1><span>{access.schoolName}</span></section>
        {data.kind === 'denied' && <p className={styles.empty}>Your membership does not grant access to class records or student rosters.</p>}
        {data.kind === 'invalid' && <p className={styles.failure}>The requested filters are invalid. <Link href="/staff/teacher">Reset filters</Link></p>}
        {data.kind === 'error' && <p role="alert" className={styles.failure}>Teacher records could not be loaded. <Link href="/staff/teacher">Reload workspace</Link></p>}
        {data.kind === 'ready' && <>
          <dl className={teacherStyles.metrics}>
            <div><dt>Assigned classes</dt><dd>{data.classCount}</dd></div>
            <div><dt>Assigned sections</dt><dd>{data.sectionCount}</dd></div>
            <div><dt>Students in assigned sections</dt><dd>{data.studentCount}</dd></div>
            <div><dt>Weekly teaching periods</dt><dd>{data.periods.length}</dd></div>
          </dl>
          <Directory data={data} />
          <section id="timetable" className={styles.section}>
            <h2>Weekly timetable</h2>
            <Link className={teacherStyles.textLink} href="/staff/teacher?workspace=timetable#teacher-schedule">Open timetable</Link>
            {data.periods.length === 0 && <p className={styles.empty}>No teaching periods are scheduled for your active assignments.</p>}
            <div className={teacherStyles.week}>
              {days.map(day => ({ day, periods: data.periods.filter(period => period.day_of_week === day) }))
                .filter(entry => entry.periods.length > 0).map(({ day, periods }) =>
                  <div key={day} className={styles.record}><h3>{day}</h3>
                    <ul className={teacherStyles.periods}>{periods.map(period => <li key={period.id}>
                      <strong>{period.start_time.slice(0, 5)} – {period.end_time.slice(0, 5)}</strong>
                      <span>{period.section.classroom.name} / {period.section.name} · {period.subject_code}</span>
                    </li>)}</ul>
                  </div>)}
            </div>
          </section>
        </>}
        </>}
      </main>
    </div>
  </div>;
}
