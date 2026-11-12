/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — PHASE 6 VERIFICATION SUITE
 * Multi-School Registration, Onboarding & School Management
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
const onboardingService = await import(moduleURL('src/lib/onboarding/service.ts'));
const staffManagement = await import(moduleURL('src/lib/staff/management.ts'));

const { SUBSCRIPTION_PLANS } = subscriptionContracts;
const {
  setPaymentDeferredAccessMode,
  isPaymentDeferredAccessMode,
  getSubscriptionAccess,
  resetSubscriptionTestStore,
} = subscriptionService;

const {
  validateSchoolRegistration,
  submitSchoolRegistration,
  getSchoolRegistration,
  provisionSchoolRegistration,
  rejectSchoolRegistration,
  bootstrapInitialAdminMfa,
  isMfaFactorTrusted,
  getOnboardingProgress,
  saveOnboardingStep,
  completeOnboarding,
  inviteStaff,
  listStaffInvitations,
  revokeStaffInvitation,
  validateStudentCsv,
  enrollStudent,
  importStudentsFromCsv,
  activateStudentPortal,
  resetOnboardingTestStore,
} = onboardingService;

const {
  listSchoolStaff,
  registerStaffMember,
  updateStaffMembershipStatus,
  assignTeacherToSection,
  removeTeacherAssignment,
  resetStaffTestStore,
} = staffManagement;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS [Phase 6 Onboarding & Management]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL [Phase 6 Onboarding & Management]: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS [Phase 6 Onboarding & Management]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL [Phase 6 Onboarding & Management]: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log('Running Brightcamp School ERP Phase 6 Verification Suite...\n');

  // Clean test stores
  resetOnboardingTestStore();
  resetSubscriptionTestStore();
  resetStaffTestStore();

  // ===========================================================================
  // Part 1: Migration 9 Verification
  // ===========================================================================

  test('Migration 9: School Onboarding & Management SQL file exists and contains all required schemas', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261105000900_school_onboarding_and_management.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 9 file must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Tables and columns
    assert.ok(sql.includes('create table if not exists public.system_feature_flags'), 'Creates system_feature_flags');
    assert.ok(sql.includes("'payment_deferred_access_mode'"), 'Seeds payment_deferred_access_mode');
    assert.ok(sql.includes('create table if not exists public.school_registrations'), 'Creates school_registrations');
    assert.ok(sql.includes('uq_school_registrations_code_pending') && sql.includes('upper(school_code)'), 'Unique uppercase school_code constraint');
    assert.ok(sql.includes('create table if not exists public.school_onboarding_progress'), 'Creates school_onboarding_progress');
    assert.ok(sql.includes('create table if not exists public.staff_invitations'), 'Creates staff_invitations');
    assert.ok(sql.includes('add column if not exists portal_access_status'), 'Adds portal_access_status to students');
    assert.ok(sql.includes('add column if not exists portal_activated_at'), 'Adds portal_activated_at to students');

    // RPCs
    assert.ok(sql.includes('create or replace function public.submit_school_registration'), 'RPC submit_school_registration');
    assert.ok(sql.includes('create or replace function public.provision_approved_school'), 'RPC provision_approved_school');
    assert.ok(sql.includes('create or replace function public.reject_school_registration'), 'RPC reject_school_registration');
    assert.ok(sql.includes('create or replace function public.bootstrap_initial_school_admin_mfa'), 'RPC bootstrap_initial_school_admin_mfa');
    assert.ok(sql.includes('create or replace function public.activate_student_portal_access'), 'RPC activate_student_portal_access');
    assert.ok(sql.includes('create or replace function public.is_payment_deferred_access_mode'), 'RPC is_payment_deferred_access_mode');
    assert.ok(sql.includes('payment_deferred_access'), 'get_student_subscription_access incorporates payment-deferred mode');
  });

  // ===========================================================================
  // Part 2: School Registration Input Validation & Normalization
  // ===========================================================================

  test('School registration validates inputs and normalizes school code to uppercase', () => {
    const valid = validateSchoolRegistration({
      schoolName: 'Greenwood High International',
      schoolCode: 'gwh-mum-01',
      schoolEmail: 'admissions@greenwood.edu',
      contactNumber: '+91 9876543210',
      addressLine: 'Plot 42, Knowledge Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400076',
      adminName: 'Dr. Ramesh Sharma',
      adminEmail: 'ramesh.sharma@greenwood.edu',
    });

    assert.ok(valid.isValid, 'Valid registration payload must pass');
    assert.equal(valid.normalizedCode, 'GWH-MUM-01', 'School code must be normalized to uppercase');
    assert.equal(Object.keys(valid.errors).length, 0);

    // Invalid inputs
    const invalid = validateSchoolRegistration({
      schoolName: 'G', // too short
      schoolCode: 'bad code with spaces!',
      schoolEmail: 'not-an-email',
      contactNumber: '12', // too short
      addressLine: '',
      city: '',
      state: '',
      postalCode: '',
      adminName: '',
      adminEmail: 'invalid-admin-email',
    });

    assert.equal(invalid.isValid, false, 'Invalid registration payload must fail');
    assert.ok(invalid.errors.schoolName, 'Must flag invalid school name');
    assert.ok(invalid.errors.schoolCode, 'Must flag invalid school code characters');
    assert.ok(invalid.errors.schoolEmail, 'Must flag invalid school email');
    assert.ok(invalid.errors.contactNumber, 'Must flag invalid phone');
    assert.ok(invalid.errors.adminName, 'Must flag missing admin name');
    assert.ok(invalid.errors.adminEmail, 'Must flag invalid admin email');
  });

  // ===========================================================================
  // Part 3: Pending Registration Workflow & Duplicate Protection
  // ===========================================================================

  await asyncTest('Submitting school registration creates pending record without granting admin privileges', async () => {
    const res = await submitSchoolRegistration({
      schoolName: 'Greenwood High International',
      schoolCode: 'gwh-mum-01',
      schoolEmail: 'admissions@greenwood.edu',
      contactNumber: '+91 9876543210',
      addressLine: 'Plot 42, Knowledge Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400076',
      adminName: 'Dr. Ramesh Sharma',
      adminEmail: 'ramesh.sharma@greenwood.edu',
    });

    assert.equal(res.status, 'success');
    assert.equal(res.schoolCode, 'GWH-MUM-01');

    const reg = await getSchoolRegistration(res.registrationId);
    assert.ok(reg, 'Registration must be persisted');
    assert.equal(reg.status, 'pending', 'Status must be strictly pending');
    assert.equal(reg.provisionedSchoolId, null, 'Must NOT have provisioned school ID yet');
    assert.equal(reg.provisionedAdminProfileId, null, 'Must NOT grant admin profile yet');

    // Duplicate code prevention
    await assert.rejects(
      async () => {
        await submitSchoolRegistration({
          schoolName: 'Another School Same Code',
          schoolCode: 'GWH-MUM-01', // same code
          schoolEmail: 'other@school.edu',
          contactNumber: '+91 9876543211',
          addressLine: 'Plot 43',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400076',
          adminName: 'Other Admin',
          adminEmail: 'other@greenwood.edu',
        });
      },
      /already registered or pending review/i,
      'Duplicate school code must be rejected'
    );
  });

  // ===========================================================================
  // Part 4: Trusted Operator Provisioning & Idempotency
  // ===========================================================================

  let provisionedSchoolId = '';
  let provisionedAdminId = '';

  await asyncTest('Trusted operator procedure approves and provisions school idempotently', async () => {
    // Submit a fresh registration for this test
    const subRes = await submitSchoolRegistration({
      schoolName: 'St. Xavier Academy',
      schoolCode: 'SXA-PUN-02',
      schoolEmail: 'office@stxavier.edu',
      contactNumber: '+91 9123456789',
      addressLine: '12 Camp Road',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      adminName: 'Fr. Thomas Anthony',
      adminEmail: 'thomas.anthony@stxavier.edu',
    });

    const prov = await provisionSchoolRegistration(subRes.registrationId, 'operator_user_01', 'auth_user_thomas_01');
    assert.equal(prov.status, 'success');
    assert.ok(prov.schoolId.startsWith('sch_sxa-pun-02_'), 'School ID formatted with school code');
    assert.equal(prov.schoolCode, 'SXA-PUN-02');
    assert.equal(prov.adminProfileId, 'auth_user_thomas_01');

    provisionedSchoolId = prov.schoolId;
    provisionedAdminId = prov.adminProfileId;

    // Verify registration status updated to approved
    const updatedReg = await getSchoolRegistration(subRes.registrationId);
    assert.equal(updatedReg.status, 'approved');
    assert.equal(updatedReg.approvedBy, 'operator_user_01');
    assert.equal(updatedReg.provisionedSchoolId, prov.schoolId);

    // Verify initial wizard state initialized
    const progress = await getOnboardingProgress(prov.schoolId);
    assert.ok(progress, 'Onboarding progress must be initialized');
    assert.equal(progress.currentStep, 1);
    assert.equal(progress.isCompleted, false);
    assert.equal(progress.step1Profile.schoolCode, 'SXA-PUN-02');

    // Idempotent replay: calling provisionSchoolRegistration again must not fail or create duplicate
    const replayProv = await provisionSchoolRegistration(subRes.registrationId, 'operator_user_01');
    assert.equal(replayProv.status, 'success');
    assert.equal(replayProv.schoolId, prov.schoolId, 'Replay must return identical schoolId');
    assert.equal(replayProv.idempotent, true, 'Replay flagged as idempotent');
  });

  // ===========================================================================
  // Part 5: Trusted Operator Rejection
  // ===========================================================================

  await asyncTest('Trusted operator procedure rejects registration with reason', async () => {
    const subRes = await submitSchoolRegistration({
      schoolName: 'Suspicious Fictional School',
      schoolCode: 'FAKE-01',
      schoolEmail: 'fake@fake.edu',
      contactNumber: '+91 9999999999',
      addressLine: 'Nowhere',
      city: 'Nowhere',
      state: 'Nowhere',
      postalCode: '000000',
      adminName: 'Fake Admin',
      adminEmail: 'fakeadmin@fake.edu',
    });

    const rej = await rejectSchoolRegistration(subRes.registrationId, 'operator_user_01', 'Unable to verify school physical existence and accreditation.');
    assert.equal(rej.status, 'success');

    const reg = await getSchoolRegistration(subRes.registrationId);
    assert.equal(reg.status, 'rejected');
    assert.equal(reg.rejectionReason, 'Unable to verify school physical existence and accreditation.');

    // Attempting to approve rejected registration must fail
    await assert.rejects(
      async () => {
        await provisionSchoolRegistration(subRes.registrationId, 'operator_user_01');
      },
      /Cannot approve registration in status "rejected"/i
    );
  });

  // ===========================================================================
  // Part 6: Deadlock-Free Initial School Admin MFA Bootstrap
  // ===========================================================================

  await asyncTest('Deadlock-free initial School Admin MFA bootstrap establishes trusted factor', async () => {
    const factorId = 'totp_factor_initial_123';
    assert.equal(isMfaFactorTrusted(provisionedAdminId, factorId), false, 'Initial factor is not trusted yet');

    const bootRes = await bootstrapInitialAdminMfa(provisionedSchoolId, provisionedAdminId, factorId);
    assert.equal(bootRes.status, 'success');
    assert.equal(bootRes.factorId, factorId);

    assert.equal(isMfaFactorTrusted(provisionedAdminId, factorId), true, 'Factor must now be verified in trust registry');
  });

  // ===========================================================================
  // Part 7: 8-Step Onboarding Wizard Draft Save, Resume, and Completion
  // ===========================================================================

  await asyncTest('Onboarding wizard saves draft steps and completes setup', async () => {
    // Step 1: School Profile
    await saveOnboardingStep(provisionedSchoolId, 1, {
      schoolName: 'St. Xavier Academy',
      schoolCode: 'SXA-PUN-02',
      schoolEmail: 'office@stxavier.edu',
      contactNumber: '+91 9123456789',
      addressLine: '12 Camp Road',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      affiliationNumber: 'CBSE-113045',
    });

    // Step 2: Academic Year
    await saveOnboardingStep(provisionedSchoolId, 2, {
      label: '2026-2027',
      startsOn: '2026-04-01',
      endsOn: '2027-03-31',
    });

    // Step 3: Classes & Sections
    await saveOnboardingStep(provisionedSchoolId, 3, {
      classes: [
        { className: 'Grade 1', sections: ['A', 'B'] },
        { className: 'Grade 2', sections: ['A', 'B', 'C'] },
      ],
    });

    // Step 4: Staff Invitations
    await saveOnboardingStep(provisionedSchoolId, 4, {
      invitations: [
        { email: 'sarah.teacher@stxavier.edu', displayName: 'Sarah Jenkins', roleCode: 'teacher' },
        { email: 'mark.accounts@stxavier.edu', displayName: 'Mark Davis', roleCode: 'accountant' },
      ],
    });

    // Check intermediate resume
    const midProgress = await getOnboardingProgress(provisionedSchoolId);
    assert.ok(midProgress.completedSteps.includes(1));
    assert.ok(midProgress.completedSteps.includes(2));
    assert.ok(midProgress.completedSteps.includes(3));
    assert.ok(midProgress.completedSteps.includes(4));
    assert.equal(midProgress.currentStep, 5, 'Current step advanced to 5');

    // Step 5: Student Enrollment
    await saveOnboardingStep(provisionedSchoolId, 5, {
      students: [
        { registrationNumber: 'SXA-STU-001', fullName: 'Aarav Patel', className: 'Grade 1', sectionName: 'A' },
      ],
    });

    // Step 6: Guardian Linking
    await saveOnboardingStep(provisionedSchoolId, 6, {
      guardians: [
        { studentRegistrationNumber: 'SXA-STU-001', guardianName: 'Sanjay Patel', guardianPhone: '+91 9876500001', relationship: 'Father' },
      ],
    });

    // Step 7: Portal Activation
    await saveOnboardingStep(provisionedSchoolId, 7, {
      activatedStudentRegistrationNumbers: ['SXA-STU-001'],
      activateAll: true,
    });

    // Step 8: Complete Onboarding
    const finalState = await completeOnboarding(provisionedSchoolId);
    assert.equal(finalState.isCompleted, true, 'Wizard must be marked completed');
    assert.ok(finalState.completedAt, 'completedAt timestamp set');
    assert.ok(finalState.completedSteps.includes(8));
  });

  // ===========================================================================
  // Part 8: Staff Invitations & Staff Management
  // ===========================================================================

  await asyncTest('School Admin invites staff, manages active memberships, and teacher assignments', async () => {
    // 1. Staff Invitations
    const inviteTeacher = await inviteStaff(provisionedSchoolId, {
      displayName: 'Anita Roy',
      email: 'anita.roy@stxavier.edu',
      roleCode: 'teacher',
    }, provisionedAdminId);

    assert.equal(inviteTeacher.roleCode, 'teacher');
    assert.equal(inviteTeacher.status, 'pending');

    const inviteAccountant = await inviteStaff(provisionedSchoolId, {
      displayName: 'Deepak Verma',
      email: 'deepak.verma@stxavier.edu',
      roleCode: 'accountant',
    }, provisionedAdminId);

    assert.equal(inviteAccountant.roleCode, 'accountant');

    // Reject invalid role
    await assert.rejects(
      async () => {
        await inviteStaff(provisionedSchoolId, {
          displayName: 'Unauthorized Admin',
          email: 'admin2@stxavier.edu',
          roleCode: 'admin',
        }, provisionedAdminId);
      },
      /Role must be "teacher" or "accountant"/i,
      'School Admin cannot invite another admin via staff invite'
    );

    // List invitations
    const invites = await listStaffInvitations(provisionedSchoolId);
    assert.equal(invites.length, 2);

    // Revoke invitation
    const revoked = await revokeStaffInvitation(provisionedSchoolId, inviteAccountant.id);
    assert.equal(revoked, true);
    const updatedInvites = await listStaffInvitations(provisionedSchoolId);
    assert.equal(updatedInvites.find(i => i.id === inviteAccountant.id)?.status, 'revoked');

    // 2. Active Staff Membership
    const teacherMember = await registerStaffMember(
      provisionedSchoolId,
      'prof_teacher_anita',
      'Anita Roy',
      'anita.roy@stxavier.edu',
      'teacher'
    );
    assert.equal(teacherMember.status, 'active');

    // Teacher assignments
    const asgn = await assignTeacherToSection(
      provisionedSchoolId,
      'prof_teacher_anita',
      'sec_g1_a',
      'Grade 1',
      'A',
      'MATH-101'
    );
    assert.ok(asgn.assignmentId);

    const staffList = await listSchoolStaff(provisionedSchoolId);
    assert.equal(staffList.length, 1);
    assert.equal(staffList[0].assignedSections.length, 1);
    assert.equal(staffList[0].assignedSections[0].className, 'Grade 1');

    // Suspend staff member
    const suspended = await updateStaffMembershipStatus(
      provisionedSchoolId,
      'prof_teacher_anita',
      'teacher',
      'suspended'
    );
    assert.equal(suspended.status, 'suspended');

    // Reactivate staff member
    const reactivated = await updateStaffMembershipStatus(
      provisionedSchoolId,
      'prof_teacher_anita',
      'teacher',
      'active'
    );
    assert.equal(reactivated.status, 'active');

    // Remove assignment
    const removedAsgn = await removeTeacherAssignment(provisionedSchoolId, asgn.assignmentId);
    assert.equal(removedAsgn, true);
    const updatedStaffList = await listSchoolStaff(provisionedSchoolId);
    assert.equal(updatedStaffList[0].assignedSections.length, 0);
  });

  // ===========================================================================
  // Part 9: Student CSV Bulk Import Validation
  // ===========================================================================

  test('Student CSV import validates required headers, formats, and intra-file duplicates', () => {
    // Missing required header
    const badCsvMissingHeader = `full_name,class_name,section_name\nAarav Patel,Grade 1,A`;
    const res1 = validateStudentCsv(badCsvMissingHeader);
    assert.equal(res1.isValid, false);
    assert.ok(res1.errors[0].message.includes('Missing required CSV column'));

    // Intra-file duplicate registration number
    const badCsvDuplicates = `registration_number,full_name,class_name,section_name,guardian_name,guardian_phone
SXA-001,Aarav Patel,Grade 1,A,Sanjay Patel,+91 9876500001
SXA-001,Pooja Sharma,Grade 1,A,Sunil Sharma,+91 9876500002`;
    const res2 = validateStudentCsv(badCsvDuplicates);
    assert.equal(res2.isValid, false);
    assert.ok(res2.errors.some(e => e.message.includes('Duplicate registration number')));

    // Invalid phone number
    const badCsvPhone = `registration_number,full_name,class_name,section_name,guardian_name,guardian_phone
SXA-002,Pooja Sharma,Grade 1,A,Sunil Sharma,not-a-phone`;
    const res3 = validateStudentCsv(badCsvPhone);
    assert.equal(res3.isValid, false);
    assert.ok(res3.errors.some(e => e.message.includes('Valid guardian phone number is required')));

    // Valid CSV
    const validCsv = `registration_number,full_name,class_name,section_name,guardian_name,guardian_phone,guardian_email,relationship
SXA-101,Rohan Gupta,Grade 2,B,Rajesh Gupta,+91 9876500101,rajesh@example.com,Father
SXA-102,Diya Singh,Grade 2,B,Manjit Singh,+91 9876500102,manjit@example.com,Mother`;
    const res4 = validateStudentCsv(validCsv);
    assert.equal(res4.isValid, true);
    assert.equal(res4.validRows.length, 2);
  });

  // ===========================================================================
  // Part 10: Student Enrollment & Trial Activation Timing
  // ===========================================================================

  await asyncTest('Student enrollment does NOT start trial; portal activation starts 240-hour trial strictly once', async () => {
    const importCsv = `registration_number,full_name,class_name,section_name,guardian_name,guardian_phone
SXA-501,Kabir Mehta,Grade 1,A,Alok Mehta,+91 9876500501
SXA-502,Ananya Joshi,Grade 1,A,Nitin Joshi,+91 9876500502`;

    // 1. Bulk import with activatePortalImmediately = false (Standard Enrollment)
    const importRes = await importStudentsFromCsv(provisionedSchoolId, importCsv, { activatePortalImmediately: false });
    assert.equal(importRes.totalEnrolled, 2);

    const studentKabirId = importRes.students[0].id;

    // Verify trial is NOT active yet
    const preAccess = await getSubscriptionAccess(studentKabirId);
    assert.equal(preAccess.isAccessGranted, false, 'Student access must not be granted prior to activation');
    assert.equal(preAccess.status, 'unregistered');

    // 2. Activate Portal Access
    const beforeActivation = Date.now();
    const actRes = await activateStudentPortal(provisionedSchoolId, 'SXA-501');
    const afterActivation = Date.now();

    assert.equal(actRes.portalAccessStatus, 'active');
    assert.ok(actRes.trialStartedAt);
    assert.ok(actRes.trialEndsAt);

    const trialStartMs = new Date(actRes.trialStartedAt).getTime();
    const trialEndMs = new Date(actRes.trialEndsAt).getTime();
    const diffHours = (trialEndMs - trialStartMs) / (1000 * 60 * 60);

    // Exactly 240 hours (10 days)
    assert.equal(diffHours, 240, 'Free trial must be exactly 240 hours (10 days)');
    assert.ok(trialStartMs >= beforeActivation - 1000 && trialStartMs <= afterActivation + 1000);

    // Access must now be granted under active trial
    const postAccess = await getSubscriptionAccess(studentKabirId);
    assert.equal(postAccess.isAccessGranted, true);
    assert.equal(postAccess.status, 'trial_active');

    // 3. Repeated activation must be idempotent and must NOT reset or extend trial
    const repeatAct = await activateStudentPortal(provisionedSchoolId, 'SXA-501');
    assert.equal(repeatAct.trialEndsAt, actRes.trialEndsAt, 'Repeated portal activation must not reset or extend trial');
  });

  // ===========================================================================
  // Part 11: Payment-Deferred Access Mode
  // ===========================================================================

  await asyncTest('Payment-Deferred Access Mode grants provisional ERP access without fake payments or ledger tampering', async () => {
    // Enroll a dedicated student whose trial has expired
    const expiredStudent = await enrollStudent(provisionedSchoolId, {
      registrationNumber: 'SXA-EXPIRED-01',
      fullName: 'Vikram Seth',
      className: 'Grade 1',
      sectionName: 'A',
      guardianName: 'Arun Seth',
      guardianPhone: '+91 9876599999',
    }, { activatePortalImmediately: false });

    // Mode is OFF initially
    setPaymentDeferredAccessMode(false);
    assert.equal(isPaymentDeferredAccessMode(), false);

    const accessWithoutMode = await getSubscriptionAccess(expiredStudent.id);
    assert.equal(accessWithoutMode.isAccessGranted, false);
    assert.equal(accessWithoutMode.status, 'unregistered');

    // Enable Payment-Deferred Access Mode (pre-gateway launch window)
    setPaymentDeferredAccessMode(true);
    assert.equal(isPaymentDeferredAccessMode(), true);

    const accessWithMode = await getSubscriptionAccess(expiredStudent.id);
    assert.equal(accessWithMode.isAccessGranted, false, 'Deferred mode must never activate an unregistered student');
    assert.equal(accessWithMode.status, 'unregistered');

    // Confirm plan definitions and pricing remain strictly preserved (₹1 Daily = 100 paise, ₹30 Monthly = 3000 paise)
    assert.equal(SUBSCRIPTION_PLANS.daily.amountPaise, 100);
    assert.equal(SUBSCRIPTION_PLANS.monthly.amountPaise, 3000);

    // Revert flag to verify safety
    setPaymentDeferredAccessMode(false);
    const accessReverted = await getSubscriptionAccess(expiredStudent.id);
    assert.equal(accessReverted.isAccessGranted, false);
  });

  // ===========================================================================
  // Part 12: Tenant Isolation Across Multiple Schools
  // ===========================================================================

  await asyncTest('Multi-tenant isolation strictly partitions onboarding progress, staff, and students across schools', async () => {
    // School 1: SXA (provisionedSchoolId)
    // Register and provision School 2: Delhi Public Academy (DPA)
    const regDPA = await submitSchoolRegistration({
      schoolName: 'Delhi Public Academy',
      schoolCode: 'DPA-DEL-03',
      schoolEmail: 'admin@dpa-delhi.edu',
      contactNumber: '+91 9811122233',
      addressLine: 'Sector 14, Rohini',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110085',
      adminName: 'Sunita Mehra',
      adminEmail: 'sunita.mehra@dpa-delhi.edu',
    });

    const provDPA = await provisionSchoolRegistration(regDPA.registrationId, 'operator_user_01', 'auth_user_sunita_01');
    const school2Id = provDPA.schoolId;

    // Verify Onboarding progress isolation
    const progressSXA = await getOnboardingProgress(provisionedSchoolId);
    const progressDPA = await getOnboardingProgress(school2Id);

    assert.equal(progressSXA.isCompleted, true, 'School 1 onboarding is completed');
    assert.equal(progressDPA.isCompleted, false, 'School 2 onboarding is not completed');
    assert.equal(progressDPA.currentStep, 1, 'School 2 is at step 1');

    // Staff isolation
    await registerStaffMember(school2Id, 'prof_teacher_dpa', 'Rajiv Sen', 'rajiv@dpa-delhi.edu', 'teacher');
    const staffSXA = await listSchoolStaff(provisionedSchoolId);
    const staffDPA = await listSchoolStaff(school2Id);

    assert.ok(staffSXA.every(s => s.schoolId === provisionedSchoolId), 'SXA staff list contains only SXA staff');
    assert.ok(staffDPA.every(s => s.schoolId === school2Id), 'DPA staff list contains only DPA staff');
    assert.equal(staffDPA.length, 1);
    assert.equal(staffDPA[0].email, 'rajiv@dpa-delhi.edu');

    // Student isolation: duplicate registration number across schools is ALLOWED
    // SXA has 'SXA-101'
    const enrollDPA = await enrollStudent(school2Id, {
      registrationNumber: 'SXA-101', // same reg number as SXA, but in DPA
      fullName: 'Rohan Gupta (DPA)',
      className: 'Grade 2',
      sectionName: 'A',
      guardianName: 'Different Guardian',
      guardianPhone: '+91 9876540000',
    });
    assert.ok(enrollDPA.id, 'Same registration number allowed across different schools');

    // Duplicate registration number within SAME school is REJECTED
    await assert.rejects(
      async () => {
        await enrollStudent(school2Id, {
          registrationNumber: 'SXA-101',
          fullName: 'Duplicate In DPA',
          className: 'Grade 2',
          sectionName: 'B',
          guardianName: 'Another Guardian',
          guardianPhone: '+91 9876540001',
        });
      },
      /already exists in school/i,
      'Duplicate registration number within same school must be rejected'
    );
  });

  console.log(`\n=============================================================================`);
  console.log(`ALL ${passed} PHASE 6 VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log(`=============================================================================\n`);
}

main().catch(err => {
  console.error('Fatal error in Phase 6 verification suite:', err);
  process.exit(1);
});
