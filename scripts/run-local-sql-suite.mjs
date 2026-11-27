#!/usr/bin/env node
/**
 * Fresh-install + SQL regression on disposable loopback PostgreSQL.
 * Usage (PowerShell):
 *   $env:OLW_SQL_TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/olw_sql_test"
 *   node scripts/run-local-sql-suite.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  assertDisposableDatabaseName,
  assertLoopbackDatabaseUrl,
  deriveUpgradeDatabaseName,
  parseDatabaseNameFromUrl,
  resolveScriptDir,
} from './sqlSuiteDbSafety.mjs';

const repoRoot = path.resolve(resolveScriptDir(import.meta.url), '..');
const migrationsDir = path.join(repoRoot, 'supabase/migrations');
const testsDir = path.join(repoRoot, 'supabase/tests');
const bootstrapPath = path.join(testsDir, 'fixtures/local_auth_bootstrap.sql');
const upgradeSeedPath = path.join(testsDir, 'fixtures/upgrade_pre_01000_seed.sql');

const rawUrl = process.env.OLW_SQL_TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/olw_sql_test';
assertLoopbackDatabaseUrl(rawUrl);

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
  'pet_living_authority.sql',
  'billiards_matches.sql',
  'deep_farming_authority.sql',
].filter((name) => fs.existsSync(path.join(testsDir, name)));

const upgradeOnlyTest = 'upgrade_preserve_01000.sql';

async function connectDb(dbName) {
  const url = new URL(rawUrl);
  url.pathname = `/${dbName}`;
  const client = new pg.Client({ connectionString: url.href });
  await client.connect();
  return client;
}

async function assertNotPlayerProductionDatabase(admin, dbName) {
  assertDisposableDatabaseName(dbName);
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) {
    return;
  }
  if (!dbName.toLowerCase().startsWith('olw_sql_')) {
    throw new Error(`Refusing DROP: database "${dbName}" is not an olw_sql_* disposable name`);
  }
  let probe;
  try {
    probe = await connectDb(dbName);
    const reg = await probe.query(`SELECT to_regclass('public.worlds') IS NOT NULL AS has_worlds`);
    if (reg.rows[0]?.has_worlds) {
      const worlds = await probe.query('SELECT count(*)::int AS n FROM public.worlds');
      if (worlds.rows[0].n > 0 && !dbName.toLowerCase().includes('test') && !dbName.toLowerCase().includes('upgrade')) {
        throw new Error(
          `Refusing DROP: "${dbName}" contains ${worlds.rows[0].n} world(s) but name is not a recognised disposable test database`,
        );
      }
    }
  } finally {
    await probe?.end().catch(() => {});
  }
}

async function recreateDatabase(admin, dbName) {
  await assertNotPlayerProductionDatabase(admin, dbName);
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

async function runSqlTests(client, label, extraFiles = []) {
  for (const file of [...sqlTestFiles, ...extraFiles]) {
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
  const dbName = parseDatabaseNameFromUrl(rawUrl);
  const adminUrl = new URL(rawUrl);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.href });
  await admin.connect();

  await recreateDatabase(admin, dbName);
  const fresh = await connectDb(dbName);
  await applyMigrations(fresh, 'fresh');
  await runSqlTests(fresh, 'fresh');
  await fresh.end();

  const upgradeDb = deriveUpgradeDatabaseName(dbName);
  await recreateDatabase(admin, upgradeDb);
  const up = await connectDb(upgradeDb);
  const stopBefore = migrationFiles.findIndex((f) => f.startsWith('20261125000900'));
  const early = migrationFiles.slice(0, stopBefore > 0 ? stopBefore : migrationFiles.length - 2);
  const tail = migrationFiles.slice(early.length);
  const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
  await up.query(bootstrap);
  for (const file of early) {
    await up.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  }
  if (fs.existsSync(upgradeSeedPath)) {
    await up.query(fs.readFileSync(upgradeSeedPath, 'utf8'));
    console.log(`upgrade: seeded pre-tail fixture (${early.length} migrations applied)`);
  }
  for (const file of tail) {
    await up.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  }
  await grantAuthenticatedFixtureAccess(up);
  console.log(`upgrade: applied early ${early.length} + tail ${tail.length} migrations`);
  const upgradeExtras = fs.existsSync(path.join(testsDir, upgradeOnlyTest)) ? [upgradeOnlyTest] : [];
  await runSqlTests(up, 'upgrade', upgradeExtras);
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