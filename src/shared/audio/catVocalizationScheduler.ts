export type CatVocalContext = 'greeting' | 'happy' | 'hungry_food' | 'ambient';
export type CatVocalClipId =
  | 'meow_soft'
  | 'meow_happy'
  | 'meow_food'
  | 'meow_short'
  | 'meow_chirp'
  | 'meow_kitten_cute'
  | 'meow_kitten_double'
  | 'meow_attention';

export interface CatVocalPick {
  readonly clip: CatVocalClipId;
  readonly playbackRate: number;
  readonly volumeScale: number;
}

const CONTEXT_POOLS: Readonly<Record<CatVocalContext, readonly CatVocalClipId[]>> = {
  greeting: ['meow_kitten_cute', 'meow_soft', 'meow_kitten_double', 'meow_short'],
  happy: ['meow_happy', 'meow_kitten_double', 'meow_kitten_cute', 'meow_chirp'],
  hungry_food: ['meow_food', 'meow_attention', 'meow_kitten_double', 'meow_short'],
  ambient: ['meow_soft', 'meow_kitten_cute', 'meow_happy', 'meow_chirp', 'meow_short'],
};

/**
 * Selects varied, non-repeating real cat vocalizations with tight, natural playback rate
 * and occasional contextual cooldown windows so the cat never loops mechanically.
 */
export class CatVocalizationScheduler {
  private readonly recentClips: CatVocalClipId[] = [];
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
    const recentSet = new Set(this.recentClips.slice(-Math.min(3, pool.length - 1)));
    const fresh = pool.filter((c) => !recentSet.has(c));
    const candidates = fresh.length > 0 ? fresh : pool.filter((c) => c !== this.recentClips[this.recentClips.length - 1]);
    const pickFrom = candidates.length > 0 ? candidates : pool;
    const idx = Math.min(pickFrom.length - 1, Math.floor(this.rng() * pickFrom.length));
    const clip = pickFrom[idx] ?? pool[0]!;
    this.recentClips.push(clip);
    if (this.recentClips.length > 6) this.recentClips.shift();

    const r1 = this.rng();
    const r2 = this.rng();
    const r3 = this.rng();
    // Preserve natural vocal timbre — avoid excessive pitch warping
    const playbackRate = Number((0.97 + r1 * 0.06).toFixed(3));
    const volumeScale = Number((0.88 + r2 * 0.12).toFixed(3));
    const cooldownMs =
      context === 'ambient'
        ? Math.round(14000 + r3 * 12000)
        : Math.round(2400 + r3 * 1400);
    this.nextAllowedAtMs = nowMs + cooldownMs;

    return { clip, playbackRate, volumeScale };
  }
}
