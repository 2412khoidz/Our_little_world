import {
  PET_PERSONALITY_PRESETS,
  applyNonLethal8NeedsCatchup,
  createDefault8Needs,
  derive9Emotion,
  type DecisionContext,
  type PetPersonalityTraits,
} from './petIntelligenceConfig';
import {
  PET_MEMORY_PERSIST_CAP,
  type AffordanceCandidate,
} from './petPrimitivesAdapter';
import {
  buildBrainDebugTrace,
  createPetBrainState,
  deserializePetBrain,
  evaluateLivingPetStep,
  serializePetBrain,
  snapshotToInput,
  tickPetBrain,
  type PetBrainState,
} from './petAutonomousController';
import type { PetFoodOfferInput } from './petBrainContract04B';
import {
  confirmLabCompletion,
  createLabSimulationExecutor,
  logLabTransition,
  type LabSimulationExecutorState,
} from './petLabSimulationExecutor';

export type { ActionScoreBreakdown } from './petIntelligenceConfig';

export { evaluateLivingPetStep, buildBrainDebugTrace, createPetBrainState, serializePetBrain, deserializePetBrain };

export interface PetLabScenarioPreset {
  id: string;
  labelVi: string;
  setup: (base: DecisionContext) => DecisionContext;
}

export const PET_LAB_SCENARIOS: readonly PetLabScenarioPreset[] = [
  { id: 'hungry', labelVi: 'Đói bụng (<35)', setup: (c) => ({ ...c, needs: { ...c.needs, hunger: 26 }, bowlFoodPortions: 1 }) },
  { id: 'thirsty', labelVi: 'Khát nước (<35)', setup: (c) => ({ ...c, needs: { ...c.needs, thirst: 28 }, waterBowlVolume: 80 }) },
  { id: 'full', labelVi: 'No căng (>92)', setup: (c) => ({ ...c, needs: { ...c.needs, hunger: 96, energy: 70 }, bowlFoodPortions: 1 }) },
  { id: 'playful', labelVi: 'Muốn chơi đùa', setup: (c) => ({ ...c, needs: { ...c.needs, fun: 32, energy: 85 } }) },
  { id: 'sleepy', labelVi: 'Buồn ngủ', setup: (c) => ({ ...c, needs: { ...c.needs, energy: 28, hunger: 80, thirst: 80 } }) },
  { id: 'sleeping', labelVi: 'Đang ngủ sâu', setup: (c) => ({ ...c, needs: { ...c.needs, energy: 30, hunger: 75 } }) },
  { id: 'partner_online', labelVi: 'Mây vừa online', setup: (c) => ({ ...c, partnerJustArrived: true, needs: { ...c.needs, social: 42 } }) },
  { id: 'both_studying', labelVi: 'Hai bạn đang học', setup: (c) => ({ ...c, isStudying: true }) },
  { id: 'liked_food', labelVi: 'Gặp món yêu thích', setup: (c) => ({ ...c, needs: { ...c.needs, hunger: 55 }, bowlFoodPortions: 1 }) },
  { id: 'disliked_food', labelVi: 'Món không hợp vị', setup: (c) => ({ ...c, needs: { ...c.needs, hunger: 65 }, bowlFoodPortions: 0 }) },
  { id: 'new_toy', labelVi: 'Có cuộn len mới', setup: (c) => ({ ...c, needs: { ...c.needs, fun: 42 }, hasNewFurnitureId: 'yarn_ball' }) },
  { id: 'new_furniture', labelVi: 'Nội thất / hộp giấy mới', setup: (c) => ({ ...c, needs: { ...c.needs, stimulation: 38 }, hasNewFurnitureId: 'cardboard_box' }) },
  { id: 'petted', labelVi: 'Vừa được vuốt ve', setup: (c) => ({ ...c, needs: { ...c.needs, social: 95, fun: 88 } }) },
  { id: 'close_tie', labelVi: 'Hai action điểm sát nhau', setup: (c) => ({ ...c, needs: { ...c.needs, fun: 62, stimulation: 62 } }) },
  { id: 'target_moved', labelVi: 'Đồ vật đích vừa bị dời', setup: (c) => ({ ...c, needs: { ...c.needs, energy: 40 } }) },
  { id: 'offline_48h', labelVi: 'Offline 48 giờ (non-lethal)', setup: (c) => ({ ...c, needs: applyNonLethal8NeedsCatchup(c.needs, 48 * 3600 * 1000) }) },
  { id: 'explore_area', labelVi: 'Khám phá khu vườn', setup: (c) => ({ ...c, needs: { ...c.needs, stimulation: 40 } }) },
  { id: 'sofa_couple', labelVi: 'Hai bạn ngồi sofa', setup: (c) => ({ ...c, partnersSittingSofa: true }) },
] as const;

