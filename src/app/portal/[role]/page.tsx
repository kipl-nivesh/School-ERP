import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LIVE_AUTHENTICATION_ENABLED } from '@/lib/auth';
import { StudentWorkspace } from '@/components/workspaces/student-workspace';
import { ParentWorkspace } from '@/components/workspaces/parent-workspace';

export const dynamic = 'force-dynamic';

export default async function PortalWorkspace({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (role !== 'student' && role !== 'parent') notFound();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              ← School Home
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-900 capitalize">{role} Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Live PIN Login: {LIVE_AUTHENTICATION_ENABLED ? 'Enabled' : 'Disabled (Local Review)'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {role === 'student' && <StudentWorkspace />}
        {role === 'parent' && <ParentWorkspace />}
      </main>
    </div>
  );
}
