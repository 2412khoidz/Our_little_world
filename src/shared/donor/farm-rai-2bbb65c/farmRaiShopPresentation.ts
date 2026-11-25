/**
 * Farm Rai Larn Na merchant + SKU icon presentation (shops.ts · trader persona @ 2bbb65c).
 * Purchase authority stays OLW catalog / farm backend — no Rai economy state.
 */

export const FARM_RAI_TRADER_PORTRAIT = '/assets/donor/farm-rai-larn-na/shop/trader.webp';
export const FARM_RAI_COIN_ICON = '/assets/donor/farm-rai-larn-na/shop/coin.webp';
export const FARM_RAI_GENERIC_SEED_ICON = '/assets/donor/farm-rai-larn-na/shop/seed.webp';

/** Vietnamese copy adapted from upstream trader NPC (ต้นกล้า / seed merchant). */
export const FARM_RAI_SEED_MERCHANT = {
  nameVi: 'Bác Hai',
  roleVi: 'Hàng hạt giống',
  greetingVi:
    'Hạt từ ruộng và cá câu được — mang rau quả về đây bán cũng được. Chọn gói hạt bên dưới nhé.',
} as const;

const SEED_SKU_ICON: Record<string, string> = {
  seed_wheat: '/assets/donor/farm-rai-larn-na/shop/icons/crop-wheat.webp',
  seed_carrot: '/assets/donor/farm-rai-larn-na/shop/icons/crop-carrot.webp',
  seed_tomato: '/assets/donor/farm-rai-larn-na/shop/icons/crop-tomato.webp',
  seed_strawberry: '/assets/donor/farm-rai-larn-na/shop/icons/crop-strawberry.webp',
};

export function farmRaiSeedIconUrl(seedSku: string): string {
  return SEED_SKU_ICON[seedSku] ?? FARM_RAI_GENERIC_SEED_ICON;
}