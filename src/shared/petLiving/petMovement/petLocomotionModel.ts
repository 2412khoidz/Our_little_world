import type { PetAnimState, PetFacing } from '../petVisualTypes';

export type PetBehaviorIntent =
  | 'idle'
  | 'sit'
  | 'lie'
  | 'sleep'
  | 'move'
  | 'run'
  | 'sniff'
  | 'eat'
  | 'drink'
  | 'pet_purr'
  | 'happy_hop'
  | 'play_pounce'
  | 'box_peek'
  | 'groom'
  | 'stretch'
  | 'refuse_shy';

export interface PetLocomotionSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: PetFacing;
  animState: PetAnimState;
  wakingUntilMs: number;
  lastFacingChangeMs: number;
  committedIntent: PetBehaviorIntent;
}

const WALK_MAX_SPEED = 32;
const RUN_MAX_SPEED = 58;
const ACCEL_RATE = 180;
const FACING_HYSTERESIS_MS = 220;
const WAKE_TRANSITION_MS = 1200;

export function createLocomotionSnapshot(x: number, y: number): PetLocomotionSnapshot {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing: 'south',
    animState: 'idle_south',
    wakingUntilMs: 0,
    lastFacingChangeMs: 0,
    committedIntent: 'idle',
  };
}

function facingUnitVector(facing: PetFacing): { x: number; y: number } {
  switch (facing) {
    case 'east':
      return { x: 1, y: 0 };
    case 'west':
      return { x: -1, y: 0 };
    case 'north':
      return { x: 0, y: -1 };
    case 'south':
      return { x: 0, y: 1 };
  }
}

/**
 * Velocity/displacement-derived facing: immediately snaps out of opposite/diagonal-backwards
 * facing whenever `dot(move, facing) <= 0.15` so the sprite can never moonwalk, while keeping
 * 1.25 axis hysteresis only when already aligned forward.
 */
export function resolveFacingFromVector(dx: number, dy: number, current: PetFacing): PetFacing {
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-4) return current;
  const fv = facingUnitVector(current);
  const dot = (dx / mag) * fv.x + (dy / mag) * fv.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (dot <= 0.15) {
    return ax >= ay ? (dx >= 0 ? 'east' : 'west') : dy >= 0 ? 'south' : 'north';
  }
  if (ax > ay * 1.25) return dx >= 0 ? 'east' : 'west';
  if (ay > ax * 1.25) return dy >= 0 ? 'south' : 'north';
  return current;
}

function chooseFacing(dx: number, dy: number, current: PetFacing): PetFacing {
  return resolveFacingFromVector(dx, dy, current);
}

/** Reconciles velocity, facing, and walk/run/sit animation strictly from accepted coordinates. */
export function applyAcceptedDisplacementToLocomotion(
  prev: PetLocomotionSnapshot,
  nextX: number,
  nextY: number,
  dtSec: number,
  intent: PetBehaviorIntent,
  nowMs: number,
  fallbackFacing?: PetFacing,
): PetLocomotionSnapshot {
  const adx = nextX - prev.x;
  const ady = nextY - prev.y;
  const stepDist = Math.hypot(adx, ady);
  if (stepDist < 0.12) {
    const restingFacing = fallbackFacing ?? prev.facing;
    const restingIntent: PetBehaviorIntent =
      intent === 'move' || intent === 'run' ? 'sit' : intent;
    return {
      ...prev,
      x: nextX,
      y: nextY,
      vx: 0,
      vy: 0,
      facing: restingFacing,
      animState: behaviorIntentToAnim(restingIntent, restingFacing),
      lastFacingChangeMs: restingFacing !== prev.facing ? nowMs : prev.lastFacingChangeMs,
      committedIntent: restingIntent,
    };
  }
  const safeDt = Math.max(0.008, Math.min(0.2, dtSec));
  const vx = adx / safeDt;
  const vy = ady / safeDt;
  const speed = Math.hypot(vx, vy);
  const facing = resolveFacingFromVector(adx, ady, prev.facing);
  const running = intent === 'run' || speed > WALK_MAX_SPEED * 0.92;
  const animState = running ? (`run_${facing}` as PetAnimState) : (`walk_${facing}` as PetAnimState);
  return {
    ...prev,
    x: nextX,
    y: nextY,
    vx,
    vy,
    facing,
    animState,
    lastFacingChangeMs: facing !== prev.facing ? nowMs : prev.lastFacingChangeMs,
    committedIntent: running ? 'run' : 'move',
  };
}

