/**
 * Cooking session state machine (`V0.3`) — pure, deterministic, serializable.
 *
 * Design rules:
 * - No `Date.now()`, no `Math.random()`, no timers. The caller supplies `nowMs`
 *   and a seed; all randomness comes from `src/shared/rng.ts`.
 * - Every function returns a NEW session; inputs are never mutated.
 * - A session is only valid JSON (no Map/Set/class instances/undefined values).
 * - The module never produces coin/price/reward values. Economy decides value
 *   from `dishSku` + stars; restaurant orders only carry a multiplier in bp.
 *
 * Heat model (documented assumption):
 * - `heat01` runs 0..1000; one `adjustHeat` step = 100 units.
 * - The seeded "pan curve" is a deterministic target heat that changes every
 *   `PAN_BUCKET_MS` (750 ms). The pan heat drifts toward that target with a
 *   slow time constant of `PAN_DRIFT_TAU_MS` (15 s), so a wrong heat setting
 *   persists for the whole cook unless the player corrects it.
 * - The curve amplitude is a fraction of the recipe tolerance (`none` 0,
 *   `gentle` 0.75, `precise` 0.95), so passive drift alone never leaves the
 *   safe band; burns are always caused by player heat mistakes or overcooking.
 * - The burn timer accumulates while heat is outside `ideal ± tolerance`
 *   (strict `>`), resets when the pan is back in the band, and burns when it
 *   exceeds `burnWindowMs`. Being outside at the start of a tick applies the
 *   whole `dt` to the timer, so a long offline catch-up cannot be skipped.
 * - The dish also burns when `elapsedMs > cookMs + burnWindowMs` because it is
 *   overcooked; exactly at the deadline it is still a 1-star edible dish.
 *
 * Quality model (documented assumption):
 * - ★★★: prep complete, no time spent out of band, current heat inside the
 *   band, and `elapsedMs - cookMs` within `floor(burnWindowMs / 4)`, extended
 *   by `STIR_WINDOW_BONUS_MS` per stir (max 3 stacks).
 * - ★★: within `floor(burnWindowMs / 2)` and heat within 2.5x tolerance.
 * - ★: anything else that is served before the burn deadline.
 * - Burned: no dish, no quality, no reward.
 */

import { createRng, deriveSeed } from '../rng';
import { requireRecipe } from './recipes';
import type {
  AdjustHeatAction,
  BurnReason,
  CookingAction,
  CookingActionResult,
  CookingErrorCode,
  CookingOutcome,
  CookingQuality,
  CookingSession,
  CreateCookingSessionInput,
  HeatProfile,
  OrderConstraintResult,
  PrepAction,
  RecipeDefinition,
  RestaurantOrder,
  Role,
  ServeAction,
} from './types';

/** Minimum pan heat on the 0..1000 scale. */
export const HEAT_MIN = 0;
/** Maximum pan heat on the 0..1000 scale. */
export const HEAT_MAX = 1_000;
/** One `adjustHeat` step moves the pan by this many heat units. */
export const HEAT_PER_ADJUST_STEP = 100;
/** `adjustHeat.delta` accepts -2..+2 steps. */
export const MAX_ADJUST_STEPS = 2;
/** Minimum time between two stir actions. */
export const STIR_COOLDOWN_MS = 1_200;
/** A stir moves heat this many units toward the ideal temperature. */
export const STIR_HEAT_NUDGE01 = 80;
/** Each stir widens the ★★★ timing window by this much... */
export const STIR_WINDOW_BONUS_MS = 300;
/** ...up to this many stacks (extra stirs still fix heat but add no window). */
export const MAX_STIR_WINDOW_BONUS_STACKS = 3;
/** The seeded pan curve picks a new target every 750 ms. */
export const PAN_BUCKET_MS = 750;
/** Exponential drift time constant toward the pan curve target (slow on purpose). */
export const PAN_DRIFT_TAU_MS = 15_000;
/** Curve amplitude as a fraction of recipe tolerance. */
export const PAN_AMPLITUDE_RATIO: Readonly<Record<HeatProfile, number>> = {
  none: 0,
  gentle: 0.75,
  precise: 0.95,
};
/** ★★★ window divisor applied to `burnWindowMs`. */
export const THREE_STAR_WINDOW_DIVISOR = 4;
/** ★★ window divisor applied to `burnWindowMs`. */
export const TWO_STAR_WINDOW_DIVISOR = 2;
/** Heat may sit this many tolerances wide and still earn ★★. */
export const TWO_STAR_HEAT_TOLERANCE_RATIO = 2.5;
/** Canonical restaurant timer range from docs/economy/MARKET_AND_NPC.md. */
export const RESTAURANT_ORDER_MIN_DEADLINE_MS = 90_000;
export const RESTAURANT_ORDER_MAX_DEADLINE_MS = 150_000;
/** Canonical order multiplier range (1.60x–2.00x) in basis points. */
export const ORDER_REWARD_MULTIPLIER_MIN_BP = 160;
export const ORDER_REWARD_MULTIPLIER_MAX_BP = 200;
/** Restaurant orders must ask for at least ★★. */
export const MIN_RESTAURANT_ORDER_STARS = 2;

