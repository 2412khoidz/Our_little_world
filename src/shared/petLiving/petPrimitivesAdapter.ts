/**
 * [PRE-INTEGRATION ADAPTER FIXTURE]
 * Defines the contract documented in docs/pet/PET_AI_PRIMITIVES_HANDOVER.md.
 * Replace this local deterministic adapter with imports from DeepSeek's
 * src/shared/petAdvanced/primitives at the Integration Milestone without modifying callers.
 */

export type ResponseCurveName = 'linear' | 'power' | 'smoothstep' | 'inverseSmoothstep' | 'logistic';

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

export interface PetMemoryEvent {
  id: string;
  kind: 'fed' | 'played' | 'petted' | 'ignored' | 'slept' | 'explored';
  atMs: number;
  caregiverId: string;
  weight?: number;
  tags?: string[];
}

export interface AffordanceCandidate {
  id: string;
  targetId: string;
  action: string;
  available: boolean;
  reachable: boolean;
  distance: number;
  occupied: boolean;
  cooldownUntilMs: number;
  estimatedCostMs: number;
  tags?: string[];
  x: number;
  y: number;
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function applyResponseCurve(t: number, curve: ResponseCurveName): number {
  const x = clamp01(t);
  switch (curve) {
    case 'power':
      return x * x;
    case 'smoothstep':
      return x * x * (3 - 2 * x);
    case 'inverseSmoothstep':
      return clamp01(x + (x - x * x * (3 - 2 * x)));
    case 'logistic': {
      const e = Math.exp(-8 * (x - 0.5));
      return clamp01(1 / (1 + e));
    }
    default:
      return x;
  }
}

export function computeNeedUrgency(p: NeedUrgencyParams): number {
  if (!Number.isFinite(p.value)) return 0;
  if (p.value >= p.target) return 0;
  const span = Math.max(1, p.target - p.criticalThreshold);
  const raw = clamp01((p.target - p.value) / span);
  return clamp01(applyResponseCurve(raw, p.curve) * p.weight);
}

export function combineUtilityScore(items: readonly UtilityContribution[]): number {
  const valid = items.filter((i) => Number.isFinite(i.weight) && i.weight > 0);
  if (valid.length === 0) return 0;
  const totalW = valid.reduce((s, i) => s + i.weight, 0);
  const weighted = valid.reduce((s, i) => s + clamp01(i.value01) * i.weight, 0);
  return clamp01(weighted / totalW);
}

export function deterministicCandidateBreak<T>(
  list: readonly T[],
  scoreOf: (item: T) => number,
  keyOf: (item: T) => string,
): T[] {
  return [...list].sort((a, b) => scoreOf(b) - scoreOf(a) || keyOf(a).localeCompare(keyOf(b)));
}

export const PET_MEMORY_PERSIST_CAP = 24;

export function appendBoundedMemory(
  events: readonly PetMemoryEvent[],
  next: PetMemoryEvent,
  capacity = PET_MEMORY_PERSIST_CAP,
): PetMemoryEvent[] {
  if (events.some((e) => e.id === next.id)) return [...events];
  const merged = [...events, next].sort(
    (a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id),
  );
  if (merged.length <= capacity) return merged;
  return merged.slice(merged.length - capacity);
}

/**
 * Per-caregiver familiarity without any cross-caregiver ranking helper.
 */
export function computeCaregiverFamiliarity(
  events: readonly PetMemoryEvent[],
  caregiverIds: readonly string[],
  nowMs: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  const halfLifeMs = 48 * 3600 * 1000;
  for (const cid of caregiverIds) {
    const mine = events.filter((e) => e.caregiverId === cid);
    const total = mine.reduce((sum, e) => {
      const age = Math.max(0, nowMs - e.atMs);
      const decay = Math.pow(0.5, age / halfLifeMs);
      const kindBonus = e.kind === 'ignored' ? -0.2 : (e.weight ?? 1);
      return sum + Math.max(0, kindBonus * decay);
    }, 0);
    out[cid] = clamp01(total / 8);
  }
  return out;
}

export function filterValidAffordances(
  candidates: readonly AffordanceCandidate[],
  nowMs: number,
  maxDistance = 420,
): AffordanceCandidate[] {
  return candidates.filter(
    (c) =>
      c.available &&
      c.reachable &&
      !c.occupied &&
      Number.isFinite(c.distance) &&
      c.distance <= maxDistance &&
      nowMs >= c.cooldownUntilMs,
  );
}
