import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createServerClient } from '@supabase/ssr';
import ts from 'typescript';

function load(file, dependencies, fetch = globalThis.fetch) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const compiled = { exports: {} };
  new Function('require', 'exports', 'fetch', 'process', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), 'Unexpected dependency ' + name);
    return dependencies[name];
  }, compiled.exports, fetch, { env: { NODE_ENV: 'production' } });
  return compiled.exports;
}

const url = 'https://abcdefghijklmnopqrst.supabase.co';
const publishableKey = 'sb_publishable_fixture';
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', factors: [] };
const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = jwtPart({ alg: 'HS256' }) + '.' + jwtPart({ exp: Math.floor(Date.now() / 1000) + 3600 }) + '.Zml4dHVyZQ';

function factory(createClient, fetch) {
  const jar = new Map();
  const writes = [];
  const { createServerSupabaseClient } = load('src/lib/supabase/server.ts', {
    'server-only': {},
    '@supabase/ssr': { createServerClient: createClient },
    'next/headers': { cookies: async () => ({
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      set: (name, value, options) => { jar.set(name, value); writes.push(options); },
    }) },
    './config': { requireSupabasePublicConfiguration: () => ({ url, publishableKey }) },
  }, fetch);
  return { createServerSupabaseClient, writes };
}

test('installed SSR SDK sends the API key and persisted user JWT on enrollment', async () => {
  const { createServerSupabaseClient, writes } = factory(createServerClient, async (input, init) => {
    const request = new Request(input, init);
    const target = new URL(request.url);
    assert.equal(target.origin, url);
    assert.equal(target.searchParams.has('apikey'), false);
    assert.equal(request.headers.get('apikey'), publishableKey);
    assert.equal(request.method, 'POST');
    if (target.pathname === '/auth/v1/token') {
      return Response.json({ access_token: accessToken, refresh_token: 'fixture', expires_in: 3600, user });
    }
    assert.equal(target.pathname, '/auth/v1/factors');
    assert.equal(request.headers.get('authorization'), 'Bearer ' + accessToken);
    assert.equal((await request.json()).factor_type, 'totp');
    return Response.json({ id: 'fixture-factor', type: 'totp', totp: {} });
  });
  const options = { cookieWrites: 'allowed', httpOnlyCookies: true };
  const login = await createServerSupabaseClient(options);
  assert.equal((await login.auth.signInWithPassword({ email: 'staff@example.invalid', password: 'fixture' })).error, null);
  assert.ok(writes.length > 0);
  assert.ok(writes.every(option => option.httpOnly && option.secure && option.sameSite === 'lax'));
  const enrollment = await createServerSupabaseClient(options);
  assert.equal((await enrollment.auth.mfa.enroll({ factorType: 'totp' })).error, null);
});

test('server transport preserves Request inputs and stops cross-origin credential forwarding', async () => {
  let transport;
  const requests = [];
  const { createServerSupabaseClient } = factory((_url, _key, options) => {
    transport = options.global.fetch;
  }, async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return Response.json({});
  });
  await createServerSupabaseClient();

  const headers = new Headers({ apikey: publishableKey, authorization: 'Bearer fixture', 'x-fixture': 'kept' });
  await transport(new Request(url + '/auth/v1/factors', { method: 'POST', headers, body: 'fixture-body' }), {
    credentials: 'omit',
  });
  await transport(new URL(url + '/auth/v1/factors'), { headers, redirect: 'follow' });
  await transport(url + '/auth/v1/factors', { headers });
  for (const request of requests) {
    assert.deepEqual([...request.headers], [...new Headers(request.method === 'POST'
      ? [...headers, ['content-type', 'text/plain;charset=UTF-8']] : headers)]);
    assert.equal(request.redirect, 'error');
    assert.equal(request.cache, 'no-store');
    assert.equal(new URL(request.url).searchParams.has('apikey'), false);
  }
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].credentials, 'omit');
  assert.equal(await requests[0].text(), 'fixture-body');
  assert.throws(() => transport('https://unrelated.invalid/', { headers }), /Unexpected Supabase request origin/);
  assert.throws(() => transport(new Request('https://unrelated.invalid/', { headers })), /Unexpected Supabase request origin/);
  assert.equal(requests.length, 3);
});

const setup = load('src/lib/staff/mfa-setup.ts', {
  './contracts': { isStaffUuid: value => value === user.id },
});
const qr = '<svg width="30" height="30" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
  '<rect x="12" y="12" width="3" height="3" style="fill:black;stroke:none"/></svg>';
const providerSvg = '<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n' + qr;
const factor = { id: user.id, type: 'totp', totp: { secret: 'ABCDEFGHIJKLMNOP', qr_code: 'data:image/svg+xml;utf-8,' + providerSvg } };

