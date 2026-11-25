import type { Metadata } from 'next';
import { StudentLoginForm } from './student-login-form';

export const metadata: Metadata = {
  title: 'Student sign-in | Brightcamp School ERP',
  description: 'Preview the Brightcamp Student sign-in screen.',
};

export const dynamic = 'force-dynamic';

export default function StudentLoginPage() {
  return <StudentLoginForm liveAuthEnabled={false} />;
}
