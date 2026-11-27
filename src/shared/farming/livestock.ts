/**
 * Shared Cooperative Livestock Husbandry (Checkpoint D).
 *
 * Transplanted from:
 * - `KrasimirKralev/harvest-hollow` @ 9b23e1a (shared/content/animals.js & shared/rules/actions/animals.js)
 * - `Shiz0id/webfarmville` @ c420bc2 (shared/src/content/producers.ts & feedmill.ts)
 *
 * Policy guarantees:
 * - Both partners share and care for the same animals (petting, feeding, collecting).
 * - Animals NEVER die, flee, or spoil from offline absence (happiness floors gently at 30/100).
 * - Independent from Quýt's Pet Care 3D system.
 */
import type { Rng } from '../rng.ts';
import { DEFAULT_CALENDAR_DAY_MS, resolveWorldCalendar } from '../world/worldCalendar.ts';
import type { QualityTier } from './types.ts';

export type LivestockSpeciesId =
  | 'chicken'
  | 'duck'
  | 'cow'
  | 'goat'
  | 'sheep'
  | 'rabbit'
  | 'bee';

export type LivestockHabitatId =
  | 'coop'
  | 'pond_coop'
  | 'barn'
  | 'pasture'
  | 'hutch'
  | 'apiary';

export interface LivestockSpeciesDef {
  readonly speciesId: LivestockSpeciesId;
  readonly nameVi: string;
  readonly habitatId: LivestockHabitatId;
  readonly habitatNameVi: string;
  readonly adoptCostCoins: number;
  /** Default feed item required per production cycle; null for self-foraging bees. */
  readonly feedSku: string | null;
  readonly cycleMs: number;
  readonly productSku: string;
  readonly prizedSku: string;
  readonly baseYield: number;
  readonly xp: number;
  readonly basePrizedBp: number;
}

export const LIVESTOCK_HAPPINESS_MIN = 30;
export const LIVESTOCK_HAPPINESS_MAX = 100;
export const LIVESTOCK_DEFAULT_HAPPINESS = 70;
export const LIVESTOCK_MAX_SLOTS = 14;

export const LIVESTOCK_SPECIES_LIST: readonly LivestockSpeciesDef[] = [
  {
    speciesId: 'chicken',
    nameVi: 'Gà mái hoa',
    habitatId: 'coop',
    habitatNameVi: 'Chuồng gà ấm',
    adoptCostCoins: 150,
    feedSku: 'feed_chicken',
    cycleMs: 12 * 60_000,
    productSku: 'egg',
    prizedSku: 'golden_egg',
    baseYield: 2,
    xp: 10,
    basePrizedBp: 1_200,
  },
  {
    speciesId: 'duck',
    nameVi: 'Vịt đồng cổ xanh',
    habitatId: 'pond_coop',
    habitatNameVi: 'Bờ ao cạnh chuồng',
    adoptCostCoins: 280,
    feedSku: 'feed_chicken',
    cycleMs: 25 * 60_000,
    productSku: 'duck_egg',
    prizedSku: 'duck_feather',
    baseYield: 2,
    xp: 15,
    basePrizedBp: 1_800,
  },
  {
    speciesId: 'cow',
    nameVi: 'Bò sữa lang trắng',
    habitatId: 'barn',
    habitatNameVi: 'Chuồng bò lớn',
    adoptCostCoins: 420,
    feedSku: 'feed_livestock',
    cycleMs: 40 * 60_000,
    productSku: 'milk',
    prizedSku: 'cream_top',
    baseYield: 2,
    xp: 22,
    basePrizedBp: 1_500,
  },
  {
    speciesId: 'goat',
    nameVi: 'Dê núi hiền lành',
    habitatId: 'barn',
    habitatNameVi: 'Chuồng bò & dê',
    adoptCostCoins: 520,
    feedSku: 'feed_livestock',
    cycleMs: 50 * 60_000,
    productSku: 'goat_milk',
    prizedSku: 'aged_curd',
    baseYield: 2,
    xp: 26,
    basePrizedBp: 1_400,
  },
  {
    speciesId: 'sheep',
    nameVi: 'Cừu bông trắng',
    habitatId: 'pasture',
    habitatNameVi: 'Đồng cỏ xanh',
    adoptCostCoins: 460,
    feedSku: 'feed_livestock',
    cycleMs: 45 * 60_000,
    productSku: 'wool',
    prizedSku: 'fine_fleece',
    baseYield: 2,
    xp: 24,
    basePrizedBp: 1_600,
  },
  {
    speciesId: 'rabbit',
    nameVi: 'Thỏ Angora xù',
    habitatId: 'hutch',
    habitatNameVi: 'Chuồng gỗ thỏ',
    adoptCostCoins: 380,
    feedSku: 'feed_rabbit',
    cycleMs: 35 * 60_000,
    productSku: 'angora_wool',
    prizedSku: 'silky_tuft',
    baseYield: 2,
    xp: 20,
    basePrizedBp: 1_600,
  },
  {
    speciesId: 'bee',
    nameVi: 'Đàn ong mật vườn hoa',
    habitatId: 'apiary',
    habitatNameVi: 'Trại ong gỗ',
    adoptCostCoins: 340,
    feedSku: null,
    cycleMs: 30 * 60_000,
    productSku: 'honey',
    prizedSku: 'beeswax',
    baseYield: 2,
    xp: 18,
    basePrizedBp: 2_200,
  },
];

