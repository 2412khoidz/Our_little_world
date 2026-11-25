/**
 * Farming domain for Our Little World (V0.2.1).
 *
 * Numbers are authoritative for docs/economy/PRODUCTION_CHAINS.md. Growth is a
 * pure function of `nowMs - plantedAtMs`; there is no crop death, no offline
 * penalty and no wall-clock read inside this module.
 */

import { normalizeSeed, type Rng } from '../rng';
import type {
  CropDefinition,
  CropSku,
  Farm,
  FarmingResult,
  FlowerSku,
  HarvestedBundle,
  HarvestedItem,
  PlantedCrop,
  PlotState,
  QualityTier,
} from './types';
import { farmingError } from './types';

import { FARM_PLOT_COUNT, isValidFarmPlotIndex, isFarmPlotIndexOnContractSoil } from './farmPlotIndex';

export const MINUTE_MS = 60_000;

/** Legacy slice dimensions (V0.2.0 garden tab) — domain grid is now full farm contract. */
export const GARDEN_COLUMNS = 6;
export const GARDEN_ROWS = 4;
/** @deprecated Use {@link FARM_PLOT_COUNT} (184 plots, farmPlotContract v1.0.0). */
export const GARDEN_PLOT_COUNT = FARM_PLOT_COUNT;
export { FARM_PLOT_COUNT };

/**
 * A watered plot grows up to 25% faster. The reduction is capped per growth
 * cycle so future watering upgrades can never trivialise a crop.
 */
export const MAX_WATER_REDUCTION_RATIO = 0.25;

/** One watering per growth cycle keeps watering idempotent, not a grind. */
export const MAX_WATERINGS_PER_CYCLE = 1;

/** Single helper converting design-document minutes to milliseconds. */
export function minutesToMs(minutes: number): number {
  return Math.round(minutes * MINUTE_MS);
}

const ALL_QUALITY_TIERS: readonly QualityTier[] = Object.freeze(['normal', 'silver', 'gold'] as const);

/** Default per-water bonus: 25% of `growMs`, matching GAME_DESIGN.md. */
function defaultWaterBonusMs(growMs: number): number {
  return Math.floor(growMs * MAX_WATER_REDUCTION_RATIO);
}

/**
 * Crop definitions keyed by OUTPUT SKU (a `wheat` plant is planted from
 * `seed_wheat`).
 *
 * Documented assumptions where PRODUCTION_CHAINS.md gives no number:
 * - `carrot`: 15 minutes (between wheat 5m and tomato 45m; seed price 8c).
 * - `peach`: 180 minutes initial growth and 120 minutes per regrowth, with
 *   5 additional harvests (6 harvests total). The doc only says "perennial,
 *   qty 3, multi-regrow".
 * - `rose_sakura`: hybrid-only, never plantable (seedSku `null`); its 90m
 *   grow time mirrors its rose_pink parent for a future greenhouse variant.
 * - `peach` is planted from an inferred `sapling_peach` input because the doc
 *   lists no seed SKU for fruit trees.
 */
