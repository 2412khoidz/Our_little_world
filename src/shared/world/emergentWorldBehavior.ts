import type { Direction } from '../types';
import type { CouplePostureKind } from '../couple/coupleTypes';
import {
  isBlockedByActorColliders,
  NPC_ACTOR_RADIUS_PX,
  type ActorCollider,
} from '../movement/actorCollision';

export type EmergentActivityState =
  | 'idle'
  | 'wandering'
  | 'pecking'
  | 'startled_hop'
  | 'curious_seed'
  | 'roosting_sleep'
  | 'swimming'
  | 'floating_rest'
  | 'waddling'
  | 'startled_splash'
  | 'grazing'
  | 'curious_player'
  | 'resting'
  | 'scuttling'
  | 'claw_pause'
  | 'fleeing_player'
  | 'waiting'
  | 'sleeping'
  | 'sitting'
  | 'interacting'
  | 'watching_farm';

const CLEANUP_TIMEOUT_EXEMPT_STATES: ReadonlySet<string> = new Set([
  'waiting',
  'sleeping',
  'sitting',
  'interacting',
  'roosting_sleep',
  'watching_farm',
  'floating_rest',
  'resting',
  'claw_pause',
  'sleep_cushion',
  'nap_on_sofa',
  'sunbathe',
  'curl_near_partner',
  'stay_by_desk',
  'stay_calm',
]);

/**
 * States where an entity is legitimately resting, waiting, sitting, or interacting
 * must NOT be killed/failed by stuck/idle cleanup timers.
 */
export function isExemptFromCleanupTimeout(state: string | null | undefined): boolean {
  if (!state) return false;
  return CLEANUP_TIMEOUT_EXEMPT_STATES.has(state);
}

export interface ChickenActorState {
  readonly id: string;
  readonly homeX: number;
  readonly homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  activity: EmergentActivityState;
  stateUntilMs: number;
  nextThinkAtMs: number;
  phase: number;
  hopOffsetY: number;
  animRateScale: number;
  bubbleText: string | null;
}

export function createChickenActorState(
  id: string,
  homeX: number,
  homeY: number,
  phase = 0,
): ChickenActorState {
  return {
    id,
    homeX,
    homeY,
    x: homeX,
    y: homeY,
    vx: 0,
    vy: 0,
    facing: phase % 2 >= 1 ? 'right' : 'left',
    activity: 'pecking',
    stateUntilMs: 0,
    nextThinkAtMs: 0,
    phase,
    hopOffsetY: 0,
    animRateScale: 1,
    bubbleText: null,
  };
}

export interface EmergentChickenContext {
  nowMs: number;
  dtSec: number;
  tilePx: number;
  playerX: number | null;
  playerY: number | null;
  catX?: number | null;
  catY?: number | null;
  playerRunning: boolean;
  toolSwinging: boolean;
  heldItemSku: string | null;
  isNight: boolean;
  weatherKind: 'sunny' | 'cloudy' | 'drizzle' | string;
  isTileBlocked?: (tx: number, ty: number) => boolean;
}

function canActorStand(
  x: number,
  y: number,
  tilePx: number,
  isTileBlocked?: (tx: number, ty: number) => boolean,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (!isTileBlocked || tilePx <= 0) return true;
  return !isTileBlocked(Math.floor(x / tilePx), Math.floor(y / tilePx));
}

