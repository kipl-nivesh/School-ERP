import type { Metadata } from 'next';
import { LIVE_AUTHENTICATION_ENABLED } from '@/lib/auth/authentication-flow';
import { ParentLoginForm } from './parent-login-form';

export const metadata: Metadata = {
  title: 'Parent sign-in | Brightcamp School ERP',
  description: 'Sign in to the parent and guardian portal using your child’s Student ID and secret Parent PIN.',
};

export const dynamic = 'force-dynamic';

export default function ParentLoginPage() {
  return <ParentLoginForm liveAuthEnabled={LIVE_AUTHENTICATION_ENABLED} />;
}
