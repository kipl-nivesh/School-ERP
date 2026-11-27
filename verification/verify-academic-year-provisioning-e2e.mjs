import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.test.local', 'utf8');
function getEnv(key) {
  const match = envFile.match(new RegExp(`^${key}=(?:"([^"]*)"|'([^']*)'|([^\\r\\n]*))`, 'm'));
  return match ? (match[1] ?? match[2] ?? match[3]) : process.env[key];
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://etlahjbwylasudkuqozc.supabase.co';
const PUBLISHABLE_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'sb_publishable_86_gKt4gaXuW-MpqnHnzOg_yoJgPrbK';
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const SCHOOL_A_ID = getEnv('TEST_SCHOOL_A_ID') || '3e776b42-4b1d-4e4b-a103-91755237d0f3';
const SCHOOL_B_ID = getEnv('TEST_SCHOOL_B_ID') || '4fd251e1-4f1a-4390-a496-8ba0530c24e7';
const SCHOOL_B_CODE = 'BC-STEP4B-B';

const ADMIN_A_EMAIL = getEnv('DISPOSABLE_ADMIN_EMAIL') || 'disposable_admin@brightcamp.test';
const ADMIN_A_PASSWORD = getEnv('DISPOSABLE_ADMIN_PASSWORD');
const ADMIN_A_TOTP_FACTOR_ID = getEnv('DISPOSABLE_ADMIN_TOTP_FACTOR_ID');
const ADMIN_A_TOTP_SECRET = getEnv('DISPOSABLE_ADMIN_TOTP_SECRET');

const ADMIN_B_EMAIL = getEnv('TEST_ADMIN_B_EMAIL') || 'admin_b@brightcamp.test';
const ADMIN_B_PASSWORD = getEnv('TEST_ADMIN_B_PASSWORD') || 'TestPassword123!SecureRandom';
const ADMIN_B_TOTP_FACTOR_ID = 'a7e0c230-07ce-4e50-b935-adba925a5fa2';
const ADMIN_B_TOTP_SECRET = '7QK66DHUZKZKUUG56QS5JTXRGWCYFUPO';

const TEACHER_A_EMAIL = getEnv('TEST_TEACHER_A_EMAIL') || 'teacher_a@brightcamp.test';
const TEACHER_A_PASSWORD = getEnv('TEST_TEACHER_A_PASSWORD') || 'TestPassword123!SecureRandom';

const ACCOUNTANT_A_EMAIL = getEnv('TEST_ACCOUNTANT_A_EMAIL') || 'accountant_a@brightcamp.test';
const ACCOUNTANT_A_PASSWORD = getEnv('TEST_ACCOUNTANT_A_PASSWORD') || 'TestPassword123!SecureRandom';

function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, index = 0;
  const output = new Uint8Array(Math.floor((base32.length * 5) / 8));
  for (let i = 0; i < base32.length; i++) {
    const val = alphabet.indexOf(base32[i].toUpperCase());
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return Buffer.from(output.buffer, output.byteOffset, index);
}

function generateTotp(secret, timeStepSeconds = 30) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

async function getAal2AdminClient(email, password, factorId, secret, schoolId) {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signIn.error, `Sign in failed for ${email}: ${signIn.error?.message}`);

  const mfa = await client.auth.mfa.challengeAndVerify({
    factorId,
    code: generateTotp(secret),
  });
  assert.ifError(mfa.error, `MFA challenge failed for ${email}: ${mfa.error?.message}`);

  await client.auth.setSession({ access_token: mfa.data.access_token, refresh_token: mfa.data.refresh_token });
  const ctx = await client.rpc('select_school_context', { p_school: schoolId, p_role: 'admin' });
  assert.equal(ctx.data, true, `School context selection failed for ${schoolId}`);
  return client;
}

