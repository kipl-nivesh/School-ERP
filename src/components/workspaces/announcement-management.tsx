'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Megaphone,
  RotateCcw,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { filterAnnouncements } from '@/app/staff/announcement-workspace-actions';
import {
  formatAnnouncementDate,
  formatAnnouncementDateTime,
  type AnnouncementPage,
  type AnnouncementRow,
} from '@/lib/services/announcement-fields';
import styles from './announcement-management.module.css';

interface AnnouncementManagementProps {
  initial: AnnouncementPage;
}

export function AnnouncementManagement({ initial }: AnnouncementManagementProps) {
  const [result, filterAction, isFiltering] = useActionState(filterAnnouncements, initial);
  const [, startTransition] = useTransition();

  const [activeDetail, setActiveDetail] = useState<AnnouncementRow | null>(
    initial.kind === 'ready' && initial.selectedAnnouncement ? initial.selectedAnnouncement : null
  );

  function handleReset() {
    startTransition(() => {
      const formData = new FormData();
      filterAction(formData);
      setActiveDetail(null);
    });
  }

  function handlePageChange(newPage: number) {
    if (result.kind !== 'ready') return;
    startTransition(() => {
      const formData = new FormData();
      formData.set('page', String(newPage));
      if (result.filters.search) formData.set('search', result.filters.search);
      if (result.filters.audience) formData.set('audience', result.filters.audience);
      if (result.filters.category) formData.set('category', result.filters.category);
      if (result.filters.urgency) formData.set('urgency', result.filters.urgency);
      if (result.filters.status) formData.set('status', result.filters.status);
      if (result.filters.dateFrom) formData.set('dateFrom', result.filters.dateFrom);
      if (result.filters.dateTo) formData.set('dateTo', result.filters.dateTo);
      filterAction(formData);
    });
  }

  if (result.kind === 'denied') {
    return (
      <section className={styles.card} aria-labelledby="announcements-denied-heading">
        <h2 id="announcements-denied-heading" className={styles.cardTitle}>
          <ShieldAlert size={20} color="#f87171" aria-hidden="true" />
          Announcements Unavailable
        </h2>
        <p className={styles.notice} role="status">
          Your current school membership does not hold permission to view school announcements (`announcements.read`).
        </p>
      </section>
    );
  }

  if (result.kind === 'error') {
    return (
      <section className={styles.card} aria-labelledby="announcements-error-heading">
        <h2 id="announcements-error-heading" className={styles.cardTitle}>
          <AlertTriangle size={20} color="#fbbf24" aria-hidden="true" />
          Announcements Error
        </h2>
        <p className={styles.error} role="alert">
          {result.message || 'School announcements could not be loaded. Please refresh to try again.'}
        </p>
        <button type="button" onClick={handleReset} className={styles.filterBtn}>
          <RotateCcw size={15} aria-hidden="true" /> Reload Announcements
        </button>
      </section>
    );
  }

  if (result.kind === 'invalid') {
    return (
      <section className={styles.card} aria-labelledby="announcements-invalid-heading">
        <h2 id="announcements-invalid-heading" className={styles.cardTitle}>
          <AlertTriangle size={20} color="#fbbf24" aria-hidden="true" />
          Invalid Request
        </h2>
        <p className={styles.error} role="alert">
          {result.message || 'The requested filters or query parameters were invalid.'}
        </p>
        <button type="button" onClick={handleReset} className={styles.filterBtn}>
          <RotateCcw size={15} aria-hidden="true" /> Reset Filters
        </button>
      </section>
    );
  }

  const { rows, summary, filters, page, next } = result;

  return (
    <div className={styles.wrapper} aria-busy={isFiltering}>
      {/* 1. Summary Metrics Cards */}
      <section className={styles.summaryGrid} aria-label="Announcement Summary Metrics">
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            <Megaphone size={16} color="#38bdf8" aria-hidden="true" /> Total Notices
          </span>
          <span className={styles.metricValue}>{summary.totalCount}</span>
          <span className={styles.metricSubtext}>Recorded across school</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            <CheckCircle2 size={16} color="#34d399" aria-hidden="true" /> Active Notices
          </span>
          <span className={styles.metricValue}>{summary.activeCount}</span>
          <span className={styles.metricSubtext}>Currently broadcasted</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            <AlertTriangle size={16} color="#f87171" aria-hidden="true" /> Urgent Notices
          </span>
          <span className={styles.metricValue}>{summary.urgentCount}</span>
          <span className={styles.metricSubtext}>High priority active notices</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            <Clock size={16} color="#94a3b8" aria-hidden="true" /> Expired Notices
          </span>
          <span className={styles.metricValue}>{summary.expiredCount}</span>
          <span className={styles.metricSubtext}>Past valid expiry date</span>
        </div>
      </section>

      {/* 2. Main Directory & Filter Card */}
      <section className={styles.card} aria-labelledby="announcements-directory-heading">
        <div className={styles.cardHeader}>
          <h2 id="announcements-directory-heading" className={styles.cardTitle}>
            <Bell size={20} color="#38bdf8" aria-hidden="true" />
            School Announcements Directory
          </h2>
        </div>

        {/* Backend Architectural Notice (reporting Step 3/4 write safety blocker) */}
        <p className={styles.notice} role="status">
          <strong>Database Notice:</strong> This directory displays authoritative, school-scoped broadcast records from the database. Live creation, publication, or editing is kept strictly read-only because no transactional announcement creation procedure exists in the current database schema.
        </p>

        {/* Filter Controls Form */}
        <form action={filterAction} className={styles.controls} aria-label="Filter Announcements">
          <div className={styles.searchField}>
            <label htmlFor="ann-search">Search Announcement Title</label>
            <input
              id="ann-search"
              name="search"
              type="search"
              placeholder="Filter by announcement title…"
              defaultValue={filters.search}
              maxLength={80}
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="ann-audience">Target Audience</label>
            <select
              id="ann-audience"
              name="audience"
              defaultValue={filters.audience}
              className={styles.select}
            >
              <option value="">All Audiences</option>
              <option value="all">Whole School (All)</option>
              <option value="staff">Staff Only</option>
              <option value="students">Students Only</option>
              <option value="parents">Parents Only</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="ann-category">Category</label>
            <select
              id="ann-category"
              name="category"
              defaultValue={filters.category}
              className={styles.select}
            >
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="holiday">Holiday</option>
              <option value="administrative">Administrative</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="ann-urgency">Priority</label>
            <select
              id="ann-urgency"
              name="urgency"
              defaultValue={filters.urgency}
              className={styles.select}
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="ann-status">Status</label>
            <select
              id="ann-status"
              name="status"
              defaultValue={filters.status}
              className={styles.select}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="ann-date-from">Published From</label>
            <input
              id="ann-date-from"
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom}
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="ann-date-to">Published To</label>
            <input
              id="ann-date-to"
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo}
              className={styles.input}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" disabled={isFiltering} className={styles.filterBtn}>
              <Filter size={15} aria-hidden="true" />
              {isFiltering ? 'Filtering…' : 'Apply Filters'}
            </button>
            <button type="button" onClick={handleReset} className={styles.resetBtn}>
              <RotateCcw size={15} aria-hidden="true" /> Reset
            </button>
          </div>
        </form>

        {/* Results Table */}
        {!rows.length ? (
          <p className={styles.empty} role="status">
            No announcements match the selected filters or search query.
          </p>
        ) : (
          <div
            className={styles.tableScroll}
            tabIndex={0}
            role="region"
            aria-label="Announcements Table"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Announcement</th>
                  <th scope="col">Audience</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Published</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Author</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableTitleCell}>
                        <strong>{item.title}</strong>
                        <span className={styles.tableCategory}>{item.category}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeAudience}`}>
                        <Users size={12} aria-hidden="true" />
                        {item.targetAudience}
                      </span>
                    </td>
                    <td>
                      {item.isUrgent ? (
                        <span className={`${styles.badge} ${styles.badgeUrgent}`}>
                          <AlertTriangle size={12} aria-hidden="true" /> Urgent
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Standard</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          item.status === 'active'
                            ? styles.badgeActive
                            : item.status === 'expired'
                            ? styles.badgeExpired
                            : styles.badgeScheduled
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{formatAnnouncementDate(item.publishedAt)}</td>
                    <td>{item.expiresAt ? formatAnnouncementDate(item.expiresAt) : 'Permanent'}</td>
                    <td>
                      {item.authorName ? (
                        <div>
                          <strong>{item.authorName}</strong>
                          {item.authorDepartment && (
                            <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748b' }}>
                              {item.authorDepartment}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#64748b' }}>Staff Profile</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setActiveDetail(item)}
                        className={styles.viewBtn}
                        aria-label={`View details for ${item.title}`}
                      >
                        <Eye size={13} aria-hidden="true" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className={styles.pagination} aria-label="Announcements Pagination">
          <span className={styles.pageInfo}>
            Page {page} {next ? '(More records available)' : '(End of records)'}
          </span>
          <div className={styles.pageButtons}>
            <button
              type="button"
              disabled={page <= 1 || isFiltering}
              onClick={() => handlePageChange(page - 1)}
              className={styles.pageBtn}
            >
              Previous Page
            </button>
            <button
              type="button"
              disabled={!next || isFiltering}
              onClick={() => handlePageChange(page + 1)}
              className={styles.pageBtn}
            >
              Next Page
            </button>
          </div>
        </div>
      </section>

      {/* 3. Detailed Announcement Inspection Modal */}
      {activeDetail && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setActiveDetail(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#38bdf8' }}>
                  {activeDetail.category} Notice
                </span>
                <h3 id="detail-modal-title" className={styles.modalTitle}>
                  {activeDetail.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                className={styles.modalCloseBtn}
                aria-label="Close announcement detail"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.modalBadges}>
              <span className={`${styles.badge} ${styles.badgeAudience}`}>
                <Users size={12} aria-hidden="true" /> Target: {activeDetail.targetAudience}
              </span>
              {activeDetail.isUrgent && (
                <span className={`${styles.badge} ${styles.badgeUrgent}`}>
                  <AlertTriangle size={12} aria-hidden="true" /> Urgent Broadcast
                </span>
              )}
              <span
                className={`${styles.badge} ${
                  activeDetail.status === 'active'
                    ? styles.badgeActive
                    : activeDetail.status === 'expired'
                    ? styles.badgeExpired
                    : styles.badgeScheduled
                }`}
              >
                {activeDetail.status}
              </span>
            </div>

            <div className={styles.modalBody}>{activeDetail.content}</div>

            <div className={styles.modalMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Published At</span>
                <span className={styles.metaVal}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {formatAnnouncementDateTime(activeDetail.publishedAt)}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Valid Until / Expiration</span>
                <span className={styles.metaVal}>
                  <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {activeDetail.expiresAt ? formatAnnouncementDateTime(activeDetail.expiresAt) : 'No expiration (Permanent)'}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Author / Issuer</span>
                <span className={styles.metaVal}>
                  {activeDetail.authorName ?? 'Authorized Staff Member'}
                  {activeDetail.authorEmployeeCode ? ` (${activeDetail.authorEmployeeCode})` : ''}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Department</span>
                <span className={styles.metaVal}>
                  {activeDetail.authorDepartment ?? 'Administration'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