export function stepEmergentChicken(state: ChickenActorState, ctx: EmergentChickenContext): ChickenActorState {
  const dt = Math.max(0.004, Math.min(0.1, Number.isFinite(ctx.dtSec) ? ctx.dtSec : 0.016));
  const tilePx = Math.max(1, ctx.tilePx);

  const distToPlayer =
    ctx.playerX !== null && ctx.playerY !== null
      ? Math.hypot(ctx.playerX - state.x, ctx.playerY - state.y)
      : Infinity;
  const distToCat =
    ctx.catX != null && ctx.catY != null
      ? Math.hypot(ctx.catX - state.x, ctx.catY - state.y)
      : Infinity;

  if (ctx.isNight) {
    state.activity = 'roosting_sleep';
    state.vx = 0;
    state.vy = 0;
    state.hopOffsetY = 0;
    state.animRateScale = 0.25;
    state.bubbleText = 'zzz';
    return state;
  }

  const holdingSeed = Boolean(ctx.heldItemSku?.startsWith('seed_'));
  const catChasing = distToCat < 34;
  const startledTrigger =
    catChasing ||
    ((ctx.playerRunning || ctx.toolSwinging) && distToPlayer < 48) ||
    (!holdingSeed && distToPlayer < 22);

  if (startledTrigger && ctx.nowMs >= state.stateUntilMs) {
    const chaserX = catChasing && ctx.catX != null ? ctx.catX : ctx.playerX;
    const chaserY = catChasing && ctx.catY != null ? ctx.catY : ctx.playerY;
    const awayX = chaserX !== null && chaserX !== undefined ? state.x - chaserX : 1;
    const awayY = chaserY !== null && chaserY !== undefined ? state.y - chaserY : 0;
    const len = Math.max(1e-4, Math.hypot(awayX, awayY));
    state.activity = 'startled_hop';
    const fleeSpeed = catChasing ? 40 : 34;
    state.vx = (awayX / len) * fleeSpeed;
    state.vy = (awayY / len) * fleeSpeed;
    state.facing = state.vx >= 0 ? 'right' : 'left';
    state.stateUntilMs = ctx.nowMs + 820;
    state.nextThinkAtMs = ctx.nowMs + 1450;
  } else if (ctx.nowMs >= state.stateUntilMs && holdingSeed && distToPlayer < 92) {
    state.activity = 'curious_seed';
    if (distToPlayer > 16 && ctx.playerX !== null && ctx.playerY !== null) {
      const dx = ctx.playerX - state.x;
      const dy = ctx.playerY - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.vx = (dx / len) * 22;
      state.vy = (dy / len) * 22;
      state.facing = state.vx >= 0 ? 'right' : 'left';
    } else {
      state.vx = 0;
      state.vy = 0;
    }
    state.nextThinkAtMs = ctx.nowMs + 700;
  } else if (ctx.nowMs >= state.nextThinkAtMs && ctx.nowMs >= state.stateUntilMs) {
    const maxRadius = ctx.weatherKind === 'drizzle' ? 18 : 42;
    const slot = Math.floor((ctx.nowMs + state.phase * 1000) / 2400);
    if (slot % 3 === 0) {
      state.activity = 'pecking';
      state.vx = 0;
      state.vy = 0;
      state.nextThinkAtMs = ctx.nowMs + 1700;
    } else {
      const angle = (slot * 2.39996 + state.phase) % (Math.PI * 2);
      const targetX = state.homeX + Math.cos(angle) * maxRadius * 0.78;
      const targetY = state.homeY + Math.sin(angle) * maxRadius * 0.58;
      const dx = targetX - state.x;
      const dy = targetY - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.activity = 'wandering';
      state.vx = (dx / len) * 14;
      state.vy = (dy / len) * 14;
      state.facing = state.vx >= 0 ? 'right' : 'left';
      state.nextThinkAtMs = ctx.nowMs + 2100;
    }
  }

  if (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01) {
    const nextX = state.x + state.vx * dt;
    const nextY = state.y + state.vy * dt;
    const homeDist = Math.hypot(nextX - state.homeX, nextY - state.homeY);
    const maxFenceDist = state.activity === 'curious_seed' ? 88 : 54;
    if (homeDist <= maxFenceDist && canActorStand(nextX, nextY, tilePx, ctx.isTileBlocked)) {
      state.x = nextX;
      state.y = nextY;
    } else {
      state.vx = 0;
      state.vy = 0;
      if (state.activity === 'startled_hop') {
        state.activity = 'idle';
      }
    }
  }

  if (state.activity === 'startled_hop') {
    state.hopOffsetY = -Math.abs(Math.sin(ctx.nowMs * 0.022 + state.phase)) * 5.5;
    state.animRateScale = 2.1;
    state.bubbleText = '!';
  } else if (state.activity === 'curious_seed') {
    state.hopOffsetY = -Math.abs(Math.sin(ctx.nowMs * 0.012)) * 1.6;
    state.animRateScale = 1.45;
    state.bubbleText = '♥';
  } else if (state.activity === 'pecking') {
    state.hopOffsetY = Math.sin(ctx.nowMs * 0.014 + state.phase) > 0.65 ? 0.9 : 0;
    state.animRateScale = 1.15;
    state.bubbleText = null;
  } else {
    state.hopOffsetY = 0;
    state.animRateScale = 1;
    state.bubbleText = null;
  }

  return state;
}

