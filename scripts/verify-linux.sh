#!/bin/sh
# Run only in a fresh, disposable Linux checkout. No Docker, migrations or deployment.
set -eu
[ "$(uname -s)" = Linux ] || { echo 'Linux execution required'; exit 1; }
[ ! -d node_modules ] || { echo 'Use a fresh checkout without node_modules; nothing was removed.'; exit 1; }
for file in .env .env.local .env.production .env.production.local; do
  [ ! -f "$file" ] || { echo 'Use a checkout without local environment files.'; exit 1; }
done
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY DATABASE_URL
export STAFF_AUTH_REQUESTS_ENABLED=false
export NEXT_TELEMETRY_DISABLED=1
npm ci --no-audit --no-fund
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run lint
node --test verification/verify-auth-test-target.mjs verification/verify-fast-track.mjs
node verification/verify-supabase-config.mjs
node verification/verify-step24b-tenant-client.mjs
VERCEL_ENV=preview BRIGHTCAMP_ENABLE_LIVE_BUILD=true STAFF_AUTH_REQUESTS_ENABLED=true \
  NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_BRIGHTCAMP_PREVIEW_CANARY npm run build
node verification/verify-preview-local.mjs
