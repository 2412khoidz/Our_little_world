import { describe, expect, it } from 'vitest';
import * as memoryApi from '../../src/shared/petAdvanced/primitives/memory';
import {
  DEFAULT_MEMORY_CAPACITY,
  DEFAULT_MEMORY_KIND_REGISTRY,
  RESPONSE_CURVES,
  appendMemoryEvent,
  canSwitch,
  canSwitchWithinBudget,
  clamp01,
  clampRange,
  createCooldownTracker,
  createMemoryKindRegistry,
  createMemoryState,
  createSelectionLog,
  createSwitchHistory,
  deserializeMemory,
  deterministicTieBreak,
  expireEvents,
  filterAffordances,
  frequencyCount,
  getLastSelectedAtMs,
  getResponseCurve,
  isKnownMemoryKind,
  isOnCooldown,
  isRepeatSuppressed,
  logisticResponse,
  markUsed,
  needUrgency,
  normalize01,
  noteSelection,
  noteSwitch,
  powerResponse,
  preferenceScore,
  rankAffordances,
  recencyWeight,
  remainingMs,
  runSandbox,
  safeNumber,
  scoreAction,
  scoreAffordance,
  scorePreferenceByCaregiver,
  selectAffordance,
  serializeMemory,
  shouldInterrupt,
  summarizeSandboxActions,
  urgencyScore,
  weightedScore,
  type ActiveAction,
  type AffordanceCandidate,
  type MemoryEvent,
  type SandboxConfigOverrides,
  type ScoreComponent,
} from '../../src/shared/petAdvanced/primitives';

const WILD_NUMBERS = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  -1000,
  -1,
  0,
  0.25,
  0.5,
  1,
  2,
  1000,
] as const;

function expectUnitScore(value: number): void {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(1);
}

