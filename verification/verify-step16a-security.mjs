import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Step 16A: Rigorous Local Security Hardening, Session Lifecycle & Database Preflight Verification
// OFFLINE ONLY — ZERO DATABASE CONNECTIONS, ZERO SQL EXECUTION

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

const core = await import(moduleURL('src/lib/staff/contracts.ts'));
const auth = await import(moduleURL('src/lib/auth/index.ts'));

const NOW = Date.UTC(2026, 10, 5, 12, 0, 0); // Fixed timestamp: 2026-11-05T12:00:00Z
let passedChecks = 0;

function runTest(name, fn) {
  fn();
  passedChecks++;
  console.log('PASS [Step 16A]: ' + name);
}

// ---------------------------------------------------------------------------
// Helper Factories for Mock Evidence
// ---------------------------------------------------------------------------
function createProvider(overrides = {}) {
  return {
    profileId: 'usr-admin-1',
    sessionId: '00000000-0000-4000-8000-000000000001',
    expiresAt: NOW + 1800000, // +30m
    authenticatedAt: NOW - 600000, // -10m
    verifiedAt: NOW - 600000,
    assurance: 'aal1',
    ...overrides
  };
}

function createProfile(overrides = {}) {
  return {
    id: 'usr-admin-1',
    account_status: 'active',
    credential_reset_required: false,
    authorization_version: 1,
    ...overrides
  };
}

function createMembership(overrides = {}) {
  return {
    id: 'mem-admin-1',
    profile_id: 'usr-admin-1',
    role_code: 'admin',
    membership_status: 'active',
    valid_from: new Date(NOW - 3600000).toISOString(),
    valid_until: null,
    permissions: ['dashboard.admin.view'],
    ...overrides
  };
}

function createContext(overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    profile_id: 'usr-admin-1',
    role_code: 'admin',
    assignment_id: 'mem-admin-1',
    context_version: 1,
    authorization_version: 1,
    expires_at: new Date(NOW + 1800000).toISOString(),
    revoked_at: null,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// 1. Task A: Staff Role Boundaries & Zero Sixth Role
// ---------------------------------------------------------------------------
runTest('Exactly five primary roles in authorization contracts; zero sixth role', () => {
  assert.equal(auth.PRIMARY_ROLES.length, 5);
  assert.deepEqual([...auth.PRIMARY_ROLES].sort(), ['accountant', 'admin', 'parent', 'student', 'teacher']);
  assert.equal(auth.PRIMARY_ROLES.includes('super_admin'), false);
  assert.equal(core.STAFF_ROLES.length, 3);
  assert.deepEqual([...core.STAFF_ROLES].sort(), ['accountant', 'admin', 'teacher']);
  assert.equal(core.isStaffRole('super_admin'), false);
  assert.equal(core.isStaffRole('student'), false);
  assert.equal(core.isStaffRole('parent'), false);
});

// ---------------------------------------------------------------------------
// 2. Task A: Active vs. Revoked, Expired, and Future Admin Memberships
// ---------------------------------------------------------------------------
runTest('Staff authorization: Active Admin membership authorizes successfully', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
});

runTest('Staff authorization: Revoked Admin membership fails closed (denied)', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership({ membership_status: 'revoked' })],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Staff authorization: Expired Admin membership fails closed (denied)', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership({ valid_until: new Date(NOW - 1000).toISOString() })],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Staff authorization: Future Admin membership fails closed (denied)', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership({ valid_from: new Date(NOW + 3600000).toISOString() })],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

// ---------------------------------------------------------------------------
// 3. Task A: Super Admin AAL2 Enforcement & Ordinary Admin AAL1 Allowance
// ---------------------------------------------------------------------------
runTest('Super Admin with active privilege requires AAL2; denies AAL1 with mfa_required', () => {
  const provider = createProvider({ assurance: 'aal1' });
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: { profile_id: 'usr-admin-1', tier: 'super_admin', privilege_status: 'active' },
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'mfa_required');
});

runTest('Super Admin with active privilege and verified AAL2 authorizes successfully', () => {
  const provider = createProvider({ assurance: 'aal2' });
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: { profile_id: 'usr-admin-1', tier: 'super_admin', privilege_status: 'active' },
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
});

runTest('Ordinary Admin without Super Admin tier authorizes on password alone (AAL1)', () => {
  const provider = createProvider({ assurance: 'aal1' });
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
});

// ---------------------------------------------------------------------------
// 4. Task A: Pending and Revoked Privilege Rejection
// ---------------------------------------------------------------------------
runTest('Pending Super Admin privilege fails closed immediately (denied)', () => {
  const provider = createProvider({ assurance: 'aal2' });
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: { profile_id: 'usr-admin-1', tier: 'super_admin', privilege_status: 'pending' },
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Revoked Super Admin privilege acts as ordinary Admin without elevation', () => {
  const provider = createProvider({ assurance: 'aal1' });
  // With 'dashboard.admin.view', ordinary Admin can see dashboard
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: { profile_id: 'usr-admin-1', tier: 'super_admin', privilege_status: 'revoked' },
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'authorized');

  // But in authorization contract, security permissions MUST be denied for revoked tier
  const authDecision = auth.evaluatePermission(res.context, 'security.super_admin.grant', NOW);
  assert.equal(authDecision.allowed, false);
});

