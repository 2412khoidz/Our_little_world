/**
 * Guards for disposable local PostgreSQL used only by scripts/run-local-sql-suite.mjs.
 * Refuses reserved/system DB names and any name outside the dedicated olw_sql_* prefix.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const FORBIDDEN_DB_NAMES = new Set(['postgres', 'template0', 'template1']);

/** Dedicated disposable databases created by the SQL suite (never production/player stores). */
export const DISPOSABLE_DB_PATTERN = /^olw_sql_[a-z0-9][a-z0-9_-]{0,48}$/i;

export function resolveScriptDir(importMetaUrl) {
  return path.dirname(fileURLToPath(importMetaUrl));
}

export function parseDatabaseNameFromUrl(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error('Invalid OLW_SQL_TEST_DATABASE_URL');
  }
  const rawPath = target.pathname.replace(/^\//, '');
  const dbName = decodeURIComponent(rawPath || 'olw_sql_test');
  return dbName.split('/')[0] ?? dbName;
}

export function deriveUpgradeDatabaseName(baseName) {
  assertDisposableDatabaseName(baseName);
  if (baseName.endsWith('_upgrade')) {
    return baseName;
  }
  return `${baseName}_upgrade`;
}

export function assertDisposableDatabaseName(dbName) {
  const normalized = String(dbName ?? '').trim().replace(/^"|"$/g, '');
  if (!normalized) {
    throw new Error('Empty database name in connection URL');
  }
  const lower = normalized.toLowerCase();
  if (FORBIDDEN_DB_NAMES.has(lower) || lower.startsWith('template')) {
    throw new Error(`Refusing reserved PostgreSQL database name: ${normalized}`);
  }
  if (!DISPOSABLE_DB_PATTERN.test(normalized)) {
    throw new Error(
      `Refusing non-disposable database "${normalized}". Use a dedicated name such as olw_sql_test on loopback only.`,
    );
  }
  return normalized;
}

export function assertLoopbackDatabaseUrl(rawUrl) {
  const target = new URL(rawUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
    throw new Error('Refusing non-loopback OLW_SQL_TEST_DATABASE_URL');
  }
  assertDisposableDatabaseName(parseDatabaseNameFromUrl(rawUrl));
}