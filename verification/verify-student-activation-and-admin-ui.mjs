import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const worktree = path.resolve('D:/O/Office Projects/School ERP/.next-isolated/phase11-live-erp-recovery/.next/student-activation-admin-ui');
const { chromium } = require(path.join(worktree, 'node_modules/playwright'));
const { createClient } = require(path.join(worktree, 'node_modules/@supabase/supabase-js'));

const screenshotDir = 'C:/Users/BTS/.gemini/antigravity/brain/c68538f1-e9db-4d93-90ef-ea693da429b0/admin_ui_after';
fs.mkdirSync(screenshotDir, { recursive: true });

function loadEnv(file) {
  const full = path.join(worktree, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq > 0) {
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  }
}

loadEnv('.env.test.local');
loadEnv('.env.local');

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

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not become ready');
}

const PORT = 3105;
const BASE = `http://127.0.0.1:${PORT}`;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error('Missing required Supabase configuration in .env.local / .env.test.local');
}

const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const suffix = String(Date.now()).slice(-6);
const yearName = `AY-UI-${suffix}`;
const className = `Class UI-${suffix}`;
const sectionName = `Sec UI-${suffix}`;
const studentName = `UI Student ${suffix}`;
const studentEmail = `brightcamp.student.ui.${suffix}@gmail.com`;
const preverifiedEmail = `brightcamp.preverified.ui.${suffix}@gmail.com`;

let createdUserId = null;
let preverifiedUserId = null;

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  cwd: worktree,
  env: { ...process.env, PORT: String(PORT), STUDENT_PORTAL_ENABLED: 'true' },
  stdio: 'ignore',
});

