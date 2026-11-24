/**
 * Hold-to-catch fishing FSM (V0.2.2) — one finger.
 *
 * Flow: idle -> cast -> waiting (bite scheduled at nowMs + waitMs)
 *       -> tick reveals biting at/after the bite time
 *       -> press inside the reaction window -> hooked
 *       -> hold to raise the 0..1000 per-mille catch meter, release to drain,
 *          keep the meter inside a seeded moving band
 *       -> landed (meter 1000 while inside the band) or escaped.
 *
 * Design notes:
 * - Pure state transitions: every action returns a brand-new serializable state
 *   and never mutates its input. Time is always an explicit `nowMs`; the band
 *   phase comes from `deriveSeed`, never from Date/Math.random/timers.
 * - The band centre is a sine of the elapsed hold time; `fightDifficulty01`
 *   only changes its angular speed, not any random sequence.
 * - ECONOMY BOUNDARY: this module only reports WHICH fish was caught. It never
 *   mutates a wallet/inventory and never grants coins or item quantities. The
 *   server/caller is the authority that awards the fish and consumes bait.
 */

import { createRng, deriveSeed, hashSeed } from '../rng';
import {
  FISH_BY_SKU,
  FishingRuleError,
  getBaitDefinition,
  getFishDefinition,
  getRodDefinition,
  type BaitSku,
  type EncounterResult,
  type FishDefinition,
  type FishingOutcome,
  type FishingPhase,
  type RodDefinition,
  type RodId,
} from './types';

/**
 * Tuning table (documented in the deliverable summary):
 * - Landing threshold: 1000 per-mille while inside the band.
 * - Holding always raises (+320/s); releasing always drains (-480/s).
 * - Hitting 1000 outside the band is an over-pull snap (OUT_OF_BAND); the
 *   final hold must be timed while the band covers 1000.
 * - Out-of-band time is cumulative since the hook (either side); after 3000ms
 *   outside the band the fish also escapes.
 * - Band centre = 700 + 250 * sin(phase + elapsedSec * omega), clamped by
 *   construction to [450, 950]; half width = rod.catchBarTolerance01 * 1000.
 */
export const FISHING_TUNING = {
  meterMaxPermille: 1000,
  landingMeterPermille: 1000,
  holdRisePerSec: 320,
  releaseDrainPerSec: 480,
  /**
   * Hitting 1000 while outside the band is an over-pull snap. Holding always
   * raises the meter (as the one-finger rule promises), so the skill is to
   * hover just below the top and finish only while the band covers 1000.
   */
  outOfBandLimitMs: 3000,
  bandCenterPermille: 700,
  bandAmplitudePermille: 250,
  /** Base angular speed: one 3.2s oscillation at difficulty 0. */
  bandOmegaRadPerSec: (Math.PI * 2) / 3.2,
  /** `fightDifficulty01 = 1` adds 60% band speed. */
  bandDifficultySpeedFactor: 0.6,
} as const;

/** Serializable FSM state. Primitives/plain objects only; no functions. */
export interface FishingState {
  readonly phase: FishingPhase;
  /** Logical clock of the last accepted transition. */
  readonly nowMs: number;
  readonly rodId: RodId;
  readonly baitSku: BaitSku;
  /** "What is on the hook", copied from the cast input. */
  readonly encounter: EncounterResult | null;
  readonly castAtMs: number | null;
  readonly biteAtMs: number | null;
  readonly hookedAtMs: number | null;
  /** Seeded phase (radians) for the moving catch band. */
  readonly bandPhase: number;
  /** Integer 0..1000 per-mille catch meter. */
  readonly meterPermille: number;
  /** Sub-per-mille carry so small `nowMs` steps still move the meter. */
  readonly meterCarry: number;
  readonly holding: boolean;
  /** Cumulative time spent outside the band since the hook. */
  readonly outOfBandMs: number;
  /** Terminal outcome once landed/escaped; null while the session is live. */
  readonly outcome: FishingOutcome | null;
}

export interface CreateFishingStateOptions {
  readonly rodId?: RodId;
  readonly baitSku?: BaitSku;
}

