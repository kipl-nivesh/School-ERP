'use client';

import { useSyncExternalStore } from 'react';

const MODULE_CHANGE_EVENT = 'brightcamp-module-change';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const events = ['popstate', 'hashchange', MODULE_CHANGE_EVENT];
  events.forEach(e => window.addEventListener(e, onChange));
  return () => events.forEach(e => window.removeEventListener(e, onChange));
}

export function readModuleFromUrl(validModules: readonly string[], defaultModule = 'overview'): string {
  if (typeof window === 'undefined') return defaultModule;
  const hash = window.location.hash.replace(/^#/, '');
  if (hash && validModules.includes(hash)) {
    return hash;
  }
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('module') || params.get('tab') || params.get('workspace');
  if (fromQuery && validModules.includes(fromQuery)) {
    return fromQuery;
  }
  return defaultModule;
}

export function navigateToModule(id: string) {
  if (typeof window === 'undefined') return;
  const currentHash = window.location.hash.replace(/^#/, '');
  if (currentHash !== id) {
    window.history.pushState(null, '', '#' + id);
    window.dispatchEvent(new Event(MODULE_CHANGE_EVENT));
  }
  window.requestAnimationFrame(() => {
    const target = document.getElementById(id + '-heading') ||
      document.getElementById(id) ||
      document.getElementById('main-content');
    target?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * React hook to synchronize active ERP module state with URL hash and search params.
 * Fully supports browser back/forward buttons, deep linking, and responsive drawer close.
 */
export function useActiveModule(validModules: readonly string[], defaultModule = 'overview'): [string, (id: string) => void] {
  const active = useSyncExternalStore(
    subscribe,
    () => readModuleFromUrl(validModules, defaultModule),
    () => defaultModule
  );

  return [active, navigateToModule];
}
