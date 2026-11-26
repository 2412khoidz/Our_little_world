import {
  PET_PERSONALITY_PRESETS,
  createDefault8Needs,
  derive9Emotion,
  getSubtleBehaviorHintVi,
  type Pet8Needs,
  type PetPersonalityTraits,
} from '../../shared/petLiving/petIntelligenceConfig';
import {
  createPetBrainState,
  snapshotToInput,
  tickPetBrain,
  type PetBrainState,
} from '../../shared/petLiving/petAutonomousController';
import type { PetFoodOfferInput } from '../../shared/petLiving/petBrainContract04B';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import {
  buildMainGameBlockedGrid,
  buildMainGamePetAffordances,
  type MainGamePetWorldHints,
} from '../../shared/petLiving/mainGame/petMainGameAffordances';
import { createMainGamePetAuthorityPort, type PetAuthorityPort } from '../../shared/petLiving/mainGame/petAuthorityPort';
import {
  movementTargetFromAffordances,
  selectMovementIntent,
} from '../../shared/petLiving/petMovement/petMovementBrainAdapter';
import {
  createPetMovementExecutorState,
  tickPetMovement,
  type PetMovementExecutorState,
} from '../../shared/petLiving/petMovement/petMovementExecutor';
import {
  applyAcceptedDisplacementToLocomotion,
  createLocomotionSnapshot,
  resolveFacingFromVector,
  stepPetLocomotion,
  type PetLocomotionSnapshot,
} from '../../shared/petLiving/petMovement/petLocomotionModel';
import type { FurniturePlacement, MapId } from '../../shared/types';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import { evaluateOverworldCatEmergentBehavior } from '../../shared/world/emergentWorldBehavior';
import { getMapDefinition, TILE_SIZE } from '../../shared/maps';
import type { LivingPetDevTelemetry } from '../../shared/petLiving/mainGame/livingPetDevTelemetry';
import {
  computeActorSeparationPush,
  isBlockedByActorColliders,
  PET_ACTOR_RADIUS_PX,
  PLAYER_ACTOR_RADIUS_PX,
  type ActorCollider,
} from '../../shared/movement/actorCollision';

const BRAIN_TICK_MS = 2000;
export const FOLLOW_CAT_MAPS: ReadonlySet<MapId> = new Set([
  'home',
  'garden',
  'farm',
  'village',
  'beach',
  'forest',
]);

export interface PetLivingWorldFrame {
  mapId: MapId;
  placements: readonly FurniturePlacement[];
  nowMs: number;
  dtMs: number;
  isStudying: boolean;
  partnersSittingSofa: boolean;
  localPlayerX: number | null;
  localPlayerY: number | null;
  caregiverIds: readonly [string, string];
  foodOffer: PetFoodOfferInput | null;
  tilePx?: number;
  isTileBlocked?: (tileX: number, tileY: number) => boolean;
  npcObstacles?: readonly ActorCollider[];
  chickens?: ReadonlyArray<{ id: string; x: number; y: number }>;
  playerPosture?: CouplePostureKind;
  isNight?: boolean;
  weatherKind?: string;
  playerFarmingActive?: boolean;
  nearestChickenDistPx?: number;
}

const FOLLOW_OFFSETS: readonly [number, number][] = [
  [-16, 4],
  [16, 4],
  [-18, -8],
  [18, -8],
  [0, 16],
  [0, -14],
];

const PET_FOOT_RX = 4.2;
const PET_FOOT_RY = 3.2;

function buildPlacementSignature(mapId: MapId, placements: readonly FurniturePlacement[]): string {
  if (placements.length === 0) return mapId;
  const parts: string[] = [mapId];
  for (const p of placements) {
    if (p.mapId !== mapId) continue;
    parts.push(`${p.id}:${p.tileX},${p.tileY},${p.widthTiles}x${p.heightTiles}`);
  }
  return parts.join('|');
}