export interface PondBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface DuckActorState {
  readonly id: string;
  readonly homeX: number;
  readonly homeY: number;
  readonly bounds: PondBounds;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  activity: 'swimming' | 'floating_rest' | 'startled_splash' | 'sleeping';
  bobOffsetY: number;
  ripplePulse: boolean;
  animRateScale: number;
  stateUntilMs: number;
  nextThinkAtMs: number;
  phase: number;
}

export function createDuckActorState(
  id: string,
  homeX: number,
  homeY: number,
  bounds: PondBounds,
  phase = 0,
): DuckActorState {
  return {
    id,
    homeX,
    homeY,
    bounds,
    x: Math.max(bounds.minX, Math.min(bounds.maxX, homeX)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, homeY)),
    vx: 0,
    vy: 0,
    facing: phase % 2 >= 1 ? 'right' : 'left',
    activity: 'swimming',
    bobOffsetY: 0,
    ripplePulse: false,
    animRateScale: 1,
    stateUntilMs: 0,
    nextThinkAtMs: 0,
    phase,
  };
}

export interface EmergentDuckContext {
  nowMs: number;
  dtSec: number;
  playerX: number | null;
  playerY: number | null;
  playerRunning: boolean;
  isNight: boolean;
}

export function stepEmergentDuck(state: DuckActorState, ctx: EmergentDuckContext): DuckActorState {
  const dt = Math.max(0.004, Math.min(0.1, Number.isFinite(ctx.dtSec) ? ctx.dtSec : 0.016));
  const distToPlayer =
    ctx.playerX !== null && ctx.playerY !== null
      ? Math.hypot(ctx.playerX - state.x, ctx.playerY - state.y)
      : Infinity;

  if (ctx.isNight) {
    state.activity = 'sleeping';
    state.vx = 0;
    state.vy = 0;
    state.bobOffsetY = Math.sin(ctx.nowMs * 0.0025 + state.phase) * 0.6;
    state.ripplePulse = false;
    state.animRateScale = 0.35;
    return state;
  }

  const splashDist = ctx.playerRunning ? 42 : 24;
  if (distToPlayer < splashDist && ctx.nowMs >= state.stateUntilMs) {
    const awayX = ctx.playerX !== null ? state.x - ctx.playerX : 1;
    const awayY = ctx.playerY !== null ? state.y - ctx.playerY : 0;
    const len = Math.max(1e-4, Math.hypot(awayX, awayY));
    state.activity = 'startled_splash';
    state.vx = (awayX / len) * 24;
    state.vy = (awayY / len) * 24;
    state.facing = state.vx >= 0 ? 'right' : 'left';
    state.stateUntilMs = ctx.nowMs + 750;
    state.nextThinkAtMs = ctx.nowMs + 1400;
  } else if (ctx.nowMs >= state.nextThinkAtMs && ctx.nowMs >= state.stateUntilMs) {
    const slot = Math.floor((ctx.nowMs + state.phase * 1000) / 2800);
    if (slot % 4 === 0) {
      state.activity = 'floating_rest';
      state.vx = 0;
      state.vy = 0;
      state.nextThinkAtMs = ctx.nowMs + 1900;
    } else {
      const spanX = Math.max(4, state.bounds.maxX - state.bounds.minX);
      const spanY = Math.max(4, state.bounds.maxY - state.bounds.minY);
      const tx = state.bounds.minX + ((Math.sin(slot * 1.9 + state.phase) * 0.5 + 0.5) * spanX);
      const ty = state.bounds.minY + ((Math.cos(slot * 1.3 + state.phase) * 0.5 + 0.5) * spanY);
      const dx = tx - state.x;
      const dy = ty - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.activity = 'swimming';
      state.vx = (dx / len) * 13;
      state.vy = (dy / len) * 13;
      state.facing = state.vx >= 0 ? 'right' : 'left';
      state.nextThinkAtMs = ctx.nowMs + 2400;
    }
  }

  const nextX = Math.max(state.bounds.minX, Math.min(state.bounds.maxX, state.x + state.vx * dt));
  const nextY = Math.max(state.bounds.minY, Math.min(state.bounds.maxY, state.y + state.vy * dt));
  if (Math.abs(nextX - state.x) < 1e-4 && Math.abs(state.vx) > 0.1) state.vx = -state.vx * 0.5;
  if (Math.abs(nextY - state.y) < 1e-4 && Math.abs(state.vy) > 0.1) state.vy = -state.vy * 0.5;
  state.x = nextX;
  state.y = nextY;

  state.bobOffsetY = Math.sin(ctx.nowMs * 0.0045 + state.phase) * 1.1;
  state.ripplePulse = state.activity === 'swimming' || state.activity === 'startled_splash';
  state.animRateScale =
    state.activity === 'startled_splash' ? 1.85 : state.activity === 'floating_rest' ? 0.55 : 1.05;
  return state;
}

