/**
 * Cooking domain types (`V0.3`).
 *
 * Pure TypeScript only: no React / Phaser / DOM / Supabase imports and no
 * timers. Every value here is JSON-serializable so a cooking session can be
 * persisted and validated server-side later (`cooking_sessions`).
 *
 * IMPORTANT — economy boundary:
 * Recipes and cooking outcomes deliberately contain **no coin/price/reward
 * field**. Reward value is decided by the economy layer from the dish SKU plus
 * the star rating (see docs/economy/PRODUCTION_CHAINS.md). A restaurant order
 * only carries a *multiplier in basis points*; it never contains the coin
 * amount itself.
 */

/** Star rating of a finished dish: ★ / ★★ / ★★★. */
export type CookingQuality = 1 | 2 | 3;

/**
 * The two co-op kitchen stations.
 * - `prep`: one player washes/chops ingredients at the prep counter.
 * - `heat`: the other player watches the pan, stirs and adjusts heat.
 */
export type Role = 'prep' | 'heat';

/** How demanding the pan is. `none` means the dish is not heat sensitive. */
export type HeatProfile = 'none' | 'gentle' | 'precise';

/**
 * Session lifecycle.
 * - `prep`: ingredients are still being prepared at the prep station.
 * - `cooking`: prep is complete, the dish is on the stove (or already cooked).
 * - `done`: served successfully (quality is set).
 * - `burned`: ruined; ingredients are lost and there is no dish.
 */
export type CookingPhase = 'prep' | 'cooking' | 'done' | 'burned';

/** Machine-readable cooking error codes. */
export type CookingErrorCode =
  | 'MISSING_INGREDIENT'
  | 'NOT_YOUR_ROLE'
  | 'WRONG_STEP'
  | 'ALREADY_FINISHED'
  | 'BURNED'
  | 'INVALID_ACTION'
  | 'UNKNOWN_PLAYER'
  | 'COOLDOWN'
  | 'WRONG_DISH'
  | 'TOO_SLOW'
  | 'STARS_TOO_LOW';

/** Typed domain error with a player-facing Vietnamese message. */
export interface CookingError {
  readonly code: CookingErrorCode;
  /** Short Vietnamese sentence suitable for the UI. */
  readonly messageVi: string;
}

/** One ingredient requirement of a recipe. */
export interface IngredientRequirement {
  /** Item SKU from the shared economy catalog (e.g. `carrot`, `carp_pond`). */
  readonly sku: string;
  /** Required quantity for one dish. */
  readonly qty: number;
}

/** Static definition of a cookable dish. */
export interface RecipeDefinition {
  /** Recipe SKU; for cooked dishes this equals `dishSku`. */
  readonly sku: string;
  /** Output dish SKU (economy layer maps it to its sell value). */
  readonly dishSku: string;
  /** Display name in Vietnamese. */
  readonly nameVi: string;
  readonly ingredients: readonly IngredientRequirement[];
  /**
   * Number of prep batches/taps needed at the prep counter. Each successful
   * `prep` action consumes one whole ingredient batch and advances this counter.
   */
  readonly prepStationSteps: number;
  /** Minimum stove time in milliseconds before the dish may be served. */
  readonly cookMs: number;
  /** Ideal pan heat on the 0..1000 scale. */
  readonly idealHeat01: number;
  /** Half-width of the safe heat band on the 0..1000 scale. */
  readonly heatTolerance01: number;
  /**
   * How long the pan may stay outside the safe heat band before it burns, and
   * how long after `cookMs` the dish becomes inedible.
   */
  readonly burnWindowMs: number;
  /** Recommended minimum stars when the economy generates restaurant orders. */
  readonly minOrderStars: CookingQuality;
  readonly heatProfile: HeatProfile;
}

/** An ingredient batch already processed at the prep station. */
export interface PreparedIngredient {
  readonly sku: string;
  /** Quantity consumed from the recipe (the whole batch). */
  readonly qty: number;
}

/** Why a dish was lost. */
export type BurnReason = 'HEAT' | 'OVERCOOKED';

/**
 * Final result of a cooking session.
 *
 * There is intentionally no `coins`, `price`, `reward` or `sellValue` field.
 * The economy layer receives `dishSku` + `quality` and applies pricing /
 * order multipliers (`1.60x`–`2.00x`) from its own catalog.
 */
