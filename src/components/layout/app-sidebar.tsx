'use client';
import Link from 'next/link';
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Sprout } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { navigation } from '@/config/navigation';
import { roleDetails, type Role } from '@/config/roles';
const demoSections = {
  admin: ['admin-community', 'admin-academics', 'admin-attendance', 'admin-finance'],
  teacher: ['teacher-classes', 'teacher-attendance', 'teacher-homework', 'teacher-notices'],
  student: ['student-learning-progress', 'student-homework', 'student-timetable', 'student-performance'],
  parent: ['parent-children', 'parent-progress', 'parent-notices', 'parent-fees'],
  accountant: ['accountant-collections', 'accountant-payments', 'accountant-reports', 'accountant-expenses'],
} satisfies Record<Role, readonly string[]>;
export function AppSidebar({ role, collapsed = false, onToggle, onNavigate }: {
    role: Role;
    collapsed?: boolean;
    onToggle?: () => void;
    onNavigate?: () => void;
}) { return <div className="sidebar-inner"><Link href="/" aria-label="Brightcamp demo home"><Brand compact={collapsed}/></Link><div className="sidebar-label">{collapsed ? '•••' : roleDetails[role].title + ' workspace'}</div><nav aria-label={roleDetails[role].title + ' navigation'}><Link aria-label="Overview" className="nav-item active" href={'/' + role + '/dashboard'} aria-current="page" onClick={onNavigate}><LayoutDashboard size={19}/>{!collapsed && <><span>Overview</span><span className="active-dot"/></>}</Link>{navigation[role].map(({ label, icon: Icon }, index) => <Link key={label} className="nav-item" href={'#' + demoSections[role][index]} aria-label={label} onClick={onNavigate}><Icon size={19} aria-hidden="true"/>{!collapsed && <span>{label}</span>}</Link>)}</nav><div className="sidebar-bottom">{!collapsed && <div className="sidebar-note"><Sprout size={23}/><strong>Room to grow.</strong><p>One school. A world of possibilities.</p><span>DEMO · Fictional data</span></div>}{onToggle && <Button variant="ghost" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen size={18}/> : <><PanelLeftClose size={18}/>Collapse sidebar</>}</Button>}</div></div>; }

