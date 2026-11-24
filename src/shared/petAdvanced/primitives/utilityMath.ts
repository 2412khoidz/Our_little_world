/**
 * Utility-math primitives for the Pet AI (V0.2.3 preparation).
 *
 * These are deliberately small, pure building blocks. They do NOT define cat
 * personality, emotion or behaviour; Neon's Pet MVP composes them.
 *
 * Rules:
 * - Pure TypeScript: no React, Phaser, DOM, Supabase, timers, `Date.now()` or
 *   `Math.random()`. Time is always an explicit `nowMs` argument.
 * - Invalid data is sanitized instead of throwing: NaN, +/-Infinity, negative
 *   weights and empty component lists all produce a finite result in `[0, 1]`.
 *   There is no typed error in this module set because no input is treated as a
 *   programming error; type errors are caught by TypeScript at build time.
 *
 * Clean-room: the urgency/personality scoring idea is inspired by public
 * utility-AI descriptions only (see docs/research/REUSE_MATRIX.md, rows
 * "Pet Utility AI & Anti-Sleep-Loop" -> class C). No third-party code ported.
 */

/** Curves a caller can select by name from JSON/config data. */
export type ResponseCurveName =
  | 'linear'
  | 'power'
  | 'smoothstep'
  | 'inverseSmoothstep'
  | 'logistic';

/** Every response-curve name, in stable order. */
export const RESPONSE_CURVE_NAMES: readonly ResponseCurveName[] = [
  'linear',
  'power',
  'smoothstep',
  'inverseSmoothstep',
  'logistic',
];

/** Optional per-curve parameters. Irrelevant options are ignored by a curve. */
export interface ResponseCurveOptions {
  /** Power curve exponent; must be finite and > 0. Defaults to 2. */
  readonly exponent?: number;
  /** Logistic steepness; must be finite and > 0. Defaults to 8. */
  readonly steepness?: number;
  /** Logistic midpoint in `[0, 1]`. Defaults to 0.5. */
  readonly midpoint?: number;
}

/** A response curve maps a normalized input to a normalized output. */
export type ResponseCurve = (value01: number, options?: ResponseCurveOptions) => number;

/** Minimal one-argument curve shape accepted by `needUrgency`. */
export type ResponseCurveFn = (value01: number) => number;

/** Default exponent for `powerResponse` (mirrors the `(1 - need/100)^2` idea). */
export const DEFAULT_POWER_EXPONENT = 2;
/** Default steepness for `logisticResponse`. */
export const DEFAULT_LOGISTIC_STEEPNESS = 8;
/** Default midpoint for `logisticResponse`. */
export const DEFAULT_LOGISTIC_MIDPOINT = 0.5;

/**
 * Returns `fallback` when `value` is not finite. The fallback itself is
 * sanitized to `0` when it is not finite, so the result is always finite.
 */
export function safeNumber(value: number, fallback: number): number {
  if (Number.isFinite(value)) return value;
  return Number.isFinite(fallback) ? fallback : 0;
}

/** Clamps to `[0, 1]`; NaN and -Infinity map to 0, +Infinity maps to 1. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Clamps a value to a range. Non-finite bounds are treated as unbounded. A
 * non-finite value is pulled to the nearest finite bound (or `0` when both
 * bounds are unbounded), so the output is finite for non-finite input.
 */
export function clampRange(value: number, min: number, max: number): number {
  const lowBound = Number.isFinite(min) ? min : Number.NEGATIVE_INFINITY;
  const highBound = Number.isFinite(max) ? max : Number.POSITIVE_INFINITY;
  const lower = Math.min(lowBound, highBound);
  const upper = Math.max(lowBound, highBound);
  if (Number.isFinite(value)) {
    return Math.min(Math.max(value, lower), upper);
  }
  if (value === Number.POSITIVE_INFINITY) {
    return Number.isFinite(upper) ? upper : 0;
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return Number.isFinite(lower) ? lower : 0;
  }
  // NaN: pick the lower bound when finite, otherwise the upper bound / 0.
  if (Number.isFinite(lower)) return lower;
  if (Number.isFinite(upper)) return upper;
  return 0;
}

/**
 * Normalizes `value` into `[0, 1]` across `[min, max]`. Degenerate or
 * non-finite ranges return 0; NaN returns 0 and infinities saturate.
 */
export function normalize01(value: number, min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  if (Number.isNaN(value)) return 0;
  if (value === Number.NEGATIVE_INFINITY) return 0;
  if (value === Number.POSITIVE_INFINITY) return 1;
  return clamp01((clampRange(value, min, max) - min) / (max - min));
}

/** Identity curve; `0` stays `0`, `1` stays `1`. */
export function linearResponse(value: number): number {
  return clamp01(value);
}

/** `value^exponent`, clamped. Invalid exponents fall back to 2. */
export function powerResponse(
  value: number,
  exponent: number = DEFAULT_POWER_EXPONENT,
): number {
  const safeExponent =
    Number.isFinite(exponent) && exponent > 0 ? exponent : DEFAULT_POWER_EXPONENT;
  return clamp01(Math.pow(clamp01(value), safeExponent));
}

