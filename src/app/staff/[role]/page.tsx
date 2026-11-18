import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getStaffAccess } from '@/lib/staff/server';
import { isStaffRole } from '@/lib/staff/contracts';
import { LiveAdminDashboard, AdminDashboardLoading } from '@/components/workspaces/live-admin-dashboard';
import { LiveTeacherDashboard, TeacherDashboardLoading } from '@/components/workspaces/live-teacher-dashboard';
import { LiveAccountantDashboard } from '@/components/workspaces/live-accountant-dashboard';
import type { TeacherQuery } from '@/lib/services/teacher-dashboard';

export const dynamic = 'force-dynamic';

export default async function StaffRoleWorkspace({ params, searchParams }: {
  params: Promise<{ role: string }>;
  searchParams: Promise<TeacherQuery>;
}) {
  const { role } = await params;
  if (!isStaffRole(role)) notFound();
  const access = await getStaffAccess(role);
  if (!access || access.role !== role || !access.context.schoolId) redirect('/login/staff');
  if (role === 'admin') return <Suspense fallback={<AdminDashboardLoading />}>
    <LiveAdminDashboard />
  </Suspense>;
  if (role === 'teacher') return <Suspense fallback={<TeacherDashboardLoading />}>
    <LiveTeacherDashboard access={access} query={await searchParams} />
  </Suspense>;

  return <Suspense fallback={<p role="status">Loading school finance...</p>}>
    <LiveAccountantDashboard query={await searchParams} />
  </Suspense>;
}
