/**
 * Deterministic Pet AI sandbox for tests and tuning (V0.2.3 preparation).
 *
 * This is a FIXTURE, not production behaviour. It wires the primitives together
 * over four toy actions (`EAT`, `SLEEP`, `PLAY`, `EXPLORE`) so tests and the
 * handover can prove determinism, configurability and anti-jitter behaviour.
 *
 * - Personality and needs are injected from outside; no cat personality is
 *   hardcoded (the default personality is neutral/empty).
 * - Time is the explicit step clock (`nowMs = step * stepMs`), never `Date.now`.
 * - Randomness is a seeded `rng` (shared `mulberry32`) used only for a small
 *   score jitter; the same seed/config reproduces the identical trace.
 * - The sandbox is NOT the Pet MVP: Neon's brain owns emotion, personality and
 *   real cat behaviour.
 */

import { createRng } from '../../rng';
import {
  clamp01,
  clampRange,
  deterministicTieBreak,
  isResponseCurveName,
  needUrgency,
  safeNumber,
  scoreAction,
  type ResponseCurveName,
} from './utilityMath';
import {
  createCooldownTracker,
  createSelectionLog,
  createSwitchHistory,
  isActionFinished,
  isRepeatSuppressed,
  markUsed,
  noteSelection,
  noteSwitch,
  shouldInterrupt,
  type ActiveAction,
  type CooldownTracker,
  type SelectionLogState,
  type SwitchHistoryState,
} from './stabilization';
import {
  affordanceKey,
  filterAffordances,
  scoreAffordance,
  type AffordanceCandidate,
} from './affordances';

/** Actions available in the sandbox fixture. */
export const SANDBOX_ACTIONS = ['EAT', 'SLEEP', 'PLAY', 'EXPLORE'] as const;
export type SandboxAction = (typeof SANDBOX_ACTIONS)[number];

/** Needs tracked by the fixture (a subset of the 8 real needs). */
export const SANDBOX_NEEDS = ['hunger', 'energy', 'fun', 'stimulation'] as const;
export type SandboxNeed = (typeof SANDBOX_NEEDS)[number];

/** The seven personality traits from docs/pet/PET_DESIGN.md §3. */
export const SANDBOX_TRAITS = [
  'glutton',
  'playful',
  'clingy',
  'curious',
  'shy',
  'lazy',
  'independent',
] as const;
export type SandboxTrait = (typeof SANDBOX_TRAITS)[number];

/** Which need each fixture action satisfies. */
export const SANDBOX_ACTION_NEED: Readonly<Record<SandboxAction, SandboxNeed>> = {
  EAT: 'hunger',
  SLEEP: 'energy',
  PLAY: 'fun',
  EXPLORE: 'stimulation',
};

/** Which personality trait biases each fixture action. */
export const SANDBOX_ACTION_TRAIT: Readonly<Record<SandboxAction, SandboxTrait>> = {
  EAT: 'glutton',
  SLEEP: 'lazy',
  PLAY: 'playful',
  EXPLORE: 'curious',
};

/** One need's fixture dynamics. */
export interface SandboxNeedRule {
  /** Starting satisfaction, `0..100`. */
  readonly initial: number;
  /** Satisfaction lost per second. */
  readonly decayPerSecond: number;
  /** Satisfaction gained per second while the matching action runs. */
  readonly gainPerSecond: number;
}

/** One fixture affordance. */
export interface SandboxAffordanceSpec {
  readonly targetId: string;
  readonly distance: number;
  readonly available?: boolean;
  readonly reachable?: boolean;
  readonly occupied?: boolean;
  readonly cooldownUntilMs?: number;
  readonly tags?: readonly string[];
}

/** Stabilization knobs for the sandbox. */
export interface SandboxStabilizationConfig {
  readonly minActionMs: number;
  readonly commitmentMs: number;
  readonly interruptGraceMs: number;
  readonly hysteresisMargin01: number;
  readonly maxSwitches: number;
  readonly switchWindowMs: number;
  readonly minRepeatCooldownMs: number;
  /** Per-action cooldown applied after an execution finishes. */
  readonly cooldowns: Readonly<Partial<Record<SandboxAction, number>>>;
}

