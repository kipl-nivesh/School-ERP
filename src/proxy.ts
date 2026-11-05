import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfiguration } from './lib/supabase/config';

/** Cookie refresh only for separate staff routes. The server DAL independently verifies authorization. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  if (process.env.STAFF_AUTH_REQUESTS_ENABLED !== 'true') return response;
  const configuration = getSupabasePublicConfiguration();
  if (!configuration.configured) return response;
  const client = createServerClient(configuration.url, configuration.publishableKey, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: updates => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
        response.headers.set('Cache-Control', 'private, no-store');
      },
    },
  });
  try { await client.auth.getClaims(); } catch { /* No authority granted; page/DAL fails closed. */ }
  return response;
}
export const config = { matcher: ['/staff/:path*', '/login/staff'] };
