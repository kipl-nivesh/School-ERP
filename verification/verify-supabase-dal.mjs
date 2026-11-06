/**
 * Verification Suite for School ERP Phase 3: Supabase DAL, Service Gateway & Domain RLS.
 * 
 * Tests:
 * 1. Gateway mode resolution (development vs live Supabase routing).
 * 2. Fail-closed security on unauthenticated or unauthorized contexts in Supabase DAL.
 * 3. Scope isolation (Teacher assigned classes, Student identity, Parent verified link).
 * 4. Financial integrity checks (Integer paise, idempotency key validation, record mutation evaluation).
 * 5. Static verification of Migration 5 (RLS policies, triggers, atomic fee procedure, immutability).
 * 
 * STRICT INVARIANT: Isolated verification only; never touches the production Supabase database.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// In-memory module loader
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

const auth = await import(moduleURL('src/lib/auth/index.ts'));
const {
  resolveServiceMode,
  SchoolAdminGateway,
  TeacherGateway,
  AccountantGateway,
  StudentPortalGateway,
  ParentPortalGateway,
} = await import(moduleURL('src/lib/services/service-gateway.ts'));
const {
  SchoolAdminSupabaseService,
  TeacherSupabaseService,
  AccountantSupabaseService,
  StudentPortalSupabaseService,
  ParentPortalSupabaseService,
} = await import(moduleURL('src/lib/services/supabase-dal.ts'));

const NOW = Date.now();
let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log('PASS [Supabase DAL & RLS]: ' + name);
}

async function testAsync(name, run) {
  await run();
  passed++;
  console.log('PASS [Supabase DAL & RLS]: ' + name);
}

function createContext(role, permissions = [], customProfileId = null) {
  const profileId = customProfileId || (
    role === 'student' ? 'stu-101' :
    role === 'parent' ? 'parent-rajesh-1' :
    role === 'teacher' ? 'stf-tch-1' :
    role === 'accountant' ? 'stf-acc-1' :
    `principal-${role}-1`
  );
  const assignment = {
    id: `mem-${role}`,
    profileId,
    role,
    status: 'active',
    validFrom: NOW - 3600000,
    validUntil: null,
    permissions: permissions.length > 0 ? permissions : [...auth.getPermissionCeiling(role)],
  };
  return {
    source: 'verified-server-session',
    profileId,
    accountStatus: 'active',
    credentialResetRequired: false,
    authorizationVersion: 2,
    currentAuthorizationVersion: 2,
    session: {
      id: `session-${role}-1`,
      profileId,
      verifiedAt: NOW,
      authenticatedAt: NOW - 60000,
      expiresAt: NOW + 3600000,
      revoked: false,
      assurance: role === 'admin' ? 'aal2' : 'aal1',
      reauthenticatedAt: NOW - 1000,
    },
    activeRole: {
      sessionId: `session-${role}-1`,
      profileId,
      role,
      assignmentId: assignment.id,
      version: 1,
      currentVersion: 1,
      expiresAt: NOW + 1800000,
      revoked: false,
    },
    assignments: [assignment],
  };
}

const adminContext = createContext('admin');
const teacherContext = createContext('teacher');
const accountantContext = createContext('accountant');
const studentContext = createContext('student');
const parentContext = createContext('parent');

// =============================================================================
// Test Group 1: Service Gateway Mode Resolution
// =============================================================================

test('Gateway: Resolves to development adapter when live requests are disabled', () => {
  const mode = resolveServiceMode(adminContext);
  assert.equal(mode, 'development-adapter');
});

test('Gateway: Untrusted client claims never route to live Supabase client', () => {
  const untrustedClaims = { source: 'untrusted-client', role: 'admin' };
  const mode = resolveServiceMode(untrustedClaims);
  assert.equal(mode, 'development-adapter');
});

// =============================================================================
// Test Group 2: Supabase DAL Authorization & Fail-Closed Enforcement
// =============================================================================

await testAsync('DAL Fail-Closed: Teacher attempting admissions in DAL is denied immediately', async () => {
  const res = await SchoolAdminSupabaseService.createStudentAdmission(teacherContext, {
    fullName: 'Intruder',
    dateOfBirth: '2012-01-01',
    gender: 'male',
    classId: 'cls-10',
    sectionId: 'sec-10a',
    guardianName: 'Guardian',
    guardianPhone: '+91 98765 43210',
  });
  assert.equal(res.success, false);
  assert.equal(res.code, 'PERMISSION_DENIED');
});

await testAsync('DAL Fail-Closed: Teacher attempting fee payment collection in DAL is denied', async () => {
  const res = await AccountantSupabaseService.collectPayment(teacherContext, {
    studentId: 'stu-101',
    amountPaise: 100000,
    paymentMethod: 'cash',
    transactionReference: 'REF-001',
    idempotencyKey: 'key-teacher-fail',
  });
  assert.equal(res.success, false);
  assert.equal(res.code, 'PERMISSION_DENIED');
});

await testAsync('DAL Fail-Closed: Null context in DAL fails closed without query', async () => {
  const res = await SchoolAdminSupabaseService.getOverviewMetrics(null);
  assert.equal(res.success, false);
  assert.equal(res.code, 'PERMISSION_DENIED');
});

await testAsync('DAL Fail-Closed: Accountant without School Admin MFA cannot create staff accounts', async () => {
  const res = await SchoolAdminSupabaseService.createStaffAccount(accountantContext, {
    fullName: 'New Staff',
    role: 'teacher',
    department: 'Science',
    email: 'newstaff@brightcamp.edu.invalid',
  });
  assert.equal(res.success, false);
  assert.equal(res.code, 'PERMISSION_DENIED');
});

// =============================================================================
// Test Group 3: Scope Isolation & Student/Parent Guardrails
// =============================================================================

await testAsync('DAL Scope: Student attempting cross-identity query is denied', async () => {
  const res = await StudentPortalSupabaseService.getProfileOverview(studentContext, 'stu-999-other');
  assert.equal(res.success, false);
  assert.equal(res.code, 'UNAUTHORIZED_SCOPE');
});

await testAsync('DAL Scope: Student attempting to query another student exam results is denied', async () => {
  const res = await StudentPortalSupabaseService.getExamResults(studentContext, 'stu-201');
  assert.equal(res.success, false);
  assert.equal(res.code, 'UNAUTHORIZED_SCOPE');
});

await testAsync('DAL Scope: Teacher score exceeding maxMarks fails validation before query', async () => {
  const res = await TeacherSupabaseService.recordMarksDraft(
    teacherContext,
    'cls-10',
    'sec-10a',
    'Midterm',
    'Math',
    50,
    [{ studentId: 'stu-101', marksObtained: 55 }], // > 50
    'stf-tch-1'
  );
  assert.equal(res.success, false);
  assert.equal(res.code, 'INVALID_SCORE');
});

await testAsync('DAL Scope: Parent without profile ID in DAL fails closed', async () => {
  const res = await ParentPortalSupabaseService.getLinkedChildren(parentContext, '');
  assert.equal(res.success, false);
  assert.equal(res.code, 'UNAUTHORIZED_SCOPE');
});

// =============================================================================
// Test Group 4: Gateway Functionality & Delegation
// =============================================================================

await testAsync('Gateway Delegation: Admin overview metrics delegate cleanly', async () => {
  const res = await SchoolAdminGateway.getOverviewMetrics(adminContext);
  assert.equal(res.success, true);
  assert.ok(res.data.totalStudents >= 4);
  assert.ok(res.data.totalFeeCollectedPaise > 0);
});

await testAsync('Gateway Delegation: Student profile overview delegates cleanly', async () => {
  const res = await StudentPortalGateway.getProfileOverview(studentContext, 'stu-101');
  assert.equal(res.success, true);
  assert.equal(res.data.fullName, 'Aarav Sharma');
});

await testAsync('Gateway Delegation: Teacher assigned classes delegate cleanly', async () => {
  const res = await TeacherGateway.getAssignedClasses(teacherContext, 'stf-tch-1');
  assert.equal(res.success, true);
  assert.ok(res.data.length >= 1);
  assert.equal(res.data[0].subjectName, 'Mathematics');
});

await testAsync('Gateway Delegation: Accountant financial summary delegates cleanly', async () => {
  const res = await AccountantGateway.getFinancialSummary(accountantContext);
  assert.equal(res.success, true);
  assert.ok(res.data.totalBilledPaise > 0);
});

await testAsync('Gateway Delegation: Parent child switcher report delegates cleanly', async () => {
  const res = await ParentPortalGateway.getChildAcademicReport(parentContext, 'parent-rajesh-1', 'stu-101');
  assert.equal(res.success, true);
  assert.equal(res.data.student.fullName, 'Aarav Sharma');
});

// =============================================================================
// Test Group 5: Static Migration 5 Verification (Domain Schema & RLS)
// =============================================================================

test('Migration 5: File exists and contains valid transaction block', () => {
  const migPath = 'supabase/migrations/20261105000500_school_domain_rls.sql';
  assert.ok(fs.existsSync(migPath), 'Migration 5 file must exist');
  const sql = fs.readFileSync(migPath, 'utf8');
  assert.ok(sql.startsWith('-- Step 18 Migration 5'));
  assert.ok(sql.includes('begin;'));
  assert.ok(sql.includes('commit;'));
});

test('Migration 5: Enforces integer-paise positive checks on all financial entities', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  assert.ok(sql.includes('amount_paise bigint not null check (amount_paise > 0)'), 'Must enforce positive integer paise on fee_structures/invoices/payments/expenses');
});

test('Migration 5: Enforces idempotency key uniqueness on payment transactions', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  assert.ok(sql.includes('idempotency_key text not null unique check (length(idempotency_key) between 8 and 128)'), 'Must enforce unique idempotency key on fee_payments');
});

test('Migration 5: Enforces immutable settled payment trigger', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  assert.ok(sql.includes('reject_settled_payment_change'), 'Must define settled payment mutation reject function');
  assert.ok(sql.includes('trigger fee_payments_immutable before update or delete on public.fee_payments'), 'Must attach immutability trigger');
});

test('Migration 5: Implements atomic transactional fee collection procedure', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  assert.ok(sql.includes('collect_fee_payment_atomic'), 'Must define collect_fee_payment_atomic stored procedure');
  assert.ok(sql.includes('select * into v_existing from public.fee_payments where idempotency_key = p_idempotency_key'), 'Must check database-level idempotency');
  assert.ok(sql.includes('select * into v_invoice from public.fee_invoices where id = p_invoice_id and student_id = p_student_id for update'), 'Must lock invoice row with FOR UPDATE');
});

test('Migration 5: Enforces RLS and force RLS on all 10 new domain tables', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  const domainTables = [
    'attendance_records', 'homework_assignments', 'marks_sheets', 'marks_entries',
    'timetable_slots', 'announcements', 'fee_structures', 'fee_invoices',
    'fee_payments', 'operating_expenses',
  ];
  for (const table of domainTables) {
    assert.ok(sql.includes(`alter table public.${table} enable row level security`), `Must enable RLS on ${table}`);
    assert.ok(sql.includes(`alter table public.${table} force row level security`), `Must force RLS on ${table}`);
    assert.ok(sql.includes(`revoke all on table public.${table} from public, anon, authenticated`), `Must revoke all on ${table}`);
  }
});

test('Migration 5: Enforces Teacher assigned-class isolation policies', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  assert.ok(sql.includes('create policy teacher_assigned_attendance on public.attendance_records'), 'Must define teacher assigned attendance policy');
  assert.ok(sql.includes('create policy teacher_assigned_homework on public.homework_assignments'), 'Must define teacher assigned homework policy');
  assert.ok(sql.includes('create policy teacher_assigned_marks_sheets on public.marks_sheets'), 'Must define teacher assigned marks policy');
});

test('Migration 5: Avoids recursive RLS policies using current_active_role helper', () => {
  const sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');
  assert.ok(sql.includes('create or replace function public.current_active_role() returns text'), 'Must use non-recursive active role validator');
});

console.log(`PASS: All ${passed} Supabase DAL, Service Gateway & RLS tests passed successfully.`);
