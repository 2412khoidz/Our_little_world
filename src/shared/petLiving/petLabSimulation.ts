import {
  PET_PERSONALITY_PRESETS,
  applyNonLethal8NeedsCatchup,
  createDefault8Needs,
  derive9Emotion,
  scoreAffordanceAction,
  type ActionScoreBreakdown,
  type DecisionContext,
  type Pet9Emotion,
  type PetPersonalityTraits,
} from './petIntelligenceConfig';
import {
  PET_MEMORY_PERSIST_CAP,
  appendBoundedMemory,
  deterministicCandidateBreak,
  filterValidAffordances,
  type AffordanceCandidate,
  type PetMemoryEvent,
} from './petPrimitivesAdapter';

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
  ];
  return list.map((a) => (a.targetId === targetMovedId ? { ...a, reachable: false, available: false } : a));
}

export interface SimulationStepResult {
  chosen: ActionScoreBreakdown | null;
  candidates: ActionScoreBreakdown[];
  emotion: Pet9Emotion;
  switchReason: string;
}

export function evaluateLivingPetStep(
  ctx: DecisionContext,
  affordances: readonly AffordanceCandidate[],
  currentAction: { action: string; score01: number; commitmentUntilMs: number } | null,
): SimulationStepResult {
  const emotion = derive9Emotion(ctx.needs, ctx.traits);
  const eligible = filterValidAffordances(affordances, ctx.nowMs);
  const scored = eligible.map((c) => scoreAffordanceAction(c, { ...ctx, emotion }));
  const ranked = deterministicCandidateBreak(scored, (s) => s.score01, (s) => `${s.action}:${s.targetId}`);
  const top = ranked[0] ?? null;

  if (!top) {
    return { chosen: null, candidates: ranked, emotion, switchReason: 'Không có đích hợp lệ — giữ idle an toàn' };
  }

  // Hysteresis + Commitment protection prevents decision ping-pong/oscillation
  if (currentAction && ctx.nowMs < currentAction.commitmentUntilMs) {
    const held = ranked.find((r) => r.action === currentAction.action);
    if (held) {
      return { chosen: held, candidates: ranked, emotion, switchReason: 'Đang trong commitment window — giữ hành động ổn định' };
    }
  }
  if (currentAction) {
    const held = ranked.find((r) => r.action === currentAction.action);
    if (held && top.action !== held.action && top.score01 - held.score01 < 0.18) {
      return { chosen: held, candidates: ranked, emotion, switchReason: 'Chênh lệch < hysteresis 0.18 — không giật trạng thái' };
    }
  }

  return { chosen: top, candidates: ranked, emotion, switchReason: top.reasonVi };
}

export function runPetLabVerificationTrace(params: {
  presetId: string;
  traits: PetPersonalityTraits;
  steps?: number;
  stepMs?: number;
}) {
  const stepMs = params.stepMs ?? 4000;
  const totalSteps = params.steps ?? 20; // 80s trace
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

  let currentAction: { action: string; score01: number; commitmentUntilMs: number } | null = null;
  let memory: PetMemoryEvent[] = [];
  let switches = 0;
  const actionsChosen: string[] = [];

  for (let i = 0; i < totalSteps; i += 1) {
    const nowMs = 1_000_000 + i * stepMs;
    ctx = { ...ctx, nowMs };
    const affordances = buildLabAffordances(params.presetId === 'target_moved' && i >= 2 ? 'pet_bed' : undefined);
    const res = evaluateLivingPetStep(ctx, affordances, currentAction);

    if (res.chosen) {
      if (currentAction && currentAction.action !== res.chosen.action) {
        switches += 1;
      }
      if (!currentAction || currentAction.action !== res.chosen.action) {
        currentAction = {
          action: res.chosen.action,
          score01: res.chosen.score01,
          commitmentUntilMs: nowMs + 8000,
        };
      }
      actionsChosen.push(res.chosen.action);
      memory = appendBoundedMemory(
        memory,
        { id: `ev-${i}`, kind: res.chosen.action === 'eat_bowl' ? 'fed' : res.chosen.action === 'play_yarn' ? 'played' : 'explored', atMs: nowMs, caregiverId: 'partner-a' },
        PET_MEMORY_PERSIST_CAP,
      );
      if (res.chosen.action === 'eat_bowl') {
        ctx = { ...ctx, needs: { ...ctx.needs, hunger: Math.min(100, ctx.needs.hunger + 25) } };
      } else if (res.chosen.action === 'drink_bowl') {
        ctx = { ...ctx, needs: { ...ctx.needs, thirst: Math.min(100, ctx.needs.thirst + 25) } };
      } else if (res.chosen.action === 'sleep_cushion') {
        ctx = { ...ctx, needs: { ...ctx.needs, energy: Math.min(100, ctx.needs.energy + 10) } };
      }
    }
  }

  return {
    actionsChosen,
    switches,
    finalNeeds: ctx.needs,
    finalEmotion: derive9Emotion(ctx.needs, ctx.traits),
    memoryCount: memory.length,
  };
}

export { PET_PERSONALITY_PRESETS };
