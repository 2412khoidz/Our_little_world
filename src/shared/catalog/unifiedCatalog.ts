import { ITEM_CATALOG, catalogFingerprint } from '../economy/catalogConfig.ts';
import type { ItemGroup } from '../economy/types.ts';
import type { InventoryCatalogItem } from '../inventory/inventoryTypes.ts';
import { V015_ITEM_CATALOG } from '../inventory/inventoryRules.ts';

const purposeByGroup: Record<ItemGroup, string> = {
  seed: 'seed',
  grain: 'crop',
  veg: 'crop',
  fruit: 'crop',
  flower: 'crop',
  fish: 'fish',
  dish: 'dish',
  material: 'ingredient',
  pantry: 'ingredient',
  bait: 'ingredient',
  craft: 'ingredient',
};

export interface UnifiedCatalogRow {
  sku: string;
  nameVi: string;
  descriptionVi: string;
  purpose: string;
  stackLimit: number;
  tradeable: boolean;
}

/** Single merge of K5 starter catalog + economy catalog (stable SKUs, fingerprint 7076075b). */
export function buildUnifiedCatalogRows(): readonly UnifiedCatalogRow[] {
  if (catalogFingerprint() !== '7076075b') {
    throw new Error('Production economy catalog fingerprint must remain 7076075b');
  }

  const skuSet = new Set<string>();
  const rows: UnifiedCatalogRow[] = [
    ...V015_ITEM_CATALOG.map((item: InventoryCatalogItem) => ({
    sku: item.sku,
    nameVi: item.nameVi,
    descriptionVi: item.descriptionVi,
    purpose: item.purpose,
    stackLimit: item.stackLimit,
    tradeable: item.tradeable,
    })),
    ...ITEM_CATALOG.map((item) => ({
    sku: item.sku,
    nameVi: item.nameVi,
    descriptionVi: '',
    purpose: purposeByGroup[item.group],
    stackLimit: item.stackLimit,
    tradeable: false,
    })),
  ];

  for (const row of rows) {
    if (skuSet.has(row.sku)) {
      throw new Error(`Duplicate catalog SKU: ${row.sku}`);
    }
    skuSet.add(row.sku);
  }

  return rows;
}