function isWorldPosNavigable(
  wx: number,
  wy: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
  npcObstacles?: readonly ActorCollider[],
  refX?: number,
  refY?: number,
): boolean {
  if (!Number.isFinite(wx) || !Number.isFinite(wy) || tilePx <= 0) return false;
  if (
    wx - PET_FOOT_RX < 2 ||
    wy - PET_FOOT_RY < 2 ||
    wx + PET_FOOT_RX > worldW - 2 ||
    wy + 1.5 > worldH - 2
  ) {
    return false;
  }

  const checks: readonly [number, number][] = [
    [wx, wy],
    [wx - PET_FOOT_RX, wy - PET_FOOT_RY],
    [wx + PET_FOOT_RX, wy - PET_FOOT_RY],
    [wx - PET_FOOT_RX, wy + 1.5],
    [wx + PET_FOOT_RX, wy + 1.5],
  ];
  for (const [cx, cy] of checks) {
    if (isTileBlocked(Math.floor(cx / tilePx), Math.floor(cy / tilePx))) {
      return false;
    }
  }

  if (npcObstacles && npcObstacles.length > 0 && refX !== undefined && refY !== undefined) {
    if (isBlockedByActorColliders(wx, wy, refX, refY, PET_ACTOR_RADIUS_PX, npcObstacles)) {
      return false;
    }
  }

  return true;
}

function isSegmentWalkable(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
  npcObstacles?: readonly ActorCollider[],
): boolean {
  if (tilePx <= 0) return false;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 2));
  let prevX = x0;
  let prevY = y0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const sx = x0 + (x1 - x0) * t;
    const sy = y0 + (y1 - y0) * t;
    if (!isWorldPosNavigable(sx, sy, worldW, worldH, tilePx, isTileBlocked, npcObstacles, prevX, prevY)) {
      return false;
    }
    // Anti-diagonal-corner-cutting: if moving across both X & Y tile boundaries, check orthogonal corners
    const prevTx = Math.floor(prevX / tilePx);
    const prevTy = Math.floor(prevY / tilePx);
    const curTx = Math.floor(sx / tilePx);
    const curTy = Math.floor(sy / tilePx);
    if (curTx !== prevTx && curTy !== prevTy) {
      if (
        !isWorldPosNavigable(sx, prevY, worldW, worldH, tilePx, isTileBlocked, npcObstacles, prevX, prevY) ||
        !isWorldPosNavigable(prevX, sy, worldW, worldH, tilePx, isTileBlocked, npcObstacles, prevX, prevY)
      ) {
        return false;
      }
    }
    prevX = sx;
    prevY = sy;
  }
  return true;
}

function pickWalkableFollowTarget(
  ownerX: number,
  ownerY: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
  npcObstacles?: readonly ActorCollider[],
): { x: number; y: number } | null {
  const actorClear = (wx: number, wy: number) => {
    if (!npcObstacles || npcObstacles.length === 0) return true;
    return !npcObstacles.some(
      (a) => Math.hypot(wx - a.x, wy - a.y) < PET_ACTOR_RADIUS_PX + a.radiusPx - 0.5,
    );
  };

  for (const [ox, oy] of FOLLOW_OFFSETS) {
    const cx = ownerX + ox;
    const cy = ownerY + oy;
    if (isWorldPosNavigable(cx, cy, worldW, worldH, tilePx, isTileBlocked) && actorClear(cx, cy)) {
      return { x: cx, y: cy };
    }
  }
  const baseTx = Math.floor(ownerX / tilePx);
  const baseTy = Math.floor(ownerY / tilePx);
  for (let r = 1; r <= 3; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const wx = (baseTx + dx + 0.5) * tilePx;
        const wy = (baseTy + dy + 0.75) * tilePx;
        if (isWorldPosNavigable(wx, wy, worldW, worldH, tilePx, isTileBlocked) && actorClear(wx, wy)) {
          return { x: wx, y: wy };
        }
      }
    }
  }
  if (isWorldPosNavigable(ownerX, ownerY, worldW, worldH, tilePx, isTileBlocked)) {
    return { x: ownerX, y: ownerY };
  }
  return null;
}

/** Connected-side BFS recovery (never teleports across disconnected barriers or walls). */
function findSameSideLocalRecovery(
  px: number,
  py: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
): { x: number; y: number } | null {
  const sx = Math.floor(px / tilePx);
  const sy = Math.floor(py / tilePx);
  for (let r = 0; r <= 3; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const wx = (sx + dx + 0.5) * tilePx;
        const wy = (sy + dy + 0.75) * tilePx;
        if (isWorldPosNavigable(wx, wy, worldW, worldH, tilePx, isTileBlocked)) {
          return { x: wx, y: wy };
        }
      }
    }
  }
  return null;
}