export function buildLabAffordances(targetMovedId?: string): AffordanceCandidate[] {
  const list: AffordanceCandidate[] = [
    { id: 'food_bowl', targetId: 'food_bowl', action: 'eat_bowl', available: true, reachable: true, distance: 42, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 3000, x: 198, y: 162 },
    { id: 'water_bowl', targetId: 'water_bowl', action: 'drink_bowl', available: true, reachable: true, distance: 46, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 2500, x: 210, y: 162 },
    { id: 'pet_bed', targetId: 'pet_bed', action: 'sleep_cushion', available: true, reachable: true, distance: 20, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 9000, x: 218, y: 166 },
    { id: 'study_desk', targetId: 'study_desk', action: 'study_companion', available: true, reachable: true, distance: 96, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 11000, x: 184, y: 84 },
    { id: 'sofa', targetId: 'sofa', action: 'couple_sofa_cuddle', available: true, reachable: true, distance: 108, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 8000, x: 96, y: 98 },
    { id: 'yarn_ball', targetId: 'yarn_ball', action: 'play_yarn', available: true, reachable: true, distance: 64, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 5500, x: 164, y: 140 },
    { id: 'cardboard_box', targetId: 'cardboard_box', action: 'hide_in_box', available: true, reachable: true, distance: 72, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 8000, x: 148, y: 130 },
    { id: 'scratching_post', targetId: 'scratching_post', action: 'scratch_stretch', available: true, reachable: true, distance: 56, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 4000, x: 230, y: 144 },
    { id: 'sunny_window', targetId: 'sunny_window', action: 'sunbathe', available: true, reachable: true, distance: 80, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 7000, x: 40, y: 46 },
    { id: 'lie_rug', targetId: 'rug', action: 'lie_idle', available: true, reachable: true, distance: 38, occupied: false, cooldownUntilMs: 0, estimatedCostMs: 5000, x: 176, y: 152 },
  ];
  return list.map((a) =>
    a.targetId === targetMovedId ? { ...a, reachable: false, available: false } : a,
  );
}

export interface SimulationStepResult {
  chosen: import('./petIntelligenceConfig').ActionScoreBreakdown | null;
  candidates: import('./petIntelligenceConfig').ActionScoreBreakdown[];
  emotion: import('./petIntelligenceConfig').Pet9Emotion;
  switchReason: string;
}

/** @deprecated use `evaluateLivingPetStep` from petAutonomousController */
export type { SimulationStepResult as LegacySimulationStepResult };

export interface PetLabTraceResult {
  actionsChosen: string[];
  instanceTransitions: string[];
  switches: number;
  finalNeeds: DecisionContext['needs'];
  finalEmotion: ReturnType<typeof derive9Emotion>;
  memoryCount: number;
  brainMemoryCount: number;
  resources: { bowlFoodPortions: number; waterBowlVolume: number };
  transitionCount: number;
  completionKinds: Record<string, number>;
  debug: ReturnType<typeof buildBrainDebugTrace>;
}

export interface PetLabRunOptions {
  presetId: string;
  traits: PetPersonalityTraits;
  steps?: number;
  stepMs?: number;
  foodOffer?: PetFoodOfferInput | null;
  targetMovedAfterStep?: number;
  targetMovedId?: string;
}

function syncCtxNeeds(ctx: DecisionContext, sim: LabSimulationExecutorState): DecisionContext {
  return {
    ...ctx,
    needs: { ...sim.needs },
    bowlFoodPortions: sim.resources.bowlFoodPortions,
    waterBowlVolume: sim.resources.waterBowlVolume,
  };
}

