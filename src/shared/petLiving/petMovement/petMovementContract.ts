/**
 * Mission 04B-1 — movement / animation runtime contract (client simulation).
 * Brain intents are read-only input; outputs are proposals for 04B-2 verification.
 */

import type { PetActionIntent } from '../petBrainContract04B';
import type { PetAnimState, PetFacing } from '../petVisualTypes';
import type { PetBehaviorIntent } from './petLocomotionModel';

export type PetNavigationStatus =
  | 'idle'
  | 'planning'
  | 'navigating'
  | 'arriving'
  | 'performing'
  | 'proposed_complete'
  | 'failed'
  | 'cancelled';

export interface PetMovementWorldTarget {
  readonly targetId: string;
  readonly anchorPixelX: number;
  readonly anchorPixelY: number;
  readonly objectPixelX: number;
  readonly objectPixelY: number;
  readonly available: boolean;
  readonly reachable: boolean;
}

export interface PetMovementExecutorSnapshot {
  readonly instanceId: string | null;
  readonly actionId: string | null;
  readonly targetId: string | null;
  readonly status: PetNavigationStatus;
  readonly positionX: number;
  readonly positionY: number;
  readonly destinationX: number;
  readonly destinationY: number;
  readonly facing: PetFacing;
  readonly animState: PetAnimState;
  readonly behaviorIntent: PetBehaviorIntent;
  readonly pathWaypointIndex: number;
  readonly pathLength: number;
  readonly arrived: boolean;
  readonly animationPhase: 'travel' | 'interact' | 'none';
  readonly animationStartedAtMs: number | null;
  readonly lastProgressAtMs: number;
  readonly repathCount: number;
  readonly failureReasonVi: string | null;
}

/** Emitted when movement+animation finished locally — NOT authoritative consumption. */
export interface PetMovementCompletionProposal {
  readonly kind: 'movement_ready' | 'animation_finished' | 'nav_failed' | 'nav_cancelled';
  readonly instanceId: string;
  readonly actionId: string;
  readonly targetId: string;
  readonly atMs: number;
  readonly clientPosition: { x: number; y: number };
  readonly clientFacing: PetFacing;
  readonly failureReasonVi?: string;
}

export interface PetMovementTickInput {
  readonly nowMs: number;
  readonly dtMs: number;
  readonly intent: PetActionIntent | null;
  readonly interrupt: boolean;
  readonly targets: readonly PetMovementWorldTarget[];
}

export interface PetMovementTickOutput {
  readonly snapshot: PetMovementExecutorSnapshot;
  readonly proposals: readonly PetMovementCompletionProposal[];
}

export type { PetActionIntent };