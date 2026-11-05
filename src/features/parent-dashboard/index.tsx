import { ParentWelcomeBanner } from './components/parent-welcome-banner';
import { ParentPortal } from './components/parent-portal';
import { ParentQuickAccess } from './components/parent-quick-access';
import './parent-dashboard.css';
export function ParentDashboard() {
  return <div className="parent-demo"><ParentWelcomeBanner/><ParentPortal/><ParentQuickAccess/><p className="pd-endnote">Growing minds. Connected families.<span>All people, records, schedules, and payment history are fictional.</span></p></div>;
}
