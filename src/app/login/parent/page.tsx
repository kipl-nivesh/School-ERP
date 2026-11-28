import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import { getParentPortalAccess } from '@/lib/parent/server';
import { ParentLoginForm } from './parent-login-form';

export const metadata: Metadata = {
  title: 'Parent sign-in | Brightcamp School ERP',
  description: 'Sign in to the parent and guardian portal using a one-time code sent to your verified guardian email.',
};

export const dynamic = 'force-dynamic';

export default async function ParentLoginPage() {
  const existing = await getParentPortalAccess();
  if (existing) {
    redirect('/parent/dashboard');
  }
  const config = getSupabasePublicConfiguration();
  return <ParentLoginForm liveAuthEnabled={config.configured} />;
}
