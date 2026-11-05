import { FileBarChart,LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportPreviews } from '../data/mock-dashboard';
import { FinanceSection } from './section';
export function FinancialReports() {
  return <FinanceSection id="accountant-reports" title="A place for every financial perspective" description="Financial reports preview · generation and exports are unavailable" badge="Coming soon"><div className="ac-reports">{reportPreviews.map(r=><article className={'ac-tone-'+r.tone} key={r.title}><span className="ac-icon"><FileBarChart size={21}/></span><h3>{r.title}</h3><p>{r.description}</p><Button variant="outline" disabled><LockKeyhole size={13}/>Coming soon</Button></article>)}</div></FinanceSection>;
}
