import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PostgrestClient } from '@supabase/postgrest-js';
import ts from 'typescript';

const school = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const foreign = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const classId1 = '11111111-1111-4111-8111-111111111111';
const sectionId1 = '22222222-2222-4222-8222-222222222222';
const yearId1 = '33333333-3333-4333-8333-333333333333';

const form = values => {
  const result = new FormData();
  for (const [name, value] of Object.entries(values)) result.set(name, value);
  return result;
};

const fieldsSource = ts.transpileModule(readFileSync('src/lib/services/report-fields.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const fieldsModule = { exports: {} };
new Function('require', 'module', 'exports', fieldsSource)(() => ({}), fieldsModule, fieldsModule.exports);

function loadReportDependency(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    assert.ok(Object.hasOwn(dependencies, name), name);
    return dependencies[name];
  }, mod, mod.exports);
  return mod.exports;
}
const financeCalculation = loadReportDependency('src/lib/services/finance-report-calculation.ts', {
  './report-fields': fieldsModule.exports,
  './accountant-finance-fields': loadReportDependency('src/lib/services/accountant-finance-fields.ts'),
});

const workspaceSource = ts.transpileModule(readFileSync('src/lib/services/report-workspace.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const actionsSource = ts.transpileModule(readFileSync('src/app/staff/report-workspace-actions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setupReportWorkspace({
  permissions = ['reports.read', 'students.read', 'attendance.read', 'fees.read', 'receipts.read', 'marks.read', 'staff.read'],
  role = 'admin',
  badSchool = false,
  failure = false,
  snapshotOverflow = false,
  snapshotInvoiceCount = 3,
} = {}) {
  const calls = [];
  const snapshots = [];

  const client = new PostgrestClient('http://reports.invalid', {
    fetch: async (input, init) => {
      const url = new URL(input);
      calls.push(url);
      const method = init?.method ?? 'GET';
      if (url.pathname === '/rpc/read_accountant_finance_snapshot') {
        assert.equal(method, 'POST');
        const args = JSON.parse(init.body);
        assert.equal(args.p_school, school);
        snapshots.push(args.p_dataset);
        if (snapshotOverflow) return Response.json({ complete: false });
        const rows = args.p_dataset === 'invoices'
          ? Array.from({ length: snapshotInvoiceCount }, (_, i) => ({
              id: 'invoice-' + i, school_id: school, student_id: 'student-' + i,
              invoice_number: 'INV-S-' + i, title: 'Invoice ' + i, due_date: '2026-11-01',
              status: ['paid', 'partial', 'unpaid'][i % 3],
              amount_paise: ['500000', '750000', '400000'][i % 3],
              paid_paise: ['500000', '250000', '0'][i % 3],
            }))
          : [
              { id: 'p1', school_id: school, amount_paise: '500000', payment_method: 'upi', status: 'settled' },
              { id: 'p2', school_id: school, amount_paise: '250000', payment_method: 'card', status: 'settled' },
            ];
        return Response.json({ complete: true, count: rows.length, rows });
      }
      assert.ok(method === 'GET' || method === 'HEAD');

      if (failure) return Response.json({ message: 'Database query failed' }, { status: 500 });

      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'content-range': '0-0/1' } });
      }

      // Options queries
      if (url.pathname === '/academic_years') {
        return Response.json([
          { id: yearId1, label: '2026-2027', school_id: badSchool ? foreign : school, starts_on: '2026-04-01', ends_on: '2027-03-31' },
        ]);
      }
      if (url.pathname === '/classes') {
        if (url.searchParams.get('select') === 'id') {
          return Response.json([{ id: classId1 }]);
        }
        return Response.json([
          { id: classId1, name: 'Grade 10', school_id: badSchool ? foreign : school },
        ]);
      }
      if (url.pathname === '/sections') {
        if (url.searchParams.get('select') === 'id') {
          return Response.json([{ id: sectionId1 }]);
        }
        return Response.json([
          {
            id: sectionId1,
            name: 'Section A',
            class_id: classId1,
            academic_year_id: yearId1,
            school_id: badSchool ? foreign : school,
            classroom: { name: 'Grade 10', school_id: badSchool ? foreign : school },
            year: { label: '2026-2027', school_id: badSchool ? foreign : school },
          },
        ]);
      }

      // Enrollment queries
      if (url.pathname === '/students') {
        if (!url.searchParams.get('select')?.includes('display_name')) {
          return Response.json([
            { id: 's1', enrollment_status: 'active' },
            { id: 's2', enrollment_status: 'active' },
            { id: 's3', enrollment_status: 'inactive' },
            { id: 's4', enrollment_status: 'withdrawn' },
          ]);
        }
        // Paginated list
        return Response.json([
          {
            id: 's1',
            display_name: 'Aarav Sharma',
            registration_number: 'BC-2026-001',
            enrollment_status: 'active',
            school_id: school,
            enrollment: [
              {
                school_id: school,
                section: {
                  id: sectionId1,
                  name: 'Section A',
                  class_id: classId1,
                  school_id: school,
                  classroom: { name: 'Grade 10', school_id: school },
                  year: { label: '2026-2027', school_id: school },
                },
              },
            ],
          },
        ]);
      }
      if (url.pathname === '/enrollments') {
        return Response.json([
          {
            section_id: sectionId1,
            section: {
              class_id: classId1,
              classroom: { id: classId1, name: 'Grade 10', school_id: school },
            },
          },
          {
            section_id: sectionId1,
            section: {
              class_id: classId1,
              classroom: { id: classId1, name: 'Grade 10', school_id: school },
            },
          },
        ]);
      }

      // Attendance queries
      if (url.pathname === '/attendance_records') {
        if (url.searchParams.get('select') === 'status') {
          return Response.json([
            { status: 'present' },
            { status: 'present' },
            { status: 'late' },
            { status: 'absent' },
            { status: 'excused' },
          ]);
        }
        return Response.json([
          {
            id: 'att-1',
            student_id: 's1',
            section_id: sectionId1,
            attendance_date: '2026-11-15',
            status: 'present',
            remarks: 'On time',
            school_id: school,
            student: { display_name: 'Aarav Sharma', registration_number: 'BC-2026-001', school_id: school },
            section: { name: 'Section A', school_id: school, classroom: { name: 'Grade 10', school_id: school } },
          },
        ]);
      }

      // Finance queries
      if (url.pathname === '/fee_invoices') {
        if (['amount_paise::text,paid_paise::text,due_date,status',
          'id,school_id,student_id,invoice_number,title,amount_paise::text,paid_paise::text,due_date,status'].includes(url.searchParams.get('select'))) {
          return Response.json([
            { amount_paise: 500000, paid_paise: 500000, due_date: '2026-10-01', status: 'paid' },
            { amount_paise: 750000, paid_paise: 250000, due_date: '2026-11-01', status: 'partial' },
            { amount_paise: 400000, paid_paise: 0, due_date: '2026-11-10', status: 'unpaid' },
          ].map((row, i) => ({ ...row, id: 'iv-'+i, school_id: school, student_id: 's1',
            invoice_number: 'INV-R-' + i, title: 'Invoice ' + i })), { headers: { 'content-range': '0-2/3' } });
        }
        return Response.json([
          {
            id: 'inv-1',
            student_id: 's1',
            invoice_number: 'INV-2026-001',
            title: 'Term 1 Tuition Fee',
            due_date: '2026-11-01',
            amount_paise: 750000,
            paid_paise: 250000,
            status: 'partial',
            school_id: school,
            student: { display_name: 'Aarav Sharma', registration_number: 'BC-2026-001', school_id: school },
          },
        ], { headers: { 'content-range': '0-0/1' } });
      }
      if (url.pathname === '/fee_payments') {
        return Response.json([
          { amount_paise: 500000, payment_method: 'upi', status: 'settled' },
          { amount_paise: 250000, payment_method: 'card', status: 'settled' },
        ], { headers: { 'content-range': '0-1/2' } });
      }

      // Exam queries
      if (url.pathname === '/marks_sheets') {
        return Response.json([
          { id: 'sheet-1', is_published: true, max_marks: 100, passing_marks: 40 },
          { id: 'sheet-2', is_published: false, max_marks: 50, passing_marks: 20 },
        ]);
      }
      if (url.pathname === '/marks_entries') {
        if (!url.searchParams.get('select')?.includes('exam_name')) {
          return Response.json([
            { marks_obtained: 85, marks_sheet: { school_id: school, max_marks: 100, passing_marks: 40 } },
            { marks_obtained: 35, marks_sheet: { school_id: school, max_marks: 100, passing_marks: 40 } },
            { marks_obtained: 45, marks_sheet: { school_id: school, max_marks: 50, passing_marks: 20 } },
          ]);
        }
        return Response.json([
          {
            id: 'entry-1',
            student_id: 's1',
            marks_obtained: 85,
            student: { display_name: 'Aarav Sharma', registration_number: 'BC-2026-001', school_id: school },
            sheet: {
              id: 'sheet-1',
              exam_name: 'Midterm Physics',
              subject_code: 'PHY-10',
              exam_date: '2026-10-15',
              max_marks: 100,
              passing_marks: 40,
              is_published: true,
              school_id: school,
              section: { name: 'Section A', school_id: school, classroom: { name: 'Grade 10', school_id: school } },
            },
          },
        ]);
      }

      // Staff queries
      if (url.pathname === '/staff_profiles') {
        return Response.json([
          { profile_id: 'p1', display_name: 'Devika Nair', employee_code: 'EMP-01', department: 'Science', is_active: true, school_id: school },
          { profile_id: 'p2', display_name: 'Rohan Gupta', employee_code: 'EMP-02', department: 'Mathematics', is_active: false, school_id: school },
        ]);
      }
      if (url.pathname === '/teacher_assignments') {
        return Response.json([
          { id: 'ta-1', teacher_profile_id: 'p1', school_id: school },
          { id: 'ta-2', teacher_profile_id: 'p1', school_id: school },
        ]);
      }

      return Response.json([]);
    },
  });

  const getStaffAccess = async () => ({
    role,
    schoolName: 'Brightcamp Academy',
    context: {
      userId: 'user-admin',
      schoolId: school,
      role,
      permissions,
      membershipStatus: 'active',
      reauthenticatedAt: 1000,
    },
  });

  const staffClient = async () => client;
  const accountantTotals = loadReportDependency('src/lib/services/accountant-render-totals.ts', {
    'server-only': {}, react: { cache: fn => {
      const memo = new Map();
      return key => {
        if (!memo.has(key)) memo.set(key, fn(key));
        return memo.get(key);
      };
    } }, '../staff/server': { staffClient },
    './finance-report-calculation': financeCalculation,
  });

  const workspaceModule = { exports: {} };
  new Function('require', 'module', 'exports', workspaceSource)(
    specifier => {
      if (specifier === 'server-only') return {};
      if (specifier === '../auth/authorization') {
        return {
          evaluatePermission: (context, permission) => ({
            allowed: context.permissions.includes(permission),
          }),
        };
      }
      if (specifier === '../staff/server') return { getStaffAccess, getAccountantRenderAccess: getStaffAccess, staffClient };
      if (specifier === './accountant-render-totals') return accountantTotals;
      if (specifier === './report-fields') return fieldsModule.exports;
      if (specifier === './finance-report-calculation') return financeCalculation;
      if (specifier === './fee-fields') return { formatPaise: fieldsModule.exports.formatPaise };
      throw new Error(`Unexpected import: ${specifier}`);
    },
    workspaceModule,
    workspaceModule.exports
  );

  const actionsModule = { exports: {} };
  new Function('require', 'module', 'exports', actionsSource)(
    specifier => {
      if (specifier === '@/lib/services/report-workspace') return workspaceModule.exports;
      throw new Error(`Unexpected import: ${specifier}`);
    },
    actionsModule,
    actionsModule.exports
  );

  return {
    calls, snapshots,
    workspace: workspaceModule.exports,
    actions: actionsModule.exports,
  };
}

