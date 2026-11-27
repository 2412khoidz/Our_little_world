import type { PetActionType, PetMood, PetVitals } from '../../pet/petTypes';

/** Eye / mouth tokens from j4lpan/pet-shop `selectFace()` (MIT). */
export type PetShopEyeStyle = 'normal' | 'wide' | 'hearts' | 'stars' | 'happy' | 'angry';
export type PetShopMouthStyle = 'normal' | 'smile' | 'grumpy' | 'tongue' | 'shy' | 'pursed';
export type PetShopCarePanelMode = 'idle' | 'pet' | 'feed' | 'water' | 'play';

export const PET_SHOP_CARE_FLASH_MS = 2_400;

export interface PetShopCareFaceInput {
  mood: PetMood;
  vitals: PetVitals;
  careMode: PetShopCarePanelMode;
  feedEatPhase?: boolean;
}

export interface PetShopCareFace {
  eyes: PetShopEyeStyle;
  mouth: PetShopMouthStyle;
  showBlush: boolean;
  showSleepZzz: boolean;
  tailWagBoost: boolean;
}

/**
 * Close-up face picker adapted from pet-shop `selectFace()` for the OLW care panel only.
 * Server vitals + mood stay authoritative; this is presentation.
 */
export function selectPetShopCareFace(input: PetShopCareFaceInput): PetShopCareFace {
  let eyes: PetShopEyeStyle = 'normal';
  let mouth: PetShopMouthStyle = 'normal';
  let showBlush = false;
  const showSleepZzz = input.mood === 'sleepy' || input.vitals.energy <= 45;
  let tailWagBoost = false;

  if (input.careMode === 'pet') {
    eyes = 'hearts';
    mouth = 'smile';
    showBlush = true;
    tailWagBoost = true;
  } else if (input.careMode === 'feed') {
    eyes = 'happy';
    mouth = input.feedEatPhase ? 'tongue' : 'smile';
    tailWagBoost = true;
  } else if (input.careMode === 'water') {
    eyes = 'happy';
    mouth = 'pursed';
    tailWagBoost = true;
  } else if (input.careMode === 'play') {
    eyes = 'stars';
    mouth = 'smile';
    tailWagBoost = true;
  } else {
    if (input.mood === 'happy') {
      mouth = 'smile';
      if (input.vitals.fun >= 78) eyes = 'stars';
    } else if (input.mood === 'hungry') {
      eyes = 'angry';
      mouth = 'grumpy';
    } else if (input.mood === 'sleepy') {
      eyes = 'happy';
    } else if (input.mood === 'cozy') {
      if (input.vitals.fun >= 70) mouth = 'smile';
    }

    if (input.vitals.hunger <= 42 && eyes === 'normal') eyes = 'angry';
    if (input.vitals.energy <= 45 && input.mood !== 'sleepy' && eyes === 'normal') eyes = 'happy';
    if (input.vitals.fun >= 78 && input.vitals.hunger >= 65 && mouth === 'normal') mouth = 'smile';
  }

  return { eyes, mouth, showBlush, showSleepZzz, tailWagBoost };
}

export function resolvePetShopCareMode(
  flashAction: PetActionType | 'play' | null,
  flashAtMs: number | null,
  nowMs: number,
): PetShopCarePanelMode {
  if (flashAction && flashAtMs !== null && nowMs - flashAtMs < PET_SHOP_CARE_FLASH_MS) {
    if (flashAction === 'play') return 'play';
    return flashAction;
  }
  return 'idle';
}