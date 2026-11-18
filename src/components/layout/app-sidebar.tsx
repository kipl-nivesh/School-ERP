'use client';

import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen, Sprout } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { navigation, roleModuleIds, type NavigationItem } from '@/config/navigation';
import { roleDetails, type Role } from '@/config/roles';
import { useActiveModule } from '@/lib/navigation/use-active-module';

export interface AppSidebarProps {
  role: Role;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export function AppSidebar({
  role,
  collapsed = false,
  onToggle,
  onNavigate,
}: AppSidebarProps) {
  const [activeModule, setActiveModule] = useActiveModule(roleModuleIds[role], 'overview');
  const items = navigation[role];

  // Group items if categories exist (e.g. for admin)
  const hasCategories = items.some(item => Boolean(item.category));

  return (
    <div className="sidebar-inner">
      <Link href="/" aria-label="Brightcamp demo home">
        <Brand compact={collapsed} />
      </Link>
      <div className="sidebar-label">
        {collapsed ? '•••' : `${roleDetails[role].title} workspace`}
      </div>
      <nav aria-label={`${roleDetails[role].title} navigation`}>
        {hasCategories ? (
          (() => {
            const overview = items.find(i => i.id === 'overview');
            const categories = Array.from(
              new Set(items.map(i => i.category).filter((c): c is string => typeof c === 'string' && c.length > 0))
            );

            return (
              <>
                {overview && renderNavItem(overview, activeModule, collapsed, setActiveModule, onNavigate)}
                {categories.map(cat => {
                  const catItems = items.filter(i => i.category === cat);
                  return (
                    <div key={cat} className="nav-group">
                      {!collapsed && <div className="nav-group-title">{cat}</div>}
                      {catItems.map(item => renderNavItem(item, activeModule, collapsed, setActiveModule, onNavigate))}
                    </div>
                  );
                })}
              </>
            );
          })()
        ) : (
          items.map(item => renderNavItem(item, activeModule, collapsed, setActiveModule, onNavigate))
        )}
      </nav>
      <div className="sidebar-bottom">
        {!collapsed && (
          <div className="sidebar-note">
            <Sprout size={23} />
            <strong>Room to grow.</strong>
            <p>One school. A world of possibilities.</p>
            <span>DEMO · Fictional data</span>
          </div>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} />Collapse sidebar</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function renderNavItem(
  item: NavigationItem,
  activeModule: string,
  collapsed: boolean,
  setActiveModule: (id: string) => void,
  onNavigate?: () => void
) {
  const Icon = item.icon;
  const isActive = activeModule === item.id;

  return (
    <a
      key={item.id}
      id={`nav-link-${item.id}`}
      data-module-id={item.id}
      className={`nav-item ${isActive ? 'active' : ''}`}
      href={`#${item.id}`}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        setActiveModule(item.id);
        onNavigate?.();
      }}
    >
      <Icon size={19} aria-hidden="true" />
      {!collapsed && (
        <>
          <span>{item.label}</span>
          {isActive && <span className="active-dot" />}
        </>
      )}
    </a>
  );
}