// ---------------------------------------------------------------------------
// TEST 1: Currency, percentage, and date formatters
// ---------------------------------------------------------------------------
test('formatPaise, formatPercentage, and formatReportDate correctly handle Indian monetary and date values', () => {
  const { formatPaise, formatPercentage, formatReportDate } = fieldsModule.exports;

  assert.equal(formatPaise(0), '₹0.00');
  assert.equal(formatPaise(125000), '₹1,250.00');
  assert.equal(formatPaise(100000000), '₹10,00,000.00');
  assert.equal(formatPaise(-45050), '-₹450.50');
  assert.equal(formatPaise(NaN), '₹0.00');

  // Exact BigInt and MAX_SAFE_INTEGER boundary checks
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  // 9,007,199,254,740,991 paise = 90,071,992,547,409 rupees and 91 paise
  assert.equal(formatPaise(maxSafe), '₹9,00,71,99,25,47,409.91');
  // Value beyond MAX_SAFE_INTEGER
  const beyondMaxSafe = maxSafe + 1000n; // 9007199254741991n
  assert.equal(formatPaise(beyondMaxSafe), '₹9,00,71,99,25,47,419.91');
  // String bigint input
  assert.equal(formatPaise('9007199254740991'), '₹9,00,71,99,25,47,409.91');

  assert.equal(formatPercentage(0), '0.0%');
  assert.equal(formatPercentage(85.67), '85.7%');
  assert.equal(formatPercentage(100), '100.0%');

  assert.equal(formatReportDate('2026-11-15'), '15 Nov 2026');
  assert.equal(formatReportDate(null), '—');
  assert.equal(formatReportDate(''), '—');
});

