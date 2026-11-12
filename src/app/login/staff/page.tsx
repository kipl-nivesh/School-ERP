import type { Metadata } from 'next';
import Link from 'next/link';
import { StaffLoginForm } from './staff-login-form';
import { staffRequestsEnabled } from '@/lib/staff/server';
export const metadata: Metadata = { title: 'Staff sign-in' };
export const dynamic = 'force-dynamic';
export default function StaffLoginPage() { return <><StaffLoginForm requestsEnabled={staffRequestsEnabled()} /><p className="p-4 text-center"><Link href="/login/staff/recover">Forgot your password?</Link></p></>; }
