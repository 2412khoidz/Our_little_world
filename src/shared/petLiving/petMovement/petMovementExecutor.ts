import { MAP_DEFINITIONS, TILE_SIZE } from '../../maps';
import { getActionAnimationSpec } from './petActionAnimationMap';
import {
  PET_HOME_MAP_ID,
  buildHomeMovementBlockedTiles,
  findNavAnchor,
  pixelToTile,
  tileCenterPixel,
} from './petHomeNavLayout';
import type {
  PetMovementCompletionProposal,
  PetMovementExecutorSnapshot,
  PetMovementTickInput,
  PetMovementTickOutput,
  PetMovementWorldTarget,
} from './petMovementContract';
import {
  createLocomotionSnapshot,
  stepPetLocomotion,
  type PetBehaviorIntent,
  type PetLocomotionSnapshot,
} from './petLocomotionModel';
import { findTilePath, type GridPoint } from './tilePathfinding';

const ARRIVAL_TOLERANCE_PX = 3.5;
const STUCK_MS = 4500;
const MIN_PROGRESS_PX = 0.35;
const MAX_REPATH = 4;
const REPATH_INTERVAL_MS = 1200;
const APPROACH_SNIFF_MS = 900;

export interface PetMovementExecutorState {
  readonly loco: PetLocomotionSnapshot;
  readonly blocked: ReadonlySet<string>;
  readonly path: readonly GridPoint[];
  readonly waypointIndex: number;
  readonly status: PetMovementExecutorSnapshot['status'];
  readonly activeInstanceId: string | null;
  readonly activeActionId: string | null;
  readonly activeTargetId: string | null;
  readonly destinationX: number;
  readonly destinationY: number;
  readonly animationPhase: 'travel' | 'interact' | 'none';
  readonly animationStartedAtMs: number | null;
  readonly approachPhase: 'none' | 'sniff';
  readonly approachStartedAtMs: number | null;
  readonly lastProgressAtMs: number;
  readonly lastProgressX: number;
  readonly lastProgressY: number;
  readonly repathCount: number;
  readonly lastRepathAtMs: number;
  readonly failureReasonVi: string | null;
  readonly proposedInstanceIds: Set<string>;
}

export function createPetMovementExecutorState(startX?: number, startY?: number): PetMovementExecutorState {
  const x = startX ?? 13.5 * TILE_SIZE;
  const y = startY ?? 10.2 * TILE_SIZE;
  const now = 0;
  return {
    loco: createLocomotionSnapshot(x, y),
    blocked: buildHomeMovementBlockedTiles(),
    path: [],
    waypointIndex: 0,
    status: 'idle',
    activeInstanceId: null,
    activeActionId: null,
    activeTargetId: null,
    destinationX: x,
    destinationY: y,
    animationPhase: 'none',
    animationStartedAtMs: null,
    approachPhase: 'none',
    approachStartedAtMs: null,
    lastProgressAtMs: now,
    lastProgressX: x,
    lastProgressY: y,
    repathCount: 0,
    lastRepathAtMs: 0,
    failureReasonVi: null,
    proposedInstanceIds: new Set(),
  };
}

function resolveTarget(
  targetId: string,
  targets: readonly PetMovementWorldTarget[],
): PetMovementWorldTarget | null {
  const live = targets.find((t) => t.targetId === targetId);
  if (live) return live;
  if (targets.length > 0) return null;
  const anchor = findNavAnchor(targetId);
  if (!anchor) return null;
  return {
    targetId,
    anchorPixelX: anchor.anchorPixelX,
    anchorPixelY: anchor.anchorPixelY,
    objectPixelX: anchor.objectPixelX,
    objectPixelY: anchor.objectPixelY,
    available: true,
    reachable: true,
  };
}

