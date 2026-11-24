import { describe, expect, it } from 'vitest';
import {
  FISH_BY_SKU,
  FISH_DEFINITIONS,
  FishingRuleError,
  ROD_BY_ID,
  cast,
  createFishingState,
  getCatchBand,
  getEncounterWeights,
  press,
  release,
  rollEncounter,
  tick,
  type BaitSku,
  type EncounterResult,
  type FishingOutcome,
  type FishingState,
  type FishingTransition,
  type RodId,
} from '../../src/shared/fishing';

const NOW = 1_750_000_000_000;

function makeEncounter(overrides: Partial<EncounterResult> = {}): EncounterResult {
  return {
    fishSku: 'carp_pond',
    rarity: 'common',
    waitMs: 2000,
    biteWindowMs: 1200,
    ...overrides,
  };
}

function startSession(
  encounter: EncounterResult = makeEncounter(),
  options: { rodId?: RodId; baitSku?: BaitSku } = {},
  nowMs: number = NOW,
): FishingTransition {
  const idle = createFishingState(nowMs, options);
  return cast(idle, { nowMs, encounter });
}

/** Casts, ticks to the bite and presses just inside the window. */
function hookSession(
  encounter: EncounterResult = makeEncounter(),
  options: { rodId?: RodId; baitSku?: BaitSku } = {},
  nowMs: number = NOW,
): FishingState {
  const castResult = startSession(encounter, options, nowMs);
  const biteAt = nowMs + encounter.waitMs;
  const biting = tick(castResult.state, { nowMs: biteAt });
  expect(biting.state.phase).toBe('biting');
  const hooked = press(biting.state, { nowMs: biteAt + 1 });
  expect(hooked.state.phase).toBe('hooked');
  return hooked.state;
}

function expectRuleError(action: () => unknown, code: string): FishingRuleError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(FishingRuleError);
    const typed = error as FishingRuleError;
    expect(typed.code).toBe(code);
    return typed;
  }
  throw new Error(`Expected a FishingRuleError with code ${code}`);
}

interface FightRun {
  state: FishingState;
  outcome: FishingOutcome | null;
}

/**
 * Scripted player that keeps the meter near the top of the moving band.
 * Deterministic: only uses the explicit clock and the public band helper.
 */
function driveTowardBandTop(start: FishingState, maxMs = 30_000, stepMs = 16): FightRun {
  let state = start;
  let elapsedMs = 0;
  while (state.phase === 'hooked' && elapsedMs < maxMs) {
    elapsedMs += stepMs;
    const actionAtMs = state.nowMs + stepMs;
    const band = getCatchBand(state, actionAtMs);
    const wantHold = state.meterPermille < band.highPermille;

    if (wantHold !== state.holding) {
      const transition = wantHold
        ? press(state, { nowMs: actionAtMs })
        : release(state, { nowMs: actionAtMs });
      state = transition.state;
      if (transition.outcome) {
        return { state, outcome: transition.outcome };
      }
    }

    const transition = tick(state, { nowMs: actionAtMs });
    state = transition.state;
    if (transition.outcome) {
      return { state, outcome: transition.outcome };
    }
  }
  return { state, outcome: state.outcome };
}

/**
 * Scripted "player" that deliberately avoids the band: release inside it,
 * hold outside it. Deterministic and used only to reach OUT_OF_BAND.
 */