// ---------------------------------------------------------------------------
// TEST 2: Base reports.read access control
// ---------------------------------------------------------------------------
test('readReportsWorkspace denies access when reports.read is missing for an Accountant', async () => {
  const { workspace } = setupReportWorkspace({
    role: 'accountant',
    permissions: ['fees.read'], // missing reports.read
  });

  const res = await workspace.readReportsWorkspace(form({ category: 'finance' }));
  assert.equal(res.kind, 'denied');
  assert.match(res.reason, /permission/i);
});

// ---------------------------------------------------------------------------
// TEST 3: Category-specific permission gates
// ---------------------------------------------------------------------------
test('readReportsWorkspace enforces granular underlying data permissions per category', async () => {
  // User has reports.read, but lacks specific underlying data permissions
  const { workspace } = setupReportWorkspace({
    permissions: ['reports.read'], // missing students.read, attendance.read, fees.read, marks.read, staff.read
  });

  const enrollmentRes = await workspace.readReportsWorkspace(form({ category: 'enrollment' }));
  assert.equal(enrollmentRes.kind, 'denied');
  assert.match(enrollmentRes.reason, /students\.read/);

  const attendanceRes = await workspace.readReportsWorkspace(form({ category: 'attendance' }));
  assert.equal(attendanceRes.kind, 'denied');
  assert.match(attendanceRes.reason, /attendance\.read/);

  const financeRes = await workspace.readReportsWorkspace(form({ category: 'finance' }));
  assert.equal(financeRes.kind, 'denied');
  assert.match(financeRes.reason, /fees\.read/);

  const examsRes = await workspace.readReportsWorkspace(form({ category: 'exams' }));
  assert.equal(examsRes.kind, 'denied');
  assert.match(examsRes.reason, /marks\.read/);

  const staffRes = await workspace.readReportsWorkspace(form({ category: 'staff' }));
  assert.equal(staffRes.kind, 'denied');
  assert.match(staffRes.reason, /staff\.read/);
});

