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
import { TILE_SIZE } from '../../shared/maps';
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

function isWorldPosWalkable(
  wx: number,
  wy: number,
  tilePx: number,
  isTileBlocked?: (tileX: number, tileY: number) => boolean,
): boolean {
  if (!isTileBlocked || tilePx <= 0) return true;
  const rx = 4;
  const ry = 3;
  const checks: readonly [number, number][] = [
    [wx, wy],
    [wx - rx, wy - ry],
    [wx + rx, wy - ry],
    [wx - rx, wy + 1],
    [wx + rx, wy + 1],
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
  tilePx: number,
  isTileBlocked?: (tileX: number, tileY: number) => boolean,
): boolean {
  if (!isTileBlocked || tilePx <= 0) return true;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 2));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (!isWorldPosWalkable(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, tilePx, isTileBlocked)) {
      return false;
    }
  }
  return true;
}

function pickWalkableFollowTarget(
  ownerX: number,
  ownerY: number,
  tilePx: number,
  isTileBlocked?: (tileX: number, tileY: number) => boolean,
): { x: number; y: number } | null {
  for (const [ox, oy] of FOLLOW_OFFSETS) {
    const cx = ownerX + ox;
    const cy = ownerY + oy;
    if (isWorldPosWalkable(cx, cy, tilePx, isTileBlocked)) {
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
        if (isWorldPosWalkable(wx, wy, tilePx, isTileBlocked)) {
          return { x: wx, y: wy };
        }
      }
    }
  }
  if (isWorldPosWalkable(ownerX, ownerY, tilePx, isTileBlocked)) {
    return { x: ownerX, y: ownerY };
  }
  return null;
}

