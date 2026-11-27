import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const worktree = path.resolve('D:/O/Office Projects/School ERP/.next-isolated/phase11-live-erp-recovery/.next/student-activation-admin-ui');
const { createClient } = require(path.join(worktree, 'node_modules/@supabase/supabase-js'));

for (const f of ['.env.test.local', '.env.local']) {
  const full = path.join(worktree, f);
  if (!fs.existsSync(full)) continue;
  for (const l of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) {
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(t.slice(0, eq).trim() in process.env)) process.env[t.slice(0, eq).trim()] = v;
    }
  }
}

function generateTotp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const bytes = [];
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  const counter = Math.floor(Date.now() / 30000);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', Buffer.from(bytes)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// 1. Sign in AAL1
const signIn = await admin.auth.signInWithPassword({
  email: process.env.DISPOSABLE_ADMIN_EMAIL,
  password: process.env.DISPOSABLE_ADMIN_PASSWORD,
});
if (signIn.error) throw new Error('Admin sign-in failed: ' + signIn.error.message);

// Find a pending student via authenticated admin query after TOTP, or pick from aal2
const mfa = await admin.auth.mfa.challengeAndVerify({
  factorId: process.env.DISPOSABLE_ADMIN_TOTP_FACTOR_ID,
  code: generateTotp(process.env.DISPOSABLE_ADMIN_TOTP_SECRET),
});
if (mfa.error) throw new Error('Admin MFA failed: ' + mfa.error.message);

const act = await admin.rpc('select_school_context', { p_school: process.env.TEST_SCHOOL_A_ID, p_role: 'admin' });
if (act.error) throw new Error('select_school_context failed: ' + act.error.message);

const { data: pendingStu, error: stuErr } = await admin
  .from('students')
  .select('id, school_id')
  .eq('enrollment_status', 'active')
  .eq('portal_access_status', 'pending_activation')
  .is('profile_id', null)
  .limit(1)
  .single();
if (stuErr || !pendingStu) throw new Error('No pending student fixture found');

const testEmail = `m051.check.${Date.now()}@gmail.com`;

try {
  // 2. Fresh MFA check
  const insp = await admin.rpc('inspect_student_identity_status', { p_student: pendingStu.id, p_email: testEmail });
  if (insp.error || !insp.data?.authorized || !insp.data?.mfa_fresh) {
    throw new Error('Expected authorized=true and mfa_fresh=true, got: ' + JSON.stringify(insp));
  }
  console.log('1. Fresh Admin AAL2 MFA verified (mfa_fresh=true)');

  // 3. Cross-school / Staff / Student conflict check
  const staffConflict = await admin.rpc('inspect_student_identity_status', {
    p_student: pendingStu.id,
    p_email: process.env.DISPOSABLE_ADMIN_EMAIL,
  });
  if (staffConflict.data?.candidate_status !== 'conflict_staff') {
    throw new Error('Expected conflict_staff, got: ' + JSON.stringify(staffConflict.data));
  }
  console.log('2. Staff/cross-role conflict rejected (conflict_staff)');

  // 4. Failed invitation audit accuracy (must not consume sent quota)
  const fail1 = await admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'failed' });
  const fail2 = await admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'failed' });
  if (fail1.data !== true || fail2.data !== true) throw new Error('Failed audit logging failed');
  console.log('3. Failed invitation attempts audited accurately without consuming sent quota');

  // 5. Concurrent invitation rate limit (max 3 sent per hour)
  const concurrent = await Promise.all([
    admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'sent' }),
    admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'sent' }),
    admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'sent' }),
    admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'sent' }),
    admin.rpc('record_student_identity_invitation', { p_student: pendingStu.id, p_email: testEmail, p_status: 'sent' }),
  ]);
  const allowedCount = concurrent.filter(r => r.data === true).length;
  const blockedCount = concurrent.filter(r => r.data === false).length;
  if (allowedCount !== 3 || blockedCount !== 2) {
    throw new Error(`Expected 3 allowed and 2 rate-limited, got allowed=${allowedCount}, blocked=${blockedCount}`);
  }
  const afterLimit = await admin.rpc('inspect_student_identity_status', { p_student: pendingStu.id, p_email: testEmail });
  if (afterLimit.data?.candidate_status !== 'rate_limited') {
    throw new Error('Expected rate_limited after 3 sent invites, got: ' + JSON.stringify(afterLimit.data));
  }
  console.log('4. Concurrent invitation advisory lock & 3/hour rate limit verified');

  // 6. Verify AAL1 (without TOTP) is rejected
  const aal1 = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await aal1.auth.signInWithPassword({ email: process.env.DISPOSABLE_ADMIN_EMAIL, password: process.env.DISPOSABLE_ADMIN_PASSWORD });
  const aal1Check = await aal1.rpc('inspect_student_identity_status', { p_student: pendingStu.id, p_email: testEmail });
  if (aal1Check.data?.authorized !== false) {
    throw new Error('SECURITY VIOLATION: AAL1 admin was authorized');
  }
  console.log('5. AAL1 without TOTP strictly rejected');
  console.log('MIGRATION 051 SECURITY SUITE PASSED!');
} finally {
  // Clean up only the test audit_events for this synthetic email hash
  const emailHash = crypto.createHash('sha256').update(testEmail.toLowerCase()).digest('hex');
  await service
    .from('audit_events')
    .delete()
    .eq('school_id', pendingStu.school_id)
    .contains('details', { email_hash: emailHash });
}
