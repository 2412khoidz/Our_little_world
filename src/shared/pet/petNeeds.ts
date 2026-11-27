import type { PetActionType, PetMood, PetVitals } from './petTypes';

export const PET_STAT_FLOOR = 30;
export const PET_STAT_MAX = 100;
export const PET_REST_ENERGY_FLOOR = 50;
export const PET_REST_THRESHOLD_MS = 8 * 3600 * 1000;
export const PET_MAX_CATCHUP_MS = 48 * 3600 * 1000;

export const PET_DECAY_PER_HOUR = {
  hunger: 2,
  energy: 1,
  fun: 1,
} as const;

export const PET_ACTION_COOLDOWNS_MS: Record<PetActionType, number> = {
  pet: 15_000,
  feed: 60_000,
  water: 20_000,
};

export function clampStat(value: number, floor = PET_STAT_FLOOR, max = PET_STAT_MAX): number {
  return Math.max(floor, Math.min(max, Math.round(value)));
}

export function derivePetMood(vitals: PetVitals): PetMood {
  if (vitals.hunger <= 42) return 'hungry';
  if (vitals.energy <= 45) return 'sleepy';
  if (vitals.fun >= 78 && vitals.hunger >= 65) return 'happy';
  return 'cozy';
}

/**
 * Pure integer catch-up math matching Postgres `pet_interact` / `pet_get_snapshot`.
 * Non-lethal: stats never fall below FLOOR = 30, and energy recovers at least to 50
 * after 8+ hours of partner absence. Elapsed time is capped at 48 hours.
 */
export function computePetVitalsAt(
  baseVitals: PetVitals,
  simStateAtMs: number,
  targetNowMs: number,
): PetVitals {
  const rawElapsed = Math.max(0, targetNowMs - simStateAtMs);
  const elapsedMs = Math.min(PET_MAX_CATCHUP_MS, rawElapsed);

  const hungerLoss = Math.floor((elapsedMs * PET_DECAY_PER_HOUR.hunger) / 3_600_000);
  const energyLoss = Math.floor((elapsedMs * PET_DECAY_PER_HOUR.energy) / 3_600_000);
  const funLoss = Math.floor((elapsedMs * PET_DECAY_PER_HOUR.fun) / 3_600_000);

  const hunger = clampStat(baseVitals.hunger - hungerLoss);
  let energy = clampStat(baseVitals.energy - energyLoss);
  if (elapsedMs >= PET_REST_THRESHOLD_MS) {
    energy = Math.max(energy, PET_REST_ENERGY_FLOOR);
  }
  const fun = clampStat(baseVitals.fun - funLoss);

  return { hunger, energy, fun };
}

export function getPetActionCooldownRemainingMs(
  action: PetActionType,
  lastActionAtMs: number | null,
  serverNowMs: number,
): number {
  if (lastActionAtMs === null) return 0;
  const cd = PET_ACTION_COOLDOWNS_MS[action];
  return Math.max(0, lastActionAtMs + cd - serverNowMs);
}

export function applyPetActionVitals(vitals: PetVitals, action: PetActionType): PetVitals {
  if (action === 'feed') {
    return {
      hunger: clampStat(vitals.hunger + 30),
      energy: clampStat(vitals.energy + 3),
      fun: clampStat(vitals.fun + 5),
    };
  }
  if (action === 'pet') {
    return {
      hunger: vitals.hunger,
      energy: clampStat(vitals.energy + 2),
      fun: clampStat(vitals.fun + 12),
    };
  }
  return {
    hunger: vitals.hunger,
    energy: clampStat(vitals.energy + 2),
    fun: clampStat(vitals.fun + 6),
  };
}

export function getPetMoodLabelVi(mood: PetMood): string {
  switch (mood) {
    case 'happy':
      return 'Đang rất vui';
    case 'hungry':
      return 'Hơi đói bụng';
    case 'sleepy':
      return 'Đang lim dim ngủ';
    default:
      return 'Thư giãn ấm áp';
  }
}