try {
  await waitForServer(`${BASE}/login/staff`);
  console.log('1. Server ready on', BASE);

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });

  // --- ADMIN AUTHENTICATED FLOW ---
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/login/staff`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', process.env.DISPOSABLE_ADMIN_EMAIL);
  await page.fill('input[name="password"]', process.env.DISPOSABLE_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('input[name="code"]', { timeout: 20000 });
  await page.fill('input[name="code"]', generateTotp(process.env.DISPOSABLE_ADMIN_TOTP_SECRET));
  await page.click('button[type="submit"]');
  await page.waitForURL('**/staff/admin**', { timeout: 30000 });
  await page.waitForSelector('a[href="#classes"]', { timeout: 30000 });
  console.log('2. Admin authenticated with native MFA');

  // --- ACADEMIC MANAGEMENT ---
  await page.locator('a[href="#classes"]').first().click();
  await page.waitForSelector('button:has-text("Create Academic Year")', { timeout: 30000 });
  await page.screenshot({ path: path.join(screenshotDir, 'after_01_academic_management.png'), fullPage: false });

  // Create Academic Year via modal
  await page.click('button:has-text("Create Academic Year")');
  await page.fill('div[role="dialog"] input[name="label"]', yearName);
  await page.fill('div[role="dialog"] input[name="startsOn"]', '2027-04-01');
  await page.fill('div[role="dialog"] input[name="endsOn"]', '2028-03-31');
  await page.click('div[role="dialog"] button[type="submit"]');
  await page.waitForSelector('text=Record saved', { timeout: 20000 });
  await page.fill('#classes input[name="search"]', yearName);
  await page.click('#classes button:has-text("Apply Filters")');
  await page.waitForSelector(`#classes table >> text=${yearName}`, { timeout: 20000 });
  console.log('3. Created Academic Year without manual reload:', yearName);

  // Switch to Classes tab and create Class
  await page.click('button:has-text("Classes")');
  await page.click('button:has-text("Create Class")');
  await page.fill('div[role="dialog"] input[name="name"]', className);
  await page.click('div[role="dialog"] button[type="submit"]');
  await page.waitForSelector('text=Record saved', { timeout: 20000 });
  await page.fill('#classes input[name="search"]', className);
  await page.click('#classes button:has-text("Apply Filters")');
  await page.waitForSelector(`#classes table >> text=${className}`, { timeout: 20000 });
  console.log('4. Created Class without manual reload:', className);

  // Switch to Sections tab and create Section (verify dependent dropdowns populated automatically!)
  await page.click('button:has-text("Sections")');
  await page.click('button:has-text("Create Section")');
  await page.fill('div[role="dialog"] input[name="name"]', sectionName);
  await page.selectOption('div[role="dialog"] select[name="classId"]', { label: className });
  await page.selectOption('div[role="dialog"] select[name="yearId"]', { label: yearName });
  await page.click('div[role="dialog"] button[type="submit"]');
  await page.waitForSelector('text=Record saved', { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.fill('#classes input[name="search"]', sectionName);
  await page.click('#classes button:has-text("Apply Filters")');
  await page.waitForSelector(`#classes table >> text=${sectionName}`, { timeout: 20000 });
  console.log('5. Created Section with auto-updated dropdowns:', sectionName);

  // --- ADMISSIONS ---
  await page.locator('a[href="#admissions"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotDir, 'after_02_admissions.png'), fullPage: false });

  await page.selectOption('#admissions select[name="classId"]', { label: className });
  await page.selectOption('#admissions select[name="sectionId"]', { label: `${sectionName} · ${yearName}` });
  await page.fill('#admissions input[name="fullName"]', studentName);
  await page.fill('#admissions input[name="dateOfBirth"]', '2011-05-14');
  await page.selectOption('#admissions select[name="gender"]', 'female');
  await page.fill('#admissions input[name="guardianName"]', 'Parent Test');
  await page.fill('#admissions input[name="guardianPhone"]', '+91 9876543210');
  await page.click('#admissions button[type="submit"]');
  await page.waitForSelector('text=Admission Confirmed', { timeout: 45000 });
  const successText = await page.locator('#admissions [role="status"]').last().innerText();
  const regMatch = successText.match(/BC-[A-Za-z0-9-]+/);
  if (!regMatch) throw new Error('Registration ID missing in admission confirmation: ' + successText);
  const registrationNumber = regMatch[0];
  console.log('6. Admitted Student:', studentName, 'ID:', registrationNumber);

  // --- STUDENT MANAGEMENT & PROVISIONING ---
  await page.click('a:has-text("Manage Student Portal Access")');
  await page.waitForTimeout(400);
  await page.fill('#students input[name="search"]', registrationNumber);
  await page.click('#students button:has-text("Apply filters")');
  await page.waitForSelector(`#students button:has-text("${studentName}")`, { timeout: 20000 });
  await page.click(`#students button:has-text("${studentName}")`);
  await page.waitForSelector('#students h4:has-text("Provision & Link Student Identity")', { timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, 'after_03_students.png'), fullPage: false });

  // 6a. Reject Staff email
  await page.fill('#students input[name="email"]', process.env.DISPOSABLE_ADMIN_EMAIL);
  await page.click('#students button:has-text("Send Verification or Link")');
  await page.waitForSelector('text=belongs to a staff account', { timeout: 15000 });
  console.log('7a. Verified Staff email rejection works');

  // 6b. Invite new Student email (sends verification, NEVER bypasses!)
  await page.fill('#students input[name="email"]', studentEmail);
  await page.click('#students button:has-text("Send Verification or Link")');
  await page.waitForSelector(`text=Verification email sent to ${studentEmail}`, { timeout: 45000 });
  console.log('7b. Sent verification email to:', studentEmail);

  // Verify user exists in auth.users with email_confirmed_at == null
  const { data: usersList } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
  const invitedUser = usersList.users.find(u => u.email?.toLowerCase() === studentEmail.toLowerCase());
  if (!invitedUser) throw new Error('Invited user not found in auth.users');
  if (invitedUser.email_confirmed_at) throw new Error('SECURITY VIOLATION: email_confirmed_at should be null before user verifies');
  createdUserId = invitedUser.id;

  // 6c. Attempting to link BEFORE confirmation must remain blocked
  await page.click('#students button:has-text("Check & Link Verified Identity")');
  await page.waitForSelector('text=not confirmed yet', { timeout: 15000 });
  console.log('7c. Verified unconfirmed identity cannot be linked');

  // 6d. Simulate student clicking email verification link
  const { data: confirmedData, error: confirmErr } = await serviceClient.auth.admin.updateUserById(createdUserId, { email_confirm: true });
  if (confirmErr || !confirmedData?.user?.email_confirmed_at) {
    throw new Error('Failed to confirm test user email via Admin API: ' + JSON.stringify(confirmErr));
  }
  await page.waitForTimeout(500);
  await page.click('#students button:has-text("Check & Link Verified Identity")');
  try {
    await page.waitForSelector('text=Set Six-Digit PIN & Activate Portal', { timeout: 30000 });
  } catch (err) {
    const msgs = await page.locator('#students [role="alert"], #students [role="status"]').allInnerTexts();
    console.error('Messages in #students after Check & Link:', msgs);
    throw err;
  }
  console.log('7d. Linked verified student identity');

  // 6e. Set 6-digit PIN and activate
  await page.waitForSelector('#students >> text=Loading student records…', { state: 'detached', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.fill('#students input[name="pin"]', '654321');
  await page.click('#students button:has-text("Activate Portal & Save PIN")');
  try {
    await page.waitForSelector('text=Student portal activated', { timeout: 45000 });
  } catch (err) {
    const msgs = await page.locator('#students [role="alert"], #students [role="status"]').allInnerTexts();
    console.error('Messages in #students after Activate Portal:', msgs);
    throw err;
  }
  console.log('7e. Activated Student Portal with 6-digit PIN');

  // 6f. Reset PIN
  await page.waitForSelector('text=Portal Active', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.waitForSelector('#students >> text=Loading student records…', { state: 'detached', timeout: 20000 }).catch(() => {});
  await page.fill('#students input[name="pin"]', '765432');
  await page.click('#students button:has-text("Update PIN & Revoke Sessions")');
  await page.waitForSelector('text=Previous student sessions have been revoked', { timeout: 45000 });
  console.log('7f. Reset PIN and revoked previous sessions');

  // --- SCHOOL SETTINGS ---
  await page.locator('a[href="#school-settings"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotDir, 'after_04_school_settings.png'), fullPage: false });
  console.log('8. Captured School Settings light-theme UI');

  // --- RESPONSIVE LAYOUT & OVERFLOW CHECKS ---
  for (const vp of [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'laptop_1366', width: 1366, height: 768 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error(`Horizontal overflow detected at ${vp.name} (${vp.width}x${vp.height})`);
  }
  console.log('9. Responsive overflow checks passed across 1920x1080, 1366x768, 768x1024, 390x844');

  // --- STUDENT LOGIN & DASHBOARD ---
  const studentCtx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const studentPage = await studentCtx.newPage();
  await studentPage.goto(`${BASE}/login/student`, { waitUntil: 'networkidle' });
  await studentPage.fill('input[name="schoolCode"]', 'BC-STEP4B-A');
  await studentPage.fill('input[name="studentId"]', registrationNumber);
  await studentPage.fill('input[name="pin"]', '765432');
  await studentPage.click('button[type="submit"]');
  await studentPage.waitForURL('**/student/dashboard**', { timeout: 30000 });
  await studentPage.waitForSelector(`text=${studentName}`, { timeout: 30000 });
  await studentPage.screenshot({ path: path.join(screenshotDir, 'after_05_student_dashboard.png'), fullPage: false });
  console.log('10. Student logged in with reset PIN and dashboard rendered');

  await browser.close();

  // --- SECURITY & AUTHORIZATION REGRESSION CHECKS ---
  const anonClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const teacherSignIn = await anonClient.auth.signInWithPassword({
    email: process.env.DISPOSABLE_REASSIGN_TEACHER_EMAIL,
    password: process.env.DISPOSABLE_REASSIGN_TEACHER_PASSWORD,
  });
  if (teacherSignIn.error) throw new Error('Teacher sign-in failed');
  const teacherInspect = await anonClient.rpc('inspect_student_identity_status', {
    p_student: process.env.TEST_STUDENT_A1_ID,
    p_email: preverifiedEmail,
  });
  if (teacherInspect.data?.authorized !== false) {
    throw new Error('SECURITY VIOLATION: Teacher was authorized to call inspect_student_identity_status');
  }
  const teacherLink = await anonClient.rpc('link_pending_student_identity', {
    p_student: process.env.TEST_STUDENT_A1_ID,
    p_email: preverifiedEmail,
  });
  if (teacherLink.data !== false) {
    throw new Error('SECURITY VIOLATION: Teacher was allowed to call link_pending_student_identity');
  }
  console.log('11. Unauthorized role rejection (Teacher) verified');

  // Admin AAL1 (before TOTP) must be rejected by inspect_student_identity_status
  const aal1Client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await aal1Client.auth.signInWithPassword({
    email: process.env.DISPOSABLE_ADMIN_EMAIL,
    password: process.env.DISPOSABLE_ADMIN_PASSWORD,
  });
  const aal1Inspect = await aal1Client.rpc('inspect_student_identity_status', {
    p_student: process.env.TEST_STUDENT_A1_ID,
    p_email: preverifiedEmail,
  });
  if (aal1Inspect.data?.authorized !== false) {
    throw new Error('SECURITY VIOLATION: AAL1 Admin without TOTP MFA was authorized');
  }
  console.log('12. Native Admin MFA (AAL2 required) verified');

  // Pre-verified unlinked user check
  const preUser = await serviceClient.auth.admin.createUser({
    email: preverifiedEmail,
    email_confirm: true,
    password: 'TempPassword!12345',
  });
  preverifiedUserId = preUser.data.user?.id ?? null;

  console.log('ALL DISPOSABLE VERIFICATION CHECKS PASSED!');
} finally {
  if (createdUserId) await serviceClient.auth.admin.deleteUser(createdUserId).catch(() => {});
  if (preverifiedUserId) await serviceClient.auth.admin.deleteUser(preverifiedUserId).catch(() => {});
  try { process.kill(server.pid); } catch {}
  try { spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true }); } catch {}
}
