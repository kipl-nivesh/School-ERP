'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  NotebookPen,
  Users,
} from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { logoutStaff } from '@/app/login/staff/actions';
import { resolveTeacherWorkspace, type TeacherWorkspaceKey } from '@/lib/staff/teacher-workspace';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

export type { TeacherWorkspaceKey };

export const TEACHER_NAV_ITEMS: readonly {
  readonly key: TeacherWorkspaceKey;
  readonly label: string;
  readonly href: string;
  readonly requiresClasses?: boolean;
}[] = [
  { key: 'overview', label: 'Overview', href: '/staff/teacher?workspace=overview' },
  { key: 'classes', label: 'My Classes', href: '/staff/teacher?workspace=classes', requiresClasses: true },
  { key: 'timetable', label: 'Timetable', href: '/staff/teacher?workspace=timetable', requiresClasses: true },
  { key: 'attendance', label: 'Attendance', href: '/staff/teacher?workspace=attendance' },
  { key: 'homework', label: 'Homework', href: '/staff/teacher?workspace=homework' },
  { key: 'exams', label: 'Exams & Marks', href: '/staff/teacher?workspace=exams' },
  { key: 'announcements', label: 'Staff Announcements', href: '/staff/teacher?workspace=announcements' },
  { key: 'reports', label: 'Teaching Reports', href: '/staff/teacher?workspace=reports' },
];

const HASH_TO_WORKSPACE: Record<string, TeacherWorkspaceKey> = {
  '#overview': 'overview',
  '#my-classes': 'classes',
  '#class-detail': 'classes',
  '#timetable': 'timetable',
  '#teacher-schedule': 'timetable',
  '#attendance-overview': 'attendance',
  '#class-attendance': 'attendance',
  '#attendance-history': 'attendance',
  '#homework-overview': 'homework',
  '#homework-directory': 'homework',
  '#teacher-exams': 'exams',
  '#exam-directory': 'exams',
  '#teacher-announcements': 'announcements',
  '#teacher-reports': 'reports',
};

function NavIcon({ workspace }: { workspace: TeacherWorkspaceKey }) {
  switch (workspace) {
    case 'overview':
      return <LayoutDashboard size={18} aria-hidden="true" />;
    case 'classes':
      return <BookOpen size={18} aria-hidden="true" />;
    case 'timetable':
      return <CalendarDays size={18} aria-hidden="true" />;
    case 'attendance':
      return <ClipboardList size={18} aria-hidden="true" />;
    case 'homework':
      return <NotebookPen size={18} aria-hidden="true" />;
    case 'exams':
      return <FileText size={18} aria-hidden="true" />;
    case 'announcements':
      return <Megaphone size={18} aria-hidden="true" />;
    case 'reports':
      return <BarChart3 size={18} aria-hidden="true" />;
  }
}

export function TeacherModuleSkeleton({ label }: { label?: string }) {
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

export function TeacherWorkspaceShell({
  schoolName,
  profileId,
  canOpenClasses,
  children,
}: {
  schoolName: string;
  profileId: string;
  canOpenClasses: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileDrawerRef = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();

  const urlWorkspace = resolveTeacherWorkspace(searchParams.get('workspace'));
  const [pendingTarget, setPendingTarget] = useState<TeacherWorkspaceKey | null>(null);

  const activeWorkspace = isPending && pendingTarget ? pendingTarget : urlWorkspace;

  // Backward-compatible hash link support (e.g. #my-classes -> ?workspace=classes)
  useEffect(() => {
    const syncHash = () => {
      if (searchParams.get('workspace')) return;
      const mapped = HASH_TO_WORKSPACE[window.location.hash];
      if (mapped && mapped !== 'overview') {
        router.replace(`/staff/teacher?workspace=${mapped}${window.location.hash}`);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [router, searchParams]);

  const visibleItems = TEACHER_NAV_ITEMS.filter(item => !item.requiresClasses || canOpenClasses);

  function handleNavigate(e: React.MouseEvent<HTMLAnchorElement>, item: typeof TEACHER_NAV_ITEMS[number]) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (mobileDrawerRef.current) mobileDrawerRef.current.open = false;
    setPendingTarget(item.key);
    startTransition(() => {
      router.push(item.href, { scroll: true });
    });
  }

  function renderNav(prefix: string) {
    return (
      <nav aria-label="Teacher workspace">
        {visibleItems.map(item => {
          const isCurrent = activeWorkspace === item.key;
          return (
            <Link
              key={`${prefix}-${item.key}`}
              href={item.href}
              prefetch={false}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={e => handleNavigate(e, item)}
            >
              <NavIcon workspace={item.key} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const activeLabel = visibleItems.find(item => item.key === activeWorkspace)?.label;

  return (
    <div className={styles.shell} data-role="teacher">
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.sidebarRoleBadge}>
          <span>Teacher workspace</span>
        </div>
        {renderNav('desktop')}
      </aside>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <Users aria-hidden="true" size={20} />
            <div>
              <strong>{schoolName}</strong>
              <span>Teacher · {profileId.slice(0, 8)}</span>
            </div>
          </div>
          <form action={logoutStaff}>
            <button className={styles.signOut} type="submit">
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </form>
        </header>
        <details ref={mobileDrawerRef} className={styles.mobile}>
          <summary>
            <Menu size={18} aria-hidden="true" /> Teacher navigation
          </summary>
          {renderNav('mobile')}
        </details>
        <main className={styles.main} id="teacher-main">
          {isPending && pendingTarget && pendingTarget !== urlWorkspace ? (
            <TeacherModuleSkeleton label={activeLabel} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