// ---------------------------------------------------------------------------
// TEST 4: Student enrollment report calculations and pagination
// ---------------------------------------------------------------------------
test('enrollment report computes true totals across school and returns 25-row paginated records', async () => {
  const { workspace, calls } = setupReportWorkspace();

  const res = await workspace.readReportsWorkspace(form({ category: 'enrollment', page: '1' }));
  assert.equal(res.kind, 'ready');
  assert.equal(res.category, 'enrollment');
  assert.equal(res.enrollmentMetrics.totalStudents, 4);
  assert.equal(res.enrollmentMetrics.activeCount, 2);
  assert.equal(res.enrollmentMetrics.inactiveCount, 1);
  assert.equal(res.enrollmentMetrics.withdrawnCount, 1);
  assert.equal(res.enrollmentMetrics.classDistribution.length > 0, true);

  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0].studentName, 'Aarav Sharma');
  assert.equal(res.rows[0].className, 'Grade 10');
  assert.equal(res.rows[0].sectionName, 'Section A');

  // Verify school_id containment on calls
  assert.ok(calls.length > 0);
  calls.forEach(call => {
    assert.equal(call.searchParams.get('school_id'), 'eq.' + school);
  });
});

// ---------------------------------------------------------------------------
// TEST 5: Attendance report calculations, documented denominator, and name masking
// ---------------------------------------------------------------------------
test('attendance report accurately calculates rates and masks student identities when students.read is absent', async () => {
  // Test with students.read
  const { workspace: authWorkspace } = setupReportWorkspace();
  const authRes = await authWorkspace.readReportsWorkspace(form({ category: 'attendance' }));
  assert.equal(authRes.kind, 'ready');
  assert.equal(authRes.attendanceMetrics.totalRecords, 5);
  assert.equal(authRes.attendanceMetrics.presentCount, 2);
  assert.equal(authRes.attendanceMetrics.lateCount, 1);
  assert.equal(authRes.attendanceMetrics.absentCount, 1);
  assert.equal(authRes.attendanceMetrics.excusedCount, 1);
  assert.equal(authRes.attendanceMetrics.presentRatePercent, 40.0); // 2/5 * 100
  assert.equal(authRes.attendanceMetrics.effectiveRatePercent, 60.0); // (2+1)/5 * 100
  assert.match(authRes.attendanceMetrics.denominatorNote, /recorded attendance sessions/i);
  assert.equal(authRes.rows[0].studentName, 'Aarav Sharma');

  // Test without students.read -> student name and registration must be masked
  const { workspace: maskedWorkspace } = setupReportWorkspace({
    permissions: ['reports.read', 'attendance.read'],
  });
  const maskedRes = await maskedWorkspace.readReportsWorkspace(form({ category: 'attendance' }));
  assert.equal(maskedRes.kind, 'ready');
  assert.equal(maskedRes.rows[0].studentName, undefined);
  assert.equal(maskedRes.rows[0].registrationNumber, undefined);
});

