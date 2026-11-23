'use client';

import { ParentWelcomeBanner } from './components/parent-welcome-banner';
import { ParentPortal } from './components/parent-portal';
import { roleModuleIds } from '@/config/navigation';
import { useActiveModule } from '@/lib/navigation/use-active-module';
import type { ParentSessionData } from './types';
import './parent-dashboard.css';

export function ParentDashboard({ sessionData }: { sessionData?: ParentSessionData | null }) {
  const [activeModule] = useActiveModule(roleModuleIds.parent, 'overview');
  const isLive = Boolean(sessionData);

  return (
    <div className="parent-demo">
      <ParentWelcomeBanner sessionData={sessionData} />
      <ParentPortal activeModule={activeModule} sessionData={sessionData} />
      <p className="pd-endnote">
        Growing minds. Connected families.{' '}
        <span>
          {isLive
            ? 'Authenticated Parent Portal · Verified cloud session under Row Level Security.'
            : 'All people, records, schedules, and payment history are fictional.'}
        </span>
      </p>
    </div>
  );
}
