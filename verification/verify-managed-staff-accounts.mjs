import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(file, modules, fetch = globalThis.fetch) {
  const raw = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(raw, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('require', 'exports', 'fetch', outputText)(name => {
    assert.ok(Object.hasOwn(modules, name), name);
    return modules[name];
  }, exports, fetch);
  return exports;
}

const contracts = load('src/lib/staff/account-contracts.ts', {});
const membership = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const token = 'a'.repeat(64);
const createForm = (extra = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ intent: 'invite', name: 'Fixture Teacher', email: 'teacher@example.invalid',
    code: 'EMP-1', role: 'teacher', active: 'true', ...extra })) f.set(k, v);
  return f;
};

function management({ role = 'admin', assurance = 'aal2', permissions = Object.values(contracts.STAFF_ACCOUNT_PERMISSIONS), rpcError } = {}) {
  const calls = [];
  const { manageStaffAccount } = load('src/app/staff/staff-account-actions.ts', {
    'node:crypto': { randomBytes: () => Buffer.alloc(32), createHash: () => ({ update: () => ({ digest: () => 'hash-fixture' }) }) },
    'next/cache': { revalidatePath() {} },
    '@/lib/staff/server': {
      getStaffAccess: async () => ({ context: { schoolId: 'verified-school', profileId: 'actor',
        activeRole: { role, assignmentId: 'assignment' }, session: { assurance },
        assignments: [{ id: 'assignment', profileId: 'actor', role, status: 'active', permissions }] } }),
      staffClient: async () => ({ rpc: async (name, args) => {
        calls.push({ name, args });
        return { error: rpcError, data: name === 'issue_managed_staff_invitation' ? membership : true };
      } }),
    },
    '@/lib/staff/recovery': { recoveryOrigin: () => 'https://school.example.invalid' },
    '@/lib/staff/contracts': { isStaffUuid: value => value === membership },
    '@/lib/staff/account-contracts': contracts,
  });
  return { submit: form => manageStaffAccount({ ok: false, message: '' }, form), calls };
}

test('authority, role and invalid form checks precede every account RPC', async () => {
  for (const fixture of [management({ role: 'teacher' }), management({ role: 'accountant' }),
    management({ assurance: 'aal1' }), management({ permissions: [] })]) {
    assert.equal((await fixture.submit(createForm())).ok, false);
    assert.deepEqual(fixture.calls, []);
  }
  const invalid = management();
  for (const values of [{ role: 'admin' }, { code: '..' }, { email: 'missing' }]) {
    assert.equal((await invalid.submit(createForm(values))).ok, false);
  }
  assert.deepEqual(invalid.calls, []);
});

test('invitation stores only a hash and never forwards a caller-supplied school or password', async () => {
  const fixture = management();
  const result = await fixture.submit(createForm({ schoolId: 'foreign', password: 'synthetic value' }));
  assert.equal(result.ok, true);
  assert.match(result.link, /\/invite#token=/);
  const [{ name, args }] = fixture.calls;
  assert.equal(name, 'issue_managed_staff_invitation');
  assert.equal(args.p_token_hash, 'hash-fixture');
  assert.equal('schoolId' in args || 'password' in args, false);
});

test('duplicates are actionable and reset uses recipient-initiated recovery', async () => {
  const duplicate = management({ rpcError: { code: '23505' } });
  assert.match((await duplicate.submit(createForm())).message, /email or employee ID/);
  const fixture = management();
  const result = await fixture.submit(createForm({ intent: 'reset', membership }));
  assert.equal(result.link, 'https://school.example.invalid/login/staff/recover');
  assert.deepEqual(fixture.calls[0].args, { p_membership: membership, p_intent: 'reset' });
});

function setup({ matches = true, confirmationRequired = true } = {}) {
  const calls = [];
  const { acceptInvitation } = load('src/app/invite/actions.ts', {
    '@/lib/services/staff-workspace-policy': { staffWorkspaceWritesEnabled: () => false },
    '@/lib/staff/server': { staffRequestsEnabled: () => true, staffClient: async () => ({
      rpc: async () => ({ data: matches }),
      auth: { signUp: async () => { calls.push('signup'); return { data: { session: null } }; } },
    }) },
    '@/lib/staff/contracts': { validateStaffInput: () => true },
    '@/lib/staff/account-contracts': contracts,
    '@/lib/staff/recovery': { recoveryOrigin: () => 'https://school.example.invalid' },
    '@/lib/supabase/config': { getSupabasePublicConfiguration: () => ({ configured: true, url: 'https://fixture.supabase.co', publishableKey: 'fixture' }) },
  }, async () => Response.json({ external: { email: true }, disable_signup: false, mailer_autoconfirm: !confirmationRequired }));
  const form = createForm({ intent: 'setup', token, password: 'Synthetic password 1!', confirmation: 'Synthetic password 1!' });
  return { submit: () => acceptInvitation({ message: '' }, form), calls };
}

test('new Auth signup requires an exact invitation and provider email confirmation', async () => {
  for (const fixture of [setup({ matches: false }), setup({ confirmationRequired: false })]) {
    await fixture.submit();
    assert.deepEqual(fixture.calls, []);
  }
  const fixture = setup();
  assert.match((await fixture.submit()).message, /Check your inbox/);
  assert.deepEqual(fixture.calls, ['signup']);
});