/** Fully resolved sandbox config. */
export interface SandboxConfig {
  readonly needs: Readonly<Record<SandboxNeed, SandboxNeedRule>>;
  readonly personality: Readonly<Partial<Record<SandboxTrait, number>>>;
  readonly needCurves: Readonly<Record<SandboxNeed, ResponseCurveName>>;
  readonly needWeights: Readonly<Record<SandboxNeed, number>>;
  /** Score weight of the personality component (default 0.6). */
  readonly personalityWeight: number;
  /** Score weight of the need-urgency component (default 1). */
  readonly needUrgencyWeight: number;
  /** Score weight of the affordance component (default 0.35). */
  readonly affordabilityWeight: number;
  /** Satisfaction at/above which a need has zero urgency. */
  readonly targetSatisfaction: number;
  /** Satisfaction at/below which a need has full urgency. */
  readonly criticalSatisfaction: number;
  /** Need floor (PET_DESIGN non-punitive floor is 25). */
  readonly floor: number;
  /** Seeded score jitter amplitude; 0 disables it. */
  readonly jitter01: number;
  /** How long one action execution lasts. */
  readonly actionDurationMs: number;
  readonly stabilization: SandboxStabilizationConfig;
  readonly affordances: Readonly<Record<SandboxAction, SandboxAffordanceSpec>>;
}

/** Partial overrides accepted by `runSandbox` / `createSandboxConfig`. */
export interface SandboxConfigOverrides {
  readonly needs?: Readonly<Partial<Record<SandboxNeed, Partial<SandboxNeedRule>>>>;
  readonly personality?: Readonly<Partial<Record<SandboxTrait, number>>>;
  readonly needCurves?: Readonly<Partial<Record<SandboxNeed, ResponseCurveName>>>;
  readonly needWeights?: Readonly<Partial<Record<SandboxNeed, number>>>;
  readonly personalityWeight?: number;
  readonly needUrgencyWeight?: number;
  readonly affordabilityWeight?: number;
  readonly targetSatisfaction?: number;
  readonly criticalSatisfaction?: number;
  readonly floor?: number;
  readonly jitter01?: number;
  readonly actionDurationMs?: number;
  readonly stabilization?: Partial<SandboxStabilizationConfig>;
  readonly affordances?: Readonly<Partial<Record<SandboxAction, Partial<SandboxAffordanceSpec>>>>;
}

const DEFAULT_NEEDS: Record<SandboxNeed, SandboxNeedRule> = {
  hunger: { initial: 80, decayPerSecond: 1.1, gainPerSecond: 16 },
  energy: { initial: 80, decayPerSecond: 0.9, gainPerSecond: 14 },
  fun: { initial: 80, decayPerSecond: 0.8, gainPerSecond: 15 },
  stimulation: { initial: 80, decayPerSecond: 0.7, gainPerSecond: 15 },
};

const DEFAULT_NEED_CURVES: Record<SandboxNeed, ResponseCurveName> = {
  hunger: 'power',
  energy: 'smoothstep',
  fun: 'smoothstep',
  stimulation: 'linear',
};

const DEFAULT_NEED_WEIGHTS: Record<SandboxNeed, number> = {
  hunger: 1,
  energy: 1,
  fun: 1,
  stimulation: 1,
};

const DEFAULT_AFFORDANCES: Record<SandboxAction, SandboxAffordanceSpec> = {
  EAT: { targetId: 'food_bowl', distance: 2, tags: ['food'] },
  SLEEP: { targetId: 'sofa', distance: 4, tags: ['rest'] },
  PLAY: { targetId: 'toy_ball', distance: 3, tags: ['play'] },
  EXPLORE: { targetId: 'window', distance: 6, tags: ['explore'] },
};

const DEFAULT_COOLDOWNS: Record<SandboxAction, number> = {
  EAT: 5000,
  SLEEP: 7000,
  PLAY: 5000,
  EXPLORE: 6000,
};

