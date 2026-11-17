import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

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
  createRequire(import.meta.url).resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port),
], {
  windowsHide: true,
  env: { ...process.env, VERCEL_ENV: 'production', BRIGHTCAMP_ENABLE_LIVE_BUILD: 'true',
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
    const demoRoutes = ['/', '/admin/dashboard', '/teacher/dashboard', '/student/dashboard', '/parent/dashboard', '/accountant/dashboard'];
    const loginRoutes = ['/login/student', '/login/parent'];
    const frames = [
      ...[390, 768, 1440].flatMap(width => demoRoutes.map(route => ({ route, width }))),
      ...loginRoutes.map(route => ({ route, width: 390 })),
    ];
    // A loopback proxy lets the browser measure real pages inside fixed-width same-origin frames.
    const mobile = createServer(async (request, response) => {
      try {
        const url = new URL(request.url, origin);
        if (request.method !== 'GET' || url.origin !== origin) { response.writeHead(400).end(); return; }
        if (url.pathname === '/mobile-check') {
          response.writeHead(200, { 'content-type': 'text/html' });
          response.end('<pre id="results"></pre><script>function measure(frame) {' +
            'const d=frame.contentDocument;const viewport=d.documentElement.clientWidth;' +
            'const scroll=d.documentElement.scrollWidth;const form=d.querySelector("form");' +
            'const blocked=form && !form.hasAttribute("action") && [...form.querySelectorAll("input,button")].every(e=>e.disabled);' +
            'const links=[...d.querySelectorAll("a[href]")].map(a=>a.getAttribute("href"));' +
            'const missing=links.filter(h=>h.startsWith("#")&&!d.getElementById(h.slice(1)));' +
            'const cards=[...d.querySelectorAll("main a[data-role]")].map(a=>a.getAttribute("href"));' +
            'const liveLinks=links.some(h=>/^\\/(staff|portal|login|register)(?:\\/|$)/.test(h));' +
            'const demo=d.body.innerText.includes("DEMO");' +
            'document.querySelector("pre").textContent+=JSON.stringify({route:frame.dataset.route,width:Number(frame.dataset.width),viewport,scroll,blocked,demo,missing,cards,liveLinks});' +
            '}</script>' + frames.map(({ route, width }) => '<iframe style="display:block;border:0;width:' + width + 'px;height:850px" ' +
              'data-route="' + route + '" data-width="' + width + '" src="' + route + '" onload="measure(this)"></iframe>').join(''));
          return;
        }
        const upstream = await fetch(url, { redirect: 'manual' });
        response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/octet-stream' });
        response.end(Buffer.from(await upstream.arrayBuffer()));
      } catch { response.writeHead(502).end(); }
    });
    mobile.listen(0, '127.0.0.1');
    await once(mobile, 'listening');
    try {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcamp-mobile-'));
      const { stdout } = await promisify(execFile)(chrome, [
        '--headless', '--disable-gpu', '--disable-background-networking', '--no-first-run',
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
        '--user-data-dir=' + profile, '--virtual-time-budget=12000', '--dump-dom',
        'http://127.0.0.1:' + mobile.address().port + '/mobile-check',
      ], { windowsHide: true, timeout: 35000 });
      const results = stdout.match(/<pre id="results">([^<]+)<\/pre>/)?.[1];
      assert.ok(results, 'No mobile viewport measurements');
      const measured = JSON.parse('[' + results.replaceAll('}{', '},{') + ']');
      assert.deepEqual(measured.map(item => item.width + item.route).sort(), frames.map(item => item.width + item.route).sort());
      for (const item of measured) {
        assert.ok(item.viewport > 0 && item.viewport <= item.width, item.route);
        assert.equal(item.scroll, item.viewport, item.width + 'px ' + item.route + ' overflows horizontally');
        if (item.route.startsWith('/login/')) assert.equal(item.blocked, true, item.route);
        else {
          assert.equal(item.demo, true, item.route + ' missing DEMO label');
          assert.equal(item.liveLinks, false, item.route + ' links to a live operation');
          assert.deepEqual(item.missing, [], item.route + ' contains unresolved section links');
          if (item.route === '/') assert.deepEqual(item.cards.sort(), demoRoutes.slice(1).sort());
        }
      }
      console.log('PASS: homepage and five DEMO layouts at 390, 768 and 1440px, section and workspace links, and both disabled credential forms');
    } finally {
      mobile.closeAllConnections();
      await new Promise(resolve => mobile.close(resolve));
    }
    assert.ok(!output.includes('PREVIEW_OUTBOUND_FETCH_BLOCKED'), 'Browser flow triggered an outbound server request');
    console.log('PASS: Chromium Student and Accountant previews and protected staff redirect');
  }
} finally {
  if (server.exitCode === null) server.kill();
  await closed;
}
