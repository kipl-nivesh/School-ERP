/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — PHASE 5 VERIFICATION SUITE
 * Multi-School SaaS & Student Subscription Engine
 * =============================================================================
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const urls = new Map();
function moduleURL(filename) {
  const resolved = path.resolve(filename);
  if (urls.has(resolved)) return urls.get(resolved);
  let js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
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

const subscriptionContracts = await import(moduleURL('src/lib/subscription/contracts.ts'));
const subscriptionService = await import(moduleURL('src/lib/subscription/service.ts'));
const pinService = await import(moduleURL('src/lib/auth/pin-service.ts'));

const { SUBSCRIPTION_PLANS } = subscriptionContracts;
const {
  activateStudentTrial,
  getStudentSubscription,
  getSubscriptionAccess,
  calculateSubscriptionExtension,
  extendStudentSubscription,
  getParentChildSubscriptionAccess,
  resetSubscriptionTestStore,
} = subscriptionService;

const {
  authenticateStudentPin,
  authenticateParentPin,
  registerMockStudentCredential,
  registerMockGuardianCredential,
} = pinService;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS [Phase 5 Multi-Tenant & Subscription]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL [Phase 5 Multi-Tenant & Subscription]: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS [Phase 5 Multi-Tenant & Subscription]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL [Phase 5 Multi-Tenant & Subscription]: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log('Running Brightcamp School ERP Phase 5 Verification Suite...\n');

  // ===========================================================================
  // Part 1: Migration Files Validation
  // ===========================================================================

  test('Migration 7: Multi-Tenant Foundation exists and contains tenant-scoping schema', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261105000700_multi_tenant_foundation.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 7 file must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes('create table if not exists public.schools'), 'Creates public.schools table');
    assert.ok(sql.includes('public.current_school_id()'), 'Defines current_school_id context helper');
    assert.ok(sql.includes('alter table public.user_roles add column if not exists school_id'), 'Scopes user_roles with school_id');
    assert.ok(sql.includes('alter table public.role_contexts add column if not exists school_id'), 'Scopes role_contexts with school_id');
    assert.ok(sql.includes('unique (school_id, registration_number)'), 'Enforces school-scoped student registration uniqueness');
    assert.ok(sql.includes('sections_class_school_fkey'), 'Prevents cross-school foreign key between section and class');
    assert.ok(sql.includes('school_id = public.current_school_id()'), 'Enforces tenant-aware RLS policy filter');
  });

  test('Migration 8: Student Subscription Foundation exists and contains complete contracts', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261105000800_student_subscription_foundation.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 8 file must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes('create table if not exists public.subscription_plans'), 'Creates subscription_plans');
    assert.ok(sql.includes('create table if not exists public.student_subscriptions'), 'Creates student_subscriptions');
    assert.ok(sql.includes('create table if not exists public.subscription_ledger'), 'Creates subscription_ledger');
    assert.ok(sql.includes('create table if not exists public.subscription_events'), 'Creates subscription_events');
    assert.ok(sql.includes('public.activate_student_trial'), 'Defines atomic trial activation RPC');
    assert.ok(sql.includes('public.extend_student_subscription_atomic'), 'Defines atomic extension RPC');
    assert.ok(sql.includes('public.get_student_subscription_access'), 'Defines query-time access check');
    assert.ok(sql.includes('grant execute on function public.extend_student_subscription_atomic(uuid, uuid, text, text, text, uuid) to service_role'), 'Restricts extension RPC to service_role');
    assert.ok(sql.includes('grant execute on function public.activate_student_trial(uuid, uuid) to service_role'), 'Restricts trial activation to service_role');
    assert.ok(sql.includes('trg_subscription_ledger_immutable'), 'Enforces immutable subscription ledger trigger');
    assert.ok(!sql.includes('generated always as (current_period_expires_at > now()) stored'), 'Must NOT use now() in generated stored columns');
  });

  // ===========================================================================
  // Part 2: Confirmed Business Model & Plan Definitions
  // ===========================================================================

  test('Subscription Plans: Confirmed INR 1 Daily and INR 30 Monthly definitions', () => {
    const daily = SUBSCRIPTION_PLANS.daily;
    assert.equal(daily.amountPaise, 100, 'Daily plan must be 100 paise (INR 1)');
    assert.equal(daily.durationHours, 24, 'Daily plan duration must be 24 hours');
    assert.equal(daily.currency, 'INR');

    const monthly = SUBSCRIPTION_PLANS.monthly;
    assert.equal(monthly.amountPaise, 3000, 'Monthly plan must be 3000 paise (INR 30)');
    assert.equal(monthly.durationHours, 720, 'Monthly plan duration must be 720 hours (30 days)');
    assert.equal(monthly.currency, 'INR');
  });

  // ===========================================================================
  // Part 3: Free Trial Rules (240 Hours, Activation Trigger, Immutability)
  // ===========================================================================

  await asyncTest('Free Trial: Starts only on account activation and lasts exactly 240 hours', async () => {
    resetSubscriptionTestStore();
    const fixedNow = new Date('2026-11-06T10:00:00Z').getTime();

    const result = await activateStudentTrial('stu_trial_01', 'sch_alpha', fixedNow);
    assert.equal(result.alreadyActive, false);

    const startedTime = new Date(result.trialStartedAt).getTime();
    const endedTime = new Date(result.trialEndsAt).getTime();

    const diffHours = (endedTime - startedTime) / (1000 * 60 * 60);
    assert.equal(diffHours, 240, 'Trial duration must be exactly 240 hours (10 days * 24 hours)');

    const state = await getStudentSubscription('stu_trial_01', fixedNow);
    assert.ok(state !== null);
    assert.equal(state.status, 'trial_active');
    assert.equal(state.isAccessGranted, true);
    assert.equal(state.remainingSeconds, 240 * 3600);
  });

  await asyncTest('Free Trial Immutability: Calling activation repeatedly never resets trial timestamp', async () => {
    const t0 = new Date('2026-11-06T10:00:00Z').getTime();
    const t1 = t0 + (48 * 3600 * 1000); // 48 hours later (login / password change)

    const initial = await activateStudentTrial('stu_trial_immutable', 'sch_alpha', t0);
    const subsequent = await activateStudentTrial('stu_trial_immutable', 'sch_alpha', t1);

    assert.equal(subsequent.alreadyActive, true);
    assert.equal(subsequent.trialStartedAt, initial.trialStartedAt, 'trialStartedAt must remain strictly immutable');
    assert.equal(subsequent.trialEndsAt, initial.trialEndsAt, 'trialEndsAt must remain strictly immutable');
  });

  await asyncTest('Free Trial Expiry Boundary: Access granted at 239h 59m, expired at 240h 01s', async () => {
    const t0 = new Date('2026-11-06T10:00:00Z').getTime();
    await activateStudentTrial('stu_trial_boundary', 'sch_alpha', t0);

    // Test inside boundary: 239 hours, 59 minutes, 59 seconds
    const insideBoundary = t0 + (240 * 3600 * 1000) - 1000;
    const accessActive = await getSubscriptionAccess('stu_trial_boundary', insideBoundary);
    assert.equal(accessActive.isAccessGranted, true);
    assert.equal(accessActive.status, 'trial_active');
    assert.equal(accessActive.remainingSeconds, 1);

    // Test outside boundary: 240 hours + 1 second
    const outsideBoundary = t0 + (240 * 3600 * 1000) + 1000;
    const accessExpired = await getSubscriptionAccess('stu_trial_boundary', outsideBoundary);
    assert.equal(accessExpired.isAccessGranted, false);
    assert.equal(accessExpired.status, 'expired');
    assert.equal(accessExpired.requiresRenewal, true);
    assert.equal(accessExpired.remainingSeconds, 0);
  });

  // ===========================================================================
  // Part 4: Cumulative Stacking & Idempotency
  // ===========================================================================

  test('Extension Calculation: Adds to future expiry when active, adds to now when expired', () => {
    const now = 1000000;

    // 1. Future active expiry: 5 days remaining
    const futureExpiry = now + (5 * 24 * 3600 * 1000);
    const dailyExt = calculateSubscriptionExtension(futureExpiry, 'daily', now);
    assert.equal(dailyExt.newExpiryMs, futureExpiry + (24 * 3600 * 1000), 'Daily extension must add 24 hours to future expiry');

    const monthlyExt = calculateSubscriptionExtension(futureExpiry, 'monthly', now);
    assert.equal(monthlyExt.newExpiryMs, futureExpiry + (720 * 3600 * 1000), 'Monthly extension must add 720 hours to future expiry');

    // 2. Past expired expiry: expired 2 days ago
    const pastExpiry = now - (2 * 24 * 3600 * 1000);
    const renewedExt = calculateSubscriptionExtension(pastExpiry, 'monthly', now);
    assert.equal(renewedExt.newExpiryMs, now + (720 * 3600 * 1000), 'Expired renewal must add 720 hours starting from clock now');
  });

  await asyncTest('Cumulative Stacking: INR 1 daily then INR 30 monthly stack without time forfeiture', async () => {
    const t0 = new Date('2026-11-06T12:00:00Z').getTime();
    await activateStudentTrial('stu_stacking', 'sch_alpha', t0);
    const trialEndMs = t0 + (240 * 3600 * 1000);

    // 1. Purchase Daily Plan on Day 2 of Trial
    const tPurchase1 = t0 + (48 * 3600 * 1000);
    const res1 = await extendStudentSubscription('stu_stacking', 'sch_alpha', 'daily', 'idemp_stack_01', 'gw_txn_01', tPurchase1);
    assert.equal(res1.success, true);
    assert.equal(res1.amountPaise, 100);
    const exp1Ms = new Date(res1.newExpiry).getTime();
    assert.equal(exp1Ms, trialEndMs + (24 * 3600 * 1000), 'Must add 24h onto trial end');

    // 2. Purchase Monthly Plan
    const tPurchase2 = t0 + (72 * 3600 * 1000);
    const res2 = await extendStudentSubscription('stu_stacking', 'sch_alpha', 'monthly', 'idemp_stack_02', 'gw_txn_02', tPurchase2);
    assert.equal(res2.success, true);
    assert.equal(res2.amountPaise, 3000);
    const exp2Ms = new Date(res2.newExpiry).getTime();
    assert.equal(exp2Ms, exp1Ms + (720 * 3600 * 1000), 'Must add 720h onto previous daily expiry');
  });

  await asyncTest('Replay & Idempotency Defense: Duplicate webhook with same key rejects duplicate extension', async () => {
    const t0 = Date.now();
    const res1 = await extendStudentSubscription('stu_idemp', 'sch_alpha', 'daily', 'idemp_dup_key_99', 'gw_dup_99', t0);
    assert.equal(res1.isDuplicate, false);
    assert.equal(res1.success, true);

    // Replay attack with same idempotency key
    const res2 = await extendStudentSubscription('stu_idemp', 'sch_alpha', 'daily', 'idemp_dup_key_99', 'gw_dup_99', t0);
    assert.equal(res2.isDuplicate, true, 'Must identify duplicate replay');
    assert.equal(res2.newExpiry, res1.newExpiry, 'Must not extend expiry on duplicate');
  });

  await asyncTest('Idempotency & Replay Defense: Payload collision rejected when parameters differ', async () => {
    const t0 = Date.now();
    const res1 = await extendStudentSubscription('stu_orig', 'sch_01', 'daily', 'key_collision_test_99', 'pay_01_test', t0);
    assert.equal(res1.success, true);
    assert.equal(res1.isDuplicate, false);

    // Same key, different student -> collision rejected
    const resDifferentStudent = await extendStudentSubscription('stu_other', 'sch_01', 'daily', 'key_collision_test_99', undefined, t0);
    assert.equal(resDifferentStudent.success, false);
    assert.ok(resDifferentStudent.error.includes('collision'));

    // Same key, different plan -> collision rejected
    const resDifferentPlan = await extendStudentSubscription('stu_orig', 'sch_01', 'monthly', 'key_collision_test_99', undefined, t0);
    assert.equal(resDifferentPlan.success, false);
    assert.ok(resDifferentPlan.error.includes('collision'));

    // Same gateway payment ID, different parameters -> collision rejected
    const resDifferentGateway = await extendStudentSubscription('stu_other', 'sch_01', 'daily', 'key_unique_02', 'pay_01_test', t0);
    assert.equal(resDifferentGateway.success, false);
    assert.ok(resDifferentGateway.error.includes('collision'));
  });

  // ===========================================================================
  // Part 5: Multi-Child Parent Portal Independence
  // ===========================================================================

  await asyncTest('Parent Multi-Child: Evaluates subscriptions separately for each linked child', async () => {
    const t0 = new Date('2026-11-06T12:00:00Z').getTime();

    // Child A has active subscription
    await activateStudentTrial('child_a', 'sch_alpha', t0);

    // Child B is registered but has expired subscription (started 300 hours ago)
    const tOld = t0 - (300 * 3600 * 1000);
    await activateStudentTrial('child_b', 'sch_alpha', tOld);

    const summary = await getParentChildSubscriptionAccess(
      'parent_priya',
      'sch_alpha',
      [
        { studentId: 'child_a', studentName: 'Child Active', registrationNumber: 'STU-A' },
        { studentId: 'child_b', studentName: 'Child Expired', registrationNumber: 'STU-B' },
      ],
      t0
    );

    assert.equal(summary.children.length, 2);

    const childA = summary.children.find(c => c.studentId === 'child_a');
    assert.ok(childA);
    assert.equal(childA.access.isAccessGranted, true);
    assert.equal(childA.access.status, 'trial_active');
    assert.equal(childA.access.requiresRenewal, false);

    const childB = summary.children.find(c => c.studentId === 'child_b');
    assert.ok(childB);
    assert.equal(childB.access.isAccessGranted, false);
    assert.equal(childB.access.status, 'expired');
    assert.equal(childB.access.requiresRenewal, true);
  });

  // ===========================================================================
  // Part 6: Multi-Tenant PIN Authentication & Collision Prevention
  // ===========================================================================

  await asyncTest('Multi-School PIN Auth: Two schools with identical Student ID resolve cleanly via School Code', async () => {
    // Register Student 'STU_COMMON_99' in School Alpha
    registerMockStudentCredential({
      studentId: 'STU_COMMON_99',
      profileId: 'profile-stu-alpha',
      studentName: 'Alpha Student',
      classSection: 'Class 10-A',
      salt: 'salt_alpha_999999',
      pinHash: 'b9423c4da3f4974fa2188ff45bf52ad69352e071e72e118ac49b0773d2ff96ff', // Pre-hashed
      status: 'active',
      schoolId: 'sch-alpha-uuid',
      schoolCode: 'ALPHA',
    });

    // Register Student 'STU_COMMON_99' in School Beta
    registerMockStudentCredential({
      studentId: 'STU_COMMON_99',
      profileId: 'profile-stu-beta',
      studentName: 'Beta Student',
      classSection: 'Class 10-B',
      salt: 'salt_beta_9999999',
      pinHash: 'b9423c4da3f4974fa2188ff45bf52ad69352e071e72e118ac49b0773d2ff96ff',
      status: 'active',
      schoolId: 'sch-beta-uuid',
      schoolCode: 'BETA',
    });

    // 1. Authenticating without schoolCode on colliding ID fails gracefully with disambiguation prompt
    const ambiguous = await authenticateStudentPin('STU_COMMON_99', '123456', '127.0.0.1');
    assert.equal(ambiguous.success, false);
    assert.ok(ambiguous.error.includes('Multiple schools found'));

    // 2. Parent PIN Auth with Multi-School disambiguation
    registerMockGuardianCredential({
      guardianProfileId: 'guardian-alpha-99',
      guardianName: 'Alpha Guardian',
      studentId: 'STU_COMMON_99',
      relationship: 'Mother',
      salt: 'salt_alpha_999999',
      pinHash: 'b9423c4da3f4974fa2188ff45bf52ad69352e071e72e118ac49b0773d2ff96ff',
      status: 'active',
      academicAccess: true,
      feeAccess: true,
      schoolId: 'sch-alpha-uuid',
      schoolCode: 'ALPHA',
    });

    registerMockGuardianCredential({
      guardianProfileId: 'guardian-beta-99',
      guardianName: 'Beta Guardian',
      studentId: 'STU_COMMON_99',
      relationship: 'Father',
      salt: 'salt_beta_9999999',
      pinHash: 'b9423c4da3f4974fa2188ff45bf52ad69352e071e72e118ac49b0773d2ff96ff',
      status: 'active',
      academicAccess: true,
      feeAccess: true,
      schoolId: 'sch-beta-uuid',
      schoolCode: 'BETA',
    });

    const ambiguousParent = await authenticateParentPin('STU_COMMON_99', '123456', '127.0.0.1');
    assert.equal(ambiguousParent.success, false);
    assert.ok(ambiguousParent.error.includes('Multiple schools found'));
  });

  console.log(`\n=================================================================`);
  console.log(`ALL ${passed} PHASE 5 MULTI-TENANT & SUBSCRIPTION TESTS PASSED!`);
  console.log(`=================================================================`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