export interface CookingOutcome {
  readonly kind: 'served' | 'burned';
  readonly recipeSku: string;
  /** `null` when the dish burned. */
  readonly dishSku: string | null;
  /** `null` when the dish burned. */
  readonly quality: CookingQuality | null;
  /** Wall-clock time (`nowMs`) at which the session ended. */
  readonly completedAtMs: number;
  /** Session elapsed time at completion. */
  readonly elapsedMs: number;
  /** `HEAT` = stayed out of the safe band, `OVERCOOKED` = left too long. */
  readonly reason: BurnReason | null;
  readonly stirCount: number;
  readonly outOfToleranceMs: number;
}

/** Assigned players of a co-op cooking session. */
export interface CookingPlayers {
  readonly prepId: string;
  readonly heatId: string;
}

/** Full serializable cooking session state. */
export interface CookingSession {
  /** Deterministic id derived from the seed, recipe and players. */
  readonly sessionId: string;
  readonly recipeSku: string;
  /** Derived 32-bit channel seed used for the deterministic pan curve. */
  readonly rngSeed: number;
  readonly players: CookingPlayers;
  /** When true one player may use both stations (single-player practice). */
  readonly soloMode: boolean;
  readonly phase: CookingPhase;
  readonly prepDone: number;
  readonly prepared: readonly PreparedIngredient[];
  /** Current pan heat on the 0..1000 scale. */
  readonly heat01: number;
  /** Milliseconds since the session was created (prep time included). */
  readonly elapsedMs: number;
  readonly startedAtMs: number;
  /** Last `nowMs` observed by `tick` / `serve`; useful for UI sync. */
  readonly updatedAtMs: number;
  readonly stirCount: number;
  /** Session elapsed time of the last stir, or `null` before the first stir. */
  readonly lastStirAtMs: number | null;
  /** Accumulated milliseconds spent outside the safe heat band. */
  readonly outOfToleranceMs: number;
  /** Set only after a successful serve. */
  readonly quality: CookingQuality | null;
  /** Set when the session is `done` or `burned`. */
  readonly outcome: CookingOutcome | null;
}

/** Prep an ingredient batch. Only the `prep` role may send this action. */
export interface PrepAction {
  readonly type: 'prep';
  readonly actorId?: string;
  readonly ingredientSku: string;
}

/** Stir the pan: nudges heat toward ideal and adds a small quality bonus. */
export interface StirAction {
  readonly type: 'stir';
  readonly actorId?: string;
}

/** Change heat by -2..+2 steps (each step = 100 heat units). */
export interface AdjustHeatAction {
  readonly type: 'adjustHeat';
  readonly actorId?: string;
  readonly delta: number;
}

/** Serve the dish. Only the `heat` role may send this action. */
export interface ServeAction {
  readonly type: 'serve';
  readonly actorId?: string;
  readonly nowMs: number;
}

export type CookingAction = PrepAction | StirAction | AdjustHeatAction | ServeAction;

/** Successful or failed pure state transition. */
export type CookingActionResult =
  | { readonly ok: true; readonly session: CookingSession }
  | { readonly ok: false; readonly session: CookingSession; readonly error: CookingError };

/**
 * Restaurant order constraints (NPC Chị Bếp An, `V0.3`).
 * `deadlineMs` is the order timer; the economy is expected to generate values
 * in `90_000..150_000` and a star floor of at least ★★.
 */
export interface RestaurantOrder {
  readonly orderId?: string;
  readonly dishSku: string;
  /** Minimum acceptable stars (2 or 3). */
  readonly minStars: number;
  /** Order deadline in milliseconds (canonical range 90_000..150_000). */
  readonly deadlineMs: number;
  /** Optional `1.60x`..`2.00x` multiplier expressed in basis points (160..200). */
  readonly rewardMultiplierBp?: number;
  /**
   * Optional wall-clock time the order was placed. When omitted the order clock
   * starts together with the cooking session.
   */
  readonly createdAtMs?: number;
}

/** Why an order cannot be completed. */
export type OrderRejectionReason =
  | 'WRONG_DISH'
  | 'TOO_SLOW'
  | 'STARS_TOO_LOW'
  | 'BURNED'
  | 'INVALID_ACTION';

export type OrderConstraintResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: OrderRejectionReason;
      readonly messageVi: string;
    };

/** Input for `createCookingSession`. */
export interface CreateCookingSessionInput {
  readonly recipeSku: string;
  readonly seed: number | string;
  /** `[prepId, heatId]`, or `[soloId]` when `soloMode` is true. */
  readonly players: readonly string[];
  readonly nowMs: number;
  /** Default `false`: the two-station contract is enforced. */
  readonly soloMode?: boolean;
}
