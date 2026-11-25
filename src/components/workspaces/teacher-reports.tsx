import { evaluatePermission } from '@/lib/auth/authorization';
import { attendanceStatuses } from '@/lib/services/attendance-fields';
import { readTeacherAttendance } from '@/lib/services/teacher-attendance';
import { readTeacherExams } from '@/lib/services/teacher-exams';
import type { TeacherQuery } from '@/lib/services/teacher-dashboard';
import styles from './live-admin-dashboard.module.css';

type Access = Parameters<typeof readTeacherAttendance>[0];

export async function TeacherReports({ access, query }: { access: Access; query: TeacherQuery }) {
  if (!evaluatePermission(access.context, 'reports.read', access.context.session.verifiedAt).allowed) {
    return <p role="status">Your membership does not grant report access.</p>;
  }
  const { section, subject, date } = query;
  const [attendance, exams] = await Promise.all([
    readTeacherAttendance(access, { section, date }),
    readTeacherExams(access, { section, subject }),
  ]);
  const placements = attendance.kind === 'ready' ? attendance.placements : [];
  const options = 'options' in exams ? exams.options : [];
  const sections = new Map([
    ...placements.map(row => [row.id, row.classroom.name + ' / ' + row.name] as const),
    ...options.map(row => [row.section, row.placement ? row.placement.classroom.name + ' / ' + row.placement.name : row.section] as const),
  ]);
  const examMetrics = ['Exam sheets', 'Upcoming exam dates', 'Past exam dates', 'Published', 'Draft'];
  return <section className={styles.record} aria-labelledby="teacher-reports">
    <h1 id="teacher-reports">Teaching reports</h1>
    <form action="/staff/teacher" className={styles.forms}>
      <input type="hidden" name="workspace" value="reports" />
      <label>Assigned section<select name="section" defaultValue={typeof section === 'string' ? section : ''}>
        <option value="">All assigned sections for attendance</option>
        {[...sections].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Subject code for exams<input name="subject" maxLength={80} list="teacher-report-subjects"
        defaultValue={typeof subject === 'string' ? subject : ''} /></label>
      <datalist id="teacher-report-subjects">{[...new Set(options.map(row => row.subject))].map(code =>
        <option key={code} value={code} />)}</datalist>
      <label>Attendance date<input name="date" type="date" defaultValue={typeof date === 'string' ? date : ''} /></label>
      <button type="submit">Apply report filters</button>
    </form>
    <h2>Attendance totals</h2>
    {attendance.kind === 'ready' && attendance.counts ? <dl>
      {attendance.counts.map((value, index) => <div key={attendanceStatuses[index]}>
        <dt>{attendanceStatuses[index]}</dt><dd>{value}</dd>
      </div>)}
    </dl> : <p role="status">Attendance totals are unavailable for this membership or selection.</p>}
    <h2>Exam totals</h2>
    {exams.kind === 'ready' && exams.counts ? <dl>{exams.counts.map((value, index) => <div key={examMetrics[index]}>
      <dt>{examMetrics[index]}</dt><dd>{value}</dd>
    </div>)}</dl> : <p role="status">{exams.kind === 'ready' ? 'Exam totals could not be loaded.' :
      'Choose an assigned section and subject to view exam totals.'}</p>}
  </section>;
}