export interface TimeInput {
  readonly nowMs: number;
}

export interface CastInput extends TimeInput {
  readonly encounter: EncounterResult;
}

export interface FishingTransition {
  readonly state: FishingState;
  /** Non-null only on the transition that ends the session. */
  readonly outcome: FishingOutcome | null;
}

/** Moving target band in per-mille meter space. */
export interface CatchBand {
  readonly centerPermille: number;
  readonly halfWidthPermille: number;
  readonly lowPermille: number;
  readonly highPermille: number;
}

const FISHING_PHASES: readonly FishingPhase[] = [
  'idle',
  'waiting',
  'biting',
  'hooked',
  'landed',
  'escaped',
];

function isFishingPhase(value: unknown): value is FishingPhase {
  return typeof value === 'string' && (FISHING_PHASES as readonly string[]).includes(value);
}

function assertKnownPhase(phase: FishingPhase): void {
  if (!isFishingPhase(phase)) {
    throw new FishingRuleError('UNKNOWN_PHASE', `Unknown fishing phase: ${String(phase)}`, phase);
  }
}

function assertTimestamp(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new FishingRuleError(
      'INVALID_TIME',
      `${label} must be a finite non-negative number, received: ${String(value)}`,
    );
  }
}

/** Validates time monotonicity so negative deltas can never rewind the FSM. */
function acceptActionTime(state: FishingState, nowMs: number, label: string): number {
  assertTimestamp(nowMs, label);
  if (!Number.isFinite(state.nowMs)) {
    throw new FishingRuleError('INVALID_STATE', 'Fishing state has an invalid nowMs', state.phase);
  }
  if (nowMs < state.nowMs) {
    throw new FishingRuleError(
      'INVALID_TIME',
      `${label} (${nowMs}) is earlier than the last transition (${state.nowMs}); negative time delta is not allowed`,
      state.phase,
    );
  }
  return nowMs;
}

function bandGeometry(
  rod: RodDefinition,
  fish: FishDefinition,
  bandPhase: number,
  elapsedMs: number,
): CatchBand {
  const elapsedSec = Math.max(0, elapsedMs) / 1000;
  const speed =
    FISHING_TUNING.bandOmegaRadPerSec *
    (1 + fish.fightDifficulty01 * FISHING_TUNING.bandDifficultySpeedFactor);
  const centerPermille = Math.round(
    FISHING_TUNING.bandCenterPermille +
      FISHING_TUNING.bandAmplitudePermille * Math.sin(bandPhase + elapsedSec * speed),
  );
  const halfWidthPermille = Math.min(
    400,
    Math.max(40, Math.round(rod.catchBarTolerance01 * 1000)),
  );
  return {
    centerPermille,
    halfWidthPermille,
    lowPermille: Math.max(0, centerPermille - halfWidthPermille),
    highPermille: Math.min(FISHING_TUNING.meterMaxPermille, centerPermille + halfWidthPermille),
  };
}

function bandFor(state: FishingState, nowMs: number): CatchBand {
  const encounter = state.encounter;
  if (encounter === null || state.hookedAtMs === null) {
    throw new FishingRuleError(
      'INVALID_STATE',
      'Cannot compute a catch band before the fish is hooked',
      state.phase,
    );
  }
  return bandGeometry(
    getRodDefinition(state.rodId),
    getFishDefinition(encounter.fishSku),
    state.bandPhase,
    nowMs - state.hookedAtMs,
  );
}

/**
 * Current band for rendering/automation tests. Pure; pass the same `nowMs` to
 * get the same band. Throws `INVALID_PHASE` when the fish is not hooked.
 */
export function getCatchBand(state: FishingState, nowMs: number = state.nowMs): CatchBand {
  assertTimestamp(nowMs, 'getCatchBand nowMs');
  assertKnownPhase(state.phase);
  if (state.phase !== 'hooked') {
    throw new FishingRuleError(
      'INVALID_PHASE',
      `getCatchBand is only available while hooked (current phase: ${state.phase})`,
      state.phase,
    );
  }
  return bandFor(state, nowMs);
}