function findWalkableTilePath(
  fromX: number,
  fromY: number,
  goalX: number,
  goalY: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
): { reached: boolean; waypoints: Array<{ x: number; y: number }> } {
  const sx = Math.floor(fromX / tilePx);
  const sy = Math.floor(fromY / tilePx);
  const gx = Math.floor(goalX / tilePx);
  const gy = Math.floor(goalY / tilePx);
  if (sx === gx && sy === gy) {
    return isSegmentWalkable(fromX, fromY, goalX, goalY, worldW, worldH, tilePx, isTileBlocked)
      ? { reached: true, waypoints: [{ x: goalX, y: goalY }] }
      : { reached: false, waypoints: [] };
  }

  const startKey = `${sx},${sy}`;
  const goalKey = `${gx},${gy}`;
  const parent = new Map<string, string | null>([[startKey, null]]);
  const queue: Array<[number, number]> = [[sx, sy]];
  const dirs: readonly [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let reachedGoal = false;
  let head = 0;
  const MAX_VISITED = 3600;

  while (head < queue.length && parent.size < MAX_VISITED) {
    const [cx, cy] = queue[head++]!;
    const ck = `${cx},${cy}`;
    if (ck === goalKey) {
      reachedGoal = true;
      break;
    }
    const parentCx = (cx + 0.5) * tilePx;
    const parentCy = (cy + 0.75) * tilePx;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = `${nx},${ny}`;
      if (parent.has(nk)) continue;
      const childCx = (nx + 0.5) * tilePx;
      const childCy = (ny + 0.75) * tilePx;
      if (!isWorldPosNavigable(childCx, childCy, worldW, worldH, tilePx, isTileBlocked)) {
        continue;
      }
      if (!isSegmentWalkable(parentCx, parentCy, childCx, childCy, worldW, worldH, tilePx, isTileBlocked)) {
        continue;
      }
      parent.set(nk, ck);
      queue.push([nx, ny]);
    }
  }

  if (!reachedGoal) return { reached: false, waypoints: [] };

  const reversed: Array<{ x: number; y: number }> = [];
  let curKey: string | null = goalKey;
  while (curKey && curKey !== startKey) {
    const [wx = sx, wy = sy] = curKey.split(',').map(Number);
    reversed.push({
      x: (wx + 0.5) * tilePx,
      y: (wy + 0.75) * tilePx,
    });
    curKey = parent.get(curKey) ?? null;
  }
  reversed.reverse();
  if (
    reversed.length > 0 &&
    isSegmentWalkable(
      reversed[reversed.length - 1]!.x,
      reversed[reversed.length - 1]!.y,
      goalX,
      goalY,
      worldW,
      worldH,
      tilePx,
      isTileBlocked,
    )
  ) {
    reversed[reversed.length - 1] = { x: goalX, y: goalY };
  }
  return { reached: true, waypoints: reversed };
}

export interface PetLivingDriverOutput {
  loco: PetLocomotionSnapshot;
  ambientBubble: string | null;
  authority: PetAuthorityPort;
  chasedChickenThisTick?: boolean;
}

export class PetLivingMainGameDriver {
  private brain: PetBrainState = createPetBrainState();
  private movement: PetMovementExecutorState;
  private readonly authority: PetAuthorityPort = createMainGamePetAuthorityPort();
  private readonly traits: PetPersonalityTraits;
  private readonly traitPresetId: string;
  private simNeeds: Pet8Needs = createDefault8Needs();
  private bowlFood = 1;
  private waterVol = 80;
  private lastBrainTickMs = 0;
  private pendingFoodOffer: PetFoodOfferInput | null = null;
  private lastBubbleMs = 0;
  private lastChickenChaseBubbleMs = 0;
  private foodOfferHandledTicks = 0;
  private lastMapId: MapId | null = null;
  private lastValidPos: { x: number; y: number } | null = null;
  private lastValidMapId: MapId | null = null;
  private lastPlacementSig = '';
  private cachedBlockedGridKey = '';
  private cachedBlockedGrid: Set<string> = new Set();
  private cachedPath: Array<{ x: number; y: number }> = [];
  private cachedPathGoalKey = '';
  private cachedPathAtMs = 0;

  constructor(startX: number, startY: number, traitId: string = 'curious_bong') {
    const preset = PET_PERSONALITY_PRESETS.find((p) => p.id === traitId) ?? PET_PERSONALITY_PRESETS[0]!;
    this.traitPresetId = preset.id;
    this.traits = preset.traits;
    this.movement = createPetMovementExecutorState(startX, startY);
  }

