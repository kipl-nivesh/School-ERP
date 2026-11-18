'use client';

import { useEffect, useRef, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import styles from './live-admin-dashboard.module.css';

const moduleChange = 'brightcamp-admin-module-change';

function subscribe(onChange: () => void) {
  const events = ['popstate', 'hashchange', moduleChange];
  events.forEach(event => window.addEventListener(event, onChange));
  return () => events.forEach(event => window.removeEventListener(event, onChange));
}

function readModule() {
  return window.location.hash.slice(1);
}

export function AdminModuleNavigation({ sidebar, mobile, header, panels }: {
  sidebar: ReactNode;
  mobile: ReactNode;
  header: ReactNode;
  panels: { id: string; content: ReactNode }[];
}) {
  const requested = useSyncExternalStore(subscribe, readModule, () => 'overview');
  const active = panels.some(panel => panel.id === requested) ? requested : 'overview';
  const workspace = useRef<HTMLDivElement>(null);

  useEffect(() => {
    workspace.current?.querySelectorAll('nav a[data-admin-module]').forEach(link => {
      if (link.getAttribute('data-admin-module') === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, [active, sidebar, mobile]);

  function navigate(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element) || event.defaultPrevented ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest<HTMLAnchorElement>('a[data-admin-module]');
    const id = link?.dataset.adminModule;
    if (!id || !panels.some(panel => panel.id === id)) return;
    event.preventDefault();
    link?.closest('details')?.removeAttribute('open');
    if (window.location.hash !== '#' + id) {
      window.history.pushState(null, '', '#' + id);
      window.dispatchEvent(new Event(moduleChange));
    }
    window.requestAnimationFrame(() => {
      const heading = document.getElementById(id === 'overview' ? 'admin-welcome' : id + '-heading');
      heading?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    });
  }

  return <div ref={workspace} data-active-admin-module={active} onClick={navigate}
    onKeyDown={event => {
      if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
      const drawer = event.target.closest<HTMLDetailsElement>('details[data-admin-drawer][open]');
      if (!drawer) return;
      drawer.open = false;
      drawer.querySelector('summary')?.focus();
      event.preventDefault();
    }}>
    <a className="skip-link" href="#admin-content" onClick={event => {
      event.preventDefault();
      document.getElementById('admin-content')?.focus();
    }}>Skip to workspace</a>
    <div className={styles.shell}>
      {sidebar}
      <div className={styles.workspace}>
        {header}
        {mobile}
        <main id="admin-content" tabIndex={-1} className={styles.main}>
          {panels.map(({ id, content }) => <div key={id} hidden={id !== active}>{content}</div>)}
        </main>
      </div>
    </div>
  </div>;
}
