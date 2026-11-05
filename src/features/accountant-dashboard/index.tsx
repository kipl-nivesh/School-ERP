import { FinancialWorkspace } from './components/financial-workspace';
import { FinancialReports } from './components/financial-reports';
import { AccountantQuickAccess } from './components/accountant-quick-access';
import './accountant-dashboard.css';
export function AccountantDashboard() {
  return <div className="accountant-demo"><FinancialWorkspace/><FinancialReports/><AccountantQuickAccess/><p className="ac-endnote">Clarity in every detail.<span>All financial records, identifiers, and reminders are fictional. No live financial workflows.</span></p></div>;
}
