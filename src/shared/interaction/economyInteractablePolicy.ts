import type { ContextualAction, InteractableTarget, InteractionActionCode } from './interactionTypes';

/** World-facing economy hooks — J must open a modal or RPC when these are offered. */
export const ECONOMY_FARM_MARKET_TARGET_IDS = new Set([
  'outdoor_market',
  'farm_seed_shop',
  'cabacos_player_seed_shop_door',
]);

export const ECONOMY_SHIPPING_TARGET_IDS = new Set(['cabacos_player_crop_market_door']);

/** @deprecated use ECONOMY_FARM_MARKET_TARGET_IDS */
export const ECONOMY_SHOP_TARGET_IDS = ECONOMY_FARM_MARKET_TARGET_IDS;

export const TILED_INTERACTABLE_SKIP_IDS = new Set([
  'cabacos_player_town_hall_door',
  'cabacos_player_house_door',
  /** Dead “chưa mở” door — use `farm_barn_mill` workshop when economy on. */
  'farm_barn_door',
]);

export function isTiledWayfindingDuplicateId(id: string): boolean {
  return id.startsWith('cabacos_sign_');
}

export function isUnopenedShopLabel(labelVi: string): boolean {
  return /chưa mở/i.test(labelVi);
}

export const ECONOMY_ACTION_CODES: ReadonlySet<InteractionActionCode> = new Set([
  'open_farm_market',
  'open_shipping_bin',
  'open_donor_fishing',
  'open_donor_stream_fishing',
  'open_donor_workshop',
  'till_plot',
  'plant_crop',
  'water_crop',
  'harvest_crop',
]);

export function isEconomyActionCode(code: InteractionActionCode): boolean {
  return ECONOMY_ACTION_CODES.has(code);
}

/** Drop economy targets from resolve loop when preview economy is off (no dead J prompts). */
export function shouldOmitEconomyTargetFromResolve(
  target: InteractableTarget,
  action: ContextualAction,
  economyPlayable: boolean,
): boolean {
  if (economyPlayable) return false;
  if (target.donorPlayable === true) return true;
  if (isEconomyActionCode(action.code)) return true;
  if (
    !economyPlayable &&
    (target.kind === 'fishing_spot' || target.kind === 'workshop_building' || target.kind === 'shipping_bin')
  ) {
    return true;
  }
  if (!economyPlayable && ECONOMY_FARM_MARKET_TARGET_IDS.has(target.id)) return true;
  if (!economyPlayable && ECONOMY_SHIPPING_TARGET_IDS.has(target.id)) return true;
  return false;
}

export function resolveDonorFishingSpotId(target: InteractableTarget): string {
  if (target.fishingSpotId) return target.fishingSpotId;
  if (target.id.includes('stream')) return 'east_stream';
  if (target.id.includes('beach') || target.id.includes('gull')) return 'gull_bay';
  return 'meadow_pond';
}