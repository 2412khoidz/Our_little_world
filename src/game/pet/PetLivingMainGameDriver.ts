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
  reconcileCollisionLocomotion,
  resolveFacingFromVector,
  stepPetLocomotion,
  type CollisionResolutionKind,
  type PetLocomotionSnapshot,
} from '../../shared/petLiving/petMovement/petLocomotionModel';
import type { FurniturePlacement, MapId } from '../../shared/types';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import { evaluateOverworldCatEmergentBehavior } from '../../shared/world/emergentWorldBehavior';
import { getMapDefinition, TILE_SIZE } from '../../shared/maps';
import type { LivingPetDevTelemetry } from '../../shared/petLiving/mainGame/livingPetDevTelemetry';

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
  canStepTile?: (fromTileX: number, fromTileY: number, toTileX: number, toTileY: number) => boolean;
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
  canStepTile?: (fromTileX: number, fromTileY: number, toTileX: number, toTileY: number) => boolean,
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
    if (!isWorldPosNavigable(sx, sy, worldW, worldH, tilePx, isTileBlocked)) {
      return false;
    }
    const prevTx = Math.floor(prevX / tilePx);
    const prevTy = Math.floor(prevY / tilePx);
    const curTx = Math.floor(sx / tilePx);
    const curTy = Math.floor(sy / tilePx);
    if (canStepTile && (curTx !== prevTx || curTy !== prevTy)) {
      if (!canStepTile(prevTx, prevTy, curTx, curTy)) {
        return false;
      }
    }
    if (curTx !== prevTx && curTy !== prevTy) {
      if (
        !isWorldPosNavigable(sx, prevY, worldW, worldH, tilePx, isTileBlocked) ||
        !isWorldPosNavigable(prevX, sy, worldW, worldH, tilePx, isTileBlocked)
      ) {
        return false;
      }
    }
    prevX = sx;
    prevY = sy;
  }
  return true;
}

function validateCandidateMovement(
  px: number,
  py: number,
  candX: number,
  candY: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isBlocked: (tx: number, ty: number) => boolean,
  canStepTile?: (fromTileX: number, fromTileY: number, toTileX: number, toTileY: number) => boolean,
): { kind: CollisionResolutionKind; x: number; y: number } {
  if (isSegmentWalkable(px, py, candX, candY, worldW, worldH, tilePx, isBlocked, canStepTile)) {
    return { kind: 'accepted', x: candX, y: candY };
  }
  const canSlideX =
    Math.abs(candX - px) > 1e-4 &&
    isSegmentWalkable(px, py, candX, py, worldW, worldH, tilePx, isBlocked, canStepTile);
  const canSlideY =
    Math.abs(candY - py) > 1e-4 &&
    isSegmentWalkable(px, py, px, candY, worldW, worldH, tilePx, isBlocked, canStepTile);
  if (canSlideX && (!canSlideY || Math.abs(candX - px) >= Math.abs(candY - py))) {
    return { kind: 'slide_x', x: candX, y: py };
  }
  if (canSlideY) {
    return { kind: 'slide_y', x: px, y: candY };
  }
  return { kind: 'blocked', x: px, y: py };
}

