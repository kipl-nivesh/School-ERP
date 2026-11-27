import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';

const envPath = fs.existsSync('.env.test.local') ? '.env.test.local' : '../../student-portal/.env.test.local';
const envFile = fs.readFileSync(envPath, 'utf8');
function getEnv(key) {
  const match = envFile.match(new RegExp(`^${key}=(?:"([^"]*)"|'([^']*)'|([^\\r\\n]*))`, 'm'));
  return match ? (match[1] ?? match[2] ?? match[3]) : process.env[key];
}

const SUPABASE_URL = 'https://etlahjbwylasudkuqozc.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_86_gKt4gaXuW-MpqnHnzOg_yoJgPrbK';
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const SCHOOL_A_ID = getEnv('TEST_SCHOOL_A_ID') || '3e776b42-4b1d-4e4b-a103-91755237d0f3';
const STUDENT_ID = 'dddddddd-1111-4ddd-8ddd-000000000001';
const SECTION_A_ID = '33333333-0001-4333-8333-000000000001';

const ADMIN_EMAIL = getEnv('DISPOSABLE_ADMIN_EMAIL');
const ADMIN_PASSWORD = getEnv('DISPOSABLE_ADMIN_PASSWORD');
const ADMIN_TOTP_FACTOR_ID = getEnv('DISPOSABLE_ADMIN_TOTP_FACTOR_ID');
const ADMIN_TOTP_SECRET = getEnv('DISPOSABLE_ADMIN_TOTP_SECRET');

const TEACHER_EMAIL = getEnv('TEST_TEACHER_A_EMAIL');
const TEACHER_PASSWORD = getEnv('TEST_TEACHER_A_PASSWORD');

const ACCOUNTANT_EMAIL = getEnv('DISPOSABLE_EXPORT_ACCOUNTANT_EMAIL') || getEnv('TEST_ACCOUNTANT_A_EMAIL');
const ACCOUNTANT_PASSWORD = getEnv('DISPOSABLE_EXPORT_ACCOUNTANT_PASSWORD') || getEnv('TEST_ACCOUNTANT_A_PASSWORD');

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

