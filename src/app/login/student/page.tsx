import type { Metadata } from 'next';
import { LIVE_AUTHENTICATION_ENABLED } from '@/lib/auth/authentication-flow';
import { StudentLoginForm } from './student-login-form';

export const metadata: Metadata = {
  title: 'Student sign-in | Brightcamp School ERP',
  description: 'Sign in to the student portal using your Student ID and secret PIN.',
};

export const dynamic = 'force-dynamic';

export default function StudentLoginPage() {
  return <StudentLoginForm liveAuthEnabled={LIVE_AUTHENTICATION_ENABLED} />;
}