type ResolvedActorRole = Role | 'both' | 'unknown';

function clampHeat(value: number): number {
  if (!Number.isFinite(value)) {
    return HEAT_MIN;
  }
  return Math.min(HEAT_MAX, Math.max(HEAT_MIN, Math.round(value)));
}

function isHeatInBand(heat01: number, recipe: RecipeDefinition): boolean {
  return Math.abs(heat01 - recipe.idealHeat01) <= recipe.heatTolerance01;
}

/**
 * Deterministic pan-curve target heat for a point in time.
 *
 * The curve is sampled per `PAN_BUCKET_MS` bucket using an independent RNG
 * channel derived from `rngSeed`, so the same seed always produces the same
 * pan behaviour regardless of how often `tick` is called.
 */
export function panTargetHeat01(
  recipe: RecipeDefinition,
  rngSeed: number,
  elapsedMs: number,
): number {
  const bucket = Math.floor(Math.max(0, elapsedMs) / PAN_BUCKET_MS);
  const rng = createRng(deriveSeed(rngSeed, 'pan', bucket));
  const amplitude = recipe.heatTolerance01 * PAN_AMPLITUDE_RATIO[recipe.heatProfile];
  const noise = rng.next();
  return clampHeat(recipe.idealHeat01 + (noise * 2 - 1) * amplitude);
}

/**
 * Creates a fresh cooking session.
 *
 * The two-station contract is enforced unless `soloMode` is explicitly `true`:
 * with `soloMode` off, `players` must contain exactly two distinct ids; with
 * `soloMode` on, one id is enough and that player may use both stations.
 */
export function createCookingSession(input: CreateCookingSessionInput): CookingSession {
  const recipe = requireRecipe(input.recipeSku);
  if (!Number.isFinite(input.nowMs)) {
    throw new TypeError('createCookingSession requires a finite nowMs');
  }

  const soloMode = input.soloMode === true;
  const ids = input.players;
  const prepId = ids[0];
  if (typeof prepId !== 'string' || prepId.length === 0) {
    throw new TypeError('createCookingSession requires a non-empty prep player id');
  }

  let heatId: string;
  if (soloMode) {
    if (ids.length > 2) {
      throw new RangeError('soloMode accepts one player id (or two distinct ids)');
    }
    const optionalHeatId = ids[1];
    if (optionalHeatId !== undefined && typeof optionalHeatId !== 'string') {
      throw new TypeError('createCookingSession player ids must be strings');
    }
    heatId = optionalHeatId !== undefined && optionalHeatId.length > 0 ? optionalHeatId : prepId;
  } else {
    if (ids.length !== 2) {
      throw new RangeError(
        'Co-op cooking needs exactly two players [prepId, heatId]; pass soloMode: true for solo practice',
      );
    }
    const secondId = ids[1];
    if (typeof secondId !== 'string' || secondId.length === 0) {
      throw new TypeError('createCookingSession requires a non-empty heat player id');
    }
    if (secondId === prepId) {
      throw new RangeError(
        'Co-op cooking needs two different players; pass soloMode: true for solo practice',
      );
    }
    heatId = secondId;
  }

  const rngSeed = createRng(input.seed).int(0, 2 ** 31);
  const sessionIdSeed = deriveSeed(rngSeed, 'cooking-session', recipe.sku, prepId, heatId);

  return {
    sessionId: `cook_${recipe.sku}_${sessionIdSeed.toString(36)}`,
    recipeSku: recipe.sku,
    rngSeed,
    players: { prepId, heatId },
    soloMode,
    phase: 'prep',
    prepDone: 0,
    prepared: [],
    heat01: recipe.idealHeat01,
    elapsedMs: 0,
    startedAtMs: input.nowMs,
    updatedAtMs: input.nowMs,
    stirCount: 0,
    lastStirAtMs: null,
    outOfToleranceMs: 0,
    quality: null,
    outcome: null,
  };
}

