import type { InventoryCatalogItem } from '../../inventory/inventoryTypes';
import type { ItemDefinition, ItemQuality } from '../../economy/types';
import type { TidefallFishRarity } from '../tidefall-phaser/tidefallFishCatalog';

export interface CanonicalFishSpec {
  readonly sku: string;
  readonly critterIds: readonly string[];
  readonly labelVi: string;
  readonly rarity: TidefallFishRarity;
  readonly spriteFile: string;
  readonly spriteUrl: string;
  readonly sellPrice: number;
  readonly descriptionVi: string;
}

const FF_SPRITE_BASE = '/assets/donor/fishing-frenzy/sprites';

function fishSpec(spec: Omit<CanonicalFishSpec, 'spriteUrl'>): CanonicalFishSpec {
  return {
    ...spec,
    spriteUrl: `${FF_SPRITE_BASE}/${spec.spriteFile}`,
  };
}

/**
 * Single authoritative identity table for every obtainable fish across OLW:
 * critterId (Meadowbrook / Tidefall / Stream) <-> SKU <-> sprite <-> Vietnamese name <-> sell/feed value.
 */
export const CANONICAL_FISH_CATALOG: readonly CanonicalFishSpec[] = [
  fishSpec({
    sku: 'carp_pond',
    critterIds: ['carp', 'bluegill', 'perch', 'loach'],
    labelVi: 'Cá chép ao',
    rarity: 'common',
    spriteFile: 'carp.png',
    sellPrice: 14,
    descriptionVi: 'Cá nước ngọt hiền lành. Có thể bán lấy xu hoặc cho bé mèo ăn.',
  }),
  fishSpec({
    sku: 'fish_minnow',
    critterIds: ['minnow', 'guppy', 'tadpole'],
    labelVi: 'Cá bống nhỏ',
    rarity: 'common',
    spriteFile: 'guppy.png',
    sellPrice: 12,
    descriptionVi: 'Chú cá nhỏ nhanh nhẹn ở ao làng. Cho bé mèo ăn hoặc bán qua thùng hàng.',
  }),
  fishSpec({
    sku: 'fish_catfish',
    critterIds: ['catfish'],
    labelVi: 'Cá trê đồng',
    rarity: 'uncommon',
    spriteFile: 'catfish.png',
    sellPrice: 22,
    descriptionVi: 'Cá trê râu dài béo ngậy — món khoái khẩu của bé mèo!',
  }),
  fishSpec({
    sku: 'fish_bass',
    critterIds: ['bass', 'pumpkinseed', 'crawfish'],
    labelVi: 'Cá vược xanh',
    rarity: 'uncommon',
    spriteFile: 'bass.png',
    sellPrice: 24,
    descriptionVi: 'Cá vược khỏe khoắn vùng nước trong. Bán được giá hoặc nấu ăn.',
  }),
  fishSpec({
    sku: 'donor_trout_stream',
    critterIds: ['trout', 'salmon'],
    labelVi: 'Cá hồi suối',
    rarity: 'uncommon',
    spriteFile: 'trout.png',
    sellPrice: 28,
    descriptionVi: 'Cá hồi suối tươi ngon câu từ dòng suối phía Đông.',
  }),
  fishSpec({
    sku: 'koi_pastel',
    critterIds: ['koi', 'goldfish', 'neon_tetras'],
    labelVi: 'Cá koi pastel',
    rarity: 'rare',
    spriteFile: 'goldfish.png',
    sellPrice: 32,
    descriptionVi: 'Cá koi sắc pastel may mắn. Giá trị cao khi gửi thùng hàng.',
  }),
  fishSpec({
    sku: 'lotus_trout',
    critterIds: [
      'rainbow_trout',
      'char',
      'cherry_salmon',
      'coho_salmon',
      'pink_salmon',
      'sockeye_salmon',
    ],
    labelVi: 'Cá hồi sen',
    rarity: 'rare',
    spriteFile: 'salmon.png',
    sellPrice: 36,
    descriptionVi: 'Cá hồi ánh hồng quý hiếm, rất hợp làm quà hoặc bán lấy xu.',
  }),
  fishSpec({
    sku: 'fish_pike',
    critterIds: ['pike', 'pirana', 'eel', 'silver_eel', 'pond_smelt'],
    labelVi: 'Cá chó sông',
    rarity: 'rare',
    spriteFile: 'pike.png',
    sellPrice: 38,
    descriptionVi: 'Loài cá săn mồi thon dài ở khúc sông sâu.',
  }),
  fishSpec({
    sku: 'fish_puffer',
    critterIds: ['puffer_fish', 'sturgeon'],
    labelVi: 'Cá nóc vàng',
    rarity: 'epic',
    spriteFile: 'pufferfish.png',
    sellPrice: 58,
    descriptionVi: 'Cá nóc tròn ủm hiếm gặp — giá thu mua rất cao.',
  }),
  fishSpec({
    sku: 'fish_swordfish',
    critterIds: ['swordfish', 'mahi_mahi', 'giant_tevally', 'manta_ray', 'squid'],
    labelVi: 'Cá kiếm bạc',
    rarity: 'epic',
    spriteFile: 'swordfish.png',
    sellPrice: 72,
    descriptionVi: 'Chiến lợi phẩm đại dương quý giá ở Vịnh Hải Âu.',
  }),
  fishSpec({
    sku: 'fish_golden_koi',
    critterIds: [
      'golden_koi',
      'golden_trout',
      'starfin',
      'coelacanth',
      'rainbow_fish',
      'oarfish',
      'shark_greatwhite',
      'shark_hammerhead',
      'shark_saw',
      'shark_whale',
    ],
    labelVi: 'Cá koi hoàng kim',
    rarity: 'legendary',
    spriteFile: 'hybrid_goldentrout.png',
    sellPrice: 120,
    descriptionVi: 'Cá huyền thoại lấp lánh ánh vàng — báu vật của đảo nhỏ.',
  }),
] as const;

