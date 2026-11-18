import Link from 'next/link';
import { attendanceStatuses } from '@/lib/services/attendance-fields';
import { readTeacherAttendance } from '@/lib/services/teacher-attendance';
import type { TeacherQuery } from '@/lib/services/teacher-dashboard';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

type Ready = Extract<Awaited<ReturnType<typeof readTeacherAttendance>>, { kind: 'ready' }>;
type Filters = Ready['filters'];

function pageLink(filters: Filters, key: 'page' | 'rosterPage', value: number, anchor: string) {
  const query = new URLSearchParams({ workspace: 'attendance' });
  for (const [name, item] of Object.entries({ ...filters, [key]: value })) {
    if (item && item !== 1) query.set(name, String(item));
  }
  return '/staff/teacher?' + query.toString() + '#' + anchor;
}

function Status({ value }: { value?: string }) {
  return <span className={teacherStyles.status} data-status={value}>{value ?? 'Unrecorded or unavailable'}</span>;
}

function FiltersForm({ data }: { data: Ready }) {
  const { filters, placements, picked } = data;
  const options = picked && !placements.some(row => row.id === picked.id) ? [picked, ...placements] : placements;
  return <form action="/staff/teacher" className={styles.forms + ' ' + teacherStyles.filters}>
    <input type="hidden" name="workspace" value="attendance" />
    {data.identities ? ([['Academic year', 'year', new Map(options.map(row => [row.academic_year_id, row.year.label]))],
      ['Class', 'classId', new Map(options.map(row => [row.class_id, row.classroom.name]))],
      ['Section', 'section', new Map(options.map(row => [row.id, row.classroom.name + ' / ' + row.name]))]] as const)
      .map(([label, key, entries]) => <label key={key}>{label}
        <select name={key} defaultValue={filters[key]}>
          <option value="">All</option>
          {filters[key] && !entries.has(filters[key]) && <option value={filters[key]}>Current filter</option>}
          {[...entries].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>) : <label>Assigned section ID<input name="section" maxLength={36} defaultValue={filters.section} /></label>}
    {data.canRead && <>
      <label>Date (read only)<input name="date" type="date" defaultValue={filters.date} /></label>
      <label>History status<select name="status" defaultValue={filters.status}>
        <option value="">All</option>
        {attendanceStatuses.map(status => <option key={status}>{status}</option>)}
      </select></label>
    </>}
    <button type="submit">Apply filters</button>
  </form>;
}

function Summary({ data }: { data: Ready }) {
  const total = data.counts?.reduce((sum, count) => sum + count, 0);
  const attendance = total && data.counts ? ((data.counts[0] + data.counts[2]) / total * 100).toFixed(1) + '%' : '—';
  const metrics: [string, string | number][] = [
    ['Assigned sections', data.assignedSections ?? 'Unavailable'], ['Recorded entries', total ?? 'Unavailable'],
    ...(data.counts ?? []).map((value, i): [string, number] => [
      attendanceStatuses[i].charAt(0).toUpperCase() + attendanceStatuses[i].slice(1), value,
    ]),
    ['Attendance percentage', attendance],
  ];
  return <section className={styles.section} id="attendance-overview">
    <h1 className="text-2xl font-bold">Attendance overview</h1>
    <dl className={teacherStyles.metrics}>{metrics.map(([label, value]) =>
      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className={styles.limit}>Present plus late, divided by all recorded entries, including absent and excused. Totals use the selected class, section and date across all history pages. The history status filter only affects the table.</p>
  </section>;
}

export async function TeacherAttendance({ access, query }: {
  access: Parameters<typeof readTeacherAttendance>[0]; query: TeacherQuery;
}) {
  const data = await readTeacherAttendance(access, query);
  if (data.kind !== 'ready') return <section className={styles.section} id="attendance-overview">
    <h1 className="text-2xl font-bold">Attendance overview</h1>
    <p role={data.kind === 'error' ? 'alert' : undefined} className={data.kind === 'denied' ? styles.empty : styles.failure}>
      {data.kind === 'denied' ? 'Your membership does not grant attendance access.' :
        data.kind === 'unassigned' ? 'That section is unavailable in your current assignments.' :
        data.kind === 'invalid' ? 'Check the attendance filters.' : 'Attendance records could not be loaded.'}
    </p>
    <Link href="/staff/teacher?workspace=attendance">Reset attendance filters</Link>
  </section>;

  const { filters } = data;
  const labels = new Map(data.placements.map(section => [section.id, section.classroom.name + ' / ' + section.name]));
  if (data.picked) labels.set(data.picked.id, data.picked.classroom.name + ' / ' + data.picked.name);
  return <>
    <Summary data={data} />
    <section className={styles.section} id="class-attendance">
      <h2>Class attendance</h2>
      <div className={styles.record}>
        <FiltersForm key={JSON.stringify(filters)} data={data} />
        {data.morePlacements && <p className={styles.limit}>The filter shows the first 200 assigned sections.</p>}
        {!data.identities && <p className={styles.empty}>Student identities and class rosters require student-read permission.</p>}
        {data.identities && data.canRead && data.roster === null && <p className={styles.empty}>Choose an assigned section and date to view the read-only roster.</p>}
        {data.roster?.length === 0 && <p className={styles.empty}>No visible enrollments for this section and date.</p>}
        {!!data.roster?.length && <div className={styles.tableScroll} role="region" aria-label="Class roster" tabIndex={0}>
          <table><thead><tr><th>Student</th><th>Registration</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>{data.roster.map(row => <tr key={row.id}>
              <td>{row.name ?? 'Identity unavailable'}</td><td>{row.registration ?? '—'}</td>
              <td><Status value={row.status} /></td><td>{row.remarks ?? '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {(data.roster !== null || data.writeStudents.length > 0) && <nav aria-label="Roster pages" className={teacherStyles.pagination}>
          {filters.rosterPage > 1 && <Link href={pageLink(filters, 'rosterPage', filters.rosterPage - 1, 'class-attendance')}>Previous</Link>}
          <span>Page {filters.rosterPage}</span>
          {data.rosterNext && <Link href={pageLink(filters, 'rosterPage', filters.rosterPage + 1, 'class-attendance')}>Next</Link>}
        </nav>}
      </div>
    </section>
    <section className={styles.section} id="attendance-history">
      <h2>Attendance history</h2>
      {!data.canRead ? <p className={styles.empty}>Attendance history requires attendance-read permission.</p> :
        <div className={styles.record}>
          {!data.history.length ? <p className={styles.empty}>No visible attendance records match these filters.</p> :
            <div className={styles.tableScroll} role="region" aria-label="Attendance history" tabIndex={0}>
              <table><thead><tr><th>Date</th><th>Section</th><th>Student</th><th>Status</th><th>Remarks</th></tr></thead>
                <tbody>{data.history.map(row => <tr key={row.id}>
                  <td>{row.date}</td><td>{labels.get(row.section) ?? 'Assigned section'}</td>
                  <td>{row.name ?? 'Identity unavailable'}{row.registration && <><br />{row.registration}</>}</td>
                  <td><Status value={row.status} /></td><td>{row.remarks ?? '—'}</td>
                </tr>)}</tbody>
              </table>
            </div>}
          <nav aria-label="Attendance history pages" className={teacherStyles.pagination}>
            {filters.page > 1 && <Link href={pageLink(filters, 'page', filters.page - 1, 'attendance-history')}>Previous</Link>}
            <span>Page {filters.page}</span>
            {data.next && <Link href={pageLink(filters, 'page', filters.page + 1, 'attendance-history')}>Next</Link>}
          </nav>
        </div>}
    </section>
  </>;
}
