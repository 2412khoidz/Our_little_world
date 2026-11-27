/**
 * Timing + minigame tuning vendored from Tidefall `FISHING` in Constants.js — MIT.
 * Source: github.com/stateloop-connected/source-tidefall-phaser
 */
export const TIDEFALL_WAIT_MS_MIN = 2000;
export const TIDEFALL_WAIT_MS_MAX = 8000;
export const TIDEFALL_CAST_MS = 420;
export const TIDEFALL_BITE_MS = 6000;
export const TIDEFALL_MINIGAME_MS = 6000;

/** Phaser passes delta in ms; decay is 0.00008 per ms → 0.08 per second at 60fps. */
export const TIDEFALL_MINIGAME_DECAY_PER_SEC = 0.08;
export const TIDEFALL_MINIGAME_HIT = 0.18;
export const TIDEFALL_MINIGAME_MISS = 0.12;
export const TIDEFALL_POINTER_SPEED = 1.35;