// ---------------------------------------------------------------------------
// TEST 6: Finance report integer paise accuracy and settled payments revenue
// ---------------------------------------------------------------------------
test('finance report computes integer paise totals and only settled receipts as collected revenue', async () => {
  const { workspace } = setupReportWorkspace();

  const res = await workspace.readReportsWorkspace(form({ category: 'finance' }));
  assert.equal(res.kind, 'ready');
  assert.equal(res.category, 'finance');

  // Invoices: 500,000 + 750,000 + 400,000 = 1,650,000 paise (₹16,500.00)
  assert.equal(res.financeMetrics.totalBilledPaise, '1650000');
  // Settled Payments: 500,000 (upi) + 250,000 (card) = 750,000 paise (₹7,500.00)
  assert.equal(res.financeMetrics.totalCollectedPaise, '750000');
  // Outstanding is the sum of the two unpaid invoice balances.
  assert.equal(res.financeMetrics.outstandingPaise, '900000');
  // The school has no verified timezone.
  assert.equal(res.financeMetrics.overduePaise, null);

  // Method breakdown
  assert.equal(res.financeMetrics.methodBreakdown.length, 2);
  const upi = res.financeMetrics.methodBreakdown.find(m => m.method === 'upi');
  assert.equal(upi.totalPaise, '500000');
  assert.equal(upi.count, 1);

  // Rows check
  assert.equal(res.rows[0].invoiceNumber, 'INV-2026-001');
  assert.equal(res.rows[0].amountPaise, '750000');
  assert.equal(res.rows[0].balancePaise, '500000');
});

test('Accountant render totals preserve scoped invoice and settled payment totals', async () => {
  const { workspace, calls, snapshots } = setupReportWorkspace({
    role: 'accountant', permissions: ['reports.read', 'fees.read', 'receipts.read'],
  });
  const result = await workspace.readReportsWorkspace(form({ category: 'finance' }), true);
  assert.equal(result.kind, 'ready');
  assert.equal(result.financeMetrics.totalBilledPaise, '1650000');
  assert.equal(result.financeMetrics.totalCollectedPaise, '750000');
  const financialReads = calls.filter(url => ['/fee_invoices', '/fee_payments'].includes(url.pathname));
  assert.deepEqual(financialReads, []);
  assert.deepEqual(snapshots.sort(), ['invoices', 'settled_payments']);
  assert.equal(result.totalRows, 3);
  assert.equal(result.rows.length, 3);
});

test('Accountant snapshot pagination proves a next page without an exact-count read', async () => {
  const { workspace, snapshots } = setupReportWorkspace({
    role: 'accountant', permissions: ['reports.read', 'fees.read', 'receipts.read'],
    snapshotInvoiceCount: 26,
  });
  const result = await workspace.readReportsWorkspace(form({ category: 'finance' }), true);
  assert.equal(result.kind, 'ready');
  assert.equal(result.totalRows, 26);
  assert.equal(result.rows.length, 25);
  assert.equal(result.hasNext, true);
  assert.equal(snapshots.filter(x => x === 'invoices').length, 1);
});

