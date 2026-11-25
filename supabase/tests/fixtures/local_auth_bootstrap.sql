-- Minimal Supabase-compatible auth fixture for disposable local PostgreSQL.
-- Apply once per fresh database before OLW migrations.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(trim(current_setting('request.jwt.claim.sub', true)), '')::uuid
$$;

DO $$ BEGIN
  CREATE ROLE authenticated NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE anon NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;

CREATE SCHEMA IF NOT EXISTS realtime;
CREATE TABLE IF NOT EXISTS realtime.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic text NOT NULL DEFAULT '',
  extension text NOT NULL DEFAULT 'broadcast',
  event text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION realtime.topic()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(trim(current_setting('realtime.topic', true)), '')
$$;
GRANT USAGE ON SCHEMA realtime TO authenticated;