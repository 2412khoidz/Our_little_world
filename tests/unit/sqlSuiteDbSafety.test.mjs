import { describe, expect, it } from 'vitest';
import {
  assertDisposableDatabaseName,
  assertLoopbackDatabaseUrl,
  deriveUpgradeDatabaseName,
  parseDatabaseNameFromUrl,
} from '../../scripts/sqlSuiteDbSafety.mjs';

describe('sqlSuiteDbSafety', () => {
  it('allows dedicated olw_sql_* names', () => {
    expect(assertDisposableDatabaseName('olw_sql_test')).toBe('olw_sql_test');
    expect(deriveUpgradeDatabaseName('olw_sql_test')).toBe('olw_sql_test_upgrade');
  });

  it('refuses postgres and template databases', () => {
    expect(() => assertDisposableDatabaseName('postgres')).toThrow(/reserved/i);
    expect(() => assertDisposableDatabaseName('template1')).toThrow(/reserved/i);
    expect(() => assertDisposableDatabaseName('my_world_prod')).toThrow(/non-disposable/i);
  });

  it('parses database name from URL paths', () => {
    expect(parseDatabaseNameFromUrl('postgresql://postgres@127.0.0.1:5432/olw_sql_test')).toBe(
      'olw_sql_test',
    );
  });

  it('refuses non-loopback URLs', () => {
    expect(() => assertLoopbackDatabaseUrl('postgresql://db.example.com/olw_sql_test')).toThrow(
      /loopback/i,
    );
  });
});