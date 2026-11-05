import type { ReactNode } from 'react';
import { FinanceReveal } from './motion';
export function FinanceSection({id,title,description,badge,children}:{id:string;title:string;description:string;badge?:string;children:ReactNode}) {
  return <FinanceReveal className="ac-panel"><section id={id} tabIndex={-1} aria-labelledby={id+'-title'}><header className="ac-section-header"><div><h2 id={id+'-title'}>{title}</h2><p>{description}</p></div>{badge&&<span className="ac-label">{badge}</span>}</header>{children}</section></FinanceReveal>;
}