export const CROP_DEFINITIONS: Readonly<Record<CropSku, CropDefinition>> = Object.freeze({
  // PRODUCTION_CHAINS.md: seed_wheat 4c, "Cây khởi đầu nhanh (5m)".
  wheat: {
    cropSku: 'wheat',
    nameVi: 'Lúa mì',
    seedSku: 'seed_wheat',
    growMs: minutesToMs(5),
    harvestQty: 1,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(5)),
    waterable: true,
  },
  // PRODUCTION_CHAINS.md has no growth time for carrot; inferred 15m (see above).
  carrot: {
    cropSku: 'carrot',
    nameVi: 'Cà rốt',
    seedSku: 'seed_carrot',
    growMs: minutesToMs(15),
    harvestQty: 1,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(15)),
    waterable: true,
  },
  // PRODUCTION_CHAINS.md: seed_tomato 14c, "Thu hoạch x2 quả (45m)".
  tomato: {
    cropSku: 'tomato',
    nameVi: 'Cà chua',
    seedSku: 'seed_tomato',
    growMs: minutesToMs(45),
    harvestQty: 2,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(45)),
    waterable: true,
  },
  // PRODUCTION_CHAINS.md: seed_strawberry 22c, "Thu hoạch x2, bánh tart (90m)".
  strawberry: {
    cropSku: 'strawberry',
    nameVi: 'Dâu tây',
    seedSku: 'seed_strawberry',
    growMs: minutesToMs(90),
    harvestQty: 2,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(90)),
    waterable: true,
  },
  // PRODUCTION_CHAINS.md: seed_sunflower 16c, "Hoa / bó hoa (60m)".
  sunflower: {
    cropSku: 'sunflower',
    nameVi: 'Hướng dương',
    seedSku: 'seed_sunflower',
    growMs: minutesToMs(60),
    harvestQty: 1,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(60)),
    waterable: true,
  },
  // PRODUCTION_CHAINS.md: seed_rose_pink 20c, "Lai hoa anh đào (90m)".
  rose_pink: {
    cropSku: 'rose_pink',
    nameVi: 'Hồng phấn',
    seedSku: 'seed_rose_pink',
    growMs: minutesToMs(90),
    harvestQty: 1,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(90)),
    waterable: true,
  },
  // Hybrid-only (bred from flowers); deliberately has no seedSku.
  rose_sakura: {
    cropSku: 'rose_sakura',
    nameVi: 'Anh đào',
    seedSku: null,
    growMs: minutesToMs(90),
    harvestQty: 1,
    // Prize flower: normal is not an allowed tier, only silver/gold.
    qualityTiers: Object.freeze(['silver', 'gold'] as const),
    waterable: false,
  },
  // PRODUCTION_CHAINS.md: seed_cabbage 26c, "Cây dài hạn (120m)".
  cabbage: {
    cropSku: 'cabbage',
    nameVi: 'Bắp cải',
    seedSku: 'seed_cabbage',
    growMs: minutesToMs(120),
    harvestQty: 1,
    qualityTiers: ALL_QUALITY_TIERS,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(120)),
    waterable: true,
  },
  // Perennial fruit tree: plant once, harvest qty 3, regrows several cycles.
  peach: {
    cropSku: 'peach',
    nameVi: 'Đào',
    seedSku: 'sapling_peach',
    growMs: minutesToMs(180),
    harvestQty: 3,
    qualityTiers: ALL_QUALITY_TIERS,
    regrowMs: minutesToMs(120),
    regrowHarvests: 5,
    waterBonusMs: defaultWaterBonusMs(minutesToMs(180)),
    waterable: true,
  },
});

/** Flower species that may take part in cross-breeding. */
export const FLOWER_CROP_SKUS: readonly FlowerSku[] = Object.freeze([
  'rose_pink',
  'sunflower',
  'rose_sakura',
] as const);

export function getCropDefinition(cropSku: string): CropDefinition | undefined {
  if (!Object.prototype.hasOwnProperty.call(CROP_DEFINITIONS, cropSku)) {
    return undefined;
  }
  return CROP_DEFINITIONS[cropSku as CropSku];
}

export function isFlowerCrop(cropSku: string): cropSku is FlowerSku {
  return cropSku === 'rose_pink' || cropSku === 'sunflower' || cropSku === 'rose_sakura';
}

export function isValidPlotIndex(plotIndex: number): boolean {
  return isValidFarmPlotIndex(plotIndex) && isFarmPlotIndexOnContractSoil(plotIndex);
}

function getPlantedCrop(plot: PlotState): PlantedCrop | undefined {
  return plot.soil === 'planted' ? plot.crop : undefined;
}

/** Base duration of the CURRENT cycle (initial `growMs` or `regrowMs`). */
export function getCycleBaseMs(crop: PlantedCrop): number {
  const definition = getCropDefinition(crop.cropSku);
  if (!definition) {
    return 0;
  }
  if (crop.isRegrowCycle && definition.regrowMs !== undefined) {
    return definition.regrowMs;
  }
  return definition.growMs;
}

/** Total growth-time reduction earned by watering in the current cycle. */
export function getWaterReductionMs(crop: PlantedCrop): number {
  const definition = getCropDefinition(crop.cropSku);
  if (!definition || !definition.waterable) {
    return 0;
  }
  const baseMs = getCycleBaseMs(crop);
  if (baseMs <= 0) {
    return 0;
  }
  const capMs = Math.floor(baseMs * MAX_WATER_REDUCTION_RATIO);
  const perWaterMs = definition.waterBonusMs ?? defaultWaterBonusMs(baseMs);
  return Math.min(capMs, Math.max(0, crop.waterCount * perWaterMs));
}

/**
 * Growth ratio in integer per-mille (0..1000). Clamped so an offline plot is
 * simply "ready" (1000) and never overflows or turns into a failure state.
 */
