import Link from 'next/link';
import { MobileNavigation } from './mobile-navigation';
import { roleDetails, type Role } from '@/config/roles';

export function AppHeader({ role }: { role: Role }) {
  const info = roleDetails[role];
  return <header className="app-header">
    <div className="header-left">
      <MobileNavigation role={role} />
      <span className="header-title">DEMO <span>/</span> <strong>{info.title}</strong></span>
    </div>
    <div className="header-actions">
      <Link className="demo-home-link" href="/">All demos</Link>
      <div className="profile">
        <span className="avatar" aria-hidden="true">{info.initials}</span>
        <span className="profile-copy"><strong>Fictional data</strong><small>No account connected</small></span>
      </div>
    </div>
  </header>;
}