export const LIVESTOCK_SPECIES_BY_ID: Readonly<Record<LivestockSpeciesId, LivestockSpeciesDef>> = {
  chicken: LIVESTOCK_SPECIES_LIST[0]!,
  duck: LIVESTOCK_SPECIES_LIST[1]!,
  cow: LIVESTOCK_SPECIES_LIST[2]!,
  goat: LIVESTOCK_SPECIES_LIST[3]!,
  sheep: LIVESTOCK_SPECIES_LIST[4]!,
  rabbit: LIVESTOCK_SPECIES_LIST[5]!,
  bee: LIVESTOCK_SPECIES_LIST[6]!,
};

export interface LivestockAnimal {
  readonly animalId: string;
  readonly speciesId: LivestockSpeciesId;
  readonly nickname: string;
  readonly adoptedAtMs: number;
  readonly adoptedBy: string;
  /** Stored baseline happiness (30..100). */
  readonly happiness: number;
  readonly lastCareAtMs: number;
  /** Fed cycle timestamps (`null` when waiting for feed; auto-set for bees). */
  readonly fedAtMs: number | null;
  readonly readyAtMs: number | null;
  readonly deluxeFed: boolean;
  /** Calendar day index & actor IDs who petted on that day (enables cooperative pair care!). */
  readonly petCalendarDay: number;
  readonly petByActors: readonly string[];
  readonly collectionsCount: number;
}

export interface LivestockState {
  readonly animals: readonly LivestockAnimal[];
  readonly nextSeq: number;
}

export function createLivestockState(): LivestockState {
  return { animals: [], nextSeq: 1 };
}

/** Lazy happiness computation: gentle -5/day decay after 24h, strictly floored at 30 (never dies!). */
export function effectiveLivestockHappiness(animal: LivestockAnimal, nowMs: number): number {
  const idleMs = Math.max(0, nowMs - animal.lastCareAtMs);
  const graceMs = 24 * 3_600_000;
  if (idleMs <= graceMs) {
    return Math.max(LIVESTOCK_HAPPINESS_MIN, Math.min(LIVESTOCK_HAPPINESS_MAX, animal.happiness));
  }
  const extraDays = Math.floor((idleMs - graceMs) / (24 * 3_600_000));
  return Math.max(
    LIVESTOCK_HAPPINESS_MIN,
    Math.min(LIVESTOCK_HAPPINESS_MAX, animal.happiness - extraDays * 5),
  );
}

export type LivestockCycleStatus = 'hungry' | 'producing' | 'ready';

export interface ProjectedLivestockAnimal {
  readonly animal: LivestockAnimal;
  readonly def: LivestockSpeciesDef;
  readonly happiness: number;
  readonly status: LivestockCycleStatus;
  readonly progressPermille: number;
  readonly pettedTodayByPair: boolean;
}

export function projectLivestock(
  state: LivestockState,
  nowMs: number,
  worldEpochMs = 0,
): ProjectedLivestockAnimal[] {
  const currentDay = resolveWorldCalendar(nowMs, worldEpochMs, DEFAULT_CALENDAR_DAY_MS).totalDay;
  return state.animals.map((animal) => {
    const def = LIVESTOCK_SPECIES_BY_ID[animal.speciesId];
    const happiness = effectiveLivestockHappiness(animal, nowMs);
    let status: LivestockCycleStatus = 'hungry';
    let progressPermille = 0;

    if (animal.fedAtMs !== null && animal.readyAtMs !== null) {
      if (nowMs >= animal.readyAtMs) {
        status = 'ready';
        progressPermille = 1000;
      } else {
        status = 'producing';
        const span = Math.max(1, animal.readyAtMs - animal.fedAtMs);
        progressPermille = Math.max(
          0,
          Math.min(999, Math.floor(((nowMs - animal.fedAtMs) * 1000) / span)),
        );
      }
    }

    return {
      animal,
      def,
      happiness,
      status,
      progressPermille,
      pettedTodayByPair: animal.petCalendarDay === currentDay && animal.petByActors.length >= 2,
    };
  });
}