export function growthProgress03(crop: PlantedCrop, nowMs: number): number {
  if (!Number.isFinite(nowMs)) {
    return 0;
  }
  const baseMs = getCycleBaseMs(crop);
  if (baseMs <= 0) {
    return 0;
  }
  const effectiveMs = Math.max(1, baseMs - getWaterReductionMs(crop));
  const elapsedMs = nowMs - crop.plantedAtMs;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 0;
  }
  return Math.min(1000, Math.floor((elapsedMs * 1000) / effectiveMs));
}

export function isReady(crop: PlantedCrop, nowMs: number): boolean {
  return growthProgress03(crop, nowMs) >= 1000;
}

export function createFarm(seed: number): Farm {
  const normalizedSeed = normalizeSeed(seed);
  const plots: PlotState[] = [];
  for (let plotIndex = 0; plotIndex < FARM_PLOT_COUNT; plotIndex += 1) {
    plots.push({ plotId: plotIndex, soil: 'empty' });
  }
  return { seed: normalizedSeed, plots };
}

export interface TillInput {
  readonly plotIndex: number;
}

export type TillResult = FarmingResult<{ readonly farm: Farm }>;

/** Hoe untilled fallow soil (`empty` → `tilled`). */
export function till(farm: Farm, input: TillInput): TillResult {
  const { plotIndex } = input;
  if (!isValidPlotIndex(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  const current = farm.plots[plotIndex];
  if (!current) {
    return farmingError('INVALID_PLOT');
  }
  if (current.soil === 'planted') {
    return farmingError('PLOT_OCCUPIED');
  }
  if (current.soil === 'tilled') {
    return farmingError('ALREADY_TILLED');
  }
  return {
    ok: true,
    farm: replacePlot(farm, plotIndex, { plotId: plotIndex, soil: 'tilled' }),
  };
}

function replacePlot(farm: Farm, plotIndex: number, plot: PlotState): Farm {
  const plots = farm.plots.slice();
  plots[plotIndex] = plot;
  return { seed: farm.seed, plots };
}

export interface PlantInput {
  readonly plotIndex: number;
  readonly cropSku: string;
  readonly nowMs: number;
}

export type PlantResult = FarmingResult<{ readonly farm: Farm }>;

/**
 * Plants a seed on an empty plot. Unknown crops, occupied plots and
 * seed-only hybrids (e.g. `rose_sakura`) are rejected without mutating `farm`.
 */
export function plant(farm: Farm, input: PlantInput): PlantResult {
  const { plotIndex, cropSku, nowMs } = input;
  if (!isValidPlotIndex(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  if (!Number.isFinite(nowMs)) {
    return farmingError('INVALID_TIME');
  }
  const definition = getCropDefinition(cropSku);
  if (!definition) {
    return farmingError('UNKNOWN_CROP');
  }
  if (definition.seedSku === null) {
    return farmingError('NOT_PLANTABLE');
  }
  const current = farm.plots[plotIndex];
  if (!current) {
    return farmingError('INVALID_PLOT');
  }
  if (current.soil !== 'tilled') {
    return farmingError(current.soil === 'planted' ? 'PLOT_OCCUPIED' : 'SOIL_NOT_TILLED');
  }
  const crop: PlantedCrop = {
    cropSku: definition.cropSku,
    plantedAtMs: nowMs,
    waterCount: 0,
    regrowRemaining: definition.regrowHarvests ?? 0,
    isRegrowCycle: false,
  };
  return {
    ok: true,
    farm: replacePlot(farm, plotIndex, { plotId: plotIndex, soil: 'planted', crop }),
  };
}

export interface WaterInput {
  readonly plotIndex: number;
  readonly nowMs: number;
}

export type WaterResult = FarmingResult<{ readonly farm: Farm }>;

/**
 * Waters a growing crop exactly once per growth cycle. Watering an empty plot,
 * a ready crop or an already-watered cycle is rejected.
 */
export function water(farm: Farm, input: WaterInput): WaterResult {
  const { plotIndex, nowMs } = input;
  if (!isValidPlotIndex(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  if (!Number.isFinite(nowMs)) {
    return farmingError('INVALID_TIME');
  }
  const current = farm.plots[plotIndex];
  if (!current) {
    return farmingError('INVALID_PLOT');
  }
  const crop = getPlantedCrop(current);
  if (!crop) {
    return farmingError('NO_CROP');
  }
  const definition = getCropDefinition(crop.cropSku);
  if (!definition) {
    return farmingError('UNKNOWN_CROP');
  }
  if (!definition.waterable) {
    return farmingError('NOT_WATERABLE');
  }
  if (isReady(crop, nowMs)) {
    return farmingError('ALREADY_READY');
  }
  if (crop.waterCount >= MAX_WATERINGS_PER_CYCLE) {
    return farmingError('ALREADY_WATERED');
  }
  const wateredCrop: PlantedCrop = { ...crop, waterCount: crop.waterCount + 1 };
  return {
    ok: true,
    farm: replacePlot(farm, plotIndex, { plotId: plotIndex, soil: 'planted', crop: wateredCrop }),
  };
}

export interface HarvestInput {
  readonly plotIndex: number;
  readonly nowMs: number;
  readonly rng: Rng;
}

export type HarvestResult = FarmingResult<{
  readonly farm: Farm;
  readonly harvested: HarvestedBundle;
}>;

const QUALITY_WEIGHTS: Readonly<Record<QualityTier, number>> = Object.freeze({
  normal: 70,
  silver: 25,
  gold: 5,
});

const WATERED_QUALITY_WEIGHTS: Readonly<Record<QualityTier, number>> = Object.freeze({
  normal: 40,
  silver: 40,
  gold: 20,
});

/**
 * Deterministically rolls one quality tier from the crop's allowed tiers.
 * Watering shifts weight from normal toward silver/gold, never beyond the
 * crop's `qualityTiers` (so `normal` is impossible for `rose_sakura`).
 */
export function rollQuality(rng: Rng, cropSku: string, waterCount: number): QualityTier {
  const definition = getCropDefinition(cropSku);
  const tiers = definition?.qualityTiers ?? ALL_QUALITY_TIERS;
  const weights = waterCount > 0 ? WATERED_QUALITY_WEIGHTS : QUALITY_WEIGHTS;
  const options = tiers
    .map((quality) => ({ quality, weight: weights[quality] }))
    .filter((option) => option.weight > 0);
  const totalWeight = options.reduce((total, option) => total + option.weight, 0);
  const lastOption = options[options.length - 1];
  if (options.length === 0 || totalWeight <= 0 || !lastOption) {
    return tiers[0] ?? 'normal';
  }
  const roll = Math.min(Math.max(rng(), 0), 0.999999999) * totalWeight;
  let cursor = 0;
  for (const option of options) {
    cursor += option.weight;
    if (roll < cursor) {
      return option.quality;
    }
  }
  return lastOption.quality;
}

/**
 * Harvests a ready crop. Before readiness the action is rejected and `farm` is
 * left untouched. Regrowing crops (peach) restart a `regrowMs` cycle and lose
 * one `regrowRemaining` charge; when exhausted the plot becomes empty.
 */
export function harvest(farm: Farm, input: HarvestInput): HarvestResult {
  const { plotIndex, nowMs, rng } = input;
  if (!isValidPlotIndex(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  if (!Number.isFinite(nowMs)) {
    return farmingError('INVALID_TIME');
  }
  const current = farm.plots[plotIndex];
  if (!current) {
    return farmingError('INVALID_PLOT');
  }
  const crop = getPlantedCrop(current);
  if (!crop) {
    return farmingError('NO_CROP');
  }
  const definition = getCropDefinition(crop.cropSku);
  if (!definition) {
    return farmingError('UNKNOWN_CROP');
  }
  if (!isReady(crop, nowMs)) {
    return farmingError('NOT_READY');
  }

  const quality = rollQuality(rng, crop.cropSku, crop.waterCount);
  const items: HarvestedItem[] = [
    { sku: definition.cropSku, qty: definition.harvestQty, quality },
  ];

  let nextFarm: Farm;
  let regrew = false;
  const canRegrow =
    definition.regrowMs !== undefined &&
    definition.regrowMs > 0 &&
    crop.regrowRemaining > 0;

  if (canRegrow) {
    const nextCrop: PlantedCrop = {
      cropSku: crop.cropSku,
      plantedAtMs: nowMs,
      waterCount: 0,
      regrowRemaining: crop.regrowRemaining - 1,
      isRegrowCycle: true,
    };
    nextFarm = replacePlot(farm, plotIndex, { plotId: plotIndex, soil: 'planted', crop: nextCrop });
    regrew = true;
  } else {
    nextFarm = replacePlot(farm, plotIndex, { plotId: plotIndex, soil: 'empty' });
  }

  return {
    ok: true,
    farm: nextFarm,
    harvested: { items, plotIndex, regrew },
  };
}
