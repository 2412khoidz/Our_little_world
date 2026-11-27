/**
 * Single canonical SKU registry for SQL seed, inventory UI, Dev LAN, and economy simulation.
 * Economy rows and donor content feed from catalogConfig / deepFarmingContent; K5 starters live here only once.
 */
import { propsIconIdForCatalogSku } from '../art/catalogSkuPropsIcon.ts';
import { getProceduralIconSpec } from '../art/donorProceduralIconSpec.ts';
import {
  ITEM_CATALOG,
  STABLE_SKU_PATTERN,
  catalogFingerprint,
  validateCatalog,
} from '../economy/catalogConfig.ts';
import { analyzeArbitrage } from '../economy/arbitrage.ts';
import type { ItemDefinition, ItemGroup } from '../economy/types.ts';
import type {
  CanonicalItemSource,
  CanonicalItemUse,
  InventoryCatalogItem,
  ItemPurpose,
} from '../inventory/inventoryTypes.ts';
import { STARTER_ITEM_METADATA } from './deepFarmingContent.ts';

function resolvePurpose(item: ItemDefinition): ItemPurpose {
  if (item.category === 'bouquet') return 'bouquet';
  if (item.category === 'dish') return 'dish';
  const byGroup: Record<ItemGroup, ItemPurpose> = {
    seed: 'seed',
    grain: 'crop',
    veg: 'crop',
    fruit: 'fruit',
    flower: 'flower',
    fish: 'fish',
    dish: 'dish',
    material: 'ingredient',
    pantry: 'ingredient',
    bait: 'ingredient',
    craft: 'artisan',
    tree_sapling: 'tree_sapling',
    bouquet: 'bouquet',
    feed: 'livestock_feed',
    animal_product: 'animal_product',
    fertilizer: 'fertilizer',
    sprinkler: 'sprinkler',
    tool: 'tool',
    artisan: 'artisan',
  };
  return byGroup[item.group];
}

export const CANONICAL_K5_STARTER_CATALOG: readonly InventoryCatalogItem[] = [
  {
    sku: 'pet_kibble_basic',
    nameVi: 'Hạt mèo cơ bản',
    descriptionVi: 'Phần hạt ấm bụng miễn phí hằng ngày cho bé mèo cam.',
    purpose: 'pet_food',
    stackLimit: 10,
    tradeable: false,
    category: 'pet_food',
    iconId: 'pet_kibble_basic',
    sources: ['starter'],
    uses: ['feed_pet'],
  },
  {
    sku: 'gift_flower_bouquet',
    nameVi: 'Bó hoa nhỏ dịu dàng',
    descriptionVi: 'Món quà nhỏ giữ trong ngăn riêng để tạo bất ngờ cho người thương.',
    purpose: 'gift',
    stackLimit: 5,
    tradeable: false,
    category: 'gift',
    iconId: 'gift_flower_bouquet',
    sources: ['starter'],
    uses: ['gift_partner', 'keepsake'],
  },
  {
    sku: 'gift_strawberry_cake',
    nameVi: 'Bánh dâu ngọt ngào',
    descriptionVi: 'Miếng bánh dâu xinh xắn có thể gửi kèm thư tay.',
    purpose: 'gift',
    stackLimit: 5,
    tradeable: false,
    category: 'gift',
    iconId: 'gift_strawberry_cake',
    sources: ['starter'],
    uses: ['gift_partner'],
  },
  {
    sku: 'gift_plush_cat',
    nameVi: 'Thú bông mèo cam nhỏ',
    descriptionVi: 'Gối ôm nho nhỏ mang hơi ấm căn nhà chung.',
    purpose: 'gift',
    stackLimit: 3,
    tradeable: false,
    category: 'gift',
    iconId: 'gift_plush_cat',
    sources: ['starter'],
    uses: ['gift_partner', 'keepsake'],
  },
  {
    sku: 'gift_star_jar',
    nameVi: 'Hũ sao giấy kỷ niệm',
    descriptionVi: 'Những ngôi sao giấy gấp tay lưu giữ lời chúc.',
    purpose: 'keepsake',
    stackLimit: 5,
    tradeable: false,
    category: 'keepsake',
    iconId: 'gift_star_jar',
    sources: ['starter'],
    uses: ['keepsake', 'gift_partner'],
  },
  {
    sku: 'letter_stationery_pink',
    nameVi: 'Giấy viết thư hoa anh đào',
    descriptionVi: 'Bộ giấy thư màu phấn hồng cho những lời nhắn ấm áp.',
    purpose: 'stationery',
    stackLimit: 10,
    tradeable: false,
    category: 'stationery',
    iconId: 'letter_stationery_pink',
    sources: ['starter'],
    uses: ['stationery', 'gift_partner'],
  },
] as const;

