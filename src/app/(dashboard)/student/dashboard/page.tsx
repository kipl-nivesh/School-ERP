import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { StudentModuleContent } from '@/components/workspaces/live-student-dashboard';
import {
  StudentModuleSkeleton,
  StudentWorkspaceShell,
} from '@/components/workspaces/student-workspace-shell';
import {
  getStudentPortalAccess,
  readLiveStudentModule,
} from '@/lib/student/live-dashboard';
import {
  resolveStudentWorkspace,
  type StudentWorkspaceKey,
} from '@/lib/student/student-workspace';

export const metadata = { title: 'Student overview' };

// Evaluate the feature gate and session for each request, including builds with the gate closed.
export const dynamic = 'force-dynamic';

async function StudentModulePanel({
  access,
  workspace,
}: {
  access: NonNullable<Awaited<ReturnType<typeof getStudentPortalAccess>>>;
  workspace: StudentWorkspaceKey;
}) {
  const result = await readLiveStudentModule(access, workspace);
  return <StudentModuleContent result={result} workspace={workspace} />;
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string | string[] }>;
}) {
  const access = await getStudentPortalAccess();
  if (!access) redirect('/login/student');

  const query = await searchParams;
  const workspace = resolveStudentWorkspace(query.workspace);
  const { identity } = access;

  return (
    <StudentWorkspaceShell
      schoolName={identity.school_name}
      studentName={identity.display_name}
      registration={identity.registration_number}
    >
      <Suspense fallback={<StudentModuleSkeleton />}>
        <StudentModulePanel access={access} workspace={workspace} />
      </Suspense>
    </StudentWorkspaceShell>
  );
}
