import type { ReactNode } from 'react';
import { ParentReveal } from './motion';
export function ParentSection({id,title,description,badge,children}:{id:string;title:string;description:string;badge?:string;children:ReactNode}) {
  return <ParentReveal className="pd-panel"><section id={id} tabIndex={-1} aria-labelledby={id+'-title'}><header className="pd-section-header"><div><h2 id={id+'-title'}>{title}</h2><p>{description}</p></div>{badge&&<span className="pd-label">{badge}</span>}</header>{children}</section></ParentReveal>;
}
