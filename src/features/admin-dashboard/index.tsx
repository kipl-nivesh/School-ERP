import { AdminWelcomeBanner } from './components/admin-welcome-banner';
import { AdminStatsGrid } from './components/admin-stats-grid';
import { AttendanceAnalytics } from './components/attendance-analytics';
import { FeeCollectionOverview } from './components/fee-collection-overview';
import { StudentDistributionChart } from './components/student-distribution-chart';
import { UpcomingEvents } from './components/upcoming-events';
import { RecentActivities } from './components/recent-activities';
import { QuickAccessGrid } from './components/quick-access-grid';
import './admin-dashboard.css';
export function AdminDashboard({currentDate}:{currentDate:string}) {return <div className="admin-demo"><AdminWelcomeBanner currentDate={currentDate}/><AdminStatsGrid/><div className="ad-analytics-grid"><AttendanceAnalytics/><FeeCollectionOverview/></div><StudentDistributionChart/><div className="ad-bottom-grid"><UpcomingEvents/><RecentActivities/></div><QuickAccessGrid/><p className="ad-endnote">Thoughtfully connected. Beautifully simple. <span>All figures, schedules, and activities are fictional.</span></p></div>;}
