'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { logoutStudent } from '@/app/login/student/actions';
import { resolveStudentWorkspace, type StudentWorkspaceKey } from '@/lib/student/student-workspace';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

export type { StudentWorkspaceKey };

export const STUDENT_NAV_ITEMS: readonly {
  readonly key: StudentWorkspaceKey;
  readonly label: string;
  readonly href: string;
}[] = [
  { key: 'overview', label: 'Overview', href: '/student/dashboard?workspace=overview' },
  { key: 'profile', label: 'My Profile', href: '/student/dashboard?workspace=profile' },
  { key: 'timetable', label: 'Timetable & Subjects', href: '/student/dashboard?workspace=timetable' },
  { key: 'attendance', label: 'Attendance', href: '/student/dashboard?workspace=attendance' },
  { key: 'homework', label: 'Homework', href: '/student/dashboard?workspace=homework' },
  { key: 'exams', label: 'Exams & Results', href: '/student/dashboard?workspace=exams' },
  { key: 'fees', label: 'Fees & Receipts', href: '/student/dashboard?workspace=fees' },
  { key: 'materials', label: 'Study Materials', href: '/student/dashboard?workspace=materials' },
  { key: 'announcements', label: 'Announcements', href: '/student/dashboard?workspace=announcements' },
];

const HASH_TO_WORKSPACE: Record<string, StudentWorkspaceKey> = {
  '#overview': 'overview',
  '#profile': 'profile',
  '#timetable': 'timetable',
  '#attendance': 'attendance',
  '#homework': 'homework',
  '#exams': 'exams',
  '#results': 'exams',
  '#fees': 'fees',
  '#materials': 'materials',
  '#announcements': 'announcements',
};

function NavIcon({ workspace }: { workspace: StudentWorkspaceKey }) {
  switch (workspace) {
    case 'overview':
      return <LayoutDashboard size={18} aria-hidden="true" />;
    case 'profile':
      return <UserRound size={18} aria-hidden="true" />;
    case 'timetable':
      return <CalendarDays size={18} aria-hidden="true" />;
    case 'attendance':
      return <ClipboardList size={18} aria-hidden="true" />;
    case 'homework':
      return <BookOpen size={18} aria-hidden="true" />;
    case 'exams':
      return <Award size={18} aria-hidden="true" />;
    case 'fees':
      return <Wallet size={18} aria-hidden="true" />;
    case 'materials':
      return <FolderOpen size={18} aria-hidden="true" />;
    case 'announcements':
      return <Bell size={18} aria-hidden="true" />;
  }
}

export function StudentModuleSkeleton({ label }: { label?: string }) {
  return (
    <div
      className={teacherStyles.skeletonWrap}
      role="status"
      aria-live="polite"
      aria-label={label ? `Loading ${label}` : 'Loading student module'}
    >
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

export function StudentWorkspaceShell({
  schoolName,
  studentName,
  registration,
  children,
}: {
  schoolName: string;
  studentName: string;
  registration: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileDrawerRef = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();

  const urlWorkspace = resolveStudentWorkspace(searchParams.get('workspace'));
  const [pendingTarget, setPendingTarget] = useState<StudentWorkspaceKey | null>(null);
  const activeWorkspace = isPending && pendingTarget ? pendingTarget : urlWorkspace;

  useEffect(() => {
    const syncHash = () => {
      if (searchParams.get('workspace')) return;
      const mapped = HASH_TO_WORKSPACE[window.location.hash];
      if (mapped && mapped !== 'overview') {
        router.replace(`/student/dashboard?workspace=${mapped}${window.location.hash}`);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [router, searchParams]);

  function handleNavigate(
    e: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof STUDENT_NAV_ITEMS)[number]
  ) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (mobileDrawerRef.current) mobileDrawerRef.current.open = false;
    setPendingTarget(item.key);
    startTransition(() => {
      router.push(item.href, { scroll: true });
    });
  }

  function renderNavLinks() {
    return (
      <nav aria-label="Student dashboard">
        {STUDENT_NAV_ITEMS.map((item) => {
          const active = activeWorkspace === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              data-student-module={item.key}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => handleNavigate(e, item)}
            >
              <NavIcon workspace={item.key} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const activeLabel =
    STUDENT_NAV_ITEMS.find((item) => item.key === activeWorkspace)?.label ?? 'Overview';

  return (
    <div className={styles.shell} data-role="student">
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.sidebarRoleBadge}>
          <span>Student workspace</span>
        </div>
        {renderNavLinks()}
        <form action={logoutStudent} className={styles.sidebarSignout}>
          <button type="submit">
            <LogOut size={16} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <GraduationCap aria-hidden="true" />
            <div>
              <strong>{studentName}</strong>
              <span>
                {schoolName} · {registration}
              </span>
            </div>
          </div>
          <form action={logoutStudent}>
            <button className={styles.signOut} type="submit">
              Sign out
            </button>
          </form>
        </header>

        <details ref={mobileDrawerRef} className={styles.mobile}>
          <summary>
            <Menu aria-hidden="true" /> Student navigation · {activeLabel}
          </summary>
          {renderNavLinks()}
        </details>

        <main className={styles.main} aria-busy={isPending}>
          {isPending ? <StudentModuleSkeleton label={activeLabel} /> : children}
        </main>
      </div>
    </div>
  );
}
