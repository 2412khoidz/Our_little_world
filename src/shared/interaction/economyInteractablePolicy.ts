import type { ContextualAction, InteractableTarget, InteractionActionCode } from './interactionTypes';

/** World-facing economy hooks — J must open a modal or RPC when these are offered. */
export const ECONOMY_SHOP_TARGET_IDS = new Set(['outdoor_market', 'farm_seed_shop']);

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
  if (!economyPlayable && ECONOMY_SHOP_TARGET_IDS.has(target.id)) return true;
  return false;
}