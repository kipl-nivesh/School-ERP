import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabasePublicConfiguration } from './config';

/** Request-scoped factory. Enable writes only inside a response-capable Server Action/Route Handler. */
export async function createServerSupabaseClient(options: { cookieWrites?: 'read-only' | 'allowed'; httpOnlyCookies?: boolean } = {}) {
  const { url, publishableKey } = requireSupabasePublicConfiguration();
  const origin = new URL(url).origin;
  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
  return createServerClient(url, publishableKey, {
    ...(options.httpOnlyCookies ? { cookieOptions: { httpOnly: true, secure: isSecure, sameSite: 'lax' as const, path: '/' } } : {}),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => {
        if (updates.length === 0) return;
        if (options.cookieWrites !== 'allowed') {
          // In Server Components, response cookie modification is not permitted in Next.js.
          // Cookie refresh is handled by Middleware/Proxy and Server Actions.
          return;
        }
        try {
          for (const { name, value, options: cookieOptions } of updates) cookieStore.set(name, value, cookieOptions);
        } catch {
          // Silently ignore if invoked outside a response-capable context
        }
      },
    },
    global: {
      fetch: (input, init) => {
        const target = new URL(input instanceof Request ? input.url : input);
        if (target.origin !== origin) throw new Error('Unexpected Supabase request origin.');
        // A redirect must not forward SDK credentials to another origin.
        return fetch(input, { ...init, cache: 'no-store', redirect: 'error' });
      },
    },
  });
}
