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
  evaluateLivingPetStep,
  snapshotToInput,
  tickPetBrain,
  type PetBrainState,
} from './petAutonomousController';

export type { ActionScoreBreakdown } from './petIntelligenceConfig';

export { evaluateLivingPetStep, buildBrainDebugTrace, createPetBrainState };

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

function applyCompletionNeeds(
  ctx: DecisionContext,
  actionId: string | undefined,
): DecisionContext {
  if (!actionId) return ctx;
  if (actionId === 'eat_bowl') {
    return { ...ctx, needs: { ...ctx.needs, hunger: Math.min(100, ctx.needs.hunger + 22) } };
  }
  if (actionId === 'drink_bowl') {
    return { ...ctx, needs: { ...ctx.needs, thirst: Math.min(100, ctx.needs.thirst + 22) } };
  }
  if (actionId === 'sleep_cushion' || actionId === 'nap_on_sofa' || actionId === 'sunbathe') {
    return { ...ctx, needs: { ...ctx.needs, energy: Math.min(100, ctx.needs.energy + 12) } };
  }
  if (actionId === 'play_yarn' || actionId === 'chase_ball') {
    return { ...ctx, needs: { ...ctx.needs, fun: Math.min(100, ctx.needs.fun + 14), energy: Math.max(25, ctx.needs.energy - 6) } };
  }
  return ctx;
}

export function runPetLabVerificationTrace(params: {
  presetId: string;
  traits: PetPersonalityTraits;
  steps?: number;
  stepMs?: number;
}) {
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
  let switches = 0;
  const actionsChosen: string[] = [];
  let lastAction = '';

  for (let i = 0; i < totalSteps; i += 1) {
    const nowMs = 1_000_000 + i * stepMs;
    ctx = { ...ctx, nowMs, emotion: derive9Emotion(ctx.needs, ctx.traits) };
    const affordances = buildLabAffordances(
      params.presetId === 'target_moved' && i >= 2 ? 'pet_bed' : undefined,
    );
    const tick = tickPetBrain(
      brain,
      snapshotToInput(ctx, affordances, ['partner-a', 'partner-b']),
    );
    brain = tick.state;
    const intent = tick.output.currentIntent?.actionId;
    if (intent && intent !== lastAction) {
      if (lastAction) switches += 1;
      lastAction = intent;
      actionsChosen.push(intent);
    }
    for (const done of tick.output.completions) {
      ctx = applyCompletionNeeds(ctx, done.intent.actionId);
    }
  }

  return {
    actionsChosen,
    switches,
    finalNeeds: ctx.needs,
    finalEmotion: derive9Emotion(ctx.needs, ctx.traits),
    memoryCount: brain.memory.events.length,
    debug: buildBrainDebugTrace(brain),
  };
}

export function runPetLabSessionTrace(params: {
  presetId: string;
  traits: PetPersonalityTraits;
  durationMs: number;
  stepMs?: number;
}) {
  const steps = Math.max(1, Math.floor(params.durationMs / (params.stepMs ?? 2500)));
  return runPetLabVerificationTrace({
    presetId: params.presetId,
    traits: params.traits,
    steps,
    stepMs: params.stepMs ?? 2500,
  });
}

export { PET_PERSONALITY_PRESETS, PET_MEMORY_PERSIST_CAP };