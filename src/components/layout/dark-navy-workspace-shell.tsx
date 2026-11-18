'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import styles from '@/components/workspaces/live-admin-dashboard.module.css';

export type DarkNavyRole = 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';

export interface DarkNavyWorkspaceShellProps {
  /** Target role for styling and contextual accents */
  role: DarkNavyRole;
  /** School name displayed in header identity */
  schoolName?: string;
  /** Primary user or role title displayed in header */
  userTitle?: string;
  /** Role identity icon rendered in the header */
  identityIcon?: ReactNode;
  /** Brand link target (defaults to /staff for staff, / for others) */
  brandHref?: string;
  /** Navigation links rendered in the dark navy sidebar */
  sidebarNav: ReactNode;
  /** Header action buttons (e.g. Sign out form or All Demos link) */
  headerActions?: ReactNode;
  /** Optional custom mobile navigation (defaults to sidebarNav) */
  mobileNav?: ReactNode;
  /** Optional top hero banner configuration */
  hero?: {
    category?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
  };
  /** Main workspace children */
  children: ReactNode;
}

const roleDisplayTitles: Record<DarkNavyRole, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  accountant: 'Accountant',
};

/**
 * Shared Dark Navy Workspace Shell for BRIGHTCAMP School ERP.
 * 
 * Unifies Admin, Teacher, Student, Parent and Accountant dashboards
 * under the authoritative Codex dark navy design system:
 * - Fixed 16rem dark navy sidebar with radial gradient (#183864 -> #08152b)
 * - BRIGHTCAMP brand mark with white typography
 * - Role-specific badge and accent highlights (Admin violet, Teacher cyan,
 *   Student amber, Parent rose, Accountant mint)
 * - Crisp white identity and actions header bar
 * - Collapsible mobile drawer navigation
 * - Accessible keyboard navigation and skip links
 */
export function DarkNavyWorkspaceShell({
  role,
  schoolName = 'BRIGHTCAMP',
  userTitle,
  identityIcon,
  brandHref,
  sidebarNav,
  headerActions,
  mobileNav,
  hero,
  children,
}: DarkNavyWorkspaceShellProps) {
  const displayTitle = roleDisplayTitles[role] || role;
  const defaultBrandHref = role === 'student' || role === 'parent' ? '/' : '/staff';
  const resolvedBrandHref = brandHref || defaultBrandHref;

  return (
    <div className={styles.shell} data-role={role}>
      <a className="skip-link" href="#workspace-content">Skip to workspace</a>
      <aside className={styles.sidebar} aria-label={`${displayTitle} navigation`}>
        <Link href={resolvedBrandHref} aria-label="Brightcamp home">
          <Brand />
        </Link>
        <div className={styles.sidebarRoleBadge}>
          <span>{displayTitle} workspace</span>
        </div>
        <nav aria-label={`${displayTitle} workspace`}>
          {sidebarNav}
        </nav>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.identity}>
            {identityIcon}
            <div>
              <strong>{schoolName}</strong>
              <span>{userTitle || `${displayTitle} workspace`}</span>
            </div>
          </div>
          {headerActions && <div className={styles.headerActions}>{headerActions}</div>}
        </header>
        <details className={styles.mobile} data-admin-drawer>
          <summary>
            <Menu size={18} aria-hidden="true" /> {displayTitle} navigation
          </summary>
          <nav aria-label={`${displayTitle} mobile workspace`}>
            {mobileNav || sidebarNav}
          </nav>
        </details>
        <main id="workspace-content" className={styles.main} tabIndex={-1}>
          {hero && (
            <section id="overview" className={styles.hero} aria-labelledby="workspace-welcome-heading">
              {hero.category && <p className={styles.category}>{hero.category}</p>}
              <h1 id="workspace-welcome-heading" tabIndex={-1}>{hero.title}</h1>
              {hero.subtitle && <span>{hero.subtitle}</span>}
              {hero.actions && <div className={styles.shortcuts}>{hero.actions}</div>}
            </section>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
