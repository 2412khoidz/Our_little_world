/**
 * Affordance filtering / scoring primitives for the Pet AI (V0.2.3 preparation).
 *
 * An affordance is a world object contract (bowl, sofa, window, toy) expressed
 * as pure data. This module only reasons about the numbers supplied by the Pet
 * MVP: it does NO pathfinding, no map access, no tile lookups and no occupancy
 * bookkeeping. The caller (ActionValidator + BFS) is responsible for filling
 * `available`, `reachable`, `distance`, `occupied` and `cooldownUntilMs`.
 *
 * Pure TypeScript, deterministic ordering, no throwing on invalid data.
 */

import { clamp01, deterministicTieBreak, safeNumber } from './utilityMath';

/** One candidate interaction supplied by the world observation. */
export interface AffordanceCandidate {
  readonly id: string;
  readonly targetId: string;
  readonly action: string;
  readonly available: boolean;
  readonly reachable: boolean;
  readonly distance: number;
  readonly occupied: boolean;
  /** Absolute timestamp until which the action is locked; 0 means ready. */
  readonly cooldownUntilMs: number;
  readonly estimatedCostMs: number;
  readonly tags?: readonly string[];
  readonly context?: Readonly<Record<string, number>>;
}

/** Filter configuration (all required so callers state intent explicitly). */
export interface AffordanceFilterConfig {
  readonly nowMs: number;
  /** Maximum path distance; non-finite means "no distance limit". */
  readonly maxDistance: number;
  readonly requireReachable: boolean;
  readonly allowOccupied: boolean;
}

function isUsableCandidate(candidate: AffordanceCandidate): boolean {
  if (typeof candidate !== 'object' || candidate === null) return false;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return false;
  if (typeof candidate.targetId !== 'string') return false;
  if (typeof candidate.action !== 'string' || candidate.action.length === 0) return false;
  return true;
}

/**
 * Rejects candidates that are unavailable, unreachable (when required), too far,
 * occupied (when not allowed) or still on cooldown.
 *
 * Invalid distance (`NaN`/Infinity) is rejected because it cannot be scored.
 * A broken `nowMs` skips cooldown checks (fails open) instead of freezing.
 */
export function filterAffordances(
  candidates: readonly AffordanceCandidate[],
  config: AffordanceFilterConfig,
): AffordanceCandidate[] {
  const maxDistance = Number.isFinite(config.maxDistance)
    ? Math.max(0, config.maxDistance)
    : Number.POSITIVE_INFINITY;
  const result: AffordanceCandidate[] = [];

  for (const candidate of candidates) {
    if (!isUsableCandidate(candidate)) continue;
    if (candidate.available !== true) continue;
    if (config.requireReachable && candidate.reachable !== true) continue;
    if (!Number.isFinite(candidate.distance)) continue;
    if (maxDistance !== Number.POSITIVE_INFINITY && candidate.distance > maxDistance) continue;
    if (candidate.occupied === true && config.allowOccupied !== true) continue;
    if (
      Number.isFinite(config.nowMs) &&
      Number.isFinite(candidate.cooldownUntilMs) &&
      candidate.cooldownUntilMs > config.nowMs
    ) {
      continue;
    }
    result.push(candidate);
  }

  return result;
}

/** Configurable weights for `scoreAffordance`. All values are optional. */
export interface AffordanceScoringWeights {
  /** Flat bonus added before clamping (default 0). */
  readonly base?: number;
  /** Weight of the inverse-distance score (default 1). */
  readonly distanceWeight?: number;
  /** Weight of the inverse-cost score (default 0.25). */
  readonly costWeight?: number;
  /** Weight of the preferred-tag match score (default 0.15). */
  readonly tagWeight?: number;
  /** Penalty subtracted when occupied (default 0.4). */
  readonly occupancyWeight?: number;
  /** Distance treated as "as far as it gets" (default 24 world units). */
  readonly maxDistance?: number;
  /** Cost treated as "as slow as it gets" (default 30000 ms). */
  readonly maxCostMs?: number;
  /** Tags that earn a bonus; empty/omitted means no tag bonus. */
  readonly preferredTags?: readonly string[];
}

/** Default weights, matching the docs' inverse-distance + cost + tag idea. */
export const DEFAULT_AFFORDANCE_WEIGHTS: Required<
  Omit<AffordanceScoringWeights, 'preferredTags'>
> & { readonly preferredTags: readonly string[] } = {
  base: 0,
  distanceWeight: 1,
  costWeight: 0.25,
  tagWeight: 0.15,
  occupancyWeight: 0.4,
  maxDistance: 24,
  maxCostMs: 30000,
  preferredTags: [],
};

/** One component of an affordance score, for debugging. */
export interface AffordanceScoreComponent {
  readonly key: string;
  readonly value01: number;
  readonly weight: number;
  /** Negative for penalties (occupancy). */
  readonly contribution: number;
}

/** A scored candidate plus its explanation. */
export interface ScoredAffordance {
  readonly candidate: AffordanceCandidate;
  readonly score01: number;
  readonly breakdown: readonly AffordanceScoreComponent[];
}