function pickWalkableFollowTarget(
  ownerX: number,
  ownerY: number,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
): { x: number; y: number } | null {
  for (const [ox, oy] of FOLLOW_OFFSETS) {
    const cx = ownerX + ox;
    const cy = ownerY + oy;
    if (isWorldPosNavigable(cx, cy, worldW, worldH, tilePx, isTileBlocked)) {
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
        if (isWorldPosNavigable(wx, wy, worldW, worldH, tilePx, isTileBlocked)) {
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

/** Connected-side local recovery (never teleports across disconnected barriers or walls). */
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

/** String-pulling path smoother verified strictly against full 5-pt + anti-corner-cut segment collision. */
function smoothWalkablePath(
  startX: number,
  startY: number,
  rawWaypoints: ReadonlyArray<{ x: number; y: number }>,
  worldW: number,
  worldH: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
  canStepTile?: (fromTileX: number, fromTileY: number, toTileX: number, toTileY: number) => boolean,
): Array<{ x: number; y: number }> {
  if (rawWaypoints.length <= 1) return [...rawWaypoints];
  const smoothed: Array<{ x: number; y: number }> = [];
  let anchorX = startX;
  let anchorY = startY;
  let idx = 0;
  while (idx < rawWaypoints.length) {
    let furthest = idx;
    for (let probe = rawWaypoints.length - 1; probe > idx; probe -= 1) {
      const wp = rawWaypoints[probe]!;
      if (isSegmentWalkable(anchorX, anchorY, wp.x, wp.y, worldW, worldH, tilePx, isTileBlocked, canStepTile)) {
        furthest = probe;
        break;
      }
    }
    const chosen = rawWaypoints[furthest]!;
    smoothed.push(chosen);
    anchorX = chosen.x;
    anchorY = chosen.y;
    idx = furthest + 1;
  }
  return smoothed;
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
  canStepTile?: (fromTileX: number, fromTileY: number, toTileX: number, toTileY: number) => boolean,
): { reached: boolean; waypoints: Array<{ x: number; y: number }> } {
  const sx = Math.floor(fromX / tilePx);
  const sy = Math.floor(fromY / tilePx);
  const gx = Math.floor(goalX / tilePx);
  const gy = Math.floor(goalY / tilePx);
  if (sx === gx && sy === gy) {
    return isSegmentWalkable(fromX, fromY, goalX, goalY, worldW, worldH, tilePx, isTileBlocked, canStepTile)
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
      if (!isSegmentWalkable(parentCx, parentCy, childCx, childCy, worldW, worldH, tilePx, isTileBlocked, canStepTile)) {
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
      canStepTile,
    )
  ) {
    reversed[reversed.length - 1] = { x: goalX, y: goalY };
  }
  return {
    reached: true,
    waypoints: smoothWalkablePath(fromX, fromY, reversed, worldW, worldH, tilePx, isTileBlocked, canStepTile),
  };
}

export interface PetLivingDriverOutput {
  loco: PetLocomotionSnapshot;
  ambientBubble: string | null;
  authority: PetAuthorityPort;
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
  private foodOfferHandledTicks = 0;
  private lastMapId: MapId | null = null;
  private lastValidPos: { x: number; y: number } | null = null;
  private lastValidMapId: MapId | null = null;
  private lastPlacementSig = '';
  private cachedBlockedGridKey = '';
  private cachedBlockedGrid: Set<string> = new Set();
  private cachedPath: Array<{ x: number; y: number }> = [];
  private cachedPathGoalKey = '';
  private followingOwner = false;
  private runningFollow = false;

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
    this.followingOwner = false;
    this.runningFollow = false;
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
    canStepTile?: (fromTx: number, fromTy: number, toTx: number, toTy: number) => boolean;
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
      canStepTile,
    } = params;
    const facingTarget = resolveFacingFromVector(targetX - px, targetY - py, this.movement.loco.facing);
    let steerX = targetX;
    let steerY = targetY;
    let isFinalLeg = true;

    if (!isSegmentWalkable(px, py, targetX, targetY, worldW, worldH, tilePx, isBlocked, canStepTile)) {
      const goalKey = `${mapId}:${goalTag}:${Math.floor(targetX / tilePx)},${Math.floor(targetY / tilePx)}`;
      const nextWpBlocked =
        this.cachedPath.length > 0 &&
        Math.hypot(this.cachedPath[0]!.x - px, this.cachedPath[0]!.y - py) > 10 &&
        !isSegmentWalkable(px, py, this.cachedPath[0]!.x, this.cachedPath[0]!.y, worldW, worldH, tilePx, isBlocked, canStepTile);

      if (goalKey !== this.cachedPathGoalKey || this.cachedPath.length === 0 || nextWpBlocked) {
        const pathRes = findWalkableTilePath(
          px,
          py,
          targetX,
          targetY,
          worldW,
          worldH,
          tilePx,
          isBlocked,
          canStepTile,
        );
        this.cachedPathGoalKey = goalKey;
        this.cachedPath = pathRes.reached ? pathRes.waypoints : [];
      }

      while (
        this.cachedPath.length > 0 &&
        Math.hypot(this.cachedPath[0]!.x - px, this.cachedPath[0]!.y - py) < 6
      ) {
        this.cachedPath.shift();
      }
      // Corner lookahead: skip intermediate corner vertex once next vertex is directly clear.
      while (
        this.cachedPath.length > 1 &&
        isSegmentWalkable(px, py, this.cachedPath[1]!.x, this.cachedPath[1]!.y, worldW, worldH, tilePx, isBlocked, canStepTile)
      ) {
        this.cachedPath.shift();
      }

      if (this.cachedPath.length === 0) {
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
      isFinalLeg = this.cachedPath.length <= 1;
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
      decelerateOnArrival: isFinalLeg,
    });

    const validation = validateCandidateMovement(
      px,
      py,
      candLoco.x,
      candLoco.y,
      worldW,
      worldH,
      tilePx,
      isBlocked,
      canStepTile,
    );
    const resolvedLoco = reconcileCollisionLocomotion(
      this.movement.loco,
      candLoco,
      validation,
      intent,
      nowMs,
      facingTarget,
    );
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
      this.followingOwner = false;
      this.runningFollow = false;
      if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
        const safe = pickWalkableFollowTarget(
          frame.localPlayerX,
          frame.localPlayerY,
          worldW,
          worldH,
          tilePx,
          isBlocked,
        );
        if (safe) {
          this.teleportTo(safe.x, safe.y);
        }
      }
    } else if (currentUnwalkable) {
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
    const dtSec = Math.max(0.001, Math.min(0.1, frame.dtMs / 1000));

    const commit = (
      loco: PetLocomotionSnapshot,
      ambientBubble: string | null = null,
    ): PetLivingDriverOutput => {
      if (isWorldPosNavigable(loco.x, loco.y, worldW, worldH, tilePx, isBlocked)) {
        this.lastValidPos = { x: loco.x, y: loco.y };
        this.lastValidMapId = frame.mapId;
      }
      this.movement = { ...this.movement, loco };
      return { loco, ambientBubble, authority: this.authority };
    };

    // 1. Follow owner with smooth start/stop & walk/run hysteresis across all followable maps.
    if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
      const followTarget = pickWalkableFollowTarget(
        frame.localPlayerX,
        frame.localPlayerY,
        worldW,
        worldH,
        tilePx,
        isBlocked,
      );
      const facingOwner = resolveFacingFromVector(
        frame.localPlayerX - px,
        frame.localPlayerY - py,
        this.movement.loco.facing,
      );
      const distToOwner = Math.hypot(frame.localPlayerX - px, frame.localPlayerY - py);
      const followStartDist = frame.mapId === 'home' ? 52 : 34;
      const followStopDist = frame.mapId === 'home' ? 28 : 22;

      if (frame.isStudying || this.pendingFoodOffer || frame.foodOffer) {
        this.followingOwner = false;
        this.runningFollow = false;
      } else if (distToOwner > followStartDist) {
        this.followingOwner = true;
      } else if (
        this.followingOwner &&
        (!followTarget ||
          distToOwner <= followStopDist ||
          Math.hypot(followTarget.x - px, followTarget.y - py) <= 3.5)
      ) {
        this.followingOwner = false;
        this.runningFollow = false;
      }

      if (this.followingOwner) {
        if (!followTarget) {
          this.followingOwner = false;
          this.runningFollow = false;
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

        this.runningFollow = this.runningFollow ? distToOwner > 68 : distToOwner > 92;
        const intent = this.runningFollow ? 'run' : 'move';
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
          canStepTile: frame.canStepTile,
        });
        if (!nav.reachable) {
          this.followingOwner = false;
          this.runningFollow = false;
        }
        return commit(nav.loco);
      }

      // 2. Outdoor calm ambient posture via smooth stepPetLocomotion (matches 5c0c658 feel)
      if (frame.mapId !== 'home') {
        const emergent = evaluateOverworldCatEmergentBehavior({
          isNight: Boolean(frame.isNight),
          isStudying: frame.isStudying,
          playerPosture: frame.playerPosture ?? 'none',
          playerFarmingActive: Boolean(frame.playerFarmingActive),
          nearestChickenDistPx: frame.nearestChickenDistPx ?? Infinity,
          nowMs: frame.nowMs,
        });
        const idleLoco = stepPetLocomotion(this.movement.loco, {
          intent: emergent.intent,
          targetX: px,
          targetY: py,
          preferredFacing: emergent.intent === 'idle' ? facingOwner : 'south',
          dtSec,
          nowMs: frame.nowMs,
        });
        let outdoorBubble: string | null = null;
        if (emergent.bubbleText && frame.nowMs - this.lastBubbleMs > 7500) {
          this.lastBubbleMs = frame.nowMs;
          outdoorBubble = emergent.bubbleText;
        }
        return commit(idleLoco, outdoorBubble);
      }
    }

    // 3. Home indoor Living Brain + Executor (accepted locomotion preserved intact)
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

    const mv = tickPetMovement(this.movement, {
      nowMs: frame.nowMs,
      dtMs: frame.dtMs,
      intent: mvIntent,
      interrupt: placementsChanged,
      targets: movementTargetFromAffordances(affordances),
    });

    const homeValidation = validateCandidateMovement(
      px,
      py,
      mv.state.loco.x,
      mv.state.loco.y,
      worldW,
      worldH,
      tilePx,
      isBlocked,
      frame.canStepTile,
    );
    const homeLoco = reconcileCollisionLocomotion(
      this.movement.loco,
      mv.state.loco,
      homeValidation,
      mv.state.loco.committedIntent,
      frame.nowMs,
    );

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