function planPath(
  state: PetMovementExecutorState,
  destTile: GridPoint,
): { path: GridPoint[]; destination: { x: number; y: number } } | null {
  const map = MAP_DEFINITIONS[PET_HOME_MAP_ID];
  const start = pixelToTile(state.loco.x, state.loco.y);
  const path = findTilePath(start, destTile, map.widthTiles, map.heightTiles, state.blocked);
  if (path.length === 0 && (start.tileX !== destTile.tileX || start.tileY !== destTile.tileY)) {
    return null;
  }
  const tail = path.length > 0 ? path[path.length - 1]! : destTile;
  const destination = tileCenterPixel(tail);
  return { path, destination };
}

function snapshotFrom(state: PetMovementExecutorState): PetMovementExecutorSnapshot {
  return {
    instanceId: state.activeInstanceId,
    actionId: state.activeActionId,
    targetId: state.activeTargetId,
    status: state.status,
    positionX: state.loco.x,
    positionY: state.loco.y,
    destinationX: state.destinationX,
    destinationY: state.destinationY,
    facing: state.loco.facing,
    animState: state.loco.animState,
    behaviorIntent: state.loco.committedIntent,
    pathWaypointIndex: state.waypointIndex,
    pathLength: state.path.length,
    arrived:
      state.status === 'performing' ||
      state.status === 'proposed_complete' ||
      Math.hypot(state.loco.x - state.destinationX, state.loco.y - state.destinationY) <=
        ARRIVAL_TOLERANCE_PX,
    animationPhase: state.animationPhase,
    animationStartedAtMs: state.animationStartedAtMs,
    lastProgressAtMs: state.lastProgressAtMs,
    repathCount: state.repathCount,
    failureReasonVi: state.failureReasonVi,
  };
}

function proposalKey(proposal: PetMovementCompletionProposal): string {
  return `${proposal.instanceId}:${proposal.kind}`;
}

function pushProposal(
  list: PetMovementCompletionProposal[],
  proposed: Set<string>,
  proposal: PetMovementCompletionProposal,
): void {
  const key = proposalKey(proposal);
  if (proposed.has(key)) return;
  proposed.add(key);
  list.push(proposal);
}