test('Accountant snapshot overflow does not display incomplete finance totals', async () => {
  const { workspace } = setupReportWorkspace({
    role: 'accountant', permissions: ['reports.read', 'fees.read', 'receipts.read'],
    snapshotOverflow: true,
  });
  const result = await workspace.readReportsWorkspace(form({ category: 'finance' }), true);
  assert.equal(result.kind, 'error');
  assert.match(result.message, /complete records/i);
});

test('finance totals reject query failures, missing counts, server caps, and incomplete pages', () => {
  const { calculateFinanceReport, checkedFinanceRows } = financeCalculation;
  const empty = { data: [], count: 0, error: null };
  assert.equal(calculateFinanceReport(empty, empty, null).totalCollectedPaise, '0');
  assert.throws(() => calculateFinanceReport(empty, { ...empty, error: {} }, null));
  assert.throws(() => calculateFinanceReport({ ...empty, count: null }, empty, null));
  assert.throws(() => calculateFinanceReport({ ...empty, count: 1001, data: Array(1000).fill({}) }, empty, null));
  assert.throws(() => checkedFinanceRows({ ...empty, count: 51, data: [{}] }, 25, 26));
});

test('an Admin without reports.read cannot load finance data through the retained Staff boundary', async () => {
  const { workspace, calls } = setupReportWorkspace({ permissions: ['fees.read', 'receipts.read'] });
  const result = await workspace.readReportsWorkspace(form({ category: 'finance' }));
  assert.equal(result.kind, 'denied');
  assert.deepEqual(calls, []);
});

test('finance keeps exact paise, invoice-level balances, and unknown payment methods separate', () => {
  const { calculateFinanceReport } = financeCalculation;
  const invoices = { data: [{ amount_paise: '9007199254740993', paid_paise: '1', due_date: '2026-08-12', status: 'partial' }], count: 1, error: null };
  const payments = { data: [{ amount_paise: '2', payment_method: null, status: 'settled' }], count: 1, error: null };
  const report = calculateFinanceReport(invoices, payments, '2026-08-13');
  assert.equal(report.totalBilledPaise, '9007199254740993');
  assert.equal(report.outstandingPaise, '9007199254740992');
  assert.equal(report.overduePaise, '9007199254740992');
  assert.deepEqual(report.methodBreakdown, [{ method: 'unknown', count: 1, totalPaise: '2', sharePercent: 100 }]);
  assert.throws(() => calculateFinanceReport(invoices, {
    ...payments, data: [{ ...payments.data[0], amount_paise: Number.MAX_SAFE_INTEGER + 1 }],
  }, null));
});

test('overdue changes at school-local midnight and is withheld without a verified timezone', () => {
  const { calculateFinanceReport, schoolCalendarDate } = financeCalculation;
  const now = new Date('2026-08-12T18:30:00Z');
  const invoices = { data: [{ amount_paise: '12', paid_paise: '2', due_date: '2026-08-12', status: 'partial' }], count: 1, error: null };
  const payments = { data: [], count: 0, error: null };
  assert.equal(schoolCalendarDate(now, 'Asia/Kolkata'), '2026-08-13');
  assert.equal(schoolCalendarDate(now, 'America/New_York'), '2026-08-12');
  assert.equal(schoolCalendarDate(now, 'invalid'), null);
  assert.equal(calculateFinanceReport(invoices, payments, schoolCalendarDate(now, 'Asia/Kolkata')).overduePaise, '10');
  assert.equal(calculateFinanceReport(invoices, payments, schoolCalendarDate(now, 'America/New_York')).overduePaise, '0');
  assert.equal(calculateFinanceReport(invoices, payments, schoolCalendarDate(now, null)).overduePaise, null);
});

