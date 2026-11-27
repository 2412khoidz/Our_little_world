/**
 * Flower cross-breeding (V0.2.1 "blooms").
 *
 * A breeding attempt looks ONLY at the 8 neighbouring plots (row-major grid
 * adjacency, no wrapping). At the garden edge, out-of-range coordinates are
 * clamped and duplicates are removed, so the call is safe and never leaves the
 * 0..23 plot range.
 *
 * Only READY flowering crops participate. The garden plot passed as
 * `plotIndex` is the breeding spot; it is not itself inspected as a parent, so
 * an empty centre plot can still produce a bred flower item.
 */

import type { Rng } from '../rng';
import {
  GARDEN_COLUMNS,
  GARDEN_ROWS,
  getCropDefinition,
  isFlowerCrop,
  isReady,
  isValidPlotIndex,
  rollQuality,
} from './crops';
import type { BredFlower, DeepFlowerSku, Farm, FarmingResult, FlowerSku } from './types';
import { farmingError } from './types';
import { FLOWER_GENETICS_RECIPES } from './flowerGenetics';

const NEIGHBOUR_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Unique in-range indices of the 8-neighbourhood of `plotIndex`.
 * The centre is never returned; clamped duplicates are removed.
 */
export function getNeighbourPlotIndices(plotIndex: number): number[] {
  if (!isValidPlotIndex(plotIndex)) {
    return [];
  }
  const row = Math.floor(plotIndex / GARDEN_COLUMNS);
  const column = plotIndex % GARDEN_COLUMNS;
  const seen = new Set<number>([plotIndex]);
  const neighbours: number[] = [];
  for (const [rowOffset, columnOffset] of NEIGHBOUR_OFFSETS) {
    const neighbourRow = clamp(row + rowOffset, 0, GARDEN_ROWS - 1);
    const neighbourColumn = clamp(column + columnOffset, 0, GARDEN_COLUMNS - 1);
    const neighbourIndex = neighbourRow * GARDEN_COLUMNS + neighbourColumn;
    if (seen.has(neighbourIndex)) {
      continue;
    }
    seen.add(neighbourIndex);
    neighbours.push(neighbourIndex);
  }
  return neighbours;
}

export interface BreedingRule {
  readonly id: string;
  /** Minimum count of each flower species required among ready neighbours. */
  readonly requiredFlowers: Readonly<Partial<Record<FlowerSku, number>>>;
  readonly resultSku: FlowerSku;
  /** Success probability, rolled with the caller-provided Rng. */
  readonly chance: number;
  readonly noteVi: string;
}

/**
 * Deterministic rule table, evaluated in order (first match wins):
 *
 * | Ready neighbours             | Result        | Chance |
 * |------------------------------|---------------|--------|
 * | 2+ rose_pink                 | rose_sakura   | 35%    |
 * | rose_pink + rose_sakura      | rose_sakura   | 50%    |
 * | 2+ rose_sakura               | rose_sakura   | 25%    |
 * | rose_pink + sunflower        | rose_pink*    | 60%    |
 * | anything else / unknown pair | null          | -      |
 *
 * (*) There is no `rose_pastel` SKU in CROP_DEFINITIONS, so the pastel variant
 * falls back safely to `rose_pink` with an explanatory Vietnamese note.
 */
export const FLOWER_BREEDING_RULES: readonly BreedingRule[] = [
  {
    id: 'sakura_from_pink_pair',
    requiredFlowers: { rose_pink: 2 },
    resultSku: 'rose_sakura',
    chance: 0.35,
    noteVi: 'Hai khóm hồng phấn chín ghép thành hoa anh đào.',
  },
  {
    id: 'sakura_from_pink_and_sakura',
    requiredFlowers: { rose_pink: 1, rose_sakura: 1 },
    resultSku: 'rose_sakura',
    chance: 0.5,
    noteVi: 'Hồng phấn và anh đào hoà sắc.',
  },
  {
    id: 'sakura_from_sakura_pair',
    requiredFlowers: { rose_sakura: 2 },
    resultSku: 'rose_sakura',
    chance: 0.25,
    noteVi: 'Vườn anh đào nhỏ đã kết thành hoa mới.',
  },
  {
    id: 'pastel_rose_fallback',
    requiredFlowers: { rose_pink: 1, sunflower: 1 },
    resultSku: 'rose_pink',
    chance: 0.6,
    noteVi: 'Sắc hồng pastel nhạt từ hồng phấn và hướng dương.',
  },
];

