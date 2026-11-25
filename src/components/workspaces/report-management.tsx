'use client';

import { useActionState, useTransition } from 'react';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  Filter,
  GraduationCap,
  Info,
  RotateCcw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { filterReports } from '@/app/staff/report-workspace-actions';
import {
  formatPaise,
  formatPercentage,
  formatReportDate,
  type ReportCategory,
  type ReportPage,
  type ReportTableRow,
} from '@/lib/services/report-fields';
import styles from './report-management.module.css';

interface ReportManagementProps {
  initial: ReportPage;
  financeOnly?: boolean;
}

export function ReportManagement({ initial, financeOnly = false }: ReportManagementProps) {
  const [state, formAction, isPending] = useActionState(filterReports, initial);
  const [, startTransition] = useTransition();

  if (state.kind === 'denied') {
    return (
      <div className={styles.container}>
        <div className={styles.stateBox}>
          <ShieldAlert size={36} color="#ef4444" aria-hidden="true" />
          <h2 className={styles.stateBoxTitle}>Access Restricted</h2>
          <p>{state.reason}</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.stateBox}>
          <ShieldAlert size={36} color="#f59e0b" aria-hidden="true" />
          <h2 className={styles.stateBoxTitle}>Unable to Load Reports</h2>
          <p>{state.message || 'An error occurred while compiling reports. Please refresh to try again.'}</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'invalid') {
    return (
      <div className={styles.container}>
        <div className={styles.stateBox}>
          <Info size={36} color="#f59e0b" aria-hidden="true" />
          <h2 className={styles.stateBoxTitle}>Invalid Report Query</h2>
          <p>{state.message}</p>
        </div>
      </div>
    );
  }

  const {
    category,
    filters,
    enrollmentMetrics,
    attendanceMetrics,
    financeMetrics,
    examMetrics,
    staffMetrics,
    rows,
    totalRows,
    page,
    hasNext,
    options,
    exportNotice,
  } = state;

  const handleTabChange = (newCategory: ReportCategory) => {
    const formData = new FormData();
    formData.set('category', newCategory);
    formData.set('page', '1');
    startTransition(() => {
      formAction(formData);
    });
  };

  const handlePageChange = (newPage: number) => {
    const formData = new FormData();
    formData.set('category', category);
    if (filters.academicYearId) formData.set('academicYearId', filters.academicYearId);
    if (filters.classId) formData.set('classId', filters.classId);
    if (filters.sectionId) formData.set('sectionId', filters.sectionId);
    if (filters.dateFrom) formData.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) formData.set('dateTo', filters.dateTo);
    if (filters.search) formData.set('search', filters.search);
    if (filters.status) formData.set('status', filters.status);
    formData.set('page', String(newPage));
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleResetFilters = () => {
    const formData = new FormData();
    formData.set('category', category);
    formData.set('page', '1');
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className={styles.container}>
      {/* Export Safety Notice */}
      {!financeOnly && <div className={styles.noticeBanner} role="status">
        <Info size={18} className={styles.noticeIcon} aria-hidden="true" />
        <span>{exportNotice}</span>
      </div>}

      {/* Category Navigation Tabs */}
      {!financeOnly && <nav className={styles.tabs} aria-label="Report Categories">
        <button
          type="button"
          className={`${styles.tabButton} ${category === 'enrollment' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('enrollment')}
          disabled={isPending}
        >
          <GraduationCap size={16} aria-hidden="true" />
          Student Enrollment
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${category === 'attendance' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('attendance')}
          disabled={isPending}
        >
          <CalendarCheck size={16} aria-hidden="true" />
          Attendance
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${category === 'finance' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('finance')}
          disabled={isPending}
        >
          <Wallet size={16} aria-hidden="true" />
          Finance & Fees
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${category === 'exams' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('exams')}
          disabled={isPending}
        >
          <BarChart3 size={16} aria-hidden="true" />
          Exams & Academics
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${category === 'staff' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('staff')}
          disabled={isPending}
        >
          <Building2 size={16} aria-hidden="true" />
          Staff & Operations
        </button>
      </nav>}

      {/* Overview Metric Cards */}
      {category === 'enrollment' && enrollmentMetrics && (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Enrolled</span>
              <span className={styles.metricValue}>{enrollmentMetrics.totalStudents}</span>
              <span className={styles.metricSubtext}>Across all sections</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Active Students</span>
              <span className={styles.metricValue}>{enrollmentMetrics.activeCount}</span>
              <span className={styles.metricSubtext}>Currently attending</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Inactive / Withdrawn</span>
              <span className={styles.metricValue}>
                {enrollmentMetrics.inactiveCount + enrollmentMetrics.withdrawnCount}
              </span>
              <span className={styles.metricSubtext}>
                {enrollmentMetrics.inactiveCount} inactive, {enrollmentMetrics.withdrawnCount} withdrawn
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Classes & Sections</span>
              <span className={styles.metricValue}>
                {enrollmentMetrics.totalClasses} / {enrollmentMetrics.totalSections}
              </span>
              <span className={styles.metricSubtext}>Active academic structure</span>
            </div>
          </div>

          {enrollmentMetrics.classDistribution.length > 0 && (
            <div className={styles.visualSection}>
              <div className={styles.visualHeader}>
                <h3 className={styles.visualTitle}>Student Distribution by Class</h3>
              </div>
              <div className={styles.distributionList}>
                {enrollmentMetrics.classDistribution.map(item => {
                  const pct =
                    enrollmentMetrics.totalStudents > 0
                      ? Math.round((item.count / enrollmentMetrics.totalStudents) * 100)
                      : 0;
                  return (
                    <div key={item.classId} className={styles.distributionItem}>
                      <div className={styles.distributionLabelRow}>
                        <span>{item.className}</span>
                        <span>
                          {item.count} students ({pct}%)
                        </span>
                      </div>
                      <div className={styles.distributionBarTrack}>
                        <div
                          className={styles.distributionBarFill}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {category === 'attendance' && attendanceMetrics && (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Records</span>
              <span className={styles.metricValue}>{attendanceMetrics.totalRecords}</span>
              <span className={styles.metricSubtext}>Recorded sessions</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Present Rate</span>
              <span className={styles.metricValue}>
                {formatPercentage(attendanceMetrics.presentRatePercent)}
              </span>
              <span className={styles.metricSubtext}>{attendanceMetrics.presentCount} on-time sessions</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Effective Attendance</span>
              <span className={styles.metricValue}>
                {formatPercentage(attendanceMetrics.effectiveRatePercent)}
              </span>
              <span className={styles.metricSubtext}>Present + Late combined</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Absences & Leaves</span>
              <span className={styles.metricValue}>
                {attendanceMetrics.absentCount + attendanceMetrics.excusedCount}
              </span>
              <span className={styles.metricSubtext}>
                {attendanceMetrics.absentCount} absent, {attendanceMetrics.excusedCount} excused
              </span>
            </div>
          </div>

          <div className={styles.visualSection}>
            <div className={styles.visualHeader}>
              <h3 className={styles.visualTitle}>Attendance Breakdown</h3>
              <span className={styles.metricSubtext}>{attendanceMetrics.denominatorNote}</span>
            </div>
            <div className={styles.distributionList}>
              <div className={styles.distributionItem}>
                <div className={styles.distributionLabelRow}>
                  <span>Present</span>
                  <span>{attendanceMetrics.presentCount} ({formatPercentage(attendanceMetrics.presentRatePercent)})</span>
                </div>
                <div className={styles.distributionBarTrack}>
                  <div
                    className={styles.distributionBarFill}
                    style={{ width: `${attendanceMetrics.presentRatePercent}%`, background: '#22c55e' }}
                  />
                </div>
              </div>
              <div className={styles.distributionItem}>
                <div className={styles.distributionLabelRow}>
                  <span>Late</span>
                  <span>
                    {attendanceMetrics.lateCount} (
                    {formatPercentage(
                      attendanceMetrics.totalRecords > 0
                        ? (attendanceMetrics.lateCount / attendanceMetrics.totalRecords) * 100
                        : 0
                    )}
                    )
                  </span>
                </div>
                <div className={styles.distributionBarTrack}>
                  <div
                    className={styles.distributionBarFill}
                    style={{
                      width: `${attendanceMetrics.totalRecords > 0 ? (attendanceMetrics.lateCount / attendanceMetrics.totalRecords) * 100 : 0}%`,
                      background: '#eab308',
                    }}
                  />
                </div>
              </div>
              <div className={styles.distributionItem}>
                <div className={styles.distributionLabelRow}>
                  <span>Absent</span>
                  <span>
                    {attendanceMetrics.absentCount} (
                    {formatPercentage(
                      attendanceMetrics.totalRecords > 0
                        ? (attendanceMetrics.absentCount / attendanceMetrics.totalRecords) * 100
                        : 0
                    )}
                    )
                  </span>
                </div>
                <div className={styles.distributionBarTrack}>
                  <div
                    className={styles.distributionBarFill}
                    style={{
                      width: `${attendanceMetrics.totalRecords > 0 ? (attendanceMetrics.absentCount / attendanceMetrics.totalRecords) * 100 : 0}%`,
                      background: '#ef4444',
                    }}
                  />
                </div>
              </div>
              <div className={styles.distributionItem}>
                <div className={styles.distributionLabelRow}>
                  <span>Excused</span>
                  <span>
                    {attendanceMetrics.excusedCount} (
                    {formatPercentage(
                      attendanceMetrics.totalRecords > 0
                        ? (attendanceMetrics.excusedCount / attendanceMetrics.totalRecords) * 100
                        : 0
                    )}
                    )
                  </span>
                </div>
                <div className={styles.distributionBarTrack}>
                  <div
                    className={styles.distributionBarFill}
                    style={{
                      width: `${attendanceMetrics.totalRecords > 0 ? (attendanceMetrics.excusedCount / attendanceMetrics.totalRecords) * 100 : 0}%`,
                      background: '#a855f7',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {category === 'finance' && !financeMetrics && (
        <p role="status">Finance totals require permission to view settled payments.</p>
      )}

      {category === 'finance' && financeMetrics && (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Billed</span>
              <span className={styles.metricValue}>{formatPaise(financeMetrics.totalBilledPaise)}</span>
              <span className={styles.metricSubtext}>School-wide invoices</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Collected</span>
              <span className={styles.metricValue}>{formatPaise(financeMetrics.totalCollectedPaise)}</span>
              <span className={styles.metricSubtext}>Settled payments only</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Outstanding Balance</span>
              <span className={styles.metricValue}>{formatPaise(financeMetrics.outstandingPaise)}</span>
              <span className={styles.metricSubtext}>Pending student ledger</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Overdue Amount</span>
              <span className={styles.metricValue}>{financeMetrics.overduePaise === null ? 'Unavailable' : formatPaise(financeMetrics.overduePaise)}</span>
              <span className={styles.metricSubtext}>{financeMetrics.overduePaise === null ? 'School timezone is unavailable' : 'Invoices past due date'}</span>
            </div>
          </div>

          {financeMetrics.methodBreakdown.length > 0 && (
            <div className={styles.visualSection}>
              <div className={styles.visualHeader}>
                <h3 className={styles.visualTitle}>Settled Collections by Payment Method</h3>
                <span className={styles.metricSubtext}>
                  Collection Rate: {financeMetrics.collectionRatePercent === null ? 'Unavailable' : formatPercentage(financeMetrics.collectionRatePercent)}
                </span>
              </div>
              <div className={styles.distributionList}>
                {financeMetrics.methodBreakdown.map(item => {
                  const pct = item.sharePercent;
                  return (
                    <div key={item.method} className={styles.distributionItem}>
                      <div className={styles.distributionLabelRow}>
                        <span style={{ textTransform: 'uppercase' }}>{item.method}</span>
                        <span>
                          {formatPaise(item.totalPaise)} ({item.count} receipts · {pct}%)
                        </span>
                      </div>
                      <div className={styles.distributionBarTrack}>
                        <div
                          className={styles.distributionBarFill}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {category === 'exams' && examMetrics && (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Exams</span>
              <span className={styles.metricValue}>{examMetrics.totalExams}</span>
              <span className={styles.metricSubtext}>{examMetrics.publishedExams} published</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Evaluated Submissions</span>
              <span className={styles.metricValue}>{examMetrics.totalEntries}</span>
              <span className={styles.metricSubtext}>Score entries recorded</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Pass Rate</span>
              <span className={styles.metricValue}>{formatPercentage(examMetrics.passRatePercent)}</span>
              <span className={styles.metricSubtext}>
                {examMetrics.passingEntries} passing score entries
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Average Score</span>
              <span className={styles.metricValue}>
                {formatPercentage(examMetrics.averageScorePercent)}
              </span>
              <span className={styles.metricSubtext}>Relative to max marks</span>
            </div>
          </div>

          <div className={styles.visualSection}>
            <div className={styles.visualHeader}>
              <h3 className={styles.visualTitle}>Academic Performance Summary</h3>
              <span className={styles.metricSubtext}>Passing criteria based on individual exam passing marks</span>
            </div>
            <div className={styles.distributionList}>
              <div className={styles.distributionItem}>
                <div className={styles.distributionLabelRow}>
                  <span>Passing Submissions</span>
                  <span>
                    {examMetrics.passingEntries} of {examMetrics.totalEntries} (
                    {formatPercentage(examMetrics.passRatePercent)})
                  </span>
                </div>
                <div className={styles.distributionBarTrack}>
                  <div
                    className={styles.distributionBarFill}
                    style={{ width: `${examMetrics.passRatePercent}%`, background: '#22c55e' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {category === 'staff' && staffMetrics && (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Staff</span>
              <span className={styles.metricValue}>{staffMetrics.totalStaff}</span>
              <span className={styles.metricSubtext}>Registered faculty & staff</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Active Faculty</span>
              <span className={styles.metricValue}>{staffMetrics.activeStaff}</span>
              <span className={styles.metricSubtext}>Active employment status</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Teaching Assignments</span>
              <span className={styles.metricValue}>{staffMetrics.totalTeacherAssignments}</span>
              <span className={styles.metricSubtext}>Active class/subject allocations</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Departments</span>
              <span className={styles.metricValue}>{staffMetrics.departmentBreakdown.length}</span>
              <span className={styles.metricSubtext}>Academic and admin units</span>
            </div>
          </div>

          {staffMetrics.departmentBreakdown.length > 0 && (
            <div className={styles.visualSection}>
              <div className={styles.visualHeader}>
                <h3 className={styles.visualTitle}>Faculty Distribution by Department</h3>
              </div>
              <div className={styles.distributionList}>
                {staffMetrics.departmentBreakdown.map(item => {
                  const pct =
                    staffMetrics.totalStaff > 0
                      ? Math.round((item.count / staffMetrics.totalStaff) * 100)
                      : 0;
                  return (
                    <div key={item.department} className={styles.distributionItem}>
                      <div className={styles.distributionLabelRow}>
                        <span>{item.department}</span>
                        <span>
                          {item.count} staff ({pct}%)
                        </span>
                      </div>
                      <div className={styles.distributionBarTrack}>
                        <div
                          className={styles.distributionBarFill}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Filter Toolbar */}
      <form action={formAction} className={styles.filterForm}>
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="page" value="1" />

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="rep-search" className={styles.filterLabel}>
              Search
            </label>
            <input
              id="rep-search"
              name="search"
              type="text"
              placeholder="Search keyword..."
              defaultValue={filters.search}
              className={styles.filterInput}
            />
          </div>

          {options.years.length > 0 && (
            <div className={styles.filterGroup}>
              <label htmlFor="rep-year" className={styles.filterLabel}>
                Academic Year
              </label>
              <select
                id="rep-year"
                name="academicYearId"
                defaultValue={filters.academicYearId}
                className={styles.filterSelect}
              >
                <option value="">All Academic Years</option>
                {options.years.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {options.classes.length > 0 && (
            <div className={styles.filterGroup}>
              <label htmlFor="rep-class" className={styles.filterLabel}>
                Class
              </label>
              <select
                id="rep-class"
                name="classId"
                defaultValue={filters.classId}
                className={styles.filterSelect}
              >
                <option value="">All Classes</option>
                {options.classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {options.sections.length > 0 && (
            <div className={styles.filterGroup}>
              <label htmlFor="rep-section" className={styles.filterLabel}>
                Section
              </label>
              <select
                id="rep-section"
                name="sectionId"
                defaultValue={filters.sectionId}
                className={styles.filterSelect}
              >
                <option value="">All Sections</option>
                {options.sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.className} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.filterGroup}>
            <label htmlFor="rep-from" className={styles.filterLabel}>
              From Date
            </label>
            <input
              id="rep-from"
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="rep-to" className={styles.filterLabel}>
              To Date
            </label>
            <input
              id="rep-to"
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterActions}>
            <button type="submit" className={styles.applyButton} disabled={isPending}>
              <Filter size={14} aria-hidden="true" />
              {isPending ? 'Filtering…' : 'Apply'}
            </button>
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleResetFilters}
              disabled={isPending}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* Paginated Data Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.dataTable} aria-label={`${category} report data`}>
          <thead>
            {category === 'enrollment' && (
              <tr>
                <th scope="col">Student Name</th>
                <th scope="col">Registration No.</th>
                <th scope="col">Class & Section</th>
                <th scope="col">Academic Year</th>
                <th scope="col">Enrollment Status</th>
              </tr>
            )}
            {category === 'attendance' && (
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Student</th>
                <th scope="col">Registration No.</th>
                <th scope="col">Class / Section</th>
                <th scope="col">Status</th>
                <th scope="col">Remarks</th>
              </tr>
            )}
            {category === 'finance' && (
              <tr>
                <th scope="col">Invoice No.</th>
                <th scope="col">Student</th>
                <th scope="col">Description</th>
                <th scope="col">Due Date</th>
                <th scope="col">Billed</th>
                <th scope="col">Paid</th>
                <th scope="col">Balance</th>
                <th scope="col">Status</th>
              </tr>
            )}
            {category === 'exams' && (
              <tr>
                <th scope="col">Exam Name</th>
                <th scope="col">Subject</th>
                <th scope="col">Class / Section</th>
                <th scope="col">Student</th>
                <th scope="col">Score</th>
                <th scope="col">Result</th>
                <th scope="col">Publication</th>
              </tr>
            )}
            {category === 'staff' && (
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Employee Code</th>
                <th scope="col">Department</th>
                <th scope="col">Assigned Sections</th>
                <th scope="col">Status</th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No records match the selected report criteria.
                </td>
              </tr>
            ) : (
              rows.map((row: ReportTableRow) => {
                if (row.reportKind === 'enrollment') {
                  const statusClass =
                    row.status === 'active'
                      ? styles.statusActive
                      : row.status === 'inactive'
                      ? styles.statusInactive
                      : styles.statusWithdrawn;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.studentName ?? '—'}</strong>
                      </td>
                      <td>{row.registrationNumber ?? '—'}</td>
                      <td>
                        {row.className && row.sectionName
                          ? `${row.className} - ${row.sectionName}`
                          : 'Unassigned'}
                      </td>
                      <td>{row.academicYear ?? '—'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                }

                if (row.reportKind === 'attendance') {
                  const statusClass =
                    row.status === 'present'
                      ? styles.statusPresent
                      : row.status === 'late'
                      ? styles.statusLate
                      : row.status === 'absent'
                      ? styles.statusAbsent
                      : styles.statusExcused;
                  return (
                    <tr key={row.id}>
                      <td>{formatReportDate(row.date)}</td>
                      <td>
                        <strong>{row.studentName ?? '—'}</strong>
                      </td>
                      <td>{row.registrationNumber ?? '—'}</td>
                      <td>
                        {row.className && row.sectionName
                          ? `${row.className} - ${row.sectionName}`
                          : '—'}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass}`}>{row.status}</span>
                      </td>
                      <td>{row.remarks || '—'}</td>
                    </tr>
                  );
                }

                if (row.reportKind === 'finance') {
                  const statusClass =
                    row.status === 'paid'
                      ? styles.statusSettled
                      : row.status === 'partial'
                      ? styles.statusPartial
                      : row.status === 'unpaid'
                      ? styles.statusUnpaid
                      : styles.statusOverdue;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.invoiceNumber}</strong>
                      </td>
                      <td>{row.studentName ?? '—'}</td>
                      <td>{row.title}</td>
                      <td>{formatReportDate(row.dueDate)}</td>
                      <td>{formatPaise(row.amountPaise)}</td>
                      <td>{formatPaise(row.paidPaise)}</td>
                      <td>{formatPaise(row.balancePaise)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                }

                if (row.reportKind === 'exams') {
                  const resultClass = row.isPassing ? styles.statusPassing : styles.statusFailing;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.examName}</strong>
                      </td>
                      <td>{row.subjectCode}</td>
                      <td>
                        {row.className && row.sectionName
                          ? `${row.className} - ${row.sectionName}`
                          : '—'}
                      </td>
                      <td>{row.studentName ?? '—'}</td>
                      <td>
                        <strong>{row.marksObtained}</strong> / {row.maxMarks} (Pass: {row.passingMarks})
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${resultClass}`}>
                          {row.isPassing ? 'Pass' : 'Needs Improvement'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            row.isPublished ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {row.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                    </tr>
                  );
                }

                if (row.reportKind === 'staff') {
                  return (
                    <tr key={row.profileId}>
                      <td>
                        <strong>{row.displayName}</strong>
                      </td>
                      <td>{row.employeeCode}</td>
                      <td>{row.department}</td>
                      <td>{row.assignedSectionsCount} sections</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            row.isActive ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                }

                return null;
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className={styles.pagination}>
        <div>
          Showing page <strong>{page}</strong> · Total records: <strong>{totalRows}</strong>
        </div>
        <div className={styles.paginationControls}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNext || isPending}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
