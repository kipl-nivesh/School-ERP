import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

export default function nextConfig(phase) {
  const live = phase === PHASE_DEVELOPMENT_SERVER ||
    (process.env.VERCEL_ENV === 'production' && process.env.BRIGHTCAMP_ENABLE_LIVE_BUILD === 'true');
  if (live) return {};

  // Explicit empty replacements keep inherited public credentials out of the bundle.
  return {
    env: {
      NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK: 'true',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
    },
  };
}