const DEFAULT_STABILIZATION: SandboxStabilizationConfig = {
  minActionMs: 2500,
  commitmentMs: 5000,
  interruptGraceMs: 250,
  hysteresisMargin01: 0.05,
  maxSwitches: 90,
  switchWindowMs: 60000,
  minRepeatCooldownMs: 2000,
  cooldowns: DEFAULT_COOLDOWNS,
};

/** Neutral default score weights (not a cat personality). */
const DEFAULT_PERSONALITY_WEIGHT = 0.6;
const DEFAULT_NEED_URGENCY_WEIGHT = 1;
const DEFAULT_AFFORDABILITY_WEIGHT = 0.35;

/** Hard cap on simulated steps to keep tests and callers bounded. */
export const MAX_SANDBOX_STEPS = 10000;

function nonNegative(value: number | undefined, fallback: number): number {
  const resolved = value === undefined ? fallback : value;
  if (!Number.isFinite(resolved) || resolved < 0) return fallback;
  return resolved;
}

function satisfaction(value: number | undefined, fallback: number): number {
  return clampRange(safeNumber(value ?? fallback, fallback), 0, 100);
}

/**
 * Resolves overrides into a full config. Every value is sanitized, so callers
 * can pass partial/NaN data from a tuning UI without crashing the sandbox.
 */
export function createSandboxConfig(overrides: SandboxConfigOverrides = {}): SandboxConfig {
  const needs = {} as Record<SandboxNeed, SandboxNeedRule>;
  for (const need of SANDBOX_NEEDS) {
    const base = DEFAULT_NEEDS[need];
    const patch = overrides.needs?.[need];
    needs[need] = {
      initial: satisfaction(patch?.initial, base.initial),
      decayPerSecond: nonNegative(patch?.decayPerSecond, base.decayPerSecond),
      gainPerSecond: nonNegative(patch?.gainPerSecond, base.gainPerSecond),
    };
  }

  const personality: Partial<Record<SandboxTrait, number>> = {};
  for (const trait of SANDBOX_TRAITS) {
    const value = overrides.personality?.[trait];
    if (value !== undefined) personality[trait] = clamp01(safeNumber(value, 0));
  }

  const needCurves: Record<SandboxNeed, ResponseCurveName> = { ...DEFAULT_NEED_CURVES };
  for (const need of SANDBOX_NEEDS) {
    const curve = overrides.needCurves?.[need];
    if (isResponseCurveName(curve)) needCurves[need] = curve;
  }

  const needWeights = {} as Record<SandboxNeed, number>;
  for (const need of SANDBOX_NEEDS) {
    needWeights[need] = nonNegative(overrides.needWeights?.[need], DEFAULT_NEED_WEIGHTS[need]);
  }

  const cooldowns: Partial<Record<SandboxAction, number>> = {};
  for (const action of SANDBOX_ACTIONS) {
    cooldowns[action] = nonNegative(
      overrides.stabilization?.cooldowns?.[action],
      DEFAULT_COOLDOWNS[action],
    );
  }

  const stabilization: SandboxStabilizationConfig = {
    minActionMs: nonNegative(overrides.stabilization?.minActionMs, DEFAULT_STABILIZATION.minActionMs),
    commitmentMs: nonNegative(
      overrides.stabilization?.commitmentMs,
      DEFAULT_STABILIZATION.commitmentMs,
    ),
    interruptGraceMs: nonNegative(
      overrides.stabilization?.interruptGraceMs,
      DEFAULT_STABILIZATION.interruptGraceMs,
    ),
    hysteresisMargin01: clamp01(
      safeNumber(
        overrides.stabilization?.hysteresisMargin01 ?? DEFAULT_STABILIZATION.hysteresisMargin01,
        DEFAULT_STABILIZATION.hysteresisMargin01,
      ),
    ),
    maxSwitches: nonNegative(overrides.stabilization?.maxSwitches, DEFAULT_STABILIZATION.maxSwitches),
    switchWindowMs: nonNegative(
      overrides.stabilization?.switchWindowMs,
      DEFAULT_STABILIZATION.switchWindowMs,
    ),
    minRepeatCooldownMs: nonNegative(
      overrides.stabilization?.minRepeatCooldownMs,
      DEFAULT_STABILIZATION.minRepeatCooldownMs,
    ),
    cooldowns,
  };

  const affordances = {} as Record<SandboxAction, SandboxAffordanceSpec>;
  for (const action of SANDBOX_ACTIONS) {
    const base = DEFAULT_AFFORDANCES[action];
    const patch = overrides.affordances?.[action];
    affordances[action] = {
      targetId: typeof patch?.targetId === 'string' ? patch.targetId : base.targetId,
      distance: nonNegative(patch?.distance, base.distance),
      available: patch?.available ?? base.available,
      reachable: patch?.reachable ?? base.reachable,
      occupied: patch?.occupied ?? base.occupied,
      cooldownUntilMs: nonNegative(patch?.cooldownUntilMs, 0),
      tags: patch?.tags ?? base.tags,
    };
  }

  return {
    needs,
    personality,
    needCurves,
    needWeights,
    personalityWeight: nonNegative(overrides.personalityWeight, DEFAULT_PERSONALITY_WEIGHT),
    needUrgencyWeight: nonNegative(overrides.needUrgencyWeight, DEFAULT_NEED_URGENCY_WEIGHT),
    affordabilityWeight: nonNegative(overrides.affordabilityWeight, DEFAULT_AFFORDABILITY_WEIGHT),
    targetSatisfaction: satisfaction(overrides.targetSatisfaction, 85),
    criticalSatisfaction: satisfaction(overrides.criticalSatisfaction, 25),
    floor: satisfaction(overrides.floor, 25),
    jitter01: clamp01(safeNumber(overrides.jitter01 ?? 0.015, 0.015)),
    actionDurationMs: nonNegative(overrides.actionDurationMs, 5000),
    stabilization,
    affordances,
  };
}