test('Migration 049: Academic Year Provisioning End-to-End Verification Suite', async (t) => {
  let createdYearId = null;
  let createdClassId = null;
  let createdSectionId = null;
  let admittedStudent = null;

  await t.test('1. Clean School Reproduction (School B with 0 Academic Years)', async () => {
    const adminB = await getAal2AdminClient(ADMIN_B_EMAIL, ADMIN_B_PASSWORD, ADMIN_B_TOTP_FACTOR_ID, ADMIN_B_TOTP_SECRET, SCHOOL_B_ID);

    // Verify School B starts with 0 academic years (reproducing production blocker)
    const years = await adminB.from('academic_years').select('id,label').eq('school_id', SCHOOL_B_ID);
    assert.ifError(years.error);
    console.log(`[INFO] Clean School B pre-existing academic years count: ${years.data.length}`);

    // If any from previous runs, we know it's a test school, but let's confirm Section creation without a valid year fails
    const fakeYearId = crypto.randomUUID();
    const fakeClassId = crypto.randomUUID();
    const testSectionReq = crypto.randomUUID();
    const testSectionId = crypto.randomUUID();

    const badSection = await adminB.rpc('manage_academics', {
      p_request: testSectionReq,
      p_kind: 'section',
      p_id: testSectionId,
      p_data: { classId: fakeClassId, yearId: fakeYearId, name: 'Section Orphan' },
    });
    assert.ok(badSection.error, 'Section creation without valid class/academic year must fail');
    assert.equal(badSection.error.code, '42501', 'Must return 42501 Class or year unavailable');

    // Confirm student admission without valid sections fails
    const badAdmissionReq = crypto.randomUUID();
    const badAdmission = await adminB.rpc('admit_student_idempotent', {
      p_request_id: badAdmissionReq,
      p_input: {
        fullName: 'Orphan Student',
        dateOfBirth: '2010-01-01',
        gender: 'female',
        classId: fakeClassId,
        sectionId: testSectionId,
        guardianName: 'Parent Orphan',
        guardianPhone: '9876543210',
      },
    });
    assert.ok(badAdmission.error, 'Admission without valid section must fail');
    assert.equal(badAdmission.error.code, '42501', 'Must return 42501 Section unavailable');
  });

  await t.test('2. Negative Date Validation & Error Enforcement', async () => {
    const adminB = await getAal2AdminClient(ADMIN_B_EMAIL, ADMIN_B_PASSWORD, ADMIN_B_TOTP_FACTOR_ID, ADMIN_B_TOTP_SECRET, SCHOOL_B_ID);

    // Negative test: endsOn < startsOn
    const invertedDates = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: 'Inverted Session', startsOn: '2028-04-01', endsOn: '2027-03-31' },
    });
    assert.ok(invertedDates.error, 'Inverted dates must be rejected');
    assert.equal(invertedDates.error.code, '22023');
    assert.match(invertedDates.error.message, /End date must be strictly after start date/i);

    // Negative test: endsOn == startsOn
    const equalDates = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: 'Equal Dates Session', startsOn: '2028-04-01', endsOn: '2028-04-01' },
    });
    assert.ok(equalDates.error, 'Equal dates must be rejected');
    assert.equal(equalDates.error.code, '22023');
    assert.match(equalDates.error.message, /End date must be strictly after start date/i);

    // Negative test: Malformed date
    const malformedDates = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: 'Malformed Date Session', startsOn: 'not-a-date', endsOn: '2028-03-31' },
    });
    assert.ok(malformedDates.error, 'Malformed dates must be rejected');
    assert.equal(malformedDates.error.code, '22023');
    assert.match(malformedDates.error.message, /Invalid date format/i);

    // Negative test: Empty label
    const emptyLabel = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: '   ', startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ok(emptyLabel.error, 'Empty label must be rejected');
    assert.equal(emptyLabel.error.code, '22023');
    assert.match(emptyLabel.error.message, /Academic year name required/i);
  });

  await t.test('3. Duplicate Creation Rejection & Concurrency Protection', async () => {
    const adminB = await getAal2AdminClient(ADMIN_B_EMAIL, ADMIN_B_PASSWORD, ADMIN_B_TOTP_FACTOR_ID, ADMIN_B_TOTP_SECRET, SCHOOL_B_ID);

    const yearSuffix = Date.now().toString().slice(-6);
    const uniqueLabel = `AY-${yearSuffix}`;
    const req1 = crypto.randomUUID();
    const id1 = crypto.randomUUID();

    // First creation: must succeed
    const firstRes = await adminB.rpc('manage_academics', {
      p_request: req1,
      p_kind: 'academic_year',
      p_id: id1,
      p_data: { label: uniqueLabel, startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ifError(firstRes.error, `Academic year creation failed: ${firstRes.error?.message}`);
    assert.equal(firstRes.data.id, id1);

    // Idempotent retry with same p_request and payload: returns same result
    const retryRes = await adminB.rpc('manage_academics', {
      p_request: req1,
      p_kind: 'academic_year',
      p_id: id1,
      p_data: { label: uniqueLabel, startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ifError(retryRes.error);
    assert.equal(retryRes.data.id, id1, 'Idempotent request returns prior result');

    // Duplicate creation with new request ID: must reject with 23505
    const dupRes = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: uniqueLabel, startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ok(dupRes.error, 'Exact duplicate must be rejected');
    assert.equal(dupRes.error.code, '23505');
    assert.match(dupRes.error.message, /Academic year already exists/i);

    // Case-insensitive duplicate creation: must reject with 23505
    const caseDupRes = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: uniqueLabel.toLowerCase(), startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ok(caseDupRes.error, 'Case-insensitive duplicate must be rejected');
    assert.equal(caseDupRes.error.code, '23505');
    assert.match(caseDupRes.error.message, /Academic year already exists/i);
  });

  await t.test('4. Role & MFA Authorization Guards', async () => {
    // Teacher denied
    const teacher = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const teacherSignIn = await teacher.auth.signInWithPassword({ email: TEACHER_A_EMAIL, password: TEACHER_A_PASSWORD });
    assert.ifError(teacherSignIn.error);
    await teacher.rpc('select_school_context', { p_school: SCHOOL_A_ID, p_role: 'teacher' });

    const teacherAttempt = await teacher.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: 'Teacher AY', startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ok(teacherAttempt.error, 'Teacher must be denied from manage_academics academic_year');
    assert.equal(teacherAttempt.error.code, '42501');

    // Accountant denied
    const accountant = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const accSignIn = await accountant.auth.signInWithPassword({ email: ACCOUNTANT_A_EMAIL, password: ACCOUNTANT_A_PASSWORD });
    assert.ifError(accSignIn.error);
    await accountant.rpc('select_school_context', { p_school: SCHOOL_A_ID, p_role: 'accountant' });

    const accAttempt = await accountant.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: 'Accountant AY', startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ok(accAttempt.error, 'Accountant must be denied from manage_academics academic_year');
    assert.equal(accAttempt.error.code, '42501');

    // Admin without AAL2 (AAL1 session) denied with MFA verification required
    const adminAal1 = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const aal1SignIn = await adminAal1.auth.signInWithPassword({ email: ADMIN_B_EMAIL, password: ADMIN_B_PASSWORD });
    assert.ifError(aal1SignIn.error);

    const aal1Attempt = await adminAal1.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: crypto.randomUUID(),
      p_data: { label: 'AAL1 Session', startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ok(aal1Attempt.error, 'AAL1 Admin must be denied without AAL2 MFA verification');
    assert.equal(aal1Attempt.error.code, '42501');
    assert.match(aal1Attempt.error.message, /MFA verification required|Access denied/i);
  });

  await t.test('5. Cross-School Isolation Enforcement', async () => {
    const adminA = await getAal2AdminClient(ADMIN_A_EMAIL, ADMIN_A_PASSWORD, ADMIN_A_TOTP_FACTOR_ID, ADMIN_A_TOTP_SECRET, SCHOOL_A_ID);
    const adminB = await getAal2AdminClient(ADMIN_B_EMAIL, ADMIN_B_PASSWORD, ADMIN_B_TOTP_FACTOR_ID, ADMIN_B_TOTP_SECRET, SCHOOL_B_ID);

    // Create an academic year in School B
    const bYearId = crypto.randomUUID();
    const bYearLabel = `School-B-AY-${Date.now().toString().slice(-5)}`;
    const bYearRes = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: bYearId,
      p_data: { label: bYearLabel, startsOn: '2027-04-01', endsOn: '2028-03-31' },
    });
    assert.ifError(bYearRes.error);

    // Admin A queries academic_years: must NOT see School B's year
    const aYears = await adminA.from('academic_years').select('id,label').eq('id', bYearId);
    assert.ifError(aYears.error);
    assert.equal(aYears.data.length, 0, 'Admin A must not be able to read School B academic years via RLS');

    // Admin A tries to create a section in School A using School B's academic year ID: must reject with 42501
    const aClassId = crypto.randomUUID();
    await adminA.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'class',
      p_id: aClassId,
      p_data: { name: 'Class Cross-School Test' },
    });

    const crossSectionRes = await adminA.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'section',
      p_id: crypto.randomUUID(),
      p_data: { classId: aClassId, yearId: bYearId, name: 'Cross Section' },
    });
    assert.ok(crossSectionRes.error, 'Cross-school academic year reference in section must fail');
    assert.equal(crossSectionRes.error.code, '42501');
  });

  await t.test('6. Complete End-to-End Workflow in Clean School B (Academic Year -> Class -> Section -> Admission -> PIN -> Login)', async () => {
    const adminB = await getAal2AdminClient(ADMIN_B_EMAIL, ADMIN_B_PASSWORD, ADMIN_B_TOTP_FACTOR_ID, ADMIN_B_TOTP_SECRET, SCHOOL_B_ID);

    // Step A: Provision Academic Year
    createdYearId = crypto.randomUUID();
    const yearLabel = `2026-2027-Active-${Date.now().toString().slice(-4)}`;
    const yearRes = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'academic_year',
      p_id: createdYearId,
      p_data: { label: yearLabel, startsOn: '2026-04-01', endsOn: '2027-03-31' },
    });
    assert.ifError(yearRes.error, `Academic year creation failed: ${yearRes.error?.message}`);
    assert.equal(yearRes.data.id, createdYearId);

    // Verify audit event
    const audit = await adminB.from('audit_events').select('id,event_type,details').eq('school_id', SCHOOL_B_ID).eq('event_type', 'academic_year_saved').order('occurred_at', { ascending: false }).limit(1);
    assert.ifError(audit.error);
    assert.equal(audit.data[0].event_type, 'academic_year_saved');
    assert.equal(audit.data[0].details.id, createdYearId);

    // Step B: Provision Class
    createdClassId = crypto.randomUUID();
    const className = `Class 10-${Date.now().toString().slice(-4)}`;
    const classRes = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'class',
      p_id: createdClassId,
      p_data: { name: className },
    });
    assert.ifError(classRes.error, `Class creation failed: ${classRes.error?.message}`);

    // Step C: Provision Section
    createdSectionId = crypto.randomUUID();
    const sectionRes = await adminB.rpc('manage_academics', {
      p_request: crypto.randomUUID(),
      p_kind: 'section',
      p_id: createdSectionId,
      p_data: { classId: createdClassId, yearId: createdYearId, name: 'Section A' },
    });
    assert.ifError(sectionRes.error, `Section creation failed: ${sectionRes.error?.message}`);

    // Step D: Student Admission
    const admissionReq = crypto.randomUUID();
    const admitRes = await adminB.rpc('admit_student_idempotent', {
      p_request_id: admissionReq,
      p_input: {
        fullName: 'Arjun B Sharma',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        classId: createdClassId,
        sectionId: createdSectionId,
        guardianName: 'Ramesh Sharma',
        guardianPhone: '9876543210',
        guardianEmail: 'ramesh.sharma@example.com',
      },
    });
    assert.ifError(admitRes.error, `Admission failed: ${admitRes.error?.message}`);
    admittedStudent = admitRes.data;
    assert.ok(admittedStudent.id, 'Student record returned with ID');
    assert.ok(admittedStudent.admissionNumber, 'Student registration returned');
    console.log(`[INFO] Admitted student ID: ${admittedStudent.id}, Reg: ${admittedStudent.admissionNumber}`);

    // Verify enrollment record links to created section and academic year
    const enr = await adminB.from('enrollments').select('id,student_id,section_id,academic_year_id').eq('student_id', admittedStudent.id);
    assert.ifError(enr.error);
    assert.equal(enr.data.length, 1);
    assert.equal(enr.data[0].section_id, createdSectionId);
    assert.equal(enr.data[0].academic_year_id, createdYearId);

    // Step E: Student Identity Linkage & PIN Setup
    const broker = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const studentEmail = `student_b_${Date.now()}@brightcamp.test`;

    // Create auth user for student identity
    const createdUser = await broker.auth.admin.createUser({
      email: studentEmail,
      email_confirm: true,
      user_metadata: { role: 'student', full_name: 'Arjun B Sharma' },
    });
    assert.ifError(createdUser.error, `Failed to create auth user: ${createdUser.error?.message}`);
    const studentProfileId = createdUser.data.user.id;

    // Link profile to student via bind_school_student_identity
    const linkRes = await adminB.rpc('bind_school_student_identity', {
      p_registration: admittedStudent.admissionNumber,
      p_email: studentEmail,
    });
    assert.ifError(linkRes.error, `bind_school_student_identity failed: ${linkRes.error?.message}`);
    assert.equal(linkRes.data, true, 'Student identity successfully bound');

    // Set PIN: 6-digit PIN 246810
    const rawPin = '246810';
    const salt = crypto.randomBytes(16).toString('hex');
    const pepper = getEnv('AUTH_PIN_PEPPER') || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const derivedKey = crypto.pbkdf2Sync(rawPin + pepper, salt, 100000, 32, 'sha256');
    const pinHash = derivedKey.toString('hex');

    const pinRes = await adminB.rpc('manage_student_portal_pin', {
      p_student: admittedStudent.id,
      p_intent: 'activate',
      p_hash: pinHash,
      p_salt: salt,
    });
    assert.ifError(pinRes.error, `manage_student_portal_pin failed: ${pinRes.error?.message}`);
    assert.equal(pinRes.data, true, 'PIN activation must succeed');

    // Step F: Student PIN Login & Dashboard Verification
    const pinAttempt = await broker.rpc('begin_student_pin_attempt', {
      p_school: SCHOOL_B_CODE.toUpperCase(),
      p_registration: admittedStudent.admissionNumber.toUpperCase(),
    });
    assert.ifError(pinAttempt.error);
    assert.equal(pinAttempt.data.length, 1, 'Eligible credential returned for PIN attempt');
    const cred = pinAttempt.data[0];

    // Verify hash match
    const checkKey = crypto.pbkdf2Sync(rawPin + pepper, cred.salt, 100000, 32, 'sha256').toString('hex');
    assert.equal(checkKey, cred.pin_hash, 'PIN hash must match');

    // Issue magic link for native session
    const magic = await broker.auth.admin.generateLink({ type: 'magiclink', email: cred.email });
    assert.ifError(magic.error);

    const studentClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const verifyOtp = await studentClient.auth.verifyOtp({ type: 'magiclink', token_hash: magic.data.properties.hashed_token });
    assert.ifError(verifyOtp.error);
    const session = verifyOtp.data.session;
    assert.ok(session, 'Student session obtained');

    const claimsRes = await studentClient.auth.getClaims(session.access_token);
    assert.ifError(claimsRes.error);
    const claims = claimsRes.data.claims;

    // Bind session
    const bound = await broker.rpc('bind_student_pin_session', {
      p_session: claims.session_id,
      p_student: cred.student_id,
      p_profile: cred.profile_id,
      p_school: cred.school_id,
      p_version: cred.credential_version,
    });
    assert.ifError(bound.error);
    assert.equal(bound.data, true, 'Student session successfully bound');

    // Authenticated student client queries portal identity
    await studentClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    const portalIdentity = await studentClient.rpc('read_student_portal_identity');
    assert.ifError(portalIdentity.error);
    assert.equal(portalIdentity.data.length, 1, 'Student portal identity resolved');
    assert.equal(portalIdentity.data[0].school_id, SCHOOL_B_ID);
    assert.equal(portalIdentity.data[0].student_id, admittedStudent.id);
    assert.equal(portalIdentity.data[0].registration_number, admittedStudent.admissionNumber);
    console.log('[SUCCESS] Clean School B End-to-End Workflow (Academic Year -> Class -> Section -> Admission -> PIN -> Login) verified perfectly!');
  });
});
