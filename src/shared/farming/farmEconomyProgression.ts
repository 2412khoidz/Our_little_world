/**
 * Anti-grind knobs for 184-plot farm scale (V0.2 Mission 06).
 * UI hints only — prices/saturation remain server catalog + shipping bin.
 */

export const FARM_ECONOMY_PROGRESSION_V1 = {
  /** Processed SKUs worth shipping before raw bulk crops at large plot counts. */
  processedSellFirstSkus: ['flour', 'strawberry_jam', 'carrot_soup'] as const,
  shippingHintVi:
    'Gợi ý: chế biến ở chuồng trước khi gửi hàng loạt — mứt/bột/súp giữ giá bin ổn định hơn khi trồng nhiều ô.',
  /** Shop tier: mid-tier seeds unlock after wallet reaches this (client hint; server does not gate). */
  midTierSeedWalletHint: 80,
} as const;