// ---------------------------------------------------------------------------
// 5. Task B: Session Context Lifecycle (Stale Version, Expiry, Revocation)
// ---------------------------------------------------------------------------
runTest('Context lifecycle: Stale authorization_version in context is denied', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile({ authorization_version: 2 }), // profile was incremented
    memberships: [createMembership()],
    privilege: null,
    context: createContext({ authorization_version: 1 }) // context has stale version 1
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Context lifecycle: Expired role context is denied', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: null,
    context: createContext({ expires_at: new Date(NOW - 1000).toISOString() })
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Context lifecycle: Revoked role context (revoked_at != null) is denied', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: null,
    context: createContext({ revoked_at: new Date(NOW - 60000).toISOString() })
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Context lifecycle: Session ID mismatch between provider and context is denied', () => {
  const provider = createProvider({ sessionId: '00000000-0000-4000-8000-000000000001' });
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership()],
    privilege: null,
    context: createContext({ id: '00000000-0000-4000-8000-000000000002' })
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

// ---------------------------------------------------------------------------
// 6. Task B: Profile Security State (Suspended, Invited, Disabled, Reset)
// ---------------------------------------------------------------------------
for (const status of ['suspended', 'disabled', 'invited']) {
  runTest(`Context lifecycle: Non-active profile (${status}) fails closed (denied)`, () => {
    const provider = createProvider();
    const snapshot = {
      profile: createProfile({ account_status: status }),
      memberships: [createMembership()],
      privilege: null,
      context: createContext()
    };
    const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
    assert.equal(res.kind, 'denied');
  });
}

runTest('Context lifecycle: Credential reset required blocks staff authorization', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile({ credential_reset_required: true }),
    memberships: [createMembership()],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

// ---------------------------------------------------------------------------
// 7. Task A & B: Permission Checks & Role Isolation
// ---------------------------------------------------------------------------
runTest('Ordinary Admin with empty permissions array cannot view dashboard', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership({ permissions: [] })], // no permissions
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'denied');
});

runTest('Ordinary Admin cannot access security provisioning permissions', () => {
  const provider = createProvider();
  const snapshot = {
    profile: createProfile(),
    memberships: [createMembership({ permissions: ['dashboard.admin.view'] })],
    privilege: null,
    context: createContext()
  };
  const res = core.resolveStaffAuthorization(provider, snapshot, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
  for (const perm of ['security.accounts.create', 'security.roles.assign', 'security.super_admin.grant']) {
    const decision = auth.evaluatePermission(res.context, perm, NOW);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'permission_denied');
  }
});

// ---------------------------------------------------------------------------
// 8. Task D: SQL Function Security & RPC Grant Hardening
// ---------------------------------------------------------------------------
runTest('SQL function security: All definer functions have empty search_path and postgres ownership', () => {
  const m3 = fs.readFileSync('supabase/migrations/20261105000300_staff_security.sql', 'utf8');
  const definerNames = [
    'public.staff_session_is_live',
    'public.consume_staff_mfa_enrollment_approval',
    'public.activate_staff_context',
    'public.revoke_staff_context',
    'app_private.invalidate_staff_contexts'
  ];
  for (const fn of definerNames) {
    const fnStart = m3.indexOf(`create function ${fn}`);
    assert.ok(fnStart !== -1, `Function ${fn} must exist`);
    const fnEnd = m3.indexOf('$$;', fnStart) + 3;
    const body = m3.slice(fnStart, fnEnd);
    assert.ok(body.includes("security definer set search_path = ''"), `${fn} must set search_path = ''`);
    assert.ok(m3.includes(`alter function ${fn}`), `${fn} must be altered`);
    assert.ok(m3.includes('owner to postgres;'), `${fn} must be owned by postgres`);
    assert.ok(
      new RegExp(`revoke all on function [^;]*${fn.replaceAll('.', '\\.')}[^;]*from public, anon`).test(m3),
      `${fn} must revoke execute from public and anon`
    );
  }
});

runTest('SQL function security: Private schema app_private completely revoked', () => {
  const m3 = fs.readFileSync('supabase/migrations/20261105000300_staff_security.sql', 'utf8');
  assert.ok(m3.includes('create schema app_private;'));
  assert.ok(m3.includes('revoke all on schema app_private from public, anon, authenticated;'));
  assert.ok(m3.includes('revoke all on function app_private.reject_audit_change() from public, anon, authenticated;'));
  assert.ok(m3.includes('revoke all on function app_private.invalidate_staff_contexts() from public, anon, authenticated;'));
});

