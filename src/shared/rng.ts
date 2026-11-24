/**
 * Deterministic RNG helpers for Our Little World domain logic.
 *
 * Rules (see docs/IMPLEMENTATION_BACKLOG.md OLW-020-04 and REUSE_MATRIX.md):
 * - Every function that needs randomness receives an explicit seed or `Rng`.
 * - Pure TypeScript: no DOM, React, Phaser or Supabase imports.
 * - `Math.random()` must never be called inside domain logic.
 *
 * Algorithm: `mulberry32` is a well-known public-domain 32-bit PRNG. This file is
 * an original implementation written for this project from the algorithm
 * description (clean-room), so no third-party notice is required.
 */

/** A deterministic random source returning a float in `[0, 1)`. */
export type Rng = () => number;

/** FNV-1a 32-bit hash. Stable across runs, platforms and Node/browser. */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG. Produces `2^32` distinct states and a uniform `[0, 1)` stream. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return function nextRandom(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalizes any integer-ish number to a uint32 seed. */
export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new TypeError(`Seed must be a finite number, received: ${String(seed)}`);
  }
  return Math.trunc(seed) >>> 0;
}

/**
 * Derives a sub-seed from a base seed plus labels. Used to keep independent
 * channels (weather, quality rolls, breeding, fishing bites) reproducible even
 * when the order of consumption changes.
 */
export function deriveSeed(baseSeed: number, ...parts: readonly (string | number)[]): number {
  const merged = parts.map((part) => String(part)).join('|');
  return (normalizeSeed(baseSeed) ^ hashSeed(merged)) >>> 0;
}

export interface WeightedOption<T> {
  readonly value: T;
  readonly weight: number;
}

/**
 * Small ergonomic wrapper around a raw `Rng` used by gameplay modules.
 * All helpers are deterministic for a given seed and call sequence.
 */
export interface RngStream {
  /** Raw float in `[0, 1)`; advances the stream. */
  next(): number;
  /** Integer in `[minInclusive, maxExclusive)`. */
  int(minInclusive: number, maxExclusive: number): number;
  /** True with probability `chance` (clamped to `[0, 1]`). */
  chance(chance: number): boolean;
  /** Uniform element. Throws on an empty list. */
  pick<T>(values: readonly T[]): T;
  /** Weighted element. Zero/negative weights are ignored. Throws if total weight <= 0. */
  weighted<T>(options: readonly WeightedOption<T>[]): T;
  /** Deterministic shuffle (Fisher–Yates) returning a new array. */
  shuffle<T>(values: readonly T[]): T[];
  /** Reads current internal counter (number of draws). Useful for test assertions. */
  readonly draws: number;
}

/** Creates a `RngStream` from a raw seed. */
export function createRng(seed: number | string): RngStream {
  const numericSeed = typeof seed === 'string' ? hashSeed(seed) : normalizeSeed(seed);
  const next = mulberry32(numericSeed);
  let draws = 0;

  const stream: RngStream = {
    get draws() {
      return draws;
    },
    next(): number {
      draws += 1;
      return next();
    },
    int(minInclusive: number, maxExclusive: number): number {
      if (!Number.isFinite(minInclusive) || !Number.isFinite(maxExclusive)) {
        throw new TypeError('RngStream.int requires finite bounds');
      }
      const min = Math.ceil(minInclusive);
      const max = Math.floor(maxExclusive);
      if (max <= min) {
        throw new RangeError(`RngStream.int requires max > min, received [${min}, ${max})`);
      }
      draws += 1;
      return min + Math.floor(next() * (max - min));
    },
    chance(chance: number): boolean {
      const clamped = Number.isFinite(chance) ? Math.min(1, Math.max(0, chance)) : 0;
      draws += 1;
      return next() < clamped;
    },
    pick<T>(values: readonly T[]): T {
      if (values.length === 0) {
        throw new RangeError('RngStream.pick requires a non-empty list');
      }
      const index = stream.int(0, values.length);
      return values[index] as T;
    },
    weighted<T>(options: readonly WeightedOption<T>[]): T {
      const usable = options.filter((option) => option.weight > 0);
      const total = usable.reduce((sum, option) => sum + option.weight, 0);
      if (usable.length === 0 || total <= 0) {
        throw new RangeError('RngStream.weighted requires at least one positive weight');
      }
      draws += 1;
      let remaining = next() * total;
      for (const option of usable) {
        remaining -= option.weight;
        if (remaining < 0) {
          return option.value;
        }
      }
      return (usable[usable.length - 1] as WeightedOption<T>).value;
    },
    shuffle<T>(values: readonly T[]): T[] {
      const copy = [...values];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = stream.int(0, index + 1);
        const current = copy[index] as T;
        copy[index] = copy[swapIndex] as T;
        copy[swapIndex] = current;
      }
      return copy;
    },
  };

  return stream;
}
