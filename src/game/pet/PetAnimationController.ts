import type { PetAnimState, PetFacing } from '../../shared/petLiving/petVisualTypes';

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
  | 'groom';

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

const WALK_MAX_SPEED = 32; // px/s (~2 tiles/s, aligned to 10 FPS 6-frame paw cycle)
const RUN_MAX_SPEED = 58;  // px/s
const ACCEL_RATE = 180;    // px/s^2
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

function chooseFacing(dx: number, dy: number, current: PetFacing): PetFacing {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  // Require 20% dominance before switching axis to stop diagonal chatter
  if (ax > ay * 1.2) return dx >= 0 ? 'east' : 'west';
  if (ay > ax * 1.2) return dy >= 0 ? 'south' : 'north';
  return current;
}

/**
 * Pure locomotion & animation step decoupled from AI utility scoring.
 * Never restarts animations on same state, inserts graceful yawn/stretch when waking from sleep,
 * accelerates/decelerates smoothly to avoid rigid snapping, and enforces facing hysteresis.
 */
export function stepPetLocomotion(
  state: PetLocomotionSnapshot,
  params: {
    intent: PetBehaviorIntent;
    targetX: number;
    targetY: number;
    preferredFacing?: PetFacing;
    dtSec: number;
    nowMs: number;
  },
): PetLocomotionSnapshot {
  const { intent, targetX, targetY, preferredFacing, dtSec, nowMs } = params;
  const clampedDt = Math.max(0, Math.min(0.08, dtSec));

  // Detect waking up from deep sleep before walking/interacting
  const wasSleeping = state.committedIntent === 'sleep' || state.animState === 'sleep';
  const wantsActive = intent !== 'sleep' && intent !== 'lie';
  let wakingUntilMs = state.wakingUntilMs;
  if (wasSleeping && wantsActive && nowMs >= wakingUntilMs) {
    wakingUntilMs = nowMs + WAKE_TRANSITION_MS;
  }

  // While stretching awake, hold position cleanly so cat does not slide while yawning
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

  if (isMovingIntent && dist > 1.5) {
    const maxSpeed = intent === 'run' ? RUN_MAX_SPEED : WALK_MAX_SPEED;
    // Decelerate smoothly over the last 10px so feet plant cleanly on arrival
    const desiredSpeed = dist < 10 ? Math.max(10, (dist / 10) * maxSpeed) : maxSpeed;
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

    const candidateFacing = chooseFacing(dx, dy, state.facing);
    if (candidateFacing !== state.facing && nowMs - state.lastFacingChangeMs >= FACING_HYSTERESIS_MS) {
      nextFacing = candidateFacing;
      nextFacingAt = nowMs;
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
    animState =
      intent === 'run' && speedNow > WALK_MAX_SPEED * 0.95
        ? (`run_${nextFacing}` as PetAnimState)
        : (`walk_${nextFacing}` as PetAnimState);
  } else {
    switch (intent) {
      case 'sit':
        animState = `sit_${nextFacing}`;
        break;
      case 'lie':
        animState = 'lie_down';
        break;
      case 'sleep':
        animState = 'sleep';
        break;
      case 'sniff':
        animState = 'sniff';
        break;
      case 'eat':
        animState = 'eat';
        break;
      case 'drink':
        animState = 'drink';
        break;
      case 'pet_purr':
        animState = 'pet_purr';
        break;
      case 'happy_hop':
        animState = 'happy_hop';
        break;
      case 'play_pounce':
        animState = 'play_pounce';
        break;
      case 'box_peek':
        animState = 'box_peek';
        break;
      case 'groom':
        animState = 'groom';
        break;
      default:
        animState = `idle_${nextFacing}`;
        break;
    }
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
