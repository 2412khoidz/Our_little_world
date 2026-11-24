/**
 * Fishing domain types & static definitions (milestone V0.2.2).
 *
 * Clean-room implementation: the FSM idea ("hold-to-rise, release-to-drop") is
 * inspired by public gameplay concepts only. No third-party code was ported
 * (see docs/research/REUSE_MATRIX.md row "Fishing Hold-to-Catch FSM" -> class C).
 *
 * Pure TypeScript: no DOM, React, Phaser, Supabase, timers or wall clock.
 * All functions are deterministic for a given seed/explicit `nowMs`.
 *
 * ECONOMY BOUNDARY (important): this module never grants items, coins or
 * inventory rows. A successful catch only reports `{ type: 'landed', fishSku }`.
 * The caller (server RPC / backend adapter) is the only authority that awards
 * the fish, bait consumption and sell value.
 */

/** Three rarity tiers from docs/gameplay/GAME_DESIGN.md (common / rare / legendary concept). */
export type FishRarity = 'common' | 'uncommon' | 'rare';

/** Fish SKUs already used by docs/economy/PRODUCTION_CHAINS.md (`V0.2.2`). */
export type FishSku = 'carp_pond' | 'koi_pastel' | 'lotus_trout';

/** Three rod tiers: basic (starter), sturdy (tier 2), bamboo (tier 3). */
export type RodId = 'rod_basic' | 'rod_sturdy' | 'rod_bamboo';

/** Free worm is the anti-deadlock bait; shrimp is the consumable rare-bait. */
export type BaitSku = 'bait_free_worm' | 'bait_shrimp';

/**
 * One-finger fishing FSM phases.
 *
 * idle -> waiting -> biting -> hooked -> landed | escaped
 *
 * `waiting` is the time before a bite, `biting` is the reaction window,
 * `hooked` is the hold-to-catch meter game.
 */
export type FishingPhase = 'idle' | 'waiting' | 'biting' | 'hooked' | 'landed' | 'escaped';

/** Why a fight or a reaction ended without a fish. */
export type FishingEscapeReason = 'MISSED_BITE' | 'METRE_DRAINED' | 'OUT_OF_BAND';

/** Static definition of a fish species. */
export interface FishDefinition {
  readonly sku: FishSku;
  readonly nameVi: string;
  readonly rarity: FishRarity;
  /**
   * Base rarity weight before bait/rod multipliers. Non-common species are only
   * eligible with a bait listed in `preferredBaits`; if no eligible species
   * remains the encounter cannot be rolled, but `carp_pond` is always
   * eligible so a free-worm player can never soft-lock.
   */
  readonly baseWeight: number;
  /** Hard rod-tier gate. rod_basic = 1, rod_sturdy = 2, rod_bamboo = 3. */
  readonly minRodTier: number;
  /**
   * Eligible bait SKUs. For common fish this includes both baits; for
   * uncommon/rare fish it acts as a hard bait requirement (matching the input
   * recipes in PRODUCTION_CHAINS.md).
   */
  readonly preferredBaits: readonly BaitSku[];
  /** Base reaction window in ms, before the rod bonus is added. */
  readonly biteWindowMs: number;
  /** 0..1 difficulty. Only scales the seeded band speed, never randomness. */
  readonly fightDifficulty01: number;
}

/** Static definition of a rod. */
export interface RodDefinition {
  readonly id: RodId;
  readonly nameVi: string;
  /** 1 = basic, 2 = sturdy, 3 = bamboo. Used as `minRodTier` threshold. */
  readonly tier: 1 | 2 | 3;
  /** Extra reaction time added to the fish base bite window (ms). */
  readonly biteWindowBonusMs: number;
  /** Catch-band half width as a 0..1 fraction of the 1000 per-mille meter. */
  readonly catchBarTolerance01: number;
  /** Multiplier applied to the seeded wait time (better rods bite sooner). */
  readonly waitTimeMultiplier: number;
}

/** Static definition of a bait. */
export interface BaitDefinition {
  readonly sku: BaitSku;
  readonly nameVi: string;
  /**
   * Additive bonus applied to non-common weights when the bait is eligible:
   * effectiveWeight = baseWeight * (1 + rarityWeightBonus).
   */
  readonly rarityWeightBonus: number;
  /** True when the caller should consume one unit after the cast/session. */
  readonly consumable: boolean;
  /** Multiplier applied to the seeded wait time (shrimp is slightly faster). */
  readonly waitTimeMultiplier: number;
  /** Shop reference price in coins; 0 keeps the free-worm anti-deadlock loop. */
  readonly shopPriceCoins: number;
}

/**
 * Deterministic result of "what is on the hook".
 * The type intentionally contains no seed, wallet or inventory fields.
 */
export interface EncounterResult {
  readonly fishSku: FishSku;
  readonly rarity: FishRarity;
  /** Time from cast to bite, 2s..12s after rod/bait scaling. */
  readonly waitMs: number;
  /** Reaction window once the bite is revealed, including the rod bonus. */
  readonly biteWindowMs: number;
}

/** Successful end of the hold-to-catch game. The caller awards the item. */
export interface FishingLandedOutcome {
  readonly type: 'landed';
  readonly fishSku: FishSku;
}

/** Unsuccessful end of the interaction. No item/coin is granted. */
export interface FishingEscapedOutcome {
  readonly type: 'escaped';
  readonly reason: FishingEscapeReason;
}

