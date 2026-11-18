'use client';

import { ParentWelcomeBanner } from './components/parent-welcome-banner';
import { ParentPortal } from './components/parent-portal';
import { roleModuleIds } from '@/config/navigation';
import { useActiveModule } from '@/lib/navigation/use-active-module';
import './parent-dashboard.css';

export function ParentDashboard() {
  const [activeModule] = useActiveModule(roleModuleIds.parent, 'overview');

  return (
    <div className="parent-demo">
      <ParentWelcomeBanner />
      <ParentPortal activeModule={activeModule} />
      <p className="pd-endnote">
        Growing minds. Connected families. <span>All people, records, schedules, and payment history are fictional.</span>
      </p>
    </div>
  );
}