function resolveActorRole(
  session: CookingSession,
  actorId: string | undefined,
  station: Role,
): ResolvedActorRole {
  // Convenience for callers that attribute actions by station (e.g. a local
  // practice UI): with no explicit id the action is assumed to come from the
  // station that owns it. Explicit ids are always checked against the session.
  if (actorId === undefined) {
    return session.soloMode ? 'both' : station;
  }
  const isPrep = actorId === session.players.prepId;
  const isHeat = actorId === session.players.heatId;
  if (!isPrep && !isHeat) {
    return 'unknown';
  }
  if (session.soloMode) {
    return 'both';
  }
  if (isPrep && isHeat) {
    return 'both';
  }
  return isPrep ? 'prep' : 'heat';
}

function roleAllows(role: ResolvedActorRole, station: Role): boolean {
  return role === 'both' || role === station;
}

function fail(
  session: CookingSession,
  code: CookingErrorCode,
  messageVi: string,
): CookingActionResult {
  return { ok: false, session, error: { code, messageVi } };
}

function succeed(session: CookingSession): CookingActionResult {
  return { ok: true, session };
}

function burnedSession(
  session: CookingSession,
  recipe: RecipeDefinition,
  elapsedMs: number,
  nowMs: number,
  outOfToleranceMs: number,
  heat01: number,
  reason: BurnReason,
): CookingSession {
  const outcome: CookingOutcome = {
    kind: 'burned',
    recipeSku: recipe.sku,
    dishSku: null,
    quality: null,
    completedAtMs: nowMs,
    elapsedMs,
    reason,
    stirCount: session.stirCount,
    outOfToleranceMs,
  };
  return {
    ...session,
    phase: 'burned',
    heat01,
    elapsedMs,
    updatedAtMs: nowMs,
    outOfToleranceMs,
    quality: null,
    outcome,
  };
}

/**
 * Advances a session to `nowMs`: drifts pan heat along the seeded curve,
 * accumulates out-of-band time and marks the dish burned when needed.
 *
 * Non-finite values and timestamps in the past leave the session unchanged.
 */
export function tick(session: CookingSession, nowMs: number): CookingSession {
  if (session.phase === 'done' || session.phase === 'burned') {
    return session;
  }
  if (!Number.isFinite(nowMs)) {
    return session;
  }

  const recipe = requireRecipe(session.recipeSku);
  const targetElapsedMs = Math.max(session.elapsedMs, nowMs - session.startedAtMs);
  const dt = targetElapsedMs - session.elapsedMs;
  if (dt <= 0) {
    return session;
  }

  let outOfToleranceMs = session.outOfToleranceMs;
  if (isHeatInBand(session.heat01, recipe)) {
    outOfToleranceMs = 0;
  } else {
    outOfToleranceMs += dt;
  }

  const targetHeat01 = panTargetHeat01(recipe, session.rngSeed, targetElapsedMs);
  const driftRatio = Math.min(1, dt / PAN_DRIFT_TAU_MS);
  const heat01 = clampHeat(session.heat01 + (targetHeat01 - session.heat01) * driftRatio);

  const overheated = outOfToleranceMs > recipe.burnWindowMs;
  const overcooked = targetElapsedMs > recipe.cookMs + recipe.burnWindowMs;
  if (overheated || overcooked) {
    const reason: BurnReason = overheated ? 'HEAT' : 'OVERCOOKED';
    return burnedSession(
      session,
      recipe,
      targetElapsedMs,
      nowMs,
      outOfToleranceMs,
      heat01,
      reason,
    );
  }

  return {
    ...session,
    phase: session.prepDone >= recipe.prepStationSteps ? 'cooking' : 'prep',
    heat01,
    elapsedMs: targetElapsedMs,
    updatedAtMs: nowMs,
    outOfToleranceMs,
  };
}

