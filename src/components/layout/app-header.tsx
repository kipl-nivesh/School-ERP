import Link from 'next/link';
import { MobileNavigation } from './mobile-navigation';
import { roleDetails, type Role } from '@/config/roles';

export function AppHeader({
  role,
  sessionUser
}: {
  role: Role;
  sessionUser?: { email?: string; id?: string; displayName?: string } | null;
}) {
  const info = roleDetails[role];
  const isAuthenticated = Boolean(sessionUser);

  return <header className="app-header">
    <div className="header-left">
      <MobileNavigation role={role} />
      <span className="header-title">
        {isAuthenticated ? 'PORTAL' : 'DEMO'} <span>/</span> <strong>{info.title}</strong>
      </span>
    </div>
    <div className="header-actions">
      <Link className="demo-home-link" href="/">All demos</Link>
      <div className="profile">
        <span className="avatar" aria-hidden="true">
          {isAuthenticated ? (sessionUser?.displayName ? sessionUser.displayName.slice(0, 2).toUpperCase() : 'SG') : info.initials}
        </span>
        <span className="profile-copy">
          <strong>{isAuthenticated ? (sessionUser?.displayName || 'Siraju Guardian') : 'Fictional data'}</strong>
          <small>{isAuthenticated ? `${sessionUser?.email || ''} · Connected` : 'No account connected'}</small>
        </span>
      </div>
    </div>
  </header>;
}
