import { Bell, Search, ChevronDown } from 'lucide-react';
import { MobileNavigation } from './mobile-navigation';
import { roleDetails, type Role } from '@/config/roles';
export function AppHeader({ role }: {
    role: Role;
}) { const info = roleDetails[role]; return <header className="app-header"><div className="header-left"><MobileNavigation role={role}/><span className="header-title">Workspace <span>/</span> <strong>Overview</strong></span></div><div className="header-actions"><button className="search-placeholder" disabled><Search size={16}/><span>Search · coming soon</span></button><button className="notification" disabled aria-label="Notifications coming soon"><Bell size={19}/></button><div className="profile"><span className="avatar">{info.initials}</span><span className="profile-copy"><strong>{info.title} preview</strong><small>No account connected</small></span><ChevronDown size={14} aria-hidden="true"/></div></div></header>; }
