/**
 * Pond fishing loop adapted from Tidefall FishingSystem state flow — MIT.
 * Pure TS (no Phaser): cast → wait → bite → bar minigame → landed | escaped.
 */
import {
  TIDEFALL_BITE_MS,
  TIDEFALL_CAST_MS,
  TIDEFALL_MINIGAME_DECAY_PER_SEC,
  TIDEFALL_MINIGAME_HIT,
  TIDEFALL_MINIGAME_MISS,
  TIDEFALL_MINIGAME_MS,
  TIDEFALL_POINTER_SPEED,
  TIDEFALL_WAIT_MS_MAX,
  TIDEFALL_WAIT_MS_MIN,
} from './tidefallFishingConstants';

export type TidefallFishPersonality = 'TIMID' | 'NORMAL' | 'AGGRESSIVE' | 'LEGENDARY';

export type TidefallFishingPhase =
  | 'idle'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'minigame'
  | 'landed'
  | 'escaped';

export interface TidefallFishingState {
  readonly phase: TidefallFishingPhase;
  readonly elapsedMs: number;
  readonly waitTotalMs: number;
  readonly biteRemainingMs: number;
  readonly minigameRemainingMs: number;
  readonly progress: number;
  readonly pointerNorm: number;
  readonly pointerDir: number;
  readonly pointerSpeed: number;
  readonly targetCenter: number;
  readonly targetWidth: number;
  readonly bobberDip: number;
  readonly personality: TidefallFishPersonality;
  readonly hookFlash: boolean;
}

export interface TidefallFishingConfig {
  readonly waitMs: number;
  readonly targetWidth: number;
  readonly pointerSpeed: number;
  readonly personality: TidefallFishPersonality;
}

const personalityDecay: Record<TidefallFishPersonality, number> = {
  TIMID: 0.92,
  NORMAL: 1,
  AGGRESSIVE: 1.08,
  LEGENDARY: 1.15,
};

export function pickWaitMs(rng01: () => number): number {
  const t = rng01();
  return Math.floor(TIDEFALL_WAIT_MS_MIN + t * (TIDEFALL_WAIT_MS_MAX - TIDEFALL_WAIT_MS_MIN));
}

export function pickPersonality(rng01: () => number): TidefallFishPersonality {
  const r = rng01();
  if (r < 0.12) return 'AGGRESSIVE';
  if (r < 0.28) return 'TIMID';
  if (r < 0.04) return 'LEGENDARY';
  return 'NORMAL';
}

export function createTidefallFishingIdle(): TidefallFishingState {
  return {
    phase: 'idle',
    elapsedMs: 0,
    waitTotalMs: TIDEFALL_WAIT_MS_MIN,
    biteRemainingMs: TIDEFALL_BITE_MS,
    minigameRemainingMs: TIDEFALL_MINIGAME_MS,
    progress: 0.5,
    pointerNorm: 0.12,
    pointerDir: 1,
    pointerSpeed: TIDEFALL_POINTER_SPEED,
    targetCenter: 0.5,
    targetWidth: 0.32,
    bobberDip: 0,
    personality: 'NORMAL',
    hookFlash: false,
  };
}

export function beginTidefallCast(state: TidefallFishingState, config: TidefallFishingConfig): TidefallFishingState {
  if (state.phase !== 'idle' && state.phase !== 'landed' && state.phase !== 'escaped') return state;
  return {
    ...createTidefallFishingIdle(),
    phase: 'casting',
    waitTotalMs: config.waitMs,
    targetWidth: config.targetWidth,
    pointerSpeed: config.pointerSpeed,
    personality: config.personality,
    targetCenter: 0.48 + (config.personality === 'AGGRESSIVE' ? 0.06 : 0),
  };
}

function withPhase(state: TidefallFishingState, phase: TidefallFishingPhase, patch: Partial<TidefallFishingState> = {}): TidefallFishingState {
  return { ...state, phase, ...patch };
}

