'use client';
import { useState } from 'react';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { RolePreviewSwitcher } from '@/components/shared/role-preview-switcher';
import type { Role } from '@/config/roles';
export function DashboardShell({ role, children }: {
    role: Role;
    children: React.ReactNode;
}) { const [collapsed, setCollapsed] = useState(false); return <div className={'dashboard-shell ' + (collapsed ? 'is-collapsed' : '')} data-role={role}><a className="skip-link" href="#main-content">Skip to content</a><aside className="desktop-sidebar"><AppSidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}/></aside><div className="workspace"><AppHeader role={role}/><main id="main-content" className="main-content" tabIndex={-1}>{children}</main><footer className="workspace-footer"><span>Made for brighter school days.</span><span>Step 01 · Public layout preview</span></footer><RolePreviewSwitcher role={role}/></div></div>; }
