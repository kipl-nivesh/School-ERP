export interface SupabasePublicEnvironment {
  readonly url?: string;
  readonly publishableKey?: string;
}
export type SupabaseConfigurationIssue = 'missing_url' | 'invalid_url' | 'missing_publishable_key' | 'invalid_publishable_key';
export type SupabasePublicConfiguration =
  | { readonly configured: true; readonly url: string; readonly publishableKey: string }
  | { readonly configured: false; readonly issues: readonly SupabaseConfigurationIssue[] };

/** Format checks only. A configured result does not prove connectivity, key validity or authorization. */
export function validateSupabasePublicEnvironment(environment: SupabasePublicEnvironment): SupabasePublicConfiguration {
  const issues: SupabaseConfigurationIssue[] = [];
  const { url, publishableKey } = environment;
  if (!url) issues.push('missing_url');
  else {
    try {
      const parsed = new URL(url);
      if (url !== url.trim() || parsed.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname) ||
        parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') issues.push('invalid_url');
    } catch { issues.push('invalid_url'); }
  }
  if (!publishableKey) issues.push('missing_publishable_key');
  else if (publishableKey !== publishableKey.trim() || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) issues.push('invalid_publishable_key');
  if (issues.length) return { configured: false, issues: Object.freeze(issues) };
  return { configured: true, url: url!, publishableKey: publishableKey! };
}

/** Static env references are required for Next.js browser configuration replacement. No top-level client. */
export function getSupabasePublicConfiguration(): SupabasePublicConfiguration {
  return validateSupabasePublicEnvironment({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function requireSupabasePublicConfiguration(): Extract<SupabasePublicConfiguration, { configured: true }> {
  const result = getSupabasePublicConfiguration();
  if (!result.configured) {
    throw new Error('Supabase public configuration is missing or invalid. Configure the URL and modern publishable key in .env.local; no values are included in this error.');
  }
  return result;
}