  seedFromSnapshot(pet: PetSnapshot | null): void {
    if (!pet) return;
    this.simNeeds = {
      ...createDefault8Needs(),
      hunger: pet.vitals.hunger,
      energy: pet.vitals.energy,
      fun: pet.vitals.fun,
      social:
        pet.emotion === 'happy' ? 72 : pet.emotion === 'sleepy' ? 48 : pet.emotion === 'hungry' ? 55 : 60,
    };
  }

  setFoodOffer(offer: PetFoodOfferInput | null): void {
    this.pendingFoodOffer = offer;
  }

  teleportTo(x: number, y: number): void {
    this.movement = {
      ...this.movement,
      loco: createLocomotionSnapshot(x, y),
    };
    this.cachedPath = [];
    this.cachedPathGoalKey = '';
  }

  resetMapPosition(mapId: MapId, x: number, y: number): void {
    this.lastMapId = mapId;
    this.lastValidPos = { x, y };
    this.lastValidMapId = mapId;
    this.teleportTo(x, y);
  }

  private getEffectiveBlockedGrid(
    mapId: MapId,
    placements: readonly FurniturePlacement[],
    placementSig: string,
  ): Set<string> {
    if (this.cachedBlockedGridKey !== placementSig) {
      this.cachedBlockedGrid = buildMainGameBlockedGrid(mapId, placements);
      this.cachedBlockedGridKey = placementSig;
    }
    return this.cachedBlockedGrid;
  }

  private stepNavigateToTarget(params: {
    px: number;
    py: number;
    targetX: number;
    targetY: number;
    goalTag: string;
    intent: 'move' | 'run';
    dtSec: number;
    nowMs: number;
    mapId: MapId;
    worldW: number;
    worldH: number;
    tilePx: number;
    isBlocked: (tx: number, ty: number) => boolean;
    npcObstacles?: readonly ActorCollider[];
  }): { loco: PetLocomotionSnapshot; reachable: boolean } {
    const {
      px,
      py,
      targetX,
      targetY,
      goalTag,
      intent,
      dtSec,
      nowMs,
      mapId,
      worldW,
      worldH,
      tilePx,
      isBlocked,
      npcObstacles,
    } = params;
    const facingTarget = resolveFacingFromVector(targetX - px, targetY - py, this.movement.loco.facing);
    let steerX = targetX;
    let steerY = targetY;

    if (!isSegmentWalkable(px, py, targetX, targetY, worldW, worldH, tilePx, isBlocked, npcObstacles)) {
      const goalKey = `${mapId}:${goalTag}:${Math.floor(targetX / tilePx)},${Math.floor(targetY / tilePx)}`;
      const nextWpBlocked =
        this.cachedPath.length > 0 &&
        !isSegmentWalkable(px, py, this.cachedPath[0]!.x, this.cachedPath[0]!.y, worldW, worldH, tilePx, isBlocked, npcObstacles);

      if (
        goalKey !== this.cachedPathGoalKey ||
        nowMs - this.cachedPathAtMs > 320 ||
        this.cachedPath.length === 0 ||
        nextWpBlocked
      ) {
        const pathRes = findWalkableTilePath(
          px,
          py,
          targetX,
          targetY,
          worldW,
          worldH,
          tilePx,
          isBlocked,
        );
        this.cachedPathGoalKey = goalKey;
        this.cachedPathAtMs = nowMs;
        this.cachedPath = pathRes.reached ? pathRes.waypoints : [];
      }

      while (
        this.cachedPath.length > 0 &&
        Math.hypot(this.cachedPath[0]!.x - px, this.cachedPath[0]!.y - py) < 5
      ) {
        this.cachedPath.shift();
      }

      if (this.cachedPath.length === 0) {
        // Owner or goal is on an unreachable disconnected region: wait calmly without crossing obstacles.
        const sitLoco = applyAcceptedDisplacementToLocomotion(
          this.movement.loco,
          px,
          py,
          dtSec,
          'sit',
          nowMs,
          facingTarget,
        );
        return { loco: sitLoco, reachable: false };
      }
      steerX = this.cachedPath[0]!.x;
      steerY = this.cachedPath[0]!.y;
    } else {
      this.cachedPath = [];
    }

    const candLoco = stepPetLocomotion(this.movement.loco, {
      intent,
      targetX: steerX,
      targetY: steerY,
      dtSec,
      nowMs,
      runThresholdPx: 86,
    });

    let acceptedX = candLoco.x;
    let acceptedY = candLoco.y;
    if (!isSegmentWalkable(px, py, candLoco.x, candLoco.y, worldW, worldH, tilePx, isBlocked, npcObstacles)) {
      const canSlideX =
        Math.abs(candLoco.x - px) > 0.05 &&
        isSegmentWalkable(px, py, candLoco.x, py, worldW, worldH, tilePx, isBlocked, npcObstacles);
      const canSlideY =
        Math.abs(candLoco.y - py) > 0.05 &&
        isSegmentWalkable(px, py, px, candLoco.y, worldW, worldH, tilePx, isBlocked, npcObstacles);
      if (canSlideX && (!canSlideY || Math.abs(candLoco.x - px) >= Math.abs(candLoco.y - py))) {
        acceptedX = candLoco.x;
        acceptedY = py;
      } else if (canSlideY) {
        acceptedX = px;
        acceptedY = candLoco.y;
      } else {
        acceptedX = px;
        acceptedY = py;
      }
    }

    // Reconcile accepted coordinates, velocity, facing AND animState together (never update facing alone).
    let resolvedLoco = applyAcceptedDisplacementToLocomotion(
      this.movement.loco,
      acceptedX,
      acceptedY,
      dtSec,
      intent,
      nowMs,
      facingTarget,
    );
    if (
      nowMs < candLoco.wakingUntilMs &&
      candLoco.animState === 'wake_yawn_stretch' &&
      Math.hypot(acceptedX - px, acceptedY - py) < 0.12
    ) {
      resolvedLoco = {
        ...resolvedLoco,
        wakingUntilMs: candLoco.wakingUntilMs,
        animState: 'wake_yawn_stretch',
      };
    } else {
      resolvedLoco = {
        ...resolvedLoco,
        wakingUntilMs: candLoco.wakingUntilMs,
      };
    }

    return { loco: resolvedLoco, reachable: true };
  }

