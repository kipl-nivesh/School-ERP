import type { ReactNode } from 'react';
import { TeacherReveal } from './motion';
export function TeacherSection({ id, title, description, badge, children }: { id?: string; title: string; description: string; badge?: string; children: ReactNode }) {
  return <TeacherReveal className="td-panel"><section id={id}><header className="td-section-header"><div><h2>{title}</h2><p>{description}</p></div>{badge && <span className="td-label">{badge}</span>}</header>{children}</section></TeacherReveal>;
}
