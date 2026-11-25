import { redirect } from 'next/navigation';
import { LiveStudentDashboard } from '@/components/workspaces/live-student-dashboard';
import { getStudentPortalAccess, readLiveStudentDashboard } from '@/lib/student/live-dashboard';

export const metadata = { title: 'Student overview' };

// Evaluate the feature gate and session for each request, including builds with the gate closed.
export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const access = await getStudentPortalAccess();
  if (!access) redirect('/login/student');
  return <LiveStudentDashboard result={await readLiveStudentDashboard(access)} />;
}