describe('utilityMath: curves and safe numbers', () => {
  it('keeps every registry curve finite and inside 0..1 for wild inputs', () => {
    for (const [name, curve] of Object.entries(RESPONSE_CURVES)) {
      for (const input of WILD_NUMBERS) {
        const output = curve(input);
        expect(Number.isFinite(output), `${name}(${String(input)})`).toBe(true);
        expect(output).toBeGreaterThanOrEqual(0);
        expect(output).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps configurable curve options safe for NaN/Infinity/negative values', () => {
    const options = [
      { exponent: 3 },
      { exponent: Number.NaN },
      { exponent: -2 },
      { steepness: Number.POSITIVE_INFINITY, midpoint: Number.NaN },
      { steepness: -1, midpoint: 2 },
      { steepness: Number.NEGATIVE_INFINITY, midpoint: -1 },
    ] as const;
    for (const option of options) {
      for (const input of WILD_NUMBERS) {
        expectUnitScore(RESPONSE_CURVES.power(input, option));
        expectUnitScore(RESPONSE_CURVES.logistic(input, option));
      }
    }
  });

  it('exposes the expected curve shapes and registry fallback', () => {
    expect(RESPONSE_CURVES.linear(0.3)).toBeCloseTo(0.3);
    expect(RESPONSE_CURVES.smoothstep(0)).toBe(0);
    expect(RESPONSE_CURVES.smoothstep(1)).toBe(1);
    expect(RESPONSE_CURVES.smoothstep(0.5)).toBeCloseTo(0.5);
    expect(RESPONSE_CURVES.inverseSmoothstep(0)).toBe(0);
    expect(RESPONSE_CURVES.inverseSmoothstep(1)).toBe(1);
    expect(RESPONSE_CURVES.inverseSmoothstep(0.5)).toBeCloseTo(0.5);
    expect(powerResponse(0.5, 2)).toBeCloseTo(0.25);
    expect(powerResponse(0.5, Number.NaN)).toBeCloseTo(0.25);
    expect(logisticResponse(0)).toBeCloseTo(0);
    expect(logisticResponse(0.5)).toBeCloseTo(0.5);
    expect(logisticResponse(1)).toBeCloseTo(1);
    expect(logisticResponse(0.5, Number.POSITIVE_INFINITY, 0.5)).toBe(0.5);
    expect(getResponseCurve('not-a-curve')(0.4)).toBeCloseTo(0.4);
    expect(getResponseCurve(undefined)(2)).toBe(1);
  });

  it('sanitizes clamp/normalize/safeNumber edge cases', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampRange(5, 10, 0)).toBe(5);
    expect(clampRange(Number.NaN, 2, 8)).toBe(2);
    expect(clampRange(Number.POSITIVE_INFINITY, 2, 8)).toBe(8);
    expect(clampRange(Number.NEGATIVE_INFINITY, 2, 8)).toBe(2);
    expect(clampRange(5, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(5);
    expect(normalize01(5, 0, 10)).toBeCloseTo(0.5);
    expect(normalize01(5, 10, 10)).toBe(0);
    expect(normalize01(Number.NaN, 0, 10)).toBe(0);
    expect(normalize01(Number.POSITIVE_INFINITY, 0, 10)).toBe(1);
    expect(safeNumber(Number.NaN, 7)).toBe(7);
    expect(safeNumber(2, Number.NaN)).toBe(2);
    expect(Number.isFinite(safeNumber(2, Number.POSITIVE_INFINITY))).toBe(true);
  });
});

describe('utilityMath: urgency and weighted scoring', () => {
  it('computes need urgency that rises as the need gets worse', () => {
    const base = { target: 85, criticalThreshold: 25 };
    expect(needUrgency({ value: 90, ...base })).toBe(0);
    expect(needUrgency({ value: 85, ...base })).toBe(0);
    expect(needUrgency({ value: 55, ...base })).toBeCloseTo(0.5);
    expect(needUrgency({ value: 25, ...base })).toBe(1);
    expect(needUrgency({ value: 5, ...base })).toBe(1);
    expect(needUrgency({ value: 55, ...base, curve: 'smoothstep' })).toBeCloseTo(0.5);
    expect(needUrgency({ value: 55, ...base, curve: powerResponse })).toBeCloseTo(0.25);
  });

  it('keeps need urgency finite for NaN, infinities and odd configs', () => {
    for (const value of WILD_NUMBERS) {
      for (const weight of WILD_NUMBERS) {
        expectUnitScore(needUrgency({ value, target: 85, criticalThreshold: 25, weight }));
      }
    }
    expectUnitScore(needUrgency({ value: Number.NaN, target: 85, criticalThreshold: 25 }));
    expect(
      needUrgency({ value: -Number.MAX_VALUE, target: 85, criticalThreshold: 25 }),
    ).toBe(1);
    expect(
      needUrgency({ value: 50, target: Number.NaN, criticalThreshold: Number.NaN }),
    ).toBeCloseTo(0.5);
    expect(needUrgency({ value: 95, target: 10, criticalThreshold: 90 })).toBe(0);
    expect(needUrgency({ value: 50, target: 10, criticalThreshold: 90 })).toBe(1);
    expect(needUrgency({ value: 0, target: 10, criticalThreshold: 90 })).toBe(1);
  });

  it('aggregates weighted scores deterministically', () => {
    const components: ScoreComponent[] = [
      { key: 'hunger', value01: 1, weight: 1 },
      { key: 'fun', value01: 0.5, weight: 3 },
    ];
    expect(weightedScore(components)).toBeCloseTo(0.625);
    expect(weightedScore([])).toBe(0);
    expect(
      weightedScore([
        { key: 'a', value01: 1, weight: 0 },
        { key: 'b', value01: 0.5, weight: -2 },
      ]),
    ).toBeCloseTo(0.75);
    expect(
      weightedScore([
        { key: 'a', value01: Number.NaN, weight: Number.NaN },
        { key: 'b', value01: Number.POSITIVE_INFINITY, weight: Number.NEGATIVE_INFINITY },
      ]),
    ).toBe(0.5);
    const score = scoreAction(components);
    expect(score.score01).toBeCloseTo(0.625);
    expect(score.totalWeight).toBe(4);
    const contributionSum = score.breakdown.reduce((sum, entry) => sum + entry.contribution, 0);
    expect(contributionSum).toBeCloseTo(score.score01);
    expect(scoreAction([]).breakdown).toEqual([]);
  });

  it('aggregates urgency in three bounded modes', () => {
    const contributions = [
      { key: 'hunger', urgency01: 1, weight: 1 },
      { key: 'fun', urgency01: 0.5, weight: 0.5 },
    ];
    expect(urgencyScore(contributions, 'weighted_mean')).toBeCloseTo(0.833333);
    expect(urgencyScore(contributions, 'saturating_sum')).toBe(1);
    expect(urgencyScore(contributions, 'max')).toBe(1);
    expect(urgencyScore([])).toBe(0);
    for (const mode of ['weighted_mean', 'saturating_sum', 'max'] as const) {
      expectUnitScore(
        urgencyScore(
          [{ key: 'x', urgency01: Number.NaN, weight: Number.POSITIVE_INFINITY }],
          mode,
        ),
      );
      expectUnitScore(urgencyScore([{ key: 'x', urgency01: 2, weight: -1 }], mode));
    }
  });
});

describe('utilityMath: deterministic tie-break', () => {
  it('orders by score then stable key regardless of input order', () => {
    const raw = [
      { key: 'b', score01: 0.5 },
      { key: 'a', score01: 0.5 },
      { key: 'c', score01: 0.9 },
      { key: 'd', score01: 0.5 },
    ];
    const expected = ['c', 'a', 'b', 'd'];
    expect(deterministicTieBreak(raw).map((entry) => entry.key)).toEqual(expected);
    expect(deterministicTieBreak([...raw].reverse()).map((entry) => entry.key)).toEqual(expected);
    expect(deterministicTieBreak(raw, (entry) => entry.key).map((entry) => entry.key)).toEqual(
      expected,
    );
  });

  it('falls back to id fields and treats NaN scores as zero', () => {
    const raw = [
      { id: 'z', score01: Number.NaN },
      { id: 'a', score01: 0 },
      { id: 'm', score01: Number.POSITIVE_INFINITY },
    ];
    expect(deterministicTieBreak(raw).map((entry) => entry.id)).toEqual(['m', 'a', 'z']);
    expect(deterministicTieBreak([])).toEqual([]);
  });
});

describe('stabilization: cooldown', () => {
  it('prevents an action from being repeated faster than allowed', () => {
    const idle = createCooldownTracker();
    expect(isOnCooldown(idle, 1000, 500)).toBe(false);
    const used = markUsed(idle, 1000);
    expect(used.lastUsedAtMs).toBe(1000);
    expect(isOnCooldown(used, 1000, 500)).toBe(true);
    expect(isOnCooldown(used, 1200, 500)).toBe(true);
    expect(remainingMs(used, 1200, 500)).toBe(300);
    expect(isOnCooldown(used, 1500, 500)).toBe(false);
    expect(remainingMs(used, 1500, 500)).toBe(0);
    expect(isOnCooldown(used, 1200, 0)).toBe(false);
  });

  it('is monotonic when the clock goes backwards and safe on NaN', () => {
    const used = markUsed(createCooldownTracker(), 1000);
    expect(markUsed(used, 500).lastUsedAtMs).toBe(1000);
    expect(isOnCooldown(used, 1400, 500)).toBe(true);
    expect(markUsed(used, Number.NaN).lastUsedAtMs).toBe(1000);
    expect(isOnCooldown(used, Number.NaN, 500)).toBe(false);
    expect(remainingMs(used, Number.NaN, 500)).toBe(0);
    expect(isOnCooldown(markUsed(createCooldownTracker(), 1000), 1000, Number.POSITIVE_INFINITY)).toBe(
      false,
    );
  });
});

describe('stabilization: commitment and interrupts', () => {
  const commitment = { minActionMs: 5000, commitmentMs: 6000, interruptGraceMs: 0 };
  const current: ActiveAction = {
    actionId: 'EAT',
    targetId: 'bowl',
    startedAtMs: 0,
    durationMs: 60000,
    score01: 0.4,
    interruptible: true,
  };
  const config = {
    ...commitment,
    hysteresisMargin01: 0.05,
    maxSwitches: 10,
    switchWindowMs: 60000,
    minRepeatCooldownMs: 1000,
  };
  const candidate = { actionId: 'PLAY', targetId: 'ball', score01: 0.8 };

  it('keeps the current action during its commitment window', () => {
    expect(canSwitch(current, 3000, commitment)).toBe(false);
    expect(canSwitch(current, 5999, commitment)).toBe(false);
    expect(canSwitch(current, 6000, commitment)).toBe(true);
    expect(canSwitch(null, 0, commitment)).toBe(true);
    expect(shouldInterrupt({ current, candidate, nowMs: 3000, config })).toBe(false);
    expect(shouldInterrupt({ current, candidate, nowMs: 6000, config })).toBe(true);
  });

  it('respects the interrupt grace and an interrupted/removed target', () => {
    const graceful = { ...commitment, interruptGraceMs: 500 };
    expect(canSwitch(current, 5499, graceful)).toBe(false);
    expect(canSwitch(current, 5500, graceful)).toBe(true);
    expect(shouldInterrupt({ current, candidate, nowMs: 3000, config, currentInvalid: true })).toBe(
      true,
    );
    const nonInterruptible = { ...current, interruptible: false };
    expect(shouldInterrupt({ current: nonInterruptible, candidate, nowMs: 3000, config })).toBe(
      false,
    );
    expect(
      shouldInterrupt({ current: nonInterruptible, candidate, nowMs: 60000, config }),
    ).toBe(true);
  });

  it('requires the candidate to beat the current score by the hysteresis margin', () => {
    const barelyBetter = { ...candidate, score01: 0.43 };
    expect(shouldInterrupt({ current, candidate: barelyBetter, nowMs: 6000, config })).toBe(false);
    expect(
      shouldInterrupt({
        current: { ...current, score01: Number.NaN },
        candidate: { ...candidate, score01: 0.06 },
        nowMs: 6000,
        config: { ...config, hysteresisMargin01: 0.05 },
      }),
    ).toBe(true);
    expect(
      shouldInterrupt({
        current,
        candidate: { actionId: 'EAT', targetId: 'bowl', score01: 0.9 },
        nowMs: 6000,
        config,
      }),
    ).toBe(false);
  });
});

describe('stabilization: hysteresis and switch budget', () => {
  it('does not oscillate between two near-equal candidates over many ticks', () => {
    const config = {
      minActionMs: 0,
      commitmentMs: 0,
      interruptGraceMs: 0,
      hysteresisMargin01: 0.15,
      maxSwitches: 2,
      switchWindowMs: 10000,
      minRepeatCooldownMs: 0,
    };
    let current: ActiveAction = {
      actionId: 'A',
      targetId: 'a',
      startedAtMs: 0,
      durationMs: 1000,
      score01: 0.5,
    };
    let history = createSwitchHistory();
    let switches = 0;
    let nowMs = 0;
    for (let step = 0; step < 40; step += 1) {
      nowMs += 1000;
      const candidateScore = step % 2 === 0 ? 0.55 : 0.45;
      const should = shouldInterrupt({
        current: { ...current, startedAtMs: nowMs - 2000 },
        candidate: { actionId: 'B', targetId: 'b', score01: candidateScore },
        nowMs,
        config,
        history,
      });
      if (should) {
        switches += 1;
        history = noteSwitch(
          history,
          { actionId: 'B', targetId: 'b', atMs: nowMs },
          { switchWindowMs: config.switchWindowMs },
        );
        current = { ...current, actionId: 'B', targetId: 'b', startedAtMs: nowMs };
      }
    }
    expect(switches).toBe(0);
    expect(
      shouldInterrupt({
        current: { ...current, score01: 0.5, startedAtMs: nowMs - 2000 },
        candidate: { actionId: 'C', targetId: 'c', score01: 0.9 },
        nowMs: nowMs + 1000,
        config,
      }),
    ).toBe(true);
  });

  it('refuses switches that exceed the sliding switch budget', () => {
    let history = createSwitchHistory();
    expect(canSwitchWithinBudget(history, 1000, { maxSwitches: 2, switchWindowMs: 10000 })).toBe(
      true,
    );
    history = noteSwitch(
      history,
      { actionId: 'A', targetId: 'a', atMs: 1000 },
      { switchWindowMs: 10000 },
    );
    history = noteSwitch(
      history,
      { actionId: 'B', targetId: 'b', atMs: 2000 },
      { switchWindowMs: 10000 },
    );
    expect(canSwitchWithinBudget(history, 3000, { maxSwitches: 2, switchWindowMs: 10000 })).toBe(
      false,
    );
    expect(canSwitchWithinBudget(history, 15000, { maxSwitches: 2, switchWindowMs: 10000 })).toBe(
      true,
    );
    expect(
      shouldInterrupt({
        current: {
          actionId: 'A',
          targetId: 'a',
          startedAtMs: 0,
          durationMs: 1000,
          score01: 0.1,
        },
        candidate: { actionId: 'C', targetId: 'c', score01: 0.9 },
        nowMs: 3000,
        config: {
          minActionMs: 0,
          commitmentMs: 0,
          interruptGraceMs: 0,
          hysteresisMargin01: 0.05,
          maxSwitches: 2,
          switchWindowMs: 10000,
          minRepeatCooldownMs: 0,
        },
        history,
      }),
    ).toBe(false);
  });

  it('suppresses repeated identical selections until the repeat cooldown elapses', () => {
    let log = createSelectionLog();
    log = noteSelection(log, 'EAT', 1000);
    expect(getLastSelectedAtMs(log, 'EAT')).toBe(1000);
    expect(isRepeatSuppressed(log, 'EAT', 1500, 1000)).toBe(true);
    expect(isRepeatSuppressed(log, 'EAT', 2000, 1000)).toBe(false);
    expect(isRepeatSuppressed(log, 'SLEEP', 1500, 1000)).toBe(false);
    expect(isRepeatSuppressed(createSelectionLog(), 'EAT', 1500, 1000)).toBe(false);
    expect(noteSelection(log, 'EAT', 2500).entries.length).toBe(2);
  });
});

describe('affordances: filtering and selection', () => {
  function affordance(
    overrides: Partial<AffordanceCandidate> & { readonly id: string },
  ): AffordanceCandidate {
    return {
      targetId: 'target',
      action: 'eat',
      available: true,
      reachable: true,
      distance: 2,
      occupied: false,
      cooldownUntilMs: 0,
      estimatedCostMs: 1000,
      ...overrides,
    };
  }

  const filterConfig = {
    nowMs: 1000,
    maxDistance: 5,
    requireReachable: true,
    allowOccupied: false,
  };

  it('rejects invalid, unavailable, unreachable, far, occupied and cooldown candidates', () => {
    const candidates = [
      affordance({ id: 'valid' }),
      affordance({ id: 'unavailable', available: false }),
      affordance({ id: 'unreachable', reachable: false }),
      affordance({ id: 'too-far', distance: 50 }),
      affordance({ id: 'occupied', occupied: true }),
      affordance({ id: 'cooldown', cooldownUntilMs: 2000 }),
      affordance({ id: 'nan-distance', distance: Number.NaN }),
    ];
    expect(filterAffordances(candidates, filterConfig).map((entry) => entry.id)).toEqual([
      'valid',
    ]);
    expect(
      filterAffordances(candidates, { ...filterConfig, allowOccupied: true }).map(
        (entry) => entry.id,
      ),
    ).toContain('occupied');
    expect(
      filterAffordances(candidates, { ...filterConfig, requireReachable: false }).map(
        (entry) => entry.id,
      ),
    ).toContain('unreachable');
    expect(filterAffordances([], filterConfig)).toEqual([]);
    expect(
      filterAffordances([affordance({ id: 'ready', cooldownUntilMs: 1000 })], filterConfig),
    ).toHaveLength(1);
  });

  it('scores distance, cost, tags and occupancy into a bounded score', () => {
    const near = affordance({ id: 'near', distance: 1, estimatedCostMs: 500, tags: ['food'] });
    const far = affordance({ id: 'far', distance: 20, estimatedCostMs: 25000 });
    const nearScore = scoreAffordance(near, { preferredTags: ['food'] });
    const farScore = scoreAffordance(far, { preferredTags: ['food'] });
    expectUnitScore(nearScore.score01);
    expectUnitScore(farScore.score01);
    expect(nearScore.score01).toBeGreaterThan(farScore.score01);
    const occupiedScore = scoreAffordance(affordance({ id: 'busy', occupied: true }));
    expectUnitScore(occupiedScore.score01);
    expect(occupiedScore.score01).toBeLessThan(scoreAffordance(affordance({ id: 'free' })).score01);
    expectUnitScore(
      scoreAffordance(affordance({ id: 'wild', distance: Number.NaN }), {
        distanceWeight: Number.NaN,
        costWeight: -5,
        maxDistance: Number.NaN,
        maxCostMs: Number.NEGATIVE_INFINITY,
        base: Number.POSITIVE_INFINITY,
        preferredTags: ['food'],
      }).score01,
    );
  });

  it('selects the best affordance and breaks score ties by stable key', () => {
    const config = {
      nowMs: 0,
      maxDistance: 20,
      requireReachable: true,
      allowOccupied: false,
      weights: { preferredTags: ['food'], tagWeight: 0.5, distanceWeight: 1, costWeight: 0 },
    };
    const near = affordance({ id: 'near', targetId: 'bowl', action: 'eat', distance: 1, tags: ['food'] });
    const far = affordance({ id: 'far', targetId: 'sofa', action: 'sleep', distance: 10 });
    expect(selectAffordance([far, near], config)?.candidate.id).toBe('near');
    expect(selectAffordance([], config)).toBeNull();
    expect(rankAffordances([far, near], config).map((entry) => entry.candidate.id)).toEqual([
      'near',
      'far',
    ]);

    const first = affordance({ id: 'a', targetId: 'same', action: 'play' });
    const second = affordance({ id: 'b', targetId: 'same', action: 'play' });
    const selected = selectAffordance([second, first], {
      nowMs: 0,
      maxDistance: 20,
      requireReachable: true,
      allowOccupied: false,
    });
    expect(selected?.candidate.id).toBe('a');
  });
});

function memoryEvent(
  id: string,
  atMs: number,
  overrides: Partial<MemoryEvent> = {},
): MemoryEvent {
  return { id, kind: 'fed', atMs, caregiverId: null, ...overrides };
}

describe('memory: bounded buffer, expiry and decay', () => {
  it('never exceeds capacity and evicts deterministically', () => {
    let state = createMemoryState(3);
    for (const [id, atMs] of [
      ['a', 100],
      ['b', 200],
      ['c', 300],
      ['d', 400],
    ] as const) {
      state = appendMemoryEvent(state, memoryEvent(id, atMs));
    }
    expect(state.events.map((event) => event.id)).toEqual(['b', 'c', 'd']);

    let shuffled = createMemoryState(3);
    for (const [id, atMs] of [
      ['d', 400],
      ['b', 200],
      ['a', 100],
      ['c', 300],
    ] as const) {
      shuffled = appendMemoryEvent(shuffled, memoryEvent(id, atMs));
    }
    expect(shuffled).toEqual(state);

    let ties = createMemoryState(2);
    ties = appendMemoryEvent(ties, memoryEvent('c', 100));
    ties = appendMemoryEvent(ties, memoryEvent('a', 100));
    ties = appendMemoryEvent(ties, memoryEvent('b', 100));
    expect(ties.events.map((event) => event.id)).toEqual(['b', 'c']);
    expect(createMemoryState().capacity).toBe(DEFAULT_MEMORY_CAPACITY);
    expect(createMemoryState(0).events).toEqual([]);
    expect(appendMemoryEvent(createMemoryState(0), memoryEvent('x', 1)).events).toEqual([]);
  });

  it('is idempotent by id and generates deterministic ids when missing', () => {
    let state = createMemoryState(4);
    state = appendMemoryEvent(state, memoryEvent('same', 100));
    state = appendMemoryEvent(state, memoryEvent('same', 200));
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.atMs).toBe(100);

    const missingId = memoryEvent('', 500);
    const first = appendMemoryEvent(state, missingId);
    const second = appendMemoryEvent(first, missingId);
    expect(first).toEqual(second);
    expect(first.events.some((event) => event.id.length > 0)).toBe(true);
  });

  it('expires events by TTL and decays old event weight', () => {
    const events = [memoryEvent('a', 0), memoryEvent('b', 500), memoryEvent('c', 1000)];
    expect(expireEvents(events, 1000, 600).map((event) => event.id)).toEqual(['b', 'c']);
    expect(expireEvents(events, 1000, Number.NaN)).toHaveLength(3);
    expect(expireEvents(events, 1000, -5).map((event) => event.id)).toEqual(['c']);
    expect(recencyWeight(0, 1000, 1000)).toBeCloseTo(0.5);
    expect(recencyWeight(0, 2000, 1000)).toBeLessThan(recencyWeight(0, 1000, 1000));
    expect(recencyWeight(1000, 1000, 1000)).toBe(1);
    expect(recencyWeight(2000, 1000, 1000)).toBe(1);
    expect(recencyWeight(0, 1000, 0)).toBe(0);
    expect(recencyWeight(Number.NaN, 1000, 1000)).toBe(0);
  });

  it('counts frequencies and weights preferences by recency/kind', () => {
    const events = [
      memoryEvent('a', 0, { kind: 'fed' }),
      memoryEvent('b', 500, { kind: 'fed' }),
      memoryEvent('c', 1000, { kind: 'fed' }),
      memoryEvent('d', 900, { kind: 'played' }),
    ];
    expect(frequencyCount(events, 'fed', 1000)).toBe(3);
    expect(frequencyCount(events, 'fed', 1000, 600)).toBe(2);
    expect(frequencyCount(events, 'played', 1000)).toBe(1);
    expect(frequencyCount(events, 'slept', 1000)).toBe(0);

    const preference = preferenceScore(
      [memoryEvent('recent', 900), memoryEvent('old', 100)],
      { nowMs: 1000, halfLifeMs: 1000 },
    );
    const oldOnly = preferenceScore([memoryEvent('old', 100)], {
      nowMs: 1000,
      halfLifeMs: 1000,
    });
    expect(preference).toBeGreaterThan(oldOnly);
    expectUnitScore(preference);
    expect(
      preferenceScore([memoryEvent('fed', 900)], {
        nowMs: 1000,
        halfLifeMs: 1000,
        kindWeights: { fed: 0 },
      }),
    ).toBe(0);
    expect(preferenceScore([], { nowMs: 1000, halfLifeMs: 1000 })).toBe(0);
  });
});

describe('memory: per-caregiver familiarity and serialization', () => {
  const config = { nowMs: 1000, halfLifeMs: 1000 } as const;
  const memories = [
    memoryEvent('m1', 900, { caregiverId: 'may', kind: 'fed' }),
    memoryEvent('m2', 800, { caregiverId: 'nang', kind: 'played' }),
    memoryEvent('m3', 100, { caregiverId: 'may', kind: 'petted' }),
  ];

  it('scores each caregiver independently without ranking owners', () => {
    const map = scorePreferenceByCaregiver(memories, ['may', 'nang'], config);
    const may = map.may ?? 0;
    const nang = map.nang ?? 0;
    expect(may).toBeGreaterThan(0);
    expect(nang).toBeGreaterThan(0);
    expectUnitScore(may);
    expectUnitScore(nang);
    expect(Object.keys(map)).toEqual(['may', 'nang']);

    const mayOnly = scorePreferenceByCaregiver(memories, ['may'], config);
    expect(mayOnly.may).toBeCloseTo(may);
    const crowded = [
      ...memories,
      ...Array.from({ length: 20 }, (_, index) =>
        memoryEvent(`extra-${index}`, 900, { caregiverId: 'may' }),
      ),
    ];
    expect(scorePreferenceByCaregiver(crowded, ['nang'], config).nang).toBeCloseTo(nang);

    const forbidden = Object.keys(memoryApi).filter((name) =>
      /rank|leaderboard|compare|sort|order/i.test(name),
    );
    expect(forbidden).toEqual([]);
  });

  it('round-trips memory exactly through plain JSON', () => {
    let state = createMemoryState(8);
    state = appendMemoryEvent(state, {
      id: 'm1',
      kind: 'fed',
      atMs: 100,
      caregiverId: 'may',
      weight: 0.8,
      tags: ['morning', 'breakfast'],
    });
    const json = serializeMemory(state);
    expect(JSON.parse(json)).toEqual({
      capacity: 8,
      events: [
        {
          id: 'm1',
          kind: 'fed',
          atMs: 100,
          caregiverId: 'may',
          weight: 0.8,
          tags: ['breakfast', 'morning'],
        },
      ],
    });
    expect(deserializeMemory(json)).toEqual(state);
    expect(deserializeMemory('{not json')).toEqual(createMemoryState());
    expect(
      deserializeMemory({
        capacity: 2,
        events: [
          { id: 'ok', kind: 'fed', atMs: 1, caregiverId: null },
          { bad: true },
          { id: 'no-kind', atMs: 2, caregiverId: null },
        ],
      }),
    ).toEqual({
      capacity: 2,
      events: [{ id: 'ok', kind: 'fed', atMs: 1, caregiverId: null }],
    });
  });

  it('registers custom kinds without breaking the built-ins', () => {
    const registry = createMemoryKindRegistry(['purred', '  fed  ', 'purred']);
    expect(registry.kinds).toContain('purred');
    expect(registry.kinds.filter((kind) => kind === 'purred')).toHaveLength(1);
    expect(isKnownMemoryKind(registry, 'fed')).toBe(true);
    expect(isKnownMemoryKind(DEFAULT_MEMORY_KIND_REGISTRY, 'purred')).toBe(false);
  });
});

describe('sandbox: determinism and injectable personality', () => {
  const glutton: SandboxConfigOverrides = {
    personality: { glutton: 0.95, playful: 0.05, lazy: 0.05, curious: 0.05 },
  };
  const playful: SandboxConfigOverrides = {
    personality: { glutton: 0.05, playful: 0.95, lazy: 0.05, curious: 0.05 },
  };

  it('reproduces the identical trace for the same seed and config', () => {
    const first = runSandbox({ seed: 42, steps: 240, stepMs: 1000, config: glutton });
    const second = runSandbox({ seed: 42, steps: 240, stepMs: 1000, config: glutton });
    expect(first).toHaveLength(240);
    expect(first).toEqual(second);
    expect(first[0]?.nowMs).toBe(0);
    expect(first[239]?.nowMs).toBe(239000);
    for (const entry of first) {
      expectUnitScore(entry.score);
      expect(['EAT', 'SLEEP', 'PLAY', 'EXPLORE']).toContain(entry.action);
    }
    expect(summarizeSandboxActions(first)).toEqual(summarizeSandboxActions(second));
  });

  it('changes the action mix when personality weights change', () => {
    const gluttonMix = summarizeSandboxActions(
      runSandbox({ seed: 42, steps: 240, stepMs: 1000, config: glutton }),
    );
    const playfulMix = summarizeSandboxActions(
      runSandbox({ seed: 42, steps: 240, stepMs: 1000, config: playful }),
    );
    expect(gluttonMix).not.toEqual(playfulMix);
    expect(gluttonMix.EAT).toBeGreaterThan(playfulMix.EAT);
    expect(playfulMix.PLAY).toBeGreaterThan(gluttonMix.PLAY);
  });

  it('is total for empty/negative/NaN inputs and respects the needs floor', () => {
    expect(runSandbox({ seed: Number.NaN, steps: -5, stepMs: Number.NaN })).toEqual([]);
    const trace = runSandbox({
      seed: Number.POSITIVE_INFINITY,
      steps: 30,
      stepMs: 1000,
      config: { personalityWeight: Number.NaN, jitter01: Number.NaN, floor: -10 },
    });
    expect(trace).toHaveLength(30);
    for (const entry of trace) expectUnitScore(entry.score);
  });
});

describe('stabilization + memory: plain JSON round-trip', () => {
  it('round-trips cooldown, switch history, selection log and memory exactly', () => {
    let memory = createMemoryState(4);
    memory = appendMemoryEvent(memory, {
      id: 'm1',
      kind: 'petted',
      atMs: 900,
      caregiverId: 'nang',
      weight: 0.9,
      tags: ['evening'],
    });
    const state = {
      cooldown: markUsed(createCooldownTracker(), 1000),
      neverUsed: createCooldownTracker(),
      history: noteSwitch(
        createSwitchHistory(),
        { actionId: 'EAT', targetId: 'bowl', atMs: 1000 },
        { switchWindowMs: 60000 },
      ),
      selection: noteSelection(createSelectionLog(), 'EAT', 1000),
      memory,
    };
    const roundTrip = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(roundTrip).toEqual(state);
    expect(JSON.stringify(roundTrip)).toBe(JSON.stringify(state));
    expect(roundTrip.neverUsed.lastUsedAtMs).toBeNull();
    expect(deserializeMemory(serializeMemory(state.memory))).toEqual(state.memory);
  });
});
