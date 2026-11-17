import type { ReactNode } from 'react';
import { Reveal } from './motion';
export function DashboardSection({ id, title, subtitle, badge, children, className = '' }: { id?: string; title: string; subtitle: string; badge?: string; children: ReactNode; className?: string }) {
  return <Reveal className={'ad-panel ' + className}><section id={id}><header className="ad-section-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{badge && <span className="ad-label">{badge}</span>}</header>{children}</section></Reveal>;
}
