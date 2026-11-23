'use client';
import { useState } from 'react';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import type { Role } from '@/config/roles';

export function DashboardShell({
  role,
  sessionUser,
  children
}: {
  role: Role;
  sessionUser?: { email?: string; id?: string; displayName?: string } | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isAuthenticated = Boolean(sessionUser);

  return (
    <div className={'dashboard-shell ' + (collapsed ? 'is-collapsed' : '')} data-role={role}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="desktop-sidebar">
        <AppSidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </aside>
      <div className="workspace">
        <AppHeader role={role} sessionUser={sessionUser} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Made for brighter school days.</span>
          <span>{isAuthenticated ? 'PORTAL · Authenticated Cloud Session' : 'DEMO · Fictional records'}</span>
        </footer>
      </div>
    </div>
  );
}
