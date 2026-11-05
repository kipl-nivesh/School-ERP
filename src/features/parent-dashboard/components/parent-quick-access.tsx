import { Users, CalendarCheck, ClipboardList, GraduationCap, Wallet, Megaphone, ArrowUpRight } from 'lucide-react';
import { ParentSection } from './section';
import { ParentReveal } from './motion';
export function ParentQuickAccess() {
  const links=[{title:'My children',target:'children',icon:Users,tone:'indigo'},{title:'Attendance',target:'attendance',icon:CalendarCheck,tone:'emerald'},{title:'Homework',target:'homework',icon:ClipboardList,tone:'amber'},{title:'Exam results',target:'results',icon:GraduationCap,tone:'violet'},{title:'Fee details',target:'fees',icon:Wallet,tone:'rose'},{title:'School notices',target:'notices',icon:Megaphone,tone:'sky'}];
  return <ParentSection id="parent-quick-access" title="A familiar place for everything" description="Jump to what matters to your family."><div className="pd-quick-links">{links.map(({title,target,icon:Icon,tone})=><ParentReveal key={target} hover><a className={'pd-tone-'+tone} href={'#parent-'+target}><Icon size={21}/><span>{title}</span><ArrowUpRight size={15}/></a></ParentReveal>)}</div></ParentSection>;
}
