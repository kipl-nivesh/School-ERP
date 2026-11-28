import Link from 'next/link';
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  FolderOpen,
  Megaphone,
  NotebookPen,
  Receipt,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';
import type { ParentChildSummary, ParentIdentity, ParentModuleData } from '@/lib/parent/server';
import styles from './live-admin-dashboard.module.css';

function formatInr(paise: number) {
  const safe = Math.max(0, Math.round(paise));
  return `₹${Math.floor(safe / 100).toLocaleString('en-IN')}.${String(safe % 100).padStart(2, '0')}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ChildContextBanner({ child }: { child: ParentChildSummary }) {
  const classLine = [
    child.class_name || 'Placement pending',
    child.section_name ? `Section ${child.section_name}` : null,
    child.academic_year || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
      <div>
        <div className="font-semibold text-base">{child.full_name || child.student_name}</div>
        <div className="text-emerald-800">{classLine}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full bg-white px-3 py-1 border border-emerald-200">
          Admission: {child.registration_number}
        </span>
        {child.academic_access && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">Academics</span>
        )}
        {child.fee_access && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">Fees</span>
        )}
      </div>
    </div>
  );
}

export function LiveParentWorkspace({
  identity,
  data,
}: {
  identity: ParentIdentity;
  data: ParentModuleData;
}) {
  if (data.invalidChildRequested || !data.selectedChild) {
    return (
      <section className={styles.record} aria-labelledby="parent-denied-heading">
        <h1 id="parent-denied-heading" className="flex items-center gap-2 text-xl font-semibold text-rose-900">
          <ShieldAlert size={20} aria-hidden="true" />
          Child record unavailable
        </h1>
        <p role="alert" className={styles.failure}>
          The requested student record is not linked to your verified guardian account in {identity.school_name}.
        </p>
        <div className="mt-3">
          <Link href="/parent/dashboard?workspace=children" className="text-sm font-medium text-emerald-700 underline">
            View your linked children
          </Link>
        </div>
      </section>
    );
  }

  const child = data.selectedChild;
  const qsChild = `child=${encodeURIComponent(child.student_id)}`;

  if (data.workspace === 'children') {
    return (
      <section aria-labelledby="parent-children-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-children-heading">My Children</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {identity.children.map((item) => {
            const isSelected = item.student_id === child.student_id;
            return (
              <article
                key={item.relationship_id}
                className={`${styles.record} ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{item.full_name || item.student_name}</h2>
                    <p className="text-sm text-slate-600">
                      {item.class_name ?? 'Unplaced'}
                      {item.section_name ? ` · Section ${item.section_name}` : ''}
                      {item.academic_year ? ` · ${item.academic_year}` : ''}
                    </p>
                  </div>
                  <UsersRound size={20} className="text-emerald-600" aria-hidden="true" />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Admission No.</dt>
                    <dd className="font-medium text-slate-900">{item.registration_number}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Authorized Scope</dt>
                    <dd className="font-medium text-slate-900">
                      {[item.academic_access ? 'Academics' : null, item.fee_access ? 'Fees' : null]
                        .filter(Boolean)
                        .join(' & ') || 'Restricted'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/parent/dashboard?workspace=overview&child=${encodeURIComponent(item.student_id)}`}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {isSelected ? 'Viewing overview' : 'Switch to this child'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (data.workspace === 'attendance' && data.attendance) {
    const { accessDenied, summary, records } = data.attendance;
    return (
      <section aria-labelledby="parent-attendance-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-attendance-heading">Attendance</h1>
        </div>
        <ChildContextBanner child={child} />
        {accessDenied ? (
          <p role="status" className={styles.empty}>Academic access is not enabled for this guardian relationship.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className={styles.record}><dt className="text-xs text-slate-500">Total Days</dt><dd className="text-xl font-semibold">{summary.total}</dd></div>
              <div className={styles.record}><dt className="text-xs text-slate-500">Present</dt><dd className="text-xl font-semibold text-emerald-700">{summary.present}</dd></div>
              <div className={styles.record}><dt className="text-xs text-slate-500">Absent</dt><dd className="text-xl font-semibold text-rose-700">{summary.absent}</dd></div>
              <div className={styles.record}><dt className="text-xs text-slate-500">Late</dt><dd className="text-xl font-semibold text-amber-700">{summary.late}</dd></div>
              <div className={styles.record}><dt className="text-xs text-slate-500">Excused</dt><dd className="text-xl font-semibold text-slate-700">{summary.excused}</dd></div>
            </dl>
            <article className={styles.record}>
              <h2><ClipboardList size={18} aria-hidden="true" /> Attendance history</h2>
              {!records.length ? (
                <p className={styles.empty}>No attendance records recorded yet.</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <thead><tr><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td>{r.attendance_date}</td>
                          <td className="capitalize font-medium">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </>
        )}
      </section>
    );
  }

  if (data.workspace === 'timetable' && data.timetable) {
    const { accessDenied, slots } = data.timetable;
    return (
      <section aria-labelledby="parent-timetable-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-timetable-heading">Timetable</h1>
        </div>
        <ChildContextBanner child={child} />
        {accessDenied ? (
          <p role="status" className={styles.empty}>Academic access is not enabled for this guardian relationship.</p>
        ) : (
          <article className={styles.record}>
            <h2><CalendarDays size={18} aria-hidden="true" /> Weekly class schedule</h2>
            {!slots.length ? (
              <p className={styles.empty}>No timetable slots published for this class section yet.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table>
                  <thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Room</th></tr></thead>
                  <tbody>
                    {slots.map((s, idx) => (
                      <tr key={`${s.day_of_week}-${s.start_time}-${idx}`}>
                        <td>{DAY_NAMES[s.day_of_week] ?? `Day ${s.day_of_week}`}</td>
                        <td>{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</td>
                        <td className="font-medium">{s.subject_code}</td>
                        <td>{s.room_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        )}
      </section>
    );
  }

  if (data.workspace === 'homework' && data.homework) {
    const { accessDenied, items } = data.homework;
    return (
      <section aria-labelledby="parent-homework-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-homework-heading">Homework</h1>
        </div>
        <ChildContextBanner child={child} />
        {accessDenied ? (
          <p role="status" className={styles.empty}>Academic access is not enabled for this guardian relationship.</p>
        ) : (
          <article className={styles.record}>
            <h2><NotebookPen size={18} aria-hidden="true" /> Assigned homework</h2>
            {!items.length ? (
              <p className={styles.empty}>No active homework assignments at this time.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {items.map((hw) => (
                  <li key={hw.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-slate-900">{hw.title}</strong>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {hw.subject_code} · Due {hw.due_date}
                      </span>
                    </div>
                    {hw.description && <p className="mt-1 text-sm text-slate-600">{hw.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}
      </section>
    );
  }

  if (data.workspace === 'exams' && data.exams) {
    const { accessDenied, schedule, results } = data.exams;
    return (
      <section aria-labelledby="parent-exams-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-exams-heading">Exams &amp; Results</h1>
        </div>
        <ChildContextBanner child={child} />
        {accessDenied ? (
          <p role="status" className={styles.empty}>Academic access is not enabled for this guardian relationship.</p>
        ) : (
          <div className="space-y-4">
            <article className={styles.record}>
              <h2><CalendarDays size={18} aria-hidden="true" /> Published exam schedule</h2>
              {!schedule.length ? (
                <p className={styles.empty}>No published exam schedules available.</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <thead><tr><th>Exam</th><th>Subject</th><th>Date</th><th>Time</th><th>Venue</th></tr></thead>
                    <tbody>
                      {schedule.map((ex) => (
                        <tr key={ex.id}>
                          <td className="font-medium">{ex.title}</td>
                          <td>{ex.subject_code}</td>
                          <td>{ex.exam_date}</td>
                          <td>{ex.starts_at && ex.ends_at ? `${ex.starts_at.slice(0, 5)} – ${ex.ends_at.slice(0, 5)}` : 'TBA'}</td>
                          <td>{ex.venue || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className={styles.record}>
              <h2><Award size={18} aria-hidden="true" /> Published results</h2>
              {!results.length ? (
                <p className={styles.empty}>No published exam results yet.</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <thead><tr><th>Exam</th><th>Subject</th><th>Date</th><th>Marks</th><th>Passing</th></tr></thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.id}>
                          <td className="font-medium">{r.exam_name}</td>
                          <td>{r.subject_code}</td>
                          <td>{r.exam_date}</td>
                          <td className="font-semibold">{r.marks_obtained !== null ? `${r.marks_obtained} / ${r.max_marks}` : 'Absent / Pending'}</td>
                          <td>{r.passing_marks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </div>
        )}
      </section>
    );
  }

  if (data.workspace === 'fees' && data.fees) {
    const { accessDenied, totalBilledPaise, totalPaidPaise, outstandingPaise, invoices, payments } = data.fees;
    return (
      <section aria-labelledby="parent-fees-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-fees-heading">Fees &amp; Receipts</h1>
        </div>
        <ChildContextBanner child={child} />
        {accessDenied ? (
          <p role="status" className={styles.empty}>Fee access is not enabled for this guardian relationship.</p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={styles.record}><dt className="text-xs text-slate-500">Total Billed</dt><dd className="text-xl font-semibold">{formatInr(totalBilledPaise)}</dd></div>
              <div className={styles.record}><dt className="text-xs text-slate-500">Total Paid</dt><dd className="text-xl font-semibold text-emerald-700">{formatInr(totalPaidPaise)}</dd></div>
              <div className={styles.record}><dt className="text-xs text-slate-500">Outstanding Balance</dt><dd className="text-xl font-semibold text-amber-700">{formatInr(outstandingPaise)}</dd></div>
            </dl>

            <article className={styles.record}>
              <h2><FileText size={18} aria-hidden="true" /> Fee invoices</h2>
              {!invoices.length ? (
                <p className={styles.empty}>No fee invoices issued for this student.</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <thead><tr><th>Invoice</th><th>Title</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="font-medium">{inv.invoice_number}</td>
                          <td>{inv.title}</td>
                          <td>{inv.due_date}</td>
                          <td>{formatInr(inv.amount_paise)}</td>
                          <td className="capitalize">{inv.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className={styles.record}>
              <h2><Receipt size={18} aria-hidden="true" /> Payment history &amp; printable receipts</h2>
              {!payments.length ? (
                <p className={styles.empty}>No settled fee payments recorded yet.</p>
              ) : (
                <div className={styles.tableScroll}>
                  <table>
                    <thead><tr><th>Receipt No.</th><th>Paid On</th><th>Method</th><th>Amount</th><th>Receipt</th></tr></thead>
                    <tbody>
                      {payments.map((pay) => (
                        <tr key={pay.id}>
                          <td className="font-medium">{pay.receipt_number}</td>
                          <td>{pay.payment_date}</td>
                          <td className="capitalize">{pay.payment_method.replaceAll('_', ' ')}</td>
                          <td>{formatInr(pay.amount_paise)}</td>
                          <td>
                            <Link
                              href={`/parent/receipts/${pay.id}`}
                              className="inline-flex items-center gap-1 text-emerald-700 font-medium underline"
                            >
                              View / Print
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </>
        )}
      </section>
    );
  }

  if (data.workspace === 'materials' && data.materials) {
    const { accessDenied, items } = data.materials;
    return (
      <section aria-labelledby="parent-materials-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-materials-heading">Study Materials</h1>
        </div>
        <ChildContextBanner child={child} />
        {accessDenied ? (
          <p role="status" className={styles.empty}>Academic access is not enabled for this guardian relationship.</p>
        ) : (
          <article className={styles.record}>
            <h2><FolderOpen size={18} aria-hidden="true" /> Published study materials &amp; documents</h2>
            {!items.length ? (
              <p className={styles.empty}>No study materials published yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {items.map((mat) => (
                  <li key={mat.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <strong className="text-slate-900">{mat.title}</strong>
                      <div className="text-xs text-slate-500 capitalize">
                        {mat.kind.replaceAll('_', ' ')} · Scope: {mat.audience}
                      </div>
                    </div>
                    <a
                      href={`/parent/materials/${mat.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <Download size={14} aria-hidden="true" />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}
      </section>
    );
  }

  if (data.workspace === 'announcements' && data.announcements) {
    const { items } = data.announcements;
    return (
      <section aria-labelledby="parent-announcements-heading" className="space-y-4">
        <div className={styles.hero}>
          <p>{identity.school_name}</p>
          <h1 id="parent-announcements-heading">School Announcements</h1>
        </div>
        <article className={styles.record}>
          <h2><Megaphone size={18} aria-hidden="true" /> Parent &amp; school notices</h2>
          {!items.length ? (
            <p className={styles.empty}>No school announcements published at this time.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-900">{a.title}</strong>
                    <span className="text-xs text-slate-500">{a.published_at.slice(0, 10)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.content}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    );
  }

  // Overview
  const ov = data.overview!;
  return (
    <section aria-labelledby="parent-overview-heading" className="space-y-5">
      <div className={styles.hero}>
        <p>{identity.school_name}</p>
        <h1 id="parent-overview-heading">Parent overview</h1>
      </div>
      <ChildContextBanner child={child} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={styles.record}>
          <dt className="text-xs text-slate-500">Attendance Recorded</dt>
          <dd className="text-xl font-semibold text-emerald-700">
            {child.academic_access ? `${ov.attendancePresent} / ${ov.attendanceTotal}` : 'Restricted'}
          </dd>
        </div>
        <div className={styles.record}>
          <dt className="text-xs text-slate-500">Upcoming Homework</dt>
          <dd className="text-xl font-semibold">
            {child.academic_access ? ov.activeHomeworkCount : 'Restricted'}
          </dd>
        </div>
        <div className={styles.record}>
          <dt className="text-xs text-slate-500">Upcoming Published Exams</dt>
          <dd className="text-xl font-semibold">
            {child.academic_access ? ov.upcomingExamsCount : 'Restricted'}
          </dd>
        </div>
        <div className={styles.record}>
          <dt className="text-xs text-slate-500">Outstanding Fees</dt>
          <dd className="text-xl font-semibold text-amber-700">
            {child.fee_access ? formatInr(ov.outstandingPaise) : 'Restricted'}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className={styles.record}>
          <div className="flex items-center justify-between">
            <h2><BookOpen size={18} aria-hidden="true" /> Due homework</h2>
            <Link href={`/parent/dashboard?workspace=homework&${qsChild}`} className="text-xs font-medium text-emerald-700 underline">
              View all
            </Link>
          </div>
          {!ov.dueHomework.length ? (
            <p className={styles.empty}>No upcoming homework due.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-200 text-sm">
              {ov.dueHomework.map((hw) => (
                <li key={hw.id} className="flex items-center justify-between py-2">
                  <span><strong>{hw.title}</strong> ({hw.subject_code})</span>
                  <span className="text-slate-500">{hw.due_date}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={styles.record}>
          <div className="flex items-center justify-between">
            <h2><Megaphone size={18} aria-hidden="true" /> Recent announcements</h2>
            <Link href={`/parent/dashboard?workspace=announcements&${qsChild}`} className="text-xs font-medium text-emerald-700 underline">
              View all
            </Link>
          </div>
          {!ov.recentAnnouncements.length ? (
            <p className={styles.empty}>No announcements published yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-200 text-sm">
              {ov.recentAnnouncements.map((a) => (
                <li key={a.id} className="py-2">
                  <div className="font-medium text-slate-900">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.published_at.slice(0, 10)}</div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
