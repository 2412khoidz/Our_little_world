/**
 * Tension reel loop vendored from `FishingSystem.ts#updateReeling` @ canvas-games (MIT).
 * Hold raises tension + progress; release lowers tension. Snap/slack at 0/1 escapes.
 */
export interface TensionReelState {
  readonly phase: 'idle' | 'reeling' | 'caught' | 'escaped';
  readonly reelTension: number;
  readonly reelProgress: number;
  readonly holding: boolean;
  readonly fishFightDir: number;
  readonly fishFightTimer: number;
  readonly fight: number;
}

const REEL_SPEED = 0.12;
const TENSION_RISE = 0.6;
const TENSION_FALL = 0.45;
const FISH_FIGHT_INTERVAL = 0.8;

export function createTensionReelReady(fight: number): TensionReelState {
  return {
    phase: 'reeling',
    reelTension: 0.5,
    reelProgress: 0,
    holding: false,
    fishFightDir: 1,
    fishFightTimer: 0,
    fight,
  };
}

export function tickTensionReel(state: TensionReelState, dt: number, rng01: () => number): TensionReelState {
  if (state.phase !== 'reeling') return state;
  let fishFightTimer = state.fishFightTimer + dt;
  let fishFightDir = state.fishFightDir;
  if (fishFightTimer >= FISH_FIGHT_INTERVAL * (1 - state.fight * 0.5)) {
    fishFightTimer = 0;
    fishFightDir = rng01() > 0.5 ? 1 : -1;
  }
  let reelTension = state.reelTension + fishFightDir * state.fight * 0.4 * dt;
  let reelProgress = state.reelProgress;
  if (state.holding) {
    reelTension += TENSION_RISE * dt;
    reelProgress += REEL_SPEED * (1 - state.fight * 0.5) * dt;
  } else {
    reelTension -= TENSION_FALL * dt;
  }
  reelTension = Math.max(0, Math.min(1, reelTension));
  if (reelTension >= 1 || reelTension <= 0) {
    return { ...state, reelTension, reelProgress, fishFightDir, fishFightTimer, phase: 'escaped' };
  }
  if (reelProgress >= 1) {
    return { ...state, reelTension, reelProgress, fishFightDir, fishFightTimer, phase: 'caught' };
  }
  return { ...state, reelTension, reelProgress, fishFightDir, fishFightTimer };
}

export function tensionProgressPermille(state: TensionReelState): number {
  return Math.round(Math.max(0, Math.min(1, state.reelProgress)) * 1000);
}