export interface SheepActorState {
  readonly id: string;
  readonly homeX: number;
  readonly homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  activity: 'grazing' | 'wandering' | 'curious_player' | 'resting' | 'sleeping';
  grazeBobY: number;
  animRateScale: number;
  bubbleText: string | null;
  stateUntilMs: number;
  nextThinkAtMs: number;
  phase: number;
}

export function createSheepActorState(
  id: string,
  homeX: number,
  homeY: number,
  phase = 0,
): SheepActorState {
  return {
    id,
    homeX,
    homeY,
    x: homeX,
    y: homeY,
    vx: 0,
    vy: 0,
    facing: phase % 2 >= 1 ? 'right' : 'left',
    activity: 'grazing',
    grazeBobY: 0,
    animRateScale: 0.9,
    bubbleText: null,
    stateUntilMs: 0,
    nextThinkAtMs: 0,
    phase,
  };
}

export function stepEmergentSheep(state: SheepActorState, ctx: EmergentChickenContext): SheepActorState {
  const dt = Math.max(0.004, Math.min(0.1, Number.isFinite(ctx.dtSec) ? ctx.dtSec : 0.016));
  const tilePx = Math.max(1, ctx.tilePx);
  const distToPlayer =
    ctx.playerX !== null && ctx.playerY !== null
      ? Math.hypot(ctx.playerX - state.x, ctx.playerY - state.y)
      : Infinity;

  if (ctx.isNight) {
    state.activity = 'sleeping';
    state.vx = 0;
    state.vy = 0;
    state.grazeBobY = 0;
    state.animRateScale = 0.25;
    state.bubbleText = 'zzz';
    return state;
  }

  if (ctx.playerRunning && distToPlayer < 36 && ctx.nowMs >= state.stateUntilMs) {
    const awayX = ctx.playerX !== null ? state.x - ctx.playerX : 1;
    const awayY = ctx.playerY !== null ? state.y - ctx.playerY : 0;
    const len = Math.max(1e-4, Math.hypot(awayX, awayY));
    state.activity = 'wandering';
    state.vx = (awayX / len) * 20;
    state.vy = (awayY / len) * 20;
    state.facing = state.vx >= 0 ? 'right' : 'left';
    state.stateUntilMs = ctx.nowMs + 800;
    state.nextThinkAtMs = ctx.nowMs + 1600;
    state.bubbleText = null;
  } else if (distToPlayer < 56 && ctx.nowMs >= state.stateUntilMs) {
    state.activity = 'curious_player';
    state.vx = 0;
    state.vy = 0;
    if (ctx.playerX !== null) {
      state.facing = ctx.playerX >= state.x ? 'right' : 'left';
    }
    state.bubbleText = 'baa~';
    state.nextThinkAtMs = ctx.nowMs + 1500;
  } else if (ctx.nowMs >= state.nextThinkAtMs && ctx.nowMs >= state.stateUntilMs) {
    const slot = Math.floor((ctx.nowMs + state.phase * 1100) / 3400);
    if (slot % 3 !== 1) {
      state.activity = 'grazing';
      state.vx = 0;
      state.vy = 0;
      state.bubbleText = null;
      state.nextThinkAtMs = ctx.nowMs + 2400;
    } else {
      const radius = ctx.weatherKind === 'drizzle' ? 20 : 44;
      const angle = (slot * 2.1 + state.phase) % (Math.PI * 2);
      const tx = state.homeX + Math.cos(angle) * radius;
      const ty = state.homeY + Math.sin(angle) * radius * 0.72;
      const dx = tx - state.x;
      const dy = ty - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.activity = 'wandering';
      state.vx = (dx / len) * 11;
      state.vy = (dy / len) * 11;
      state.facing = state.vx >= 0 ? 'right' : 'left';
      state.bubbleText = null;
      state.nextThinkAtMs = ctx.nowMs + 2600;
    }
  }

  if (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01) {
    const nextX = state.x + state.vx * dt;
    const nextY = state.y + state.vy * dt;
    if (
      Math.hypot(nextX - state.homeX, nextY - state.homeY) <= 56 &&
      canActorStand(nextX, nextY, tilePx, ctx.isTileBlocked)
    ) {
      state.x = nextX;
      state.y = nextY;
    } else {
      state.vx = 0;
      state.vy = 0;
      state.activity = 'grazing';
    }
  }

  state.grazeBobY =
    state.activity === 'grazing' ? (Math.sin(ctx.nowMs * 0.006 + state.phase) > 0.4 ? 0.8 : 0) : 0;
  state.animRateScale =
    state.activity === 'wandering' ? 1.15 : state.activity === 'curious_player' ? 0.8 : 0.9;
  return state;
}

