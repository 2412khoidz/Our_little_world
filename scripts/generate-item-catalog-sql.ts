import { catalogFingerprint } from '../src/shared/economy/catalogConfig.ts';
import { buildUnifiedCatalogRows } from '../src/shared/catalog/unifiedCatalog.ts';

const sql = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const rows = buildUnifiedCatalogRows();

console.log('-- Generated from src/shared/catalog/unifiedCatalog.ts (single source).');
console.log('-- Economy catalog fingerprint: ' + catalogFingerprint());
console.log('INSERT INTO public.item_catalog (sku, name_vi, description_vi, purpose, stack_limit, tradeable) VALUES');
console.log(
  rows
    .map(
      (row) =>
        '  (' +
        [sql(row.sku), sql(row.nameVi), sql(row.descriptionVi), sql(row.purpose), row.stackLimit, row.tradeable ? 'true' : 'false'].join(
          ', ',
        ) +
        ')',
    )
    .join(',\n'),
);
console.log(
  'ON CONFLICT (sku) DO UPDATE SET name_vi = EXCLUDED.name_vi, description_vi = EXCLUDED.description_vi, purpose = EXCLUDED.purpose, stack_limit = EXCLUDED.stack_limit, tradeable = EXCLUDED.tradeable;',
);