export interface UnifiedCatalogRow {
  sku: string;
  nameVi: string;
  descriptionVi: string;
  purpose: string;
  stackLimit: number;
  tradeable: boolean;
  category: string;
  iconId: string;
  sellPrice: number;
  buyPrice: number | null;
  sources: readonly string[];
  uses: readonly string[];
  qualityTiers: readonly string[];
  donorSource: string;
}

export interface CanonicalIntegrityReport {
  readonly ok: boolean;
  readonly totalRows: number;
  readonly fingerprint: string;
  readonly errors: readonly string[];
}

export function verifyCanonicalCatalogIntegrity(): CanonicalIntegrityReport {
  const errors: string[] = [];
  const validation = validateCatalog(ITEM_CATALOG);
  if (!validation.ok) {
    for (const err of validation.errors) {
      errors.push(`validateCatalog:${err.code}:${err.sku}:${err.messageVi}`);
    }
  }
  const arbitrage = analyzeArbitrage(ITEM_CATALOG);
  if (!arbitrage.ok) {
    for (const finding of arbitrage.findings) {
      errors.push(`arbitrage:${JSON.stringify(finding)}`);
    }
  }

  const seen = new Set<string>();
  const allRows = buildUnifiedCatalogRowsUnchecked();
  for (const row of allRows) {
    if (!STABLE_SKU_PATTERN.test(row.sku)) {
      errors.push(`bad_sku:${row.sku}`);
    }
    if (seen.has(row.sku)) {
      errors.push(`duplicate_sku:${row.sku}`);
    }
    seen.add(row.sku);
    if (!row.nameVi.trim()) {
      errors.push(`missing_name:${row.sku}`);
    }
    if (!Number.isInteger(row.stackLimit) || row.stackLimit < 1 || row.stackLimit > 999) {
      errors.push(`bad_stack_limit:${row.sku}`);
    }
    const hasIcon =
      Boolean(propsIconIdForCatalogSku(row.sku)) ||
      Boolean(getProceduralIconSpec(row.sku)) ||
      row.sku === 'pet_kibble_basic';
    if (!hasIcon) {
      errors.push(`missing_icon:${row.sku}`);
    }
    if (row.sources.length === 0) {
      errors.push(`missing_source:${row.sku}`);
    }
    if (row.uses.length === 0) {
      errors.push(`missing_use:${row.sku}`);
    }
  }

  return {
    ok: errors.length === 0,
    totalRows: allRows.length,
    fingerprint: catalogFingerprint(ITEM_CATALOG),
    errors,
  };
}

function buildUnifiedCatalogRowsUnchecked(): readonly UnifiedCatalogRow[] {
  const rows: UnifiedCatalogRow[] = [
    ...CANONICAL_K5_STARTER_CATALOG.map((item) => {
      const meta = STARTER_ITEM_METADATA[item.sku];
      return {
        sku: item.sku,
        nameVi: item.nameVi,
        descriptionVi: item.descriptionVi,
        purpose: item.purpose,
        stackLimit: item.stackLimit,
        tradeable: item.tradeable,
        category: item.category ?? item.purpose,
        iconId: item.iconId ?? item.sku,
        sellPrice: item.sellPrice ?? 0,
        buyPrice: item.buyPrice ?? null,
        sources: (item.sources ?? meta?.sources ?? ['starter']) as readonly CanonicalItemSource[],
        uses: (item.uses ?? meta?.uses ?? ['gift_partner']) as readonly CanonicalItemUse[],
        qualityTiers: item.qualityTiers ?? ['normal'],
        donorSource: item.donorSource ?? meta?.donorSource ?? 'olw-starter',
      };
    }),
    ...ITEM_CATALOG.map((item) => {
      const meta = STARTER_ITEM_METADATA[item.sku];
      return {
        sku: item.sku,
        nameVi: item.nameVi,
        descriptionVi: item.descriptionVi ?? meta?.descriptionVi ?? '',
        purpose: resolvePurpose(item),
        stackLimit: item.stackLimit,
        tradeable: item.sellChannels.length > 0 && item.sellPrice > 0,
        category: item.category ?? meta?.category ?? item.group,
        iconId: item.iconId ?? item.sku,
        sellPrice: item.sellPrice,
        buyPrice: item.storeBuy,
        sources: item.sources ?? meta?.sources ?? [],
        uses: item.uses ?? meta?.uses ?? ['sell_bin'],
        qualityTiers: item.qualityTiers,
        donorSource: item.donorSource ?? meta?.donorSource ?? 'olw-economy',
      };
    }),
  ];
  return rows;
}

/** Merged canonical projection validated against arbitrage, schema, icons, sources & uses. */
export function buildUnifiedCatalogRows(): readonly UnifiedCatalogRow[] {
  const integrity = verifyCanonicalCatalogIntegrity();
  if (!integrity.ok) {
    throw new Error(`Canonical catalog integrity failed: ${integrity.errors.slice(0, 5).join('; ')}`);
  }
  return buildUnifiedCatalogRowsUnchecked();
}
