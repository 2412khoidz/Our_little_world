import { describe, expect, it } from 'vitest';
import { catalogFingerprint } from '../../src/shared/economy/catalogConfig';
import {
  buildUnifiedCatalogRows,
  CANONICAL_K5_STARTER_CATALOG,
  verifyCanonicalCatalogIntegrity,
} from '../../src/shared/catalog/canonicalCatalog';

describe('buildUnifiedCatalogRows', () => {
  it('passes canonical catalog integrity and merges starter + deep farming SKUs without duplicates', () => {
    const integrity = verifyCanonicalCatalogIntegrity();
    expect(integrity.errors).toEqual([]);
    expect(integrity.ok).toBe(true);
    expect(catalogFingerprint()).toBe(integrity.fingerprint);

    const rows = buildUnifiedCatalogRows();
    expect(rows.length).toBeGreaterThanOrEqual(240);
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