// ---------------------------------------------------------------------------
// TEST 7: Exams report passing criteria and student performance
// ---------------------------------------------------------------------------
test('exams report computes passing rate based on passing_marks and masks identities without students.read', async () => {
  const { workspace } = setupReportWorkspace();

  const res = await workspace.readReportsWorkspace(form({ category: 'exams' }));
  assert.equal(res.kind, 'ready');
  assert.equal(res.category, 'exams');

  assert.equal(res.examMetrics.totalExams, 2);
  assert.equal(res.examMetrics.publishedExams, 1);
  assert.equal(res.examMetrics.totalEntries, 3);
  // Entries: 85 >= 40 (pass), 35 < 40 (fail), 45 >= 20 (pass) -> 2 passing
  assert.equal(res.examMetrics.passingEntries, 2);
  assert.equal(Math.round(res.examMetrics.passRatePercent), 67); // 2/3 * 100

  assert.equal(res.rows[0].examName, 'Midterm Physics');
  assert.equal(res.rows[0].marksObtained, 85);
  assert.equal(res.rows[0].isPassing, true);
});

// ---------------------------------------------------------------------------
// TEST 8: Staff report department and assignment metrics
// ---------------------------------------------------------------------------
test('staff report tallies active faculty and teaching assignment distribution', async () => {
  const { workspace } = setupReportWorkspace();

  const res = await workspace.readReportsWorkspace(form({ category: 'staff' }));
  assert.equal(res.kind, 'ready');
  assert.equal(res.category, 'staff');

  assert.equal(res.staffMetrics.totalStaff, 2);
  assert.equal(res.staffMetrics.activeStaff, 1);
  assert.equal(res.staffMetrics.inactiveStaff, 1);
  assert.equal(res.staffMetrics.totalTeacherAssignments, 2);
  assert.equal(res.staffMetrics.departmentBreakdown.length, 2);

  assert.equal(res.rows[0].displayName, 'Devika Nair');
  assert.equal(res.rows[0].assignedSectionsCount, 2);
});

// ---------------------------------------------------------------------------
// TEST 9: Input sanitization and invalid query handling
// ---------------------------------------------------------------------------
test('readReportsWorkspace returns kind invalid on malformed filter inputs', async () => {
  const { workspace } = setupReportWorkspace();

  // Invalid date range (end before start)
  const badDateRes = await workspace.readReportsWorkspace(
    form({ category: 'attendance', dateFrom: '2026-11-20', dateTo: '2026-11-10' })
  );
  assert.equal(badDateRes.kind, 'invalid');

  // Invalid UUID
  const badUuidRes = await workspace.readReportsWorkspace(
    form({ category: 'enrollment', classId: 'not-a-valid-uuid' })
  );
  assert.equal(badUuidRes.kind, 'invalid');

  // Invalid Page
  const badPageRes = await workspace.readReportsWorkspace(
    form({ category: 'enrollment', page: '-5' })
  );
  assert.equal(badPageRes.kind, 'invalid');
});

// ---------------------------------------------------------------------------
// TEST 10: Multi-tenant boundary and foreign option rejection
// ---------------------------------------------------------------------------
test('readReportsWorkspace rejects non-tenant classes and sections', async () => {
  const { workspace } = setupReportWorkspace();

  // Valid UUID format, but does not belong to school options
  const unownedUuid = '99999999-9999-4999-8999-999999999999';
  const foreignRes = await workspace.readReportsWorkspace(
    form({ category: 'enrollment', classId: unownedUuid })
  );
  assert.equal(foreignRes.kind, 'invalid');
  assert.match(foreignRes.message, /does not exist in this school/i);
});

// ---------------------------------------------------------------------------
// TEST 11: Export lock and architectural notice
// ---------------------------------------------------------------------------
test('readReportsWorkspace surfaces export locked notice to prevent client-side bypass', async () => {
  const { workspace } = setupReportWorkspace();

  const res = await workspace.readReportsWorkspace(form({ category: 'finance' }));
  assert.equal(res.kind, 'ready');
  assert.match(res.exportNotice, /reports\.export.*not currently deployed/i);
  assert.match(res.exportNotice, /view-only mode/i);
});

// ---------------------------------------------------------------------------
// TEST 12: filterReports server action delegation
// ---------------------------------------------------------------------------
test('filterReports server action delegates cleanly to report workspace query', async () => {
  const { actions } = setupReportWorkspace();

  const previous = { kind: 'ready', category: 'enrollment' };
  const res = await actions.filterReports(previous, form({ category: 'enrollment' }));
  assert.equal(res.kind, 'ready');
  assert.equal(res.category, 'enrollment');
});