export function tickPetMovement(
  state: PetMovementExecutorState,
  input: PetMovementTickInput,
): { state: PetMovementExecutorState; output: PetMovementTickOutput } {
  const proposals: PetMovementCompletionProposal[] = [];
  const proposed = new Set(state.proposedInstanceIds);
  let next: PetMovementExecutorState = { ...state, proposedInstanceIds: proposed };
  const dtSec = Math.max(0, input.dtMs) / 1000;
  const { nowMs } = input;

  const cancelActive = () => {
    if (next.activeInstanceId) {
      pushProposal(proposals, proposed, {
        kind: 'nav_cancelled',
        instanceId: next.activeInstanceId,
        actionId: next.activeActionId ?? 'unknown',
        targetId: next.activeTargetId ?? 'unknown',
        atMs: nowMs,
        clientPosition: { x: next.loco.x, y: next.loco.y },
        clientFacing: next.loco.facing,
        failureReasonVi: 'Hủy điều hướng',
      });
    }
    next = {
      ...next,
      status: 'idle',
      path: [],
      waypointIndex: 0,
      activeInstanceId: null,
      activeActionId: null,
      activeTargetId: null,
      animationPhase: 'none',
      animationStartedAtMs: null,
      approachPhase: 'none',
      approachStartedAtMs: null,
      failureReasonVi: null,
      loco: stepPetLocomotion(next.loco, {
        intent: 'idle',
        targetX: next.loco.x,
        targetY: next.loco.y,
        dtSec,
        nowMs,
      }),
    };
  };

  if (input.interrupt && next.status !== 'idle') {
    cancelActive();
  }

  const intent = input.intent;
  const alreadyCompleted = intent
    ? next.proposedInstanceIds.has(`${intent.instanceId}:animation_finished`)
    : false;
  const shouldStart =
    intent &&
    !alreadyCompleted &&
    intent.instanceId !== next.activeInstanceId &&
    (next.status === 'idle' ||
      next.status === 'failed' ||
      next.status === 'cancelled' ||
      next.status === 'proposed_complete');

  if (shouldStart && intent) {
    const target = resolveTarget(intent.targetId, input.targets);
    if (!target || !target.available || !target.reachable) {
      pushProposal(proposals, proposed, {
        kind: 'nav_failed',
        instanceId: intent.instanceId,
        actionId: intent.actionId,
        targetId: intent.targetId,
        atMs: nowMs,
        clientPosition: { x: next.loco.x, y: next.loco.y },
        clientFacing: next.loco.facing,
        failureReasonVi: 'Đích không khả dụng hoặc không tới được',
      });
      next = {
        ...next,
        status: 'failed',
        failureReasonVi: 'Đích không khả dụng hoặc không tới được',
        activeInstanceId: null,
      };
    } else {
      const destTile = pixelToTile(target.anchorPixelX, target.anchorPixelY);
      const planned = planPath(next, destTile);
      if (!planned) {
        pushProposal(proposals, proposed, {
          kind: 'nav_failed',
          instanceId: intent.instanceId,
          actionId: intent.actionId,
          targetId: intent.targetId,
          atMs: nowMs,
          clientPosition: { x: next.loco.x, y: next.loco.y },
          clientFacing: next.loco.facing,
          failureReasonVi: 'Không tìm được đường (vật cản)',
        });
        next = { ...next, status: 'failed', failureReasonVi: 'Không tìm được đường (vật cản)' };
      } else {
        const spec = getActionAnimationSpec(intent.actionId);
        next = {
          ...next,
          status: planned.path.length === 0 ? 'arriving' : 'navigating',
          path: planned.path,
          waypointIndex: 0,
          destinationX: planned.destination.x,
          destinationY: planned.destination.y,
          activeInstanceId: intent.instanceId,
          activeActionId: intent.actionId,
          activeTargetId: intent.targetId,
          animationPhase: 'travel',
          animationStartedAtMs: nowMs,
          approachPhase: spec.cautiousApproach || spec.approachIntent === 'sniff' ? 'sniff' : 'none',
          approachStartedAtMs: spec.cautiousApproach ? nowMs : null,
          repathCount: 0,
          lastRepathAtMs: nowMs,
          failureReasonVi: null,
        };
      }
    }
  }

  if (next.activeInstanceId && intent && intent.instanceId === next.activeInstanceId) {
    const target = resolveTarget(intent.targetId, input.targets);
    if (!target || !target.available) {
      cancelActive();
      if (intent) {
        pushProposal(proposals, proposed, {
          kind: 'nav_cancelled',
          instanceId: intent.instanceId,
          actionId: intent.actionId,
          targetId: intent.targetId,
          atMs: nowMs,
          clientPosition: { x: next.loco.x, y: next.loco.y },
          clientFacing: next.loco.facing,
          failureReasonVi: 'Mục tiêu biến mất',
        });
      }
    } else if (
      target.reachable &&
      nowMs - next.lastRepathAtMs >= REPATH_INTERVAL_MS &&
      next.repathCount < MAX_REPATH &&
      (next.status === 'navigating' || next.status === 'planning')
    ) {
      const destTile = pixelToTile(target.anchorPixelX, target.anchorPixelY);
      const replanned = planPath(next, destTile);
      if (replanned && replanned.path.length > 0) {
        const destMoved =
          Math.hypot(replanned.destination.x - next.destinationX, replanned.destination.y - next.destinationY) >
          TILE_SIZE;
        if (destMoved) {
          next = {
            ...next,
            path: replanned.path,
            waypointIndex: 0,
            destinationX: replanned.destination.x,
            destinationY: replanned.destination.y,
            repathCount: next.repathCount + 1,
            lastRepathAtMs: nowMs,
          };
        }
      }
    }
  }

  if (next.status === 'navigating' || next.status === 'arriving') {
    const spec = next.activeActionId ? getActionAnimationSpec(next.activeActionId) : null;
    let waypointX = next.destinationX;
    let waypointY = next.destinationY;
    if (next.path.length > 0 && next.waypointIndex < next.path.length) {
      const wp = tileCenterPixel(next.path[next.waypointIndex]!);
      waypointX = wp.x;
      waypointY = wp.y;
    }

    const travelIntent: PetBehaviorIntent =
      spec?.travelIntent === 'run' ? 'run' : 'move';
    next = {
      ...next,
      loco: stepPetLocomotion(next.loco, {
        intent: travelIntent,
        targetX: waypointX,
        targetY: waypointY,
        dtSec,
        nowMs,
      }),
    };

    const moved = Math.hypot(next.loco.x - next.lastProgressX, next.loco.y - next.lastProgressY);
    if (moved >= MIN_PROGRESS_PX) {
      next = {
        ...next,
        lastProgressAtMs: nowMs,
        lastProgressX: next.loco.x,
        lastProgressY: next.loco.y,
      };
    } else if (nowMs - next.lastProgressAtMs > STUCK_MS) {
      if (next.activeInstanceId) {
        pushProposal(proposals, proposed, {
          kind: 'nav_failed',
          instanceId: next.activeInstanceId,
          actionId: next.activeActionId ?? 'unknown',
          targetId: next.activeTargetId ?? 'unknown',
          atMs: nowMs,
          clientPosition: { x: next.loco.x, y: next.loco.y },
          clientFacing: next.loco.facing,
          failureReasonVi: 'Kẹt đường — không tiến triển',
        });
      }
      next = {
        ...next,
        status: 'failed',
        failureReasonVi: 'Kẹt đường — không tiến triển',
        path: [],
      };
    }

    if (next.path.length > 0 && next.waypointIndex < next.path.length) {
      const wp = next.path[next.waypointIndex]!;
      const c = tileCenterPixel(wp);
      if (Math.hypot(next.loco.x - c.x, next.loco.y - c.y) <= ARRIVAL_TOLERANCE_PX + 2) {
        const idx = next.waypointIndex + 1;
        next = {
          ...next,
          waypointIndex: idx,
          status: idx >= next.path.length ? 'arriving' : 'navigating',
        };
      }
    }

    const atDest =
      Math.hypot(next.loco.x - next.destinationX, next.loco.y - next.destinationY) <= ARRIVAL_TOLERANCE_PX;
    if (atDest) {
      const anchor = next.activeTargetId ? findNavAnchor(next.activeTargetId) : null;
      const facing = anchor?.preferredFacing;
      if (next.approachPhase === 'sniff' && next.approachStartedAtMs !== null) {
        if (nowMs - next.approachStartedAtMs < APPROACH_SNIFF_MS) {
          next = {
            ...next,
            status: 'arriving',
            loco: stepPetLocomotion(next.loco, {
              intent: 'sniff',
              targetX: next.loco.x,
              targetY: next.loco.y,
              preferredFacing: facing,
              dtSec,
              nowMs,
            }),
          };
        } else {
          next = {
            ...next,
            status: 'performing',
            animationPhase: 'interact',
            animationStartedAtMs: nowMs,
            approachPhase: 'none',
          };
          if (next.activeInstanceId) {
            pushProposal(proposals, proposed, {
              kind: 'movement_ready',
              instanceId: next.activeInstanceId,
              actionId: next.activeActionId ?? 'unknown',
              targetId: next.activeTargetId ?? 'unknown',
              atMs: nowMs,
              clientPosition: { x: next.loco.x, y: next.loco.y },
              clientFacing: next.loco.facing,
            });
          }
        }
      } else {
        next = {
          ...next,
          status: 'performing',
          animationPhase: 'interact',
          animationStartedAtMs: nowMs,
          loco: stepPetLocomotion(next.loco, {
            intent: spec?.approachIntent === 'sit' ? 'sit' : 'idle',
            targetX: next.loco.x,
            targetY: next.loco.y,
            preferredFacing: facing,
            dtSec,
            nowMs,
          }),
        };
        if (next.activeInstanceId) {
          pushProposal(proposals, proposed, {
            kind: 'movement_ready',
            instanceId: next.activeInstanceId,
            actionId: next.activeActionId ?? 'unknown',
            targetId: next.activeTargetId ?? 'unknown',
            atMs: nowMs,
            clientPosition: { x: next.loco.x, y: next.loco.y },
            clientFacing: next.loco.facing,
          });
        }
      }
    }
  }

  if (
    next.status === 'performing' &&
    next.activeActionId &&
    next.animationStartedAtMs !== null
  ) {
    const spec = getActionAnimationSpec(next.activeActionId);
    const anchor = next.activeTargetId ? findNavAnchor(next.activeTargetId) : null;
    const performStartedAt = next.animationStartedAtMs;
    next = {
      ...next,
      loco: stepPetLocomotion(next.loco, {
        intent: spec.performIntent,
        targetX: next.loco.x,
        targetY: next.loco.y,
        preferredFacing: anchor?.preferredFacing,
        dtSec,
        nowMs,
      }),
    };
    const elapsed = nowMs - performStartedAt;
    if (elapsed >= spec.performDurationMs) {
      if (next.activeInstanceId) {
        pushProposal(proposals, proposed, {
          kind: 'animation_finished',
          instanceId: next.activeInstanceId,
          actionId: next.activeActionId ?? 'unknown',
          targetId: next.activeTargetId ?? 'unknown',
          atMs: nowMs,
          clientPosition: { x: next.loco.x, y: next.loco.y },
          clientFacing: next.loco.facing,
        });
      }
      next = {
        ...next,
        status: 'proposed_complete',
        animationPhase: 'none',
      };
    }
  }

  if (next.status === 'proposed_complete' || next.status === 'failed' || next.status === 'cancelled') {
    // Hold pose briefly then idle on next tick without intent
    if (!intent || intent.instanceId !== next.activeInstanceId) {
      next = {
        ...next,
        status: 'idle',
        activeInstanceId: null,
        activeActionId: null,
        activeTargetId: null,
        loco: stepPetLocomotion(next.loco, {
          intent: 'idle',
          targetX: next.loco.x,
          targetY: next.loco.y,
          dtSec,
          nowMs,
        }),
      };
    }
  }

  return {
    state: { ...next, proposedInstanceIds: proposed },
    output: { snapshot: snapshotFrom(next), proposals },
  };
}