  update(frame: PetLivingWorldFrame): PetLivingDriverOutput {
    if (!FOLLOW_CAT_MAPS.has(frame.mapId)) {
      this.lastMapId = frame.mapId;
      this.cachedPath = [];
      return { loco: this.movement.loco, ambientBubble: null, authority: this.authority };
    }

    const tilePx = frame.tilePx ?? TILE_SIZE;
    const mapDef = getMapDefinition(frame.mapId);
    const worldW = mapDef.widthTiles * tilePx;
    const worldH = mapDef.heightTiles * tilePx;
    const placementSig = buildPlacementSignature(frame.mapId, frame.placements);
    const placementsChanged = this.lastPlacementSig !== '' && this.lastPlacementSig !== placementSig;
    this.lastPlacementSig = placementSig;

    const blockedSet = this.getEffectiveBlockedGrid(frame.mapId, frame.placements, placementSig);
    const isBlocked = (tx: number, ty: number): boolean => {
      if (tx < 0 || ty < 0 || tx >= mapDef.widthTiles || ty >= mapDef.heightTiles) return true;
      if (blockedSet.has(`${tx},${ty}`)) return true;
      return frame.isTileBlocked ? frame.isTileBlocked(tx, ty) : false;
    };
    const npcObstacles = frame.npcObstacles;

    if (placementsChanged) {
      this.cachedPath = [];
      this.cachedPathGoalKey = '';
      this.movement = { ...this.movement, blocked: blockedSet };
    }

    const switchedMap = this.lastMapId !== null && this.lastMapId !== frame.mapId;
    const currentUnwalkable = !isWorldPosNavigable(
      this.movement.loco.x,
      this.movement.loco.y,
      worldW,
      worldH,
      tilePx,
      isBlocked,
    );

    if (switchedMap) {
      this.cachedPath = [];
      this.cachedPathGoalKey = '';
      this.lastValidPos = null;
      this.lastValidMapId = null;
      if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
        const safe = pickWalkableFollowTarget(
          frame.localPlayerX,
          frame.localPlayerY,
          worldW,
          worldH,
          tilePx,
          isBlocked,
          npcObstacles,
        );
        if (safe) {
          this.teleportTo(safe.x, safe.y);
        }
      }
    } else if (currentUnwalkable) {
      // NEVER teleport across walls toward the owner on the same map!
      // Recover only to lastValidPos or connected-side local walkable tile.
      this.cachedPath = [];
      this.cachedPathGoalKey = '';
      if (
        this.lastValidPos &&
        this.lastValidMapId === frame.mapId &&
        isWorldPosNavigable(this.lastValidPos.x, this.lastValidPos.y, worldW, worldH, tilePx, isBlocked)
      ) {
        this.teleportTo(this.lastValidPos.x, this.lastValidPos.y);
      } else {
        const localSafe = findSameSideLocalRecovery(
          this.movement.loco.x,
          this.movement.loco.y,
          worldW,
          worldH,
          tilePx,
          isBlocked,
        );
        if (localSafe) {
          this.teleportTo(localSafe.x, localSafe.y);
        }
      }
    }
    this.lastMapId = frame.mapId;

