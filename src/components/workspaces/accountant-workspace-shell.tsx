'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  FolderOpen,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Wallet,
} from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { logoutStaff } from '@/app/login/staff/actions';
import {
  resolveAccountantWorkspace,
  type AccountantWorkspaceKey,
} from '@/lib/staff/accountant-workspace';
import styles from './live-admin-dashboard.module.css';
import teacherStyles from './live-teacher-dashboard.module.css';

export type { AccountantWorkspaceKey };

export const ACCOUNTANT_NAV_ITEMS: readonly {
  readonly key: AccountantWorkspaceKey;
  readonly label: string;
  readonly href: string;
}[] = [
  { key: 'overview', label: 'Overview', href: '/staff/accountant?workspace=overview' },
  { key: 'ledger', label: 'Balances & Ledger', href: '/staff/accountant?workspace=ledger' },
  { key: 'payments', label: 'Payments & Receipts', href: '/staff/accountant?workspace=payments' },
  { key: 'structures', label: 'Fee Structures', href: '/staff/accountant?workspace=structures' },
  { key: 'expenses', label: 'Expenses', href: '/staff/accountant?workspace=expenses' },
  { key: 'reports', label: 'Financial Reports', href: '/staff/accountant?workspace=reports' },
  { key: 'records', label: 'Announcements & Records', href: '/staff/accountant?workspace=records' },
];

const HASH_TO_WORKSPACE: Record<string, AccountantWorkspaceKey> = {
  '#overview': 'overview',
  '#totals': 'overview',
  '#recent': 'overview',
  '#filters': 'ledger',
  '#ledger': 'ledger',
  '#payments': 'payments',
  '#receipt': 'payments',
  '#structures': 'structures',
  '#expenses': 'expenses',
  '#financial-reports': 'reports',
  '#records-announcements': 'records',
};

function NavIcon({ workspace }: { workspace: AccountantWorkspaceKey }) {
  switch (workspace) {
    case 'overview':
      return <LayoutDashboard size={18} aria-hidden="true" />;
    case 'ledger':
      return <BookOpen size={18} aria-hidden="true" />;
    case 'payments':
      return <CreditCard size={18} aria-hidden="true" />;
    case 'structures':
      return <Layers size={18} aria-hidden="true" />;
    case 'expenses':
      return <Receipt size={18} aria-hidden="true" />;
    case 'reports':
      return <BarChart3 size={18} aria-hidden="true" />;
    case 'records':
      return <FolderOpen size={18} aria-hidden="true" />;
  }
}

export function AccountantModuleSkeleton({ label }: { label?: string }) {
  return (
    <div
      className={teacherStyles.skeletonWrap}
      role="status"
      aria-live="polite"
      aria-label={label ? `Loading ${label}` : 'Loading finance module'}
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

export function AccountantWorkspaceShell({
  schoolName,
  canShowLedger,
  canShowPayments,
  canShowStructures,
  canShowReports,
  children,
}: {
  schoolName: string;
  canShowLedger: boolean;
  canShowPayments: boolean;
  canShowStructures: boolean;
  canShowReports: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileDrawerRef = useRef<HTMLDetailsElement>(null);
  const [isPending, startTransition] = useTransition();

  const urlWorkspace = resolveAccountantWorkspace(searchParams.get('workspace'), {
    receiptId: searchParams.get('receiptId') ?? undefined,
    structurePage: searchParams.get('structurePage') ?? undefined,
    classId: searchParams.get('classId') ?? undefined,
    paymentPage: searchParams.get('paymentPage') ?? undefined,
    ledgerPage: searchParams.get('ledgerPage') ?? undefined,
  });
  const [pendingTarget, setPendingTarget] = useState<AccountantWorkspaceKey | null>(null);
  const activeWorkspace = isPending && pendingTarget ? pendingTarget : urlWorkspace;

  useEffect(() => {
    const syncHash = () => {
      if (searchParams.get('workspace')) return;
      const hash = window.location.hash;
      const mapped =
        HASH_TO_WORKSPACE[hash] ?? (hash.startsWith('#records-') ? 'records' : undefined);
      if (mapped && mapped !== 'overview') {
        router.replace(`/staff/accountant?workspace=${mapped}${hash}`);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [router, searchParams]);

  const visibleItems = ACCOUNTANT_NAV_ITEMS.filter((item) => {
    if (item.key === 'ledger') return canShowLedger;
    if (item.key === 'payments') return canShowPayments;
    if (item.key === 'structures') return canShowStructures;
    if (item.key === 'reports') return canShowReports;
    return true;
  });

  function handleNavigate(
    e: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof ACCOUNTANT_NAV_ITEMS)[number]
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
      <nav aria-label="Accountant workspace">
        {visibleItems.map((item) => {
          const active = activeWorkspace === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              data-accountant-module={item.key}
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
    visibleItems.find((item) => item.key === activeWorkspace)?.label ?? 'Overview';

  return (
    <div className={styles.shell} data-role="accountant">
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.sidebarRoleBadge}>
          <span>Accountant workspace</span>
        </div>
        {renderNavLinks()}
        <form action={logoutStaff} className={styles.sidebarSignout}>
          <button type="submit">
            <LogOut size={16} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <Wallet aria-hidden="true" />
            <div>
              <strong>{schoolName}</strong>
              <span>Accountant</span>
            </div>
          </div>
          <form action={logoutStaff}>
            <button className={styles.signOut} type="submit">
              Sign out
            </button>
          </form>
        </header>

        <details ref={mobileDrawerRef} className={styles.mobile}>
          <summary>
            <Menu aria-hidden="true" /> Finance navigation · {activeLabel}
          </summary>
          {renderNavLinks()}
        </details>

        <main className={styles.main} aria-busy={isPending}>
          {isPending ? <AccountantModuleSkeleton label={activeLabel} /> : children}
        </main>
      </div>
    </div>
  );
}