/** Exact ★ window boundaries for a recipe given the current stir count. */
export function getQualityWindows(
  recipe: RecipeDefinition,
  stirCount: number,
): { readonly threeStarWindowMs: number; readonly twoStarWindowMs: number } {
  const stacks = Math.min(
    Math.max(0, Math.floor(stirCount)),
    MAX_STIR_WINDOW_BONUS_STACKS,
  );
  return {
    threeStarWindowMs:
      Math.floor(recipe.burnWindowMs / THREE_STAR_WINDOW_DIVISOR) +
      stacks * STIR_WINDOW_BONUS_MS,
    twoStarWindowMs: Math.floor(recipe.burnWindowMs / TWO_STAR_WINDOW_DIVISOR),
  };
}

/**
 * Scores a servable session into 1..3 stars.
 *
 * Boundaries are inclusive on the good side (`lateMs <= window`), so a serve at
 * exactly `cookMs + threeStarWindowMs` is ★★★ and one millisecond later is ★★.
 */
export function evaluateCookingQuality(
  session: CookingSession,
  recipe: RecipeDefinition = requireRecipe(session.recipeSku),
): CookingQuality {
  const lateMs = session.elapsedMs - recipe.cookMs;
  const heatDeviation01 = Math.abs(session.heat01 - recipe.idealHeat01);
  const windows = getQualityWindows(recipe, session.stirCount);

  const threeStar =
    session.prepDone >= recipe.prepStationSteps &&
    lateMs >= 0 &&
    lateMs <= windows.threeStarWindowMs &&
    heatDeviation01 <= recipe.heatTolerance01 &&
    session.outOfToleranceMs === 0;
  if (threeStar) {
    return 3;
  }

  const twoStar =
    lateMs >= 0 &&
    lateMs <= windows.twoStarWindowMs &&
    heatDeviation01 <= recipe.heatTolerance01 * TWO_STAR_HEAT_TOLERANCE_RATIO;
  return twoStar ? 2 : 1;
}

function prepAction(
  session: CookingSession,
  recipe: RecipeDefinition,
  action: PrepAction,
  actorRole: ResolvedActorRole,
): CookingActionResult {
  if (!roleAllows(actorRole, 'prep')) {
    return fail(session, 'NOT_YOUR_ROLE', 'Bạn đang phụ trách bếp lửa, không phải quầy sơ chế.');
  }
  if (typeof action.ingredientSku !== 'string' || action.ingredientSku.length === 0) {
    return fail(session, 'INVALID_ACTION', 'Thao tác sơ chế thiếu nguyên liệu.');
  }
  if (session.prepDone >= recipe.prepStationSteps) {
    return fail(session, 'WRONG_STEP', 'Nguyên liệu đã sơ chế xong, không cần thêm nữa.');
  }

  const requirement = recipe.ingredients.find((item) => item.sku === action.ingredientSku);
  if (!requirement) {
    return fail(
      session,
      'MISSING_INGREDIENT',
      'Nguyên liệu này không có trong công thức của món.',
    );
  }
  if (session.prepared.some((item) => item.sku === requirement.sku)) {
    return fail(session, 'MISSING_INGREDIENT', 'Nguyên liệu này đã được sơ chế rồi.');
  }

  const prepDone = session.prepDone + 1;
  return succeed({
    ...session,
    prepDone,
    prepared: [...session.prepared, { sku: requirement.sku, qty: requirement.qty }],
    phase: prepDone >= recipe.prepStationSteps ? 'cooking' : 'prep',
  });
}

