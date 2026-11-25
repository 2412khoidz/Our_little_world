/**
 * Meadowbrook pond catch resolution (server-side roll + mini-game score gate).
 * Vendored from `shared/src/features/nature.ts` @ c420bc2 — daily caps removed for OLW.
 *
 * SPDX-License-Identifier: MIT — Copyright (c) 2026 Shiz0id
 */
import {
  CRITTER_LIST,
  RARITY_WEIGHT,
  critterAvailable,
  type CritterDef,
  type NatureKind,
} from './content/meadowbrookNatureCritters';

export const MEADOWBROOK_MIN_CATCH_SCORE = 25;

export interface MeadowbrookCatchInput {
  readonly kind: NatureKind;
  readonly score: number;
  readonly hour: number;
  readonly nowMs: number;
  readonly rng01: () => number;
}

export type MeadowbrookCatchPreviewInput = Omit<MeadowbrookCatchInput, 'score'>;

export interface MeadowbrookCatchResult {
  readonly escaped: boolean;
  readonly critterId: string;
  readonly critterName: string;
  readonly sizeCm: number;
}

function cleanHour(hour: number): number {
  const h = Math.floor(Number(hour));
  return Number.isFinite(h) ? ((h % 24) + 24) % 24 : 12;
}

function cleanScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}

function availableCritters(kind: NatureKind, hour: number, nowMs: number): CritterDef[] {
  const eventOn = () => false;
  return CRITTER_LIST.filter((c) => c.kind === kind && critterAvailable(c, nowMs, hour, eventOn));
}

function rollCritter(
  kind: NatureKind,
  previewScore: number,
  hour: number,
  nowMs: number,
  rand: () => number,
): CritterDef {
  const pool = availableCritters(kind, hour, nowMs);
  const weights = pool.map(
    (c) => (RARITY_WEIGHT[c.rarity] ?? 0) * (1 + (previewScore / 100) * (c.rarity - 1) * 0.5),
  );
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

export function previewMeadowbrookCatch(input: MeadowbrookCatchPreviewInput): CritterDef {
  const hour = cleanHour(input.hour);
  return rollCritter(input.kind, 70, hour, input.nowMs, input.rng01);
}

export function resolveMeadowbrookCatch(input: MeadowbrookCatchInput): MeadowbrookCatchResult {
  const hour = cleanHour(input.hour);
  const score = cleanScore(input.score);
  const def = rollCritter(input.kind, 70, hour, input.nowMs, input.rng01);
  const escapeChance =
    score < MEADOWBROOK_MIN_CATCH_SCORE ? 1 : Math.max(0, (def.rarity - 1) * 0.1 - (score - 60) / 200);
  if (input.rng01() < escapeChance) {
    return { escaped: true, critterId: def.id, critterName: def.name, sizeCm: 0 };
  }
  const size = Math.max(
    1,
    Math.round(def.size * (0.7 + 0.6 * input.rng01()) * (0.9 + score / 500)),
  );
  return { escaped: false, critterId: def.id, critterName: def.name, sizeCm: size };
}

/** Map Meadowbrook fish ids → OLW economy SKUs (partial; unknown → carp_pond). */
export const MEADOWBROOK_FISH_TO_OLW_SKU: Record<string, string> = {
  carp: 'carp_pond',
  koi: 'koi_pastel',
  minnow: 'bait_free_worm',
  bluegill: 'carp_pond',
  catfish: 'carp_pond',
  bass: 'lotus_trout',
  salmon: 'lotus_trout',
};