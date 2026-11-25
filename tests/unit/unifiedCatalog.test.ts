import { describe, expect, it } from 'vitest';
import { catalogFingerprint } from '../../src/shared/economy/catalogConfig';
import { buildUnifiedCatalogRows, CANONICAL_K5_STARTER_CATALOG } from '../../src/shared/catalog/canonicalCatalog';

describe('buildUnifiedCatalogRows', () => {
  it('keeps economy fingerprint and merges starter SKUs without duplicates', () => {
    expect(catalogFingerprint()).toBe('7076075b');
    const rows = buildUnifiedCatalogRows();
    const skus = new Set(rows.map((r) => r.sku));
    expect(skus.size).toBe(rows.length);
    for (const starter of CANONICAL_K5_STARTER_CATALOG) {
      const row = rows.find((r) => r.sku === starter.sku);
      expect(row?.purpose).toBe(starter.purpose);
      expect(row?.stackLimit).toBe(starter.stackLimit);
      expect(row?.tradeable).toBe(starter.tradeable);
    }
  });
});