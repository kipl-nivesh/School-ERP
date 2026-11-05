import nextEnv from '@next/env';
import fs from 'node:fs';
import ts from 'typescript';

// Load locally without printing any environment values or provider response bodies.
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const js = ts.transpileModule(fs.readFileSync('src/lib/supabase/config.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { getSupabasePublicConfiguration } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const configuration = getSupabasePublicConfiguration();
if (!configuration.configured) {
  console.error('NOT CONFIGURED: ' + configuration.issues.join(', ') + '. Set only the public URL and modern publishable key in Git-ignored .env.local. No network request made.');
  process.exitCode = 1;
} else if (!process.argv.includes('--probe')) {
  console.log('PASS: public configuration format accepted. Key not displayed. No network request made; connectivity and authentication remain unverified.');
} else {
  try {
    // Read-only Auth settings endpoint: no table reads, sessions, signups, writes or SQL.
    const response = await fetch(new URL('/auth/v1/settings', configuration.url), {
      method: 'GET', headers: { apikey: configuration.publishableKey }, redirect: 'error',
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('CONNECTION CHECK FAILED: HTTP ' + response.status + '. No response body or key displayed.');
      process.exitCode = 1;
    } else {
      await response.body?.cancel();
      console.log('PASS: read-only Auth settings endpoint returned HTTP ' + response.status + '. This does not prove school login, RLS, project region/plan or PIN compatibility. No key or response body displayed.');
    }
  } catch {
    console.error('CONNECTION CHECK FAILED: network/TLS/redirect/timeout error. Details and configuration values withheld.');
    process.exitCode = 1;
  }
}
