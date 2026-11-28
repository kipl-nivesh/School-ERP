import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  Megaphone,
  NotebookPen,
} from 'lucide-react';
import { readTeacherClasses, readTeacherOverview, type TeacherQuery } from '@/lib/services/teacher-dashboard';
import { evaluatePermission } from '@/lib/auth/authorization';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';
import { resolveTeacherWorkspace } from '@/lib/staff/teacher-workspace';
import {
  TeacherModuleSkeleton,
  TeacherWorkspaceShell,
} from './teacher-workspace-shell';
import { TeacherAttendance } from './teacher-attendance';
import { TeacherHomework } from './teacher-homework';
import { TeacherTimetable } from './teacher-timetable';
import { TeacherExams } from './teacher-exams';
import { TeacherAnnouncements } from './teacher-announcements';
import { TeacherReports } from './teacher-reports';

type Access = Parameters<typeof readTeacherOverview>[0];
type ClassesReady = Extract<Awaited<ReturnType<typeof readTeacherClasses>>, { kind: 'ready' }>;

const subjects = (section: Pick<ClassesReady['rows'][number], 'assignment'>) =>
  [...new Set(section.assignment.map(item => item.subject_code))].sort().join(', ');

function classesLink(filters: ClassesReady['filters'], changes: Partial<ClassesReady['filters']>, anchor: string) {
  const query = new URLSearchParams({ workspace: 'classes' });
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value && value !== 1) query.set(key, String(value));
  }
  return '/staff/teacher?' + query.toString() + '#' + anchor;
}

