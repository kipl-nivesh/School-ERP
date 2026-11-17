import type { Metadata } from 'next';
import { ParentLoginForm } from './parent-login-form';

export const metadata: Metadata = {
  title: 'Parent sign-in | Brightcamp School ERP',
  description: 'Sign in to the parent and guardian portal using a one-time code sent to your verified guardian email.',
};

export const dynamic = 'force-dynamic';

export default function ParentLoginPage() {
  return <ParentLoginForm />;
}
