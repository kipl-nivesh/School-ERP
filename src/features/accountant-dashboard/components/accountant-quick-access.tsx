import { Wallet,Receipt,Clock3,BriefcaseBusiness,FileBarChart,Bell,ArrowUpRight } from 'lucide-react';
import { FinanceSection } from './section';
import { FinanceReveal } from './motion';
export function AccountantQuickAccess() {
  const links=[{title:'Fee collections',target:'collections',icon:Wallet,tone:'emerald'},{title:'Payment history',target:'payments',icon:Receipt,tone:'indigo'},{title:'Outstanding fees',target:'outstanding',icon:Clock3,tone:'amber'},{title:'Expenses',target:'expenses',icon:BriefcaseBusiness,tone:'violet'},{title:'Financial reports',target:'reports',icon:FileBarChart,tone:'sky'},{title:'Alerts',target:'alerts',icon:Bell,tone:'rose'}];
  return <FinanceSection id="accountant-quick-access" title="Find the detail you need" description="Quick access to this dashboard’s financial sections."><div className="ac-quick-links">{links.map(({title,target,icon:Icon,tone})=><FinanceReveal key={target} hover><a className={'ac-tone-'+tone} href={'#accountant-'+target}><Icon size={21}/><span>{title}</span><ArrowUpRight size={15}/></a></FinanceReveal>)}</div></FinanceSection>;
}