export interface CrabActorState {
  readonly id: string;
  readonly homeX: number;
  readonly homeY: number;
  readonly patrolAxis: 'x' | 'y';
  readonly patrolSpanPx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  activity: 'scuttling' | 'claw_pause' | 'fleeing_player';
  animRateScale: number;
  stateUntilMs: number;
  nextThinkAtMs: number;
  phase: number;
}

export function createCrabActorState(
  id: string,
  homeX: number,
  homeY: number,
  patrolAxis: 'x' | 'y' = 'y',
  patrolSpanPx = 30,
  phase = 0,
): CrabActorState {
  return {
    id,
    homeX,
    homeY,
    patrolAxis,
    patrolSpanPx,
    x: homeX,
    y: homeY,
    vx: 0,
    vy: 0,
    facing: 'right',
    activity: 'scuttling',
    animRateScale: 1,
    stateUntilMs: 0,
    nextThinkAtMs: 0,
    phase,
  };
}

export function stepEmergentCrab(state: CrabActorState, ctx: EmergentChickenContext): CrabActorState {
  const dt = Math.max(0.004, Math.min(0.1, Number.isFinite(ctx.dtSec) ? ctx.dtSec : 0.016));
  const tilePx = Math.max(1, ctx.tilePx);
  const distToPlayer =
    ctx.playerX !== null && ctx.playerY !== null
      ? Math.hypot(ctx.playerX - state.x, ctx.playerY - state.y)
      : Infinity;

  if (distToPlayer < 48 && ctx.nowMs >= state.stateUntilMs) {
    const awayX = ctx.playerX !== null ? state.x - ctx.playerX : 1;
    const awayY = ctx.playerY !== null ? state.y - ctx.playerY : 0;
    const len = Math.max(1e-4, Math.hypot(awayX, awayY));
    state.activity = 'fleeing_player';
    state.vx = (awayX / len) * 34;
    state.vy = (awayY / len) * 34;
    state.facing = state.vx >= 0 ? 'right' : 'left';
    state.stateUntilMs = ctx.nowMs + 700;
    state.nextThinkAtMs = ctx.nowMs + 1300;
  } else if (ctx.nowMs >= state.nextThinkAtMs && ctx.nowMs >= state.stateUntilMs) {
    const slot = Math.floor((ctx.nowMs + state.phase * 900) / 1800);
    if (slot % 4 === 0) {
      state.activity = 'claw_pause';
      state.vx = 0;
      state.vy = 0;
      state.nextThinkAtMs = ctx.nowMs + 1200;
    } else {
      const sign = slot % 2 === 0 ? 1 : -1;
      const targetX = state.homeX + (state.patrolAxis === 'x' ? sign * state.patrolSpanPx : 0);
      const targetY = state.homeY + (state.patrolAxis === 'y' ? sign * state.patrolSpanPx : 0);
      const dx = targetX - state.x;
      const dy = targetY - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.activity = 'scuttling';
      state.vx = (dx / len) * 16;
      state.vy = (dy / len) * 16;
      state.facing = Math.abs(state.vx) > 1 ? (state.vx >= 0 ? 'right' : 'left') : sign > 0 ? 'right' : 'left';
      state.nextThinkAtMs = ctx.nowMs + 1600;
    }
  }

  if (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01) {
    const nextX = state.x + state.vx * dt;
    const nextY = state.y + state.vy * dt;
    const maxSpan = state.activity === 'fleeing_player' ? state.patrolSpanPx + 32 : state.patrolSpanPx + 12;
    if (
      Math.hypot(nextX - state.homeX, nextY - state.homeY) <= maxSpan &&
      canActorStand(nextX, nextY, tilePx, ctx.isTileBlocked)
    ) {
      state.x = nextX;
      state.y = nextY;
    } else {
      state.vx = 0;
      state.vy = 0;
      state.activity = 'claw_pause';
    }
  }

  state.animRateScale =
    state.activity === 'fleeing_player' ? 2.2 : state.activity === 'claw_pause' ? 0.5 : 1.1;
  return state;
}