async function TeacherOverviewPanel({ access }: { access: Access }) {
  const data = await readTeacherOverview(access);
  return (
    <>
      <section id="overview" className={styles.hero}>
        <p>Teacher workspace</p>
        <h1>Teaching overview</h1>
        <span>{access.schoolName}</span>
      </section>
      {data.kind === 'denied' && (
        <p className={styles.empty}>Your membership does not grant access to class records or student rosters.</p>
      )}
      {data.kind === 'error' && (
        <p role="alert" className={styles.failure}>
          Teacher overview could not be loaded. <Link href="/staff/teacher?workspace=overview">Reload workspace</Link>
        </p>
      )}
      {data.kind === 'ready' && (
        <>
          <dl className={teacherStyles.metrics}>
            <div><dt>Assigned classes</dt><dd>{data.classCount}</dd></div>
            <div><dt>Assigned sections</dt><dd>{data.sectionCount}</dd></div>
            <div><dt>Students in assigned sections</dt><dd>{data.studentCount}</dd></div>
            <div><dt>Weekly teaching periods</dt><dd>{data.periodCount}</dd></div>
          </dl>
          {data.sectionCount === 0 && (
            <p className={styles.empty}>
              No classes or subjects are currently assigned to your Teacher account. Contact your School Admin to assign sections and subjects.
            </p>
          )}
          <section className={styles.section} aria-label="Teacher modules">
            <h2>Quick module access</h2>
            <div className={styles.shortcuts}>
              <Link href="/staff/teacher?workspace=classes">
                <BookOpen size={18} aria-hidden="true" />
                <span>My Classes</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/staff/teacher?workspace=timetable">
                <CalendarDays size={18} aria-hidden="true" />
                <span>Timetable</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/staff/teacher?workspace=attendance">
                <ClipboardList size={18} aria-hidden="true" />
                <span>Attendance</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/staff/teacher?workspace=homework">
                <NotebookPen size={18} aria-hidden="true" />
                <span>Homework</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/staff/teacher?workspace=exams">
                <FileText size={18} aria-hidden="true" />
                <span>Exams &amp; Marks</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/staff/teacher?workspace=announcements">
                <Megaphone size={18} aria-hidden="true" />
                <span>Staff Announcements</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/staff/teacher?workspace=reports">
                <BarChart3 size={18} aria-hidden="true" />
                <span>Teaching Reports</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}

async function TeacherClassesPanel({ access, query }: { access: Access; query: TeacherQuery }) {
  const data = await readTeacherClasses(access, query);
  if (data.kind !== 'ready') {
    return (
      <section id="my-classes" className={styles.section}>
        <div className={styles.moduleHeader}>
          <h1>My Classes</h1>
          <p className={styles.limit}>Assigned classes, sections, subjects and authorized student rosters.</p>
        </div>
        <p role={data.kind === 'error' ? 'alert' : undefined} className={data.kind === 'denied' ? styles.empty : styles.failure}>
          {data.kind === 'denied'
            ? 'Your membership does not grant access to class records or student rosters.'
            : data.kind === 'invalid'
              ? 'The requested class filters are invalid.'
              : 'Assigned classes could not be loaded.'}
        </p>
        {data.kind !== 'denied' && <Link className={teacherStyles.textLink} href="/staff/teacher?workspace=classes">Reset filters</Link>}
      </section>
    );
  }

  const { filters, detail } = data;
  const years = new Map(data.options.map(row => [row.academic_year_id, row.year.label]));
  const classes = new Map(data.options.map(row => [row.class_id, row.classroom.name]));
  const sections = new Map(data.options.map(row => [row.id, row.classroom.name + ' / ' + row.name]));

  return (
    <>
      <section id="my-classes" className={styles.section}>
        <div className={styles.moduleHeader}>
          <h1>My Classes</h1>
          <p className={styles.limit}>Assigned classes, sections, subjects and authorized student rosters.</p>
        </div>
        <div className={styles.record}>
          <form action="/staff/teacher" className={styles.forms + ' ' + teacherStyles.filters}>
            <input type="hidden" name="workspace" value="classes" />
            {([['Academic year', 'year', years], ['Class', 'classId', classes], ['Section', 'section', sections]] as const).map(([label, key, options]) => (
              <label key={key}>
                {label}
                <select name={key} defaultValue={filters[key]}>
                  <option value="">All</option>
                  {filters[key] && !options.has(filters[key]) && <option value={filters[key]}>Current filter</option>}
                  {[...options].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            ))}
            <button type="submit">Apply filters</button>
          </form>
          {data.moreOptions && (
            <p className={styles.limit}>Filter choices show the first 200 assigned sections. The directory includes all matching assignments.</p>
          )}
          {data.rows.length === 0 ? (
            <p className={styles.empty}>
              No classes or sections are assigned for the selected filters. Contact your School Admin if you expect class assignments.
            </p>
          ) : (
            <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Assigned classes and sections">
              <table>
                <thead>
                  <tr><th>Class and section</th><th>Academic year</th><th>Subjects</th><th>Students</th></tr>
                </thead>
                <tbody>
                  {data.rows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className={teacherStyles.textLink}
                          href={classesLink(filters, { detail: row.id, rosterPage: 1 }, 'class-detail')}
                        >
                          {row.classroom.name} / {row.name}
                        </Link>
                      </td>
                      <td>{row.year.label}</td>
                      <td>{subjects(row)}</td>
                      <td>{row.studentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav aria-label="Class pages" className={teacherStyles.pagination}>
            {filters.page > 1 && (
              <Link href={classesLink(filters, { page: filters.page - 1, detail: '', rosterPage: 1 }, 'my-classes')}>Previous</Link>
            )}
            <span>Page {filters.page}</span>
            {data.hasNext && (
              <Link href={classesLink(filters, { page: filters.page + 1, detail: '', rosterPage: 1 }, 'my-classes')}>Next</Link>
            )}
          </nav>
        </div>
      </section>
      {(detail || data.detailDenied) && (
        <section id="class-detail" className={styles.section}>
          <h2>Class roster</h2>
          {data.detailDenied && (
            <p className={styles.failure}>This section is unavailable in your current Teacher assignments.</p>
          )}
          {detail && (
            <div className={styles.record}>
              <h3>{detail.section.classroom.name} / {detail.section.name}</h3>
              <p>{detail.section.year.label} · {subjects(detail.section)} · {detail.studentCount} students</p>
              {detail.students.length === 0 ? (
                <p className={styles.empty}>No current enrollments on this page.</p>
              ) : (
                <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Authorized student roster">
                  <table>
                    <thead>
                      <tr><th>Student</th><th>Registration number</th><th>Enrollment status</th></tr>
                    </thead>
                    <tbody>
                      {detail.students.map(student => (
                        <tr key={student.id}>
                          <td>{student.display_name}</td>
                          <td>{student.registration_number}</td>
                          <td>{student.enrollment_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <nav aria-label="Roster pages" className={teacherStyles.pagination}>
                {filters.rosterPage > 1 && (
                  <Link href={classesLink(filters, { rosterPage: filters.rosterPage - 1 }, 'class-detail')}>Previous</Link>
                )}
                <span>Page {filters.rosterPage}</span>
                {detail.hasNext && (
                  <Link href={classesLink(filters, { rosterPage: filters.rosterPage + 1 }, 'class-detail')}>Next</Link>
                )}
              </nav>
            </div>
          )}
        </section>
      )}
    </>
  );
}

async function TeacherModuleContent({ access, query }: { access: Access; query: TeacherQuery }) {
  const workspace = resolveTeacherWorkspace(query.workspace);
  switch (workspace) {
    case 'classes':
      return <TeacherClassesPanel access={access} query={query} />;
    case 'timetable':
      return <TeacherTimetable access={access} query={query} />;
    case 'attendance':
      return <TeacherAttendance access={access} query={query} />;
    case 'homework':
      return <TeacherHomework access={access} query={query} />;
    case 'exams':
      return <TeacherExams access={access} query={query} />;
    case 'announcements':
      return <TeacherAnnouncements access={access} />;
    case 'reports':
      return <TeacherReports access={access} query={query} />;
    case 'overview':
    default:
      return <TeacherOverviewPanel access={access} />;
  }
}

export function TeacherDashboardLoading() {
  return <TeacherModuleSkeleton />;
}

export async function LiveTeacherDashboard({ access, query }: { access: Access; query: TeacherQuery }) {
  const canOpenClasses = evaluatePermission(access.context, 'students.read', access.context.session.verifiedAt).allowed;
  const workspace = resolveTeacherWorkspace(query.workspace);

  return (
    <TeacherWorkspaceShell
      schoolName={access.schoolName ?? 'School workspace'}
      profileId={access.context.profileId}
      canOpenClasses={canOpenClasses}
    >
      <Suspense key={workspace} fallback={<TeacherModuleSkeleton label={workspace} />}>
        <TeacherModuleContent access={access} query={query} />
      </Suspense>
    </TeacherWorkspaceShell>
  );
}
