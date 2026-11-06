import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getStaffAccess } from '@/lib/staff/server';
import { isStaffRole } from '@/lib/staff/contracts';
import { SchoolAdminWorkspace } from '@/components/workspaces/admin-workspace';
import { TeacherWorkspace } from '@/components/workspaces/teacher-workspace';
import { AccountantWorkspace } from '@/components/workspaces/accountant-workspace';
import { logoutStaff } from '@/app/login/staff/actions';

export const dynamic = 'force-dynamic';

export default async function StaffRoleWorkspace({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isStaffRole(role)) notFound();
  const access = await getStaffAccess(role);
  if (!access) redirect('/login/staff');

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/staff" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              ← Staff Workspace
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-900 capitalize">{role} Console</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">
              Authorized Session: <strong className="text-slate-900 font-mono text-[11px]">{access.context.profileId.slice(0, 8)}</strong>
            </span>
            <form action={logoutStaff}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {role === 'admin' && <SchoolAdminWorkspace context={access.context} />}
        {role === 'teacher' && <TeacherWorkspace context={access.context} />}
        {role === 'accountant' && <AccountantWorkspace context={access.context} />}
      </main>
    </div>
  );
}
