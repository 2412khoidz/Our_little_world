import { describe, expect, it } from 'vitest';
import { duplicateMigrationVersions } from '../../scripts/check-migration-versions.mjs';

describe('migration version guard', () => {
  it('reports both files sharing a version', () => {
    expect(duplicateMigrationVersions(['20261125000100_first.sql', '20261125000100_second.sql']))
      .toEqual([['20261125000100', ['20261125000100_first.sql', '20261125000100_second.sql']]]);
  });

  it('accepts unique versions and rejects malformed migration names', () => {
    expect(duplicateMigrationVersions(['20261124000100_first.sql', '20261125000100_second.sql'])).toEqual([]);
    expect(() => duplicateMigrationVersions(['missing-version.sql'])).toThrow('Invalid migration filename');
  });
});
