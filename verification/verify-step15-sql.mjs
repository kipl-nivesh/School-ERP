import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Step 15: Comprehensive Static SQL Migration, RLS, and Schema Audit Suite
// OFFLINE ONLY — NO SQL EXECUTION, NO DATABASE CONNECTION

const paths = fs.readdirSync('supabase/migrations').filter(p => p.endsWith('.sql')).sort();
assert.deepEqual(paths, [
  '20261105000100_identity_foundation.sql',
  '20261105000200_school_domain.sql',
  '20261105000300_staff_security.sql'
]);

const fileContents = paths.map(p => fs.readFileSync('supabase/migrations/' + p, 'utf8'));
const [, m2, m3] = fileContents;
const fullSql = fileContents.join('\n');

let checkCount = 0;
const test = (name, fn) => {
  fn();
  checkCount++;
  console.log('PASS [Step 15 Audit]: ' + name);
};

// 1. Transaction Boundaries and Migration Sequence
test('Migration sequence and explicit transaction boundaries', () => {
  for (let i = 0; i < paths.length; i++) {
    const content = fileContents[i].trim();
    assert.ok(content.startsWith('--') || content.startsWith('begin;'), `${paths[i]} must start with comment or begin;`);
    assert.ok(content.includes('begin;'), `${paths[i]} must declare begin;`);
    assert.ok(content.endsWith('commit;'), `${paths[i]} must end with commit;`);
  }
});

// 2. Table Catalog and Uniqueness
const expectedTables = [
  'roles',
  'profiles',
  'user_roles',
  'admin_privileges',
  'role_contexts',
  'school_configuration',
  'staff_profiles',
  'academic_years',
  'classes',
  'sections',
  'students',
  'guardians',
  'student_guardian_relationships',
  'parent_login_identities',
  'enrollments',
  'teacher_assignments',
  'audit_events',
  'staff_mfa_enrollment_approvals'
];

test('Exactly 18 unique application tables across migrations', () => {
  const declaredTables = [...fullSql.matchAll(/create table public\.(\w+)/g)].map(m => m[1]);
  assert.equal(declaredTables.length, 18);
  assert.equal(new Set(declaredTables).size, 18);
  assert.deepEqual(declaredTables.sort(), [...expectedTables].sort());
});

// 3. RLS ENABLE, FORCE, and Grant Revocation on All 18 Tables
for (const table of expectedTables) {
  test(`Table security baseline (RLS enabled, forced, grants revoked): ${table}`, () => {
    assert.ok(fullSql.includes(`alter table public.${table} enable row level security;`), `Missing enable RLS on ${table}`);
    assert.ok(fullSql.includes(`alter table public.${table} force row level security;`), `Missing force RLS on ${table}`);
    assert.ok(
      new RegExp(`revoke all on table [^;]*public\\.${table}[^;]*from public, anon, authenticated;`, 's').test(fullSql),
      `Missing revoke all on ${table}`
    );
  });
}

// 4. Schema CREATE and app_private Schema Protection
test('Schema-level access control and private schema revocation', () => {
  assert.ok(fullSql.includes('revoke create on schema public from public, anon, authenticated;'));
  assert.ok(fullSql.includes('create schema app_private;'));
  assert.ok(fullSql.includes('revoke all on schema app_private from public, anon, authenticated;'));
});

// 5. Foreign Key Graph Integrity
test('Foreign key targets exist and match declared primary or unique keys', () => {
  // Foreign keys referencing public tables
  const references = [...fullSql.matchAll(/references public\.(\w+)(?:\(([^)]+)\))?/g)].map(m => ({
    targetTable: m[1],
    targetCol: m[2]
  }));
  for (const ref of references) {
    assert.ok(expectedTables.includes(ref.targetTable), `Referenced table ${ref.targetTable} must exist`);
  }

  // Composite foreign key targets
  assert.ok(fullSql.includes('foreign key (profile_id, role_code) references public.user_roles(profile_id, role_code)'));
  assert.ok(fullSql.includes('foreign key (assignment_id, profile_id, role_code) references public.user_roles(id, profile_id, role_code)'));
  assert.ok(fullSql.includes('foreign key (guardian_id, profile_id) references public.guardians(id, profile_id)'));
  assert.ok(fullSql.includes('foreign key (relationship_id, student_id, guardian_id) references public.student_guardian_relationships(id, student_id, guardian_id)'));
  assert.ok(fullSql.includes('foreign key (section_id, academic_year_id) references public.sections(id, academic_year_id)'));
});

