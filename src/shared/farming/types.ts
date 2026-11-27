/**
 * Shared types for the Farming domain (milestone V0.2.1).
 *
 * Pure TypeScript only: no React, Phaser, DOM, network or Supabase imports.
 * The domain never reads the clock or randomness itself; callers pass `nowMs`
 * and an explicit `Rng` (see `src/shared/rng.ts`).
 */

/** Quality tiers supported by harvesting and flower breeding. */
export type QualityTier = 'normal' | 'silver' | 'gold';

/** Stable output SKUs for field crops, flowers, and fruit trees. */
export type LegacyCropSku =
  | 'wheat'
  | 'carrot'
  | 'tomato'
  | 'strawberry'
  | 'sunflower'
  | 'rose_pink'
  | 'rose_sakura'
  | 'cabbage'
  | 'peach';

export type CropSku = string;

/** Legacy flower union preserved for existing breeding tests; deep flower registry accepts any DeepFlowerSku. */
export type FlowerSku = 'rose_pink' | 'sunflower' | 'rose_sakura';
export type DeepFlowerSku = string;

/** `empty` = untilled fallow; `tilled` = hoed; `planted` = crop growing. */
export type SoilState = 'empty' | 'tilled' | 'planted';

/**
 * Living state of a crop inside one garden plot.
 *
 * Growth is always derived from `plantedAtMs` + the crop definition, so a crop
 * can never die, wilt or be penalised for offline time.
 */
export interface PlantedCrop {
  readonly cropSku: CropSku;
  /** Timestamp at which the current growth cycle started. */
  readonly plantedAtMs: number;
  /** Number of waterings applied during the current growth cycle. */
  readonly waterCount: number;
  /** Additional harvests still available after the current cycle (regrow crops). */
  readonly regrowRemaining: number;
  /** True when the current cycle is a `regrowMs` cycle rather than the first growth. */
  readonly isRegrowCycle: boolean;
  /** Applied fertilizer SKU (persists through this crop's regrows). */
  readonly fertilizer?: 'fert_compost' | 'fert_speed' | 'fert_quality' | 'fert_deluxe' | null;
  /** Last timestamp soil was watered manually or via sprinkler/rain. */
  readonly lastWateredAtMs?: number | null;
}

/**
 * One plot of the farm grid. Plots are addressed by integer index (`0..183`).
 */
export interface PlotState {
  readonly plotId: number;
  readonly soil: SoilState;
  /** Present only when `soil === 'planted'`. */
  readonly crop?: PlantedCrop;
  /** Applied fertilizer waiting on tilled soil or active on planted soil. */
  readonly fertilizer?: 'fert_compost' | 'fert_speed' | 'fert_quality' | 'fert_deluxe' | null;
  /** Placed automatic sprinkler covering nearby tiles. */
  readonly sprinkler?: 'sprinkler_basic' | 'sprinkler_quality' | 'sprinkler_iridium' | null;
  /** Last manual/auto watering timestamp on this tile. */
  readonly lastWateredAtMs?: number | null;
}

export interface Farm {
  /** Persisted world seed, used by callers to derive deterministic rolls. */
  readonly seed: number;
  readonly plots: readonly PlotState[];
  /** Accumulated shared farm XP (Greens skill curve). */
  readonly farmingXp?: number;
  /** Optional anchor epoch ms for shared calendar/weather progression. */
  readonly weatherEpochMs?: number;
}

/**
 * Static definition of one plantable crop. `cropSku` is the harvest OUTPUT
 * (e.g. `wheat`), while `seedSku` is the planted input (e.g. `seed_wheat`).
 * A `null` seedSku marks a hybrid that cannot be planted from a seed.
 */