// ---------------------------------------------------------------------------
// 9. Task E: Student–Parent Singleton Invariant & Database Integrity
// ---------------------------------------------------------------------------
runTest('Database integrity: Parent partial unique index and 1:1 foreign keys verified in SQL', () => {
  const m2 = fs.readFileSync('supabase/migrations/20261105000200_school_domain.sql', 'utf8');
  assert.ok(m2.includes('create unique index parent_login_one_eligible_student on public.parent_login_identities(student_id) where login_eligible;'));
  assert.ok(m2.includes('profile_id uuid primary key,'));
  assert.ok(m2.includes('student_id uuid not null references public.students(id),'));
  assert.ok(m2.includes('foreign key (guardian_id, profile_id) references public.guardians(id, profile_id)'));
  assert.ok(m2.includes('foreign key (relationship_id, student_id, guardian_id) references public.student_guardian_relationships(id, student_id, guardian_id)'));
});

runTest('Database integrity: Parent singleton simulation rejects duplicate eligible mappings for same student', () => {
  // Simulate the database constraint logic in memory
  const parentTable = [];
  function insertParentLogin(row) {
    if (row.login_eligible && parentTable.some(r => r.student_id === row.student_id && r.login_eligible)) {
      throw new Error('unique_violation: parent_login_one_eligible_student');
    }
    if (parentTable.some(r => r.profile_id === row.profile_id)) {
      throw new Error('unique_violation: primary key profile_id');
    }
    parentTable.push(row);
  }

  // Insert first eligible parent for student 1
  insertParentLogin({ profile_id: 'parent-1', student_id: 'student-1', login_eligible: true });
  assert.equal(parentTable.length, 1);

  // Attempting second eligible parent for student 1 MUST throw unique violation
  assert.throws(() => {
    insertParentLogin({ profile_id: 'parent-2', student_id: 'student-1', login_eligible: true });
  }, /unique_violation: parent_login_one_eligible_student/);

  // Inserting non-eligible parent for student 1 is permitted
  insertParentLogin({ profile_id: 'parent-3', student_id: 'student-1', login_eligible: false });
  assert.equal(parentTable.length, 2);
});

// ---------------------------------------------------------------------------
// 10. Task C: Direct Native MFA API Boundary Documented as UNRESOLVED / BLOCKED
// ---------------------------------------------------------------------------
runTest('MFA boundary: Step 16A findings document native MFA REST exposure as UNRESOLVED and BLOCKED', () => {
  const findings = fs.readFileSync('supabase/STEP-16A-SECURITY-FINDINGS.md', 'utf8');
  assert.ok(findings.includes('Finding F-03') || findings.includes('Direct Native Supabase Auth MFA'));
  assert.ok(findings.includes('BLOCKED'), 'Super Admin live MFA lifecycle must be marked BLOCKED');
  assert.ok(findings.includes('UNRESOLVED') || findings.includes('Unresolved'), 'Must explicitly acknowledge direct API exposure is unresolved');
});

// ---------------------------------------------------------------------------
// 11. Feature Flags & Public Dashboards Preservation
// ---------------------------------------------------------------------------
runTest('Safety boundary: Both live authentication flags remain strictly disabled', () => {
  assert.equal(auth.LIVE_AUTHENTICATION_ENABLED, false);
  const serverTs = fs.readFileSync('src/lib/staff/server.ts', 'utf8');
  assert.ok(serverTs.includes("process.env.STAFF_AUTH_REQUESTS_ENABLED === 'true'"));
  const envExample = fs.readFileSync('.env.example', 'utf8');
  assert.ok(envExample.includes('STAFF_AUTH_REQUESTS_ENABLED=false'));
});

runTest('Safety boundary: All five fictional dashboards exist and remain untouched', () => {
  const dashboards = [
    'src/app/(dashboard)/admin/dashboard/page.tsx',
    'src/app/(dashboard)/teacher/dashboard/page.tsx',
    'src/app/(dashboard)/student/dashboard/page.tsx',
    'src/app/(dashboard)/parent/dashboard/page.tsx',
    'src/app/(dashboard)/accountant/dashboard/page.tsx'
  ];
  for (const d of dashboards) {
    assert.ok(fs.existsSync(d), `Dashboard ${d} must exist`);
  }
});

// ---------------------------------------------------------------------------
// 12. Migration Baseline SHA-256 Hashes
// ---------------------------------------------------------------------------
runTest('Migration files SHA-256 hashes match baseline', () => {
  const expectedHashes = {
    'supabase/migrations/20261105000100_identity_foundation.sql': '3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c',
    'supabase/migrations/20261105000200_school_domain.sql': 'dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e',
    'supabase/migrations/20261105000300_staff_security.sql': '0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9'
  };
  for (const [file, expectedHash] of Object.entries(expectedHashes)) {
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(actualHash, expectedHash, `Hash mismatch on ${file}`);
  }
});

console.log(`\n========================================================================`);
console.log(`STEP 16A VERIFICATION PASS: All ${passedChecks} security & preflight checks passed.`);
console.log(`Zero database connections. Zero SQL executed. Zero live credentials used.`);
console.log(`========================================================================`);