export function serializePetMovementState(state: PetMovementExecutorState): string {
  return JSON.stringify({
    loco: state.loco,
    path: state.path,
    waypointIndex: state.waypointIndex,
    status: state.status,
    activeInstanceId: state.activeInstanceId,
    activeActionId: state.activeActionId,
    activeTargetId: state.activeTargetId,
    destinationX: state.destinationX,
    destinationY: state.destinationY,
    animationPhase: state.animationPhase,
    animationStartedAtMs: state.animationStartedAtMs,
    approachPhase: state.approachPhase,
    approachStartedAtMs: state.approachStartedAtMs,
    lastProgressAtMs: state.lastProgressAtMs,
    lastProgressX: state.lastProgressX,
    lastProgressY: state.lastProgressY,
    repathCount: state.repathCount,
    lastRepathAtMs: state.lastRepathAtMs,
    failureReasonVi: state.failureReasonVi,
    proposedInstanceIds: [...state.proposedInstanceIds],
  });
}

export function deserializePetMovementState(
  json: string,
  blocked = buildHomeMovementBlockedTiles(),
): PetMovementExecutorState {
  const raw = JSON.parse(json) as Omit<PetMovementExecutorState, 'blocked' | 'proposedInstanceIds'> & {
    proposedInstanceIds: string[];
  };
  return {
    ...raw,
    blocked,
    proposedInstanceIds: new Set(raw.proposedInstanceIds ?? []),
  };
}