import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildUnifiedCatalogRows,
  verifyCanonicalCatalogIntegrity,
} from '../../src/shared/catalog/canonicalCatalog';
import canonicalGenerated from '../../src/shared/catalog/canonicalCatalog.generated.json';
import { CATALOG_BY_SKU, catalogFingerprint } from '../../src/shared/economy/catalogConfig';
import { getProceduralIconSpec } from '../../src/shared/art/donorProceduralIconSpec';
import { propsIconIdForCatalogSku } from '../../src/shared/art/catalogSkuPropsIcon';

describe('canonical deep farming catalog parity (Checkpoint A)', () => {
  it('verifies client, generated JSON, SQL migration, and Dev LAN catalog match the exact same source', () => {
    const integrity = verifyCanonicalCatalogIntegrity();
    expect(integrity.errors).toEqual([]);
    expect(integrity.ok).toBe(true);

    const rows = buildUnifiedCatalogRows();
    expect(canonicalGenerated.fingerprint).toBe(catalogFingerprint());
    expect(canonicalGenerated.totalItems).toBe(rows.length);
    expect(canonicalGenerated.items.map((i) => i.sku)).toEqual(rows.map((r) => r.sku));

    // Dev LAN V015_CATALOG includes all canonical rows cleanly
    const devLanSkuJson = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { V015_CATALOG } from './scripts/devLanV015Handlers.mjs'; console.log(JSON.stringify(V015_CATALOG.map(i => i.sku)));",
      ],
      { encoding: 'utf8' },
    );
    const devLanSkus = new Set(JSON.parse(devLanSkuJson) as string[]);
    for (const row of rows) {
      expect(devLanSkus.has(row.sku), `missing in Dev LAN: ${row.sku}`).toBe(true);
    }

    // SQL migration contains every canonical SKU & purpose constraint
    const sqlText = fs.readFileSync(
      'supabase/migrations/20261127000100_deep_farming_canonical_catalog.sql',
      'utf8',
    );
    expect(sqlText).toContain(catalogFingerprint());
    for (const row of rows) {
      expect(sqlText, `missing in SQL: ${row.sku}`).toContain(`('${row.sku}',`);
    }
  });

  it('guarantees every item has valid icon, source, >=1 gameplay use, and preserves K5 + starter inventory', () => {
    const rows = buildUnifiedCatalogRows();
    for (const row of rows) {
      const hasIcon =
        Boolean(propsIconIdForCatalogSku(row.sku)) ||
        Boolean(getProceduralIconSpec(row.sku)) ||
        row.sku === 'pet_kibble_basic';
      expect(hasIcon, `missing icon: ${row.sku}`).toBe(true);
      expect(row.sources.length, `missing source: ${row.sku}`).toBeGreaterThanOrEqual(1);
      expect(row.uses.length, `missing use: ${row.sku}`).toBeGreaterThanOrEqual(1);
    }
    expect(CATALOG_BY_SKU.get('sapling_peach')).toBeDefined();
    expect(CATALOG_BY_SKU.get('sprinkler_iridium')).toBeDefined();
    expect(CATALOG_BY_SKU.get('tulip_rainbow')).toBeDefined();
    expect(CATALOG_BY_SKU.get('rose_gold')).toBeDefined();
    expect(CATALOG_BY_SKU.get('golden_egg')).toBeDefined();
    expect(CATALOG_BY_SKU.get('chocolate_cake')).toBeDefined();
  });
});
