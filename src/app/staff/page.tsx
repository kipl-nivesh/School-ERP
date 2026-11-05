import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffAccess } from '@/lib/staff/server';
import { evaluateDashboardAccess } from '@/lib/auth/authorization';
import { STAFF_ROLES } from '@/lib/staff/contracts';
import { logoutStaff } from '../login/staff/actions';
export const dynamic = 'force-dynamic';
export default async function StaffWorkspace() {
  const access = await getStaffAccess();
  if (!access) redirect('/login/staff');
  return <main style={{ maxWidth: 800, margin: '60px auto', padding: 24 }}><h1>Staff workspace</h1><p>Your current authorized role: {access.role}.</p><p>No school records are connected to this initial workspace.</p><nav aria-label="Authorized staff workspaces"><ul>{STAFF_ROLES.filter(role => evaluateDashboardAccess(access.context, role, access.context.session.verifiedAt).allowed).map(role => <li key={role}><Link href={`/staff/${role}`}>{role} workspace</Link></li>)}</ul></nav><form action={logoutStaff}><button type="submit">Sign out</button></form></main>;
}
