import { ITEM_CATALOG, catalogFingerprint } from '../src/shared/economy/catalogConfig.ts';
import { V015_ITEM_CATALOG } from '../src/shared/inventory/inventoryRules.ts';
import type { ItemGroup } from '../src/shared/economy/types.ts';

const purposeByGroup: Record<ItemGroup, string> = {
  seed: 'seed', grain: 'crop', veg: 'crop', fruit: 'crop', flower: 'crop',
  fish: 'fish', dish: 'dish', material: 'ingredient', pantry: 'ingredient',
  bait: 'ingredient', craft: 'ingredient',
};
const sql = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const skuSet = new Set<string>();
const rows = [
  ...V015_ITEM_CATALOG.map((item) => ({
    sku: item.sku, name: item.nameVi, description: item.descriptionVi,
    purpose: item.purpose, stack: item.stackLimit, tradeable: item.tradeable,
  })),
  ...ITEM_CATALOG.map((item) => ({
    sku: item.sku, name: item.nameVi, description: '',
    purpose: purposeByGroup[item.group], stack: item.stackLimit, tradeable: false,
  })),
];
for (const row of rows) {
  if (skuSet.has(row.sku)) throw new Error('Duplicate SKU: ' + row.sku);
  skuSet.add(row.sku);
}
if (catalogFingerprint() !== '7076075b') throw new Error('Production catalog fingerprint changed');
console.log('-- Generated SQL preview. Review and commit as a migration only after migration history is resolved.');
console.log('-- Economy catalog fingerprint: ' + catalogFingerprint());
console.log('INSERT INTO public.item_catalog (sku, name_vi, description_vi, purpose, stack_limit, tradeable) VALUES');
console.log(rows.map((row) => '  (' + [
  sql(row.sku), sql(row.name), sql(row.description), sql(row.purpose), row.stack,
  row.tradeable ? 'true' : 'false',
].join(', ') + ')').join(',\n'));
console.log('ON CONFLICT (sku) DO UPDATE SET name_vi = EXCLUDED.name_vi, description_vi = EXCLUDED.description_vi, purpose = EXCLUDED.purpose, stack_limit = EXCLUDED.stack_limit, tradeable = EXCLUDED.tradeable;');
