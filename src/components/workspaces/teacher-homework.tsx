import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { HomeworkForm } from './homework-management';
import { readTeacherHomework } from '@/lib/services/teacher-homework';
import type { TeacherQuery } from '@/lib/services/teacher-dashboard';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

type Ready = Extract<Awaited<ReturnType<typeof readTeacherHomework>>, { kind: 'ready' }>;
const root = '/staff/teacher?workspace=homework';
const names = ['Assigned homework', 'Open', 'Closed', 'Upcoming due', 'Overdue'];
const statusLabel = (status: string) => status === 'active' ? 'Open' : 'Closed';

function directoryLink(filters: Ready['filters'], changes: Partial<Ready['filters']>, anchor = 'homework-directory') {
  const query = new URLSearchParams({ workspace: 'homework' });
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value && value !== 1) query.set(key, String(value));
  }
  return '/staff/teacher?' + query.toString() + '#' + anchor;
}

function HomeworkFilters({ data }: { data: Ready }) {
  const { filters, options } = data;
  return <form action="/staff/teacher" className={styles.forms + ' ' + teacherStyles.filters}>
    <input type="hidden" name="workspace" value="homework" />
    <label>Title search<input name="search" maxLength={80} defaultValue={filters.search} /></label>
    <label>Subject code<input name="subject" maxLength={80} defaultValue={filters.subject} /></label>
    <label>Status<select name="status" defaultValue={filters.status}>
      <option value="">All</option><option value="active">Open</option><option value="closed">Closed</option>
    </select></label>
    {data.canReadPlacement && ([['Academic year', 'year', options.years], ['Class', 'classId', options.classes],
      ['Section', 'section', options.sections]] as const).map(([label, field, items]) =>
      <label key={field}>{label}<select name={field} defaultValue={filters[field]}>
        <option value="">All</option>
        {filters[field] && !items.some(item => item.id === filters[field]) && <option value={filters[field]}>Current filter</option>}
        {items.map(item => <option key={item.id} value={item.id}>{'classId' in item
          ? [options.classes.find(entry => entry.id === item.classId)?.label, item.label,
            options.years.find(entry => entry.id === item.yearId)?.label].filter(Boolean).join(' · ')
          : item.label}</option>)}
      </select></label>)}
    {!data.canReadPlacement && <label>Assigned section ID<input name="section" maxLength={36} defaultValue={filters.section} /></label>}
    <label>Due from<input name="from" type="date" defaultValue={filters.from} /></label>
    <label>Due through<input name="to" type="date" defaultValue={filters.to} /></label>
    <button type="submit">Apply filters</button>
  </form>;
}

export async function TeacherHomework({ access, query }: {
  access: Parameters<typeof readTeacherHomework>[0]; query: TeacherQuery;
}) {
  const data = await readTeacherHomework(access, query);
  if (data.kind !== 'ready') return <section id="homework-overview" className={styles.section}>
    <h1 className="text-2xl font-bold">Homework overview</h1>
    <p role={data.kind === 'error' ? 'alert' : undefined} className={data.kind === 'denied' ? styles.empty : styles.failure}>
      {data.kind === 'denied' ? 'Your membership does not grant homework access.' :
        data.kind === 'unassigned' ? 'That section is unavailable in your active assignments.' :
        data.kind === 'invalid' ? 'Check the homework filters.' : 'Homework could not be loaded.'}
    </p>
    <Link href={root}>Reset homework filters</Link>
  </section>;

  const { detail, filters, options } = data;
  const placement = (id: string) => {
    const section = options.sections.find(item => item.id === id);
    return section ? [options.classes.find(item => item.id === section.classId)?.label, section.label,
      options.years.find(item => item.id === section.yearId)?.label].filter(Boolean).join(' · ') : 'Assigned section';
  };
  return <>
    <section id="homework-overview" className={styles.section}>
      <h1 className="text-2xl font-bold">Homework overview</h1>
      {data.counts ? <>
        <dl className={teacherStyles.metrics}>{data.counts.map((count, i) =>
          <div key={names[i]}><dt>{names[i]}</dt><dd>{count}</dd></div>)}</dl>
        <p className={styles.limit}>Counts cover all accessible homework. Open items due before {data.cutoff} (UTC) are overdue. Open items due on or after that date are upcoming.</p>
      </> : <p className={styles.empty}>{data.canRead ? 'Homework totals could not be loaded.' :
      'Homework history and totals require homework-read permission.'}</p>}
      <p className={styles.limit}>Student submission tracking is unavailable.</p>
      {data.writeChoices.length > 0 && <HomeworkForm requestId={randomUUID()} options={options} assignedSubjects={data.writeChoices} />}
    </section>

    {data.canRead && <section id="homework-directory" className={styles.section}>
      <h2>Homework directory</h2>
      <div className={styles.record}>
        <HomeworkFilters data={data} key={JSON.stringify(filters)} />
        {options.partial && <p className={styles.limit}>Filter choices show up to 200 assigned sections.</p>}
        {!data.canReadPlacement && <p className={styles.limit}>Class and academic-year labels require student-read permission.</p>}
        {data.rows.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Assigned homework">
          <table><thead><tr><th>Homework</th><th>Class and section</th><th>Subject</th><th>Due date</th><th>Status</th></tr></thead>
            <tbody>{data.rows.map(row => <tr key={row.id}>
              <td><Link className={teacherStyles.textLink} href={directoryLink(filters, { detail: row.id }, 'homework-detail')}>{row.title}</Link></td>
              <td>{placement(row.section_id)}</td><td>{row.subject_code}</td><td>{row.due_date}</td><td>{statusLabel(row.status)}</td>
            </tr>)}</tbody></table>
        </div> : <p className={styles.empty}>No accessible homework matches these filters.</p>}
        <nav aria-label="Homework pages" className={teacherStyles.pagination}>
          {filters.page > 1 && <Link href={directoryLink(filters, { page: filters.page - 1, detail: '' })}>Previous</Link>}
          <span>Page {filters.page}</span>
          {data.next && <Link href={directoryLink(filters, { page: filters.page + 1, detail: '' })}>Next</Link>}
        </nav>
      </div>
    </section>}

    {(detail || data.detailDenied) && <section id="homework-detail" className={styles.section}>
      <h2>Homework details</h2>
      {data.detailDenied && <p className={styles.failure}>This homework is unavailable in your current assignments.</p>}
      {detail && <div className={styles.record}>
        <h3>{detail.title}</h3>
        <p>{placement(detail.section_id)} · {detail.subject_code} · {statusLabel(detail.status)}</p>
        <p>Assigned {detail.assigned_date} · Due {detail.due_date} · {detail.max_points} points</p>
        <p className="whitespace-pre-wrap break-words">{detail.description || 'No instructions.'}</p>
        {data.editable && <HomeworkForm key={detail.id + ':' + detail.revision} requestId={randomUUID()}
          options={options} editing row={detail} assignedSubjects={data.writeChoices} />}
      </div>}
    </section>}


  </>;
}
