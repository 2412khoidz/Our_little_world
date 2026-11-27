/**
 * Deep crop simulation engine for Our Little World (Checkpoint B).
 *
 * Transplants seasonal crop lifecycles, regrowth, multi-yield ranges,
 * fertilizers, sprinklers, skill XP quality boosts, and multi-stage pixel palettes
 * from:
 * - `fernforge-arcade/greens` @ 3f32fd8 (crops.js, farming.js, skills.js)
 * - `Shiz0id/webfarmville` @ c420bc2 (crops.ts, weather.ts)
 * - `KrasimirKralev/harvest-hollow` @ 9b23e1a (crops.js, tools.js)
 * - `robintrepte/hollowmere.tretu.de` @ a7a8e5a (crops.json)
 *
 * Zero offline punishment: no crop death, no withering. Out-of-season outdoor crops
 * grow at 50% speed; Greenhouse plots (`farm_annex` indices 120..143) grow 100%
 * year-round. Driven purely by server timestamps & lazy reconciliation.
 */
import type { CropDefinition, FarmingResult, Farm, PlantedCrop, PlotState, QualityTier } from './types.ts';
import { farmingError } from './types.ts';
import { GREENS_CROPS, type GreensCropDef } from '../donor/greens-3f32fd8/cropsData.ts';
import { levelForGreensSkillXp } from '../donor/greens-3f32fd8/skillsData.ts';
import { weatherForWorldDay, type WeatherDef } from '../donor/webfarmville-c420bc2/weatherRules.ts';
import {
  DEFAULT_CALENDAR_DAY_MS,
  resolveWorldCalendar,
  type CalendarSeason,
  type WorldCalendarState,
} from '../world/worldCalendar.ts';
import {
  farmPlotRegionAndLocal,
  getRegionGridNeighbors,
  isGreenhousePlot,
  isValidFarmPlotIndex,
  isFarmPlotIndexOnContractSoil,
} from './farmPlotIndex.ts';

export type FertilizerSku = 'fert_compost' | 'fert_speed' | 'fert_quality' | 'fert_deluxe';
export type SprinklerSku = 'sprinkler_basic' | 'sprinkler_quality' | 'sprinkler_iridium';

export interface FertilizerDef {
  readonly sku: FertilizerSku;
  readonly nameVi: string;
  /** Growth speed multiplier in bp (10_000 = 1.0x, 13_000 = +30% faster). */
  readonly speedBp: number;
  /** Flat bonus added to silver/gold quality weight roll (in bp of 10_000). */
  readonly qualityBoostBp: number;
  /** Retains moisture automatically through growth cycles without manual re-water. */
  readonly retainsMoisture: boolean;
}

export const FERTILIZER_DEFS: Readonly<Record<FertilizerSku, FertilizerDef>> = {
  fert_compost: {
    sku: 'fert_compost',
    nameVi: 'Phân hữu cơ',
    speedBp: 10_000,
    qualityBoostBp: 800,
    retainsMoisture: false,
  },
  fert_speed: {
    sku: 'fert_speed',
    nameVi: 'Phân kích thích lớn nhanh',
    speedBp: 13_000,
    qualityBoostBp: 0,
    retainsMoisture: false,
  },
  fert_quality: {
    sku: 'fert_quality',
    nameVi: 'Phân bón thượng hạng',
    speedBp: 10_000,
    qualityBoostBp: 1_800,
    retainsMoisture: false,
  },
  fert_deluxe: {
    sku: 'fert_deluxe',
    nameVi: 'Phân hỗn hợp toàn năng',
    speedBp: 12_500,
    qualityBoostBp: 2_000,
    retainsMoisture: true,
  },
};

export interface SprinklerDef {
  readonly sku: SprinklerSku;
  readonly nameVi: string;
  readonly coveragePattern: 'cross4' | 'box3x3' | 'box5x5';
}

export const SPRINKLER_DEFS: Readonly<Record<SprinklerSku, SprinklerDef>> = {
  sprinkler_basic: {
    sku: 'sprinkler_basic',
    nameVi: 'Vòi phun cơ bản',
    coveragePattern: 'cross4',
  },
  sprinkler_quality: {
    sku: 'sprinkler_quality',
    nameVi: 'Vòi phun 3×3',
    coveragePattern: 'box3x3',
  },
  sprinkler_iridium: {
    sku: 'sprinkler_iridium',
    nameVi: 'Vòi phun cao cấp 5×5',
    coveragePattern: 'box5x5',
  },
};

export interface CropVisualPalette {
  readonly kind: 'leafy' | 'head' | 'root' | 'vine' | 'stalk' | 'fruit' | 'flower';
  readonly stem: string;
  readonly leaf: string;
  readonly leaf2: string;
  readonly fruit?: string;
  readonly fruit2?: string;
  readonly heart?: boolean;
  readonly stages: number;
}

export interface DeepCropDefinition extends CropDefinition {
  readonly seasons: readonly CalendarSeason[];
  readonly yieldMin: number;
  readonly yieldMax: number;
  readonly xp: number;
  readonly palette: CropVisualPalette;
  readonly isFlower: boolean;
}

/** Out-of-season outdoor crops grow at 50% speed instead of withering/dying. */
export const OUT_OF_SEASON_SPEED_BP = 5_000;
export const IN_SEASON_SPEED_BP = 10_000;

