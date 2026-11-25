/**
 * Public API for the Farming domain (V0.2.1).
 *
 * Pure TypeScript. Gameplay actions take `nowMs` explicitly and return a
 * discriminated `{ ok: true, ... } | { ok: false, code, messageVi }` result.
 */

export type {
  BredFlower,
  CropDefinition,
  CropSku,
  Farm,
  FarmingError,
  FarmingErrorCode,
  FarmingResult,
  FlowerSku,
  HarvestedBundle,
  HarvestedItem,
  PlantedCrop,
  PlotState,
  QualityTier,
  SoilState,
} from './types';
export { FARMING_ERROR_MESSAGES, farmingError } from './types';

export {
  CROP_DEFINITIONS,
  FLOWER_CROP_SKUS,
  GARDEN_COLUMNS,
  GARDEN_PLOT_COUNT,
  GARDEN_ROWS,
  MAX_WATER_REDUCTION_RATIO,
  MAX_WATERINGS_PER_CYCLE,
  MINUTE_MS,
  createFarm,
  getCropDefinition,
  growthProgress03,
  harvest,
  isFlowerCrop,
  isReady,
  minutesToMs,
  plant,
  till,
  water,
} from './crops';
export type {
  HarvestInput,
  HarvestResult,
  PlantInput,
  PlantResult,
  TillInput,
  TillResult,
  WaterInput,
  WaterResult,
} from './crops';

export { FLOWER_BREEDING_RULES, breedFlowers, getNeighbourPlotIndices } from './blooms';
export type { BreedInput, BreedResult, BreedingRule } from './blooms';