test('normalizes the SDK-wrapped SVGo document that failed the old SVG root check', async () => {
  assert.equal(providerSvg.trimStart().startsWith('<svg'), false);
  const state = await enrollment({ data: factor }).submit();
  assert.equal(state.phase, 'mfa');
  assert.equal(state.factorId, factor.id);
  assert.equal(state.secret, factor.totp.secret);
  assert.equal(Buffer.from(state.qrDataUri.split(',')[1], 'base64').toString(), qr);
  assert.equal('uri' in state, false);
});

test('accepts raw, percent-encoded and base64 SVG and rejects active or malformed content', () => {
  const canonical = 'data:image/svg+xml;base64,' + Buffer.from(qr).toString('base64');
  for (const value of [providerSvg, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(providerSvg),
    'data:image/svg+xml;base64,' + Buffer.from(providerSvg).toString('base64'), canonical]) {
    assert.equal(setup.normalizeTotpQr(value), canonical);
  }
  for (const value of [
    qr.replace('</svg>', '<script>alert(1)</script></svg>'),
    qr.replace('<rect ', '<rect onload="alert(1)" '),
    qr.replace('<rect ', '<rect href="https://example.invalid" '),
    qr.replace('fill:black', 'fill:url(https://example.invalid)'),
    '<!DOCTYPE svg>' + qr,
    '<?xml-stylesheet href="https://example.invalid"?>' + qr,
    qr.replace('</svg>', ''),
    'data:text/html,' + qr,
    'data:image/svg+xml;base64,AAAA===',
  ]) assert.equal(setup.normalizeTotpQr(value), undefined);
  assert.equal(setup.parseTotpSetup({ ...factor, id: 'invalid' }), undefined);
  assert.equal(setup.parseTotpSetup({ ...factor, type: 'phone' }), undefined);
  assert.equal(setup.parseTotpSetup({ ...factor, totp: { ...factor.totp, secret: 'invalid' } }), undefined);
});

function enrollment({ resolution = 'mfa_required', error, data, verifiedFactor = false } = {}) {
  let enrollCalls = 0;
  const { enrollStaffMfa } = load('src/app/login/staff/actions.ts', {
    'next/navigation': {},
    '@/lib/supabase/config': {},
    '@/lib/staff/contracts': { isStaffRole: role => role === 'admin' },
    '@/lib/staff/mfa-setup': setup,
    '@/lib/staff/server': {
      staffRequestsEnabled: () => true,
      loadStaffResolution: async () => ({ kind: resolution }),
      staffClient: async writable => {
        assert.equal(writable, true);
        return { auth: { mfa: {
          listFactors: async () => ({
            data: { all: [], totp: verifiedFactor ? [{ id: 'fixture-factor', status: 'verified' }] : [] },
          }),
          enroll: async () => { enrollCalls++; return { error, data }; },
        } } };
      },
    },
  });
  const form = new FormData();
  form.set('role', 'admin');
  return { submit: () => enrollStaffMfa({ phase: 'mfa', message: '' }, form), calls: () => enrollCalls };
}

test('enrollment gateway errors retain the setup screen and log only allowlisted details', async t => {
  const warn = t.mock.method(console, 'warn', () => {});
  const fixture = enrollment({ error: { code: 'UNAUTHORIZED_MISSING_API_KEY', message: 'private fixture detail' } });
  const state = await fixture.submit();
  assert.equal(state.phase, 'mfa');
  assert.equal(state.mfaError, true);
  assert.equal(state.factorId, undefined);
  assert.match(state.message, /Try again/);
  assert.deepEqual(warn.mock.calls[0].arguments, ['Staff MFA setup failed', {
    stage: 'enroll', code: 'UNAUTHORIZED_MISSING_API_KEY',
  }]);
  await enrollment({ error: { code: 'sensitive-fixture', message: 'private fixture detail' } }).submit();
  assert.deepEqual(warn.mock.calls[1].arguments[1], { stage: 'enroll', code: 'unknown' });
});

test('expired sessions request sign-in and unconfirmed sessions cannot enroll', async t => {
  t.mock.method(console, 'warn', () => {});
  const fixtures = [
    enrollment({ resolution: 'denied' }),
    enrollment({ error: { code: 'session_expired' } }),
    enrollment({ error: { name: 'AuthSessionMissingError' } }),
  ];
  for (const fixture of fixtures) {
    const state = await fixture.submit();
    assert.equal(state.phase, 'error');
    assert.match(state.message, /Sign in again/);
  }
  assert.equal(fixtures[0].calls(), 0);
});

test('a factor verified since sign-in is offered for challenge without enrolling a new one', async () => {
  const fixture = enrollment({ verifiedFactor: true });
  const state = await fixture.submit();
  assert.equal(state.phase, 'mfa');
  assert.equal(state.factorId, 'fixture-factor');
  assert.equal(fixture.calls(), 0);
});
