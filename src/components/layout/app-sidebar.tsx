'use client';
import Link from 'next/link';
import { LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Sprout } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { navigation } from '@/config/navigation';
import { roleDetails, type Role } from '@/config/roles';
export function AppSidebar({ role, collapsed = false, onToggle, onNavigate }: {
    role: Role;
    collapsed?: boolean;
    onToggle?: () => void;
    onNavigate?: () => void;
}) { return <div className="sidebar-inner"><Link href="/" aria-label="Brightcamp preview home"><Brand compact={collapsed}/></Link><div className="sidebar-label">{collapsed ? '•••' : roleDetails[role].title + ' workspace'}</div><nav aria-label={roleDetails[role].title + ' navigation'}><Link aria-label="Overview" className="nav-item active" href={'/' + role + '/dashboard'} aria-current="page" onClick={onNavigate}><LayoutDashboard size={19}/>{!collapsed && <><span>Overview</span><span className="active-dot"/></>}</Link>{navigation[role].map(({ label, icon: Icon }) => <button key={label} className="nav-item" disabled title={label + ' — coming soon'}><Icon size={19}/>{!collapsed && <><span>{label}</span><span className="soon-dot" aria-label="Coming soon"/></>}</button>)}</nav><div className="sidebar-bottom">{!collapsed && <div className="sidebar-note"><Sprout size={23}/><strong>Room to grow.</strong><p>One school. A world of possibilities.</p><span>Foundation preview · Step 01</span></div>}<button className="nav-item" disabled title="Logout unavailable until authentication is implemented"><LogOut size={19}/>{!collapsed && <span>Logout · unavailable</span>}</button>{onToggle && <Button variant="ghost" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen size={18}/> : <><PanelLeftClose size={18}/>Collapse sidebar</>}</Button>}</div></div>; }