/** One selection in the trace. */
export interface SandboxTraceEntry {
  readonly nowMs: number;
  readonly action: SandboxAction;
  readonly score: number;
  readonly switched: boolean;
}

/** Input for `runSandbox`. */
export interface SandboxRunInput {
  readonly seed: number;
  readonly steps: number;
  readonly stepMs: number;
  readonly config?: SandboxConfigOverrides;
}

interface SandboxScoredAction {
  readonly action: SandboxAction;
  readonly targetId: string;
  readonly score01: number;
  readonly key: string;
}

function isSandboxAction(value: string): value is SandboxAction {
  return (SANDBOX_ACTIONS as readonly string[]).includes(value);
}

function sanitizeSteps(steps: number): number {
  if (!Number.isFinite(steps)) return 0;
  return Math.min(MAX_SANDBOX_STEPS, Math.max(0, Math.floor(steps)));
}

function sanitizeStepMs(stepMs: number): number {
  if (!Number.isFinite(stepMs) || stepMs <= 0) return 1000;
  return Math.min(60000, Math.max(1, Math.floor(stepMs)));
}

function sanitizeSeed(seed: number): number {
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
}

function buildCandidates(
  cooldowns: Readonly<Record<SandboxAction, CooldownTracker>>,
  config: SandboxConfig,
): Record<SandboxAction, AffordanceCandidate> {
  const result = {} as Record<SandboxAction, AffordanceCandidate>;
  for (const action of SANDBOX_ACTIONS) {
    const spec = config.affordances[action];
    const cooldownMs = config.stabilization.cooldowns[action] ?? 0;
    const tracker = cooldowns[action];
    const trackerCooldownUntilMs =
      tracker.lastUsedAtMs === null ? 0 : tracker.lastUsedAtMs + cooldownMs;
    result[action] = {
      id: `sandbox:${action}`,
      targetId: spec.targetId,
      action,
      available: spec.available !== false,
      reachable: spec.reachable !== false,
      distance: safeNumber(spec.distance, 0),
      occupied: spec.occupied === true,
      cooldownUntilMs: Math.max(spec.cooldownUntilMs ?? 0, trackerCooldownUntilMs),
      estimatedCostMs: 0,
      ...(spec.tags !== undefined ? { tags: spec.tags } : {}),
    };
  }
  return result;
}

