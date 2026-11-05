'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabasePublicConfiguration } from './config';

/** Lazy unused factory. Does not authenticate or authorize a school user. */
export function createBrowserSupabaseClient() {
  const { url, publishableKey } = requireSupabasePublicConfiguration();
  return createBrowserClient(url, publishableKey);
}
