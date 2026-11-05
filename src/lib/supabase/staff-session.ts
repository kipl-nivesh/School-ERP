import 'server-only';

import { createServerSupabaseClient } from './server';

export type StaffSessionInspection =
  | { readonly state: 'configuration_or_provider_unavailable'; readonly schoolAccess: false }
  | { readonly state: 'no_verified_provider_session'; readonly schoolAccess: false }
  | { readonly state: 'provider_identity_present'; readonly schoolAccess: false; readonly applicationAuthorization: 'pending' };

/**
 * Unwired scaffolding, not a login action or school access gate. No password input,
 * signup, role inference from metadata, session factory or privileged key.
 * A provider identity alone must never unlock a dashboard or create a Step 12 context.
 */
export async function inspectStaffProviderSession(): Promise<StaffSessionInspection> {
  try {
    const client = await createServerSupabaseClient();
    const claims = await client.auth.getClaims();
    if (claims.error || !claims.data?.claims.sub) return { state: 'no_verified_provider_session', schoolAccess: false };
    const user = await client.auth.getUser();
    if (user.error || !user.data.user || user.data.user.id !== claims.data.claims.sub) {
      return { state: 'no_verified_provider_session', schoolAccess: false };
    }
    // Live profile/membership/context, mandatory privileged MFA and approvals are not enabled.
    return { state: 'provider_identity_present', schoolAccess: false, applicationAuthorization: 'pending' };
  } catch {
    return { state: 'configuration_or_provider_unavailable', schoolAccess: false };
  }
}
