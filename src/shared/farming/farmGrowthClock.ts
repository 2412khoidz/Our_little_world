import { getCropDefinition, getCycleBaseMs, getWaterReductionMs, growthProgress03, isReady } from './crops';
import type { PlantedCrop } from './types';
import type { FarmPlotView } from './farmSnapshotTypes';
import type { Farm } from './types';

/**
 * Dev fast-grow: compress elapsed wall time when projecting growth (matches `applyFarmAction` harvest).
 * At `timeScale` 1 this is a no-op.
 */
export function growthClockMs(plantedAtMs: number, nowMs: number, timeScale: number): number {
  if (timeScale <= 1) return nowMs;
  return plantedAtMs + Math.floor((nowMs - plantedAtMs) * timeScale);
}

export function effectiveGrowDurationMs(crop: PlantedCrop): number {
  const baseMs = getCycleBaseMs(crop);
  return Math.max(1, baseMs - getWaterReductionMs(crop));
}

/** Wall-clock ms when the crop becomes harvestable (accounts for dev `timeScale`). */
export function harvestReadyAtMs(crop: PlantedCrop, timeScale: number): number {
  const effectiveMs = effectiveGrowDurationMs(crop);
  if (timeScale <= 1) return crop.plantedAtMs + effectiveMs;
  return crop.plantedAtMs + Math.ceil(effectiveMs / timeScale);
}

export function projectFarmPlots(farm: Farm, nowMs: number, timeScale = 1): FarmPlotView[] {
  return farm.plots.map((p) => {
    const crop = p.soil === 'planted' ? p.crop : undefined;
    const growthNow = crop ? growthClockMs(crop.plantedAtMs, nowMs, timeScale) : nowMs;
    const growthPermille = crop ? growthProgress03(crop, growthNow) : 0;
    const ready = crop ? isReady(crop, growthNow) : false;
    return {
      plotId: p.plotId,
      soil: p.soil,
      cropSku: crop?.cropSku ?? null,
      plantedAtMs: crop?.plantedAtMs ?? null,
      waterCount: crop?.waterCount ?? 0,
      growthPermille,
      ready,
      harvestReadyAtMs: crop ? harvestReadyAtMs(crop, timeScale) : null,
      growthStage: crop
        ? cabacosGrowthStageForPermille(growthPermille, ready, crop.cropSku)
        : p.soil === 'tilled'
          ? 0
          : null,
    };
  });
}

/**
 * Vendored presentation slice from Cabacos `stageGrowthDays` (3 growth frames + harvest).
 * Maps OLW authority `growthPermille` → sprite frame index 0..3.
 */
export function cabacosGrowthStageForPermille(
  growthPermille: number,
  ready: boolean,
  cropSku: string,
): number {
  if (ready) return 3;
  const def = getCropDefinition(cropSku);
  const stages = def ? 3 : 3;
  const step = 1000 / (stages + 1);
  return Math.min(stages - 1, Math.floor(growthPermille / step));
}