function matchesRule(rule: BreedingRule, flowerCounts: ReadonlyMap<FlowerSku, number>): boolean {
  const requiredSkus = Object.keys(rule.requiredFlowers) as FlowerSku[];
  for (const sku of requiredSkus) {
    const needed = rule.requiredFlowers[sku] ?? 0;
    if ((flowerCounts.get(sku) ?? 0) < needed) {
      return false;
    }
  }
  return true;
}

export interface BreedInput {
  readonly plotIndex: number;
  /** Required so only blooming (ready) neighbours participate. */
  readonly nowMs: number;
  readonly rng: Rng;
}

export type BreedResult = FarmingResult<{
  readonly farm: Farm;
  readonly bred: BredFlower | null;
}>;

/**
 * Pure breeding attempt. `farm` is returned unchanged (the flower becomes an
 * inventory item); only `bred` describes the new flower.
 */
export function breedFlowers(farm: Farm, input: BreedInput): BreedResult {
  const { plotIndex, nowMs, rng } = input;
  if (!isValidPlotIndex(plotIndex)) {
    return farmingError('INVALID_PLOT');
  }
  if (!Number.isFinite(nowMs)) {
    return farmingError('INVALID_TIME');
  }

  const flowerCounts = new Map<FlowerSku, number>();
  let highestWaterCount = 0;

  for (const neighbourIndex of getNeighbourPlotIndices(plotIndex)) {
    const plot = farm.plots[neighbourIndex];
    if (!plot || plot.soil !== 'planted' || !plot.crop) {
      continue;
    }
    const crop = plot.crop;
    if (!isFlowerCrop(crop.cropSku)) {
      continue;
    }
    if (!isReady(crop, nowMs)) {
      continue;
    }
    flowerCounts.set(crop.cropSku, (flowerCounts.get(crop.cropSku) ?? 0) + 1);
    highestWaterCount = Math.max(highestWaterCount, crop.waterCount);
  }

  const rule = FLOWER_BREEDING_RULES.find((candidate) => matchesRule(candidate, flowerCounts));
  if (!rule) {
    return { ok: true, farm, bred: null };
  }
  if (!(rng() < rule.chance)) {
    return { ok: true, farm, bred: null };
  }
  if (!getCropDefinition(rule.resultSku)) {
    // Defensive: never emit a SKU that the rest of the game cannot resolve.
    return { ok: true, farm, bred: null };
  }

  const quality = rollQuality(rng, rule.resultSku, highestWaterCount);
  const bred: BredFlower = {
    sku: rule.resultSku,
    quality,
    noteVi: rule.noteVi,
  };
  return { ok: true, farm, bred };
}

export interface BredDeepFlower {
  readonly sku: DeepFlowerSku;
  readonly quality: 'normal' | 'silver' | 'gold';
  readonly noteVi?: string;
}

/**
 * Extended plot crossbreeding supporting all 10 Tulip/Rose/Sakura genetics recipes
 * while keeping legacy `breedFlowers` untouched for starter contract tests.
 */
export function breedPlotDeepFlower(
  farm: Farm,
  input: BreedInput,
): FarmingResult<{ readonly farm: Farm; readonly bred: BredDeepFlower | null }> {
  const { plotIndex, nowMs, rng } = input;
  if (!isValidPlotIndex(plotIndex)) return farmingError('INVALID_PLOT');
  if (!Number.isFinite(nowMs)) return farmingError('INVALID_TIME');

  const counts = new Map<string, number>();
  let maxWater = 0;
  for (const neighbourIndex of getNeighbourPlotIndices(plotIndex)) {
    const plot = farm.plots[neighbourIndex];
    if (!plot || plot.soil !== 'planted' || !plot.crop) continue;
    if (!isFlowerCrop(plot.crop.cropSku) || !isReady(plot.crop, nowMs)) continue;
    counts.set(plot.crop.cropSku, (counts.get(plot.crop.cropSku) ?? 0) + 1);
    maxWater = Math.max(maxWater, plot.crop.waterCount);
  }

  for (const recipe of FLOWER_GENETICS_RECIPES) {
    const matches =
      recipe.parentA === recipe.parentB
        ? (counts.get(recipe.parentA) ?? 0) >= 2
        : (counts.get(recipe.parentA) ?? 0) >= 1 && (counts.get(recipe.parentB) ?? 0) >= 1;
    if (!matches) continue;
    if (rng() >= recipe.odds) continue;
    return {
      ok: true,
      farm,
      bred: {
        sku: recipe.child,
        quality: rollQuality(rng, recipe.child, maxWater),
        noteVi: recipe.hintVi,
      },
    };
  }
  return breedFlowers(farm, input);
}
