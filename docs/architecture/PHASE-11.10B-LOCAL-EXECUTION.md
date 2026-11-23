# Phase 11.10B local execution evidence

The confirmed worktree is `D:\O\Office Projects\School ERP\.next-isolated\phase11-live-erp-recovery`, on `codex/phase-11-live-erp-recovery`, base `a6872451856d390c80d2fd7324fd297cda201f3e`.

## SQL execution outcome

BLOCKED before cluster initialization completed. PostgreSQL 17.11 binaries exist, but `C:\Program Files\PostgreSQL\17\share\postgres.bki` is missing. The installed share/timezone directory is also absent. The initdb process returned exit 1 and created no data directory. No server start, SQL bootstrap, historical migration, Phase 11.9 draft or PostgreSQL RLS test ran. Port 54330 had no listener at the completion check.

The new launcher is `verification/step-24a/run-phase11-10-fresh17.ps1`. It verifies the exact branch and base, rejects pre-existing output directories and PostgreSQL environment overrides, verifies the explicit 26-file migration inventory and each file against HEAD, pins binaries to PostgreSQL 17, checks local server identity before SQL, saves native output per stage and attempts targeted shutdown in finally. It now checks for postgres.bki before creating any output directory. It never deletes directories.

Preserved logs are under `verification/step-24a/pg-phase11-10-fresh17/logs`. The manifest records all 26 local file SHA-256 values. `initdb.log` contains the actual failure and `outcome.txt` records the failed stage. No additional cluster was created. The interrupted PostgreSQL 18 cluster was not read or modified during this run.

## Offline verification

The eight focused suites completed with 86 passing Node tests, including 93 assertions in the Staff SDK/mock suite and 13 School Admin authorization assertions. ESLint and PowerShell syntax validation passed with zero errors. The Windows Next.js production build passed with non-loopback fetches blocked by the existing verification guard. These checks provide no PostgreSQL RLS or native Supabase session evidence. An initial parallel standalone TypeScript run raced with the build regenerating .next/types. The standalone TypeScript rerun passed after the completed build.

## Recovery prerequisite

Obtain separate approval to repair the PostgreSQL 17 installation using an authenticated official matching distribution. Do not substitute PostgreSQL 18 share files or install software under the current approval. The evidence directory already exists and the fresh launcher will refuse it. A later execution requires a separately approved new empty directory or an explicitly approved handling plan for these failed-attempt logs.

Native Supabase session issuance, signed JWT claims, PIN proof and target-specific Auth catalog/RLS behavior remain unverified. The local SQL suite uses mocked Auth tables and injected claims. Its future success would establish PostgreSQL authorization behavior only.
