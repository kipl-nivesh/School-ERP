import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** No portal authority exists until the genuine provider PIN integration is verified. */
export default async function PortalWorkspace({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (role !== 'student' && role !== 'parent') notFound();
  redirect(role === 'student' ? '/login/student' : '/login/parent');
}
