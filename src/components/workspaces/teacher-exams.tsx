import Link from 'next/link';
import { DraftMarkForm } from './draft-mark-form';
import { readTeacherExams } from '@/lib/services/teacher-exams';
import type { TeacherQuery } from '@/lib/services/teacher-dashboard';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

type Result = Awaited<ReturnType<typeof readTeacherExams>>;
type Selection = Extract<Result, { kind: 'select' | 'ready' | 'unassigned' }>;
type Ready = Extract<Result, { kind: 'ready' }>;
const root = '/staff/teacher?workspace=exams';
const metricNames = ['Exam sheets', 'Upcoming exam dates', 'Past exam dates', 'Published', 'Draft'];
const publication = (published: boolean) => published ? 'Published' : 'Draft';

function examLink(filters: Ready['filters'], changes: Partial<Ready['filters']>, anchor = 'exam-directory') {
  const query = new URLSearchParams({ workspace: 'exams' });
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value && value !== 1) query.set(key, String(value));
  }
  return '/staff/teacher?' + query.toString() + '#' + anchor;
}

function ExamFilters({ data }: { data: Selection }) {
  const { options, filters } = data;
  const placements = options.flatMap(option => option.placement ? [option.placement] : []);
  const years = new Map(placements.map(row => [row.academic_year_id, row.year.label]));
  const classes = new Map(placements.map(row => [row.class_id, row.classroom.name]));
  const sections = new Map(options.map(({ section, placement }) => [section,
    placement ? placement.classroom.name + ' / ' + placement.name : section]));
  return <div className={styles.record}>
    <form action="/staff/teacher" className={styles.forms + ' ' + teacherStyles.filters}>
      <input type="hidden" name="workspace" value="exams" />
      {data.identities && ([['Academic year', 'year', years], ['Class', 'classId', classes]] as const).map(([label, key, entries]) =>
        <label key={key}>{label}<select name={key} defaultValue={filters[key]}>
          <option value="">All</option>
          {filters[key] && !entries.has(filters[key]) && <option value={filters[key]}>Current filter</option>}
          {[...entries].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>)}
      <label>Assigned section ID<input name="section" list="teacher-exam-sections" maxLength={36} defaultValue={filters.section} /></label>
      <datalist id="teacher-exam-sections">{[...sections].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</datalist>
      <label>Assigned subject code<input name="subject" list="teacher-exam-subjects" maxLength={80} defaultValue={filters.subject} /></label>
      <datalist id="teacher-exam-subjects">{[...new Set(options.map(row => row.subject))].map(code => <option key={code} value={code} />)}</datalist>
      <label>Exam name<input name="search" maxLength={100} defaultValue={filters.search} /></label>
      <label>Publication<select name="published" defaultValue={filters.published}>
        <option value="">All</option><option value="published">Published</option><option value="draft">Draft</option>
      </select></label>
      <label>Exam date from<input name="from" type="date" defaultValue={filters.from} /></label>
      <label>Exam date through<input name="to" type="date" defaultValue={filters.to} /></label>
      <button type="submit">Apply filters</button>
    </form>
    <p className={styles.limit}>Select one assigned section and subject. Class and academic-year filters narrow the available assignments.</p>
    {data.moreOptions && <p className={styles.limit}>Suggestions cover the first 200 assignment rows. You can enter another assigned section ID and subject code directly.</p>}
    {!data.identities && <p className={styles.limit}>Student-read permission is required for class labels and identifiable marks.</p>}
    {data.kind !== 'ready' && options.length > 0 && <details>
      <summary>Browse assigned section and subject pairs</summary>
      <ul className={teacherStyles.periods}>{options.map(option => <li key={JSON.stringify([option.section, option.subject])}>
        <Link className={teacherStyles.textLink}
          href={examLink(filters, { section: option.section, subject: option.subject, page: 1, exam: '', marksPage: 1 })}>
          {option.placement ? option.placement.classroom.name + ' / ' + option.placement.name : option.section} · {option.subject}
        </Link>
      </li>)}</ul>
    </details>}
  </div>;
}

function ResultDetails({ data }: { data: Ready }) {
  const exam = data.detail;
  if (!exam) return data.detailDenied ? <p className={styles.failure}>This exam is unavailable in the selected assignment.</p> : null;
  return <section id="exam-details" className={styles.record}>
    <h2>{exam.exam_name}</h2>
    <dl className={teacherStyles.periods}>
      <div><dt>Assignment</dt><dd>{data.placement ? data.placement.classroom.name + ' / ' + data.placement.name + ' · ' + data.placement.year.label : 'Assigned section'} · {exam.subject_code}</dd></div>
      <div><dt>Exam date</dt><dd>{exam.exam_date}</dd></div>
      <div><dt>Grading</dt><dd>Maximum {exam.max_marks} · Passing threshold {exam.passing_marks}</dd></div>
      <div><dt>Result status</dt><dd>{publication(exam.is_published)}{exam.is_published && exam.published_at ? ' · ' + exam.published_at : ''}</dd></div>
    </dl>
    {data.draftUnavailable && <p role="alert" className={styles.failure}>The draft marks roster could not be loaded.</p>}
    {data.draft && <section>
      <h3>Enter or edit draft marks</h3>
      {data.draft.rows.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Draft marks roster">
        <table><thead><tr><th>Student</th><th>Mark out of {exam.max_marks}</th></tr></thead>
          <tbody>{data.draft.rows.map(row => <tr key={row.id}>
            <th scope="row">{row.label}</th>
            <td><DraftMarkForm key={row.score ?? 'new'} school={data.draft!.school} exam={exam.id}
              student={row.id} score={row.score} max={exam.max_marks} label={row.label} /></td>
          </tr>)}</tbody>
        </table>
      </div> : <p>No eligible students on this page.</p>}
    </section>}
    <h3>Recorded marks</h3>
    <p className={styles.limit}>Pass and fail use the stored passing threshold. Students without a visible marks entry are omitted. A missing score never counts as zero.</p>
    {data.marksUnavailable ? <p role="alert" className={styles.failure}>Marks could not be loaded for this exam.</p> :
      data.marks.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Recorded exam marks">
        <table><thead><tr><th>Student</th><th>Obtained</th><th>Maximum</th><th>Outcome</th><th>Publication</th></tr></thead>
          <tbody>{data.marks.map(mark => <tr key={mark.id}>
            <td>{mark.name ?? 'Identity unavailable'}{mark.registration && <><br />{mark.registration}</>}</td>
            <td>{mark.score ?? 'Unavailable'}</td><td>{exam.max_marks}</td>
            <td>{mark.passed === null ? 'Unavailable' : mark.passed ? 'Pass' : 'Fail'}</td><td>{publication(exam.is_published)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className={styles.empty}>No visible marks entries on this page.</p>}
    {(!data.marksUnavailable || data.draft) && <nav className={teacherStyles.pagination} aria-label="Marks pages">
      {data.filters.marksPage > 1 && <Link href={examLink(data.filters, { marksPage: data.filters.marksPage - 1 }, 'exam-details')}>Previous</Link>}
      <span>Page {data.filters.marksPage}</span>
      {data.marksNext && <Link href={examLink(data.filters, { marksPage: data.filters.marksPage + 1 }, 'exam-details')}>Next</Link>}
    </nav>}
  </section>;
}

export async function TeacherExams({ access, query }: {
  access: Parameters<typeof readTeacherExams>[0]; query: TeacherQuery;
}) {
  const data = await readTeacherExams(access, query);
  return <section id="teacher-exams" className={styles.section}>
    <h1 className="text-2xl font-bold">Exams &amp; Marks</h1>
    <p className={styles.limit}>Teachers can save draft marks for assigned exams. Publication remains restricted.</p>
    {(data.kind === 'denied' || data.kind === 'invalid' || data.kind === 'error') ?
      <>
        <p role={data.kind === 'error' ? 'alert' : undefined} className={data.kind === 'denied' ? styles.empty : styles.failure}>
          {data.kind === 'denied' ? 'Your membership does not grant access to exam marks.' :
            data.kind === 'invalid' ? 'Check the exam filters.' : 'Exam records could not be loaded.'}
        </p>
        {data.kind !== 'denied' && <Link href={root}>Reset exam filters</Link>}
      </> : <>
        <ExamFilters data={data} />
        {data.kind === 'unassigned' && <p className={styles.failure}>This section and subject pair is unavailable in your active assignments.</p>}
        {data.kind === 'select' && <p className={styles.empty}>{data.options.length
          ? 'Choose an assignment to load its exams and figures.' : 'No active assignments match these filters.'}</p>}
        {data.kind === 'ready' && <>
          {data.counts ? <>
          <dl className={teacherStyles.metrics}>{data.counts.map((value, index) =>
            <div key={metricNames[index]}><dt>{metricNames[index]}</dt><dd>{value}</dd></div>)}</dl>
          <p className={styles.limit}>Counts cover the selected section and subject across all pages. Upcoming includes {data.cutoff} (UTC). Past exam dates do not indicate completion.</p>
          </> : <p className={styles.limit}>Exam totals could not be loaded.</p>}
          <section id="exam-directory" className={styles.record}>
            <h2>Exam directory</h2>
            {data.rows.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Exam directory">
              <table><thead><tr><th>Exam</th><th>Date</th><th>Maximum marks</th><th>Publication</th></tr></thead>
                <tbody>{data.rows.map(exam => <tr key={exam.id}>
                  <td><Link className={teacherStyles.textLink}
                    href={examLink(data.filters, { exam: exam.id, marksPage: 1 }, 'exam-details')}>{exam.exam_name}</Link></td>
                  <td>{exam.exam_date}</td><td>{exam.max_marks}</td><td>{publication(exam.is_published)}</td>
                </tr>)}</tbody>
              </table>
            </div> : <p className={styles.empty}>No accessible exams match these filters on this page.</p>}
            <nav className={teacherStyles.pagination} aria-label="Exam pages">
              {data.filters.page > 1 && <Link href={examLink(data.filters, { page: data.filters.page - 1, exam: '', marksPage: 1 })}>Previous</Link>}
              <span>Page {data.filters.page}</span>
              {data.next && <Link href={examLink(data.filters, { page: data.filters.page + 1, exam: '', marksPage: 1 })}>Next</Link>}
            </nav>
          </section>
          <ResultDetails data={data} />
        </>}
      </>}
  </section>;
}
