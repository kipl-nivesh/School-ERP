import { ArrowUpRight,ShieldCheck,Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportingPeriod } from '../types';
import { accountantProfile } from '../data/mock-dashboard';
import { FinanceIllustration } from './finance-illustration';
import { FinanceReveal } from './motion';
export function AccountantWelcomeBanner({period}:{period:ReportingPeriod}) {
  return <><div className="ac-page-heading"><div><span className="ac-eyebrow">FINANCE, WITH CLARITY</span><h1>Finance overview</h1><p>A clear picture. A considered next step.</p></div><span className="ac-demo"><Sparkles size={14}/>Demo Data · {accountantProfile.academicYear}</span></div><FinanceReveal className="ac-welcome"><div className="ac-welcome-copy"><span className="ac-kicker"><ShieldCheck size={15}/>Thoughtfully balanced</span><h2>Hello, Neha.<br/>Every number, connected.</h2><p>Here’s your school’s financial overview. Explore a fictional ledger with clear balances and a shared view of the details.</p><div className="ac-hero-actions"><Button asChild><a href="#accountant-collections">View collections<ArrowUpRight size={15}/></a></Button><a className="ac-secondary-link" href="#accountant-reports">View reports<ArrowUpRight size={15}/></a></div><small>{accountantProfile.name} · Reporting period: <strong>{period.caption}</strong></small></div><FinanceIllustration/></FinanceReveal></>;
}
