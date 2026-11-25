import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { LiveManagementForm } from './live-management-form';
import { Suspense, type ReactNode } from 'react';
import { ArrowUpRight, BarChart3, BookOpen, CalendarDays, ClipboardList, GraduationCap, LayoutDashboard, ListChecks, LogOut, Megaphone, Menu, Settings, ShieldCheck, Users, Wallet } from 'lucide-react';
import { logoutStaff } from '@/app/login/staff/actions';
import { LoadingSkeleton } from '@/components/dashboard/primitives';
import { Brand } from '@/components/shared/brand';
import { readLiveWorkspace } from '@/lib/services/live-workspace';
import { readStudentDirectory } from '@/lib/services/student-directory';
import { StudentDirectory } from './student-directory';
import { readStaffDirectory } from '@/lib/services/staff-directory';
import { StaffDirectory } from './staff-directory';
import { StaffExpenseDrafts } from './staff-expense-drafts';
import { AcademicDirectory } from './academic-management';
import { readAcademicOptions, readAcademicPage, readAssignmentStaffOptions } from '@/lib/services/academic-directory';
import { AttendanceManagement } from './attendance-management';
import { readAttendance, readAttendancePlacements } from '@/lib/services/attendance-workspace';
import { TimetableManagement } from './timetable-management';
import { readTimetable, readTimetableOptions } from '@/lib/services/timetable-workspace';
import admissionStyles from './admissions.module.css';
import { FeeManagement } from './fee-management';
import { readFinanceOptions, readFinanceWorkspace } from '@/lib/services/fee-workspace';
import { AnnouncementManagement } from './announcement-management';
import { readAnnouncements } from '@/lib/services/announcement-workspace';
import { ReportManagement } from './report-management';
import { readReportsWorkspace } from '@/lib/services/report-workspace';
import { SchoolSettingsManagement } from './school-settings-management';
import { readSchoolSettingsWorkspace } from '@/lib/services/school-settings-workspace';
import { HomeworkManagement } from './homework-management';
import { readHomework } from '@/lib/services/homework-workspace';
import { ExamManagement } from './exam-management';
import { readExams } from '@/lib/services/exam-workspace';
import { AdminModuleNavigation } from './admin-module-navigation';
import styles from './live-admin-dashboard.module.css';

type Records = Awaited<ReturnType<typeof readLiveWorkspace>>['records'];
const groups = [
  { title: 'People', sections: [
    { id: 'students', label: 'Students', icon: GraduationCap, tables: [] },
    { id: 'staff-records', label: 'Staff', icon: Users, tables: [] },
    { id: 'admissions', label: 'Admissions', icon: ClipboardList, tables: [] },
  ] },
  { title: 'Academics', sections: [
    { id: 'classes', label: 'Academic Management', icon: BookOpen, tables: [] },
    { id: 'attendance', label: 'Attendance', icon: ListChecks, tables: [] },
    { id: 'timetable', label: 'Timetable', icon: CalendarDays, tables: [] },
    { id: 'homework', label: 'Homework', icon: BookOpen, tables: [] },
    { id: 'examinations', label: 'Exams & Results', icon: ClipboardList, tables: [] },
  ] },
  { title: 'Finance', sections: [
    { id: 'fees', label: 'Fees and Payments', icon: Wallet, tables: ['Expenses'] },
  ] },
  { title: 'Operations', sections: [
    { id: 'announcements', label: 'Announcements', icon: Megaphone, tables: [] },
    { id: 'audit', label: 'Audit', icon: ShieldCheck, tables: ['Audit'] },
    { id: 'school-settings', label: 'School Settings', icon: Settings, tables: [] },
  ] },
  { title: 'Analytics', sections: [
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, tables: [] },
  ] },
] as const;

