import type { Direction } from '../types';
import type { CouplePostureKind } from '../couple/coupleTypes';

export type EmergentActivityState =
  | 'idle'
  | 'wandering'
  | 'pecking'
  | 'startled_hop'
  | 'curious_seed'
  | 'roosting_sleep'
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
  };
}

export interface EmergentChickenContext {
  nowMs: number;
  dtSec: number;
  tilePx: number;
  playerX: number | null;
  playerY: number | null;
  playerRunning: boolean;
  toolSwinging: boolean;
  heldItemSku: string | null;
  isNight: boolean;
  weatherKind: 'sunny' | 'cloudy' | 'drizzle' | string;
  isTileBlocked?: (tx: number, ty: number) => boolean;
}

function canChickenStand(x: number, y: number, tilePx: number, isTileBlocked?: (tx: number, ty: number) => boolean): boolean {
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

  // Rule 1: Night roosting (exempt from wander churn)
  if (ctx.isNight) {
    state.activity = 'roosting_sleep';
    state.vx = 0;
    state.vy = 0;
    return state;
  }

  // Rule 2: Startle away briefly if player sprints/swings tool right beside chicken
  if ((ctx.playerRunning || ctx.toolSwinging) && distToPlayer < 36 && ctx.nowMs >= state.stateUntilMs) {
    const awayX = ctx.playerX !== null ? state.x - ctx.playerX : 1;
    const awayY = ctx.playerY !== null ? state.y - ctx.playerY : 0;
    const len = Math.max(1e-4, Math.hypot(awayX, awayY));
    state.activity = 'startled_hop';
    state.vx = (awayX / len) * 26;
    state.vy = (awayY / len) * 26;
    state.facing = state.vx >= 0 ? 'right' : 'left';
    state.stateUntilMs = ctx.nowMs + 750;
    state.nextThinkAtMs = ctx.nowMs + 1400;
  } else if (ctx.nowMs >= state.stateUntilMs && ctx.heldItemSku?.startsWith('seed_') && distToPlayer < 64) {
    // Rule 3: Holding seeds draws curious chickens closer without overlapping player
    state.activity = 'curious_seed';
    if (distToPlayer > 18 && ctx.playerX !== null && ctx.playerY !== null) {
      const dx = ctx.playerX - state.x;
      const dy = ctx.playerY - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.vx = (dx / len) * 14;
      state.vy = (dy / len) * 14;
      state.facing = state.vx >= 0 ? 'right' : 'left';
    } else {
      state.vx = 0;
      state.vy = 0;
    }
    state.nextThinkAtMs = ctx.nowMs + 900;
  } else if (ctx.nowMs >= state.nextThinkAtMs && ctx.nowMs >= state.stateUntilMs) {
    // Rule 4: Calm home pecking vs tight drizzle stroll
    const maxRadius = ctx.weatherKind === 'drizzle' ? 14 : 34;
    const slot = Math.floor((ctx.nowMs + state.phase * 1000) / 2600);
    if (slot % 3 === 0) {
      state.activity = 'pecking';
      state.vx = 0;
      state.vy = 0;
      state.nextThinkAtMs = ctx.nowMs + 1800;
    } else {
      const angle = (slot * 2.39996 + state.phase) % (Math.PI * 2);
      const targetX = state.homeX + Math.cos(angle) * maxRadius * 0.72;
      const targetY = state.homeY + Math.sin(angle) * maxRadius * 0.52;
      const dx = targetX - state.x;
      const dy = targetY - state.y;
      const len = Math.max(1e-4, Math.hypot(dx, dy));
      state.activity = 'wandering';
      state.vx = (dx / len) * 10.5;
      state.vy = (dy / len) * 10.5;
      state.facing = state.vx >= 0 ? 'right' : 'left';
      state.nextThinkAtMs = ctx.nowMs + 2200;
    }
  }

  if (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01) {
    const nextX = state.x + state.vx * dt;
    const nextY = state.y + state.vy * dt;
    const homeDist = Math.hypot(nextX - state.homeX, nextY - state.homeY);
    const maxFenceDist = state.activity === 'curious_seed' ? 68 : 42;
    if (homeDist <= maxFenceDist && canChickenStand(nextX, nextY, tilePx, ctx.isTileBlocked)) {
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
  const sitPhase = Math.floor(input.nowMs / 6500) % 2 === 0;
  return {
    state: sitPhase ? 'sitting' : 'waiting',
    intent: sitPhase ? 'sit' : 'idle',
    bubbleText: sitPhase ? 'Purr~' : 'Mrow?',
  };
}
