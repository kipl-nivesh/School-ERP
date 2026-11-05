import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const js = ts.transpileModule(fs.readFileSync('src/lib/supabase/config.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { validateSupabasePublicEnvironment: validate } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
// In-memory shape fixture only, never a real key and never loaded from .env.local.
const shape = ['sb', 'publishable', 'syntheticShapeOnly'].join('_');
const url = 'https://' + 'a'.repeat(20) + '.supabase.co';
let count = 0;
const test = (name, run) => { run(); count++; console.log('PASS: ' + name); };
test('Missing environment denies without network', () => assert.equal(validate({}).configured, false));
test('Modern publishable shape accepted without proving validity', () => assert.equal(validate({ url, publishableKey: shape }).configured, true));
for (const [name, key] of [['empty', ''], ['legacy JWT', ['eyJ', 'synthetic'].join('')], ['privileged key', ['sb', 'secret', 'synthetic'].join('_')], ['whitespace', ' ' + shape], ['line break', shape + '\n']]) {
  test('Rejects ' + name, () => assert.equal(validate({ url, publishableKey: key }).configured, false));
}
for (const [name, candidate] of [['HTTP', url.replace('https:', 'http:')], ['foreign host', 'https://example.com'], ['credentials', url.replace('https://', 'https://user:pass@')], ['query', url + '?value=x'], ['fragment', url + '#fragment'], ['path', url + '/rest/v1'], ['port', url + ':8443'], ['leading whitespace', ' ' + url]]) {
  test('URL rejects ' + name, () => assert.equal(validate({ url: candidate, publishableKey: shape }).configured, false));
}
test('Errors omit supplied values', () => { const r = validate({ url: 'bad-value', publishableKey: 'bad-key' }); assert.deepEqual(r, { configured: false, issues: ['invalid_url', 'invalid_publishable_key'] }); });
test('Local environment file is covered by ignore rule', () => assert.ok(fs.readFileSync('.gitignore', 'utf8').split(/\r?\n/).includes('.env*')));
test('Template never contains an actual key', () => assert.ok(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$/m.test(fs.readFileSync('.env.example', 'utf8'))));
const migration = fs.readFileSync('supabase/migrations/20261105000100_identity_foundation.sql', 'utf8');
test('Prepared migration statically protects all five tables', () => {
  for (const table of ['roles', 'profiles', 'user_roles', 'admin_privileges', 'role_contexts']) {
    assert.ok(migration.includes('alter table public.' + table + ' enable row level security;'));
    assert.ok(migration.includes('alter table public.' + table + ' force row level security;'));
  }
  assert.equal(/create\s+policy/i.test(migration), false);
  assert.ok(migration.includes('from public, anon, authenticated;'));
});
// Dependency-isolated staff scaffold tests: no Next request, SDK or provider is invoked.
const staffJs = ts.transpileModule(fs.readFileSync('src/lib/supabase/staff-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText.replace(/^import .*;\r?\n/gm, '').replace('export async function inspectStaffProviderSession', 'async function inspectStaffProviderSession');
const factorySource = 'export function makeInspector(createServerSupabaseClient) {' + staffJs + '\nreturn inspectStaffProviderSession;}';
const { makeInspector } = await import('data:text/javascript;base64,' + Buffer.from(factorySource).toString('base64'));
const cases = [
  ['unavailable configuration', async () => { throw Error('synthetic unavailable'); }, 'configuration_or_provider_unavailable'],
  ['missing claims', async () => ({ auth: { getClaims: async () => ({ data: null, error: null }) } }), 'no_verified_provider_session'],
  ['invalid claims', async () => ({ auth: { getClaims: async () => ({ data: null, error: {} }) } }), 'no_verified_provider_session'],
  ['missing user', async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: 'fixture-subject' } } }), getUser: async () => ({ data: { user: null }, error: null }) } }), 'no_verified_provider_session'],
  ['subject mismatch', async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: 'fixture-subject' } } }), getUser: async () => ({ data: { user: { id: 'different-subject' } }, error: null }) } }), 'no_verified_provider_session'],
  ['assumed provider identity still denies school access', async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: 'fixture-subject' } } }), getUser: async () => ({ data: { user: { id: 'fixture-subject' } }, error: null }) } }), 'provider_identity_present'],
];
for (const [name, createClient, state] of cases) {
  const result = await makeInspector(createClient)();
  assert.equal(result.state, state);
  assert.equal(result.schoolAccess, false);
  assert.equal('user' in result, false);
  count++;
  console.log('PASS: Staff scaffold ' + name);
}
console.log('PASS: ' + count + ' offline configuration/static migration/mock staff checks. No real key, network, SQL or RLS execution.');
