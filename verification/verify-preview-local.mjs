import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const canary = 'sb_publishable_BRIGHTCAMP_PREVIEW_CANARY';
const providerUrl = 'https://abcdefghijklmnopqrst.supabase.co';
for (const directory of ['.next/server', '.next/static']) {
  for (const file of fs.readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(file.parentPath, file.name), 'utf8');
    assert.ok(!source.includes(canary) && !source.includes(providerUrl), 'Synthetic inherited credentials reached a compiled bundle');
  }
}

const listener = net.createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const { port } = listener.address();
await new Promise(resolve => listener.close(resolve));
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, [
  '--require', path.resolve('verification/preview-network-guard.cjs'),
  'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port),
], {
  windowsHide: true,
  env: { ...process.env, VERCEL_ENV: '', BRIGHTCAMP_ENABLE_LIVE_BUILD: 'true',
    STAFF_AUTH_REQUESTS_ENABLED: 'true', NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK: 'false',
    NEXT_PUBLIC_SUPABASE_URL: providerUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: canary,
    NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let output = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output += chunk; });

try {
  const deadline = Date.now() + 20000;
  while (!output.includes('Ready')) {
    assert.ok(server.exitCode === null && Date.now() < deadline, 'Local preview failed to start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const publicRoutes = ['/', '/admin/dashboard', '/teacher/dashboard', '/student/dashboard',
    '/parent/dashboard', '/accountant/dashboard', '/login/staff', '/login/staff/recover',
    '/login/student', '/login/parent', '/invite', '/register/school',
    '/register/school/status?id=11111111-1111-4111-8111-111111111111'];
  const protectedRoutes = new Map([
    ...['/staff','/staff/admin','/staff/teacher','/staff/accountant','/staff/select-school','/admin/onboarding']
      .map(route => [route, '/login/staff']),
    ['/portal/student', '/login/student'], ['/portal/parent', '/login/parent'],
  ]);
  for (const route of publicRoutes) {
    const response = await fetch(origin + route, { redirect: 'manual' });
    assert.equal(response.status, 200, route);
    const body = await response.text();
    assert.ok(!body.includes(canary) && !body.includes(providerUrl), route);
  }
  for (const [route, destination] of protectedRoutes) {
    const response = await fetch(origin + route, {
      redirect: 'manual',
      headers: { cookie: 'sb-abcdefghijklmnopqrst-auth-token=synthetic-invalid-cookie' },
    });
    assert.equal(response.status, 307, route);
    assert.equal(response.headers.get('location'), destination, route);
  }
  for (const route of ['/staff/unknown', '/portal/unknown']) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  assert.ok(!output.includes('PREVIEW_OUTBOUND_FETCH_BLOCKED'), 'Application attempted an outbound request');
  console.log('PASS: 23 route checks with inherited synthetic credentials and a locked build');

  const chrome = process.env.BRIGHTCAMP_CHROME_PATH;
  if (!chrome) console.log('BROWSER UNVERIFIED: set BRIGHTCAMP_CHROME_PATH to a Chromium executable');
  else {
    for (const route of ['/student/dashboard', '/accountant/dashboard', '/staff/admin']) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcamp-preview-'));
      const { stdout } = await promisify(execFile)(chrome, [
        '--headless', '--disable-gpu', '--disable-background-networking', '--no-first-run',
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
        '--user-data-dir=' + profile, '--dump-dom', origin + route,
      ], { windowsHide: true, timeout: 25000, maxBuffer: 8 * 1024 * 1024 });
      const visible = stdout.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      assert.match(visible, route === '/staff/admin' ? /Staff sign-in/i : /Brightcamp/i, route);
      assert.ok(!stdout.includes(canary) && !stdout.includes(providerUrl), route);
    }
    assert.ok(!output.includes('PREVIEW_OUTBOUND_FETCH_BLOCKED'), 'Browser flow triggered an outbound server request');
    console.log('PASS: Chromium Student and Accountant previews and protected staff redirect');
  }
} finally {
  if (server.exitCode === null) server.kill();
  await closed;
}
