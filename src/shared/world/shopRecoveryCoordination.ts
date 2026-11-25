/**
 * C3 shop recovery: single routing table until real interiors replace Casa_player-as-shop.
 * @see project store docs/owner-reject-8e4454d-recovery.md § C3 P0 #7
 */

export type ShopRecoveryRoute =
  | 'farm_market_modal'
  | 'shipping_bin_modal'
  | 'portal_barn_shop_deferred'
  | 'portal_cabacos_interior_deferred';

export interface ShopRecoveryEntry {
  targetId: string;
  route: ShopRecoveryRoute;
  labelVi: string;
  /** Shown in interact hint while C3 interior transplant is pending. */
  recoveryNoteVi: string;
}

const ENTRIES: readonly ShopRecoveryEntry[] = [
  {
    targetId: 'farm_seed_shop',
    route: 'farm_market_modal',
    labelVi: 'Gian hạt Bác Hai',
    recoveryNoteVi: 'Chờ C3: quầy trong nhà thật — tạm mở gian hạt OLW.',
  },
  {
    targetId: 'outdoor_market',
    route: 'farm_market_modal',
    labelVi: 'Chợ Meadowbrook',
    recoveryNoteVi: 'Chờ C3: đồng bộ NPC chợ với nội thất tool/seed shop Cabacos.',
  },
  {
    targetId: 'cabacos_player_seed_shop_door',
    route: 'portal_cabacos_interior_deferred',
    labelVi: 'Cửa hàng hạt Cabacos',
    recoveryNoteVi: 'Recovery: thay map shop hiện tại bằng seed shop interior donor.',
  },
  {
    targetId: 'cabacos_player_crop_market_door',
    route: 'shipping_bin_modal',
    labelVi: 'Chợ nông sản',
    recoveryNoteVi: 'Chờ C3: crop market interior (Cabacos market map).',
  },
  {
    targetId: 'farm_barn_door',
    route: 'portal_barn_shop_deferred',
    labelVi: 'Cửa chuồng',
    recoveryNoteVi: 'Recovery: không dùng Casa_player làm shop — route lại sau C3.',
  },
] as const;

export function shopRecoveryEntryForTarget(targetId: string): ShopRecoveryEntry | null {
  return ENTRIES.find((e) => e.targetId === targetId) ?? null;
}

/** NPC targets that share the farm seed modal during recovery (coordinate with C3). */
export function isRecoveryFarmMarketTarget(targetId: string): boolean {
  const entry = shopRecoveryEntryForTarget(targetId);
  return entry?.route === 'farm_market_modal';
}