function driveAwayFromBand(start: FishingState, maxMs = 15_000, stepMs = 16): FightRun {
  let state = start;
  let elapsedMs = 0;
  while (state.phase === 'hooked' && elapsedMs < maxMs) {
    elapsedMs += stepMs;
    const actionAtMs = state.nowMs + stepMs;
    const band = getCatchBand(state, actionAtMs);
    const inside =
      state.meterPermille >= band.lowPermille && state.meterPermille <= band.highPermille;

    const transition = inside
      ? release(state, { nowMs: actionAtMs })
      : press(state, { nowMs: actionAtMs });
    state = transition.state;
    if (transition.outcome) {
      return { state, outcome: transition.outcome };
    }
  }
  return { state, outcome: state.outcome };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value as unknown as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

interface DistributionSample {
  readonly common: number;
  readonly uncommon: number;
  readonly rare: number;
  readonly skus: readonly string[];
}

function sampleDistribution(
  rodId: RodId,
  baitSku: BaitSku,
  sampleCount: number,
): DistributionSample {
  let common = 0;
  let uncommon = 0;
  let rare = 0;
  const skus: string[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const encounter = rollEncounter({
      seed: 90_000 + index,
      rodId,
      baitSku,
      nowMs: NOW,
    });
    skus.push(encounter.fishSku);
    if (encounter.rarity === 'common') common += 1;
    else if (encounter.rarity === 'uncommon') uncommon += 1;
    else rare += 1;
  }
  return { common, uncommon, rare, skus };
}

describe('fishing encounter rolling', () => {
  it('is deterministic for the same seed and inputs, and ignores wall-clock changes', () => {
    const input = { seed: 'server-world-42', rodId: 'rod_sturdy' as const, baitSku: 'bait_shrimp' as const, nowMs: NOW };
    const first = rollEncounter(input);
    const second = rollEncounter({ ...input });
    const later = rollEncounter({ ...input, nowMs: NOW + 999_999 });

    expect(second).toEqual(first);
    expect(later).toEqual(first);
    expect(first.waitMs).toBeGreaterThanOrEqual(2000);
    expect(first.waitMs).toBeLessThanOrEqual(12_000);
    expect(first.biteWindowMs).toBeGreaterThan(0);
    expect(FISH_BY_SKU.get(first.fishSku)?.rarity).toBe(first.rarity);
  });

  it('varies across seeds', () => {
    const signatures = new Set<string>();
    for (let index = 0; index < 64; index += 1) {
      const encounter = rollEncounter({
        seed: index,
        rodId: 'rod_sturdy',
        baitSku: 'bait_shrimp',
        nowMs: NOW,
      });
      signatures.add(`${encounter.fishSku}:${encounter.waitMs}:${encounter.biteWindowMs}`);
    }
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('shrimp bait increases the rare share over a fixed 500-draw sample', () => {
    const worm = sampleDistribution('rod_sturdy', 'bait_free_worm', 500);
    const shrimp = sampleDistribution('rod_sturdy', 'bait_shrimp', 500);

    expect(worm.common).toBe(500);
    expect(worm.uncommon + worm.rare).toBe(0);

    const wormRareShare = (worm.uncommon + worm.rare) / 500;
    const shrimpRareShare = (shrimp.uncommon + shrimp.rare) / 500;
    expect(shrimp.uncommon).toBeGreaterThan(0);
    expect(shrimp.rare).toBeGreaterThan(0);
    expect(shrimpRareShare).toBeGreaterThan(wormRareShare);
  });

  it('rod tier gates rare fish: the basic rod never rolls lotus_trout, even with shrimp', () => {
    const basic = sampleDistribution('rod_basic', 'bait_shrimp', 300);
    const sturdy = sampleDistribution('rod_sturdy', 'bait_shrimp', 300);

    expect(basic.skus).not.toContain('lotus_trout');
    expect(sturdy.skus).toContain('lotus_trout');

    const basicWeights = getEncounterWeights('rod_basic', 'bait_shrimp');
    const lotusBasic = basicWeights.find((entry) => entry.value.sku === 'lotus_trout');
    const koiBasic = basicWeights.find((entry) => entry.value.sku === 'koi_pastel');
    expect(lotusBasic?.weight).toBe(0);
    expect(koiBasic?.weight).toBeGreaterThan(0);
  });

  it('basic rod can still catch common fish with the free worm (no dead-lock)', () => {
    const basic = sampleDistribution('rod_basic', 'bait_free_worm', 100);
    expect(basic.common).toBe(100);
    expect(basic.skus.every((sku) => sku === 'carp_pond')).toBe(true);
  });

  it('applies the rod bite-window bonus and keeps waits inside 2s..12s', () => {
    for (let index = 0; index < 40; index += 1) {
      const encounter = rollEncounter({
        seed: index,
        rodId: 'rod_bamboo',
        baitSku: 'bait_shrimp',
        nowMs: NOW,
      });
      const fish = FISH_BY_SKU.get(encounter.fishSku);
      const rod = ROD_BY_ID.get('rod_bamboo');
      expect(fish).toBeDefined();
      expect(rod).toBeDefined();
      expect(encounter.biteWindowMs).toBe((fish?.biteWindowMs ?? 0) + (rod?.biteWindowBonusMs ?? 0));
      expect(encounter.waitMs).toBeGreaterThanOrEqual(2000);
      expect(encounter.waitMs).toBeLessThanOrEqual(12_000);
    }
  });

  it('rejects invalid time and configuration with typed errors', () => {
    expectRuleError(
      () => rollEncounter({ seed: 1, rodId: 'rod_basic', baitSku: 'bait_shrimp', nowMs: -1 }),
      'INVALID_TIME',
    );
    expectRuleError(
      () => rollEncounter({ seed: '', rodId: 'rod_basic', baitSku: 'bait_free_worm', nowMs: NOW }),
      'INVALID_CONFIG',
    );
    expectRuleError(
      () =>
        rollEncounter({
          seed: 1,
          rodId: 'rod_golden' as unknown as RodId,
          baitSku: 'bait_free_worm',
          nowMs: NOW,
        }),
      'INVALID_CONFIG',
    );
  });
});

describe('fishing FSM bite timer', () => {
  it('stays waiting before the bite time and flips to biting exactly at the bite time', () => {
    const encounter = makeEncounter({ waitMs: 2000 });
    const castResult = startSession(encounter);
    expect(castResult.state.phase).toBe('waiting');
    expect(castResult.state.biteAtMs).toBe(NOW + 2000);
    expect(castResult.outcome).toBeNull();

    const early = tick(castResult.state, { nowMs: NOW + 1999 });
    expect(early.state.phase).toBe('waiting');
    expect(early.outcome).toBeNull();

    const exact = tick(early.state, { nowMs: NOW + 2000 });
    expect(exact.state.phase).toBe('biting');
    expect(exact.outcome).toBeNull();
  });

  it('press inside the reaction window hooks the fish', () => {
    const encounter = makeEncounter({ waitMs: 2000, biteWindowMs: 1200 });
    const castResult = startSession(encounter);
    const biting = tick(castResult.state, { nowMs: NOW + 2000 });

    const hooked = press(biting.state, { nowMs: NOW + 2000 + 600 });
    expect(hooked.state.phase).toBe('hooked');
    expect(hooked.state.holding).toBe(true);
    expect(hooked.state.hookedAtMs).toBe(NOW + 2600);
    expect(hooked.state.meterPermille).toBeGreaterThan(0);
    expect(hooked.outcome).toBeNull();
  });

  it('press after the reaction window escapes with MISSED_BITE', () => {
    const encounter = makeEncounter({ waitMs: 2000, biteWindowMs: 1200 });
    const castResult = startSession(encounter);
    const biting = tick(castResult.state, { nowMs: NOW + 2000 });

    const late = press(biting.state, { nowMs: NOW + 2000 + 1200 + 1 });
    expect(late.state.phase).toBe('escaped');
    expect(late.outcome).toEqual({ type: 'escaped', reason: 'MISSED_BITE' });
    expect(late.state.outcome).toEqual({ type: 'escaped', reason: 'MISSED_BITE' });
  });

  it('a tick past the window escapes with MISSED_BITE even without a press', () => {
    const encounter = makeEncounter({ waitMs: 2000, biteWindowMs: 1200 });
    const castResult = startSession(encounter);
    const biting = tick(castResult.state, { nowMs: NOW + 2000 });
    const missed = tick(biting.state, { nowMs: NOW + 2000 + 1200 + 1 });

    expect(missed.state.phase).toBe('escaped');
    expect(missed.outcome).toEqual({ type: 'escaped', reason: 'MISSED_BITE' });
  });
});

describe('fishing FSM hold-to-catch', () => {
  it('holding while tracking the band reaches 1000 and lands the expected fish', () => {
    const encounter = makeEncounter({ fishSku: 'carp_pond', rarity: 'common', waitMs: 1500, biteWindowMs: 1500 });
    const hooked = hookSession(encounter, { rodId: 'rod_basic', baitSku: 'bait_free_worm' });
    const run = driveTowardBandTop(hooked);

    expect(run.outcome).not.toBeNull();
    expect(run.outcome?.type).toBe('landed');
    expect(run.outcome).toEqual({ type: 'landed', fishSku: 'carp_pond' });
    expect(run.state.phase).toBe('landed');
    expect(run.state.meterPermille).toBe(1000);
  });

  it('releasing drains the meter and escapes with METRE_DRAINED', () => {
    const hooked = hookSession();
    let state = release(hooked, { nowMs: hooked.nowMs }).state;
    expect(state.holding).toBe(false);

    let outcome: FishingOutcome | null = null;
    for (let step = 0; step < 400 && state.phase === 'hooked'; step += 1) {
      const transition = tick(state, { nowMs: state.nowMs + 16 });
      state = transition.state;
      if (transition.outcome) outcome = transition.outcome;
    }

    expect(outcome).toEqual({ type: 'escaped', reason: 'METRE_DRAINED' });
    expect(state.phase).toBe('escaped');
  });

  it('losing the band escapes with OUT_OF_BAND', () => {
    const hooked = hookSession();
    const run = driveAwayFromBand(hooked);

    expect(run.outcome).toEqual({ type: 'escaped', reason: 'OUT_OF_BAND' });
    expect(run.state.phase).toBe('escaped');
  });

  it('builds deterministic band geometry from the seeded phase', () => {
    const first = hookSession();
    const second = hookSession();
    const bandA = getCatchBand(first, first.nowMs + 500);
    const bandB = getCatchBand(second, second.nowMs + 500);

    expect(bandB).toEqual(bandA);
    expect(bandA.centerPermille).toBeGreaterThanOrEqual(450);
    expect(bandA.centerPermille).toBeLessThanOrEqual(950);
    expect(bandA.halfWidthPermille).toBeGreaterThan(0);
    expect(bandA.lowPermille).toBeGreaterThanOrEqual(0);
    expect(bandA.highPermille).toBeLessThanOrEqual(1000);
    expect(bandA.lowPermille).toBeLessThanOrEqual(bandA.highPermille);
  });

  it('produces identical state/outcome for identical action/time sequences', () => {
    const runSequence = (): { states: FishingState[]; outcomes: (FishingOutcome | null)[] } => {
      const states: FishingState[] = [];
      const outcomes: (FishingOutcome | null)[] = [];
      const encounter = makeEncounter({ fishSku: 'koi_pastel', rarity: 'uncommon', waitMs: 1800, biteWindowMs: 1300 });
      let transition = startSession(encounter, { rodId: 'rod_sturdy', baitSku: 'bait_shrimp' });
      states.push(transition.state);
      outcomes.push(transition.outcome);
      transition = tick(transition.state, { nowMs: NOW + 1800 });
      states.push(transition.state);
      outcomes.push(transition.outcome);
      transition = press(transition.state, { nowMs: NOW + 2000 });
      states.push(transition.state);
      outcomes.push(transition.outcome);
      const run = driveTowardBandTop(transition.state);
      states.push(run.state);
      outcomes.push(run.outcome);
      return { states, outcomes };
    };

    const first = runSequence();
    const second = runSequence();
    expect(second.states).toEqual(first.states);
    expect(second.outcomes).toEqual(first.outcomes);
    expect(JSON.stringify(second.states)).toBe(JSON.stringify(first.states));
  });
});

describe('fishing FSM input guards', () => {
  it('rejects pressing while idle or waiting', () => {
    const idle = createFishingState(NOW);
    expectRuleError(() => press(idle, { nowMs: NOW }), 'INVALID_PHASE');

    const waiting = startSession().state;
    expectRuleError(() => press(waiting, { nowMs: NOW + 500 }), 'INVALID_PHASE');
  });

  it('rejects negative time deltas and non-finite timestamps', () => {
    const castResult = startSession();
    expectRuleError(() => tick(castResult.state, { nowMs: NOW - 1 }), 'INVALID_TIME');
    expectRuleError(() => createFishingState(Number.NaN), 'INVALID_TIME');
    expectRuleError(() => tick(castResult.state, { nowMs: Number.POSITIVE_INFINITY }), 'INVALID_TIME');
  });

  it('rejects unknown phases with a typed UNKNOWN_PHASE error', () => {
    const bogus = { ...createFishingState(NOW), phase: 'sleeping' } as unknown as FishingState;
    expectRuleError(() => tick(bogus, { nowMs: NOW }), 'UNKNOWN_PHASE');
    expectRuleError(() => press(bogus, { nowMs: NOW }), 'UNKNOWN_PHASE');
  });

  it('rejects invalid encounters passed to cast', () => {
    const idle = createFishingState(NOW);
    expectRuleError(
      () =>
        cast(idle, {
          nowMs: NOW,
          encounter: { ...makeEncounter(), fishSku: 'shark_storm' as unknown as EncounterResult['fishSku'] },
        }),
      'INVALID_ENCOUNTER',
    );
    expectRuleError(
      () =>
        cast(idle, {
          nowMs: NOW,
          encounter: { ...makeEncounter(), rarity: 'rare' },
        }),
      'INVALID_ENCOUNTER',
    );
    expectRuleError(
      () => cast(idle, { nowMs: NOW, encounter: { ...makeEncounter(), biteWindowMs: 0 } }),
      'INVALID_ENCOUNTER',
    );
  });

  it('rejects release outside the hooked phase', () => {
    const idle = createFishingState(NOW);
    expectRuleError(() => release(idle, { nowMs: NOW }), 'INVALID_PHASE');
    const waiting = startSession().state;
    expectRuleError(() => release(waiting, { nowMs: NOW + 10 }), 'INVALID_PHASE');
  });
});

describe('fishing domain economy boundary', () => {
  it('blind holding is not a guaranteed win: the moving band decides the top', () => {
    let landed = 0;
    let outOfBand = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const encounter = rollEncounter({
        seed,
        rodId: 'rod_basic',
        baitSku: 'bait_free_worm',
        nowMs: NOW,
      });
      let transition = startSession(encounter, { rodId: 'rod_basic', baitSku: 'bait_free_worm' });
      transition = tick(transition.state, { nowMs: NOW + encounter.waitMs });
      transition = press(transition.state, { nowMs: NOW + encounter.waitMs + 1 });
      let state = transition.state;
      let outcome: FishingOutcome | null = null;
      for (let index = 0; index < 2000 && state.phase === 'hooked'; index += 1) {
        const step = tick(state, { nowMs: state.nowMs + 16 });
        state = step.state;
        if (step.outcome) outcome = step.outcome;
      }
      if (outcome?.type === 'landed') landed += 1;
      else if (outcome?.type === 'escaped' && outcome.reason === 'OUT_OF_BAND') outOfBand += 1;
    }
    // Both endings occur: pure holding is a coin-flip against the band, not a
    // free win, and the snap/timer path is reachable without scripted releases.
    expect(landed).toBeGreaterThan(0);
    expect(outOfBand).toBeGreaterThan(0);
    expect(landed + outOfBand).toBe(200);
  });

  it('never grants items or coins: outcomes and state stay economy-free', () => {
    const encounter = makeEncounter();
    const hooked = hookSession(encounter);
    const run = driveTowardBandTop(hooked);

    expect(run.outcome).not.toBeNull();
    const outcome = run.outcome as FishingOutcome;
    expect(outcome.type).toBe('landed');
    expect(Object.keys(outcome).sort()).toEqual(['fishSku', 'type']);
    expect(outcome).not.toHaveProperty('coins');
    expect(outcome).not.toHaveProperty('qty');
    expect(outcome).not.toHaveProperty('quantity');
    expect(outcome).not.toHaveProperty('inventory');
    expect(outcome).not.toHaveProperty('reward');

    const stateKeys = Object.keys(run.state);
    expect(stateKeys).not.toContain('wallet');
    expect(stateKeys).not.toContain('inventory');
    expect(stateKeys).not.toContain('coins');
    expect(stateKeys).not.toContain('balance');
    expect(stateKeys).not.toContain('items');

    const missed = press(
      tick(startSession().state, { nowMs: NOW + 2000 }).state,
      { nowMs: NOW + 2000 + 5000 },
    );
    const missedOutcome = missed.outcome as FishingOutcome;
    expect(missedOutcome.type).toBe('escaped');
    expect(Object.keys(missedOutcome).sort()).toEqual(['reason', 'type']);
  });

  it('never mutates the input state (safe to freeze)', () => {
    const frozenIdle = deepFreeze(createFishingState(NOW));
    const snapshot = JSON.stringify(frozenIdle);

    const castResult = cast(frozenIdle, { nowMs: NOW, encounter: makeEncounter() });
    expect(JSON.stringify(frozenIdle)).toBe(snapshot);
    expect(castResult.state).not.toBe(frozenIdle);

    const frozenWaiting = deepFreeze(castResult.state);
    const biting = tick(frozenWaiting, { nowMs: NOW + 2000 });
    expect(biting.state).not.toBe(frozenWaiting);
    expect(frozenWaiting.phase).toBe('waiting');

    const frozenBiting = deepFreeze(biting.state);
    const hooked = press(frozenBiting, { nowMs: NOW + 2100 });
    expect(hooked.state.phase).toBe('hooked');
    expect(frozenBiting.phase).toBe('biting');
  });

  it('keeps states serializable across the whole flow', () => {
    const hooked = hookSession();
    const roundTripped = JSON.parse(JSON.stringify(hooked)) as FishingState;
    expect(roundTripped).toEqual(hooked);
    expect(JSON.stringify(roundTripped)).toBe(JSON.stringify(hooked));
  });

  it('catalog exposes exactly the three documented fish and three rod tiers', () => {
    expect(FISH_DEFINITIONS.map((fish) => fish.sku)).toEqual([
      'carp_pond',
      'koi_pastel',
      'lotus_trout',
    ]);
    expect(FISH_DEFINITIONS.map((fish) => fish.rarity)).toEqual(['common', 'uncommon', 'rare']);
    expect(ROD_BY_ID.size).toBe(3);
    expect(FISH_BY_SKU.get('lotus_trout')?.minRodTier).toBe(2);
  });
});
