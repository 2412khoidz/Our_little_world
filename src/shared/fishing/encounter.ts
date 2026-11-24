/**
 * Deterministic encounter rolling for the V0.2.2 fishing prototype.
 *
 * "What you hook" lives here; "how you reel it in" lives in fishingMachine.ts.
 * The roll is a pure function of an explicit seed plus the chosen rod/bait/lake.
 * No `Math.random()`, no `Date.now()` and no mutable module state.
 *
 * Seed channels (via `deriveSeed`) are deliberately split:
 * - `fish` channel: seed + lake + rod  -> species/rarity roll.
 * - `wait` channel: seed + lake + rod  -> base wait time before the bite.
 *
 * Neither channel includes the bait in its *seed*, which means the underlying
 * random draws stay identical when the player switches bait. Bait then changes
 * the outcome only through deterministic config (eligible species, rarity
 * multipliers and a wait-time multiplier). This keeps rod-side timing
 * reproducible for balance tests even while bait changes what can be caught.
 *
 * `nowMs` is validated but intentionally does not participate in the roll in
 * V0.2.2; it exists so a future day/night or weather modifier can be added
 * without changing this signature. This also makes client prediction and
 * server re-rolls agree for the same `(seed, rod, bait, lake)` inputs.
 */

import { createRng, deriveSeed, hashSeed, normalizeSeed, type WeightedOption } from '../rng';
import {
  FISH_DEFINITIONS,
  FishingRuleError,
  getBaitDefinition,
  getRodDefinition,
  type BaitDefinition,
  type BaitSku,
  type EncounterResult,
  type FishDefinition,
  type RodDefinition,
  type RodId,
} from './types';

/** Minimum cast-to-bite wait (2s), per the cozy pacing target. */
export const FISHING_WAIT_MIN_MS = 2000;

/** Maximum cast-to-bite wait (12s). */
export const FISHING_WAIT_MAX_MS = 12_000;

/** Default fishing spot: the east pond from Demo E. */
export const DEFAULT_LAKE_ID = 'pond_east';

export interface RollEncounterInput {
  /** Server-provided seed; never generated inside this module. */
  readonly seed: number | string;
  readonly rodId: RodId;
  readonly baitSku: BaitSku;
  /** Explicit logical clock (ms). Validated; not used by the V0.2.2 roll. */
  readonly nowMs: number;
  /** Optional fishing-spot identifier, mixed into both seed channels. */
  readonly lakeId?: string;
}

function toBaseSeed(seed: number | string): number {
  if (typeof seed === 'string') {
    const trimmed = seed.trim();
    if (trimmed.length === 0) {
      throw new FishingRuleError('INVALID_CONFIG', 'Encounter seed string must not be empty');
    }
    return hashSeed(trimmed);
  }
  if (!Number.isFinite(seed)) {
    throw new FishingRuleError('INVALID_CONFIG', `Encounter seed must be finite, received: ${String(seed)}`);
  }
  return normalizeSeed(seed);
}

function toLakeId(lakeId: string | undefined): string {
  if (lakeId === undefined) {
    return DEFAULT_LAKE_ID;
  }
  const trimmed = lakeId.trim();
  if (trimmed.length === 0) {
    throw new FishingRuleError('INVALID_CONFIG', 'lakeId must not be empty when provided');
  }
  return trimmed;
}

function assertNowMs(nowMs: number): void {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new FishingRuleError('INVALID_TIME', `rollEncounter requires a finite non-negative nowMs, received: ${String(nowMs)}`);
  }
}

/**
 * Builds the weighted species pool for a rod/bait pair.
 *
 * Eligibility is a hard gate (weight 0 when unmet):
 * - `rod.tier >= fish.minRodTier`
 * - bait listed in `fish.preferredBaits`
 *
 * Uncommon/rare weights are then scaled by `1 + bait.rarityWeightBonus`.
 * carp_pond is always eligible, so the pool can never be empty and the free
 * worm path can never dead-lock. A gated species simply "weighs 0" rather than
 * aborting the cast.
 */
function buildWeightedPool(rod: RodDefinition, bait: BaitDefinition): WeightedOption<FishDefinition>[] {
  return FISH_DEFINITIONS.map((fish) => {
    const rodUnlocked = rod.tier >= fish.minRodTier;
    const baitUnlocked = fish.preferredBaits.includes(bait.sku);
    if (!rodUnlocked || !baitUnlocked) {
      return { value: fish, weight: 0 };
    }
    const rarityMultiplier = fish.rarity === 'common' ? 1 : 1 + bait.rarityWeightBonus;
    return { value: fish, weight: fish.baseWeight * rarityMultiplier };
  });
}

/**
 * Rolls one deterministic encounter.
 *
 * Same `(seed, rodId, baitSku, lakeId)` always produces the same
 * `EncounterResult`; `nowMs` is validated for ordering but ignored in V0.2.2.
 */
export function rollEncounter(input: RollEncounterInput): EncounterResult {
  assertNowMs(input.nowMs);

  const rod = getRodDefinition(input.rodId);
  const bait = getBaitDefinition(input.baitSku);
  const baseSeed = toBaseSeed(input.seed);
  const lakeId = toLakeId(input.lakeId);

  // Channel 1: species / rarity. Bait is intentionally absent from the seed.
  const fishRng = createRng(deriveSeed(baseSeed, 'fish', lakeId, rod.id));
  const pool = buildWeightedPool(rod, bait);
  const totalWeight = pool.reduce((sum, option) => sum + option.weight, 0);
  if (totalWeight <= 0) {
    throw new FishingRuleError(
      'INVALID_CONFIG',
      `No eligible fish for rod ${rod.id} and bait ${bait.sku}; carp_pond should always be eligible`,
    );
  }
  const fish = fishRng.weighted(pool);

  // Channel 2: wait time. Bait is absent from the seed and only scales the
  // already-drawn value, so rod-side wait reproducibility survives bait swaps.
  const waitRng = createRng(deriveSeed(baseSeed, 'wait', lakeId, rod.id));
  const rawWaitMs = waitRng.int(FISHING_WAIT_MIN_MS, FISHING_WAIT_MAX_MS + 1);
  const scaledWaitMs = Math.round(rawWaitMs * rod.waitTimeMultiplier * bait.waitTimeMultiplier);
  const waitMs = Math.min(FISHING_WAIT_MAX_MS, Math.max(FISHING_WAIT_MIN_MS, scaledWaitMs));

  // Reaction window is config-only: fish base + rod bonus. It is not random,
  // so players can learn the timing and the server can validate it exactly.
  const biteWindowMs = fish.biteWindowMs + rod.biteWindowBonusMs;

  return {
    fishSku: fish.sku,
    rarity: fish.rarity,
    waitMs,
    biteWindowMs,
  };
}

/**
 * Exposed for balance tests and future UI code that needs the probability
 * table without consuming randomness. Returns a fresh array; never mutates the
 * catalog.
 */
export function getEncounterWeights(
  rodId: RodId,
  baitSku: BaitSku,
): readonly WeightedOption<FishDefinition>[] {
  return buildWeightedPool(getRodDefinition(rodId), getBaitDefinition(baitSku));
}