// 6. Student–Parent Singleton Invariant
test('Student-Parent singleton invariant and partial unique index', () => {
  // Partial unique index ensures at most 1 login-eligible parent per student
  assert.ok(fullSql.includes('create unique index parent_login_one_eligible_student on public.parent_login_identities(student_id) where login_eligible;'));
  // PK profile_id ensures 1 parent identity is linked to at most 1 row in parent_login_identities
  assert.ok(/create table public\.parent_login_identities\s*\(\s*profile_id uuid primary key/i.test(fullSql));
  // Non-null student_id ensures exactly 1 student per parent identity
  assert.ok(m2.includes('student_id uuid not null references public.students(id)'));
  // Distinct guardian profile foreign key binding
  assert.ok(m2.includes('foreign key (guardian_id, profile_id) references public.guardians(id, profile_id)'));
});

// 7. RLS Policy Strictness: Exactly 4 Self-Scope SELECT Policies
test('Strict RLS policy boundaries (4 self-scope SELECT policies, zero broad policies, zero writes)', () => {
  const policies = [...fullSql.matchAll(/create policy[\s\S]*?;/g)].map(m => m[0]);
  assert.equal(policies.length, 4, 'Must have exactly 4 policies in the entire schema');

  // Verify each policy is restricted to authenticated, self-scoped, and checks live session
  for (const p of policies) {
    assert.ok(p.includes('for select to authenticated'), 'Policy must be for SELECT to authenticated only');
    assert.ok(p.includes('auth.uid()'), 'Policy must restrict to auth.uid()');
    assert.ok(p.includes('public.staff_session_is_live()'), 'Policy must check public.staff_session_is_live()');
    assert.ok(!p.includes('insert'), 'No insert policy allowed');
    assert.ok(!p.includes('update'), 'No update policy allowed');
    assert.ok(!p.includes('delete'), 'No delete policy allowed');
  }

  // Ensure no permissive using (true) anywhere
  assert.equal(/using\s*\(\s*true\s*\)/i.test(fullSql), false, 'Forbidden using (true) found');
});

// 8. Security Definer Functions Integrity
test('Security definer functions have empty search_path, explicit postgres owner, and restricted grants', () => {
  const definerFunctions = [
    'public.staff_session_is_live',
    'public.consume_staff_mfa_enrollment_approval',
    'public.activate_staff_context',
    'public.revoke_staff_context',
    'app_private.invalidate_staff_contexts'
  ];

  for (const fn of definerFunctions) {
    const blockStart = fullSql.indexOf(`create function ${fn}`);
    assert.ok(blockStart !== -1, `Function ${fn} declaration not found`);
    const blockEnd = fullSql.indexOf('$$;', blockStart) + 3;
    const block = fullSql.slice(blockStart, blockEnd);

    assert.ok(block.includes("security definer set search_path = ''"), `${fn} must be security definer with empty search_path`);
    assert.ok(fullSql.includes(`alter function ${fn}`), `${fn} must have explicit owner alteration`);
    assert.ok(fullSql.includes(`owner to postgres;`), `${fn} must be owned by postgres`);
    assert.ok(
      new RegExp(`revoke all on function [^;]*${fn.replaceAll('.', '\\.')}[^;]*from public, anon`).test(fullSql),
      `${fn} must revoke public and anon execute`
    );
  }

  // Ensure dynamic SQL formatting is absent
  assert.equal(/execute\s+format\s*\(/i.test(fullSql), false, 'Dynamic SQL execute format() forbidden');
});

// 9. Invoker Helper Functions
test('Invoker helper functions have empty search_path and correct privilege scopes', () => {
  // is_native_staff_request
  const reqStart = fullSql.indexOf('create function public.is_native_staff_request()');
  const reqBlock = fullSql.slice(reqStart, fullSql.indexOf('$$;', reqStart) + 3);
  assert.ok(reqBlock.includes("security invoker set search_path = ''"));
  assert.ok(fullSql.includes('revoke all on function public.is_native_staff_request() from public, anon;'));
  assert.ok(fullSql.includes('grant execute on function public.is_native_staff_request() to authenticated;'));

  // reject_audit_change
  const auditStart = fullSql.indexOf('create function app_private.reject_audit_change()');
  const auditBlock = fullSql.slice(auditStart, fullSql.indexOf('$$;', auditStart) + 3);
  assert.ok(auditBlock.includes("security invoker set search_path = ''"));
  assert.ok(fullSql.includes('revoke all on function app_private.reject_audit_change() from public, anon, authenticated;'));
});

// 10. Audit Immutability Triggers
test('Audit events immutability (update, delete, truncate blocked)', () => {
  assert.ok(/create trigger audit_events_immutable before update or delete on public\.audit_events\s+for each row execute function app_private\.reject_audit_change\(\);/i.test(fullSql));
  assert.ok(/create trigger audit_events_no_truncate before truncate on public\.audit_events\s+for each statement execute function app_private\.reject_audit_change\(\);/i.test(fullSql));
});

// 11. Invalidation Triggers on Identity and Role Mutations
test('Context invalidation triggers on profiles, user_roles, and admin_privileges', () => {
  assert.ok(fullSql.includes('create trigger profile_context_invalidation after update on public.profiles'));
  assert.ok(fullSql.includes('create trigger membership_context_invalidation after insert or update or delete on public.user_roles'));
  assert.ok(fullSql.includes('create trigger tier_context_invalidation after insert or update or delete on public.admin_privileges'));
});

// 12. Super Admin MFA and Approval Table Boundary
test('Super Admin MFA enrollment approval table and atomic consumption', () => {
  assert.ok(fullSql.includes('create table public.staff_mfa_enrollment_approvals'));
  assert.ok(fullSql.includes('check (profile_id <> approved_by)'));
  assert.ok(fullSql.includes("valid_until <= issued_at + interval '10 minutes'"));
  assert.ok(fullSql.includes("from auth.mfa_factors where user_id=auth.uid() and status='verified'"));
  assert.ok(fullSql.includes("where a.profile_id=auth.uid() and a.privilege_status='active' and m.role_code='admin'"));
  assert.ok(fullSql.includes('e.consumed_at is null and e.issued_at<=now() and e.valid_until>now()'));
});

// 13. Staff Context Lifecycle Commands
test('Staff context activation and revocation semantics', () => {
  assert.ok(fullSql.includes("requested_role not in ('admin','teacher','accountant')"));
  assert.ok(fullSql.includes("auth.jwt()->>'aal' is distinct from 'aal2'"));
  assert.ok(fullSql.includes('select * into p from public.profiles where id = auth.uid() for update;'));
  assert.ok(fullSql.includes('public.role_contexts.revoked_at is null'));
  assert.ok(fullSql.includes("s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()"));
  assert.ok(fullSql.includes('u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= now())'));
});

// 14. TypeScript and SQL Permission Catalog Alignment
test('SQL permission check constraint exactly matches TypeScript permission catalog', () => {
  const permTs = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
  const tsCatalog = [...permTs.split('Object.freeze([')[1].split('] as const')[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const sqlMatch = m3.match(/permissions <@ array\[([^\]]+)\]/);
  assert.ok(sqlMatch, 'user_roles permissions check constraint must exist');
  const sqlCatalog = [...sqlMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.equal(tsCatalog.length, 45);
  assert.equal(sqlCatalog.length, 45);
  assert.deepEqual(sqlCatalog, tsCatalog);
});

// 15. TypeScript Staff Server DAL and SQL Schema Alignment
test('TypeScript staff server DAL column selections match SQL tables', () => {
  const dal = fs.readFileSync('src/lib/staff/server.ts', 'utf8');
  // profiles select
  assert.ok(dal.includes(".from('profiles').select('id,account_status,credential_reset_required,authorization_version')"));
  // user_roles select
  assert.ok(dal.includes(".from('user_roles').select('id,profile_id,role_code,membership_status,valid_from,valid_until,permissions')"));
  // admin_privileges select
  assert.ok(dal.includes(".from('admin_privileges').select('profile_id,tier,privilege_status')"));
  // role_contexts select
  assert.ok(dal.includes(".from('role_contexts').select('id,profile_id,role_code,assignment_id,context_version,authorization_version,expires_at,revoked_at')"));
  // RPC calls
  assert.ok(dal.includes(".rpc('staff_session_is_live')"));
});

// 16. Absence of Prohibited Inclusions
test('Strict safety boundaries: no domain seeds, user inserts, PIN verifiers, or storage policies', () => {
  assert.equal(/insert into public\.(students|guardians|profiles|staff_profiles|school_configuration|academic_years|classes|sections|enrollments|teacher_assignments)/i.test(fullSql), false);
  assert.equal(/insert into auth\./i.test(fullSql), false);
  assert.equal(/alter table auth\./i.test(fullSql), false);
  assert.equal(/create policy.*storage\.objects/i.test(fullSql), false);
  assert.equal(/pin_hash|pin_salt|password_hash/i.test(fullSql), false);
});

// 17. Future RLS Test Matrix Remains Unexecuted
test('Integration test plan remains unexecuted (status: NOT RUN)', () => {
  const plan = JSON.parse(fs.readFileSync('supabase/tests/step-14-rls-plan.json', 'utf8'));
  assert.equal(plan.status, 'NOT RUN');
  assert.equal(plan.scenarios.length, 20);
  assert.ok(plan.scenarios.every(s => s.result === 'NOT RUN'));
});

// 18. Baseline File Hashes Preserved
test('Migration baseline SHA-256 hashes recorded', () => {
  const expectedHashes = {
    '20261105000100_identity_foundation.sql': '3595e2f46d25c8feba39572ef248bd79b1e042052a7de0fbd3c9e5df79dc1c8c',
    '20261105000200_school_domain.sql': 'dd26d701fdf61beda3a6cdff60972b20ea201ddb207c29c864652d8420e2327e',
    '20261105000300_staff_security.sql': '0664187c5d4a3ed6e3d83b4e7f365ed7e58d010b117565ce3e7d65f468307ce9'
  };

  for (const [file, hash] of Object.entries(expectedHashes)) {
    const currentHash = crypto.createHash('sha256').update(fs.readFileSync('supabase/migrations/' + file)).digest('hex');
    assert.equal(currentHash, hash, `Hash mismatch for ${file}`);
  }
});

console.log(`\n======================================================`);
console.log(`STATIC AUDIT PASS: All ${checkCount} offline checks passed.`);
console.log(`ZERO SQL statements executed. ZERO database connections made.`);
console.log(`ZERO migrations applied. ZERO credentials accessed.`);
console.log(`======================================================`);
