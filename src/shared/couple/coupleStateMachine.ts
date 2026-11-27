import type { CoupleInteractionKind } from './coupleTypes';

export type CoupleAnimationPhase =
  | 'approach'
  | 'embrace'
  | 'hold'
  | 'reach'
  | 'connect'
  | 'idle'
  | 'walk'
  | 'release';

export interface CouplePhaseSnapshot {
  phase: CoupleAnimationPhase;
  /** Normalized progress within the current phase (0..1). */
  phaseProgress: number;
  /** Arm reach/embrace engagement weight (0 = detached, 1 = full contact). */
  contactWeight: number;
  /** Total normalized step-in alpha toward paired alignment (0..1). */
  approachAlpha: number;
  /** True once a release sequence has completed and posture should reset to 'none'. */
  releaseComplete: boolean;
}

export const HUG_APPROACH_MS = 320;
export const HUG_EMBRACE_MS = 420;
export const HUG_RELEASE_MS = 300;

export const HOLD_REACH_MS = 260;
export const HOLD_CONNECT_MS = 220;
export const HOLD_RELEASE_MS = 220;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Deterministic timestamp-based P0 phase evaluator shared by both multiplayer clients
 * so approach/embrace/hold/release and reach/connect/idle/walk/release stay aligned.
 */
export function evaluateCouplePhase(
  kind: CoupleInteractionKind,
  phaseStartedAtMs: number,
  nowMs: number,
  options?: {
    moving?: boolean;
    releasing?: boolean;
    releaseStartedAtMs?: number | null;
  },
): CouplePhaseSnapshot {
  const elapsed = Math.max(0, nowMs - phaseStartedAtMs);

  if (options?.releasing && options.releaseStartedAtMs != null) {
    const relDur = kind === 'hug' ? HUG_RELEASE_MS : HOLD_RELEASE_MS;
    const relElapsed = Math.max(0, nowMs - options.releaseStartedAtMs);
    const p = Math.min(1, relElapsed / relDur);
    return {
      phase: 'release',
      phaseProgress: p,
      contactWeight: 1 - smoothstep(p),
      approachAlpha: 1 - smoothstep(p),
      releaseComplete: p >= 1,
    };
  }

  if (kind === 'hug') {
    if (elapsed < HUG_APPROACH_MS) {
      const p = elapsed / HUG_APPROACH_MS;
      return {
        phase: 'approach',
        phaseProgress: p,
        contactWeight: smoothstep(p) * 0.25,
        approachAlpha: smoothstep(p),
        releaseComplete: false,
      };
    }
    if (elapsed < HUG_APPROACH_MS + HUG_EMBRACE_MS) {
      const p = (elapsed - HUG_APPROACH_MS) / HUG_EMBRACE_MS;
      return {
        phase: 'embrace',
        phaseProgress: p,
        contactWeight: 0.25 + smoothstep(p) * 0.75,
        approachAlpha: 1,
        releaseComplete: false,
      };
    }
    return {
      phase: 'hold',
      phaseProgress: 1,
      contactWeight: 1,
      approachAlpha: 1,
      releaseComplete: false,
    };
  }

  // hold_hands P0 sequence: reach -> connect -> idle / walk
  if (elapsed < HOLD_REACH_MS) {
    const p = elapsed / HOLD_REACH_MS;
    return {
      phase: 'reach',
      phaseProgress: p,
      contactWeight: smoothstep(p) * 0.85,
      approachAlpha: smoothstep(p),
      releaseComplete: false,
    };
  }
  if (elapsed < HOLD_REACH_MS + HOLD_CONNECT_MS) {
    const p = (elapsed - HOLD_REACH_MS) / HOLD_CONNECT_MS;
    return {
      phase: 'connect',
      phaseProgress: p,
      contactWeight: 0.85 + smoothstep(p) * 0.15,
      approachAlpha: 1,
      releaseComplete: false,
    };
  }
  return {
    phase: options?.moving ? 'walk' : 'idle',
    phaseProgress: 1,
    contactWeight: 1,
    approachAlpha: 1,
    releaseComplete: false,
  };
}
