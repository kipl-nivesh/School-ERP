import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabasePublicConfiguration } from './config';

/** Request-scoped factory. Enable writes only inside a response-capable Server Action/Route Handler. */
export async function createServerSupabaseClient(options: { cookieWrites?: 'read-only' | 'allowed'; httpOnlyCookies?: boolean } = {}) {
  const { url, publishableKey } = requireSupabasePublicConfiguration();
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    ...(options.httpOnlyCookies ? { cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' } } : {}),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => {
        if (updates.length === 0) return;
        if (options.cookieWrites !== 'allowed') {
          throw new Error('Supabase cookie updates require a response-capable context. Session refresh routing has not been enabled.');
        }
        for (const { name, value, options: cookieOptions } of updates) cookieStore.set(name, value, cookieOptions);
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}