const ALL_SEASONS: readonly CalendarSeason[] = ['spring', 'summer', 'fall', 'winter'];
const ALL_QUALITY_TIERS: readonly QualityTier[] = ['normal', 'silver', 'gold'];

const GREENS_BY_ID: ReadonlyMap<string, GreensCropDef> = new Map(
  GREENS_CROPS.map((c) => [c.id === 'peas' ? 'snap_pea' : c.id === 'bellpepper' ? 'bell_pepper' : c.id === 'bokchoy' ? 'bok_choy' : c.id === 'greenbean' ? 'green_bean' : c.id === 'ancientgreen' ? 'ancient_green' : c.id, c]),
);

function greensPalette(id: string, fallback: CropVisualPalette): CropVisualPalette {
  const g = GREENS_BY_ID.get(id);
  if (!g) return fallback;
  return {
    kind: g.kind,
    stem: g.stem,
    leaf: g.leaf,
    leaf2: g.leaf2 ?? g.leaf,
    ...(g.fruit ? { fruit: g.fruit } : {}),
    ...(g.fruit2 ? { fruit2: g.fruit2 } : {}),
    ...(g.heart ? { heart: true } : {}),
    stages: 4,
  };
}

function makeDeepCrop(opts: {
  sku: string;
  nameVi: string;
  seedSku: string | null;
  seasons: readonly CalendarSeason[];
  growSec: number;
  regrowSec?: number;
  regrowHarvests?: number;
  yieldMin?: number;
  yieldMax?: number;
  xp?: number;
  palette: CropVisualPalette;
  isFlower?: boolean;
  waterable?: boolean;
  qualityTiers?: readonly QualityTier[];
}): DeepCropDefinition {
  const growMs = opts.growSec * 1_000;
  return {
    cropSku: opts.sku,
    nameVi: opts.nameVi,
    seedSku: opts.seedSku,
    growMs,
    harvestQty: opts.yieldMin ?? 1,
    yieldMin: opts.yieldMin ?? 1,
    yieldMax: opts.yieldMax ?? opts.yieldMin ?? 1,
    regrowMs: opts.regrowSec ? opts.regrowSec * 1_000 : undefined,
    regrowHarvests: opts.regrowHarvests,
    qualityTiers: opts.qualityTiers ?? ALL_QUALITY_TIERS,
    waterBonusMs: Math.floor(growMs * 0.25),
    waterable: opts.waterable ?? true,
    seasons: opts.seasons,
    xp: opts.xp ?? 10,
    palette: greensPalette(opts.sku, opts.palette),
    isFlower: opts.isFlower ?? false,
  };
}

