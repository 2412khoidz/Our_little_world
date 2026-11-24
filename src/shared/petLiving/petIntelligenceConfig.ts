import { PET_MEMORY_PERSIST_CAP, computeNeedUrgency, type AffordanceCandidate } from './petPrimitivesAdapter';

export interface PetPersonalityTraits {
  glutton: number;     // 0..1
  playful: number;
  clingy: number;
  curious: number;
  shy: number;
  lazy: number;
  independent: number;
}

export interface Pet8Needs {
  hunger: number;      // 0..100 (low = needs food)
  thirst: number;
  energy: number;
  hygiene: number;
  fun: number;
  stimulation: number;
  social: number;
  safety: number;
}

export type Pet9Emotion =
  | 'happy'
  | 'sad'
  | 'lonely'
  | 'curious'
  | 'scared'
  | 'grumpy'
  | 'relaxed'
  | 'excited'
  | 'clingy';

export interface PersonalityPreset {
  id: string;
  labelVi: string;
  traits: PetPersonalityTraits;
  descriptionVi: string;
}

export const PET_PERSONALITY_PRESETS: readonly PersonalityPreset[] = [
  {
    id: 'mischievous_quyt',
    labelVi: 'Tinh nghịch & Ham ăn',
    traits: { glutton: 0.85, playful: 0.82, clingy: 0.55, curious: 0.72, shy: 0.15, lazy: 0.25, independent: 0.35 },
    descriptionVi: 'Nhanh nhẹn vờn cuộn len, thính mũi khi thấy cá nướng và hay chạy ra đón.',
  },
  {
    id: 'sleepy_mochi',
    labelVi: 'Lười biếng & Ấm áp',
    traits: { glutton: 0.55, playful: 0.25, clingy: 0.65, curious: 0.32, shy: 0.28, lazy: 0.88, independent: 0.45 },
    descriptionVi: 'Thích nằm sưởi nắng cạnh cửa sổ, ngủ gật gần bàn học và rừ rừ êm.',
  },
  {
    id: 'curious_bong',
    labelVi: 'Tò mò & Thám hiểm',
    traits: { glutton: 0.45, playful: 0.68, clingy: 0.32, curious: 0.92, shy: 0.35, lazy: 0.22, independent: 0.78 },
    descriptionVi: 'Thường chui hộp giấy, ngửi đồ nội thất mới và ngắm bướm ngoài vườn.',
  },
  {
    id: 'clingy_nep',
    labelVi: 'Quấn người & Dịu dàng',
    traits: { glutton: 0.5, playful: 0.52, clingy: 0.92, curious: 0.45, shy: 0.55, lazy: 0.48, independent: 0.15 },
    descriptionVi: 'Thích nằm giữa hai bạn trên sofa và đi theo nhẹ nhàng khi hai bạn ở vườn.',
  },
] as const;

export const LIVING_PET_NEED_FLOOR = 25;
export const LIVING_PET_SAFETY_FLOOR = 30;
export const LIVING_PET_MAX_OFFLINE_MS = 48 * 3600 * 1000;

export function createDefault8Needs(): Pet8Needs {
  return {
    hunger: 74,
    thirst: 76,
    energy: 84,
    hygiene: 86,
    fun: 72,
    stimulation: 70,
    social: 75,
    safety: 90,
  };
}

/**
 * Non-lethal offline catch-up: never kills, abandons, or permanently damages pet affection.
 */
export function applyNonLethal8NeedsCatchup(needs: Pet8Needs, elapsedMs: number): Pet8Needs {
  const cappedMs = Math.max(0, Math.min(LIVING_PET_MAX_OFFLINE_MS, elapsedMs));
  const hours = cappedMs / 3600000;
  const clamp = (v: number, floor = LIVING_PET_NEED_FLOOR) => Math.max(floor, Math.min(100, Math.round(v)));

  let energy = clamp(needs.energy - hours * 0.9);
  if (hours >= 8) {
    // Sleeping off-screen recovers energy smoothly to >= 50
    energy = Math.max(energy, 52);
  }

  return {
    hunger: clamp(needs.hunger - hours * 1.8),
    thirst: clamp(needs.thirst - hours * 1.5),
    energy,
    hygiene: clamp(needs.hygiene - hours * 0.7),
    fun: clamp(needs.fun - hours * 1.2),
    stimulation: clamp(needs.stimulation - hours * 1.1),
    social: clamp(needs.social - hours * 1.0),
    safety: clamp(needs.safety - hours * 0.2, LIVING_PET_SAFETY_FLOOR),
  };
}

export function derive9Emotion(needs: Pet8Needs, traits: PetPersonalityTraits): Pet9Emotion {
  if (needs.safety < 42) return 'scared';
  if (needs.hunger < 38 || needs.thirst < 38) return 'grumpy';
  if (needs.social < 42) return traits.clingy > 0.6 ? 'clingy' : 'lonely';
  if (needs.fun < 40) return 'sad';
  if (needs.energy < 42) return 'relaxed';
  if (needs.stimulation < 55 && traits.curious >= 0.65) return 'curious';
  if (needs.fun >= 82 && needs.energy >= 70 && traits.playful >= 0.6) return 'excited';
  if (needs.hunger >= 68 && needs.safety >= 75) return 'happy';
  return 'relaxed';
}

