import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('catalog SQL preview', () => {
  it('preserves K5 and economy SKUs and the approved economy fingerprint', () => {
    const result = execFileSync(process.execPath, ['scripts/generate-item-catalog-sql.ts'], { encoding: 'utf8' });
    expect(result).toContain('71f9ecca');
    expect(result).toContain("('pet_kibble_basic',");
    expect(result).toContain("('seed_wheat',");
    expect(result).toContain("('wild_herb',");
    expect(result).toContain("ON CONFLICT (sku) DO UPDATE");
    expect(result).not.toContain('\\\\n');
  });
});