const DEEP_CROP_LIST: readonly DeepCropDefinition[] = [
  // 6 Legacy Field Crops (matching existing CROP_DEFINITIONS exact growMs/harvestQty + seasons)
  makeDeepCrop({ sku: 'wheat', nameVi: 'Lúa mì', seedSku: 'seed_wheat', seasons: ['summer', 'fall'], growSec: 300, yieldMin: 1, yieldMax: 2, xp: 6, palette: { kind: 'stalk', stem: '#caa032', leaf: '#e8c456', leaf2: '#f5dc82', fruit: '#e8c456', stages: 4 } }),
  makeDeepCrop({ sku: 'carrot', nameVi: 'Cà rốt', seedSku: 'seed_carrot', seasons: ['spring', 'fall'], growSec: 900, yieldMin: 1, yieldMax: 2, xp: 8, palette: { kind: 'root', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f08a2c', stages: 4 } }),
  makeDeepCrop({ sku: 'tomato', nameVi: 'Cà chua', seedSku: 'seed_tomato', seasons: ['summer'], growSec: 2700, regrowSec: 1200, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 14, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#7cc04f', fruit: '#e8463a', fruit2: '#ff8a7a', stages: 4 } }),
  makeDeepCrop({ sku: 'strawberry', nameVi: 'Dâu tây', seedSku: 'seed_strawberry', seasons: ['spring'], growSec: 5400, regrowSec: 2400, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 16, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#7cc04f', fruit: '#e23b4e', fruit2: '#ffe46b', stages: 4 } }),
  makeDeepCrop({ sku: 'sunflower', nameVi: 'Hướng dương', seedSku: 'seed_sunflower', seasons: ['summer', 'fall'], growSec: 3600, yieldMin: 1, yieldMax: 2, xp: 12, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#ffd21f', fruit2: '#7a4d22', stages: 4 } }),
  makeDeepCrop({ sku: 'cabbage', nameVi: 'Bắp cải', seedSku: 'seed_cabbage', seasons: ['spring', 'winter'], growSec: 7200, yieldMin: 1, yieldMax: 1, xp: 18, palette: { kind: 'head', stem: '#4f8c36', leaf: '#8fc85a', leaf2: '#a8de72', stages: 4 } }),

  // 34 Deep Field Crops across 4 seasons
  makeDeepCrop({ sku: 'lettuce', nameVi: 'Xà lách giòn', seedSku: 'seed_lettuce', seasons: ['spring'], growSec: 480, yieldMin: 1, yieldMax: 2, xp: 8, palette: { kind: 'leafy', stem: '#4f8c36', leaf: '#7cc04f', leaf2: '#9ad96a', heart: true, stages: 4 } }),
  makeDeepCrop({ sku: 'spinach', nameVi: 'Cải bó xôi', seedSku: 'seed_spinach', seasons: ['spring', 'fall'], growSec: 600, yieldMin: 2, yieldMax: 3, xp: 10, palette: { kind: 'leafy', stem: '#3c7a2e', leaf: '#3f8a36', leaf2: '#56a345', stages: 4 } }),
  makeDeepCrop({ sku: 'kale', nameVi: 'Cải xoăn', seedSku: 'seed_kale', seasons: ['spring', 'fall', 'winter'], growSec: 720, regrowSec: 420, regrowHarvests: 2, yieldMin: 1, yieldMax: 2, xp: 12, palette: { kind: 'leafy', stem: '#2c6024', leaf: '#2f7a3a', leaf2: '#45924f', stages: 4 } }),
  makeDeepCrop({ sku: 'parsnip', nameVi: 'Củ cải vàng', seedSku: 'seed_parsnip', seasons: ['spring'], growSec: 420, yieldMin: 1, yieldMax: 2, xp: 8, palette: { kind: 'root', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#e8d8a0', stages: 4 } }),
  makeDeepCrop({ sku: 'potato', nameVi: 'Khoai tây', seedSku: 'seed_potato', seasons: ['spring', 'fall'], growSec: 720, yieldMin: 2, yieldMax: 4, xp: 11, palette: { kind: 'root', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#7cc04f', fruit: '#c79a5e', stages: 4 } }),
  makeDeepCrop({ sku: 'cauliflower', nameVi: 'Súp lơ trắng', seedSku: 'seed_cauliflower', seasons: ['spring'], growSec: 1200, yieldMin: 1, yieldMax: 2, xp: 20, palette: { kind: 'head', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#f4f0e0', fruit: '#f4f0e0', stages: 4 } }),
  makeDeepCrop({ sku: 'snap_pea', nameVi: 'Đậu Hà Lan', seedSku: 'seed_snap_pea', seasons: ['spring'], growSec: 660, regrowSec: 360, regrowHarvests: 3, yieldMin: 2, yieldMax: 4, xp: 9, palette: { kind: 'vine', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#9ad96a', fruit: '#7cc04f', stages: 4 } }),
  makeDeepCrop({ sku: 'radish', nameVi: 'Củ cải đỏ', seedSku: 'seed_radish', seasons: ['spring', 'summer'], growSec: 420, yieldMin: 1, yieldMax: 2, xp: 7, palette: { kind: 'root', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#d23b4e', stages: 4 } }),
  makeDeepCrop({ sku: 'scallion', nameVi: 'Hành lá', seedSku: 'seed_scallion', seasons: ['spring', 'winter'], growSec: 360, regrowSec: 240, regrowHarvests: 3, yieldMin: 1, yieldMax: 3, xp: 6, palette: { kind: 'stalk', stem: '#dfe8c0', leaf: '#6cae44', leaf2: '#9ad96a', fruit: '#9ad96a', stages: 4 } }),
  makeDeepCrop({ sku: 'rhubarb', nameVi: 'Đại hoàng', seedSku: 'seed_rhubarb', seasons: ['spring'], growSec: 1440, yieldMin: 1, yieldMax: 2, xp: 22, palette: { kind: 'stalk', stem: '#c83a5a', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#c83a5a', stages: 4 } }),

  makeDeepCrop({ sku: 'corn', nameVi: 'Bắp ngô', seedSku: 'seed_corn', seasons: ['summer', 'fall'], growSec: 1080, regrowSec: 540, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 15, palette: { kind: 'stalk', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f2d04b', stages: 4 } }),
  makeDeepCrop({ sku: 'blueberry', nameVi: 'Việt quất', seedSku: 'seed_blueberry', seasons: ['summer'], growSec: 1080, regrowSec: 480, regrowHarvests: 4, yieldMin: 3, yieldMax: 5, xp: 16, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#4d8a3f', leaf2: '#6ab054', fruit: '#4d5bd6', fruit2: '#8290f5', stages: 4 } }),
  makeDeepCrop({ sku: 'melon', nameVi: 'Dưa lưới', seedSku: 'seed_melon', seasons: ['summer'], growSec: 1500, yieldMin: 1, yieldMax: 2, xp: 22, palette: { kind: 'vine', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#8fd466', fruit: '#e89a9a', stages: 4 } }),
  makeDeepCrop({ sku: 'hot_pepper', nameVi: 'Ớt đỏ cay', seedSku: 'seed_hot_pepper', seasons: ['summer'], growSec: 600, regrowSec: 360, regrowHarvests: 4, yieldMin: 2, yieldMax: 3, xp: 12, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#7cc04f', fruit: '#e8301a', fruit2: '#ff7b54', stages: 4 } }),
  makeDeepCrop({ sku: 'bell_pepper', nameVi: 'Ớt chuông ngọt', seedSku: 'seed_bell_pepper', seasons: ['summer'], growSec: 780, regrowSec: 420, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 13, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#7cc04f', fruit: '#3fae4f', fruit2: '#74d67c', stages: 4 } }),
  makeDeepCrop({ sku: 'cucumber', nameVi: 'Dưa leo', seedSku: 'seed_cucumber', seasons: ['summer'], growSec: 660, regrowSec: 360, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 11, palette: { kind: 'vine', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#8fc85a', fruit: '#4f8c36', stages: 4 } }),
  makeDeepCrop({ sku: 'zucchini', nameVi: 'Bí ngòi', seedSku: 'seed_zucchini', seasons: ['summer'], growSec: 780, regrowSec: 420, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 12, palette: { kind: 'vine', stem: '#3c7a2e', leaf: '#5fa83e', leaf2: '#7cc04f', fruit: '#3f7a2e', stages: 4 } }),
  makeDeepCrop({ sku: 'broccoli', nameVi: 'Bông cải xanh', seedSku: 'seed_broccoli', seasons: ['summer', 'fall'], growSec: 960, yieldMin: 1, yieldMax: 2, xp: 18, palette: { kind: 'head', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#56a345', fruit: '#3f7a2e', stages: 4 } }),
  makeDeepCrop({ sku: 'basil', nameVi: 'Húng quế', seedSku: 'seed_basil', seasons: ['summer'], growSec: 420, regrowSec: 240, regrowHarvests: 3, yieldMin: 1, yieldMax: 3, xp: 8, palette: { kind: 'leafy', stem: '#3c7a2e', leaf: '#559c3c', leaf2: '#7cc04f', stages: 4 } }),
  makeDeepCrop({ sku: 'starfruit', nameVi: 'Khế sao vàng', seedSku: 'seed_starfruit', seasons: ['summer'], growSec: 2700, yieldMin: 1, yieldMax: 2, xp: 32, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#6cae44', leaf2: '#8fd466', fruit: '#f8e858', fruit2: '#fff7a8', stages: 4 } }),

  makeDeepCrop({ sku: 'pumpkin', nameVi: 'Bí ngô', seedSku: 'seed_pumpkin', seasons: ['fall'], growSec: 1800, yieldMin: 1, yieldMax: 2, xp: 24, palette: { kind: 'fruit', stem: '#4f8c36', leaf: '#558b3a', leaf2: '#76b054', fruit: '#f2852a', fruit2: '#ffb469', stages: 4 } }),
  makeDeepCrop({ sku: 'cranberry', nameVi: 'Nam việt quất', seedSku: 'seed_cranberry', seasons: ['fall'], growSec: 960, regrowSec: 480, regrowHarvests: 4, yieldMin: 3, yieldMax: 4, xp: 16, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#528038', leaf2: '#70a052', fruit: '#c8203a', fruit2: '#f05068', stages: 4 } }),
  makeDeepCrop({ sku: 'eggplant', nameVi: 'Cà tím', seedSku: 'seed_eggplant', seasons: ['fall'], growSec: 600, regrowSec: 360, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 12, palette: { kind: 'fruit', stem: '#3c7a2e', leaf: '#4d8f3c', leaf2: '#6eb85a', fruit: '#6a3a8a', fruit2: '#9c64c4', stages: 4 } }),
  makeDeepCrop({ sku: 'yam', nameVi: 'Khoai mỡ', seedSku: 'seed_yam', seasons: ['fall'], growSec: 1200, yieldMin: 1, yieldMax: 2, xp: 18, palette: { kind: 'root', stem: '#55803a', leaf: '#7a5a3a', leaf2: '#9a7a5a', fruit: '#c86a4a', stages: 4 } }),
  makeDeepCrop({ sku: 'grape', nameVi: 'Nho tím', seedSku: 'seed_grape', seasons: ['fall'], growSec: 1080, regrowSec: 540, regrowHarvests: 3, yieldMin: 2, yieldMax: 4, xp: 17, palette: { kind: 'vine', stem: '#4f8c36', leaf: '#569844', leaf2: '#7cc064', fruit: '#8a4ab0', stages: 4 } }),
  makeDeepCrop({ sku: 'bok_choy', nameVi: 'Cải thìa', seedSku: 'seed_bok_choy', seasons: ['spring', 'fall'], growSec: 540, yieldMin: 1, yieldMax: 2, xp: 11, palette: { kind: 'leafy', stem: '#dfe8c0', leaf: '#5fa83e', leaf2: '#7ac85a', stages: 4 } }),
  makeDeepCrop({ sku: 'beet', nameVi: 'Củ dền đường', seedSku: 'seed_beet', seasons: ['fall'], growSec: 720, yieldMin: 1, yieldMax: 2, xp: 13, palette: { kind: 'root', stem: '#8a3248', leaf: '#5fa845', leaf2: '#82cf64', fruit: '#a02a4a', stages: 4 } }),
  makeDeepCrop({ sku: 'artichoke', nameVi: 'Atiso xanh', seedSku: 'seed_artichoke', seasons: ['fall'], growSec: 960, yieldMin: 1, yieldMax: 2, xp: 17, palette: { kind: 'head', stem: '#4f8c36', leaf: '#6a9a5a', leaf2: '#9ad96a', fruit: '#6a9a5a', stages: 4 } }),
  makeDeepCrop({ sku: 'oats', nameVi: 'Yến mạch', seedSku: 'seed_oats', seasons: ['fall'], growSec: 600, yieldMin: 2, yieldMax: 3, xp: 11, palette: { kind: 'stalk', stem: '#a8904a', leaf: '#d8c27a', leaf2: '#f0df9c', fruit: '#d8c27a', stages: 4 } }),

  makeDeepCrop({ sku: 'snowpea', nameVi: 'Đậu tuyết', seedSku: 'seed_snowpea', seasons: ['winter', 'spring'], growSec: 660, regrowSec: 360, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 14, palette: { kind: 'vine', stem: '#5b8f68', leaf: '#a0e0a0', leaf2: '#ccf2cc', fruit: '#a0e0a0', stages: 4 } }),
  makeDeepCrop({ sku: 'winter_squash', nameVi: 'Bí mùa Đông', seedSku: 'seed_winter_squash', seasons: ['winter'], growSec: 1500, yieldMin: 1, yieldMax: 2, xp: 22, palette: { kind: 'fruit', stem: '#4c7344', leaf: '#6a8f5a', leaf2: '#8db87b', fruit: '#d8a050', fruit2: '#f2c884', stages: 4 } }),
  makeDeepCrop({ sku: 'frostberry', nameVi: 'Dâu sương giá', seedSku: 'seed_frostberry', seasons: ['winter'], growSec: 1080, regrowSec: 540, regrowHarvests: 3, yieldMin: 2, yieldMax: 3, xp: 19, palette: { kind: 'fruit', stem: '#4d7898', leaf: '#74a8c8', leaf2: '#b0ddf7', fruit: '#9ad8f0', fruit2: '#ffffff', stages: 4 } }),
  makeDeepCrop({ sku: 'green_bean', nameVi: 'Đậu que xanh', seedSku: 'seed_green_bean', seasons: ['spring', 'summer'], growSec: 720, regrowSec: 360, regrowHarvests: 3, yieldMin: 2, yieldMax: 4, xp: 11, palette: { kind: 'vine', stem: '#3c7a2e', leaf: '#58b048', leaf2: '#7fd66e', fruit: '#58b048', stages: 4 } }),
  makeDeepCrop({ sku: 'ancient_green', nameVi: 'Mầm cổ đại', seedSku: 'seed_ancient_green', seasons: ['spring', 'summer', 'fall', 'winter'], growSec: 3600, regrowSec: 1800, regrowHarvests: 4, yieldMin: 2, yieldMax: 2, xp: 40, palette: { kind: 'leafy', stem: '#2c8c6c', leaf: '#42d49a', leaf2: '#d8ffea', fruit: '#42d49a', stages: 4 } }),

  // Perennial orchard crop entry (matches legacy CROP_DEFINITIONS.peach)
  makeDeepCrop({ sku: 'peach', nameVi: 'Đào', seedSku: 'sapling_peach', seasons: ['summer'], growSec: 10800, regrowSec: 7200, regrowHarvests: 5, yieldMin: 3, yieldMax: 3, xp: 20, palette: { kind: 'fruit', stem: '#7a5230', leaf: '#5fa845', leaf2: '#84cc66', fruit: '#f89c78', fruit2: '#ffd0b6', stages: 4 } }),

  // 10 Base Planted Flowers + 10 Hybrid Flowers
  makeDeepCrop({ sku: 'rose_pink', nameVi: 'Hồng phấn', seedSku: 'seed_rose_pink', seasons: ['spring', 'summer'], growSec: 5400, yieldMin: 1, yieldMax: 2, xp: 14, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#f48fb1', fruit2: '#ffe4ef', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_red', nameVi: 'Tulip đỏ', seedSku: 'seed_tulip_red', seasons: ['spring'], growSec: 600, yieldMin: 1, yieldMax: 2, xp: 10, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#e03c4a', fruit2: '#fff0a6', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_yellow', nameVi: 'Tulip vàng', seedSku: 'seed_tulip_yellow', seasons: ['spring'], growSec: 600, yieldMin: 1, yieldMax: 2, xp: 10, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f5cb36', fruit2: '#ffffff', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_pink', nameVi: 'Tulip hồng', seedSku: 'seed_tulip_pink', seasons: ['spring'], growSec: 600, yieldMin: 1, yieldMax: 2, xp: 11, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f489ab', fruit2: '#ffe4ef', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_purple', nameVi: 'Tulip tím', seedSku: 'seed_tulip_purple', seasons: ['spring', 'fall'], growSec: 600, yieldMin: 1, yieldMax: 2, xp: 12, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#9b59d0', fruit2: '#f5d0ff', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_red', nameVi: 'Hồng đỏ', seedSku: 'seed_rose_red', seasons: ['summer', 'fall'], growSec: 720, yieldMin: 1, yieldMax: 2, xp: 13, isFlower: true, palette: { kind: 'flower', stem: '#3c7a2e', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#d92638', fruit2: '#ffd4da', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_white', nameVi: 'Hồng trắng', seedSku: 'seed_rose_white', seasons: ['spring', 'winter'], growSec: 720, yieldMin: 1, yieldMax: 2, xp: 13, isFlower: true, palette: { kind: 'flower', stem: '#3c7a2e', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#fff9f5', fruit2: '#f5e1a4', stages: 4 } }),
  makeDeepCrop({ sku: 'lavender', nameVi: 'Oải hương', seedSku: 'seed_lavender', seasons: ['summer', 'fall'], growSec: 660, yieldMin: 1, yieldMax: 2, xp: 12, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#9c7ae0', fruit2: '#e2d6ff', stages: 4 } }),
  makeDeepCrop({ sku: 'blue_jazz', nameVi: 'Cúc thanh lam', seedSku: 'seed_blue_jazz', seasons: ['spring'], growSec: 660, yieldMin: 1, yieldMax: 2, xp: 12, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#4a7ae8', fruit2: '#ffe46b', stages: 4 } }),
  makeDeepCrop({ sku: 'fairy_rose', nameVi: 'Hồng tiên', seedSku: 'seed_fairy_rose', seasons: ['fall'], growSec: 900, yieldMin: 1, yieldMax: 2, xp: 16, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f0a0d8', fruit2: '#ffe6fa', stages: 4 } }),

  // 10 Rare Bred Hybrid Flowers (`seedSku: null`)
  makeDeepCrop({ sku: 'rose_sakura', nameVi: 'Anh đào', seedSku: null, seasons: ['spring'], growSec: 5400, yieldMin: 1, yieldMax: 1, xp: 24, isFlower: true, waterable: false, qualityTiers: ['silver', 'gold'], palette: { kind: 'flower', stem: '#4f8c36', leaf: '#5ca348', leaf2: '#9ad96a', fruit: '#ffc1d6', fruit2: '#fff2f7', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_orange', nameVi: 'Tulip cam', seedSku: null, seasons: ['spring', 'summer'], growSec: 900, yieldMin: 1, yieldMax: 1, xp: 18, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f5842a', fruit2: '#ffd068', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_white', nameVi: 'Tulip trắng tuyết', seedSku: null, seasons: ['spring', 'winter'], growSec: 900, yieldMin: 1, yieldMax: 1, xp: 18, isFlower: true, palette: { kind: 'flower', stem: '#4f8c36', leaf: '#6cae44', leaf2: '#89cc5e', fruit: '#f8fafc', fruit2: '#d5e4ee', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_black', nameVi: 'Tulip huyền đêm', seedSku: null, seasons: ['fall', 'winter'], growSec: 1200, yieldMin: 1, yieldMax: 1, xp: 26, isFlower: true, qualityTiers: ['silver', 'gold'], palette: { kind: 'flower', stem: '#382a45', leaf: '#4d6b52', leaf2: '#759c7b', fruit: '#382a45', fruit2: '#b388ff', stages: 4 } }),
  makeDeepCrop({ sku: 'tulip_rainbow', nameVi: 'Tulip cầu vồng', seedSku: null, seasons: ALL_SEASONS, growSec: 1500, yieldMin: 1, yieldMax: 1, xp: 35, isFlower: true, qualityTiers: ['silver', 'gold'], palette: { kind: 'flower', stem: '#4f8c36', leaf: '#7cc04f', leaf2: '#b6e886', fruit: '#ff6ca8', fruit2: '#68d5ff', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_yellow', nameVi: 'Hồng vàng nắng', seedSku: null, seasons: ['spring', 'summer'], growSec: 900, yieldMin: 1, yieldMax: 1, xp: 20, isFlower: true, palette: { kind: 'flower', stem: '#3c7a2e', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#ffe052', fruit2: '#f2aa24', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_orange', nameVi: 'Hồng cam hoàng hôn', seedSku: null, seasons: ['summer', 'fall'], growSec: 1080, yieldMin: 1, yieldMax: 1, xp: 22, isFlower: true, palette: { kind: 'flower', stem: '#3c7a2e', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#f5762e', fruit2: '#ffc252', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_lavender', nameVi: 'Hồng oải hương', seedSku: null, seasons: ['spring', 'fall'], growSec: 1080, yieldMin: 1, yieldMax: 1, xp: 24, isFlower: true, palette: { kind: 'flower', stem: '#3c7a2e', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#b58de8', fruit2: '#edd9ff', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_blue', nameVi: 'Hồng xanh lam', seedSku: null, seasons: ['winter', 'spring'], growSec: 1500, yieldMin: 1, yieldMax: 1, xp: 32, isFlower: true, qualityTiers: ['silver', 'gold'], palette: { kind: 'flower', stem: '#3c7a2e', leaf: '#5ca348', leaf2: '#7fd164', fruit: '#4682f0', fruit2: '#b8dcff', stages: 4 } }),
  makeDeepCrop({ sku: 'rose_gold', nameVi: 'Hồng vàng kim', seedSku: null, seasons: ALL_SEASONS, growSec: 1800, yieldMin: 1, yieldMax: 1, xp: 45, isFlower: true, qualityTiers: ['silver', 'gold'], palette: { kind: 'flower', stem: '#5a7a32', leaf: '#7aa644', leaf2: '#b4e070', fruit: '#ffd43b', fruit2: '#fffae0', stages: 4 } }),
];

export const DEEP_CROP_REGISTRY: Readonly<Record<string, DeepCropDefinition>> = Object.fromEntries(
  DEEP_CROP_LIST.map((c) => [c.cropSku, c]),
);

export const DEEP_FIELD_CROP_SKUS: readonly string[] = DEEP_CROP_LIST.filter((c) => !c.isFlower && c.cropSku !== 'peach').map(
  (c) => c.cropSku,
);

export const DEEP_FLOWER_SKUS: readonly string[] = DEEP_CROP_LIST.filter((c) => c.isFlower).map(
  (c) => c.cropSku,
);

export function getDeepCropDefinition(sku: string): DeepCropDefinition | undefined {
  return DEEP_CROP_REGISTRY[sku];
}

export interface CropEnvironmentContext {
  readonly worldId?: string;
  readonly worldEpochMs?: number;
  readonly calendarDayMs?: number;
  readonly timeScale?: number;
}

export interface ReconciledPlotEnvironment {
  readonly calendar: WorldCalendarState;
  readonly weather: WeatherDef;
  readonly greenhouse: boolean;
  readonly seasonMatch: boolean;
  readonly sprinklerCovered: boolean;
  readonly rainWatered: boolean;
  readonly moistureActive: boolean;
  readonly combinedSpeedBp: number;
  readonly effectiveCycleMs: number;
}

export function isPlotCoveredBySprinkler(farm: Farm, plotIndex: number): boolean {
  const slot = farmPlotRegionAndLocal(plotIndex);
  if (!slot) return false;
  for (const candidate of farm.plots) {
    if (!candidate.sprinkler) continue;
    const def = SPRINKLER_DEFS[candidate.sprinkler];
    if (!def) continue;
    const covered = getRegionGridNeighbors(candidate.plotId, def.coveragePattern);
    if (covered.includes(plotIndex)) {
      return true;
    }
  }
  return false;
}

export function computeEffectiveCropCycle(
  farm: Farm,
  plotIndex: number,
  crop: PlantedCrop,
  nowMs: number,
  env?: CropEnvironmentContext,
): ReconciledPlotEnvironment {
  const worldId = env?.worldId ?? 'olw-world';
  const epochMs = env?.worldEpochMs ?? farm.weatherEpochMs ?? 0;
  const dayMs = env?.calendarDayMs ?? DEFAULT_CALENDAR_DAY_MS;
  const calendar = resolveWorldCalendar(nowMs, epochMs, dayMs);
  const weather = weatherForWorldDay(worldId, calendar.totalDay, calendar.season);
  const greenhouse = isGreenhousePlot(plotIndex);
  const deepDef = getDeepCropDefinition(crop.cropSku);
  const seasonMatch = greenhouse || !deepDef || deepDef.seasons.includes(calendar.season);
  const sprinklerCovered = isPlotCoveredBySprinkler(farm, plotIndex);
  const rainWatered = !greenhouse && weather.wet;
  const plotState = farm.plots[plotIndex];
  const fertSku = crop.fertilizer ?? plotState?.fertilizer ?? null;
  const fertDef = fertSku ? FERTILIZER_DEFS[fertSku] : undefined;
  const moistureActive =
    crop.waterCount > 0 || sprinklerCovered || rainWatered || Boolean(fertDef?.retainsMoisture);

  const baseMs = deepDef
    ? crop.isRegrowCycle && deepDef.regrowMs
      ? deepDef.regrowMs
      : deepDef.growMs
    : 300_000;
  const waterReduction = moistureActive ? Math.floor(baseMs * 0.25) : 0;
  const afterWaterMs = Math.max(1, baseMs - waterReduction);

  // Speed multipliers: season (1.0 vs 0.5 out-of-season outdoor) * weather (outdoor) * fertilizer * timeScale
  const seasonBp = seasonMatch ? IN_SEASON_SPEED_BP : OUT_OF_SEASON_SPEED_BP;
  const weatherBp = greenhouse ? 10_000 : weather.cropSpeedBp;
  const fertBp = fertDef?.speedBp ?? 10_000;
  const scale = env?.timeScale && env.timeScale > 1 ? env.timeScale : 1;

  // Combined speed factor in bp: multiply successively rounded safely
  const rawCombinedBp = Math.max(
    2_500,
    Math.floor((((seasonBp * weatherBp) / 10_000) * fertBp) / 10_000),
  );
  const effectiveCycleMs = Math.max(
    1,
    Math.round((afterWaterMs * 10_000) / (rawCombinedBp * scale)),
  );

  return {
    calendar,
    weather,
    greenhouse,
    seasonMatch,
    sprinklerCovered,
    rainWatered,
    moistureActive,
    combinedSpeedBp: rawCombinedBp,
    effectiveCycleMs,
  };
}

/** Deterministic Greens-derived quality roll combining farming skill + fertilizer + weather + water. */
export function rollDeepCropQuality(opts: {
  rng: () => number;
  cropSku: string;
  farmingXp: number;
  watered: boolean;
  fertilizer?: FertilizerSku | null;
  weather?: WeatherDef;
}): QualityTier {
  const def = getDeepCropDefinition(opts.cropSku);
  const tiers = def?.qualityTiers ?? ALL_QUALITY_TIERS;
  if (tiers.length <= 1) return tiers[0] ?? 'normal';

  const level = levelForGreensSkillXp(Math.max(0, opts.farmingXp));
  const fertBoost = opts.fertilizer ? FERTILIZER_DEFS[opts.fertilizer]?.qualityBoostBp ?? 0 : 0;
  const weatherBoost = opts.weather?.qualityBoostBp ?? 0;
  const waterBoost = opts.watered ? 600 : 0;

  const goldChance = Math.min(0.45, 0.04 + level * 0.015 + (fertBoost + weatherBoost + waterBoost) / 20_000);
  const silverChance = Math.min(0.50, 0.16 + level * 0.02 + (fertBoost + weatherBoost + waterBoost) / 12_500);

  const roll = Math.min(0.999999, Math.max(0, opts.rng()));
  let chosen: QualityTier = 'normal';
  if (roll >= 1 - goldChance && tiers.includes('gold')) {
    chosen = 'gold';
  } else if (roll >= 1 - goldChance - silverChance && tiers.includes('silver')) {
    chosen = 'silver';
  } else if (!tiers.includes('normal')) {
    chosen = tiers.includes('silver') ? 'silver' : tiers[0]!;
  }
  return chosen;
}

export function rollDeepHarvestQty(opts: {
  rng: () => number;
  cropSku: string;
  greenhouse: boolean;
  weather?: WeatherDef;
}): number {
  const def = getDeepCropDefinition(opts.cropSku);
  if (!def) return 1;
  const min = Math.max(1, def.yieldMin);
  const max = Math.max(min, def.yieldMax);
  const span = max - min + 1;
  const baseQty = min + Math.floor(Math.min(0.999999, Math.max(0, opts.rng())) * span);
  const weatherExtra = !opts.greenhouse && opts.weather ? opts.weather.harvestBonusYield : 0;
  return baseQty + weatherExtra;
}

export function applyFertilizerToPlot(
  farm: Farm,
  plotIndex: number,
  fertilizerSku: FertilizerSku,
): FarmingResult<{ farm: Farm }> {
  if (!isValidFarmPlotIndex(plotIndex) || !isFarmPlotIndexOnContractSoil(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  if (!FERTILIZER_DEFS[fertilizerSku]) {
    return { ok: false, code: 'UNKNOWN_FERTILIZER', messageVi: 'Loại phân bón không hợp lệ.' };
  }
  const current = farm.plots[plotIndex]!;
  if (current.soil === 'empty') {
    return farmingError('SOIL_NOT_TILLED');
  }
  if (current.sprinkler) {
    return { ok: false, code: 'ALREADY_HAS_SPRINKLER', messageVi: 'Ô đất này đã đặt vòi phun.' };
  }
  if (current.fertilizer || current.crop?.fertilizer) {
    return { ok: false, code: 'ALREADY_FERTILIZED', messageVi: 'Ô đất này đã được bón phân rồi.' };
  }

  const nextPlots: PlotState[] = farm.plots.map((p, idx) => {
    if (idx !== plotIndex) return p;
    if (p.soil === 'planted' && p.crop) {
      return {
        ...p,
        fertilizer: fertilizerSku,
        crop: { ...p.crop, fertilizer: fertilizerSku },
      };
    }
    return { ...p, fertilizer: fertilizerSku };
  });

  return { ok: true, farm: { ...farm, plots: nextPlots } };
}

export function placeSprinklerOnPlot(
  farm: Farm,
  plotIndex: number,
  sprinklerSku: SprinklerSku,
): FarmingResult<{ farm: Farm }> {
  if (!isValidFarmPlotIndex(plotIndex) || !isFarmPlotIndexOnContractSoil(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  if (!SPRINKLER_DEFS[sprinklerSku]) {
    return { ok: false, code: 'UNKNOWN_SPRINKLER', messageVi: 'Loại vòi phun không hợp lệ.' };
  }
  const current = farm.plots[plotIndex]!;
  if (current.soil === 'planted') {
    return farmingError('PLOT_OCCUPIED');
  }
  if (current.sprinkler) {
    return { ok: false, code: 'ALREADY_HAS_SPRINKLER', messageVi: 'Ô đất đã có vòi phun nước.' };
  }
  const nextPlots: PlotState[] = farm.plots.map((p, idx) =>
    idx === plotIndex ? { ...p, sprinkler: sprinklerSku, soil: p.soil === 'empty' ? 'tilled' : p.soil } : p,
  );
  return { ok: true, farm: { ...farm, plots: nextPlots } };
}

export function removeSprinklerFromPlot(
  farm: Farm,
  plotIndex: number,
): FarmingResult<{ farm: Farm; removedSku: SprinklerSku }> {
  if (!isValidFarmPlotIndex(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  const current = farm.plots[plotIndex]!;
  if (!current.sprinkler) {
    return { ok: false, code: 'NO_SPRINKLER', messageVi: 'Ô này không có vòi phun để thu hồi.' };
  }
  const removedSku = current.sprinkler;
  const nextPlots: PlotState[] = farm.plots.map((p, idx) =>
    idx === plotIndex ? { ...p, sprinkler: null } : p,
  );
  return { ok: true, farm: { ...farm, plots: nextPlots }, removedSku };
}

export function expandToolPlotFootprint(
  centerPlotIndex: number,
  toolSku?: string | null,
): number[] {
  if (!toolSku) return [centerPlotIndex];
  if (toolSku === 'tool_can_copper' || toolSku === 'tool_hoe_copper') {
    return getRegionGridNeighbors(centerPlotIndex, 'line2');
  }
  if (
    toolSku === 'tool_can_iron' ||
    toolSku === 'tool_hoe_iron' ||
    toolSku === 'tool_sickle_wide' ||
    toolSku === 'tool_seed_spreader'
  ) {
    return getRegionGridNeighbors(centerPlotIndex, 'box2x2');
  }
  if (
    toolSku === 'tool_can_gold' ||
    toolSku === 'tool_hoe_gold' ||
    toolSku === 'tool_sickle_grand'
  ) {
    return getRegionGridNeighbors(centerPlotIndex, 'box3x3');
  }
  return [centerPlotIndex];
}
