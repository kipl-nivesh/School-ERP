import { notFound, redirect } from 'next/navigation';
import { getStaffAccess } from '@/lib/staff/server';
import { isStaffRole, type StaffRole } from '@/lib/staff/contracts';
import { staffRequestsEnabled } from '@/lib/staff/request-policy';
import { getStudentPortalAccess } from '@/lib/student/live-dashboard';
import { getParentPortalAccess } from '@/lib/parent/server';

export const dynamic = 'force-dynamic';

const VALID_PORTAL_ROLES = ['admin', 'teacher', 'student', 'parent', 'accountant'] as const;
type PortalRole = (typeof VALID_PORTAL_ROLES)[number];

export default async function PortalWorkspace({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!VALID_PORTAL_ROLES.includes(role as PortalRole)) notFound();

  // 1. Staff Roles (admin, teacher, accountant)
  if (isStaffRole(role)) {
    if (staffRequestsEnabled()) {
      try {
        const access = await getStaffAccess(role as StaffRole);
        if (access && access.role === role && access.context.schoolId) {
          redirect(`/staff/${role}`);
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'digest' in err &&
          typeof (err as { digest: unknown }).digest === 'string' &&
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
        ) {
          throw err;
        }
      }
    }
    // Unauthenticated staff redirect to staff login with pre-selected role
    redirect(`/login/staff?role=${role}`);
  }

  if (role === 'student') {
    redirect(await getStudentPortalAccess() ? '/student/dashboard' : '/login/student');
  }

  // 3. Parent Portal
  if (role === 'parent') {
    redirect((await getParentPortalAccess()) ? '/parent/dashboard' : '/login/parent');
  }

  notFound();
}

