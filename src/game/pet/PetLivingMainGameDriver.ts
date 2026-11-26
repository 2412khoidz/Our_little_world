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
  createLocomotionSnapshot,
  stepPetLocomotion,
  type PetLocomotionSnapshot,
} from '../../shared/petLiving/petMovement/petLocomotionModel';
import type { FurniturePlacement, MapId } from '../../shared/types';
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
}

const FOLLOW_OFFSETS: readonly [number, number][] = [
  [-16, 4],
  [16, 4],
  [-18, -8],
  [18, -8],
  [0, 16],
  [0, -14],
  [0, 0],
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

function pickWalkableFollowTarget(
  ownerX: number,
  ownerY: number,
  tilePx: number,
  isTileBlocked?: (tileX: number, tileY: number) => boolean,
): { x: number; y: number } {
  for (const [ox, oy] of FOLLOW_OFFSETS) {
    const cx = ownerX + ox;
    const cy = ownerY + oy;
    if (isWorldPosWalkable(cx, cy, tilePx, isTileBlocked)) {
      return { x: cx, y: cy };
    }
  }
  return { x: ownerX, y: ownerY };
}

function findNextTileWaypoint(
  fromX: number,
  fromY: number,
  goalX: number,
  goalY: number,
  tilePx: number,
  isTileBlocked: (tileX: number, tileY: number) => boolean,
): { x: number; y: number } | null {
  const sx = Math.floor(fromX / tilePx);
  const sy = Math.floor(fromY / tilePx);
  const gx = Math.floor(goalX / tilePx);
  const gy = Math.floor(goalY / tilePx);
  if (sx === gx && sy === gy) return null;

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
  let bestKey: string | null = null;
  let bestDist = Infinity;
  let head = 0;
  const MAX_VISITED = 420;

  while (head < queue.length && parent.size < MAX_VISITED) {
    const [cx, cy] = queue[head++]!;
    const ck = `${cx},${cy}`;
    if (ck === goalKey) {
      bestKey = ck;
      break;
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = `${nx},${ny}`;
      if (parent.has(nk)) continue;
      if (isTileBlocked(nx, ny)) continue;
      parent.set(nk, ck);
      const d = Math.hypot(nx - gx, ny - gy);
      if (d < bestDist) {
        bestDist = d;
        bestKey = nk;
      }
      queue.push([nx, ny]);
    }
  }

  if (!bestKey || bestKey === startKey) return null;
  let stepKey = bestKey;
  while (true) {
    const p = parent.get(stepKey);
    if (!p) return null;
    if (p === startKey) {
      const [wx = sx, wy = sy] = stepKey.split(',').map(Number);
      return {
        x: (wx + 0.5) * tilePx,
        y: (wy + 0.75) * tilePx,
      };
    }
    stepKey = p;
  }
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
      return { loco: this.movement.loco, ambientBubble: null, authority: this.authority };
    }

    const px = this.movement.loco.x;
    const py = this.movement.loco.y;
    const dtSec = Math.max(0.008, Math.min(0.1, frame.dtMs / 1000));

    // Smoothly follow owner across both home (when owner walks away) and outdoor maps while strictly obeying walls/water/fences.
    if (frame.localPlayerX !== null && frame.localPlayerY !== null) {
      const tilePx = frame.tilePx ?? TILE_SIZE;
      const isBlocked = frame.isTileBlocked;
      const followTarget = pickWalkableFollowTarget(
        frame.localPlayerX,
        frame.localPlayerY,
        tilePx,
        isBlocked,
      );
      const targetX = followTarget.x;
      const targetY = followTarget.y;
      const distToOwner = Math.hypot(frame.localPlayerX - px, frame.localPlayerY - py);
      const followStartDist = frame.mapId === 'home' ? 52 : 34;

      // Never catch-up teleport across walls/water; steer via collision-aware pathfinding instead.
      if (distToOwner > followStartDist && !frame.isStudying && !this.pendingFoodOffer && !frame.foodOffer) {
        const intent = distToOwner > 86 ? 'run' : 'move';
        let steerX = targetX;
        let steerY = targetY;

        if (isBlocked) {
          const probe = stepPetLocomotion(this.movement.loco, {
            intent,
            targetX: steerX,
            targetY: steerY,
            dtSec,
            nowMs: frame.nowMs,
            runThresholdPx: 86,
          });
          if (!isWorldPosWalkable(probe.x, probe.y, tilePx, isBlocked)) {
            const waypoint = findNextTileWaypoint(px, py, targetX, targetY, tilePx, isBlocked);
            if (waypoint) {
              steerX = waypoint.x;
              steerY = waypoint.y;
            }
          }
        }

        const nextLoco = stepPetLocomotion(this.movement.loco, {
          intent,
          targetX: steerX,
          targetY: steerY,
          dtSec,
          nowMs: frame.nowMs,
          runThresholdPx: 86,
        });

        let resolvedLoco = nextLoco;
        if (isBlocked && !isWorldPosWalkable(nextLoco.x, nextLoco.y, tilePx, isBlocked)) {
          const canSlideX = isWorldPosWalkable(nextLoco.x, py, tilePx, isBlocked);
          const canSlideY = isWorldPosWalkable(px, nextLoco.y, tilePx, isBlocked);
          if (canSlideX) {
            resolvedLoco = { ...nextLoco, y: py };
          } else if (canSlideY) {
            resolvedLoco = { ...nextLoco, x: px };
          } else {
            resolvedLoco = stepPetLocomotion(this.movement.loco, {
              intent: 'sit',
              targetX: px,
              targetY: py,
              preferredFacing: nextLoco.facing,
              dtSec,
              nowMs: frame.nowMs,
            });
          }
        }

        this.movement = { ...this.movement, loco: resolvedLoco };
        return { loco: resolvedLoco, ambientBubble: null, authority: this.authority };
      }

      if (frame.mapId !== 'home') {
        const sitPhase = Math.floor(frame.nowMs / 6500) % 2 === 0;
        const idleLoco = stepPetLocomotion(this.movement.loco, {
          intent: sitPhase ? 'sit' : 'idle',
          targetX: px,
          targetY: py,
          preferredFacing: 'south',
          dtSec,
          nowMs: frame.nowMs,
        });
        this.movement = { ...this.movement, loco: idleLoco };
        let outdoorBubble: string | null = null;
        if (frame.nowMs - this.lastBubbleMs > 7500) {
          this.lastBubbleMs = frame.nowMs;
          outdoorBubble = sitPhase ? 'Purr~' : 'Mrow?';
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
    this.movement = mv.state;
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