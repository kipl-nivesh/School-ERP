'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  NotebookPen,
  Receipt,
  UsersRound,
} from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { logoutParent } from '@/app/login/parent/actions';
import { resolveParentWorkspace, type ParentWorkspaceKey } from '@/lib/parent/parent-workspace';
import type { ParentChildSummary } from '@/lib/parent/server';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

export type { ParentWorkspaceKey };

export const PARENT_NAV_ITEMS: readonly {
  readonly key: ParentWorkspaceKey;
  readonly label: string;
}[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'children', label: 'My Children' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'timetable', label: 'Timetable' },
  { key: 'homework', label: 'Homework' },
  { key: 'exams', label: 'Exams & Results' },
  { key: 'fees', label: 'Fees & Receipts' },
  { key: 'materials', label: 'Study Materials' },
  { key: 'announcements', label: 'School Announcements' },
];

function NavIcon({ workspace }: { workspace: ParentWorkspaceKey }) {
  switch (workspace) {
    case 'overview':
      return <LayoutDashboard size={18} aria-hidden="true" />;
    case 'children':
      return <UsersRound size={18} aria-hidden="true" />;
    case 'attendance':
      return <ClipboardList size={18} aria-hidden="true" />;
    case 'timetable':
      return <CalendarDays size={18} aria-hidden="true" />;
    case 'homework':
      return <NotebookPen size={18} aria-hidden="true" />;
    case 'exams':
      return <Award size={18} aria-hidden="true" />;
    case 'fees':
      return <Receipt size={18} aria-hidden="true" />;
    case 'materials':
      return <FolderOpen size={18} aria-hidden="true" />;
    case 'announcements':
      return <Megaphone size={18} aria-hidden="true" />;
  }
}

export function ParentModuleSkeleton({ label }: { label?: string }) {
  return (
    <div className={teacherStyles.skeletonWrap} role="status" aria-live="polite" aria-label={label ? `Loading ${label}` : 'Loading module'}>
      <div className={teacherStyles.skeletonHeader}>
        <div className={teacherStyles.skeletonTitle} />
        <div className={teacherStyles.skeletonSubtitle} />
      </div>
      <div className={teacherStyles.skeletonCards}>
        <div className={teacherStyles.skeletonCard} />
        <div className={teacherStyles.skeletonCard} />
        <div className={teacherStyles.skeletonCard} />
        <div className={teacherStyles.skeletonCard} />
      </div>
      <div className={teacherStyles.skeletonPanel} />
    </div>
  );
}

export function ParentWorkspaceShell({
  schoolName,
  guardianName,
  childrenList,
  selectedChildId,
  children,
}: {
  schoolName: string;
  guardianName: string;
  childrenList: ParentChildSummary[];
  selectedChildId: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileDrawerRef = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();

  const urlWorkspace = resolveParentWorkspace(searchParams.get('workspace'));
  const [pendingTarget, setPendingTarget] = useState<ParentWorkspaceKey | null>(null);
  const activeWorkspace = isPending && pendingTarget ? pendingTarget : urlWorkspace;

  function buildHref(workspace: ParentWorkspaceKey, childId: string | null = selectedChildId) {
    const params = new URLSearchParams();
    params.set('workspace', workspace);
    if (childId) params.set('child', childId);
    return `/parent/dashboard?${params.toString()}`;
  }

  function navigateTo(workspace: ParentWorkspaceKey, childId: string | null = selectedChildId) {
    if (mobileDrawerRef.current) {
      mobileDrawerRef.current.open = false;
    }
    setPendingTarget(workspace);
    startTransition(() => {
      router.push(buildHref(workspace, childId), { scroll: true });
    });
  }

  function renderNavLinks() {
    return (
      <nav aria-label="Parent portal navigation">
        {PARENT_NAV_ITEMS.map((item) => {
          const active = activeWorkspace === item.key;
          return (
            <Link
              key={item.key}
              href={buildHref(item.key)}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                navigateTo(item.key);
              }}
            >
              <NavIcon workspace={item.key} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const activeLabel = PARENT_NAV_ITEMS.find((i) => i.key === activeWorkspace)?.label ?? 'Overview';

  return (
    <div className={styles.shell} data-role="parent">
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.sidebarRoleBadge}>
          <span>Parent portal</span>
        </div>
        {renderNavLinks()}
        <form action={logoutParent} className={styles.sidebarSignout}>
          <button type="submit">
            <LogOut size={16} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </aside>

      <div className={styles.workspace}>
        <header className={`${styles.header} flex-wrap`}>
          <div className={styles.identity}>
            <UsersRound aria-hidden="true" />
            <div>
              <strong>{guardianName}</strong>
              <span>{schoolName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {childrenList.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <BookOpen size={15} aria-hidden="true" />
                <span className="font-medium">Child:</span>
                <select
                  aria-label="Select child"
                  value={selectedChildId ?? ''}
                  onChange={(e) => navigateTo(activeWorkspace, e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900"
                >
                  {childrenList.map((child) => (
                    <option key={child.student_id} value={child.student_id}>
                      {child.student_name} ({child.class_name ?? 'Unplaced'}
                      {child.section_name ? ` - ${child.section_name}` : ''})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </header>

        <details ref={mobileDrawerRef} className={styles.mobile}>
          <summary>
            <Menu aria-hidden="true" /> Parent navigation — {activeLabel}
          </summary>
          {renderNavLinks()}
          <form action={logoutParent} className={styles.sidebarSignout}>
            <button type="submit">
              <LogOut size={16} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </form>
        </details>

        <main className={styles.main}>
          {isPending ? <ParentModuleSkeleton label={activeLabel} /> : children}
        </main>
      </div>
    </div>
  );
}
