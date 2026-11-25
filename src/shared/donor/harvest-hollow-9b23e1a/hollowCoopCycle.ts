/**
 * Simplified chicken cycle from `shared/rules/actions/animals.js` @ 9b23e1a.
 * No daily pet caps, no growth grind — feed once → egg when cycle ends.
 */
import { HOLLOW_CHICKEN_DEF } from './content/hollowRecipeExcerpt';

/** Dev-friendly cycle (donor uses 20 min; preview uses 25s). */
export const OLW_COOP_CYCLE_MS = 25_000;

export interface HollowCoopState {
  fedAtMs: number | null;
  readyAtMs: number | null;
}

export function emptyHollowCoopState(): HollowCoopState {
  return { fedAtMs: null, readyAtMs: null };
}

export function feedHollowCoop(
  coop: HollowCoopState,
  inventoryFeedQty: number,
  nowMs: number,
): { coop: HollowCoopState; feedUsed: number; error?: string } {
  if (coop.readyAtMs !== null && nowMs < coop.readyAtMs) {
    return { coop, feedUsed: 0, error: 'COOP_BUSY' };
  }
  if (inventoryFeedQty < HOLLOW_CHICKEN_DEF.feedQty) {
    return { coop, feedUsed: 0, error: 'NEED_FEED' };
  }
  return {
    coop: { fedAtMs: nowMs, readyAtMs: nowMs + OLW_COOP_CYCLE_MS },
    feedUsed: HOLLOW_CHICKEN_DEF.feedQty,
  };
}

export function collectHollowCoop(
  coop: HollowCoopState,
  nowMs: number,
): { coop: HollowCoopState; eggs: number; error?: string } {
  if (coop.readyAtMs === null) {
    return { coop, eggs: 0, error: 'NOT_FED' };
  }
  if (nowMs < coop.readyAtMs) {
    return { coop, eggs: 0, error: 'NOT_READY' };
  }
  return {
    coop: emptyHollowCoopState(),
    eggs: HOLLOW_CHICKEN_DEF.out,
  };
}