function finish(state: FishingState, outcome: FishingOutcome): FishingTransition {
  const phase: FishingPhase = outcome.type === 'landed' ? 'landed' : 'escaped';
  return {
    state: { ...state, phase, holding: false, outcome },
    outcome,
  };
}

function sanitizeEncounter(encounter: EncounterResult): EncounterResult {
  if (encounter === null || typeof encounter !== 'object') {
    throw new FishingRuleError('INVALID_ENCOUNTER', 'cast requires an encountered fish');
  }
  const fish = FISH_BY_SKU.get(encounter.fishSku);
  if (!fish) {
    throw new FishingRuleError('INVALID_ENCOUNTER', `Unknown fish sku: ${String(encounter.fishSku)}`);
  }
  if (encounter.rarity !== fish.rarity) {
    throw new FishingRuleError(
      'INVALID_ENCOUNTER',
      `Encounter rarity ${String(encounter.rarity)} does not match ${fish.sku} (${fish.rarity})`,
    );
  }
  if (!Number.isFinite(encounter.waitMs) || encounter.waitMs < 0) {
    throw new FishingRuleError(
      'INVALID_ENCOUNTER',
      `Encounter waitMs must be a finite non-negative number, received: ${String(encounter.waitMs)}`,
    );
  }
  if (!Number.isFinite(encounter.biteWindowMs) || encounter.biteWindowMs <= 0) {
    throw new FishingRuleError(
      'INVALID_ENCOUNTER',
      `Encounter biteWindowMs must be a finite positive number, received: ${String(encounter.biteWindowMs)}`,
    );
  }
  return {
    fishSku: fish.sku,
    rarity: fish.rarity,
    waitMs: encounter.waitMs,
    biteWindowMs: encounter.biteWindowMs,
  };
}

/**
 * Band phase is derived only from the encounter snapshot, so the same
 * server-rolled encounter always yields the same band for both partners and
 * for the server re-simulation. No local cast time or wall clock leaks in.
 */
function deriveBandPhase(encounter: EncounterResult): number {
  const signature = hashSeed(
    `${encounter.fishSku}|${encounter.rarity}|${encounter.waitMs}|${encounter.biteWindowMs}`,
  );
  const bandSeed = deriveSeed(signature, 'band');
  return createRng(bandSeed).next() * Math.PI * 2;
}

/** Creates a fresh idle session. Rod/bait are session config, default starter gear. */
export function createFishingState(
  nowMs: number,
  options: CreateFishingStateOptions = {},
): FishingState {
  assertTimestamp(nowMs, 'createFishingState nowMs');
  const rod = getRodDefinition(options.rodId ?? 'rod_basic');
  const bait = getBaitDefinition(options.baitSku ?? 'bait_free_worm');
  return {
    phase: 'idle',
    nowMs,
    rodId: rod.id,
    baitSku: bait.sku,
    encounter: null,
    castAtMs: null,
    biteAtMs: null,
    hookedAtMs: null,
    bandPhase: 0,
    meterPermille: 0,
    meterCarry: 0,
    holding: false,
    outOfBandMs: 0,
    outcome: null,
  };
}

/**
 * Schedules a bite. Allowed from idle and from terminal states (landed/escaped)
 * so a new cast can start a new session without a separate reset action.
 */
export function cast(state: FishingState, input: CastInput): FishingTransition {
  const nowMs = acceptActionTime(state, input.nowMs, 'cast nowMs');
  assertKnownPhase(state.phase);
  if (state.phase !== 'idle' && state.phase !== 'landed' && state.phase !== 'escaped') {
    throw new FishingRuleError(
      'INVALID_PHASE',
      `cast is only allowed from idle/landed/escaped (current phase: ${state.phase})`,
      state.phase,
    );
  }
  const encounter = sanitizeEncounter(input.encounter);
  const bandPhase = deriveBandPhase(encounter);
  return {
    state: {
      ...state,
      phase: 'waiting',
      nowMs,
      encounter,
      castAtMs: nowMs,
      biteAtMs: nowMs + encounter.waitMs,
      hookedAtMs: null,
      bandPhase,
      meterPermille: 0,
      meterCarry: 0,
      holding: false,
      outOfBandMs: 0,
      outcome: null,
    },
    outcome: null,
  };
}

