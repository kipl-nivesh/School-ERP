import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function load(path, imports) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function('require', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), 'Unexpected import: ' + name);
    return imports[name];
  }, exports);
  return exports;
}

const school = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const factor = '44444444-4444-4444-8444-444444444444';
const sampleTime = Math.floor(Date.now() / 1000);
const claims = (...pairs) => pairs.map(([method, timestamp]) => ({ method, timestamp }));
const evaluatePermission = (context, permission) => ({
  allowed: context.permissions.includes(permission) && (permission !== 'reports.export' || context.fresh),
});
const policy = load('src/lib/staff/accountant-export-mfa.ts', { '../auth/authorization': { evaluatePermission } });

test('fresh native evidence requires timestamped password and later TOTP', () => {
  const now = sampleTime * 1000;
  const valid = claims(['password', sampleTime - 50], ['totp', sampleTime - 10]);
  assert.equal(policy.accountantExportAuthentication(valid, now).freshMfa, true);
  for (const invalid of [
    claims(['password', sampleTime - 601], ['totp', sampleTime - 10]),
    claims(['password', sampleTime - 10], ['totp', sampleTime - 11]),
    claims(['password', sampleTime - 50], ['totp', sampleTime + 1]),
    claims(['password', sampleTime - 50], ['mfa', sampleTime - 10]),
    [{ method: 'password', timestamp: sampleTime - 50 }, 'totp'],
  ]) assert.equal(policy.accountantExportAuthentication(invalid, now).freshMfa, false);
});

function setup({ role = 'accountant', grants = ['fees.read','reports.read','reports.export'],
  factorStatus = 'verified', stale = false, verifyError = false, schoolSwitch = false, fresh = false } = {}) {
  const calls = [];
  let verified = fresh;
  const factorRow = { id: factor, status: factorStatus, factor_type: 'totp' };
  const { exportFinancialInvoices } = load('src/app/staff/financial-export-actions.ts', {
    '@/lib/auth/authorization': { evaluatePermission },
    '@/lib/services/attendance-fields': { validAttendanceDate: value => /^\d{4}-\d{2}-\d{2}$/.test(value) },
    '@/lib/staff/accountant-export-mfa': policy,
    '@/lib/staff/contracts': { isStaffUuid: value => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value) },
    '@/lib/staff/mfa-setup': { parseTotpSetup: () => ({ factorId: factor, qrDataUri: 'synthetic-qr', secret: 'synthetic-setup-key' }) },
    '@/lib/staff/server': {
      loadStaffResolution: async () => ({ kind: 'authorized', context: {
        schoolId: schoolSwitch && verified ? actor : school, profileId: actor, session: { id: session },
        activeRole: { role, assignmentId: 'fixture-membership' }, permissions: grants, fresh: verified,
        assignments: [{ id: 'fixture-membership', profileId: actor, role, permissions: grants }],
      } }),
      staffClient: async () => ({
        auth: {
          getClaims: async () => ({ data: { claims: { sub: actor, session_id: session,
            amr: claims(['password', sampleTime - (stale ? 601 : 30)]) } } }),
          mfa: {
            listFactors: async () => ({ data: { all: factorStatus ? [factorRow] : [],
              totp: factorStatus === 'verified' ? [factorRow] : [] } }),
            enroll: async () => { calls.push('enroll'); return { data: { id: factor } }; },
            challengeAndVerify: async () => {
              calls.push('verify');
              if (verifyError) return { error: { code: 'fixture_denied' } };
              verified = true;
              return { error: null };
            },
          },
        },
        rpc: async (name, args) => {
          assert.equal(name, 'export_school_finance_invoices');
          assert.deepEqual(args, { p_school: school, p_from: '2026-11-01', p_to: '2026-11-24' });
          calls.push('export');
          return { data: [{ number: '=unsafe', issued: '2026-11-01', due: '2026-11-24',
            status: 'unpaid', billed_paise: '100', paid_paise: '0', outstanding_paise: '100' }] };
        },
      }),
    },
  });
  const submit = (intent = 'prepare', factorId = factor) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ intent, school, from: '2026-11-01', to: '2026-11-24',
      factorId, code: '123456' })) form.set(key, value);
    return exportFinancialInvoices({}, form);
  };
  return { calls, submit };
}

test('existing factor is challenged and resumes the exact export after verification', async () => {
  const fixture = setup();
  assert.equal((await fixture.submit()).factorId, factor);
  assert.deepEqual(fixture.calls, []);
  assert.match((await fixture.submit('verify')).csv, /"'=unsafe"/);
  assert.deepEqual(fixture.calls, ['verify', 'export']);
});

test('first-time enrollment returns transient setup data without exporting', async () => {
  const fixture = setup({ factorStatus: null });
  const result = await fixture.submit();
  assert.equal(result.factorId, factor);
  assert.equal(result.qrDataUri, 'synthetic-qr');
  assert.equal(result.csv, undefined);
  assert.deepEqual(fixture.calls, ['enroll']);
});

test('unverified native factor must be verified before exporting', async () => {
  const fixture = setup({ factorStatus: 'unverified' });
  assert.ok((await fixture.submit('verify')).csv);
  assert.deepEqual(fixture.calls, ['verify', 'export']);
});

test('invalid code and foreign factor cannot export', async () => {
  const fixture = setup({ verifyError: true });
  assert.equal((await fixture.submit('verify')).factorId, factor);
  assert.equal((await fixture.submit('verify', actor)).csv, undefined);
  assert.deepEqual(fixture.calls, ['verify']);
});

test('stale password, wrong role and absent grant prevent native changes', async () => {
  for (const configuration of [{ stale: true }, { role: 'admin' }, { grants: ['fees.read','reports.read'] }]) {
    const fixture = setup(configuration);
    const result = await fixture.submit();
    assert.equal(result.csv, undefined);
    assert.equal(result.passwordRequired, configuration.stale ? true : undefined);
    assert.deepEqual(fixture.calls, []);
  }
});

test('fresh session exports directly, changed school after verification fails closed', async () => {
  const direct = setup({ fresh: true });
  assert.ok((await direct.submit()).csv);
  assert.deepEqual(direct.calls, ['export']);
  const switched = setup({ schoolSwitch: true });
  assert.equal((await switched.submit('verify')).csv, undefined);
  assert.deepEqual(switched.calls, ['verify']);
});