function stirAction(
  session: CookingSession,
  recipe: RecipeDefinition,
  actorRole: ResolvedActorRole,
): CookingActionResult {
  if (!roleAllows(actorRole, 'heat')) {
    return fail(session, 'NOT_YOUR_ROLE', 'Bạn đang phụ trách sơ chế, hãy để người kia khuấy chảo.');
  }
  if (
    session.lastStirAtMs !== null &&
    session.elapsedMs - session.lastStirAtMs < STIR_COOLDOWN_MS
  ) {
    return fail(session, 'COOLDOWN', 'Vừa khuấy xong, chờ một nhịp rồi khuấy tiếp nhé.');
  }

  let heat01 = session.heat01;
  if (heat01 < recipe.idealHeat01) {
    heat01 = Math.min(recipe.idealHeat01, heat01 + STIR_HEAT_NUDGE01);
  } else if (heat01 > recipe.idealHeat01) {
    heat01 = Math.max(recipe.idealHeat01, heat01 - STIR_HEAT_NUDGE01);
  }

  return succeed({
    ...session,
    heat01: clampHeat(heat01),
    stirCount: session.stirCount + 1,
    lastStirAtMs: session.elapsedMs,
  });
}

function adjustHeatAction(
  session: CookingSession,
  action: AdjustHeatAction,
  actorRole: ResolvedActorRole,
): CookingActionResult {
  if (!roleAllows(actorRole, 'heat')) {
    return fail(session, 'NOT_YOUR_ROLE', 'Chỉ người giữ bếp lửa mới được chỉnh nhiệt.');
  }
  if (
    !Number.isInteger(action.delta) ||
    action.delta === 0 ||
    Math.abs(action.delta) > MAX_ADJUST_STEPS
  ) {
    return fail(
      session,
      'INVALID_ACTION',
      `Chỉnh nhiệt phải là số bước từ -${MAX_ADJUST_STEPS} đến +${MAX_ADJUST_STEPS}.`,
    );
  }

  return succeed({
    ...session,
    heat01: clampHeat(session.heat01 + action.delta * HEAT_PER_ADJUST_STEP),
  });
}

function serveAction(
  session: CookingSession,
  recipe: RecipeDefinition,
  action: ServeAction,
  actorRole: ResolvedActorRole,
): CookingActionResult {
  if (!roleAllows(actorRole, 'heat')) {
    return fail(session, 'NOT_YOUR_ROLE', 'Chỉ người giữ bếp lửa mới được dọn món ra đĩa.');
  }
  if (!Number.isFinite(action.nowMs)) {
    return fail(session, 'INVALID_ACTION', 'Thời điểm dọn món không hợp lệ.');
  }

  const ticked = tick(session, action.nowMs);
  if (ticked.phase === 'burned') {
    return fail(ticked, 'BURNED', 'Món đã cháy mất rồi, không thể dọn ra đĩa.');
  }
  if (ticked.prepDone < recipe.prepStationSteps) {
    return fail(ticked, 'WRONG_STEP', 'Nguyên liệu chưa sơ chế xong, chưa thể dọn món.');
  }
  if (ticked.elapsedMs < recipe.cookMs) {
    return fail(ticked, 'WRONG_STEP', 'Món còn chưa chín, chờ thêm một chút nhé.');
  }

  const quality = evaluateCookingQuality(ticked, recipe);
  const outcome: CookingOutcome = {
    kind: 'served',
    recipeSku: recipe.sku,
    dishSku: recipe.dishSku,
    quality,
    completedAtMs: action.nowMs,
    elapsedMs: ticked.elapsedMs,
    reason: null,
    stirCount: ticked.stirCount,
    outOfToleranceMs: ticked.outOfToleranceMs,
  };
  return succeed({
    ...ticked,
    phase: 'done',
    quality,
    outcome,
    updatedAtMs: action.nowMs,
  });
}

/**
 * Pure reducer for cooking actions.
 *
 * `actorId` may be supplied as a third argument instead of on the action. When
 * omitted entirely the action is attributed to the station that owns it (local
 * practice convenience); explicit ids are always validated.
 */
export function applyCookingAction(
  session: CookingSession,
  action: CookingAction,
  actorId?: string,
): CookingActionResult {
  const recipe = requireRecipe(session.recipeSku);
  const station: Role = action.type === 'prep' ? 'prep' : 'heat';
  const actorRole = resolveActorRole(session, actorId ?? action.actorId, station);

  if (actorRole === 'unknown') {
    return fail(session, 'UNKNOWN_PLAYER', 'Bạn không có mặt trong phiên nấu ăn này.');
  }
  if (session.phase === 'burned') {
    return fail(session, 'BURNED', 'Món đã cháy mất rồi, không thể thao tác thêm.');
  }
  if (session.phase === 'done') {
    return fail(session, 'ALREADY_FINISHED', 'Món đã dọn ra đĩa rồi.');
  }

  switch (action.type) {
    case 'prep':
      return prepAction(session, recipe, action, actorRole);
    case 'stir':
      return stirAction(session, recipe, actorRole);
    case 'adjustHeat':
      return adjustHeatAction(session, action, actorRole);
    case 'serve':
      return serveAction(session, recipe, action, actorRole);
    default:
      return fail(session, 'INVALID_ACTION', 'Thao tác nấu ăn không hợp lệ.');
  }
}

