/**
 * Stardew-style tension reel loop vendored from `game.js` (`updateReel` / `startReel`) — MIT.
 * Source: github.com/cristianjeffries/chill-fishing (main).
 */
export type ChillReelBehavior = 'normal' | 'zigzag' | 'tank' | 'burst';

export interface ChillReelFishType {
  readonly reelBehavior: ChillReelBehavior;
  readonly speed: number;
}

export interface ChillReelState {
  readonly phase: 'idle' | 'reeling_ready' | 'reeling' | 'caught' | 'escaped';
  readonly fish: ChillReelFishType;
  readonly fishPos: number;
  readonly fishDir: number;
  readonly zoneW: number;
  readonly zonePos: number;
  readonly indPos: number;
  readonly indVel: number;
  readonly progress: number;
  readonly grace: number;
  readonly holding: boolean;
  readonly fishSpd: number;
  readonly burstTimer: number;
}

export function createChillReelReady(fish: ChillReelFishType, zoneW: number): ChillReelState {
  return {
    phase: 'reeling_ready',
    fish,
    fishPos: 0.3 + 0.15,
    fishDir: 1,
    zoneW,
    zonePos: 0.5 - zoneW / 2,
    indPos: 0.5,
    indVel: 0,
    progress: 0,
    grace: 0,
    holding: false,
    fishSpd: fish.speed,
    burstTimer: 0,
  };
}

export function startChillReel(state: ChillReelState): ChillReelState {
  if (state.phase !== 'reeling_ready') return state;
  const fishPos = 0.3 + Math.random() * 0.4;
  return {
    ...state,
    phase: 'reeling',
    fishPos,
    indPos: 0.5,
    indVel: 0,
    zonePos: 0.5 - state.zoneW / 2,
    progress: 0,
    grace: 0,
    fishSpd: state.fish.speed,
    burstTimer: 0,
    fishDir: Math.random() > 0.5 ? 1 : -1,
  };
}

export function tickChillReel(state: ChillReelState, dt: number, rng01: () => number): ChillReelState {
  if (state.phase !== 'reeling') return state;
  const beh = state.fish.reelBehavior;
  const inZone = state.fishPos >= state.zonePos && state.fishPos <= state.zonePos + state.zoneW;
  let effSpd = inZone ? state.fishSpd * 0.35 : state.fishSpd;
  let fishDir = state.fishDir;
  let fishSpd = state.fishSpd;
  let burstTimer = state.burstTimer;
  if (beh === 'zigzag') {
    if (rng01() < dt * 4) fishDir *= -1;
    effSpd = inZone ? state.fishSpd * 0.4 : state.fishSpd * 1.1;
  } else if (beh === 'tank') {
    effSpd = inZone ? state.fishSpd * 0.7 : state.fishSpd * 0.85;
  } else if (beh === 'burst') {
    burstTimer += dt;
    if (burstTimer > 2.5 + rng01() * 1.5) {
      fishSpd = Math.min(state.fishSpd * 1.8, 2.5);
      burstTimer = 0;
    }
    effSpd = inZone ? fishSpd * 0.35 : fishSpd;
  }
  let fishPos = state.fishPos + fishDir * effSpd * dt * 0.9;
  if (fishPos <= 0.02) {
    fishPos = 0.02;
    fishDir = 1;
  }
  if (fishPos >= 0.98) {
    fishPos = 0.98;
    fishDir = -1;
  }
  if (beh !== 'zigzag' && rng01() < (inZone ? dt * effSpd * 0.3 : dt * state.fishSpd * 0.7)) {
    fishDir *= -1;
  }
  const GRAV = 3.8;
  const THRUST = 7.0;
  const DAMP = 0.86;
  let indVel = state.indVel + (state.holding ? THRUST - GRAV : -GRAV) * dt;
  indVel *= DAMP;
  let indPos = state.indPos + indVel * dt;
  const halfZ = state.zoneW / 2;
  if (indPos <= halfZ) {
    indPos = halfZ;
    indVel *= -0.35;
  }
  if (indPos >= 1 - halfZ) {
    indPos = 1 - halfZ;
    indVel *= -0.35;
  }
  const zonePos = indPos - state.zoneW / 2;
  const inZone2 = fishPos >= zonePos && fishPos <= zonePos + state.zoneW;
  const heavy = 1;
  const progress = inZone2
    ? Math.min(1, state.progress + dt * 0.28 * heavy)
    : Math.max(0, state.progress - dt * 0.18 * heavy);
  let grace = state.grace;
  if (progress <= 0) {
    grace += dt;
    if (grace >= 1.5) {
      return { ...state, fishPos, fishDir, fishSpd, burstTimer, indPos, indVel, zonePos, progress, grace, phase: 'escaped' };
    }
  } else {
    grace = 0;
  }
  if (progress >= 1) {
    return { ...state, fishPos, fishDir, fishSpd, burstTimer, indPos, indVel, zonePos, progress, grace, phase: 'caught' };
  }
  return {
    ...state,
    fishPos,
    fishDir,
    fishSpd,
    burstTimer,
    indPos,
    indVel,
    zonePos,
    progress,
    grace,
  };
}