import assert from 'node:assert/strict';
import fs from 'node:fs';
const paths = fs.readdirSync('supabase/migrations').filter(p => p.endsWith('.sql')).sort();
const files = paths.map(p => fs.readFileSync('supabase/migrations/' + p, 'utf8'));
const sql = files.join('\n');
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('STATIC PASS: ' + name); };
test('Original then two incremental migrations ordered', () => assert.deepEqual(paths, ['20261105000100_identity_foundation.sql', '20261105000200_school_domain.sql', '20261105000300_staff_security.sql']));
const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map(m => m[1]);
test('Eighteen unique application tables; no duplicate identity definitions', () => { assert.equal(tables.length, 18); assert.equal(new Set(tables).size, 18); });
for (const table of tables) test('RLS/FORCE and ordinary-grant revocation: ' + table, () => {
  assert.ok(sql.includes('alter table public.' + table + ' enable row level security;'));
  assert.ok(sql.includes('alter table public.' + table + ' force row level security;'));
  assert.ok(new RegExp('revoke all on table [^;]*public\\.' + table + '[^;]*from public, anon, authenticated;', 's').test(sql));
});
test('Every public FK target declared; Auth user FK is explicit external dependency', () => { for (const m of sql.matchAll(/references public\.(\w+)/g)) assert.ok(tables.includes(m[1])); });
test('Parent concurrency invariant and reverse identity binding', () => {
  assert.ok(sql.includes('unique index parent_login_one_eligible_student on public.parent_login_identities(student_id) where login_eligible'));
  assert.ok(sql.includes('foreign key (guardian_id, profile_id) references public.guardians(id, profile_id)'));
  assert.ok(sql.includes('foreign key (relationship_id, student_id, guardian_id)'));
});
test('Only four explicit self-scope SELECT policies', () => {
  const policies = [...sql.matchAll(/create policy[\s\S]*?;/g)].map(m => m[0]);
  assert.equal(policies.length, 4);
  for (const p of policies) { assert.ok(p.includes('for select to authenticated')); assert.ok(p.includes('auth.uid()')); assert.ok(p.includes('staff_session_is_live()')); }
  assert.equal(/using\s*\(\s*true\s*\)/i.test(sql), false);
});
const definers = [...sql.matchAll(/create function ([\w.]+)\(([^)]*)\)[\s\S]*?security definer[\s\S]*?\$\$;/g)];
test('Definer review boundaries are explicit', () => {
  // Specific function blocks avoid matching preceding invoker functions across definitions.
  for (const name of ['public.consume_staff_mfa_enrollment_approval', 'public.staff_session_is_live', 'public.activate_staff_context', 'public.revoke_staff_context', 'app_private.invalidate_staff_contexts']) {
    const block = sql.slice(sql.indexOf('create function ' + name), sql.indexOf('$$;', sql.indexOf('create function ' + name)) + 3);
    assert.ok(block.includes('security definer set search_path = \'\''));
    assert.ok(sql.includes('alter function ' + name));
    assert.ok(new RegExp('revoke all on function [^;]*' + name.replaceAll('.', '\\.') + '[^;]*from public, anon').test(sql));
  }
  assert.ok(definers.length > 0);
  assert.equal(/execute\s+format\s*\(/i.test(sql), false);
});
test('Context commands reject revoked contexts and preserve native MFA/own-session scope', () => {
  assert.ok(sql.includes("requested_role not in ('admin','teacher','accountant')"));
  assert.ok(sql.includes("is distinct from 'aal2'"));
  assert.ok(sql.includes('public.role_contexts.revoked_at is null'));
  assert.ok(sql.includes("s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()"));
  assert.ok(sql.includes('public.is_native_staff_request()'));
});
test('Audit update/delete/truncate and grant/tier invalidation prepared', () => {
  assert.ok(sql.includes('before update or delete on public.audit_events'));
  assert.ok(sql.includes('before truncate on public.audit_events'));
  for (const t of ['profile_context_invalidation', 'membership_context_invalidation', 'tier_context_invalidation']) assert.ok(sql.includes('create trigger ' + t));
});
test('Permission catalog exactly matches existing TypeScript', () => {
  const src = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8').split('Object.freeze([')[1].split('] as const')[0];
  const permissions = [...src.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const check = files[2].match(/permissions <@ array\[([^\]]+)\]/)[1];
  assert.deepEqual([...check.matchAll(/'([^']+)'/g)].map(m => m[1]), permissions);
});
test('No domain seeds, users, passwords or Storage policy operations', () => {
  assert.equal(/insert into public\.(students|guardians|profiles|staff_profiles|school_configuration)/i.test(sql), false);
  assert.equal(/insert into auth\.|create policy.*storage\.objects|alter table auth\./i.test(sql), false);
});
test('Future real-session integration matrix is unexecuted', () => {
  const plan = JSON.parse(fs.readFileSync('supabase/tests/step-14-rls-plan.json', 'utf8'));
  assert.equal(plan.status, 'NOT RUN'); assert.equal(plan.scenarios.length, 20);
  assert.ok(plan.scenarios.every(s => s.result === 'NOT RUN'));
});
test('Independent bounded one-use approval and schema CREATE restrictions',()=>{
  assert.ok(sql.includes('revoke create on schema public from public, anon, authenticated;'));
  assert.ok(sql.includes('check (profile_id <> approved_by)'));
  assert.ok(sql.includes("valid_until <= issued_at + interval '10 minutes'"));
  assert.ok(sql.includes('e.consumed_at is null'));
  assert.ok(sql.includes("from auth.mfa_factors where user_id=auth.uid() and status='verified'"));
});
console.log('STATIC PASS: ' + checks + ' SQL review checks. No SQL parsed/executed, constraints tested, RLS verified or database contacted.');