/** Alias kept for reducer-style call sites. */
export const reduceCookingSession = applyCookingAction;

/**
 * Validates a restaurant order against a finished cooking session.
 *
 * Order timing is measured from `order.createdAtMs` when provided, otherwise
 * from `session.startedAtMs`. Passing the deadline still fails the ORDER only —
 * the cooked dish itself remains `done` and edible (it can be sold normally).
 *
 * The canonical timer range (90_000..150_000 ms) and multiplier range
 * (160..200 bp) are documented by the economy spec; this function validates the
 * order shape but deliberately accepts shorter deadlines so the domain can be
 * tested and reused by special/limited events. Generating canonical orders is
 * the economy layer's responsibility.
 */
export function getOrderConstraints(
  session: CookingSession,
  order: RestaurantOrder,
): OrderConstraintResult {
  const recipe = requireRecipe(session.recipeSku);

  if (order.dishSku !== recipe.dishSku) {
    return {
      ok: false,
      reason: 'WRONG_DISH',
      messageVi: `Đơn này đặt món khác, không phải ${recipe.nameVi}.`,
    };
  }
  if (
    !Number.isInteger(order.minStars) ||
    order.minStars < MIN_RESTAURANT_ORDER_STARS ||
    order.minStars > 3
  ) {
    return {
      ok: false,
      reason: 'STARS_TOO_LOW',
      messageVi: 'Đơn nhà hàng phải yêu cầu tối thiểu ★★.',
    };
  }
  if (!Number.isFinite(order.deadlineMs) || order.deadlineMs <= 0) {
    return {
      ok: false,
      reason: 'INVALID_ACTION',
      messageVi: 'Thời hạn của đơn không hợp lệ.',
    };
  }
  if (
    order.createdAtMs !== undefined &&
    !Number.isFinite(order.createdAtMs)
  ) {
    return {
      ok: false,
      reason: 'INVALID_ACTION',
      messageVi: 'Thời điểm nhận đơn không hợp lệ.',
    };
  }
  if (
    order.rewardMultiplierBp !== undefined &&
    (!Number.isFinite(order.rewardMultiplierBp) ||
      order.rewardMultiplierBp < ORDER_REWARD_MULTIPLIER_MIN_BP ||
      order.rewardMultiplierBp > ORDER_REWARD_MULTIPLIER_MAX_BP)
  ) {
    return {
      ok: false,
      reason: 'INVALID_ACTION',
      messageVi: 'Hệ số thưởng của đơn nằm ngoài khoảng 1.60x–2.00x.',
    };
  }
  if (session.phase === 'burned') {
    return {
      ok: false,
      reason: 'BURNED',
      messageVi: 'Món đã cháy nên không thể giao cho nhà hàng.',
    };
  }
  if (session.phase !== 'done' || !session.outcome || session.outcome.kind !== 'served') {
    return {
      ok: false,
      reason: 'TOO_SLOW',
      messageVi: 'Món chưa được phục vụ nên đơn chưa thể hoàn tất.',
    };
  }

  const orderStartedAtMs = order.createdAtMs ?? session.startedAtMs;
  if (session.outcome.completedAtMs - orderStartedAtMs > order.deadlineMs) {
    return {
      ok: false,
      reason: 'TOO_SLOW',
      messageVi: 'Món ra lò muộn hơn thời hạn của đơn.',
    };
  }

  const quality = session.outcome.quality;
  if (quality === null || quality < order.minStars) {
    return {
      ok: false,
      reason: 'STARS_TOO_LOW',
      messageVi: `Món chưa đạt ★${order.minStars} mà đơn yêu cầu.`,
    };
  }

  return { ok: true };
}