export interface NpcEmergentReactionInput {
  npcX: number;
  npcY: number;
  playerX: number | null;
  playerY: number | null;
  playerPosture: CouplePostureKind;
  isNight: boolean;
  weatherKind: 'sunny' | 'cloudy' | 'drizzle' | string;
}

export interface NpcEmergentReaction {
  readonly state: EmergentActivityState;
  readonly facing: Direction;
  readonly swayScale: number;
  readonly bubbleText: string | null;
}

export function evaluateNpcReaction(input: NpcEmergentReactionInput): NpcEmergentReaction {
  const hasPlayer = input.playerX !== null && input.playerY !== null;
  const dx = hasPlayer ? input.playerX! - input.npcX : 0;
  const dy = hasPlayer ? input.playerY! - input.npcY : 1;
  const dist = hasPlayer ? Math.hypot(dx, dy) : Infinity;

  if (dist <= 44) {
    const facing: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
    const bubbleText =
      input.playerPosture !== 'none' ? '✨' : input.weatherKind === 'drizzle' ? '☔' : '♪';
    return { state: 'interacting', facing, swayScale: 0.25, bubbleText };
  }

  if (input.isNight) {
    return { state: 'sleeping', facing: 'down', swayScale: 0.15, bubbleText: null };
  }

  return {
    state: 'waiting',
    facing: 'down',
    swayScale: input.weatherKind === 'drizzle' ? 0.5 : 1,
    bubbleText: null,
  };
}

export interface NpcWaypoint {
  readonly x: number;
  readonly y: number;
}

export interface NpcRoutineState {
  readonly homeX: number;
  readonly homeY: number;
  readonly waypoints: readonly NpcWaypoint[];
  x: number;
  y: number;
  facing: Direction;
  moving: boolean;
  activity: EmergentActivityState;
  bubbleText: string | null;
  waypointIndex: number;
  pauseUntilMs: number;
  phase: number;
}

export function createNpcRoutineState(
  homeX: number,
  homeY: number,
  waypoints: readonly NpcWaypoint[],
  phase = 0,
): NpcRoutineState {
  return {
    homeX,
    homeY,
    waypoints: waypoints.length > 0 ? waypoints : [{ x: homeX, y: homeY }],
    x: homeX,
    y: homeY,
    facing: 'down',
    moving: false,
    activity: 'waiting',
    bubbleText: null,
    waypointIndex: 0,
    pauseUntilMs: 0,
    phase,
  };
}

export interface NpcRoutineContext {
  nowMs: number;
  dtSec: number;
  tilePx: number;
  playerX: number | null;
  playerY: number | null;
  playerPosture: CouplePostureKind;
  isNight: boolean;
  weatherKind: string;
  talkingToPlayer?: boolean;
  isTileBlocked?: (tx: number, ty: number) => boolean;
  actorObstacles?: readonly ActorCollider[];
}

function directionFromDelta(dx: number, dy: number, fallback: Direction): Direction {
  if (Math.hypot(dx, dy) < 0.5) return fallback;
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
}

