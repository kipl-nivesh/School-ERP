import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// In-memory module loader follows existing verification convention.
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
  SchoolAdminService,
  TeacherService,
  AccountantService,
  StudentPortalService,
  ParentPortalService,
} = await import(moduleURL('src/lib/services/development-adapter.ts'));

const NOW = Date.now();
let checks = 0;
function test(name, run) {
  run();
  checks++;
  console.log('PASS [Dashboard Interactions]: ' + name);
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
// Phase 2A: School Admin Dashboard Interactions
// =============================================================================

test('Admin: Overview metrics return aggregate school statistics', () => {
  const res = SchoolAdminService.getOverviewMetrics(adminContext);
  assert.equal(res.success, true);
  assert.ok(res.data.totalStudents >= 4);
  assert.ok(res.data.totalStaff >= 3);
  assert.ok(res.data.totalClasses >= 2);
  assert.ok(res.data.totalFeeCollectedPaise > 0);
});

test('Admin: Student directory supports search, class filter, and pagination', () => {
  const allRes = SchoolAdminService.listStudents(adminContext, { page: 1, pageSize: 2 });
  assert.equal(allRes.success, true);
  assert.equal(allRes.data.items.length, 2);
  assert.ok(allRes.data.totalPages >= 2);

  // Search by name
  const searchRes = SchoolAdminService.listStudents(adminContext, { search: 'Aarav' });
  assert.equal(searchRes.success, true);
  assert.equal(searchRes.data.items.length, 1);
  assert.equal(searchRes.data.items[0].fullName, 'Aarav Sharma');

  // Filter by class
  const filterRes = SchoolAdminService.listStudents(adminContext, { filter: 'cls-10' });
  assert.equal(filterRes.success, true);
  assert.ok(filterRes.data.items.every(s => s.classId === 'cls-10'));
});

test('Admin: Student admission validates input, generates sequential admission/roll numbers', () => {
  const admissionInput = {
    fullName: 'Rohan Deshmukh',
    dateOfBirth: '2011-03-12',
    gender: 'male',
    classId: 'cls-10',
    sectionId: 'sec-10a',
    guardianName: 'Anil Deshmukh',
    guardianPhone: '+91 98765 12345',
    guardianEmail: 'anil.deshmukh@example.invalid',
  };

  const res = SchoolAdminService.createStudentAdmission(adminContext, admissionInput);
  assert.equal(res.success, true);
  assert.equal(res.data.fullName, 'Rohan Deshmukh');
  assert.ok(res.data.admissionNumber.startsWith('ADM-2026-'));
  assert.ok(res.data.rollNumber.startsWith('10-A-'));

  // Invalid input fails closed
  const badPhone = SchoolAdminService.createStudentAdmission(adminContext, { ...admissionInput, guardianPhone: 'bad' });
  assert.equal(badPhone.success, false);
});

test('Admin: Staff directory supports search and role filter', () => {
  const res = SchoolAdminService.listStaff(adminContext, { search: 'Pooja' });
  assert.equal(res.success, true);
  assert.equal(res.data.items.length, 1);
  assert.equal(res.data.items[0].fullName, 'Pooja Verma');

  const filterRes = SchoolAdminService.listStaff(adminContext, { filter: 'accountant' });
  assert.equal(filterRes.success, true);
  assert.equal(filterRes.data.items[0].role, 'accountant');
});

test('Admin: Staff creation validates duplicate email and generates employee code', () => {
  const staffInput = {
    fullName: 'Sunil Gavaskar',
    email: 'sunil.gavaskar@school.invalid',
    phone: '+91 98111 55566',
    role: 'teacher',
    department: 'Physical Education',
    designation: 'Head Coach',
    qualification: 'M.P.Ed.',
  };

  const res = SchoolAdminService.createStaffMember(adminContext, staffInput);
  assert.equal(res.success, true);
  assert.ok(res.data.employeeCode.startsWith('EMP-TEA-'));

  // Duplicate email rejected
  const dupRes = SchoolAdminService.createStaffMember(adminContext, staffInput);
  assert.equal(dupRes.success, false);
  assert.equal(dupRes.code, 'DUPLICATE_EMAIL');
});

test('Admin: Class creation and section addition prevent duplicate sections', () => {
  const res = SchoolAdminService.createClass(adminContext, 'Class 12', 12, 'A');
  assert.equal(res.success, true);
  assert.equal(res.data.gradeLevel, 12);

  // Add section B
  const addSec = SchoolAdminService.createClass(adminContext, 'Class 12', 12, 'B');
  assert.equal(addSec.success, true);
  assert.equal(addSec.data.sections.length, 2);

  // Duplicate section rejected
  const dupSec = SchoolAdminService.createClass(adminContext, 'Class 12', 12, 'A');
  assert.equal(dupSec.success, false);
  assert.equal(dupSec.code, 'DUPLICATE_SECTION');
});

test('Admin: Teacher assignment maps educator to class, section, and periods', () => {
  const res = SchoolAdminService.assignTeacher(adminContext, 'stf-tch-1', 'cls-6', 'sec-6b', 'Mathematics', 4);
  assert.equal(res.success, true);
  assert.equal(res.data.teacherName, 'Pooja Verma');
  assert.equal(res.data.periodsPerWeek, 4);
});

test('Admin: Attendance monitor aggregates school roll and class drill-down', () => {
  const res = SchoolAdminService.getAttendanceSummary(adminContext, '2026-11-05');
  assert.equal(res.success, true);
  assert.ok(res.data.presentCount >= 1);
  assert.ok(res.data.overallPercentage > 0);
  assert.ok(res.data.classBreakdown.length >= 1);
});

test('Admin: School settings update and audit trail tracking', () => {
  const res = SchoolAdminService.updateSchoolSettings(adminContext, {
    emergencyContact: '+91 98888 77777',
  });
  assert.equal(res.success, true);
  assert.equal(res.data.emergencyContact, '+91 98888 77777');

  const auditRes = SchoolAdminService.listAuditTrail(adminContext);
  assert.equal(auditRes.success, true);
  assert.ok(auditRes.data.items.some(a => a.eventType === 'school_settings_updated'));
});

// =============================================================================
// Phase 2B: Teacher Dashboard Interactions
// =============================================================================

test('Teacher: Assigned classes list and student roster scoping', () => {
  const classesRes = TeacherService.getAssignedClasses(teacherContext, 'stf-tch-1');
  assert.equal(classesRes.success, true);
  assert.ok(classesRes.data.length >= 1);

  const rosterRes = TeacherService.getStudentRoster(teacherContext, 'cls-10', 'sec-10a', 'stf-tch-1');
  assert.equal(rosterRes.success, true);
  assert.ok(rosterRes.data.length >= 1);

  // Unassigned class scoping rejected
  const unassignedRes = TeacherService.getStudentRoster(teacherContext, 'cls-99', 'sec-99', 'stf-tch-1');
  assert.equal(unassignedRes.success, false);
  assert.equal(unassignedRes.code, 'UNAUTHORIZED_SCOPE');
});

test('Teacher: Attendance recording for assigned section', () => {
  const entries = [
    { studentId: 'stu-101', rollNumber: '10-A-01', studentName: 'Aarav Sharma', status: 'present' },
    { studentId: 'stu-102', rollNumber: '10-A-02', studentName: 'Diya Patel', status: 'present' },
  ];
  const res = TeacherService.recordAttendance(teacherContext, 'cls-10', 'sec-10a', '2026-11-06', entries, 'stf-tch-1');
  assert.equal(res.success, true);
  assert.equal(res.data.savedCount, 2);
});

test('Teacher: Homework creation and listing', () => {
  const res = TeacherService.createHomework(
    teacherContext,
    'cls-10',
    'sec-10a',
    'Mathematics',
    'Probability Exercise 15.1',
    'Solve all textbook problems.',
    '2026-11-12',
    'stf-tch-1'
  );
  assert.equal(res.success, true);
  assert.equal(res.data.title, 'Probability Exercise 15.1');

  const listRes = TeacherService.listHomework(teacherContext, 'cls-10', 'sec-10a');
  assert.equal(listRes.success, true);
  assert.ok(listRes.data.some(h => h.title === 'Probability Exercise 15.1'));
});

test('Teacher: Marks draft recording and score validation', () => {
  // Valid marks draft
  const validDraft = TeacherService.recordMarksDraft(
    teacherContext,
    'cls-10',
    'sec-10a',
    'Unit Test 1',
    'Mathematics',
    50,
    [
      { studentId: 'stu-101', marksObtained: 46 },
      { studentId: 'stu-102', marksObtained: 49 },
    ],
    'stf-tch-1'
  );
  assert.equal(validDraft.success, true);
  assert.equal(validDraft.data.isPublished, false);

  // Score exceeding maxMarks fails closed
  const invalidScore = TeacherService.recordMarksDraft(
    teacherContext,
    'cls-10',
    'sec-10a',
    'Unit Test 1',
    'Mathematics',
    50,
    [{ studentId: 'stu-101', marksObtained: 55 }], // > 50
    'stf-tch-1'
  );
  assert.equal(invalidScore.success, false);
  assert.equal(invalidScore.code, 'INVALID_SCORE');
});

test('Teacher: Marks publication requires permission and assigns publishedAt', () => {
  const res = TeacherService.publishMarks(teacherContext, 'ms-01', 'stf-tch-1');
  assert.equal(res.success, true);
  assert.equal(res.data.isPublished, true);
  assert.ok(res.data.publishedAt);
});

test('Teacher: Weekly timetable returns periods and rooms', () => {
  const res = TeacherService.getTeacherTimetable(teacherContext, 'stf-tch-1');
  assert.equal(res.success, true);
  assert.ok(res.data.days.length >= 5);
});

// =============================================================================
// Phase 2C: Accountant Dashboard Interactions
// =============================================================================

test('Accountant: Financial summary reports totals and aging brackets', () => {
  const res = AccountantService.getFinancialSummary(accountantContext);
  assert.equal(res.success, true);
  assert.ok(res.data.totalBilledPaise > 0);
  assert.ok(res.data.totalCollectedPaise > 0);
  assert.ok(res.data.agingSummary.currentPaise >= 0);
});

test('Accountant: Student fee ledger itemizes invoices and settled receipts', () => {
  const res = AccountantService.getStudentLedger(accountantContext, 'stu-101');
  assert.equal(res.success, true);
  assert.equal(res.data.studentName, 'Aarav Sharma');
  assert.ok(res.data.invoices.length >= 1);
  assert.ok(res.data.payments.length >= 1);
  assert.ok(res.data.balancePaise >= 0);
});

test('Accountant: Payment collection issues receipt and enforces idempotency', () => {
  const idempotencyKey = 'unique-payment-ref-' + Date.now();
  const paymentInput = {
    studentId: 'stu-101',
    invoiceId: 'inv-101',
    amountPaise: 500000, // ₹5,000.00
    paymentMethod: 'upi',
    transactionReference: 'UPI/20261105/984123',
    notes: 'Q3 partial fee payment',
    idempotencyKey,
  };

  const res = AccountantService.collectPayment(accountantContext, paymentInput);
  assert.equal(res.success, true);
  assert.ok(res.data.receiptNumber.startsWith('RCP-2026-'));
  assert.equal(res.data.status, 'settled');

  // Duplicate idempotency key rejected
  const dupPayment = AccountantService.collectPayment(accountantContext, paymentInput);
  assert.equal(dupPayment.success, false);
  assert.equal(dupPayment.code, 'DUPLICATE_PAYMENT');
});

test('Accountant: Operating expense recording generates voucher', () => {
  const res = AccountantService.recordExpense(
    accountantContext,
    'maintenance',
    'Apex Facilities Ltd',
    1200000, // ₹12,000.00
    'bank_transfer',
    'Campus electrical repair'
  );
  assert.equal(res.success, true);
  assert.ok(res.data.voucherNumber.startsWith('EXP-2026-'));
});

// =============================================================================
// Phase 2D: Student Portal Scoping
// =============================================================================

test('Student: Identity overview scoped to authenticated student', () => {
  const res = StudentPortalService.getProfileOverview(studentContext, 'stu-101');
  assert.equal(res.success, true);
  assert.equal(res.data.fullName, 'Aarav Sharma');
  assert.equal(res.data.rollNumber, '10-A-01');

  // Cross-student identity snooping denied
  const snoopRes = StudentPortalService.getProfileOverview(studentContext, 'stu-201');
  assert.equal(snoopRes.success, false);
  assert.equal(snoopRes.code, 'UNAUTHORIZED_SCOPE');
});

test('Student: Exam results include grades and teacher feedback', () => {
  const res = StudentPortalService.getExamResults(studentContext, 'stu-101');
  assert.equal(res.success, true);
  assert.ok(res.data.length >= 1);
  assert.equal(res.data[0].subject, 'Mathematics');
  assert.equal(res.data[0].grade, 'A1');
});

// =============================================================================
// Phase 2E: Parent Portal Child Switching & Verified Scoping
// =============================================================================

test('Parent: Linked children list returns verified relationships', () => {
  const res = ParentPortalService.getLinkedChildren(parentContext, 'parent-rajesh-1');
  assert.equal(res.success, true);
  assert.equal(res.data.length, 2);
  assert.equal(res.data[0].fullName, 'Aarav Sharma');
  assert.equal(res.data[1].fullName, 'Ananya Sharma');
});

test('Parent: Child switching updates active child academic report', () => {
  // Child 1: Aarav (Class 10-A)
  const child1Report = ParentPortalService.getChildAcademicReport(parentContext, 'parent-rajesh-1', 'stu-101');
  assert.equal(child1Report.success, true);
  assert.equal(child1Report.data.student.fullName, 'Aarav Sharma');
  assert.equal(child1Report.data.student.className, 'Class 10');

  // Child 2: Ananya (Class 6-B)
  const child2Report = ParentPortalService.getChildAcademicReport(parentContext, 'parent-rajesh-1', 'stu-201');
  assert.equal(child2Report.success, true);
  assert.equal(child2Report.data.student.fullName, 'Ananya Sharma');
  assert.equal(child2Report.data.student.className, 'Class 6');

  // Unlinked child denied
  const unlinkedChild = ParentPortalService.getChildAcademicReport(parentContext, 'parent-rajesh-1', 'stu-999');
  assert.equal(unlinkedChild.success, false);
});

// =============================================================================
// Server-Side Authorization Boundary Checks
// =============================================================================

test('Server-side authorization: Teacher cannot manage admissions or fees', () => {
  const admissionAttempt = SchoolAdminService.createStudentAdmission(teacherContext, {
    fullName: 'Intruder',
    dateOfBirth: '2011-01-01',
    gender: 'male',
    classId: 'cls-10',
    sectionId: 'sec-10a',
    guardianName: 'Guardian',
    guardianPhone: '+91 98765 43210',
    guardianEmail: 'g@example.com',
  });
  assert.equal(admissionAttempt.success, false);
  assert.equal(admissionAttempt.code, 'PERMISSION_DENIED');

  const paymentAttempt = AccountantService.collectPayment(teacherContext, {
    studentId: 'stu-101',
    amountPaise: 100000,
    paymentMethod: 'cash',
    transactionReference: 'REF',
    idempotencyKey: 'key-1',
  });
  assert.equal(paymentAttempt.success, false);
  assert.equal(paymentAttempt.code, 'PERMISSION_DENIED');
});

test('Server-side authorization: Null or untrusted context denied', () => {
  const unauth = SchoolAdminService.getOverviewMetrics(null);
  assert.equal(unauth.success, false);
  assert.equal(unauth.code, 'PERMISSION_DENIED');
});

console.log(`PASS: All ${checks} dashboard interaction and server authorization tests passed successfully.`);
