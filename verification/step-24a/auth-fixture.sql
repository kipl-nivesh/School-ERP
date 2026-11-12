CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT anon, authenticated, service_role TO postgres;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  email_confirmed_at timestamptz DEFAULT now(),
  banned_until timestamptz DEFAULT NULL,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.mfa_factors (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_type text NOT NULL,
  status text NOT NULL
);

-- Mock auth helpers
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT coalesce(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