export type FishingOutcome = FishingLandedOutcome | FishingEscapedOutcome;

/** Typed error codes for bogus FSM input (never plain `Error` for rule guards). */
export type FishingRuleErrorCode =
  | 'INVALID_PHASE'
  | 'INVALID_TIME'
  | 'INVALID_CONFIG'
  | 'INVALID_ENCOUNTER'
  | 'INVALID_STATE'
  | 'UNKNOWN_PHASE';

/** Typed domain error so callers can branch on `code` instead of message text. */
export class FishingRuleError extends Error {
  readonly code: FishingRuleErrorCode;

  /** Phase that rejected the action, when relevant. */
  readonly phase: FishingPhase | null;

  constructor(
    code: FishingRuleErrorCode,
    message: string,
    phase: FishingPhase | null = null,
  ) {
    super(message);
    this.name = 'FishingRuleError';
    this.code = code;
    this.phase = phase;
  }
}

/**
 * Fish catalogue. Values follow docs/economy/PRODUCTION_CHAINS.md:
 * carp_pond is common and catchable with free worms; koi_pastel and
 * lotus_trout are the shrimp-bait species, with lotus_trout needing tier 2+.
 */
export const FISH_DEFINITIONS: readonly FishDefinition[] = [
  {
    sku: 'carp_pond',
    nameVi: 'Cá chép ao nhà',
    rarity: 'common',
    baseWeight: 68,
    minRodTier: 1,
    preferredBaits: ['bait_free_worm', 'bait_shrimp'],
    biteWindowMs: 1400,
    fightDifficulty01: 0.2,
  },
  {
    sku: 'koi_pastel',
    nameVi: 'Cá koi pastel',
    rarity: 'uncommon',
    baseWeight: 24,
    minRodTier: 1,
    preferredBaits: ['bait_shrimp'],
    biteWindowMs: 1150,
    fightDifficulty01: 0.45,
  },
  {
    sku: 'lotus_trout',
    nameVi: 'Cá hồi ao sen',
    rarity: 'rare',
    baseWeight: 8,
    minRodTier: 2,
    preferredBaits: ['bait_shrimp'],
    biteWindowMs: 950,
    fightDifficulty01: 0.7,
  },
] as const;

/** Rod catalogue: tier 1/2/3 progressively widen the band and speed up bites. */
export const ROD_DEFINITIONS: readonly RodDefinition[] = [
  {
    id: 'rod_basic',
    nameVi: 'Cần câu gỗ',
    tier: 1,
    biteWindowBonusMs: 0,
    catchBarTolerance01: 0.12,
    waitTimeMultiplier: 1,
  },
  {
    id: 'rod_sturdy',
    nameVi: 'Cần câu chắc tay',
    tier: 2,
    biteWindowBonusMs: 250,
    catchBarTolerance01: 0.16,
    waitTimeMultiplier: 0.85,
  },
  {
    id: 'rod_bamboo',
    nameVi: 'Cần câu trúc',
    tier: 3,
    biteWindowBonusMs: 500,
    catchBarTolerance01: 0.2,
    waitTimeMultiplier: 0.72,
  },
] as const;

/** Bait catalogue: the free worm is unlimited; shrimp is consumable. */
export const BAIT_DEFINITIONS: readonly BaitDefinition[] = [
  {
    sku: 'bait_free_worm',
    nameVi: 'Mồi trùn miễn phí',
    rarityWeightBonus: 0,
    consumable: false,
    waitTimeMultiplier: 1,
    shopPriceCoins: 0,
  },
  {
    sku: 'bait_shrimp',
    nameVi: 'Mồi tép',
    rarityWeightBonus: 1.5,
    consumable: true,
    waitTimeMultiplier: 0.9,
    shopPriceCoins: 6,
  },
] as const;

export const FISH_BY_SKU: ReadonlyMap<FishSku, FishDefinition> = new Map(
  FISH_DEFINITIONS.map((fish): [FishSku, FishDefinition] => [fish.sku, fish]),
);

export const ROD_BY_ID: ReadonlyMap<RodId, RodDefinition> = new Map(
  ROD_DEFINITIONS.map((rod): [RodId, RodDefinition] => [rod.id, rod]),
);

export const BAIT_BY_SKU: ReadonlyMap<BaitSku, BaitDefinition> = new Map(
  BAIT_DEFINITIONS.map((bait): [BaitSku, BaitDefinition] => [bait.sku, bait]),
);

/** Looks up a fish definition or throws a typed config error. */
export function getFishDefinition(sku: FishSku): FishDefinition {
  const fish = FISH_BY_SKU.get(sku);
  if (!fish) {
    throw new FishingRuleError('INVALID_CONFIG', `Unknown fish sku: ${String(sku)}`);
  }
  return fish;
}

/** Looks up a rod definition or throws a typed config error. */
export function getRodDefinition(id: RodId): RodDefinition {
  const rod = ROD_BY_ID.get(id);
  if (!rod) {
    throw new FishingRuleError('INVALID_CONFIG', `Unknown rod id: ${String(id)}`);
  }
  return rod;
}

/** Looks up a bait definition or throws a typed config error. */
export function getBaitDefinition(sku: BaitSku): BaitDefinition {
  const bait = BAIT_BY_SKU.get(sku);
  if (!bait) {
    throw new FishingRuleError('INVALID_CONFIG', `Unknown bait sku: ${String(sku)}`);
  }
  return bait;
}