function advanceHooked(state: FishingState, nowMs: number): FishingTransition {
  const encounter = state.encounter;
  if (encounter === null || state.hookedAtMs === null) {
    throw new FishingRuleError('INVALID_STATE', 'Hooked state is missing encounter data', state.phase);
  }

  const dtMs = nowMs - state.nowMs;
  const band = bandFor(state, nowMs);
  const aboveBand = state.meterPermille > band.highPermille;
  const belowBand = state.meterPermille < band.lowPermille;
  const inside = !aboveBand && !belowBand;
  // One-finger promise: holding raises, releasing drains. The band decides
  // whether the top of the meter is a legal landing or an over-pull.
  const ratePerSec = state.holding
    ? FISHING_TUNING.holdRisePerSec
    : -FISHING_TUNING.releaseDrainPerSec;
  const exactMeter = state.meterPermille + state.meterCarry + (ratePerSec * dtMs) / 1000;
  const clampedMeter = Math.min(
    FISHING_TUNING.meterMaxPermille,
    Math.max(0, exactMeter),
  );
  const meterPermille = Math.round(clampedMeter);
  const meterCarry = clampedMeter - meterPermille;
  const outOfBandMs = state.outOfBandMs + (inside ? 0 : dtMs);

  const next: FishingState = {
    ...state,
    nowMs,
    meterPermille,
    meterCarry,
    outOfBandMs,
  };

  // Holding always raises, so an emptied meter normally means the player let
  // go and the release drain bottomed it out (METRE_DRAINED). The holding
  // branch is defensive: it can only happen through rounding at zero.
  if (meterPermille <= 0) {
    return finish(next, {
      type: 'escaped',
      reason: state.holding ? 'OUT_OF_BAND' : 'METRE_DRAINED',
    });
  }

  // Success: full meter AND currently inside the band. Hitting 1000 while
  // outside the band is an over-pull snap: the player must time the final
  // hold for the moment the band covers the top of the meter.
  if (meterPermille >= FISHING_TUNING.landingMeterPermille) {
    if (inside) {
      return finish(next, { type: 'landed', fishSku: encounter.fishSku });
    }
    return finish(next, { type: 'escaped', reason: 'OUT_OF_BAND' });
  }

  // Safety net for a player who never finds the band.
  if (outOfBandMs >= FISHING_TUNING.outOfBandLimitMs) {
    return finish(next, { type: 'escaped', reason: 'OUT_OF_BAND' });
  }

  return { state: next, outcome: null };
}

/**
 * Advances the logical clock and resolves whatever the current phase requires.
 * Ticks before the bite keep `waiting`; a tick at/after `biteAtMs` reveals
 * `biting`; a tick past the window escapes with MISSED_BITE.
 */
export function tick(state: FishingState, input: TimeInput): FishingTransition {
  const nowMs = acceptActionTime(state, input.nowMs, 'tick nowMs');
  assertKnownPhase(state.phase);

  switch (state.phase) {
    case 'idle': {
      return { state: { ...state, nowMs }, outcome: null };
    }
    case 'waiting': {
      const encounter = state.encounter;
      if (encounter === null || state.biteAtMs === null) {
        throw new FishingRuleError('INVALID_STATE', 'Waiting state is missing bite schedule', state.phase);
      }
      if (nowMs < state.biteAtMs) {
        return { state: { ...state, nowMs }, outcome: null };
      }
      if (nowMs <= state.biteAtMs + encounter.biteWindowMs) {
        return { state: { ...state, nowMs, phase: 'biting' }, outcome: null };
      }
      return finish({ ...state, nowMs }, { type: 'escaped', reason: 'MISSED_BITE' });
    }
    case 'biting': {
      const encounter = state.encounter;
      if (encounter === null || state.biteAtMs === null) {
        throw new FishingRuleError('INVALID_STATE', 'Biting state is missing bite schedule', state.phase);
      }
      if (nowMs > state.biteAtMs + encounter.biteWindowMs) {
        return finish({ ...state, nowMs }, { type: 'escaped', reason: 'MISSED_BITE' });
      }
      return { state: { ...state, nowMs }, outcome: null };
    }
    case 'hooked':
      return advanceHooked(state, nowMs);
    case 'landed':
    case 'escaped':
      return { state: { ...state, nowMs }, outcome: null };
    default:
      throw new FishingRuleError('UNKNOWN_PHASE', `Unknown fishing phase: ${String(state.phase)}`, state.phase);
  }
}