function nonNegativeWeight(value: number | undefined, fallback: number): number {
  const resolved = value === undefined ? fallback : value;
  if (!Number.isFinite(resolved) || resolved <= 0) return 0;
  return resolved;
}

function positiveOr(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function normalizedTags(tags: readonly string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const normalized = tag.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  result.sort();
  return result;
}

/**
 * Scores one candidate in `[0, 1]`.
 *
 * `base + distanceWeight * inverseDistance + costWeight * inverseCost
 *  + tagWeight * tagMatch - occupancyWeight * occupied`
 *
 * The weighted parts are absolute addends, then the result is clamped once, so
 * weights above 1 simply saturate. Negative/non-finite weights are treated as 0.
 */
export function scoreAffordance(
  candidate: AffordanceCandidate,
  weights: AffordanceScoringWeights = {},
): ScoredAffordance {
  const base = clamp01(safeNumber(weights.base ?? DEFAULT_AFFORDANCE_WEIGHTS.base, 0));
  const distanceWeight = nonNegativeWeight(
    weights.distanceWeight,
    DEFAULT_AFFORDANCE_WEIGHTS.distanceWeight,
  );
  const costWeight = nonNegativeWeight(weights.costWeight, DEFAULT_AFFORDANCE_WEIGHTS.costWeight);
  const tagWeight = nonNegativeWeight(weights.tagWeight, DEFAULT_AFFORDANCE_WEIGHTS.tagWeight);
  const occupancyWeight = nonNegativeWeight(
    weights.occupancyWeight,
    DEFAULT_AFFORDANCE_WEIGHTS.occupancyWeight,
  );
  const maxDistance = positiveOr(weights.maxDistance, DEFAULT_AFFORDANCE_WEIGHTS.maxDistance);
  const maxCostMs = positiveOr(weights.maxCostMs, DEFAULT_AFFORDANCE_WEIGHTS.maxCostMs);
  const preferredTags = normalizedTags(weights.preferredTags);

  const distance = Number.isFinite(candidate.distance) ? Math.max(0, candidate.distance) : maxDistance;
  const inverseDistance01 = 1 - clamp01(distance / maxDistance);
  const cost = Number.isFinite(candidate.estimatedCostMs)
    ? Math.max(0, candidate.estimatedCostMs)
    : maxCostMs;
  const inverseCost01 = 1 - clamp01(cost / maxCostMs);

  const candidateTags = new Set(normalizedTags(candidate.tags));
  const matchedTags = preferredTags.filter((tag) => candidateTags.has(tag)).length;
  const tagMatch01 = preferredTags.length > 0 ? matchedTags / preferredTags.length : 0;
  const occupancyPenalty01 = candidate.occupied === true ? 1 : 0;

  const breakdown: AffordanceScoreComponent[] = [
    {
      key: 'distance',
      value01: inverseDistance01,
      weight: distanceWeight,
      contribution: distanceWeight * inverseDistance01,
    },
    {
      key: 'cost',
      value01: inverseCost01,
      weight: costWeight,
      contribution: costWeight * inverseCost01,
    },
    {
      key: 'tags',
      value01: tagMatch01,
      weight: tagWeight,
      contribution: tagWeight * tagMatch01,
    },
    {
      key: 'occupancy',
      value01: occupancyPenalty01,
      weight: occupancyWeight,
      contribution: -occupancyWeight * occupancyPenalty01,
    },
  ];

  const preClamp = breakdown.reduce((sum, component) => sum + component.contribution, base);
  return { candidate, score01: clamp01(preClamp), breakdown };
}

/** Stable string key used for deterministic ordering (never object identity). */
export function affordanceKey(candidate: AffordanceCandidate): string {
  return `${candidate.action}|${candidate.targetId}|${candidate.id}`;
}

/** Selection configuration: filter + weights + optional tie-break key. */
export interface AffordanceSelectionConfig extends AffordanceFilterConfig {
  readonly weights?: AffordanceScoringWeights;
  readonly keyFn?: (candidate: AffordanceCandidate) => string;
}

/** Ranked affordances, best first. */
export function rankAffordances(
  candidates: readonly AffordanceCandidate[],
  config: AffordanceSelectionConfig,
): ScoredAffordance[] {
  const eligible = filterAffordances(candidates, config);
  const keyFn = config.keyFn;
  const scored = eligible.map((candidate) => scoreAffordance(candidate, config.weights));
  return deterministicTieBreak(scored, (entry) =>
    keyFn !== undefined ? keyFn(entry.candidate) : affordanceKey(entry.candidate),
  );
}

/**
 * Best candidate by score, ties broken by stable key; `null` when nothing is
 * eligible. No pathfinding: `distance` is trusted as supplied.
 */
export function selectAffordance(
  candidates: readonly AffordanceCandidate[],
  config: AffordanceSelectionConfig,
): ScoredAffordance | null {
  const ranked = rankAffordances(candidates, config);
  const best = ranked[0];
  return best ?? null;
}