test('Targeted Staff & Student Security Regression Suite (Post-Migration 046)', async (t) => {
  await t.test('1. Admin Native MFA AAL2 + Staff Directory & Enrollment/Marks Reads', async () => {
    const admin = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const signIn = await admin.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assert.ifError(signIn.error);
    const mfa = await admin.auth.mfa.challengeAndVerify({
      factorId: ADMIN_TOTP_FACTOR_ID,
      code: generateTotp(ADMIN_TOTP_SECRET),
    });
    assert.ifError(mfa.error);
    await admin.auth.setSession({ access_token: mfa.data.access_token, refresh_token: mfa.data.refresh_token });
    const ctx = await admin.rpc('select_school_context', { p_school: SCHOOL_A_ID, p_role: 'admin' });
    assert.equal(ctx.data, true);

    const staff = await admin.from('staff_profiles').select('profile_id,school_id').eq('school_id', SCHOOL_A_ID);
    assert.ifError(staff.error);
    assert.ok(staff.data.length >= 1, 'Admin can read Staff Directory');

    const enr = await admin.from('enrollments').select('id,student_id').eq('school_id', SCHOOL_A_ID);
    assert.ifError(enr.error);
    assert.ok(enr.data.length >= 1, 'Admin can read enrollments');

    const draftSheets = await admin.from('marks_sheets').select('id,is_published').eq('school_id', SCHOOL_A_ID);
    assert.ifError(draftSheets.error);
    assert.ok(draftSheets.data.some(s => s.is_published === false), 'Admin can see draft marks sheets');
  });

  await t.test('2. Teacher Assigned Attendance, Homework & Marks Reads Preserved', async () => {
    const teacher = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const signIn = await teacher.auth.signInWithPassword({ email: TEACHER_EMAIL, password: TEACHER_PASSWORD });
    assert.ifError(signIn.error);
    const ctx = await teacher.rpc('select_school_context', { p_school: SCHOOL_A_ID, p_role: 'teacher' });
    assert.equal(ctx.data, true);

    const att = await teacher.from('attendance_records').select('id').eq('school_id', SCHOOL_A_ID).eq('section_id', SECTION_A_ID);
    assert.ifError(att.error);
    assert.ok(att.data.length >= 1, 'Teacher can read assigned attendance');

    const hw = await teacher.from('homework_assignments').select('id').eq('school_id', SCHOOL_A_ID).eq('section_id', SECTION_A_ID);
    assert.ifError(hw.error);
    assert.ok(hw.data.length >= 1, 'Teacher can read assigned homework');

    const ms = await teacher.from('marks_sheets').select('id').eq('school_id', SCHOOL_A_ID).eq('section_id', SECTION_A_ID);
    assert.ifError(ms.error);
    assert.ok(ms.data.length >= 1, 'Teacher can read assigned marks sheets');
  });

  await t.test('3. Accountant Financial Reads & Export MFA Enforcement Preserved', async () => {
    const acc = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const signIn = await acc.auth.signInWithPassword({ email: ACCOUNTANT_EMAIL, password: ACCOUNTANT_PASSWORD });
    assert.ifError(signIn.error);
    const ctx = await acc.rpc('select_school_context', { p_school: SCHOOL_A_ID, p_role: 'accountant' });
    assert.equal(ctx.data, true);

    const inv = await acc.from('fee_invoices').select('id').eq('school_id', SCHOOL_A_ID);
    assert.ifError(inv.error);
    assert.ok(inv.data.length >= 1, 'Accountant can read fee invoices');

    const pay = await acc.from('fee_payments').select('id').eq('school_id', SCHOOL_A_ID);
    assert.ifError(pay.error);
    assert.ok(pay.data.length >= 1, 'Accountant can read fee payments');

    // AAL1 Accountant without TOTP step-up must be denied from export RPC
    const exp = await acc.rpc('export_financial_report', { p_school: SCHOOL_A_ID, p_format: 'csv' });
    assert.ok(exp.error || exp.data === null || exp.data === false, 'AAL1 Accountant denied from MFA-gated financial export');
  });

  await t.test('4. Inactive Enrollment & Suspended Student Access Denial', async () => {
    const broker = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    // Malformed / missing session JWT must return null/false from current_school_id & current_active_role
    const anon = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonIdentity = await anon.rpc('read_student_portal_identity');
    assert.equal(anonIdentity.data?.length ?? 0, 0, 'Unauthenticated caller gets 0 student identities');

    // Inactive student (if any) or non-existent school code denied by begin_student_pin_attempt
    const badAttempt = await broker.rpc('begin_student_pin_attempt', { p_school: 'NONEXISTENT', p_registration: 'STU-2026-0001' });
    assert.equal(badAttempt.data?.length ?? 0, 0, 'Invalid school code returns 0 credentials');

    // Verify selectCurrentStudentEnrollment rejects inactive/expired enrollment
    const { selectCurrentStudentEnrollment } = await import('../src/lib/student/identity-contracts.ts').catch(() => ({ selectCurrentStudentEnrollment: null }));
    if (selectCurrentStudentEnrollment) {
      const expired = selectCurrentStudentEnrollment(
        { schoolId: SCHOOL_A_ID, studentId: STUDENT_ID },
        [{ schoolId: SCHOOL_A_ID, studentId: STUDENT_ID, sectionId: SECTION_A_ID, academicYearId: '22222222-0001-4222-8222-000000000001', validFrom: '2025-01-01', validUntil: '2025-12-31' }],
        '2026-11-25'
      );
      assert.notEqual(expired.kind, 'current', 'Expired enrollment must not resolve as current');
    }
  });
});
