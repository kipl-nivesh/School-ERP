import type { Metadata } from 'next';
import { StaffLoginForm } from './staff-login-form';
import { isStaffRole, type StaffRole } from '@/lib/staff/contracts';
import { staffRequestsEnabled } from '@/lib/staff/server';

export const metadata: Metadata = { title: 'Staff sign-in' };
export const dynamic = 'force-dynamic';

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; role?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const initialRole: StaffRole = params?.role && isStaffRole(params.role) ? params.role : 'admin';

  return (
    <StaffLoginForm
      requestsEnabled={staffRequestsEnabled()}
      notice={params?.notice}
      initialRole={initialRole}
    />
  );
}
