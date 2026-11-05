import type { ReactNode } from 'react';
import { StudentReveal } from './motion';
export function StudentSection({id,title,description,badge,children}:{id:string;title:string;description:string;badge?:string;children:ReactNode}) {
  return <StudentReveal className="sd-panel"><section id={id} tabIndex={-1} aria-labelledby={id+'-title'}><header className="sd-section-header"><div><h2 id={id+'-title'}>{title}</h2><p>{description}</p></div>{badge&&<span className="sd-label">{badge}</span>}</header>{children}</section></StudentReveal>;
}
