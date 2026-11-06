import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// In-memory module loader follows existing verification convention. No generated files.
const urls = new Map();
function moduleURL(filename) {
  const resolved = path.resolve(filename);
  if (urls.has(resolved)) return urls.get(resolved);
  let js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  js = js.replace(/(from\s*|import\s*)(['"])(\.[^'"]+)\2/g, (_, prefix, quote, specifier) => {
    let dependency = path.resolve(path.dirname(resolved), specifier);
    if (!path.extname(dependency)) dependency += '.ts';
    return prefix + JSON.stringify(moduleURL(dependency));
  });
  const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  urls.set(resolved, url);
  return url;
}

const auth = await import(moduleURL('src/lib/auth/index.ts'));

const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);
let passedChecks = 0;
function test(name, run) {
  run();
  passedChecks++;
  console.log('PASS [School Admin Auth]: ' + name);
}

function policyInput(role = 'admin', options = {}) {
  const profileId = options.profileId || 'principal-usr-1';
  const assignment = {
    id: 'mem-' + role,
    profileId,
    role,
    status: 'active',
    validFrom: NOW - 3600000,
    validUntil: null,
    permissions: [...auth.getPermissionCeiling(role)],
  };
  const assurance = options.assurance || (role === 'admin' ? 'aal2' : 'aal1');
  return {
    source: 'verified-server-session',
    profileId,
    accountStatus: options.accountStatus || 'active',
    credentialResetRequired: options.credentialResetRequired ?? false,
    authorizationVersion: 2,
    currentAuthorizationVersion: 2,
    session: {
      id: 'session-context-1',
      profileId,
      verifiedAt: NOW - 1000,
      authenticatedAt: NOW - 60000,
      expiresAt: NOW + 3600000,
      revoked: false,
      assurance,
      reauthenticatedAt: options.reauthenticatedAt !== undefined ? options.reauthenticatedAt : NOW - 5000,
      ...options.session,
    },
    activeRole: {
      sessionId: 'session-context-1',
      profileId,
      role,
      assignmentId: assignment.id,
      version: 1,
      currentVersion: 1,
      expiresAt: NOW + 1800000,
      revoked: false,
      ...options.activeRole,
    },
    assignments: options.assignments || [assignment],
  };
}

const checkPerm = (input, p) => auth.evaluatePermission(input, p, NOW);
const checkDenied = (decision, reason) => {
  assert.equal(decision.allowed, false);
  if (reason) assert.equal(decision.reason, reason);
};
const checkAllowed = decision => assert.deepEqual(decision, { allowed: true });

// 1. Role Catalog & Super Admin Elimination
test('Exactly five primary application roles; Super Admin is completely removed', () => {
  assert.deepEqual(auth.PRIMARY_ROLES, ['admin', 'teacher', 'student', 'parent', 'accountant']);
  assert.equal(auth.isPrimaryRole('super_admin'), false);
  assert.equal(auth.loginMethodForRole('super_admin'), null);
});

// 2. Staff Login Methods & Mandatory MFA
test('Staff roles use email/password; School Admin requires MFA', () => {
  assert.equal(auth.loginMethodForRole('admin'), 'email_password');
  assert.equal(auth.loginMethodForRole('teacher'), 'email_password');
  assert.equal(auth.loginMethodForRole('accountant'), 'email_password');
  assert.equal(auth.loginRequiresMfa('admin'), true);
  assert.equal(auth.loginRequiresMfa('teacher'), false);
  assert.equal(auth.loginRequiresMfa('accountant'), false);
});

// 3. School Admin Authorization & MFA Enforcement
test('School Admin with AAL1 only is rejected with mfa_required', () => {
  const adminAal1 = policyInput('admin', { assurance: 'aal1' });
  checkDenied(checkPerm(adminAal1, 'dashboard.admin.view'), 'mfa_required');
  checkDenied(checkPerm(adminAal1, 'security.accounts.create'), 'mfa_required');
});

test('School Admin with verified AAL2 MFA is authorized for dashboard and administrative actions', () => {
  const adminAal2 = policyInput('admin', { assurance: 'aal2' });
  checkAllowed(checkPerm(adminAal2, 'dashboard.admin.view'));
  checkAllowed(checkPerm(adminAal2, 'security.accounts.create'));
  checkAllowed(checkPerm(adminAal2, 'security.roles.assign'));
  checkAllowed(checkPerm(adminAal2, 'security.credentials.reset'));
  checkAllowed(checkPerm(adminAal2, 'school.settings.write'));
});

// 4. Role Isolation & Non-Admin Security Prohibition
test('Teacher, accountant, student, parent cannot manage security accounts or roles', () => {
  for (const role of ['teacher', 'accountant', 'student', 'parent']) {
    const input = policyInput(role);
    checkDenied(checkPerm(input, 'security.accounts.create'), 'permission_denied');
    checkDenied(checkPerm(input, 'security.roles.assign'), 'permission_denied');
    checkDenied(checkPerm(input, 'security.accounts.suspend'), 'permission_denied');
  }
});

test('Forged security permissions in non-admin assignment fail closed against ceiling', () => {
  const forgedTeacher = policyInput('teacher');
  forgedTeacher.assignments[0].permissions.push('security.accounts.create', 'security.roles.assign');
  checkDenied(checkPerm(forgedTeacher, 'security.accounts.create'), 'permission_denied');
  checkDenied(checkPerm(forgedTeacher, 'security.roles.assign'), 'permission_denied');
});

