import Link from 'next/link';
import { readTeacherTimetable } from '@/lib/services/teacher-timetable';
import { timetableDays } from '@/lib/services/timetable-fields';
import type { TeacherQuery } from '@/lib/services/teacher-dashboard';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

type Ready = Extract<Awaited<ReturnType<typeof readTeacherTimetable>>, { kind: 'ready' }>;
type Period = Ready['rows'][number];
const root = '/staff/teacher?workspace=timetable';

function timetableLink(filters: Ready['filters'], changes: Partial<Ready['filters']>, anchor = 'teacher-schedule') {
  const query = new URLSearchParams({ workspace: 'timetable' });
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value && value !== 1) query.set(key, String(value));
  }
  return '/staff/teacher?' + query.toString() + '#' + anchor;
}

function conflictLabel(period: Period) {
  if (!period.conflict) return '';
  return period.conflict.section ? 'Teacher and section overlap in visible periods' : 'Teacher overlap in visible periods';
}

function Filters({ data }: { data: Ready }) {
  const { filters, options } = data;
  return <form action="/staff/teacher" className={styles.forms + ' ' + teacherStyles.filters}>
    <input type="hidden" name="workspace" value="timetable" />
    <input type="hidden" name="view" value={filters.view} />
    {([['Academic year', 'year'], ['Class', 'classId'], ['Section', 'section'], ['Subject', 'subject']] as const).map(([label, key]) =>
      <label key={key}>{label}<select name={key} defaultValue={filters[key]}>
        <option value="">All</option>
        {filters[key] && !options[key].some(([id]) => id === filters[key]) && <option value={filters[key]}>Current filter</option>}
        {options[key].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>)}
    <label>Day<select name="day" defaultValue={filters.day}>
      {filters.view !== 'day' && <option value="">All school days</option>}
      {timetableDays.map(day => <option key={day}>{day}</option>)}
    </select></label>
    <button type="submit">Apply filters</button>
  </form>;
}

function PeriodLink({ period, filters }: { period: Period; filters: Ready['filters'] }) {
  return <Link className={teacherStyles.textLink}
    href={timetableLink(filters, { detail: period.id }, 'period-detail')}>
    {period.className} / {period.sectionName} · {period.subject}
  </Link>;
}

export async function TeacherTimetable({ access, query }: {
  access: Parameters<typeof readTeacherTimetable>[0]; query: TeacherQuery;
}) {
  const data = await readTeacherTimetable(access, query);
  return <section id="teacher-schedule" className={styles.section}>
    <h1 className="text-2xl font-bold">Teaching timetable</h1>
    {data.kind !== 'ready' ? <>
      <p role={data.kind === 'error' ? 'alert' : undefined} className={data.kind === 'denied' ? styles.empty : styles.failure}>
        {data.kind === 'denied' ? 'Your membership does not grant timetable access.' :
          data.kind === 'unassigned' ? 'This section is unavailable in your current assignments.' :
          data.kind === 'invalid' ? 'Check the requested timetable filters.' : 'The timetable could not be loaded.'}
      </p>
      {data.kind !== 'denied' && <Link href={root}>Reset timetable filters</Link>}
    </> : <>
      <p className={styles.limit}>Times are shown as scheduled. The timetable stores Monday through Saturday and has no school-local timezone.</p>
      <nav className={teacherStyles.pagination} aria-label="Timetable views">
        {([['week', 'Weekly grid'], ['day', 'Day schedule'], ['list', 'Period list']] as const).map(([view, label]) =>
          <Link key={view} aria-current={data.filters.view === view ? 'page' : undefined}
            href={timetableLink(data.filters, { view, page: 1, detail: '', day: view === 'week' ? '' : data.filters.day })}>{label}</Link>)}
      </nav>
      <div className={styles.record}>
        <Filters key={JSON.stringify(data.filters)} data={data} />
        <p className={styles.limit}>Filter choices cover the full visible weekly schedule. Assigned sections with no scheduled periods have no selector entry.</p>
      </div>
      {data.rows.some(row => row.conflict) && <p className={styles.failure}>
        Overlaps were found among your visible periods. The Admin scheduler checks Teacher and section overlaps across the school when saving.
      </p>}
      {data.filters.view === 'list' ? <div className={styles.record}>
        <h2>Period list</h2>
        {data.rows.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Teaching periods">
          <table>
            <thead><tr><th>Day</th><th>Period</th><th>Time</th><th>Assignment</th><th>Conflict</th></tr></thead>
            <tbody>{data.rows.map(period => <tr key={period.id}>
              <td>{period.day}</td><td>{period.period}</td><td>{period.start} – {period.end}</td>
              <td><PeriodLink period={period} filters={data.filters} /></td><td>{conflictLabel(period) || '—'}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className={styles.empty}>No periods match these filters on this page.</p>}
        <nav className={teacherStyles.pagination} aria-label="Period pages">
          {data.filters.page > 1 && <Link href={timetableLink(data.filters, { page: data.filters.page - 1, detail: '' })}>Previous</Link>}
          <span>Page {data.filters.page}</span>
          {data.next && <Link href={timetableLink(data.filters, { page: data.filters.page + 1, detail: '' })}>Next</Link>}
        </nav>
      </div> : <div className={teacherStyles.week}>
        {timetableDays.filter(day => !data.filters.day || data.filters.day === day).map(day => {
          const periods = data.rows.filter(row => row.day === day);
          return <section key={day} className={styles.record}>
            <h2>{day}</h2>
            {periods.length ? <ol className={teacherStyles.periods}>{periods.map(period => <li key={period.id}>
              <strong>Period {period.period} · {period.start} – {period.end}</strong>
              <PeriodLink period={period} filters={data.filters} />
              {period.conflict && <small>{conflictLabel(period)}</small>}
            </li>)}</ol> : <p className={styles.empty}>No scheduled periods match these filters.</p>}
          </section>;
        })}
      </div>}
      {(data.detail || data.detailDenied) && <section id="period-detail" className={styles.record}>
        <h2>Period details</h2>
        {data.detailDenied && <p className={styles.failure}>This period is unavailable in your assigned timetable.</p>}
        {data.detail && <dl className={teacherStyles.periods}>
          <div><dt>Schedule</dt><dd>{data.detail.day}, period {data.detail.period} · {data.detail.start} – {data.detail.end}</dd></div>
          <div><dt>Placement</dt><dd>{data.detail.className} / {data.detail.sectionName} · {data.detail.year}</dd></div>
          <div><dt>Subject code</dt><dd>{data.detail.subject}</dd></div>
          <div><dt>Room</dt><dd>{data.detail.room}</dd></div>
          {data.detail.conflict && <div><dt>Conflict</dt><dd>{conflictLabel(data.detail)}</dd></div>}
        </dl>}
      </section>}
    </>}
  </section>;
}