export interface CropDefinition {
  readonly cropSku: CropSku;
  readonly nameVi: string;
  /** Input seed SKU, or `null` for hybrid-only crops (e.g. `rose_sakura`). */
  readonly seedSku: string | null;
  readonly growMs: number;
  readonly harvestQty: number;
  readonly qualityTiers: readonly QualityTier[];
  /** Duration of each regrowth cycle, when the crop regrows. */
  readonly regrowMs?: number;
  /** Number of ADDITIONAL harvests after the first one. */
  readonly regrowHarvests?: number;
  /** Growth-time reduction granted by one watering, capped by the domain. */
  readonly waterBonusMs?: number;
  readonly waterable: boolean;
}

export interface HarvestedItem {
  readonly sku: CropSku;
  readonly qty: number;
  readonly quality: QualityTier;
}

export interface HarvestedBundle {
  readonly items: readonly HarvestedItem[];
  readonly plotIndex: number;
  /** True when the plot immediately started a new growth cycle. */
  readonly regrew: boolean;
}

export interface BredFlower {
  readonly sku: FlowerSku;
  readonly quality: QualityTier;
  /** Short Vietnamese note describing the cross-breeding result. */
  readonly noteVi?: string;
}

/**
 * Structured rejection codes. Every gameplay action returns either
 * `{ ok: true, ... }` or one of these codes with a short Vietnamese message.
 */
export type FarmingErrorCode =
  | 'INVALID_PLOT'
  | 'INVALID_TIME'
  | 'UNKNOWN_CROP'
  | 'PLOT_OCCUPIED'
  | 'SOIL_NOT_TILLED'
  | 'ALREADY_TILLED'
  | 'NO_CROP'
  | 'NOT_PLANTABLE'
  | 'NOT_WATERABLE'
  | 'ALREADY_WATERED'
  | 'ALREADY_READY'
  | 'NOT_READY'
  | 'UNKNOWN_FERTILIZER'
  | 'ALREADY_FERTILIZED'
  | 'UNKNOWN_SPRINKLER'
  | 'ALREADY_HAS_SPRINKLER'
  | 'NO_SPRINKLER';

export interface FarmingError {
  readonly ok: false;
  readonly code: FarmingErrorCode;
  readonly messageVi: string;
}

export type FarmingResult<T extends object> = ({ readonly ok: true } & T) | FarmingError;

/** Short Vietnamese messages, safe to show directly in the cozy UI. */
export const FARMING_ERROR_MESSAGES: Readonly<Record<FarmingErrorCode, string>> = Object.freeze({
  INVALID_PLOT: 'Ô đất không hợp lệ — chỉ ruộng 0–183 (ruộng chính + phụ).',
  INVALID_TIME: 'Thời gian không hợp lệ.',
  UNKNOWN_CROP: 'Cây trồng không hợp lệ.',
  PLOT_OCCUPIED: 'Ô đất đã có cây.',
  SOIL_NOT_TILLED: 'Hãy cuốc đất trước khi gieo hạt.',
  ALREADY_TILLED: 'Ô đất đã được cuốc rồi.',
  NO_CROP: 'Ô đất đang trống.',
  NOT_PLANTABLE: 'Hạt giống này không thể trồng.',
  NOT_WATERABLE: 'Cây này không cần tưới.',
  ALREADY_WATERED: 'Vụ này đã được tưới rồi.',
  ALREADY_READY: 'Cây đã chín, hãy thu hoạch.',
  NOT_READY: 'Cây chưa chín.',
  UNKNOWN_FERTILIZER: 'Loại phân bón không hợp lệ.',
  ALREADY_FERTILIZED: 'Ô đất này đã được bón phân rồi.',
  UNKNOWN_SPRINKLER: 'Loại vòi phun không hợp lệ.',
  ALREADY_HAS_SPRINKLER: 'Ô đất đã có vòi phun nước.',
  NO_SPRINKLER: 'Ô đất này chưa đặt vòi phun.',
});

export function farmingError(code: FarmingErrorCode): FarmingError {
  return { ok: false, code, messageVi: FARMING_ERROR_MESSAGES[code] };
}
