import fs from 'node:fs';
import assert from 'node:assert/strict';
import { prepareAuthTest, createPinnedAuthFetch } from './auth-test-target.mjs';
const report = { kind: 'ACTUAL GOTRUE', status: 'NOT RUN', checks: [], limitation: '' };
const write = () => fs.writeFileSync('verification/step-24c/gotrue.json', JSON.stringify(report,null,2));
let prepared;
try { prepared = prepareAuthTest(process.env); }
catch {
  report.limitation = 'Target approval or isolated synthetic test configuration is incomplete or rejected. No client created.';
  // Invalid configuration must not overwrite existing verification evidence.
  console.log('BLOCKED: no Auth requests made. Target approval and isolated test configuration are required.');
  process.exitCode = 2;
}
if (prepared) {
  try {
    const { target, credentials: { key, email, password } } = prepared;
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(target.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:createPinnedAuthFetch(target)}});
    const login = await client.auth.signInWithPassword({email,password});
    assert.equal(login.error,null); assert.ok(login.data.session && login.data.user?.email_confirmed_at);
    report.checks.push('Native password sign-in and confirmed email');
    const user = await client.auth.getUser(); assert.equal(user.error,null); assert.equal(user.data.user.id,login.data.user.id);
    report.checks.push('Provider user verification');
    const refreshed = await client.auth.refreshSession(); assert.equal(refreshed.error,null); assert.ok(refreshed.data.session);
    report.checks.push('Native session refresh');
    const logout = await client.auth.signOut({scope:'local'}); assert.equal(logout.error,null);
    const after = await client.auth.getSession(); assert.equal(after.data.session,null);
    report.checks.push('Local SDK session cleared after native sign-out');
    report.status='PASSED LIMITED SMOKE';
    report.limitation='Does not prove stale-token revocation, MFA, reset/verification emails, PIN-to-native-session bridging or browser E2E.';
  } catch {
    report.status='FAILED'; report.limitation='Native Auth check failed; provider details and credentials intentionally omitted.'; process.exitCode=1;
  } finally {
    try { write(); }
    catch { console.error('Unable to save Auth verification report.'); process.exitCode = 1; }
  }
}
