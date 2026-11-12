import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test, after } from 'node:test';
import { validateTestTarget, validateSyntheticCredentials, prepareAuthTest, createPinnedAuthFetch } from './auth-test-target.mjs';
import { APPROVED_CLOUD_TARGET, CLOUD_EXECUTION_ENABLED } from './auth-test-policy.mjs';

// Fictional shape fixtures only. No DNS, SDK, native Auth or environment loading.
const ref = 'a'.repeat(20);
const url = `https://${ref}.supabase.co`;
const cloud = { mode: 'cloud', acknowledgment: '1', projectRef: ref, url };
const approval = Object.freeze({ projectRef: ref, url, reviewId: 'OFFLINE-FIXTURE-NOT-REAL-APPROVAL' });
const identity = { key: 'sb_publishable_SYNTHETIC_NOT_A_KEY', email: 'fixture@example.invalid', password: 'fictional-test-password' };
const originalFetch = globalThis.fetch;
let unexpectedFetches = 0;
globalThis.fetch = () => { unexpectedFetches++; throw new Error('Offline tests forbid network'); };
after(() => { globalThis.fetch = originalFetch; assert.equal(unexpectedFetches, 0); });

test('fictional approved target validates contract only', () => {
  assert.deepEqual(validateTestTarget(cloud, approval), { mode: 'cloud', projectRef: ref, url });
  assert.equal(APPROVED_CLOUD_TARGET, null);
  assert.equal(CLOUD_EXECUTION_ENABLED, false);
});
for (const [name, change] of [
  ['missing acknowledgment', { acknowledgment: undefined }],
  ['incorrect acknowledgment', { acknowledgment: 'true' }],
  ['missing project reference', { projectRef: undefined }],
  ['malformed project reference', { projectRef: 'short' }],
  ['unknown project', { projectRef: 'b'.repeat(20), url: `https://${'b'.repeat(20)}.supabase.co` }],
  ['production project', { projectRef: 'yedvkcwkflhbqumjwknh', url: 'https://yedvkcwkflhbqumjwknh.supabase.co' }],
  ['URL and reference mismatch', { url: `https://${'b'.repeat(20)}.supabase.co` }],
  ['HTTP', { url: url.replace('https:', 'http:') }],
  ['arbitrary host', { url: 'https://example.invalid' }],
  ['loopback in cloud mode', { url: 'http://127.0.0.1:54321' }],
  ['embedded credentials', { url: url.replace('https://', 'https://fixture:fixture@') }],
  ['query', { url: url + '?fixture=1' }],
  ['fragment', { url: url + '#fixture' }],
  ['uppercase alias', { url: url.toUpperCase() }],
  ['trailing slash alias', { url: url + '/' }],
  ['default port alias', { url: url + ':443' }],
  ['trailing hostname dot', { url: url.replace('.co', '.co.') }],
  ['whitespace', { url: ' ' + url }],
  ['newline', { url: url + '\n' }],
  ['percent encoding', { url: url.replace('aaa', '%61aa') }],
  ['backslash', { url: url.replace('https://', 'https:\\') }],
  ['path', { url: url + '/auth/v1' }],
  ['suffix host', { url: url + '.example.invalid' }],
  ['missing URL', { url: undefined }],
  ['unknown mode', { mode: 'production' }],
  ['empty mode', { mode: '' }],
]) test(`rejects ${name}`, () => assert.throws(() => validateTestTarget({ ...cloud, ...change }, approval)));