/** Smoothstep (`3t^2 - 2t^3`): gentle at both ends. */
export function smoothstepResponse(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/**
 * Mirrored smoothstep (`1 - smoothstep(1 - value)`): slow start, fast middle,
 * soft finish. This is the "inverse" shape used to delay urgency until a need
 * is clearly low, not the mathematical inverse function.
 */
export function inverseSmoothstepResponse(value: number): number {
  const t = clamp01(value);
  const mirrored = 1 - t;
  return 1 - mirrored * mirrored * (3 - 2 * mirrored);
}

/** Logistic CDF with saturation guards (no overflow for extreme steepness). */
function logisticRaw(x: number): number {
  if (x >= 60) return 1;
  if (x <= -60) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Logistic S-curve normalized so `f(0) = 0` and `f(1) = 1`. A degenerate
 * (fully saturated) curve falls back to a step at the midpoint.
 */
export function logisticResponse(
  value: number,
  steepness: number = DEFAULT_LOGISTIC_STEEPNESS,
  midpoint: number = DEFAULT_LOGISTIC_MIDPOINT,
): number {
  const v = clamp01(value);
  const k = Number.isFinite(steepness) && steepness > 0 ? steepness : DEFAULT_LOGISTIC_STEEPNESS;
  const m = clamp01(midpoint);
  const atZero = logisticRaw(-k * m);
  const atOne = logisticRaw(k * (1 - m));
  const span = atOne - atZero;
  if (span <= 1e-9) {
    if (v < m) return 0;
    if (v > m) return 1;
    return 0.5;
  }
  return clamp01((logisticRaw(k * (v - m)) - atZero) / span);
}

/**
 * Name-keyed registry so a brain can pick a curve from configuration data
 * (for example `{ "curve": "smoothstep" }` read from JSON).
 */
export const RESPONSE_CURVES: Readonly<Record<ResponseCurveName, ResponseCurve>> = {
  linear: (value) => linearResponse(value),
  power: (value, options) => powerResponse(value, options?.exponent ?? DEFAULT_POWER_EXPONENT),
  smoothstep: (value) => smoothstepResponse(value),
  inverseSmoothstep: (value) => inverseSmoothstepResponse(value),
  logistic: (value, options) =>
    logisticResponse(
      value,
      options?.steepness ?? DEFAULT_LOGISTIC_STEEPNESS,
      options?.midpoint ?? DEFAULT_LOGISTIC_MIDPOINT,
    ),
};

/** True when `value` is one of the built-in curve names. */
export function isResponseCurveName(value: unknown): value is ResponseCurveName {
  return typeof value === 'string' && (RESPONSE_CURVE_NAMES as readonly string[]).includes(value);
}

/** Resolves a curve name from config data; unknown/missing names use `linear`. */
export function getResponseCurve(name?: string | null): ResponseCurve {
  if (isResponseCurveName(name)) {
    return RESPONSE_CURVES[name];
  }
  return RESPONSE_CURVES.linear;
}

/** Input for `needUrgency`. */
export interface NeedUrgencyInput {
  /** Need satisfaction value, normally `0..100`; lower means worse. */
  readonly value: number;
  /** Satisfaction level at or above which urgency is 0 (normally ~80). */
  readonly target: number;
  /** Satisfaction level at or below which urgency is maximal (normally ~25). */
  readonly criticalThreshold: number;
  /** Curve function or registry name. Defaults to `linear`. */
  readonly curve?: ResponseCurveFn | ResponseCurveName;
  /** Multiplier in `[0, 1]` (for example personality or need importance). */
  readonly weight?: number;
}

/**
 * Urgency of one need: 0 when satisfied at/above `target`, rising to `weight`
 * as satisfaction falls to `criticalThreshold`. Always finite and `[0, 1]`.
 *
 * Degenerate config (`target <= criticalThreshold`) becomes a step function.
 * NaN / +Infinity readings are treated as "satisfied" (no urgency) so a broken
 * sensor never spams actions; -Infinity is treated as critical.
 */
export function needUrgency(input: NeedUrgencyInput): number {
  const target = safeNumber(input.target, 100);
  const critical = safeNumber(input.criticalThreshold, 0);
  const weight = clamp01(safeNumber(input.weight ?? 1, 1));

  let value: number;
  if (Number.isNaN(input.value) || input.value === Number.POSITIVE_INFINITY) {
    value = target;
  } else if (input.value === Number.NEGATIVE_INFINITY) {
    value = critical;
  } else {
    value = input.value;
  }

  const curve =
    typeof input.curve === 'function' ? input.curve : getResponseCurve(input.curve);

  const span = target - critical;
  if (span <= 0) {
    return clamp01((value <= critical ? 1 : 0) * weight);
  }

  const deficit01 = normalize01(target - value, 0, span);
  return clamp01(curve(deficit01) * weight);
}

/** One weighted component of an action score. */
export interface ScoreComponent {
  readonly key: string;
  readonly value01: number;
  readonly weight: number;
}

/** Per-component explanation produced by `scoreAction`. */
export interface ScoreBreakdownEntry {
  readonly key: string;
  readonly value01: number;
  readonly weight: number;
  /** Share of the total weight; `1/n` for the all-zero-weight fallback. */
  readonly normalizedWeight01: number;
  /** `normalizedWeight01 * value01`. */
  readonly contribution: number;
}

/** Result of `scoreAction`: final score plus an explainable breakdown. */
export interface ActionScore {
  readonly score01: number;
  readonly totalWeight: number;
  readonly breakdown: readonly ScoreBreakdownEntry[];
}

function sanitizeWeight(weight: number): number {
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

function buildActionScore(components: readonly ScoreComponent[]): ActionScore {
  const prepared = components.map((component) => ({
    key: component.key,
    value01: clamp01(component.value01),
    weight: sanitizeWeight(component.weight),
  }));
  const totalWeight = prepared.reduce((sum, component) => sum + component.weight, 0);
  const uniform = totalWeight <= 0;
  const count = prepared.length;
  const breakdown = prepared.map((component) => {
    const normalizedWeight01 = uniform ? (count > 0 ? 1 / count : 0) : component.weight / totalWeight;
    return {
      key: component.key,
      value01: component.value01,
      weight: component.weight,
      normalizedWeight01,
      contribution: normalizedWeight01 * component.value01,
    };
  });
  const score01 = clamp01(breakdown.reduce((sum, entry) => sum + entry.contribution, 0));
  return { score01, totalWeight, breakdown };
}

/**
 * Weighted mean of components, each clamped to `[0, 1]`.
 * - Empty list -> `0`.
 * - Zero/negative/NaN weights are ignored.
 * - If every weight is non-positive the values are averaged uniformly, which
 *   keeps the result deterministic and avoids a divide-by-zero.
 */
export function weightedScore(components: readonly ScoreComponent[]): number {
  return buildActionScore(components).score01;
}

/** Same aggregation as `weightedScore`, but also returns the breakdown. */
export function scoreAction(components: readonly ScoreComponent[]): ActionScore {
  return buildActionScore(components);
}

/** One urgency input for `urgencyScore`. */
export interface UrgencyContribution {
  readonly key: string;
  readonly urgency01: number;
  readonly weight: number;
}

/** How multiple need urgencies are combined. */
export type UrgencyAggregation = 'weighted_mean' | 'saturating_sum' | 'max';

/**
 * Aggregates several need urgencies into one `[0, 1]` value.
 * - `weighted_mean`: average urgency (default; no runaway from many needs).
 * - `saturating_sum`: `1 - product(1 - w_i * u_i)` (several bad needs add up).
 * - `max`: the single most urgent need.
 */
export function urgencyScore(
  contributions: readonly UrgencyContribution[],
  mode: UrgencyAggregation = 'weighted_mean',
): number {
  if (contributions.length === 0) return 0;

  if (mode === 'max') {
    let best = 0;
    for (const contribution of contributions) {
      best = Math.max(best, clamp01(sanitizeWeight(contribution.weight)) * clamp01(contribution.urgency01));
    }
    return clamp01(best);
  }

  if (mode === 'saturating_sum') {
    let remaining = 1;
    for (const contribution of contributions) {
      remaining *= 1 - clamp01(sanitizeWeight(contribution.weight)) * clamp01(contribution.urgency01);
    }
    return clamp01(1 - remaining);
  }

  return weightedScore(
    contributions.map((contribution) => ({
      key: contribution.key,
      value01: contribution.urgency01,
      weight: contribution.weight,
    })),
  );
}

/** Minimal shape needed to rank a candidate. */
export interface TieBreakCandidate {
  readonly score01: number;
}

/** Extracts a stable string key from a candidate (never object identity). */
export type StableKeyExtractor<T> = (candidate: T) => string;

const DEFAULT_KEY_FIELDS = ['key', 'id', 'actionId', 'targetId', 'action'] as const;

function defaultStableKey(candidate: TieBreakCandidate): string {
  const record = candidate as unknown as Record<string, unknown>;
  for (const field of DEFAULT_KEY_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

/**
 * Orders candidates by descending score (higher is better), then ascending
 * stable string key. Pass `keyFn` unless your candidates expose `key`, `id`,
 * `actionId`, `targetId` or `action`.
 *
 * Never compares object identity. Candidates with identical score AND key are
 * indistinguishable under this contract, so their relative order is not
 * meaningful (JavaScript's stable sort keeps input order for that case).
 */
export function compareByScoreThenKey<T extends TieBreakCandidate>(
  a: T,
  b: T,
  keyFn?: StableKeyExtractor<T>,
): number {
  const aScore = clamp01(a.score01);
  const bScore = clamp01(b.score01);
  if (aScore !== bScore) return bScore - aScore;
  const extract = keyFn ?? defaultStableKey;
  const aKey = extract(a);
  const bKey = extract(b);
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

/** Returns a new array sorted by score then stable key; input is not mutated. */
export function deterministicTieBreak<T extends TieBreakCandidate>(
  candidates: readonly T[],
  keyFn?: StableKeyExtractor<T>,
): T[] {
  return [...candidates].sort((a, b) => compareByScoreThenKey(a, b, keyFn));
}
