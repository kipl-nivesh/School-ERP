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

const token = 'c'.repeat(64);
const email = 'newteacher@brightcamp.edu';

function setupAction({ matches = true, signUpError = null, settingsUnavailable = false } = {}) {
  const calls = [];
  const contracts = load('src/lib/staff/account-contracts.ts', {});
  const { acceptInvitation } = load('src/app/invite/actions.ts', {
    '@/lib/services/staff-workspace-policy': { staffWorkspaceWritesEnabled: () => false },
    '@/lib/staff/server': {
      staffRequestsEnabled: () => true,
      staffClient: async () => ({
        rpc: async (name, args) => {
          calls.push({ rpc: name, args });
          return { data: matches, error: null };
        },
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          signUp: async (options) => {
            calls.push({ auth: 'signUp', options });
            if (signUpError) return { data: { session: null }, error: signUpError };
            return { data: { session: null }, error: null };
          },
          signOut: async () => { calls.push({ auth: 'signOut' }); },
          signInWithPassword: async (options) => {
            calls.push({ auth: 'signIn', options });
            return { data: { user: { email_confirmed_at: '2026-11-24T00:00:00Z' } }, error: null };
          },
        },
      }),
    },
    '@/lib/staff/contracts': {
      validateStaffInput: (em, pw, role) => typeof em === 'string' && typeof pw === 'string' && role === 'teacher',
    },
    '@/lib/staff/account-contracts': contracts,
    '@/lib/staff/recovery': { recoveryOrigin: () => 'https://school-erp-jet-kappa.vercel.app' },
    '@/lib/supabase/config': {
      getSupabasePublicConfiguration: () => ({
        configured: true,
        url: 'https://yedvkcwkflhbqumjwknh.supabase.co',
        publishableKey: 'sb_publishable_fixture',
      }),
    },
  }, async () => {
    if (settingsUnavailable) throw new Error('Auth settings unavailable');
    return Response.json({ external: { email: true }, disable_signup: false, mailer_autoconfirm: false });
  });

  return {
    submit: (formData) => acceptInvitation({ ok: false, message: '' }, formData),
    calls,
  };
}

test('Validation: Rejects missing or malformed invitation token', async () => {
  const { submit, calls } = setupAction();
  const form = new FormData();
  form.set('token', 'invalid-token');
  form.set('email', email);
  form.set('password', 'ValidPassword123!');
  form.set('confirmation', 'ValidPassword123!');
  form.set('intent', 'setup');

  const result = await submit(form);
  assert.equal(result.ok, false);
  assert.match(result.message, /invalid authorization token/i);
  assert.equal(calls.length, 0);
});

test('Validation: Rejects password shorter than 12 characters', async () => {
  const { submit, calls } = setupAction();
  const form = new FormData();
  form.set('token', token);
  form.set('email', email);
  form.set('password', 'short1');
  form.set('confirmation', 'short1');
  form.set('intent', 'setup');

  const result = await submit(form);
  assert.equal(result.ok, false);
  assert.match(result.message, /at least 12 characters/i);
});

test('Validation: Rejects mismatched confirmation password', async () => {
  const { submit, calls } = setupAction();
  const form = new FormData();
  form.set('token', token);
  form.set('email', email);
  form.set('password', 'ValidPassword123!');
  form.set('confirmation', 'DifferentPassword123!');
  form.set('intent', 'setup');

  const result = await submit(form);
  assert.equal(result.ok, false);
  assert.match(result.message, /passwords do not match/i);
});

test('Validation: When invitation does not match email/token, returns clear notice', async () => {
  const { submit, calls } = setupAction({ matches: false });
  const form = new FormData();
  form.set('token', token);
  form.set('email', email);
  form.set('password', 'ValidPassword123!');
  form.set('confirmation', 'ValidPassword123!');
  form.set('intent', 'setup');

  const result = await submit(form);
  assert.equal(result.ok, false);
  assert.match(result.message, /no pending invitation matches/i);
  assert.equal(calls.some(c => c.auth === 'signUp'), false);
});

test('New account setup uses a token-free confirmation redirect', async () => {
  const { submit, calls } = setupAction({ matches: true });
  const form = new FormData();
  form.set('token', token);
  form.set('email', email);
  form.set('password', 'ValidPassword123!');
  form.set('confirmation', 'ValidPassword123!');
  form.set('intent', 'setup');

  const result = await submit(form);
  assert.equal(result.ok, true);
  assert.equal(result.phase, 'pending_confirmation');
  assert.match(result.message, /check your inbox/i);

  const signUpCall = calls.find(c => c.auth === 'signUp');
  assert.ok(signUpCall);
  assert.equal(signUpCall.options.email, email);
  assert.equal(signUpCall.options.password, 'ValidPassword123!');
  assert.equal(signUpCall.options.options.emailRedirectTo, 'https://school-erp-jet-kappa.vercel.app/invite');
});

test('Accept: Existing or confirmed account accepts invitation via RPC', async () => {
  const { submit, calls } = setupAction({ matches: true });
  const form = new FormData();
  form.set('token', token);
  form.set('email', email);
  form.set('password', 'ExistingPassword123!');
  form.set('intent', 'accept');

  const result = await submit(form);
  assert.equal(result.ok, true);
  assert.equal(result.phase, 'accepted');
  assert.match(result.message, /invitation accepted/i);

  const acceptCall = calls.find(c => c.rpc === 'accept_staff_invitation');
  assert.ok(acceptCall);
  assert.equal(acceptCall.args.p_token, token);
});

test('Unavailable Auth settings prevent signup', async () => {
  const { submit, calls } = setupAction({ settingsUnavailable: true });
  const form = new FormData();
  for (const [name, value] of Object.entries({
    token, email, password: 'ValidPassword123!', confirmation: 'ValidPassword123!', intent: 'setup',
  })) form.set(name, value);
  assert.equal((await submit(form)).ok, false);
  assert.equal(calls.some(call => call.auth === 'signUp'), false);
});

test('Provider error text is kept out of user-facing responses', async () => {
  const { submit } = setupAction({ signUpError: { message: `Internal provider detail ${token}` } });
  const form = new FormData();
  for (const [name, value] of Object.entries({
    token, email, password: 'ValidPassword123!', confirmation: 'ValidPassword123!', intent: 'setup',
  })) form.set(name, value);
  const result = await submit(form);
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.message, /Internal provider detail/);
});