for (const badApproval of [null, {}, { ...approval, reviewId: '' }, { ...approval, url: 'https://example.invalid' }, { ...approval, projectRef: 'b'.repeat(20) }]) {
  test('rejects absent or inconsistent independently supplied approval', () => assert.throws(() => validateTestTarget(cloud, badApproval)));
}
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'PGHOST', 'STAFF_AUTH_REQUESTS_ENABLED']) {
  test(`rejects inherited ${name} by name without reading its value`, () => {
    const env = { AUTH_TEST_DISPOSABLE: '1', AUTH_TEST_URL: 'http://127.0.0.1:54321' };
    Object.defineProperty(env, name, { enumerable: true, get() { assert.fail('Inherited value must not be read'); } });
    assert.throws(() => prepareAuthTest(env), /INHERITED_CONFIGURATION/);
  });
}
for (const target of ['http://127.0.0.1:54321', 'http://localhost:54321/', 'http://[::1]:54321']) {
  test('preserves explicit canonical loopback mode', () => {
    const ready = prepareAuthTest({ AUTH_TEST_URL: target, AUTH_TEST_DISPOSABLE: '1', AUTH_TEST_PUBLISHABLE_KEY: identity.key, AUTH_TEST_EMAIL: identity.email, AUTH_TEST_PASSWORD: identity.password });
    assert.equal(ready.target.mode, 'local');
    assert.equal(ready.target.url, new URL(target).origin);
    assert.deepEqual(ready.credentials, identity);
  });
}
for (const candidate of ['http://127.1:54321', 'http://2130706433:54321', 'ftp://localhost', 'http://localhost:99999', 'http://localhost?x=1', 'http://localhost/path', url]) {
  test('rejects local aliases, invalid ports, paths and cloud targets without cloud mode', () => assert.throws(() => validateTestTarget({ acknowledgment: '1', url: candidate })));
}
test('rejects project reference in local mode', () => assert.throws(() => validateTestTarget({ acknowledgment: '1', url: 'http://localhost:54321', projectRef: ref })));
test('cloud runner remains blocked before reading credentials even with caller approval flags', () => {
  const env = { AUTH_TEST_MODE: 'cloud', AUTH_TEST_DISPOSABLE: '1', AUTH_TEST_PROJECT_REF: ref, AUTH_TEST_URL: url, AUTH_TEST_APPROVED: '1', AUTH_TEST_CLOUD_EXECUTION_ENABLED: 'true' };
  for (const name of ['AUTH_TEST_PUBLISHABLE_KEY', 'AUTH_TEST_EMAIL', 'AUTH_TEST_PASSWORD']) Object.defineProperty(env, name, { enumerable: true, get() { assert.fail('Credentials must not be read'); } });
  assert.throws(() => prepareAuthTest(env), /INDEPENDENT_APPROVAL_REQUIRED/);
});
test('missing target rejects before reading credentials', () => {
  const env = {};
  Object.defineProperty(env, 'AUTH_TEST_PASSWORD', { get() { assert.fail('Credentials must not be read'); } });
  assert.throws(() => prepareAuthTest(env), /DISPOSABLE_ACKNOWLEDGMENT_REQUIRED/);
});
for (const [name, change] of [
  ['missing email', { email: undefined }], ['real-domain email', { email: 'fixture@example.com' }],
  ['suffix-domain email', { email: 'fixture@example.invalid.evil' }], ['empty local part', { email: '@example.invalid' }],
  ['newline email', { email: 'fixture@example.invalid\n' }], ['missing password', { password: undefined }],
  ['blank password', { password: ' ' }], ['missing key', { key: undefined }], ['legacy key', { key: 'eyJfixture' }],
  ['secret key', { key: 'sb_secret_fixture' }], ['empty publishable suffix', { key: 'sb_publishable_' }],
]) test(`rejects ${name}`, () => assert.throws(() => validateSyntheticCredentials({ ...identity, ...change })));

test('denial messages contain no submitted sensitive values', () => {
  assert.throws(() => validateTestTarget({ ...cloud, url: 'https://sensitive-user:sensitive-pass@example.invalid' }, approval), error => error.message === 'CLOUD_TARGET_MISMATCH');
  assert.throws(() => validateSyntheticCredentials({ ...identity, key: 'sensitive-key-fixture' }), error => error.message === 'INVALID_TEST_KEY');
});
test('pinned transport rejects wrong origins, credentials, fragments and non-Auth paths before fetch', async () => {
  let calls = 0;
  const fetch = createPinnedAuthFetch({ url }, async () => { calls++; return new Response('{}'); });
  for (const request of ['https://example.invalid/auth/v1/user', url + '/rest/v1/students', url + '/auth/v1/user#fragment', url.replace('https://', 'https://fixture:fixture@') + '/auth/v1/user']) await assert.rejects(fetch(request), /AUTH_TEST_REQUEST_FAILED/);
  assert.equal(calls, 0);
});
test('pinned transport forces redirect error even if caller requests follow', async () => {
  let calls = 0;
  const fetch = createPinnedAuthFetch({ url }, async (_input, init) => { calls++; assert.equal(init.redirect, 'error'); return new Response('{}'); });
  await fetch(url + '/auth/v1/user', { redirect: 'follow' });
  assert.equal(calls, 1);
});
test('pinned transport rejects redirect responses and redacts transport errors', async () => {
  for (const response of [new Response(null, { status: 302 }), { status: 200, redirected: true }, { status: 200, url: 'https://example.invalid/auth/v1/user' }]) {
    await assert.rejects(createPinnedAuthFetch({ url }, async () => response)(url + '/auth/v1/user'), /AUTH_TEST_REQUEST_FAILED/);
  }
  await assert.rejects(createPinnedAuthFetch({ url }, async () => { throw Error('sensitive fixture'); })(url + '/auth/v1/user'), error => error.message === 'AUTH_TEST_REQUEST_FAILED');
});
test('runner validates before lazy SDK import and uses pinned transport, without dotenv', () => {
  const source = fs.readFileSync('verification/verify-step24c-gotrue.mjs', 'utf8');
  assert.ok(source.indexOf('prepareAuthTest(process.env)') < source.indexOf("await import('@supabase/supabase-js')"));
  assert.ok(source.includes('fetch:createPinnedAuthFetch(target)'));
  assert.ok(!source.includes('loadEnvConfig') && !source.includes('dotenv'));
  const blockedBranch = source.slice(source.indexOf('catch {'), source.indexOf('if (prepared)'));
  assert.ok(!blockedBranch.includes('write()'));
});
