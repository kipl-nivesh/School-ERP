/** Shared by the provider adapter and the cookie-refresh proxy. */
export function staffRequestsEnabled(): boolean {
  return process.env.STAFF_AUTH_REQUESTS_ENABLED === 'true' &&
    process.env.NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK !== 'true' && process.env.VERCEL_ENV !== 'preview';
}
