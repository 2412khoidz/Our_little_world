#!/usr/bin/env node
/**
 * Fresh-install + SQL regression on disposable loopback PostgreSQL.
 * Usage (PowerShell):
 *   $env:OLW_SQL_TEST_DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/olw_sql_test"
 *   node scripts/run-local-sql-suite.mjs
 *
 * Bash:
 *   OLW_SQL_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/olw_sql_test node scripts/run-local-sql-suite.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const migrationsDir = path.join(repoRoot, 'supabase/migrations');
const testsDir = path.join(repoRoot, 'supabase/tests');
const bootstrapPath = path.join(testsDir, 'fixtures/local_auth_bootstrap.sql');

const rawUrl = process.env.OLW_SQL_TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/olw_sql_test';
const target = new URL(rawUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
  console.error('Refusing non-loopback OLW_SQL_TEST_DATABASE_URL');
  process.exit(1);
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const sqlTestFiles = [
  'economy_integer_math.sql',
  'inventory_quality.sql',
  'physical_pet_care.sql',
  'pet_consumption_authority.sql',
  'v015_inventory_debit_and_mailbox.sql',
  'v015_inventory_security.sql',
  'v01_security_hardening.sql',
  'inventory_transfer_quality.sql',
  'mailbox_gift_quality.sql',
].filter((name) => fs.existsSync(path.join(testsDir, name)));

async function connectDb(dbName) {
  const url = new URL(rawUrl);
  url.pathname = `/${dbName}`;
  const client = new pg.Client({ connectionString: url.href });
  await client.connect();
  return client;
}

async function recreateDatabase(admin, dbName) {
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [dbName],
  );
  const qName = `"${dbName.replaceAll('"', '""')}"`;
  await admin.query(`DROP DATABASE IF EXISTS ${qName}`);
  await admin.query(`CREATE DATABASE ${qName}`);
}

async function grantAuthenticatedFixtureAccess(client) {
  await client.query(`
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT SELECT, INSERT ON TABLE realtime.messages TO authenticated;
    REVOKE ALL ON TABLE public.mutation_idempotency FROM authenticated;
    REVOKE ALL ON TABLE public.v015_rpc_idempotency FROM authenticated;
  `);
}

async function applyMigrations(client, label) {
  const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
  await client.query(bootstrap);
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query(sql);
    } catch (error) {
      throw new Error(`${label}: migration ${file} failed: ${error.message}`);
    }
  }
  await grantAuthenticatedFixtureAccess(client);
  console.log(`${label}: applied ${migrationFiles.length} migrations`);
}

async function runSqlTests(client, label) {
  for (const file of sqlTestFiles) {
    const sql = fs.readFileSync(path.join(testsDir, file), 'utf8');
    try {
      await client.query(sql);
      console.log(`${label}: PASS ${file}`);
    } catch (error) {
      throw new Error(`${label}: FAIL ${file}: ${error.message}`);
    }
  }
}

async function main() {
  const dbName = target.pathname.replace(/^\//, '') || 'olw_sql_test';
  const adminUrl = new URL(rawUrl);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.href });
  await admin.connect();

  await recreateDatabase(admin, dbName);
  const fresh = await connectDb(dbName);
  await applyMigrations(fresh, 'fresh');
  await runSqlTests(fresh, 'fresh');
  await fresh.end();

  const upgradeDb = `${dbName}_upgrade`;
  await recreateDatabase(admin, upgradeDb);
  const up = await connectDb(upgradeDb);
  const stopBefore = migrationFiles.findIndex((f) => f.startsWith('20261125000900'));
  const early = migrationFiles.slice(0, stopBefore > 0 ? stopBefore : migrationFiles.length - 2);
  const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
  await up.query(bootstrap);
  for (const file of early) {
    await up.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  }
  const tail = migrationFiles.slice(early.length);
  for (const file of tail) {
    await up.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  }
  await grantAuthenticatedFixtureAccess(up);
  console.log(`upgrade: applied early ${early.length} + tail ${tail.length} migrations`);
  await runSqlTests(up, 'upgrade');
  await up.end();

  if (fs.existsSync(path.join(testsDir, 'v01_security_concurrency.cjs'))) {
    process.env.OLW_SQL_TEST_DATABASE_URL = rawUrl;
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(process.execPath, [path.join(testsDir, 'v01_security_concurrency.cjs')], {
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) {
      throw new Error('v01_security_concurrency.cjs failed');
    }
  }

  await admin.end();
  console.log('SQL suite complete');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});