export function adoptLivestock(
  state: LivestockState,
  speciesId: LivestockSpeciesId,
  nickname: string | null,
  nowMs: number,
  actorId: string,
):
  | { ok: true; state: LivestockState; animal: LivestockAnimal; costCoins: number }
  | { ok: false; code: string; messageVi: string } {
  const def = LIVESTOCK_SPECIES_BY_ID[speciesId];
  if (!def) {
    return { ok: false, code: 'UNKNOWN_SPECIES', messageVi: 'Loài vật nuôi không hợp lệ.' };
  }
  if (state.animals.length >= LIVESTOCK_MAX_SLOTS) {
    return {
      ok: false,
      code: 'BARN_FULL',
      messageVi: `Trang trại đã đủ ${LIVESTOCK_MAX_SLOTS} vật nuôi.`,
    };
  }
  const cleanName = (nickname ?? '').trim() || `${def.nameVi} #${state.nextSeq}`;
  const animalId = `ls_${speciesId}_${state.nextSeq}`;
  // Bees forage nectar automatically right when placed
  const autoStart = def.feedSku === null;
  const animal: LivestockAnimal = {
    animalId,
    speciesId,
    nickname: cleanName,
    adoptedAtMs: nowMs,
    adoptedBy: actorId,
    happiness: LIVESTOCK_DEFAULT_HAPPINESS,
    lastCareAtMs: nowMs,
    fedAtMs: autoStart ? nowMs : null,
    readyAtMs: autoStart ? nowMs + def.cycleMs : null,
    deluxeFed: false,
    petCalendarDay: 0,
    petByActors: [],
    collectionsCount: 0,
  };
  return {
    ok: true,
    state: { animals: [...state.animals, animal], nextSeq: state.nextSeq + 1 },
    animal,
    costCoins: def.adoptCostCoins,
  };
}

export function isAcceptableFeedForSpecies(speciesId: LivestockSpeciesId, feedSku: string): boolean {
  const def = LIVESTOCK_SPECIES_BY_ID[speciesId];
  if (!def || def.feedSku === null) return false;
  return feedSku === def.feedSku || feedSku === 'feed_deluxe' || feedSku === 'wild_clover';
}

export function feedLivestockAnimal(
  state: LivestockState,
  animalId: string,
  feedSku: string,
  nowMs: number,
):
  | { ok: true; state: LivestockState; consumedFeedSku: string }
  | { ok: false; code: string; messageVi: string } {
  const idx = state.animals.findIndex((a) => a.animalId === animalId);
  if (idx < 0) return { ok: false, code: 'NOT_FOUND', messageVi: 'Không tìm thấy vật nuôi.' };
  const target = state.animals[idx]!;
  const def = LIVESTOCK_SPECIES_BY_ID[target.speciesId];
  if (def.feedSku === null) {
    return { ok: false, code: 'NO_FEED_NEEDED', messageVi: `${def.nameVi} tự kiếm mật ngoài vườn hoa, không cần cho ăn.` };
  }
  if (target.fedAtMs !== null) {
    return { ok: false, code: 'ALREADY_FED', messageVi: `${target.nickname} đang trong chu kỳ sản xuất rồi.` };
  }
  if (!isAcceptableFeedForSpecies(target.speciesId, feedSku)) {
    return { ok: false, code: 'WRONG_FEED', messageVi: `Thức ăn không phù hợp với ${def.nameVi}.` };
  }

  const curHappy = effectiveLivestockHappiness(target, nowMs);
  const deluxeFed = feedSku === 'feed_deluxe';
  const nextHappy = Math.min(LIVESTOCK_HAPPINESS_MAX, curHappy + (deluxeFed ? 12 : 6));
  const updated: LivestockAnimal = {
    ...target,
    happiness: nextHappy,
    lastCareAtMs: nowMs,
    fedAtMs: nowMs,
    readyAtMs: nowMs + def.cycleMs,
    deluxeFed,
  };
  const animals = state.animals.slice();
  animals[idx] = updated;
  return { ok: true, state: { ...state, animals }, consumedFeedSku: feedSku };
}