export function stepNpcRoutine(state: NpcRoutineState, ctx: NpcRoutineContext): NpcRoutineState {
  const dt = Math.max(0.004, Math.min(0.1, Number.isFinite(ctx.dtSec) ? ctx.dtSec : 0.016));
  const distToPlayer =
    ctx.playerX !== null && ctx.playerY !== null
      ? Math.hypot(ctx.playerX - state.x, ctx.playerY - state.y)
      : Infinity;

  if (ctx.talkingToPlayer || distToPlayer <= 56) {
    if (ctx.playerX !== null && ctx.playerY !== null) {
      state.facing = directionFromDelta(ctx.playerX - state.x, ctx.playerY - state.y, state.facing);
    }
    state.moving = false;
    state.activity = 'interacting';
    state.bubbleText = ctx.playerPosture !== 'none' ? '✨' : ctx.weatherKind === 'drizzle' ? '☔' : '👋';
    return state;
  }

  state.bubbleText = null;
  const target = ctx.isNight
    ? { x: state.homeX, y: state.homeY }
    : state.waypoints[state.waypointIndex % state.waypoints.length]!;

  if (ctx.nowMs < state.pauseUntilMs) {
    state.moving = false;
    state.activity = ctx.isNight ? 'sleeping' : 'waiting';
    return state;
  }

  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= 1.5) {
    state.x = target.x;
    state.y = target.y;
    state.moving = false;
    state.activity = ctx.isNight ? 'sleeping' : 'waiting';
    if (!ctx.isNight && state.waypoints.length > 1) {
      state.waypointIndex = (state.waypointIndex + 1) % state.waypoints.length;
    }
    state.pauseUntilMs = ctx.nowMs + (ctx.isNight ? 4500 : 3200 + ((state.phase * 700) % 1800));
    state.facing = 'down';
    return state;
  }

  const speed = ctx.weatherKind === 'drizzle' ? 14 : 18;
  const step = Math.min(speed * dt, dist);
  const nextX = state.x + (dx / dist) * step;
  const nextY = state.y + (dy / dist) * step;
  const actorBlocked =
    Boolean(ctx.actorObstacles?.length) &&
    isBlockedByActorColliders(nextX, nextY, state.x, state.y, NPC_ACTOR_RADIUS_PX, ctx.actorObstacles!);
  if (!actorBlocked && canActorStand(nextX, nextY, Math.max(1, ctx.tilePx), ctx.isTileBlocked)) {
    state.x = nextX;
    state.y = nextY;
    state.facing = directionFromDelta(dx, dy, state.facing);
    state.moving = true;
    state.activity = 'wandering';
  } else {
    state.moving = false;
    state.activity = 'waiting';
    if (!actorBlocked && state.waypoints.length > 1) {
      state.waypointIndex = (state.waypointIndex + 1) % state.waypoints.length;
    }
    state.pauseUntilMs = ctx.nowMs + (actorBlocked ? 650 : 2200);
  }
  return state;
}

export interface OverworldCatEmergentInput {
  isNight: boolean;
  isStudying: boolean;
  playerPosture: CouplePostureKind;
  playerFarmingActive: boolean;
  nearestChickenDistPx: number;
  nowMs: number;
}

export interface OverworldCatEmergentDecision {
  readonly state: EmergentActivityState;
  readonly intent: 'sit' | 'sleep' | 'idle';
  readonly bubbleText: string | null;
}

export function evaluateOverworldCatEmergentBehavior(
  input: OverworldCatEmergentInput,
): OverworldCatEmergentDecision {
  if (input.isStudying) {
    return { state: 'sitting', intent: 'sit', bubbleText: 'Purr~' };
  }
  if (input.playerPosture === 'lie_bed' || input.isNight) {
    return { state: 'sleeping', intent: 'sleep', bubbleText: 'zzz~' };
  }
  if (input.playerPosture === 'sit_sofa' || input.playerPosture === 'sit_bench') {
    return { state: 'sitting', intent: 'sit', bubbleText: 'Purr~' };
  }
  if (input.playerFarmingActive) {
    return { state: 'watching_farm', intent: 'sit', bubbleText: null };
  }
  if (input.nearestChickenDistPx < 38) {
    return { state: 'interacting', intent: 'idle', bubbleText: 'Mrow?' };
  }
  return { state: 'idle', intent: 'idle', bubbleText: null };
}
