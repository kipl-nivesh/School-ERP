'use client';

import { useState, useActionState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { updateSchoolNameAction, updateSchoolTimezoneAction } from '@/app/staff/school-settings-actions';
import { COMMON_SCHOOL_TIMEZONES } from '@/lib/timezone/school-timezone';
import type {
  SchoolSettingsPage,
  SettingsActionResult,
  SettingsTab,
} from '@/lib/services/school-settings-fields';
import styles from './school-settings-management.module.css';

interface SchoolSettingsManagementProps {
  initial: SchoolSettingsPage;
}

const initialActionResult: SettingsActionResult = { ok: false, message: '' };

export function SchoolSettingsManagement({ initial }: SchoolSettingsManagementProps) {
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [actionState, formAction, isPending] = useActionState(updateSchoolNameAction, initialActionResult);
  const [tzState, tzAction, tzPending] = useActionState(updateSchoolTimezoneAction, initialActionResult);

  if (initial.kind === 'denied') {
    return (
      <div className={styles.container}>
        <div className={styles.stateBox}>
          <ShieldCheck size={36} color="#ef4444" aria-hidden="true" />
          <h2 className={styles.stateBoxTitle}>Access Restricted</h2>
          <p>{initial.reason}</p>
        </div>
      </div>
    );
  }

  if (initial.kind === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.stateBox}>
          <AlertTriangle size={36} color="#f59e0b" aria-hidden="true" />
          <h2 className={styles.stateBoxTitle}>Settings Unavailable</h2>
          <p>{initial.message}</p>
        </div>
      </div>
    );
  }

  const {
    profile,
    academicYears,
    security,
    canWriteSettings,
    timezoneNotice,
    academicNotice,
  } = initial;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr.length === 10 ? `${isoStr}T00:00:00Z` : isoStr);
      if (Number.isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className={styles.container}>
      {/* Category Tabs */}
      <nav className={styles.tabs} aria-label="School Settings Categories">
        <button
          type="button"
          className={`${styles.tabButton} ${tab === 'profile' ? styles.activeTab : ''}`}
          onClick={() => setTab('profile')}
        >
          <Building2 size={16} aria-hidden="true" />
          School Profile
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === 'academics' ? styles.activeTab : ''}`}
          onClick={() => setTab('academics')}
        >
          <Calendar size={16} aria-hidden="true" />
          Academic Configuration
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === 'timezone' ? styles.activeTab : ''}`}
          onClick={() => setTab('timezone')}
        >
          <Clock size={16} aria-hidden="true" />
          Timezone & Regional
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setTab('security')}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          Security & Access
        </button>
      </nav>

      {/* Tab 1: School Profile */}
      {tab === 'profile' && (
        <section className={styles.panel} aria-labelledby="profile-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="profile-heading" className={styles.panelTitle}>School Profile</h2>
              <p className={styles.panelDescription}>Core institution identification and registration status.</p>
            </div>
            <span
              className={`${styles.statusBadge} ${
                profile.status === 'active'
                  ? styles.statusActive
                  : profile.status === 'onboarding'
                  ? styles.statusOnboarding
                  : styles.statusSuspended
              }`}
            >
              {profile.status}
            </span>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>School Code</span>
              <span className={styles.infoValue}>{profile.code}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Immutable tenant identifier</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Official Name</span>
              <span className={styles.infoValue}>{profile.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Display Name</span>
              <span className={styles.infoValue}>{profile.displayName || profile.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Registration Date</span>
              <span className={styles.infoValue}>{formatDate(profile.createdAt)}</span>
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formTitle}>Update School Name</h3>
            {canWriteSettings ? (
              <form action={formAction} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="schoolName" className={styles.formLabel}>
                    Official School Name
                  </label>
                  <input
                    id="schoolName"
                    name="schoolName"
                    type="text"
                    defaultValue={profile.name}
                    required
                    maxLength={160}
                    className={styles.formInput}
                    disabled={isPending}
                  />
                </div>

                {actionState.message && (
                  <p
                    className={actionState.ok ? styles.feedbackSuccess : styles.feedbackError}
                    role="status"
                  >
                    {actionState.message}
                  </p>
                )}

                <button type="submit" className={styles.saveButton} disabled={isPending}>
                  <Save size={14} aria-hidden="true" />
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            ) : (
              <div className={styles.warningBanner} role="status">
                <Lock size={18} className={styles.warningIcon} aria-hidden="true" />
                <div>
                  <strong>Settings Writes Locked: </strong>
                  <span>
                    Fresh password reauthentication (within the last 10 minutes) and the{' '}
                    <code>school.settings.write</code> permission are required to modify institutional settings.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab 2: Academic Configuration */}
      {tab === 'academics' && (
        <section className={styles.panel} aria-labelledby="academics-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="academics-heading" className={styles.panelTitle}>Academic Configuration</h2>
              <p className={styles.panelDescription}>Registered academic years and operating sessions.</p>
            </div>
          </div>

          <div className={styles.noticeBanner} role="status">
            <Info size={18} className={styles.noticeIcon} aria-hidden="true" />
            <span>{academicNotice}</span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable} aria-label="Academic Years">
              <thead>
                <tr>
                  <th scope="col">Academic Year</th>
                  <th scope="col">Start Date</th>
                  <th scope="col">End Date</th>
                  <th scope="col">Session Status</th>
                </tr>
              </thead>
              <tbody>
                {academicYears.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#475569' }}>
                      No academic years registered.
                    </td>
                  </tr>
                ) : (
                  academicYears.map(year => (
                    <tr key={year.id}>
                      <td>
                        <strong>{year.label}</strong>
                      </td>
                      <td>{formatDate(year.startsOn)}</td>
                      <td>{formatDate(year.endsOn)}</td>
                      <td>
                        {year.isCurrent ? (
                          <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                            Current Academic Session
                          </span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '0.8125rem' }}>Archived / Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 3: Timezone & Regional */}
      {tab === 'timezone' && (
        <section className={styles.panel} aria-labelledby="timezone-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="timezone-heading" className={styles.panelTitle}>Timezone &amp; Regional Dates</h2>
              <p className={styles.panelDescription}>School-local calendar date, overdue fee evaluation, and display semantics.</p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Configured School Timezone</span>
              <span className={styles.infoValue}>{profile.timezone ?? 'Not configured'}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{profile.timezoneOffsetLabel}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Verification Status</span>
              <span className={styles.infoValue}>
                {profile.timezoneVerified ? 'Verified' : 'Unverified'}
              </span>
              <span style={{ fontSize: '0.75rem', color: profile.timezoneVerified ? '#047857' : '#b91c1c' }}>
                {profile.timezoneVerified
                  ? 'Active for overdue fees and school-local dates'
                  : 'Verify timezone to enable school-local overdue totals'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Current School-Local Date &amp; Time</span>
              <span className={styles.infoValue}>
                {profile.schoolLocalDate && profile.schoolLocalTime
                  ? `${profile.schoolLocalDate} · ${profile.schoolLocalTime}`
                  : 'Awaiting verified timezone'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>DD-MM-YYYY · 12-hour AM/PM</span>
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formTitle}>Configure &amp; Verify School Timezone</h3>
            {canWriteSettings ? (
              <form action={tzAction} className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="schoolTimezone" className={styles.formLabel}>
                    IANA Timezone Identifier
                  </label>
                  <input
                    id="schoolTimezone"
                    name="timezone"
                    type="text"
                    list="common-school-timezones"
                    defaultValue={profile.timezone ?? 'Asia/Kolkata'}
                    required
                    maxLength={80}
                    className={styles.formInput}
                    disabled={tzPending}
                  />
                  <datalist id="common-school-timezones">
                    {COMMON_SCHOOL_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz} />
                    ))}
                  </datalist>
                </div>

                {tzState.message && (
                  <p
                    className={tzState.ok ? styles.feedbackSuccess : styles.feedbackError}
                    role="status"
                  >
                    {tzState.message}
                  </p>
                )}

                <button type="submit" className={styles.saveButton} disabled={tzPending}>
                  <Save size={14} aria-hidden="true" />
                  {tzPending ? 'Verifying & Saving…' : 'Verify & Save Timezone'}
                </button>
              </form>
            ) : (
              <div className={styles.warningBanner} role="status">
                <Lock size={18} className={styles.warningIcon} aria-hidden="true" />
                <div>
                  <strong>Timezone Writes Locked: </strong>
                  <span>
                    Fresh Admin MFA (AAL2) and the <code>school.settings.write</code> permission are required to update the school timezone.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.noticeBanner} role="status">
            <Info size={18} className={styles.noticeIcon} aria-hidden="true" />
            <span>{timezoneNotice}</span>
          </div>
        </section>
      )}

      {/* Tab 4: Security & Access */}
      {tab === 'security' && (
        <section className={styles.panel} aria-labelledby="security-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="security-heading" className={styles.panelTitle}>Security & Access Overview</h2>
              <p className={styles.panelDescription}>Session assurance, permissions, and reauthentication status.</p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Active Staff Role</span>
              <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                {security.role}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Assurance Level</span>
              <span className={styles.infoValue} style={{ textTransform: 'uppercase' }}>
                {security.assuranceLevel}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Stage B Staff Policy</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Password Reauthentication</span>
              <span
                className={styles.infoValue}
                style={{ color: security.hasRecentPassword ? '#166534' : '#b45309' }}
              >
                {security.hasRecentPassword ? 'Verified (< 10m)' : 'Stale / Required'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {security.hasRecentPassword ? 'Sensitive operations unlocked' : 'Reauthentication needed for writes'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>School Context</span>
              <span className={styles.infoValue}>{security.schoolCode}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{security.schoolId.slice(0, 8)}…</span>
            </div>
          </div>

          <div className={styles.noticeBanner} role="status">
            <CheckCircle2 size={18} className={styles.noticeIcon} aria-hidden="true" />
            <div>
              <strong>Staff Authentication Policy (Stage B): </strong>
              <span>
                Ordinary Admin, Teacher, and Accountant duties are authorized with valid AAL1 or AAL2 sessions.
                Sensitive actions (such as settings updates) enforce fresh password evidence. Platform registration
                approval retains independent operator AAL2 enforcement.
              </span>
            </div>
          </div>

          <div>
            <h3 className={styles.formTitle}>Granted Role Permissions ({security.permissions.length})</h3>
            <div className={styles.permissionList}>
              {security.permissions.map(perm => (
                <span key={perm} className={styles.permissionBadge}>
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
