'use client';

import { FinancialWorkspace } from './components/financial-workspace';
import { roleModuleIds } from '@/config/navigation';
import { useActiveModule } from '@/lib/navigation/use-active-module';
import './accountant-dashboard.css';

export function AccountantDashboard() {
  const [activeModule] = useActiveModule(roleModuleIds.accountant, 'overview');

  return (
    <div className="accountant-demo">
      <FinancialWorkspace activeModule={activeModule} />
      <p className="ac-endnote">
        Clarity in every detail. <span>All financial records, identifiers, and reminders are fictional. No live financial workflows.</span>
      </p>
    </div>
  );
}
