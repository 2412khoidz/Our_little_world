/**
 * Single canonical SKU registry for SQL seed, inventory UI, and economy simulation.
 * Economy rows are authored in catalogConfig; K5 starters live here only once.
 */
import { ITEM_CATALOG, catalogFingerprint } from '../economy/catalogConfig.ts';
import type { ItemGroup } from '../economy/types.ts';
import type { InventoryCatalogItem, ItemPurpose } from '../inventory/inventoryTypes.ts';

const purposeByGroup: Record<ItemGroup, ItemPurpose> = {
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

export const CANONICAL_K5_STARTER_CATALOG: readonly InventoryCatalogItem[] = [
  {
    sku: 'pet_kibble_basic',
    nameVi: 'Hạt mèo cơ bản',
    descriptionVi: 'Phần hạt ấm bụng miễn phí hằng ngày cho bé mèo cam.',
    purpose: 'pet_food',
    stackLimit: 10,
    tradeable: false,
  },
  {
    sku: 'gift_flower_bouquet',
    nameVi: 'Bó hoa nhỏ dịu dàng',
    descriptionVi: 'Món quà nhỏ giữ trong ngăn riêng để tạo bất ngờ cho người thương.',
    purpose: 'gift',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'gift_strawberry_cake',
    nameVi: 'Bánh dâu ngọt ngào',
    descriptionVi: 'Miếng bánh dâu xinh xắn có thể gửi kèm thư tay.',
    purpose: 'gift',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'gift_plush_cat',
    nameVi: 'Thú bông mèo cam nhỏ',
    descriptionVi: 'Gối ôm nho nhỏ mang hơi ấm căn nhà chung.',
    purpose: 'gift',
    stackLimit: 3,
    tradeable: false,
  },
  {
    sku: 'gift_star_jar',
    nameVi: 'Hũ sao giấy kỷ niệm',
    descriptionVi: 'Những ngôi sao giấy gấp tay lưu giữ lời chúc.',
    purpose: 'keepsake',
    stackLimit: 5,
    tradeable: false,
  },
  {
    sku: 'letter_stationery_pink',
    nameVi: 'Giấy viết thư hoa anh đào',
    descriptionVi: 'Bộ giấy thư màu phấn hồng cho những lời nhắn ấm áp.',
    purpose: 'stationery',
    stackLimit: 10,
    tradeable: false,
  },
] as const;

export interface UnifiedCatalogRow {
  sku: string;
  nameVi: string;
  descriptionVi: string;
  purpose: string;
  stackLimit: number;
  tradeable: boolean;
}

/** Merged projection for SQL generation (fingerprint 7076075b on economy slice only). */
export function buildUnifiedCatalogRows(): readonly UnifiedCatalogRow[] {
  if (catalogFingerprint() !== '7076075b') {
    throw new Error('Production economy catalog fingerprint must remain 7076075b');
  }

  const skuSet = new Set<string>();
  const rows: UnifiedCatalogRow[] = [
    ...CANONICAL_K5_STARTER_CATALOG.map((item) => ({
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