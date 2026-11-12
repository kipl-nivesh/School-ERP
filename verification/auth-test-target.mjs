import { APPROVED_CLOUD_TARGET, CLOUD_EXECUTION_ENABLED } from './auth-test-policy.mjs';

// Public identifier, not a credential. Always deny the existing school project.
const PRODUCTION_REF = 'yedvkcwkflhbqumjwknh';
const fail = code => { throw new Error(code); };
const inherited = name => /^(NEXT_PUBLIC_SUPABASE_|SUPABASE_|PG)/.test(name) || name === 'DATABASE_URL' || name === 'STAFF_AUTH_REQUESTS_ENABLED';

/** Pure contract only. The supplied approval must come from a trusted reviewer,
 * never from the same environment/caller supplying the requested target.
 * Contract success is NOT permission to execute cloud tests. */
export function validateTestTarget(input, approval = null, environmentNames = []) {
  if (environmentNames.some(inherited)) fail('INHERITED_CONFIGURATION');
  if (input.acknowledgment !== '1') fail('DISPOSABLE_ACKNOWLEDGMENT_REQUIRED');
  const mode = input.mode === undefined ? 'local' : input.mode;
  if (mode !== 'local' && mode !== 'cloud') fail('INVALID_TEST_MODE');
  if (typeof input.url !== 'string') fail('INVALID_TEST_URL');
  if (mode === 'local') {
    // Exact textual forms prevent URL-parser normalization of aliases, credentials,
    // alternate IP encodings, paths, query strings, fragments or whitespace.
    if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::[1-9][0-9]{0,4})?\/?$/.test(input.url)) fail('INVALID_LOCAL_TARGET');
    let parsed;
    try { parsed = new URL(input.url); } catch { fail('INVALID_LOCAL_TARGET'); }
    if (input.projectRef !== undefined) fail('AMBIGUOUS_LOCAL_TARGET');
    return Object.freeze({ mode, url: parsed.origin });
  }
  if (typeof input.projectRef !== 'string' || !/^[a-z0-9]{20}$/.test(input.projectRef)) fail('INVALID_PROJECT_REFERENCE');
  if (input.projectRef === PRODUCTION_REF) fail('PRODUCTION_TARGET_FORBIDDEN');
  const expected = `https://${input.projectRef}.supabase.co`;
  if (input.url !== expected) fail('CLOUD_TARGET_MISMATCH');
  if (!approval || typeof approval.reviewId !== 'string' || !approval.reviewId.trim() ||
      approval.projectRef === PRODUCTION_REF || approval.projectRef !== input.projectRef || approval.url !== expected) fail('INDEPENDENT_APPROVAL_REQUIRED');
  return Object.freeze({ mode, url: expected, projectRef: input.projectRef });
}

/** Never load dotenv or read credential properties until the target is allowed.
 * Cloud policy is imported from a separate reviewed module, not from env. */
export function prepareAuthTest(environment) {
  const target = validateTestTarget({
    mode: environment.AUTH_TEST_MODE,
    acknowledgment: environment.AUTH_TEST_DISPOSABLE,
    projectRef: environment.AUTH_TEST_PROJECT_REF,
    url: environment.AUTH_TEST_URL,
  }, APPROVED_CLOUD_TARGET, Object.keys(environment));
  if (target.mode === 'cloud' && !CLOUD_EXECUTION_ENABLED) fail('CLOUD_EXECUTION_DISABLED');
  const credentials = validateSyntheticCredentials({
    key: environment.AUTH_TEST_PUBLISHABLE_KEY,
    email: environment.AUTH_TEST_EMAIL,
    password: environment.AUTH_TEST_PASSWORD,
  });
  return Object.freeze({ target, credentials });
}

export function validateSyntheticCredentials({ key, email, password }) {
  if (typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) fail('INVALID_TEST_KEY');
  if (typeof email !== 'string' || !/^[a-z0-9][a-z0-9._+-]{0,63}@example\.invalid$/.test(email)) fail('INVALID_SYNTHETIC_IDENTITY');
  if (typeof password !== 'string' || !password.trim() || password.length > 4096 || /[\r\n\0]/.test(password)) fail('INVALID_TEST_PASSWORD');
  return Object.freeze({ key, email, password });
}

/** Auth-only transport: pin every SDK request to the validated origin and refuse
 * redirects at the fetch layer. Never propagate provider/transport error details. */
export function createPinnedAuthFetch(target, transport = globalThis.fetch) {
  const origin = target.url;
  return async (input, init) => {
    try {
      const raw = input instanceof Request ? input.url : String(input);
      const url = new URL(raw);
      if (url.origin !== origin || url.username || url.password || url.hash || !url.pathname.startsWith('/auth/v1/')) fail('REQUEST_TARGET_FORBIDDEN');
      const response = await transport(input, { ...init, redirect: 'error' });
      if (response.redirected || (response.status >= 300 && response.status < 400) ||
          (response.url && new URL(response.url).origin !== origin)) fail('REDIRECT_FORBIDDEN');
      return response;
    } catch { fail('AUTH_TEST_REQUEST_FAILED'); }
  };
}