function runLabLoop(params: PetLabRunOptions): PetLabTraceResult {
  const stepMs = params.stepMs ?? 4000;
  const totalSteps = params.steps ?? 20;
  const scenario = PET_LAB_SCENARIOS.find((s) => s.id === params.presetId) ?? PET_LAB_SCENARIOS[0]!;
  let ctx: DecisionContext = scenario.setup({
    needs: createDefault8Needs(),
    traits: params.traits,
    emotion: 'relaxed',
    bowlFoodPortions: 1,
    waterBowlVolume: 80,
    isStudying: false,
    partnersSittingSofa: false,
    partnerJustArrived: false,
    hasNewFurnitureId: null,
    nowMs: 1_000_000,
  });

  let brain: PetBrainState = createPetBrainState();
  let sim = createLabSimulationExecutor(ctx.needs, {
    bowlFoodPortions: ctx.bowlFoodPortions,
    waterBowlVolume: ctx.waterBowlVolume,
  });

  let switches = 0;
  const actionsChosen: string[] = [];
  const instanceTransitions: string[] = [];
  let lastInstance: string | null = null;
  let lastAction = '';
  const completionKinds: Record<string, number> = {};

  for (let i = 0; i < totalSteps; i += 1) {
    const nowMs = 1_000_000 + i * stepMs;
    ctx = syncCtxNeeds({ ...ctx, nowMs, emotion: derive9Emotion(ctx.needs, ctx.traits) }, sim);
    const movedId =
      params.targetMovedAfterStep !== undefined && i >= params.targetMovedAfterStep
        ? params.targetMovedId ?? 'pet_bed'
        : params.presetId === 'target_moved' && i >= 2
          ? 'pet_bed'
          : undefined;
    const affordances = buildLabAffordances(movedId);
    const tick = tickPetBrain(
      brain,
      snapshotToInput(ctx, affordances, ['partner-a', 'partner-b'], {
        foodOffer: params.foodOffer ?? null,
      }),
    );
    brain = tick.state;

    const instanceId = tick.output.currentIntent?.instanceId ?? null;
    if (instanceId && instanceId !== lastInstance) {
      instanceTransitions.push(
        `${nowMs}:${tick.output.phase}:${tick.output.currentIntent?.actionId ?? '?'}`,
      );
      lastInstance = instanceId;
    }

    const intent = tick.output.currentIntent?.actionId;
    if (intent && intent !== lastAction) {
      if (lastAction) switches += 1;
      lastAction = intent;
      actionsChosen.push(intent);
    }

    sim = logLabTransition(sim, {
      atMs: nowMs,
      phase: tick.output.phase,
      instanceId,
      actionId: tick.output.currentIntent?.actionId ?? null,
      targetId: tick.output.currentIntent?.targetId ?? null,
      detailVi: tick.output.rejectedReasonVi ?? tick.state.lastSwitchReasonVi,
    });

    for (const done of tick.output.completions) {
      completionKinds[done.kind] = (completionKinds[done.kind] ?? 0) + 1;
      const confirmed = confirmLabCompletion(sim, done, done.instanceId);
      sim = confirmed.sim;
    }
  }

  return {
    actionsChosen,
    instanceTransitions,
    switches,
    finalNeeds: sim.needs,
    finalEmotion: derive9Emotion(sim.needs, params.traits),
    memoryCount: sim.memoryEvents.length,
    brainMemoryCount: brain.memory.events.length,
    resources: { ...sim.resources },
    transitionCount: sim.transitionLog.length,
    completionKinds,
    debug: buildBrainDebugTrace(brain),
  };
}

export function runPetLabVerificationTrace(params: PetLabRunOptions) {
  return runLabLoop(params);
}

export function runPetLabSessionTrace(params: {
  presetId: string;
  traits: PetPersonalityTraits;
  durationMs: number;
  stepMs?: number;
  foodOffer?: PetFoodOfferInput | null;
}) {
  const stepMs = params.stepMs ?? 2500;
  const steps = Math.max(1, Math.floor(params.durationMs / stepMs));
  return runLabLoop({
    presetId: params.presetId,
    traits: params.traits,
    steps,
    stepMs,
    foodOffer: params.foodOffer,
  });
}

export const PET_LAB_LONG_SESSIONS = [
  { presetId: 'new_furniture', traitId: 'curious_bong', durationMs: 240_000 },
  { presetId: 'hungry', traitId: 'mischievous_quyt', durationMs: 210_000 },
  { presetId: 'target_moved', traitId: 'sleepy_mochi', durationMs: 180_000 },
] as const;

export { PET_PERSONALITY_PRESETS, PET_MEMORY_PERSIST_CAP };