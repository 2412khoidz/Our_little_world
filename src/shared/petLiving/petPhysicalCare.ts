import { evaluateFoodOffer, getPetFoodSpec, type FoodReactionKind } from './petFoodCatalog';
import type { CatCoatVariantId } from './petVisualTypes';

export interface BowlState {
  foodSku: string | null;
  foodQuality: 'normal' | 'silver' | 'gold';
  portions: number; // 0..2
}

export interface WaterBowlState {
  volume: number; // 0..100
  capacity: 100;
}

export type AdoptionStage = 'stray_visiting' | 'warming_up' | 'ready_to_adopt' | 'adopted';

export interface AdoptionStoryState {
  stage: AdoptionStage;
  strayVariant: CatCoatVariantId;
  fedStarterCount: number;
  pettedCount: number;
  adoptedPetId: string | null;
  adoptedName: string | null;
}

export interface PhysicalCarePetState {
  hunger: number;
  thirst: number;
  fun: number;
  isSleeping: boolean;
  lastFedAtMs: number | null;
  lastPettedAtMs: number | null;
  favoriteSkus: string[];
  dislikedSkus: string[];
  familiarSkus: string[];
  foodBowl: BowlState;
  waterBowl: WaterBowlState;
  pitcherWater: number; // 0..100
}

export function createInitialPhysicalCareState(): PhysicalCarePetState {
  return {
    hunger: 68,
    thirst: 70,
    fun: 72,
    isSleeping: false,
    lastFedAtMs: null,
    lastPettedAtMs: null,
    favoriteSkus: ['fish_salmon_bite', 'cat_broth_warm'],
    dislikedSkus: [],
    familiarSkus: ['pet_kibble_basic'],
    foodBowl: { foodSku: null, foodQuality: 'normal', portions: 0 },
    waterBowl: { volume: 60, capacity: 100 },
    pitcherWater: 100,
  };
}

/**
 * Step 1 of indirect feeding: Inventory -> Bowl transfer.
 * Never awards Hunger or Affection directly; cat decides when to walk over & consume.
 */
export function fillFoodBowlFromHeld(
  state: PhysicalCarePetState,
  sku: string,
  quality: 'normal' | 'silver' | 'gold',
): { ok: true; next: PhysicalCarePetState; deductInventoryQty: 1; messageVi: string } | { ok: false; messageVi: string } {
  const food = getPetFoodSpec(sku);
  if (!food) {
    return { ok: false, messageVi: 'Món này không thể đặt vào bát ăn của mèo.' };
  }
  if (state.foodBowl.portions >= 2) {
    return { ok: false, messageVi: 'Bát ăn của bé đã có đủ phần rồi.' };
  }
  return {
    ok: true,
    deductInventoryQty: 1,
    next: {
      ...state,
      foodBowl: {
        foodSku: sku,
        foodQuality: quality,
        portions: state.foodBowl.portions + 1,
      },
    },
    messageVi: `Đã đặt ${food.nameVi} vào bát ăn.`,
  };
}

/**
 * Direct hand-feeding or autonomous Bowl -> Consumed transition.
 * If offered directly and the cat refuses, returns consumeHeldQty: 0 so inventory stays intact.
 */
export function resolvePetEat(
  state: PhysicalCarePetState,
  source: 'bowl' | { sku: string; quality: 'normal' | 'silver' | 'gold' },
  nowMs: number,
): {
  ate: boolean;
  reaction: FoodReactionKind;
  consumeHeldQty: 0 | 1;
  next: PhysicalCarePetState;
  hintVi: string;
} {
  const sku = source === 'bowl' ? state.foodBowl.foodSku : source.sku;
  const quality = source === 'bowl' ? state.foodBowl.foodQuality : source.quality;
  if (!sku) {
    return {
      ate: false,
      reaction: 'curious_sniff',
      consumeHeldQty: 0,
      next: state,
      hintVi: 'Bát ăn đang trống.',
    };
  }

  const evalRes = evaluateFoodOffer({
    sku,
    quality,
    currentHunger: state.hunger,
    favoriteSkus: state.favoriteSkus,
    dislikedSkus: state.dislikedSkus,
    familiarSkus: state.familiarSkus,
    lastFedAtMs: state.lastFedAtMs,
    nowMs,
  });

  if (!evalRes.accepted) {
    return {
      ate: false,
      reaction: evalRes.reaction,
      consumeHeldQty: 0,
      next: state,
      hintVi: evalRes.hintVi,
    };
  }

  const nextBowl: BowlState =
    source === 'bowl'
      ? {
          foodSku: state.foodBowl.portions > 1 ? state.foodBowl.foodSku : null,
          foodQuality: state.foodBowl.foodQuality,
          portions: Math.max(0, state.foodBowl.portions - 1),
        }
      : state.foodBowl;

  const nextFamiliar = state.familiarSkus.includes(sku)
    ? state.familiarSkus
    : [...state.familiarSkus, sku];

  return {
    ate: true,
    reaction: evalRes.reaction,
    consumeHeldQty: source === 'bowl' ? 0 : 1, // Bowl already deducted when filled!
    next: {
      ...state,
      hunger: Math.min(100, state.hunger + evalRes.hungerGain),
      thirst: Math.min(100, state.thirst + evalRes.hydrationGain),
      isSleeping: false,
      lastFedAtMs: nowMs,
      familiarSkus: nextFamiliar,
      foodBowl: nextBowl,
    },
    hintVi: evalRes.hintVi,
  };
}