    const px = this.movement.loco.x;
    const py = this.movement.loco.y;
    const dtSec = Math.max(0.008, Math.min(0.1, frame.dtMs / 1000));

    const commit = (
      loco: PetLocomotionSnapshot,
      ambientBubble: string | null = null,
      chasedChickenThisTick = false,
    ): PetLivingDriverOutput => {
      if (isWorldPosNavigable(loco.x, loco.y, worldW, worldH, tilePx, isBlocked)) {
        this.lastValidPos = { x: loco.x, y: loco.y };
        this.lastValidMapId = frame.mapId;
      }
      this.movement = { ...this.movement, loco };
      return { loco, ambientBubble, authority: this.authority, chasedChickenThisTick };
    };

    // 1. Follow owner when separated across ALL followable maps while strictly obeying collision & BFS.
    if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
      const followTarget = pickWalkableFollowTarget(
        frame.localPlayerX,
        frame.localPlayerY,
        worldW,
        worldH,
        tilePx,
        isBlocked,
        npcObstacles,
      );
      const facingOwner = resolveFacingFromVector(
        frame.localPlayerX - px,
        frame.localPlayerY - py,
        this.movement.loco.facing,
      );
      const distToOwner = Math.hypot(frame.localPlayerX - px, frame.localPlayerY - py);
      const followStartDist = frame.mapId === 'home' ? 52 : 34;

      if (distToOwner > followStartDist && !frame.isStudying && !this.pendingFoodOffer && !frame.foodOffer) {
        if (!followTarget) {
          const restLoco = applyAcceptedDisplacementToLocomotion(
            this.movement.loco,
            px,
            py,
            dtSec,
            'sit',
            frame.nowMs,
            facingOwner,
          );
          return commit(restLoco);
        }

        const intent = distToOwner > 86 ? 'run' : 'move';
        const nav = this.stepNavigateToTarget({
          px,
          py,
          targetX: followTarget.x,
          targetY: followTarget.y,
          goalTag: 'follow',
          intent,
          dtSec,
          nowMs: frame.nowMs,
          mapId: frame.mapId,
          worldW,
          worldH,
          tilePx,
          isBlocked,
          npcObstacles,
        });
        return commit(nav.loco);
      }

      // 2. Gentle separation if owner steps directly onto cat's tile outdoors/indoors
      if (
        !frame.isStudying &&
        (frame.playerPosture ?? 'none') === 'none' &&
        distToOwner < PLAYER_ACTOR_RADIUS_PX + PET_ACTOR_RADIUS_PX - 0.8
      ) {
        const push = computeActorSeparationPush(px, py, PET_ACTOR_RADIUS_PX, [
          {
            id: 'local-owner',
            x: frame.localPlayerX,
            y: frame.localPlayerY,
            radiusPx: PLAYER_ACTOR_RADIUS_PX,
            kind: 'player',
          },
          ...(npcObstacles ?? []),
        ]);
        if (push) {
          const candX = px + Math.max(-2, Math.min(2, push.dx));
          const candY = py + Math.max(-2, Math.min(2, push.dy));
          if (isSegmentWalkable(px, py, candX, candY, worldW, worldH, tilePx, isBlocked, npcObstacles)) {
            const yieldLoco = applyAcceptedDisplacementToLocomotion(
              this.movement.loco,
              candX,
              candY,
              dtSec,
              'move',
              frame.nowMs,
              facingOwner,
            );
            return commit(yieldLoco);
          }
        }
      }

