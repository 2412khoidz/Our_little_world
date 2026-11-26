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
import type { PetLocomotionSnapshot } from '../../shared/petLiving/petMovement/petLocomotionModel';
import type { FurniturePlacement, MapId } from '../../shared/types';
import { TILE_SIZE } from '../../shared/maps';
import type { LivingPetDevTelemetry } from '../../shared/petLiving/mainGame/livingPetDevTelemetry';

const BRAIN_TICK_MS = 2000;

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

  update(frame: PetLivingWorldFrame): PetLivingDriverOutput {
    if (frame.mapId !== 'home') {
      return { loco: this.movement.loco, ambientBubble: null, authority: this.authority };
    }

    const blocked = buildMainGameBlockedGrid(frame.mapId, frame.placements);
    this.movement = { ...this.movement, blocked };

    const px = this.movement.loco.x;
    const py = this.movement.loco.y;

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