export function getSubtleBehaviorHintVi(needs: Pet8Needs, emotion: Pet9Emotion): string | null {
  if (needs.hunger < 42) return 'Có vẻ bé muốn ăn gì đó ngon lành.';
  if (needs.thirst < 42) return 'Bé đang liếc nhìn bát nước uống.';
  if (emotion === 'curious') return 'Bé tò mò đánh hơi xung quanh căn phòng.';
  if (emotion === 'lonely' || emotion === 'clingy') return 'Bé muốn quấn quýt ở gần hai bạn một chút.';
  if (needs.energy < 42) return 'Bé tìm một góc ấm áp để chợp mắt.';
  return null;
}

export interface PetAffordanceBlueprint {
  affordanceId: string;
  objectKind: string;
  supportedActions: readonly string[];
  anchorOffsetX: number;
  anchorOffsetY: number;
  minCommitmentMs: number;
  cooldownMs: number;
  interruptible: boolean;
}

export const DEFAULT_PET_AFFORDANCE_BLUEPRINTS: readonly PetAffordanceBlueprint[] = [
  { affordanceId: 'food_bowl', objectKind: 'pet_bowl_food', supportedActions: ['eat_bowl'], anchorOffsetX: 12, anchorOffsetY: 2, minCommitmentMs: 4500, cooldownMs: 12000, interruptible: false },
  { affordanceId: 'water_bowl', objectKind: 'pet_bowl_water', supportedActions: ['drink_bowl'], anchorOffsetX: 12, anchorOffsetY: 2, minCommitmentMs: 4000, cooldownMs: 15000, interruptible: false },
  { affordanceId: 'pet_bed', objectKind: 'pet_cushion', supportedActions: ['sleep_cushion', 'groom'], anchorOffsetX: 0, anchorOffsetY: 2, minCommitmentMs: 10000, cooldownMs: 25000, interruptible: true },
  { affordanceId: 'sofa', objectKind: 'sofa_cream', supportedActions: ['nap_on_sofa', 'couple_sofa_cuddle'], anchorOffsetX: 0, anchorOffsetY: 16, minCommitmentMs: 8000, cooldownMs: 30000, interruptible: true },
  { affordanceId: 'rug', objectKind: 'rug_coral', supportedActions: ['sunbathe', 'groom', 'lie_idle'], anchorOffsetX: 0, anchorOffsetY: 0, minCommitmentMs: 7000, cooldownMs: 20000, interruptible: true },
  { affordanceId: 'sunny_window', objectKind: 'window', supportedActions: ['watch_window', 'sunbathe'], anchorOffsetX: 0, anchorOffsetY: 16, minCommitmentMs: 7000, cooldownMs: 35000, interruptible: true },
  { affordanceId: 'study_desk', objectKind: 'desk_study', supportedActions: ['study_companion'], anchorOffsetX: -14, anchorOffsetY: 24, minCommitmentMs: 11000, cooldownMs: 20000, interruptible: true },
  { affordanceId: 'yarn_ball', objectKind: 'yarn_ball', supportedActions: ['play_yarn'], anchorOffsetX: 10, anchorOffsetY: 0, minCommitmentMs: 5500, cooldownMs: 18000, interruptible: true },
  { affordanceId: 'ball', objectKind: 'toy_ball', supportedActions: ['chase_ball'], anchorOffsetX: 8, anchorOffsetY: 0, minCommitmentMs: 5500, cooldownMs: 18000, interruptible: true },
  { affordanceId: 'cardboard_box', objectKind: 'cardboard_box', supportedActions: ['hide_in_box'], anchorOffsetX: 0, anchorOffsetY: 4, minCommitmentMs: 9000, cooldownMs: 35000, interruptible: true },
  { affordanceId: 'scratching_post', objectKind: 'scratching_post', supportedActions: ['scratch_stretch'], anchorOffsetX: -10, anchorOffsetY: 4, minCommitmentMs: 4500, cooldownMs: 45000, interruptible: true },
  { affordanceId: 'garden_bench', objectKind: 'bench_garden', supportedActions: ['sit_garden_bench'], anchorOffsetX: 0, anchorOffsetY: 12, minCommitmentMs: 6500, cooldownMs: 25000, interruptible: true },
  { affordanceId: 'flower_patch', objectKind: 'flowerpot_sakura', supportedActions: ['sniff_flowers'], anchorOffsetX: 10, anchorOffsetY: 6, minCommitmentMs: 5000, cooldownMs: 30000, interruptible: true },
  { affordanceId: 'butterfly_spot', objectKind: 'sakura_bush', supportedActions: ['watch_butterfly'], anchorOffsetX: -12, anchorOffsetY: 6, minCommitmentMs: 5000, cooldownMs: 30000, interruptible: true },
] as const;

export interface ActionScoreBreakdown {
  action: string;
  targetId: string;
  score01: number;
  reasonVi: string;
  affordance: AffordanceCandidate;
}

