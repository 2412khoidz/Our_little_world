/**
 * Bridge from Neon Living Pet layer → DeepSeek `petAdvanced/primitives`.
 * Replaces the former PRE-INTEGRATION ADAPTER FIXTURE (same public API for callers).
 */

import {
  filterAffordances,
  type AffordanceCandidate as PrimitiveAffordance,
} from '../petAdvanced/primitives/affordances';
import {
  appendMemoryEvent,
  createMemoryState,
  deserializeMemory,
  scorePreferenceByCaregiver,
  serializeMemory,
  type MemoryEvent,
  type MemoryState,
} from '../petAdvanced/primitives/memory';
import {
  clamp01,
  deterministicTieBreak,
  needUrgency,
  scoreAction,
  type ResponseCurveName,
} from '../petAdvanced/primitives/utilityMath';

export type { ResponseCurveName };

export interface NeedUrgencyParams {
  value: number;
  target: number;
  criticalThreshold: number;
  curve: ResponseCurveName;
  weight: number;
}

export interface UtilityContribution {
  key: string;
  value01: number;
  weight: number;
}

/** Neon event shape (caregiver required in lab; primitives allow null). */
export type PetMemoryEvent = MemoryEvent;

/** Lab/world affordance: primitive fields + anchor position for movement intent. */
export interface AffordanceCandidate extends PrimitiveAffordance {
  x: number;
  y: number;
}

export const PET_MEMORY_PERSIST_CAP = 24;

export { clamp01 };

export function computeNeedUrgency(p: NeedUrgencyParams): number {
  return needUrgency({
    value: p.value,
    target: p.target,
    criticalThreshold: p.criticalThreshold,
    curve: p.curve,
    weight: p.weight,
  });
}

export function combineUtilityScore(items: readonly UtilityContribution[]): number {
  return scoreAction(
    items.map((i) => ({ key: i.key, value01: i.value01, weight: i.weight })),
  ).score01;
}

export function deterministicCandidateBreak<T>(
  list: readonly T[],
  scoreOf: (item: T) => number,
  keyOf: (item: T) => string,
): T[] {
  const decorated = list.map((item) => ({
    item,
    score01: scoreOf(item),
    key: keyOf(item),
  }));
  return deterministicTieBreak(decorated, (entry) => entry.key).map((entry) => entry.item);
}

export function appendBoundedMemory(
  events: readonly PetMemoryEvent[],
  next: PetMemoryEvent,
  capacity = PET_MEMORY_PERSIST_CAP,
): PetMemoryEvent[] {
  let state = createMemoryState(capacity);
  for (const event of events) {
    state = appendMemoryEvent(state, event);
  }
  state = appendMemoryEvent(state, next);
  return [...state.events];
}

/**
 * Per-caregiver familiarity without cross-caregiver ranking (DeepSeek contract).
 */
export function computeCaregiverFamiliarity(
  events: readonly PetMemoryEvent[],
  caregiverIds: readonly string[],
  nowMs: number,
): Record<string, number> {
  const map = scorePreferenceByCaregiver(events, caregiverIds, {
    nowMs,
    halfLifeMs: 48 * 3600 * 1000,
    kindWeights: {
      fed: 1,
      played: 0.9,
      petted: 1,
      ignored: 0.3,
      slept: 0.5,
      explored: 0.7,
    },
  });
  const out: Record<string, number> = {};
  for (const id of caregiverIds) {
    out[id] = map[id] ?? 0;
  }
  return out;
}

export function filterValidAffordances(
  candidates: readonly AffordanceCandidate[],
  nowMs: number,
  maxDistance = 420,
): AffordanceCandidate[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const stripped: PrimitiveAffordance[] = candidates.map(
    ({ x: _x, y: _y, ...rest }) => rest,
  );
  const filtered = filterAffordances(stripped, {
    nowMs,
    maxDistance,
    requireReachable: true,
    allowOccupied: false,
  });
  return filtered.map((c) => {
    const full = byId.get(c.id);
    return {
      ...c,
      x: full?.x ?? 0,
      y: full?.y ?? 0,
    };
  });
}

export {
  createMemoryState,
  serializeMemory,
  deserializeMemory,
  type MemoryState,
};