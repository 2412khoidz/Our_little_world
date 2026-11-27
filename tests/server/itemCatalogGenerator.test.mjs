import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { catalogFingerprint } from '../../src/shared/economy/catalogConfig';

describe('catalog SQL preview', () => {
  it('preserves K5 and economy SKUs and matches the current economy fingerprint', () => {
    const result = execFileSync(process.execPath, ['scripts/generate-item-catalog-sql.ts'], { encoding: 'utf8' });
    expect(result).toContain(catalogFingerprint());
    expect(result).toContain("('pet_kibble_basic',");
    expect(result).toContain("('seed_wheat',");
    expect(result).toContain("('sapling_peach',");
    expect(result).toContain("('wild_herb',");
    expect(result).toContain("ON CONFLICT (sku) DO UPDATE");
    expect(result).not.toContain('\\\\n');
  });
});