export interface DecisionContext {
  needs: Pet8Needs;
  traits: PetPersonalityTraits;
  emotion: Pet9Emotion;
  bowlFoodPortions: number;
  waterBowlVolume: number;
  isStudying: boolean;
  partnersSittingSofa: boolean;
  partnerJustArrived: boolean;
  hasNewFurnitureId: string | null;
  nowMs: number;
}

export function scoreAffordanceAction(
  candidate: AffordanceCandidate,
  ctx: DecisionContext,
): ActionScoreBreakdown {
  const { needs, traits } = ctx;
  let base: number;
  let reasonVi: string;

  const distPenalty = Math.min(0.25, candidate.distance / 1200);

  switch (candidate.action) {
    case 'eat_bowl': {
      if (ctx.bowlFoodPortions <= 0 || needs.hunger >= 90) {
        return { action: candidate.action, targetId: candidate.targetId, score01: 0, reasonVi: 'Bát trống hoặc đang no', affordance: candidate };
      }
      const urg = computeNeedUrgency({ value: needs.hunger, target: 85, criticalThreshold: 25, curve: 'power', weight: 1 });
      base = 0.25 + urg * (0.6 + traits.glutton * 0.25);
      reasonVi = needs.hunger < 35 ? 'Anti-sleep-loop: ưu tiên tìm bát ăn vì đói' : 'Muốn ăn thêm hạt';
      break;
    }
    case 'drink_bowl': {
      if (ctx.waterBowlVolume <= 5 || needs.thirst >= 90) {
        return { action: candidate.action, targetId: candidate.targetId, score01: 0, reasonVi: 'Bát cạn hoặc chưa khát', affordance: candidate };
      }
      const urg = computeNeedUrgency({ value: needs.thirst, target: 85, criticalThreshold: 25, curve: 'power', weight: 1 });
      base = 0.22 + urg * 0.7;
      reasonVi = 'Cần uống nước';
      break;
    }
    case 'sleep_cushion':
    case 'nap_on_sofa': {
      // Anti-sleep-loop: strongly suppress rest/sleep when hungry or thirsty below 35
      if (needs.hunger < 35 || needs.thirst < 35) {
        return { action: candidate.action, targetId: candidate.targetId, score01: 0.05, reasonVi: 'Tạm hoãn ngủ vì đang đói/khát', affordance: candidate };
      }
      const urg = computeNeedUrgency({ value: needs.energy, target: 88, criticalThreshold: 25, curve: 'smoothstep', weight: 1 });
      base = 0.10 + urg * 0.45 + traits.lazy * 0.34;
      reasonVi = 'Tìm chỗ êm ái nghỉ ngơi';
      break;
    }
    case 'study_companion': {
      base = ctx.isStudying ? 0.45 + traits.clingy * 0.25 + traits.lazy * 0.15 : 0.12;
      reasonVi = ctx.isStudying ? 'Lặng lẽ nằm cạnh bàn học cùng bạn' : 'Ghé góc bàn học';
      break;
    }
    case 'couple_sofa_cuddle': {
      base = ctx.partnersSittingSofa ? 0.52 + traits.clingy * 0.35 : 0.14;
      reasonVi = ctx.partnersSittingSofa ? 'Tự phát cuộn giữa hai bạn trên sofa' : 'Nằm sofa';
      break;
    }
    case 'play_yarn':
    case 'chase_ball': {
      const urg = computeNeedUrgency({ value: needs.fun, target: 90, criticalThreshold: 30, curve: 'linear', weight: 1 });
      base = 0.18 + urg * 0.5 + traits.playful * 0.32;
      reasonVi = 'Muốn vờn đồ chơi';
      break;
    }
    case 'hide_in_box':
    case 'sniff_flowers':
    case 'watch_butterfly': {
      const urg = computeNeedUrgency({ value: needs.stimulation, target: 90, criticalThreshold: 30, curve: 'smoothstep', weight: 1 });
      const newObjBoost = ctx.hasNewFurnitureId === candidate.targetId ? 0.3 : 0;
      base = 0.16 + urg * 0.4 + traits.curious * 0.35 + newObjBoost;
      reasonVi = newObjBoost > 0 ? 'Khám phá đồ vật mới' : 'Tò mò quan sát xung quanh';
      break;
    }
    case 'scratch_stretch': {
      base = 0.2 + (1 - needs.hygiene / 100) * 0.25 + traits.independent * 0.2;
      reasonVi = 'Duỗi người & cào nhẹ trụ cào';
      break;
    }
    default: {
      base = 0.24 + (ctx.partnerJustArrived ? traits.clingy * 0.4 : 0);
      reasonVi = ctx.partnerJustArrived ? 'Chào đón người vừa về nhà' : 'Thư giãn';
      break;
    }
  }

  return {
    action: candidate.action,
    targetId: candidate.targetId,
    score01: Math.max(0, Math.min(1, base - distPenalty)),
    reasonVi,
    affordance: candidate,
  };
}

export { PET_MEMORY_PERSIST_CAP };