/**
 * Finger-down. During `biting` this starts the fight (and counts as holding).
 * Pressing too early is a typed error. Pressing after the reaction window
 * resolves the miss instead of throwing.
 */
export function press(state: FishingState, input: TimeInput): FishingTransition {
  const nowMs = acceptActionTime(state, input.nowMs, 'press nowMs');
  assertKnownPhase(state.phase);

  switch (state.phase) {
    case 'biting': {
      const encounter = state.encounter;
      if (encounter === null || state.biteAtMs === null) {
        throw new FishingRuleError('INVALID_STATE', 'Biting state is missing bite schedule', state.phase);
      }
      if (nowMs > state.biteAtMs + encounter.biteWindowMs) {
        return finish({ ...state, nowMs }, { type: 'escaped', reason: 'MISSED_BITE' });
      }
      const band = bandGeometry(
        getRodDefinition(state.rodId),
        getFishDefinition(encounter.fishSku),
        state.bandPhase,
        0,
      );
      const initialMeter = Math.min(
        FISHING_TUNING.meterMaxPermille,
        Math.max(0, band.centerPermille),
      );
      return {
        state: {
          ...state,
          phase: 'hooked',
          nowMs,
          hookedAtMs: nowMs,
          holding: true,
          meterPermille: initialMeter,
          meterCarry: 0,
          outOfBandMs: 0,
          outcome: null,
        },
        outcome: null,
      };
    }
    case 'hooked': {
      const advanced = advanceHooked(state, nowMs);
      if (advanced.state.phase !== 'hooked') {
        return advanced;
      }
      if (advanced.state.holding) {
        // Duplicate finger-down (one finger only): idempotent no-op.
        return advanced;
      }
      return { state: { ...advanced.state, holding: true }, outcome: null };
    }
    case 'idle':
    case 'waiting':
      throw new FishingRuleError(
        'INVALID_PHASE',
        `Cannot press before the bite is revealed (current phase: ${state.phase})`,
        state.phase,
      );
    case 'landed':
    case 'escaped':
      throw new FishingRuleError(
        'INVALID_PHASE',
        `Session already finished (current phase: ${state.phase})`,
        state.phase,
      );
    default:
      throw new FishingRuleError('UNKNOWN_PHASE', `Unknown fishing phase: ${String(state.phase)}`, state.phase);
  }
}

/** Finger-up: stops raising the meter; subsequent ticks drain it quickly. */
export function release(state: FishingState, input: TimeInput): FishingTransition {
  const nowMs = acceptActionTime(state, input.nowMs, 'release nowMs');
  assertKnownPhase(state.phase);

  switch (state.phase) {
    case 'hooked': {
      const advanced = advanceHooked(state, nowMs);
      if (advanced.state.phase !== 'hooked') {
        return advanced;
      }
      return { state: { ...advanced.state, holding: false }, outcome: null };
    }
    case 'idle':
    case 'waiting':
    case 'biting':
    case 'landed':
    case 'escaped':
      throw new FishingRuleError(
        'INVALID_PHASE',
        `release is only allowed while hooked (current phase: ${state.phase})`,
        state.phase,
      );
    default:
      throw new FishingRuleError('UNKNOWN_PHASE', `Unknown fishing phase: ${String(state.phase)}`, state.phase);
  }
}
