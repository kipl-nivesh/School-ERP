import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { staffRequestsEnabled } from './lib/staff/request-policy';
import { getSupabasePublicConfiguration } from './lib/supabase/config';

/** Cookie refresh for staff and Student routes. The server DAL independently verifies authorization. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  if (!request.nextUrl.pathname.startsWith('/student/') && !staffRequestsEnabled()) return response;
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
        response.headers.set('Referrer-Policy', 'no-referrer');
      },
    },
  });
  try { await client.auth.getClaims(); } catch { /* No authority granted; page/DAL fails closed. */ }
  return response;
}
export const config = { matcher: ['/staff/:path*', '/login/staff/:path*', '/invite', '/student/:path*'] };
