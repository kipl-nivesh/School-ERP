import type { Metadata } from 'next';
import Link from 'next/link';
import { StaffLoginForm } from './staff-login-form';
import { staffRequestsEnabled } from '@/lib/staff/server';
export const metadata: Metadata = { title: 'Staff sign-in' };
export const dynamic = 'force-dynamic';
export default async function StaffLoginPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  return <><StaffLoginForm requestsEnabled={staffRequestsEnabled()} notice={params?.notice} /><p className="p-4 text-center"><Link href="/login/staff/recover">Forgot your password?</Link></p></>;
}
