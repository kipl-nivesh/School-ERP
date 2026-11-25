import type { Metadata } from 'next';
import { StudentLoginForm } from './student-login-form';
import { studentPortalRequestsEnabled } from '@/lib/student/request-policy';

export const metadata: Metadata = {
  title: 'Student sign-in | Brightcamp School ERP',
  description: 'The Brightcamp Student sign-in screen.',
};

export const dynamic = 'force-dynamic';

export default function StudentLoginPage() {
  return <StudentLoginForm liveAuthEnabled={studentPortalRequestsEnabled()} />;
}
