import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Read values only in memory; never print configuration or credential material.
const env = fs.readFileSync('.env.local', 'utf8');
assert.equal(/^STAFF_AUTH_REQUESTS_ENABLED\s*=\s*true\s*$/m.test(env), false);
const key = env.match(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
assert.ok(key?.startsWith('sb_publishable_'));
function inspect(file) {
  if (fs.statSync(file).isDirectory()) { for (const name of fs.readdirSync(file)) inspect(path.join(file, name)); return; }
  if (!/\.(?:ts|tsx|js|mjs|json|md|sql|css)$/.test(file) && file !== '.env.example') return;
  assert.equal(fs.readFileSync(file, 'utf8').includes(key), false, 'Local key must not appear in source or artifacts');
}
for (const root of ['src', 'supabase', 'verification', 'docs', 'README.md', '.env.example']) inspect(root);
const baseline = JSON.parse(fs.readFileSync('verification/step-14/preserved-before.json', 'utf8'));
const { createHash } = await import('node:crypto');
const allowed = new Set(['.env.example', 'README.md', 'supabase/README.md', 'src/lib/supabase/server.ts', 'tsconfig.tsbuildinfo']);
for (const entry of baseline) {
  const relative = path.relative(process.cwd(), entry.Path).replaceAll('\\', '/');
  if (!allowed.has(relative)) assert.equal(createHash('sha256').update(fs.readFileSync(entry.Path)).digest('hex').toUpperCase(), entry.Hash, 'Preservation: ' + relative);
}
console.log('PASS: local flag remains off, publishable key absent from source/artifacts, all other baseline files preserved.');

// Local HTTP only; no provider requests. Run against the production server started with flag=false.
const routes = ['/', '/admin/dashboard', '/teacher/dashboard', '/student/dashboard', '/parent/dashboard', '/accountant/dashboard', '/login/staff', '/staff', '/staff/admin', '/staff/teacher', '/staff/accountant', '/staff/unknown'];
const results = [];
for (const route of routes) {
  const response = await fetch('http://127.0.0.1:3008' + route, { redirect: 'manual' });
  const protectedRoute = route === '/staff' || ['/staff/admin', '/staff/teacher', '/staff/accountant'].includes(route);
  assert.equal(response.status, protectedRoute ? 307 : route === '/staff/unknown' ? 404 : 200, route);
  if (protectedRoute) assert.equal(response.headers.get('location'), '/login/staff');
  results.push({ route, status: response.status, location: response.headers.get('location') });
}
fs.writeFileSync('verification/step-14/production-routes.json', JSON.stringify(results, null, 2) + '\n');
console.log('PASS: 12 local production route checks; protected routes deny access. No hosted requests.');