const BY_SKU = new Map<string, CanonicalFishSpec>(CANONICAL_FISH_CATALOG.map((f) => [f.sku, f]));
const BY_CRITTER = new Map<string, CanonicalFishSpec>();
for (const entry of CANONICAL_FISH_CATALOG) {
  for (const cid of entry.critterIds) {
    BY_CRITTER.set(cid.trim().toLowerCase(), entry);
  }
}

const DEFAULT_FISH = CANONICAL_FISH_CATALOG[0]!;
const QUALITY_TIERS: readonly ItemQuality[] = ['normal', 'silver', 'gold'];

export function resolveCanonicalFishByCritterId(critterId: string): CanonicalFishSpec {
  const clean = critterId.trim().toLowerCase();
  return BY_CRITTER.get(clean) ?? DEFAULT_FISH;
}

export function resolveCanonicalFishBySku(sku: string): CanonicalFishSpec | null {
  const colon = sku.indexOf(':');
  const base = colon >= 0 ? sku.slice(0, colon) : sku;
  return BY_SKU.get(base) ?? null;
}

export function isCanonicalFishSku(sku: string): boolean {
  return resolveCanonicalFishBySku(sku) !== null;
}

export function fishSpriteUrlForSku(sku: string): string | null {
  return resolveCanonicalFishBySku(sku)?.spriteUrl ?? null;
}

export function canonicalFishInventoryCatalogItems(): readonly InventoryCatalogItem[] {
  return CANONICAL_FISH_CATALOG.map((f) => ({
    sku: f.sku,
    nameVi: f.labelVi,
    descriptionVi: f.descriptionVi,
    purpose: 'fish',
    stackLimit: 99,
    tradeable: true,
  }));
}

export function canonicalFishItemDefinition(sku: string): ItemDefinition | null {
  const f = resolveCanonicalFishBySku(sku);
  if (!f) return null;
  return {
    sku: f.sku,
    nameVi: f.labelVi,
    group: 'fish',
    milestone: 'V0.2.2',
    storeBuy: null,
    sellPrice: f.sellPrice,
    laborMilli: 1_800,
    depreciation: 2,
    batchQty: 1,
    inputs: [],
    batchDurationMs: 0,
    standardValueBp: f.sellPrice * 10_000,
    orderMultiplierBp: 14_000,
    stackLimit: 99,
    forageable: false,
    qualityTiers: QUALITY_TIERS,
    sellChannels: ['shipping_bin', 'npc_fish', 'order_board'],
  };
}
