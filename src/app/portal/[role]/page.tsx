import { notFound, redirect } from 'next/navigation';
import { getStaffAccess } from '@/lib/staff/server';
import { isStaffRole, type StaffRole } from '@/lib/staff/contracts';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { staffRequestsEnabled } from '@/lib/staff/request-policy';

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

  // 2. Student Portal
  if (role === 'student') {
    try {
      const config = getSupabasePublicConfiguration();
      if (config.configured) {
        const supabase = await createServerSupabaseClient({ cookieWrites: 'read-only' });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          redirect('/student/dashboard');
        }
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
    redirect('/login/student');
  }

  // 3. Parent Portal
  if (role === 'parent') {
    try {
      const config = getSupabasePublicConfiguration();
      if (config.configured) {
        const supabase = await createServerSupabaseClient({ cookieWrites: 'read-only' });
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          redirect('/parent/dashboard');
        }
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
    redirect('/login/parent');
  }

  notFound();
}

