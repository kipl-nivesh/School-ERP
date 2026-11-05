import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getStaffAccess } from '@/lib/staff/server';
import { isStaffRole } from '@/lib/staff/contracts';
export const dynamic = 'force-dynamic';
export default async function StaffRoleWorkspace({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isStaffRole(role)) notFound();
  const access = await getStaffAccess(role);
  if (!access) redirect('/login/staff');
  return <main style={{ maxWidth: 800, margin: '60px auto', padding: 24 }}><h1>{role} workspace</h1><p>Access checked against your verified session and current school authorization.</p><p>Domain records remain disconnected pending reviewed RLS integration.</p><Link href="/staff">Back to staff workspace</Link></main>;
}