function RecordTable({ record }: { record: Records[number] }) {
  return <article className={styles.record}>
    <h3>{record.title}</h3>
    {record.unavailable ? <p className={styles.failure} role="status">These records could not be loaded. Refresh to try again.</p>
      : !record.rows.length ? <p className={styles.empty}>No accessible records to display.</p>
      : <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={record.title + ' table'}>
        <table aria-label={record.title}>
          <thead><tr>{record.columns.map(column => <th key={column} scope="col">{column.replaceAll('_', ' ')}</th>)}</tr></thead>
          <tbody>{record.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>}
  </article>;
}

export function AdminDashboardLoading() {
  return <main className={styles.loading} aria-busy="true"><LoadingSkeleton /></main>;
}

export async function LiveAdminDashboard() {
  return <AdminDashboardView data={await readLiveWorkspace('admin')} />;
}

async function LiveStudentDirectory() {
  return <StudentDirectory initial={await readStudentDirectory()} />;
}

async function LiveStaffDirectory() {
  return <StaffDirectory initial={await readStaffDirectory()} />;
}

async function AdmissionEnrollments() {
  return <section className={admissionStyles.records} aria-labelledby="admission-enrollments-heading">
    <h2 id="admission-enrollments-heading">Enrollment records</h2>
    <p>Search student enrollment records to check a placement or follow up on an admission.</p>
    <StudentDirectory initial={await readStudentDirectory(new FormData(), 'admissions')} admissions />
  </section>;
}

async function AcademicManagement() {
  const kinds = ['years', 'classes', 'sections', 'assignments'] as const;
  const [options, staff, ...pages] = await Promise.all([
    readAcademicOptions(), readAssignmentStaffOptions(), ...kinds.map(kind => readAcademicPage(kind)),
  ]);
  return <>
    {(['class', 'section', 'assignment'] as const).map(kind => (
      <LiveManagementForm key={kind} kind={kind} requestId={randomUUID()} recordId={randomUUID()} options={options} staff={staff} />
    ))}
    {kinds.map((kind, index) => <AcademicDirectory key={kind} kind={kind} initial={pages[index]} options={options} staff={staff} />)}
  </>;
}

async function LiveAttendance({ canRead, canRoster, canWrite }: { canRead: boolean; canRoster: boolean; canWrite: boolean }) {
  const [catalog, initial] = await Promise.all([readAttendancePlacements(), canRead ? readAttendance() : null]);
  return <AttendanceManagement initial={initial} {...catalog} canRead={canRead} canRoster={canRoster} canWrite={canWrite} />;
}

async function LiveTimetable({ identifiers }: { identifiers?: { requestId: string; recordId: string } }) {
  const [initial, options] = await Promise.all([readTimetable(), readTimetableOptions()]);
  return <TimetableManagement initial={initial} {...options} identifiers={identifiers} />;
}

async function LiveHomework({ canRead, identifiers }: { canRead: boolean; identifiers?: { create: string; edit: string } }) {
  const [initial, options] = await Promise.all([canRead ? readHomework() : undefined, readAcademicOptions('homework')]);
  return <HomeworkManagement initial={initial} options={options} identifiers={identifiers} />;
}

async function LiveExams({ canReadStudents }: { canReadStudents: boolean }) {
  const [initial, options] = await Promise.all([readExams(), readAcademicOptions('marks')]);
  return <ExamManagement initial={initial} options={options} studentSearch={canReadStudents} />;
}

async function LiveFees({ canReadStudents, canCollect }: { canReadStudents: boolean; canCollect: boolean }) {
  const [initial, options] = await Promise.all([readFinanceWorkspace(), readFinanceOptions()]);
  return <FeeManagement initial={initial} options={options} canReadStudents={canReadStudents} canCollect={canCollect} />;
}

async function LiveAnnouncements() {
  const initial = await readAnnouncements();
  return <AnnouncementManagement initial={initial} />;
}

async function LiveReports() {
  const initial = await readReportsWorkspace();
  return <ReportManagement initial={initial} />;
}

async function LiveSchoolSettings() {
  const initial = await readSchoolSettingsWorkspace();
  return <SchoolSettingsManagement initial={initial} />;
}

export function AdminDashboardView({ data }: { data: Awaited<ReturnType<typeof readLiveWorkspace>> }) {
  const forms: Record<string, ReactNode> = {
    students: data.canReadStudents && <Suspense fallback={<p role="status">Loading student records…</p>}>
      <LiveStudentDirectory />
    </Suspense>,
    'staff-records': data.canReadStaff && <Suspense fallback={<p role="status">Loading staff directory…</p>}>
      <LiveStaffDirectory />
    </Suspense>,
    admissions: data.canReadAdmissionEnrollments && <Suspense fallback={<p role="status">Loading enrollment records…</p>}>
      <AdmissionEnrollments />
    </Suspense>,
    classes: data.canManageAcademics && <Suspense fallback={<p role="status">Loading academic records…</p>}>
      <AcademicManagement />
    </Suspense>,
    attendance: data.canReadAttendance && <Suspense fallback={<p role="status">Loading attendance workspace…</p>}>
      <LiveAttendance canRead={data.canReadAttendance} canRoster={data.canReadStudents} canWrite={false} />
    </Suspense>,
    timetable: data.canReadTimetable && <Suspense fallback={<p role="status">Loading timetable…</p>}>
      <LiveTimetable />
    </Suspense>,
    homework: data.canReadHomework && <Suspense fallback={<p role="status">Loading homework…</p>}>
      <LiveHomework canRead={data.canReadHomework} />
    </Suspense>,
    examinations: data.canReadMarks && <Suspense fallback={<p role="status">Loading exams…</p>}>
      <LiveExams canReadStudents={data.canReadStudents} />
    </Suspense>,
    fees: (data.canReadFees || data.canReadReceipts || data.canReadExpenses) && (
      <Suspense fallback={<p role="status">Loading financial workspace…</p>}>
        {(data.canReadFees || data.canReadReceipts) && <LiveFees canReadStudents={data.canReadStudents} canCollect={false} />}
        {data.canReadExpenses && <StaffExpenseDrafts role="admin" />}
      </Suspense>
    ),
    announcements: data.canReadAnnouncements && (
      <Suspense fallback={<p role="status">Loading announcements workspace…</p>}>
        <LiveAnnouncements />
      </Suspense>
    ),
    reports: data.canReadReports && (
      <Suspense fallback={<p role="status">Loading reports & analytics…</p>}>
        <LiveReports />
      </Suspense>
    ),
    'school-settings': data.canReadSettings && (
      <Suspense fallback={<p role="status">Loading school settings…</p>}>
        <LiveSchoolSettings />
      </Suspense>
    ),
  };
  const visible = groups.map(group => ({ ...group, sections: group.sections.flatMap(section => {
    const records = data.records.filter(record => (section.tables as readonly string[]).includes(record.title));
    return records.length || forms[section.id] ? [{ ...section, records }] : [];
  }) })).filter(group => group.sections.length);
  const school = data.schoolName || 'Selected school';
  const navigation = <>
    <p>Overview</p><a data-admin-module="overview" href="#overview"><LayoutDashboard size={17} aria-hidden="true" /> Dashboard overview</a>
    {visible.map(group => <div key={group.title}>
      <p>{group.title}</p>
      {group.sections.map(({ id, label, icon: Icon }) => <a key={id} data-admin-module={id} href={'#' + id}><Icon size={17} aria-hidden="true" /> {label}</a>)}
    </div>)}
  </>;
  const panels = [
    { id: 'overview', content: <div className={styles.panel}>
        <section id="overview" tabIndex={-1} className={styles.hero} aria-labelledby="admin-welcome">
          <p>School administration</p>
          <h1 id="admin-welcome" tabIndex={-1}>Admin dashboard</h1>
          <span>Welcome to {school}. Choose a workspace below to manage school operations.</span>
        </section>
        {visible.length ? <section aria-labelledby="shortcuts">
          <h2 id="shortcuts">Workspace shortcuts</h2>
          <div className={styles.shortcuts}>
            {visible.flatMap(group => group.sections.map(({ id, label, icon: Icon }) => <a key={id} data-admin-module={id} href={'#' + id}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span><ArrowUpRight size={15} aria-hidden="true" />
            </a>))}
          </div>
        </section> : <p className={styles.empty}>No record modules or actions are available to this membership.</p>}
      </div> },
    ...visible.flatMap(group => group.sections.map(({ id, label, records }) => ({
      id,
      content: <section id={id} className={styles.panel} aria-labelledby={id + '-heading'}>
        <div className={styles.moduleHeader}>
          <p className={styles.category}>{group.title}</p>
          <h1 id={id + '-heading'} tabIndex={-1}>{label}</h1>
          {!!records.length && <p className={styles.limit}>Each list shows up to 50 accessible records.</p>}
        </div>
        {forms[id] && <div className={styles.forms}>{forms[id]}</div>}
        {records.map(record => <RecordTable key={record.title} record={record} />)}
      </section>,
    }))),
  ];
  return <AdminModuleNavigation panels={panels}
    sidebar={<aside className={styles.sidebar}>
      <Link href="/staff" aria-label="Brightcamp Staff Workspace"><Brand /></Link>
      <div className={styles.sidebarRoleBadge}>
        <span>Admin workspace</span>
      </div>
      <nav aria-label="Admin workspace">{navigation}</nav>
    </aside>}
    header={<header className={styles.header}>
      <div className={styles.identity}><ShieldCheck size={23} aria-hidden="true" /><div><strong>{school}</strong><span>Administration</span></div></div>
      <form action={logoutStaff}><button className={styles.signOut}><LogOut size={17} aria-hidden="true" /> Sign out</button></form>
    </header>}
    mobile={<details className={styles.mobile} data-admin-drawer>
      <summary><Menu size={18} aria-hidden="true" /> Workspace navigation</summary>
      <nav aria-label="Admin workspace">
        <Link href="/staff">Back to Staff Workspace</Link>
        {navigation}
      </nav>
    </details>}
  />;
}
