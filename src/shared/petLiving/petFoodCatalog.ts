import type { LivingItemIconId } from './petVisualTypes';

export type FoodReactionKind = 'eager' | 'normal' | 'curious_sniff' | 'turn_away' | 'full_refuse';

export interface PetFoodSpec {
  sku: string;
  nameVi: string;
  category: 'kibble' | 'broth' | 'fish' | 'home_cooked';
  iconId: LivingItemIconId;
  portionSize: number;
  hungerRestore: number;
  hydrationBonus: number;
  satietyCost: number;
  isFreeStarter: boolean;
  defaultReaction: 'liked' | 'neutral';
}

export const PET_FOOD_CATALOG: readonly PetFoodSpec[] = [
  {
    sku: 'pet_kibble_basic',
    nameVi: 'Hạt mèo cơ bản',
    category: 'kibble',
    iconId: 'food_kibble',
    portionSize: 1,
    hungerRestore: 28,
    hydrationBonus: 0,
    satietyCost: 26,
    isFreeStarter: true,
    defaultReaction: 'neutral',
  },
  {
    sku: 'cat_broth_warm',
    nameVi: 'Súp gà ấm cho mèo',
    category: 'broth',
    iconId: 'food_warm_broth',
    portionSize: 1,
    hungerRestore: 22,
    hydrationBonus: 18,
    satietyCost: 20,
    isFreeStarter: false,
    defaultReaction: 'liked',
  },
  {
    sku: 'fish_carp_grilled',
    nameVi: 'Cá chép nướng nhạt',
    category: 'fish',
    iconId: 'food_grilled_fish',
    portionSize: 1,
    hungerRestore: 38,
    hydrationBonus: 4,
    satietyCost: 34,
    isFreeStarter: false,
    defaultReaction: 'liked',
  },
  {
    sku: 'fish_salmon_bite',
    nameVi: 'Miếng cá hồi mềm',
    category: 'fish',
    iconId: 'food_salmon_treat',
    portionSize: 1,
    hungerRestore: 42,
    hydrationBonus: 5,
    satietyCost: 36,
    isFreeStarter: false,
    defaultReaction: 'liked',
  },
  {
    sku: 'chicken_pumpkin_mash',
    nameVi: 'Gà hấp bí đỏ nghiền',
    category: 'home_cooked',
    iconId: 'food_warm_broth',
    portionSize: 1,
    hungerRestore: 34,
    hydrationBonus: 12,
    satietyCost: 30,
    isFreeStarter: false,
    defaultReaction: 'neutral',
  },
] as const;

// Explicitly block real-world toxic foods so crops/dishes from V0.2+ cannot accidentally be fed to cats
export const TOXIC_OR_UNSUITABLE_FOR_CATS: readonly string[] = [
  'chocolate',
  'cocoa',
  'onion',
  'garlic',
  'grape',
  'raisin',
  'coffee',
  'tea_leaf',
];

export function getPetFoodSpec(sku: string): PetFoodSpec | null {
  return PET_FOOD_CATALOG.find((f) => f.sku === sku) ?? null;
}

export function isSafeCatFoodSku(sku: string): boolean {
  const lower = sku.toLowerCase();
  if (TOXIC_OR_UNSUITABLE_FOR_CATS.some((bad) => lower.includes(bad))) {
    return false;
  }
  return getPetFoodSpec(sku) !== null;
}

export interface FoodEvaluationInput {
  sku: string;
  quality: 'normal' | 'silver' | 'gold';
  currentHunger: number;
  favoriteSkus: readonly string[];
  dislikedSkus: readonly string[];
  familiarSkus: readonly string[];
  lastFedAtMs: number | null;
  nowMs: number;
}

export interface FoodEvaluationResult {
  accepted: boolean;
  reaction: FoodReactionKind;
  hungerGain: number;
  hydrationGain: number;
  affectionGain: number; // Strictly diminished & non-farmable (0..2)
  cooldownActive: boolean;
  hintVi: string;
  consumeItem: boolean;
}

const FEED_DIMINISH_COOLDOWN_MS = 60_000;

export function evaluateFoodOffer(input: FoodEvaluationInput): FoodEvaluationResult {
  if (!isSafeCatFoodSku(input.sku)) {
    return {
      accepted: false,
      reaction: 'turn_away',
      hungerGain: 0,
      hydrationGain: 0,
      affectionGain: 0,
      cooldownActive: false,
      hintVi: 'Món này không an toàn hoặc không phù hợp với dạ dày của mèo.',
      consumeItem: false,
    };
  }

  const food = getPetFoodSpec(input.sku)!;
  if (input.currentHunger >= 92) {
    return {
      accepted: false,
      reaction: 'full_refuse',
      hungerGain: 0,
      hydrationGain: 0,
      affectionGain: 0,
      cooldownActive: false,
      hintVi: 'Bé vừa ngửi nhẹ rồi quay đi vì bụng vẫn còn rất no.',
      consumeItem: false,
    };
  }

  if (input.dislikedSkus.includes(food.sku)) {
    return {
      accepted: false,
      reaction: 'turn_away',
      hungerGain: 0,
      hydrationGain: 0,
      affectionGain: 0,
      cooldownActive: false,
      hintVi: 'Bé hít hít món này rồi khẽ lắc đầu — có vẻ bé không hợp vị này.',
      consumeItem: false,
    };
  }

  const qualityMult = input.quality === 'gold' ? 1.25 : input.quality === 'silver' ? 1.12 : 1.0;
  const isFav = input.favoriteSkus.includes(food.sku);
  const isFamiliar = input.familiarSkus.includes(food.sku);
  const cooldownActive =
    input.lastFedAtMs !== null && input.nowMs - input.lastFedAtMs < FEED_DIMINISH_COOLDOWN_MS;

  const reaction: FoodReactionKind = isFav
    ? 'eager'
    : isFamiliar || food.isFreeStarter
      ? 'normal'
      : 'curious_sniff';

  const hungerGain = Math.max(5, Math.round(food.hungerRestore * qualityMult * (isFav ? 1.15 : 1)));
  // Non-economic affection: capped & diminished so expensive food cannot buy instant love
  const affectionGain = cooldownActive ? 0 : isFav ? 2 : 1;

  return {
    accepted: true,
    reaction,
    hungerGain,
    hydrationGain: food.hydrationBonus,
    affectionGain,
    cooldownActive,
    hintVi: isFav
      ? 'Bé vểnh tai chạy tới và ăn ngon lành món yêu thích!'
      : reaction === 'curious_sniff'
        ? 'Bé tò mò đánh hơi một lúc rồi bắt đầu nhấm nháp.'
        : 'Bé chậm rãi thưởng thức phần ăn.',
    consumeItem: true,
  };
}