export function petLivestockAnimal(
  state: LivestockState,
  animalId: string,
  nowMs: number,
  actorId: string,
  worldEpochMs = 0,
):
  | { ok: true; state: LivestockState; pairCareBonus: boolean }
  | { ok: false; code: string; messageVi: string } {
  const idx = state.animals.findIndex((a) => a.animalId === animalId);
  if (idx < 0) return { ok: false, code: 'NOT_FOUND', messageVi: 'Không tìm thấy vật nuôi.' };
  const target = state.animals[idx]!;
  const currentDay = resolveWorldCalendar(nowMs, worldEpochMs, DEFAULT_CALENDAR_DAY_MS).totalDay;

  const sameDay = target.petCalendarDay === currentDay;
  if (sameDay && target.petByActors.includes(actorId)) {
    return {
      ok: false,
      code: 'ALREADY_PETTED',
      messageVi: `Bạn đã vuốt ve ${target.nickname} hôm nay rồi (người thương vẫn có thể chăm thêm!).`,
    };
  }

  const nextActors = sameDay ? [...target.petByActors, actorId] : [actorId];
  const curHappy = effectiveLivestockHappiness(target, nowMs);
  const nextHappy = Math.min(LIVESTOCK_HAPPINESS_MAX, curHappy + 12);

  // Small 10% remaining time trim when currently producing & not yet ready
  let readyAtMs = target.readyAtMs;
  if (target.fedAtMs !== null && readyAtMs !== null && nowMs < readyAtMs) {
    const remaining = readyAtMs - nowMs;
    readyAtMs = nowMs + Math.max(1_000, Math.floor(remaining * 0.9));
  }

  const updated: LivestockAnimal = {
    ...target,
    happiness: nextHappy,
    lastCareAtMs: nowMs,
    petCalendarDay: currentDay,
    petByActors: nextActors,
    readyAtMs,
  };
  const animals = state.animals.slice();
  animals[idx] = updated;
  return {
    ok: true,
    state: { ...state, animals },
    pairCareBonus: nextActors.length >= 2,
  };
}

export function collectLivestockProduct(
  state: LivestockState,
  animalId: string,
  nowMs: number,
  rng: Rng,
):
  | {
      ok: true;
      state: LivestockState;
      sku: string;
      qty: number;
      quality: QualityTier;
      prized: boolean;
      xp: number;
    }
  | { ok: false; code: string; messageVi: string } {
  const idx = state.animals.findIndex((a) => a.animalId === animalId);
  if (idx < 0) return { ok: false, code: 'NOT_FOUND', messageVi: 'Không tìm thấy vật nuôi.' };
  const target = state.animals[idx]!;
  const def = LIVESTOCK_SPECIES_BY_ID[target.speciesId];
  if (target.fedAtMs === null || target.readyAtMs === null) {
    return { ok: false, code: 'HUNGRY', messageVi: `${target.nickname} cần được cho ăn trước.` };
  }
  if (nowMs < target.readyAtMs) {
    return { ok: false, code: 'NOT_READY', messageVi: `${target.nickname} chưa tới giờ thu hoạch.` };
  }

  const happy = effectiveLivestockHappiness(target, nowMs);
  const pairBonus = target.petByActors.length >= 2 ? 1_000 : 0;
  const deluxeBoost = target.deluxeFed ? 2_500 : 0;
  const prizedChance =
    (def.basePrizedBp + Math.max(0, happy - 50) * 35 + pairBonus + deluxeBoost) / 10_000;
  const prized = rng() < prizedChance;
  const sku = prized ? def.prizedSku : def.productSku;
  const qty = def.baseYield + (target.deluxeFed ? 1 : 0) + (happy >= 90 && rng() < 0.3 ? 1 : 0);

  const qRoll = rng();
  const goldCutoff = 0.1 + (happy - 30) * 0.002 + (target.deluxeFed ? 0.12 : 0);
  const silverCutoff = goldCutoff + 0.25;
  const quality: QualityTier = qRoll < goldCutoff ? 'gold' : qRoll < silverCutoff ? 'silver' : 'normal';

  const autoRestart = def.feedSku === null;
  const animals = state.animals.slice();
  animals[idx] = {
    ...target,
    fedAtMs: autoRestart ? nowMs : null,
    readyAtMs: autoRestart ? nowMs + def.cycleMs : null,
    deluxeFed: false,
    collectionsCount: target.collectionsCount + 1,
  };

  return {
    ok: true,
    state: { ...state, animals },
    sku,
    qty,
    quality,
    prized,
    xp: def.xp,
  };
}
