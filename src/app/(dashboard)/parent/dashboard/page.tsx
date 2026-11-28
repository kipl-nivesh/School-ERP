import { redirect } from 'next/navigation';
import { ParentWorkspaceShell } from '@/components/workspaces/parent-workspace-shell';
import { LiveParentWorkspace } from '@/components/workspaces/live-parent-workspace';
import { resolveParentWorkspace } from '@/lib/parent/parent-workspace';
import { getParentPortalAccess, readParentModuleData } from '@/lib/parent/server';

export const metadata = { title: 'Parent Portal | Brightcamp School ERP' };
export const dynamic = 'force-dynamic';

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string | string[]; child?: string | string[] }>;
}) {
  const access = await getParentPortalAccess();
  if (!access) {
    redirect('/login/parent');
  }

  const query = await searchParams;
  const workspace = resolveParentWorkspace(query.workspace);
  const data = await readParentModuleData(access, workspace, query.child);

  return (
    <ParentWorkspaceShell
      schoolName={access.identity.school_name}
      guardianName={access.identity.display_name}
      childrenList={access.identity.children}
      selectedChildId={data.selectedChild?.student_id ?? access.identity.children[0]?.student_id ?? null}
    >
      <LiveParentWorkspace identity={access.identity} data={data} />
    </ParentWorkspaceShell>
  );
}