/**
 * Runs the fixture for `steps` ticks.
 *
 * Each tick: decay needs -> filter affordances -> score actions (urgency +
 * personality + affordance) -> apply commitment/hysteresis/switch budget ->
 * maybe stay -> record trace. `switched` is true when the selected action id
 * changed (also true on the very first tick).
 */
export function runSandbox(input: SandboxRunInput): SandboxTraceEntry[] {
  const config = createSandboxConfig(input.config);
  const steps = sanitizeSteps(input.steps);
  const stepMs = sanitizeStepMs(input.stepMs);
  const stepSeconds = stepMs / 1000;
  const rng = createRng(sanitizeSeed(input.seed));

  const needs = {} as Record<SandboxNeed, number>;
  for (const need of SANDBOX_NEEDS) needs[need] = config.needs[need].initial;

  const cooldowns = {} as Record<SandboxAction, CooldownTracker>;
  for (const action of SANDBOX_ACTIONS) cooldowns[action] = createCooldownTracker();

  let selectionLog: SelectionLogState = createSelectionLog();
  let switchHistory: SwitchHistoryState = createSwitchHistory();
  let current: ActiveAction | null = null;
  const trace: SandboxTraceEntry[] = [];

  for (let step = 0; step < steps; step += 1) {
    const nowMs = step * stepMs;
    // Explicit assertion breaks a TypeScript loop-back inference cycle between
    // `current` and the chosen action (otherwise it narrows to `never`).
    const previous: ActiveAction | null = current as ActiveAction | null;
    const previousActionId: string | null = previous?.actionId ?? null;
    const previousRunning = previous !== null && !isActionFinished(previous, nowMs);

    // 1. Needs decay (bounded by the non-punitive floor and 100).
    for (const need of SANDBOX_NEEDS) {
      needs[need] = clampRange(
        needs[need] - config.needs[need].decayPerSecond * stepSeconds,
        config.floor,
        100,
      );
    }

    // 2. Filter affordances (unavailable/unreachable/occupied/cooldown).
    const candidates = buildCandidates(cooldowns, config);
    const eligible = filterAffordances(
      SANDBOX_ACTIONS.map((action) => candidates[action]),
      {
        nowMs,
        maxDistance: 24,
        requireReachable: true,
        allowOccupied: false,
      },
    );
    const eligibleActions = new Set(eligible.map((candidate) => candidate.action));

    // 3. Score each eligible action. One jitter draw per action keeps the RNG
    //    stream stable even if filtering changes which actions are eligible.
    const scored: SandboxScoredAction[] = [];
    for (const action of SANDBOX_ACTIONS) {
      const jitter = (rng.next() * 2 - 1) * config.jitter01;
      if (!eligibleActions.has(action)) continue;
      const candidate = candidates[action];
      const need = SANDBOX_ACTION_NEED[action];
      const trait = SANDBOX_ACTION_TRAIT[action];
      const urgency = needUrgency({
        value: needs[need],
        target: config.targetSatisfaction,
        criticalThreshold: config.criticalSatisfaction,
        curve: config.needCurves[need],
      });
      const affordance = scoreAffordance(candidate, {
        distanceWeight: 1,
        costWeight: 0.15,
        tagWeight: 0,
        occupancyWeight: 1,
        maxDistance: 24,
        maxCostMs: 30000,
      });
      const actionScore = scoreAction([
        {
          key: `urgency:${need}`,
          value01: urgency,
          weight: config.needWeights[need] * config.needUrgencyWeight,
        },
        {
          key: `personality:${trait}`,
          value01: config.personality[trait] ?? 0,
          weight: config.personalityWeight,
        },
        {
          key: `affordance:${action}`,
          value01: affordance.score01,
          weight: config.affordabilityWeight,
        },
      ]);
      scored.push({
        action,
        targetId: candidate.targetId,
        score01: clamp01(actionScore.score01 + jitter),
        key: affordanceKey(candidate),
      });
    }

    // 4. Stabilized choice.
    const ranked = deterministicTieBreak(scored, (entry) => entry.key);
    const best = ranked[0] ?? null;
    const currentEntry =
      previousActionId === null
        ? null
        : (scored.find((entry) => entry.action === previousActionId) ?? null);
    let chosen: SandboxScoredAction | null = best;

    if (previous !== null && previousActionId !== null) {
      const currentScore = currentEntry?.score01 ?? safeNumber(previous.score01 ?? 0, 0);
      const keepCurrent: SandboxScoredAction = currentEntry ?? {
        action: isSandboxAction(previousActionId) ? previousActionId : 'EXPLORE',
        targetId: previous.targetId ?? '',
        score01: currentScore,
        key: `${previousActionId}|synthetic`,
      };

      if (currentEntry === null && !previousRunning) {
        // The current action finished AND cannot be selected again (affordance
        // gone or on cooldown). Forcing a fresh choice avoids locking onto a
        // stale score forever.
        chosen = best;
      } else if (chosen === null) {
        chosen = keepCurrent;
      } else if (chosen.action === previousActionId) {
        chosen = currentEntry ?? chosen;
      } else if (
        !shouldInterrupt({
          current: { ...previous, score01: currentScore },
          candidate: {
            actionId: chosen.action,
            targetId: chosen.targetId,
            score01: chosen.score01,
          },
          nowMs,
          config: config.stabilization,
          history: switchHistory,
        })
      ) {
        chosen = keepCurrent;
      } else if (
        isRepeatSuppressed(
          selectionLog,
          chosen.action,
          nowMs,
          config.stabilization.minRepeatCooldownMs,
        )
      ) {
        chosen = keepCurrent;
      }
    }

    if (chosen === null) {
      // No eligible/scored action at all: deterministic safe fallback. No need
      // is applied, so an unavailable affordance never grants free satisfaction.
      const fallback: SandboxAction =
        previousActionId !== null && isSandboxAction(previousActionId)
          ? previousActionId
          : 'EXPLORE';
      const changed = previousActionId === null || previousActionId !== fallback;
      current = {
        actionId: fallback,
        targetId: config.affordances[fallback].targetId,
        startedAtMs: nowMs,
        durationMs: config.actionDurationMs,
        score01: 0,
        interruptible: true,
      };
      trace.push({ nowMs, action: fallback, score: 0, switched: changed });
      continue;
    }

    const actionChanged = previousActionId === null || previousActionId !== chosen.action;
    const restarted = !actionChanged && !previousRunning;
    const startedAtMs = actionChanged || restarted ? nowMs : (previous?.startedAtMs ?? nowMs);

    if (actionChanged && previousActionId !== null) {
      switchHistory = noteSwitch(
        switchHistory,
        { actionId: chosen.action, targetId: chosen.targetId, atMs: nowMs },
        { switchWindowMs: config.stabilization.switchWindowMs, capacity: 128 },
      );
    }
    if (actionChanged || restarted) {
      selectionLog = noteSelection(selectionLog, chosen.action, nowMs, { capacity: 64 });
      cooldowns[chosen.action] = markUsed(
        cooldowns[chosen.action],
        nowMs + config.actionDurationMs,
      );
    }

    // 5. Apply the action's effect for this tick.
    const performing = actionChanged || restarted || previousRunning;
    if (performing) {
      const need = SANDBOX_ACTION_NEED[chosen.action];
      needs[need] = clampRange(
        needs[need] + config.needs[need].gainPerSecond * stepSeconds,
        config.floor,
        100,
      );
    }

    current = {
      actionId: chosen.action,
      targetId: chosen.targetId,
      startedAtMs,
      durationMs: config.actionDurationMs,
      score01: chosen.score01,
      interruptible: true,
    };
    trace.push({
      nowMs,
      action: chosen.action,
      score: clamp01(chosen.score01),
      switched: actionChanged,
    });
  }

  return trace;
}

/** Counts how many ticks each action was selected (proof hook for tests). */
export function summarizeSandboxActions(
  trace: readonly SandboxTraceEntry[],
): Record<SandboxAction, number> {
  const counts: Record<SandboxAction, number> = { EAT: 0, SLEEP: 0, PLAY: 0, EXPLORE: 0 };
  for (const entry of trace) counts[entry.action] += 1;
  return counts;
}