export function tickTidefallFishing(state: TidefallFishingState, dtSec: number): TidefallFishingState {
  const dtMs = dtSec * 1000;
  const speed = state.pointerSpeed;
  const decay = TIDEFALL_MINIGAME_DECAY_PER_SEC * (personalityDecay[state.personality] ?? 1);

  switch (state.phase) {
    case 'casting': {
      const elapsedMs = state.elapsedMs + dtMs;
      if (elapsedMs >= TIDEFALL_CAST_MS) {
        return withPhase(state, 'waiting', { elapsedMs: 0, bobberDip: 0 });
      }
      return { ...state, elapsedMs, bobberDip: Math.sin((elapsedMs / TIDEFALL_CAST_MS) * Math.PI) * 0.15 };
    }
    case 'waiting': {
      const elapsedMs = state.elapsedMs + dtMs;
      if (elapsedMs >= state.waitTotalMs) {
        return withPhase(state, 'bite', { elapsedMs: 0, biteRemainingMs: TIDEFALL_BITE_MS, bobberDip: 0.35, hookFlash: true });
      }
      const bobberDip = 0.04 + Math.sin(elapsedMs * 0.004) * 0.03;
      return { ...state, elapsedMs, bobberDip };
    }
    case 'bite': {
      const biteRemainingMs = state.biteRemainingMs - dtMs;
      const bobberDip = 0.28 + Math.sin(state.elapsedMs * 0.012) * 0.08;
      const elapsedMs = state.elapsedMs + dtMs;
      if (biteRemainingMs <= 0) {
        return withPhase(state, 'escaped', { biteRemainingMs: 0, elapsedMs, bobberDip: 0, hookFlash: false });
      }
      return { ...state, biteRemainingMs, bobberDip, elapsedMs, hookFlash: biteRemainingMs % 800 < 120 };
    }
    case 'minigame': {
      let pointerNorm = state.pointerNorm + state.pointerDir * speed * dtSec * 0.55;
      let pointerDir = state.pointerDir;
      if (pointerNorm >= 0.96) {
        pointerNorm = 0.96;
        pointerDir = -1;
      } else if (pointerNorm <= 0.04) {
        pointerNorm = 0.04;
        pointerDir = 1;
      }
      const minigameRemainingMs = state.minigameRemainingMs - dtMs;
      const progress = Math.max(0, state.progress - decay * dtSec);
      if (progress <= 0) {
        return withPhase(state, 'escaped', { pointerNorm, pointerDir, progress: 0, minigameRemainingMs: 0, hookFlash: false });
      }
      if (progress >= 1) {
        return withPhase(state, 'landed', { pointerNorm, pointerDir, progress: 1, minigameRemainingMs, hookFlash: false });
      }
      if (minigameRemainingMs <= 0) {
        return withPhase(state, 'escaped', { pointerNorm, pointerDir, progress, minigameRemainingMs: 0, hookFlash: false });
      }
      return { ...state, pointerNorm, pointerDir, progress, minigameRemainingMs, hookFlash: false };
    }
    default:
      return state;
  }
}

export function tidefallHookStrike(state: TidefallFishingState): TidefallFishingState {
  if (state.phase !== 'bite') return state;
  return withPhase(state, 'minigame', {
    elapsedMs: 0,
    minigameRemainingMs: TIDEFALL_MINIGAME_MS,
    progress: 0.48,
    pointerNorm: 0.15,
    pointerDir: 1,
    hookFlash: false,
  });
}

export function tidefallMinigameTap(state: TidefallFishingState): TidefallFishingState {
  if (state.phase !== 'minigame') return state;
  const half = state.targetWidth / 2;
  const inZone = state.pointerNorm >= state.targetCenter - half && state.pointerNorm <= state.targetCenter + half;
  let progress = state.progress + (inZone ? TIDEFALL_MINIGAME_HIT : -TIDEFALL_MINIGAME_MISS);
  progress = Math.min(1, Math.max(0, progress));
  if (progress >= 1) return withPhase(state, 'landed', { progress: 1, hookFlash: false });
  if (progress <= 0) return withPhase(state, 'escaped', { progress: 0, hookFlash: false });
  return { ...state, progress };
}

export function tidefallProgressPermille(state: TidefallFishingState): number {
  return Math.round(Math.min(1, Math.max(0, state.progress)) * 1000);
}

export function isPointerInTidefallZone(state: TidefallFishingState): boolean {
  const half = state.targetWidth / 2;
  return state.pointerNorm >= state.targetCenter - half && state.pointerNorm <= state.targetCenter + half;
}