      // 3. Playful collision-safe chicken chasing outdoors when near owner & chickens
      if (
        frame.mapId !== 'home' &&
        !frame.isNight &&
        !frame.isStudying &&
        (frame.playerPosture ?? 'none') === 'none' &&
        frame.chickens &&
        frame.chickens.length > 0 &&
        distToOwner <= 112
      ) {
        let bestChicken: { id: string; x: number; y: number } | null = null;
        let bestDist = 92;
        for (const ch of frame.chickens) {
          const dCat = Math.hypot(ch.x - px, ch.y - py);
          const dOwner = Math.hypot(ch.x - frame.localPlayerX, ch.y - frame.localPlayerY);
          if (dCat <= bestDist && dCat >= 13 && dOwner <= 128) {
            bestDist = dCat;
            bestChicken = ch;
          }
        }

        if (bestChicken) {
          const targetNearChicken = pickWalkableFollowTarget(
            bestChicken.x,
            bestChicken.y,
            worldW,
            worldH,
            tilePx,
            isBlocked,
            npcObstacles,
          );
          if (targetNearChicken) {
            const chase = this.stepNavigateToTarget({
              px,
              py,
              targetX: targetNearChicken.x,
              targetY: targetNearChicken.y,
              goalTag: `chase_${bestChicken.id}`,
              intent: bestDist > 42 ? 'run' : 'move',
              dtSec,
              nowMs: frame.nowMs,
              mapId: frame.mapId,
              worldW,
              worldH,
              tilePx,
              isBlocked,
              npcObstacles,
            });
            const didMove = Math.hypot(chase.loco.x - px, chase.loco.y - py) >= 0.12;
            let chaseBubble: string | null = null;
            if (chase.reachable && didMove && frame.nowMs - this.lastChickenChaseBubbleMs > 6500) {
              this.lastChickenChaseBubbleMs = frame.nowMs;
              chaseBubble = 'Mrow!';
            }
            if (chase.reachable) {
              return commit(chase.loco, chaseBubble, didMove);
            }
          }
        }
      }