// 5. Sensitive Operations Reauthentication
test('School Admin sensitive operations require fresh reauthentication (< 10 minutes)', () => {
  const freshAdmin = policyInput('admin', { reauthenticatedAt: NOW - 60000 }); // 1 min ago
  checkAllowed(checkPerm(freshAdmin, 'security.accounts.create'));

  const staleAdmin = policyInput('admin', { reauthenticatedAt: NOW - 600001 }); // 10m 1s ago
  checkDenied(checkPerm(staleAdmin, 'security.accounts.create'), 'reauthentication_required');

  const unauthenticated = policyInput('admin', { reauthenticatedAt: null });
  checkDenied(checkPerm(unauthenticated, 'security.accounts.create'), 'reauthentication_required');
});

// 6. Security Changes and Last School Admin Protection
test('Security change rejects self-targeting, invalid roles, and suspending last School Admin', () => {
  const admin = policyInput('admin');
  const target = {
    profileId: 'target-staff-usr',
    role: 'teacher',
    isAdmin: false,
    activeAdminCount: 3,
    independentApproverProfileId: null,
  };

  // Valid teacher role assignment allowed
  checkAllowed(auth.evaluateSecurityChange(admin, { permission: 'security.roles.assign', target }, NOW));

  // Self-targeting denied
  checkDenied(auth.evaluateSecurityChange(admin, {
    permission: 'security.roles.assign',
    target: { ...target, profileId: admin.profileId },
  }, NOW), 'invalid_target');

  // Unknown role denied
  checkDenied(auth.evaluateSecurityChange(admin, {
    permission: 'security.roles.assign',
    target: { ...target, role: 'super_admin' },
  }, NOW), 'invalid_target');

  // Last School Admin protection
  const lastAdminTarget = {
    profileId: 'target-other-admin',
    role: 'admin',
    isAdmin: true,
    activeAdminCount: 1,
    independentApproverProfileId: null,
  };
  checkDenied(auth.evaluateSecurityChange(admin, {
    permission: 'security.accounts.suspend',
    target: lastAdminTarget,
  }, NOW), 'last_admin');

  checkDenied(auth.evaluateSecurityChange(admin, {
    permission: 'security.roles.revoke',
    target: lastAdminTarget,
  }, NOW), 'last_admin');

  // Multiple admins: suspension allowed
  const nonLastAdminTarget = { ...lastAdminTarget, activeAdminCount: 2 };
  checkAllowed(auth.evaluateSecurityChange(admin, {
    permission: 'security.accounts.suspend',
    target: nonLastAdminTarget,
  }, NOW));
});

// 7. Account Suspension, Stale Authorization, and Session Fail-Closed
test('Suspended or inactive accounts fail closed immediately', () => {
  for (const status of ['suspended', 'disabled', 'invited']) {
    const input = policyInput('admin', { accountStatus: status });
    checkDenied(checkPerm(input, 'dashboard.admin.view'), 'inactive_account');
  }
});

test('Credential reset pending blocks all access', () => {
  const input = policyInput('admin', { credentialResetRequired: true });
  checkDenied(checkPerm(input, 'dashboard.admin.view'), 'reset_required');
});

test('Stale authorization version or expired session fails closed', () => {
  const stale = policyInput('admin');
  stale.authorizationVersion = 1; // current is 2
  checkDenied(checkPerm(stale, 'dashboard.admin.view'), 'stale_authorization');

  const expired = policyInput('admin');
  expired.session.expiresAt = NOW - 1000;
  checkDenied(checkPerm(expired, 'dashboard.admin.view'), 'expired_session');
});

// 8. Financial Immutability & Record Integrity
test('School Admin cannot mutate settled financial records; corrections require verified integrity', () => {
  const admin = policyInput('admin');
  checkDenied(auth.evaluateRecordMutation(admin, {
    permission: 'payments.record',
    kind: 'financial',
    state: 'settled',
    operation: 'delete',
    integrityVerified: true,
  }, NOW), 'immutable_record');

  checkDenied(auth.evaluateRecordMutation(admin, {
    permission: 'fees.write',
    kind: 'financial',
    state: 'settled',
    operation: 'append_correction',
    integrityVerified: false,
  }, NOW), 'integrity_required');

  checkAllowed(auth.evaluateRecordMutation(admin, {
    permission: 'fees.write',
    kind: 'financial',
    state: 'settled',
    operation: 'append_correction',
    integrityVerified: true,
  }, NOW));
});

// 9. Static Migration 4 Checks
test('Migration 4 statically eliminates super_admin and establishes School Admin AAL2', () => {
  const migrationPath = 'supabase/migrations/20261105000400_school_admin_simplification.sql';
  assert.ok(fs.existsSync(migrationPath), 'Migration 4 file must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(!sql.includes('security.super_admin.grant'), 'Migration 4 must not contain super_admin.grant');
  assert.ok(!sql.includes('security.super_admin.revoke'), 'Migration 4 must not contain super_admin.revoke');
  assert.ok(sql.includes("requested_role = 'admin' and auth.jwt()->>'aal' is distinct from 'aal2'"), 'Must enforce AAL2 for admin');
  assert.ok(sql.includes('drop trigger if exists tier_context_invalidation on public.admin_privileges'), 'Must detach tier trigger non-destructively');
  assert.ok(!sql.includes('drop table public.admin_privileges'), 'Must not drop admin_privileges destructively');
});

console.log(`PASS: All ${passedChecks} School Admin authorization tests passed successfully.`);