/** Frame-rate independent locomotion step (pure TS). */
export function stepPetLocomotion(
  state: PetLocomotionSnapshot,
  params: {
    intent: PetBehaviorIntent;
    targetX: number;
    targetY: number;
    preferredFacing?: PetFacing;
    dtSec: number;
    nowMs: number;
    runThresholdPx?: number;
  },
): PetLocomotionSnapshot {
  const { intent, targetX, targetY, preferredFacing, dtSec, nowMs } = params;
  const clampedDt = Math.max(0, Math.min(0.2, dtSec));

  const wasSleeping = state.committedIntent === 'sleep' || state.animState === 'sleep';
  const wantsActive = intent !== 'sleep' && intent !== 'lie';
  let wakingUntilMs = state.wakingUntilMs;
  if (wasSleeping && wantsActive && nowMs >= wakingUntilMs) {
    wakingUntilMs = nowMs + WAKE_TRANSITION_MS;
  }

  if (nowMs < wakingUntilMs) {
    return {
      ...state,
      vx: 0,
      vy: 0,
      wakingUntilMs,
      committedIntent: intent,
      animState: 'wake_yawn_stretch',
    };
  }

  let nextX = state.x;
  let nextY = state.y;
  let nextVx = state.vx;
  let nextVy = state.vy;
  let nextFacing = state.facing;
  let nextFacingAt = state.lastFacingChangeMs;

  const isMovingIntent = intent === 'move' || intent === 'run';
  const dx = targetX - state.x;
  const dy = targetY - state.y;
  const dist = Math.hypot(dx, dy);
  const runThreshold = params.runThresholdPx ?? 96;

  if (isMovingIntent && dist > 1.2) {
    const useRun = intent === 'run' || (intent === 'move' && dist > runThreshold);
    const maxSpeed = useRun ? RUN_MAX_SPEED : WALK_MAX_SPEED;
    const desiredSpeed = dist < 10 ? Math.max(8, (dist / 10) * maxSpeed) : maxSpeed;
    const goalVx = (dx / dist) * desiredSpeed;
    const goalVy = (dy / dist) * desiredSpeed;

    const maxDelta = ACCEL_RATE * clampedDt;
    const dvx = goalVx - state.vx;
    const dvy = goalVy - state.vy;
    const dvMag = Math.hypot(dvx, dvy);
    if (dvMag <= maxDelta) {
      nextVx = goalVx;
      nextVy = goalVy;
    } else if (dvMag > 0) {
      nextVx = state.vx + (dvx / dvMag) * maxDelta;
      nextVy = state.vy + (dvy / dvMag) * maxDelta;
    }

    nextX = state.x + nextVx * clampedDt;
    nextY = state.y + nextVy * clampedDt;
    if (Math.hypot(targetX - state.x, targetY - state.y) <= Math.hypot(nextVx * clampedDt, nextVy * clampedDt)) {
      nextX = targetX;
      nextY = targetY;
      nextVx = 0;
      nextVy = 0;
    }

    const dispX = nextX - state.x;
    const dispY = nextY - state.y;
    const dispMag = Math.hypot(dispX, dispY);
    const refDx = dispMag > 0.05 ? dispX : dx;
    const refDy = dispMag > 0.05 ? dispY : dy;
    const candidateFacing = chooseFacing(refDx, refDy, state.facing);
    if (candidateFacing !== state.facing) {
      const fv = facingUnitVector(state.facing);
      const dispDot = dispMag > 0.05 ? (dispX / dispMag) * fv.x + (dispY / dispMag) * fv.y : 1;
      if (dispDot <= 0.15 || nowMs - state.lastFacingChangeMs >= FACING_HYSTERESIS_MS) {
        nextFacing = candidateFacing;
        nextFacingAt = nowMs;
      }
    }
  } else {
    nextVx = 0;
    nextVy = 0;
    if (preferredFacing && preferredFacing !== state.facing && nowMs - state.lastFacingChangeMs >= FACING_HYSTERESIS_MS) {
      nextFacing = preferredFacing;
      nextFacingAt = nowMs;
    }
  }

  let animState: PetAnimState;
  const speedNow = Math.hypot(nextVx, nextVy);
  if (isMovingIntent && speedNow > 4) {
    const running = intent === 'run' || speedNow > WALK_MAX_SPEED * 0.92;
    animState = running ? (`run_${nextFacing}` as PetAnimState) : (`walk_${nextFacing}` as PetAnimState);
  } else {
    animState = behaviorIntentToAnim(intent, nextFacing);
  }

  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
    facing: nextFacing,
    animState,
    wakingUntilMs,
    lastFacingChangeMs: nextFacingAt,
    committedIntent: intent,
  };
}

export function behaviorIntentToAnim(intent: PetBehaviorIntent, facing: PetFacing): PetAnimState {
  switch (intent) {
    case 'sit':
      return `sit_${facing}`;
    case 'lie':
      return 'lie_down';
    case 'sleep':
      return 'sleep';
    case 'sniff':
      return 'sniff';
    case 'eat':
      return 'eat';
    case 'drink':
      return 'drink';
    case 'pet_purr':
      return 'pet_purr';
    case 'happy_hop':
      return 'happy_hop';
    case 'play_pounce':
      return 'play_pounce';
    case 'box_peek':
      return 'box_peek';
    case 'groom':
      return 'groom';
    case 'stretch':
      return 'wake_yawn_stretch';
    case 'refuse_shy':
      return `idle_${facing}`;
    default:
      return `idle_${facing}`;
  }
}