      // 4. Outdoor calm ambient posture (zero unvalidated coordinates)
      if (frame.mapId !== 'home') {
        const emergent = evaluateOverworldCatEmergentBehavior({
          isNight: Boolean(frame.isNight),
          isStudying: frame.isStudying,
          playerPosture: frame.playerPosture ?? 'none',
          playerFarmingActive: Boolean(frame.playerFarmingActive),
          nearestChickenDistPx: frame.nearestChickenDistPx ?? Infinity,
          nowMs: frame.nowMs,
        });
        const idleLoco = applyAcceptedDisplacementToLocomotion(
          this.movement.loco,
          px,
          py,
          dtSec,
          emergent.intent,
          frame.nowMs,
          emergent.intent === 'idle' ? facingOwner : 'south',
        );
        let outdoorBubble: string | null = null;
        if (emergent.bubbleText && frame.nowMs - this.lastBubbleMs > 7500) {
          this.lastBubbleMs = frame.nowMs;
          outdoorBubble = emergent.bubbleText;
        }
        return commit(idleLoco, outdoorBubble);
      }
    }

    // 5. Home indoor Living Brain + Executor (also strictly clamped through unified segment/actor check)
    this.movement = { ...this.movement, blocked: blockedSet };

    const hints: MainGamePetWorldHints = {
      mapId: frame.mapId,
      placements: frame.placements,
      petX: px,
      petY: py,
      bowlFoodPortions: this.bowlFood,
      waterBowlVolume: this.waterVol,
      isStudying: frame.isStudying,
      partnersSittingSofa: frame.partnersSittingSofa,
    };

    const affordances = buildMainGamePetAffordances(hints);
    const emotion = derive9Emotion(this.simNeeds, this.traits);

    if (frame.nowMs - this.lastBrainTickMs >= BRAIN_TICK_MS) {
      this.lastBrainTickMs = frame.nowMs;
      const brainOut = tickPetBrain(
        this.brain,
        snapshotToInput(
          {
            needs: this.simNeeds,
            traits: this.traits,
            emotion,
            bowlFoodPortions: this.bowlFood,
            waterBowlVolume: this.waterVol,
            isStudying: frame.isStudying,
            partnersSittingSofa: frame.partnersSittingSofa,
            partnerJustArrived: false,
            hasNewFurnitureId: null,
            nowMs: frame.nowMs,
          },
          affordances,
          frame.caregiverIds,
          { foodOffer: frame.foodOffer ?? this.pendingFoodOffer },
        ),
      );
      this.brain = brainOut.state;
      for (const c of brainOut.output.completions) {
        this.authority.submitBrainCompletion(c);
      }
      for (const f of brainOut.output.foodIntents) {
        this.authority.submitFoodOfferIntent(f);
        this.foodOfferHandledTicks += 1;
      }
      this.pendingFoodOffer = null;
    }

    const mvIntent = selectMovementIntent({
      phase: this.brain.phase,
      currentIntent: this.brain.lastIntent,
    });

    const interrupt = placementsChanged;

    const mv = tickPetMovement(this.movement, {
      nowMs: frame.nowMs,
      dtMs: frame.dtMs,
      intent: mvIntent,
      interrupt,
      targets: movementTargetFromAffordances(affordances),
    });

    let homeLoco = mv.state.loco;
    if (!isSegmentWalkable(px, py, mv.state.loco.x, mv.state.loco.y, worldW, worldH, tilePx, isBlocked, npcObstacles)) {
      const canSlideX =
        Math.abs(mv.state.loco.x - px) > 0.05 &&
        isSegmentWalkable(px, py, mv.state.loco.x, py, worldW, worldH, tilePx, isBlocked, npcObstacles);
      const canSlideY =
        Math.abs(mv.state.loco.y - py) > 0.05 &&
        isSegmentWalkable(px, py, px, mv.state.loco.y, worldW, worldH, tilePx, isBlocked, npcObstacles);
      const safeX = canSlideX ? mv.state.loco.x : px;
      const safeY = !canSlideX && canSlideY ? mv.state.loco.y : py;
      homeLoco = applyAcceptedDisplacementToLocomotion(
        this.movement.loco,
        safeX,
        safeY,
        dtSec,
        canSlideX || canSlideY ? mv.state.loco.committedIntent : 'sit',
        frame.nowMs,
      );
    } else if (Math.hypot(mv.state.loco.x - px, mv.state.loco.y - py) >= 0.12) {
      homeLoco = applyAcceptedDisplacementToLocomotion(
        this.movement.loco,
        mv.state.loco.x,
        mv.state.loco.y,
        dtSec,
        mv.state.loco.committedIntent === 'run' ? 'run' : 'move',
        frame.nowMs,
      );
      homeLoco = { ...homeLoco, wakingUntilMs: mv.state.loco.wakingUntilMs };
    }

    this.movement = { ...mv.state, loco: homeLoco };
    for (const p of mv.output.proposals) {
      this.authority.submitMovementProposal(p);
    }

    let ambientBubble: string | null = null;
    if (frame.nowMs - this.lastBubbleMs > 4200) {
      const hint = getSubtleBehaviorHintVi(this.simNeeds, emotion);
      if (hint) {
        this.lastBubbleMs = frame.nowMs;
        ambientBubble = hint.slice(0, 28) + (hint.length > 28 ? '…' : '');
      }
    }

    if (
      frame.localPlayerX !== null &&
      frame.localPlayerY !== null &&
      Math.hypot(frame.localPlayerX - px, frame.localPlayerY - py) < 2.8 * TILE_SIZE &&
      frame.nowMs - this.lastBubbleMs > 6000
    ) {
      this.lastBubbleMs = frame.nowMs;
      ambientBubble = 'Mrow?';
    }

    return commit(this.movement.loco, ambientBubble);
  }

  getTraitPresetId(): string {
    return this.traitPresetId;
  }

  syncCareNeeds(needs: Partial<Pet8Needs>): void {
    this.simNeeds = {
      ...this.simNeeds,
      ...needs,
    };
  }

  getDevTelemetry(mapId: MapId, spriteVisible: boolean, nowMs: number): LivingPetDevTelemetry {
    const loco = this.movement.loco;
    return {
      visible: spriteVisible && FOLLOW_CAT_MAPS.has(mapId),
      mapId,
      x: Math.round(loco.x * 10) / 10,
      y: Math.round(loco.y * 10) / 10,
      animState: loco.animState,
      brainPhase: this.brain.phase,
      lastIntent: this.brain.lastIntent?.actionId ?? 'rest',
      locomotionKind: loco.committedIntent,
      foodOfferHandled: this.foodOfferHandledTicks > 0,
      sampleMs: nowMs,
    };
  }
}
