export type CatVocalContext = 'greeting' | 'happy' | 'hungry_food' | 'ambient';
export type CatVocalClipId = 'meow_soft' | 'meow_happy' | 'meow_food' | 'meow_short' | 'meow_chirp';

export interface CatVocalPick {
  readonly clip: CatVocalClipId;
  readonly playbackRate: number;
  readonly volumeScale: number;
}

const CONTEXT_POOLS: Readonly<Record<CatVocalContext, readonly CatVocalClipId[]>> = {
  greeting: ['meow_soft', 'meow_short', 'meow_chirp'],
  happy: ['meow_happy', 'meow_chirp', 'meow_soft'],
  hungry_food: ['meow_food', 'meow_short', 'meow_happy'],
  ambient: ['meow_soft', 'meow_chirp', 'meow_short'],
};

/**
 * Selects varied, non-repeating natural cat vocalizations with pitch & volume
 * variation and randomized cooldown windows to avoid mechanical loops.
 */
export class CatVocalizationScheduler {
  private lastClip: CatVocalClipId | null = null;
  private nextAllowedAtMs = 0;
  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  pick(
    context: CatVocalContext,
    nowMs: number,
    options?: { isSleeping?: boolean; force?: boolean },
  ): CatVocalPick | null {
    if (options?.isSleeping) return null;
    if (!options?.force && nowMs < this.nextAllowedAtMs) return null;

    const pool = CONTEXT_POOLS[context];
    const candidates =
      pool.length > 1 && this.lastClip
        ? pool.filter((c) => c !== this.lastClip)
        : pool;
    const idx = Math.min(candidates.length - 1, Math.floor(this.rng() * candidates.length));
    const clip = candidates[idx] ?? pool[0]!;
    this.lastClip = clip;

    const r1 = this.rng();
    const r2 = this.rng();
    const r3 = this.rng();
    const playbackRate = Number((0.91 + r1 * 0.2).toFixed(3));
    const volumeScale = Number((0.78 + r2 * 0.22).toFixed(3));
    const cooldownMs =
      context === 'ambient'
        ? Math.round(9500 + r3 * 8500)
        : Math.round(2100 + r3 * 1400);
    this.nextAllowedAtMs = nowMs + cooldownMs;

    return { clip, playbackRate, volumeScale };
  }
}