function findWalkableTilePath(
  fromX: number,
  fromY: number,
  goalX: number,
  goalY: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
): { reached: boolean; waypoints: Array<{ x: number; y: number }> } {
  const sx = Math.floor(fromX / tilePx);
  const sy = Math.floor(fromY / tilePx);
  const gx = Math.floor(goalX / tilePx);
  const gy = Math.floor(goalY / tilePx);
  if (sx === gx && sy === gy) return { reached: true, waypoints: [] };

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
  const MAX_VISITED = 1600;

  while (head < queue.length && parent.size < MAX_VISITED) {
    const [cx, cy] = queue[head++]!;
    const ck = `${cx},${cy}`;
    if (ck === goalKey) {
      reachedGoal = true;
      break;
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = `${nx},${ny}`;
      if (parent.has(nk)) continue;
      if (isTileBlocked(nx, ny)) continue;
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
  return { reached: true, waypoints: reversed };
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
  }

  update(frame: PetLivingWorldFrame): PetLivingDriverOutput {
    if (!FOLLOW_CAT_MAPS.has(frame.mapId)) {
      this.lastMapId = frame.mapId;
      this.cachedPath = [];
      return { loco: this.movement.loco, ambientBubble: null, authority: this.authority };
    }

    const tilePx = frame.tilePx ?? TILE_SIZE;
    const isBlocked = frame.isTileBlocked;
    const switchedMap = this.lastMapId !== null && this.lastMapId !== frame.mapId;
    const currentUnwalkable = Boolean(
      isBlocked && !isWorldPosWalkable(this.movement.loco.x, this.movement.loco.y, tilePx, isBlocked),
    );
    if (switchedMap || currentUnwalkable) {
      this.cachedPath = [];
      this.cachedPathGoalKey = '';
      if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
        const safe = pickWalkableFollowTarget(
          frame.localPlayerX,
          frame.localPlayerY,
          tilePx,
          isBlocked,
        );
        if (safe) {
          this.teleportTo(safe.x, safe.y);
        }
      }
    }
    this.lastMapId = frame.mapId;

    const px = this.movement.loco.x;
    const py = this.movement.loco.y;
    const dtSec = Math.max(0.008, Math.min(0.1, frame.dtMs / 1000));

    // Smoothly follow owner across both home (when owner walks away) and outdoor maps while strictly obeying walls/water/fences.
    if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
      const followTarget = pickWalkableFollowTarget(
        frame.localPlayerX,
        frame.localPlayerY,
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

      // Never catch-up teleport across walls/water; follow walkable BFS waypoints or sit calmly when blocked.
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
          this.movement = { ...this.movement, loco: restLoco };
          return { loco: restLoco, ambientBubble: null, authority: this.authority };
        }

        const intent = distToOwner > 86 ? 'run' : 'move';
        const targetX = followTarget.x;
        const targetY = followTarget.y;
        let steerX = targetX;
        let steerY = targetY;

        if (isBlocked && !isSegmentWalkable(px, py, targetX, targetY, tilePx, isBlocked)) {
          const goalKey = `${frame.mapId}:${Math.floor(targetX / tilePx)},${Math.floor(targetY / tilePx)}`;
          if (
            goalKey !== this.cachedPathGoalKey ||
            frame.nowMs - this.cachedPathAtMs > 350 ||
            this.cachedPath.length === 0
          ) {
            const pathRes = findWalkableTilePath(px, py, targetX, targetY, tilePx, isBlocked);
            this.cachedPathGoalKey = goalKey;
            this.cachedPathAtMs = frame.nowMs;
            this.cachedPath = pathRes.reached ? pathRes.waypoints : [];
          }

          while (
            this.cachedPath.length > 0 &&
            Math.hypot(this.cachedPath[0]!.x - px, this.cachedPath[0]!.y - py) < 6
          ) {
            this.cachedPath.shift();
          }

          if (this.cachedPath.length === 0) {
            // Unreachable across river/walls: sit calmly facing owner rather than sliding into obstacle
            const sitLoco = applyAcceptedDisplacementToLocomotion(
              this.movement.loco,
              px,
              py,
              dtSec,
              'sit',
              frame.nowMs,
              facingOwner,
            );
            this.movement = { ...this.movement, loco: sitLoco };
            return { loco: sitLoco, ambientBubble: null, authority: this.authority };
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
          nowMs: frame.nowMs,
          runThresholdPx: 86,
        });

        let acceptedX = candLoco.x;
        let acceptedY = candLoco.y;
        if (isBlocked && !isSegmentWalkable(px, py, candLoco.x, candLoco.y, tilePx, isBlocked)) {
          const canSlideX =
            Math.abs(candLoco.x - px) > 0.05 &&
            isSegmentWalkable(px, py, candLoco.x, py, tilePx, isBlocked);
          const canSlideY =
            Math.abs(candLoco.y - py) > 0.05 &&
            isSegmentWalkable(px, py, px, candLoco.y, tilePx, isBlocked);
          if (canSlideX) {
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

        const resolvedLoco =
          acceptedX === candLoco.x && acceptedY === candLoco.y
            ? {
                ...candLoco,
                facing:
                  Math.hypot(acceptedX - px, acceptedY - py) >= 0.15
                    ? resolveFacingFromVector(acceptedX - px, acceptedY - py, candLoco.facing)
                    : candLoco.facing,
              }
            : applyAcceptedDisplacementToLocomotion(
                this.movement.loco,
                acceptedX,
                acceptedY,
                dtSec,
                intent,
                frame.nowMs,
                facingOwner,
              );

        this.movement = { ...this.movement, loco: resolvedLoco };
        return { loco: resolvedLoco, ambientBubble: null, authority: this.authority };
      }

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
          preferredFacing: 'south',
          dtSec,
          nowMs: frame.nowMs,
        });
        this.movement = { ...this.movement, loco: idleLoco };
        let outdoorBubble: string | null = null;
        if (emergent.bubbleText && frame.nowMs - this.lastBubbleMs > 7500) {
          this.lastBubbleMs = frame.nowMs;
          outdoorBubble = emergent.bubbleText;
        }
        return { loco: idleLoco, ambientBubble: outdoorBubble, authority: this.authority };
      }
    }

    const blocked = buildMainGameBlockedGrid(frame.mapId, frame.placements);
    this.movement = { ...this.movement, blocked };

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

    const interrupt = false;

    const mv = tickPetMovement(this.movement, {
      nowMs: frame.nowMs,
      dtMs: frame.dtMs,
      intent: mvIntent,
      interrupt,
      targets: movementTargetFromAffordances(affordances),
    });
    if (
      isBlocked &&
      !isSegmentWalkable(px, py, mv.state.loco.x, mv.state.loco.y, tilePx, isBlocked)
    ) {
      const safeHomeLoco = applyAcceptedDisplacementToLocomotion(
        this.movement.loco,
        px,
        py,
        dtSec,
        'sit',
        frame.nowMs,
      );
      this.movement = { ...mv.state, loco: safeHomeLoco };
    } else {
      this.movement = mv.state;
    }
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

    return {
      loco: this.movement.loco,
      ambientBubble,
      authority: this.authority,
    };
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
      visible: spriteVisible && mapId === 'home',
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