export function fillWaterPitcherFree(state: PhysicalCarePetState): PhysicalCarePetState {
  return { ...state, pitcherWater: 100 };
}

export function pourWaterIntoBowl(
  state: PhysicalCarePetState,
): { ok: true; next: PhysicalCarePetState; added: number; messageVi: string } | { ok: false; messageVi: string } {
  if (state.pitcherWater <= 0) {
    return { ok: false, messageVi: 'Bình nước đang cạn — hãy lấy thêm nước sạch nhé.' };
  }
  if (state.waterBowl.volume >= state.waterBowl.capacity) {
    return { ok: false, messageVi: 'Bát nước đang đầy rồi.' };
  }
  const space = state.waterBowl.capacity - state.waterBowl.volume;
  const pour = Math.min(space, state.pitcherWater);
  return {
    ok: true,
    added: pour,
    next: {
      ...state,
      pitcherWater: state.pitcherWater - pour,
      waterBowl: {
        ...state.waterBowl,
        volume: state.waterBowl.volume + pour,
      },
    },
    messageVi: 'Đã rót nước mát đầy bát cho bé.',
  };
}

export function catDrinkFromBowl(state: PhysicalCarePetState): { drank: boolean; next: PhysicalCarePetState } {
  if (state.waterBowl.volume <= 5 || state.thirst >= 92) {
    return { drank: false, next: state };
  }
  const sipped = Math.min(25, state.waterBowl.volume);
  return {
    drank: true,
    next: {
      ...state,
      thirst: Math.min(100, state.thirst + Math.max(15, sipped)),
      waterBowl: {
        ...state.waterBowl,
        volume: state.waterBowl.volume - sipped,
      },
    },
  };
}

export function interactPetGently(
  state: PhysicalCarePetState,
  nowMs: number,
): { accepted: boolean; reaction: 'purr' | 'sleepy_glance'; next: PhysicalCarePetState; hintVi: string } {
  if (state.isSleeping) {
    // Sleeping cats acknowledge softly instead of forcing animation swap
    return {
      accepted: false,
      reaction: 'sleepy_glance',
      next: state,
      hintVi: 'Bé khẽ mở mắt nhìn một cái rồi cuộn tròn ngủ tiếp.',
    };
  }
  const onDiminishingWindow =
    state.lastPettedAtMs !== null && nowMs - state.lastPettedAtMs < 25_000;
  return {
    accepted: true,
    reaction: 'purr',
    next: {
      ...state,
      fun: Math.min(100, state.fun + (onDiminishingWindow ? 1 : 6)),
      lastPettedAtMs: nowMs,
    },
    hintVi: onDiminishingWindow
      ? 'Bé rừ rừ khẽ khi bạn gãi nhẹ cằm.'
      : 'Bé dụi đầu vào tay bạn và rừ rừ đầy tin tưởng.',
  };
}

export function createAdoptionState(existingPet?: { id: string; name: string } | null): AdoptionStoryState {
  if (existingPet) {
    return {
      stage: 'adopted',
      strayVariant: 'ginger-tabby',
      fedStarterCount: 1,
      pettedCount: 1,
      adoptedPetId: existingPet.id,
      adoptedName: existingPet.name,
    };
  }
  return {
    stage: 'stray_visiting',
    strayVariant: 'ginger-tabby',
    fedStarterCount: 0,
    pettedCount: 0,
    adoptedPetId: null,
    adoptedName: null,
  };
}

export function progressAdoptionStory(
  story: AdoptionStoryState,
  event: { type: 'offer_starter_food' } | { type: 'gentle_pet' } | { type: 'confirm_adopt'; petId: string; name: string },
): AdoptionStoryState {
  // Never overwrite an already adopted pet (preserves existing world data & blocks duplicate adoptions)
  if (story.stage === 'adopted') return story;

  if (event.type === 'offer_starter_food') {
    const fedStarterCount = story.fedStarterCount + 1;
    return {
      ...story,
      fedStarterCount,
      stage: story.pettedCount > 0 ? 'ready_to_adopt' : 'warming_up',
    };
  }

  if (event.type === 'gentle_pet') {
    if (story.stage === 'stray_visiting' && story.fedStarterCount === 0) {
      // Cautious stray needs gentle starter food first
      return { ...story, stage: 'warming_up' };
    }
    return {
      ...story,
      pettedCount: story.pettedCount + 1,
      stage: story.fedStarterCount > 0 ? 'ready_to_adopt' : 'warming_up',
    };
  }

  if (story.stage === 'ready_to_adopt' || story.fedStarterCount > 0) {
    const cleanName = event.name.trim() || 'Quýt';
    return {
      ...story,
      stage: 'adopted',
      adoptedPetId: event.petId,
      adoptedName: cleanName,
    };
  }
  return story;
}
