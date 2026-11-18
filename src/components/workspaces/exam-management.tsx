'use client';

import { useActionState, useState } from 'react';
import { filterExams } from '@/app/staff/exam-workspace-actions';
import type { AcademicOptions } from '@/lib/services/academic-directory';
import type { Exam, ExamPage } from '@/lib/services/exam-workspace';
import styles from './academic-management.module.css';

export function ExamManagement({ initial, options, studentSearch }: {
  initial: ExamPage; options: AcademicOptions; studentSearch: boolean;
}) {
  const [result, action, pending] = useActionState(filterExams, initial);
  const [filters, setFilters] = useState({ mode: 'exams', search: '', exam: '', section: '', classId: '', year: '', published: '' });
  const results = filters.mode === 'results';
  const examOptions = result.kind === 'exams' ? result.exams : initial.kind === 'exams' ? initial.exams : [];
  const sections = options.sections.filter(item =>
    (!filters.year || item.yearId === filters.year) && (!filters.classId || item.classId === filters.classId));

  function placement(sectionId: string) {
    const section = options.sections.find(item => item.id === sectionId);
    return section ? [options.classes.find(item => item.id === section.classId)?.label, section.label,
      options.years.find(item => item.id === section.yearId)?.label].filter(Boolean).join(' · ') : sectionId;
  }
  function field(name: keyof typeof filters) {
    return { name, value: filters[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFilters(current => ({ ...current, [name]: value,
        ...(name === 'mode' ? { search: '', exam: '' } : {}),
        ...(name === 'year' || name === 'classId' ? { section: '' } : {}) }));
    } };
  }

  if (result.kind === 'denied') return <p role="status">This membership cannot read the requested exam records.</p>;
  return <section className={styles.card} aria-labelledby="exam-records" aria-busy={pending}>
    <h2 id="exam-records">{result.kind === 'results' ? 'Student results' : 'Exam sheets'}</h2>
    <form action={action} className={styles.controls}>
      <label>View<select {...field('mode')}><option value="exams">Exam sheets</option><option value="results">Student results</option></select></label>
      <label>{results ? studentSearch ? 'Search student name or registration' : 'Student ID' : 'Search exam name or subject code'}
        <input {...field('search')} type="search" maxLength={80} /></label>
      {results && <label>Exam ID<input {...field('exam')} list="exam-result-options" maxLength={36} />
        <datalist id="exam-result-options">{examOptions.map(exam => <option key={exam.id} value={exam.id}>{exam.exam_name} · {exam.subject_code} · {placement(exam.section_id)}</option>)}</datalist>
      </label>}
      {!!options.years.length && <label>Academic year<select {...field('year')}><option value="">All years</option>
        {options.years.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      {!!options.classes.length && <label>Class<select {...field('classId')}><option value="">All classes</option>
        {options.classes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      <label>Section ID or placement<input {...field('section')} maxLength={36} list="exam-section-options" />
        <datalist id="exam-section-options">{sections.map(item => <option key={item.id} value={item.id}>{placement(item.id)}</option>)}</datalist>
      </label>
      <label>Publication status<select {...field('published')}><option value="">All statuses</option>
        <option value="yes">Published</option><option value="no">Unpublished</option></select></label>
      <button disabled={pending}>Apply filters</button>
    </form>
    {pending && <p role="status">Loading exam records…</p>}
    {!pending && result.kind === 'invalid' && <p role="alert" className={styles.error}>Check your search and filter values.</p>}
    {!pending && result.kind === 'error' && <p role="alert" className={styles.error}>Exam records could not be loaded. Apply filters to try again.</p>}
    {(result.kind === 'exams' || result.kind === 'results') && <>
      {result.exams.length || result.scores.length ? <div className={styles.table} role="region" aria-label={result.kind === 'exams' ? 'Exam sheets' : 'Student results'} tabIndex={0}>
        <table>
          <thead><tr><th scope="col">{result.kind === 'exams' ? 'Exam' : 'Student'}</th><th scope="col">{result.kind === 'exams' ? 'Placement' : 'Exam and placement'}</th>
            <th scope="col">{result.kind === 'exams' ? 'Exam date' : 'Marks obtained'}</th><th scope="col">Maximum marks</th><th scope="col">Publication</th></tr></thead>
          <tbody>
            {result.exams.map(exam => <tr key={exam.id}>
              <th scope="row"><details><summary>{exam.exam_name}</summary><ExamDetail exam={exam} /></details></th>
              <td>{placement(exam.section_id)}</td><td>{exam.exam_date}</td><td>{exam.max_marks}</td><td>{exam.is_published ? 'Published' : 'Unpublished'}</td>
            </tr>)}
            {result.scores.map(score => <tr key={score.id}>
              <th scope="row"><details><summary>{score.studentName ?? score.student_id}</summary>
                {score.registration && <p>Registration {score.registration}</p>}
                <p>Marks obtained: {score.marks_obtained} / {score.exam.max_marks}</p>
                <ExamDetail exam={score.exam} />
              </details></th>
              <td>{score.exam.exam_name} · {placement(score.exam.section_id)}</td><td>{score.marks_obtained}</td>
              <td>{score.exam.max_marks}</td><td>{score.exam.is_published ? 'Published' : 'Unpublished'}</td>
            </tr>)}
          </tbody>
        </table>
      </div> : <p className={styles.notice} role="status">No accessible records match these filters.</p>}
      <form action={action} className={styles.pager} aria-label="Exam records pagination">
        {Object.entries(result.filters).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
        <button name="page" value={result.page - 1} disabled={pending || result.page === 1}>Previous</button>
        <span aria-live="polite">Page {result.page}</span>
        <button name="page" value={result.page + 1} disabled={pending || !result.next}>Next</button>
      </form>
    </>}
    <p className={styles.help}>This workspace displays existing exam dates and publication status. Exam changes, marks entry and publication are unavailable here.</p>
  </section>;
}

function ExamDetail({ exam }: { exam: Exam }) {
  return <dl>
    <dt>Exam ID</dt><dd>{exam.id}</dd>
    <dt>Subject code</dt><dd>{exam.subject_code}</dd>
    <dt>Exam date</dt><dd>{exam.exam_date}</dd>
    <dt>Passing marks</dt><dd>{exam.passing_marks}</dd>
    {exam.is_published && exam.published_at && <><dt>Published at</dt><dd><time dateTime={exam.published_at}>{exam.published_at}</time></dd></>}
  </dl>;
}
