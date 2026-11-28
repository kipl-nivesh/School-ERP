import { isStaffUuid } from '@/lib/staff/contracts';
import { getParentPortalAccess } from '@/lib/parent/server';

const headers = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getParentPortalAccess();
  const { id } = await params;
  const missing = () => new Response('Material unavailable', { status: 404, headers });
  if (!access || !isStaffUuid(id)) return missing();

  const { client, identity } = access;
  const academicChildren = identity.children.filter((c) => c.academic_access);
  if (!academicChildren.length) return missing();

  const result = await client
    .from('student_portal_materials')
    .select('school_id,student_id,audience,title,content')
    .eq('id', id)
    .eq('school_id', identity.school_id)
    .eq('status', 'published')
    .maybeSingle();

  const row = result.data;
  if (
    result.error ||
    !row ||
    row.school_id !== identity.school_id ||
    (row.audience === 'student' && !academicChildren.some((c) => c.student_id === row.student_id))
  ) {
    return missing();
  }

  return new Response(`${row.title}\n\n${row.content}`, {
    headers: { ...headers, 'Content-Disposition': 'attachment; filename="brightcamp-material.txt"' },
  });
}
