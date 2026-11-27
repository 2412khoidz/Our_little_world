import { getCropDefinition, getCycleBaseMs, getWaterReductionMs, growthProgress03, isReady } from './crops';
import {
  computeEffectiveCropCycle,
  FERTILIZER_DEFS,
  isPlotCoveredBySprinkler,
  type CropEnvironmentContext,
} from './deepCropSimulation';
import { isGreenhousePlot } from './farmPlotIndex';
import type { Farm, PlantedCrop } from './types';
import type { FarmPlotView } from './farmSnapshotTypes';

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
  const afterWater = Math.max(1, baseMs - getWaterReductionMs(crop));
  const fert = crop.fertilizer ? FERTILIZER_DEFS[crop.fertilizer] : undefined;
  if (!fert || fert.speedBp === 10_000) return afterWater;
  return Math.max(1, Math.round((afterWater * 10_000) / fert.speedBp));
}

/** Wall-clock ms when the crop becomes harvestable (accounts for dev `timeScale`). */
export function harvestReadyAtMs(crop: PlantedCrop, timeScale: number): number {
  const effectiveMs = effectiveGrowDurationMs(crop);
  if (timeScale <= 1) return crop.plantedAtMs + effectiveMs;
  return crop.plantedAtMs + Math.ceil(effectiveMs / timeScale);
}

export function projectFarmPlots(
  farm: Farm,
  nowMs: number,
  timeScale = 1,
  env?: CropEnvironmentContext,
): FarmPlotView[] {
  const useEnv = Boolean(env || farm.weatherEpochMs !== undefined);
  return farm.plots.map((p) => {
    const crop = p.soil === 'planted' ? p.crop : undefined;
    const greenhouse = isGreenhousePlot(p.plotId);
    const sprinklerCovered = isPlotCoveredBySprinkler(farm, p.plotId);

    if (!crop) {
      return {
        plotId: p.plotId,
        soil: p.soil,
        cropSku: null,
        plantedAtMs: null,
        waterCount: 0,
        growthPermille: 0,
        ready: false,
        harvestReadyAtMs: null,
        growthStage: p.soil === 'tilled' ? 0 : null,
        fertilizer: p.fertilizer ?? null,
        sprinkler: p.sprinkler ?? null,
        greenhouse,
        autoWatered: sprinklerCovered,
        seasonMatch: true,
      };
    }

    let growthPermille: number;
    let ready: boolean;
    let etaMs: number;
    let autoWatered = sprinklerCovered;
    let seasonMatch = true;

    if (useEnv) {
      const reconciled = computeEffectiveCropCycle(farm, p.plotId, crop, nowMs, {
        ...env,
        timeScale,
      });
      autoWatered = reconciled.sprinklerCovered || reconciled.rainWatered;
      seasonMatch = reconciled.seasonMatch;
      const elapsed = Math.max(0, nowMs - crop.plantedAtMs);
      growthPermille = Math.min(
        1000,
        Math.floor((elapsed * 1000) / Math.max(1, reconciled.effectiveCycleMs)),
      );
      ready = growthPermille >= 1000;
      etaMs = crop.plantedAtMs + reconciled.effectiveCycleMs;
    } else {
      const growthNow = growthClockMs(crop.plantedAtMs, nowMs, timeScale);
      const effectiveMs = effectiveGrowDurationMs(crop);
      if (crop.fertilizer && FERTILIZER_DEFS[crop.fertilizer]?.speedBp !== 10_000) {
        const elapsed = Math.max(0, growthNow - crop.plantedAtMs);
        growthPermille = Math.min(1000, Math.floor((elapsed * 1000) / effectiveMs));
        ready = growthPermille >= 1000;
      } else {
        growthPermille = growthProgress03(crop, growthNow);
        ready = isReady(crop, growthNow);
      }
      etaMs = harvestReadyAtMs(crop, timeScale);
    }

    return {
      plotId: p.plotId,
      soil: p.soil,
      cropSku: crop.cropSku,
      plantedAtMs: crop.plantedAtMs,
      waterCount: autoWatered ? Math.max(1, crop.waterCount) : crop.waterCount,
      growthPermille,
      ready,
      harvestReadyAtMs: etaMs,
      growthStage: cabacosGrowthStageForPermille(growthPermille, ready, crop.cropSku),
      fertilizer: crop.fertilizer ?? p.fertilizer ?? null,
      sprinkler: p.sprinkler ?? null,
      greenhouse,
      autoWatered,
      seasonMatch,
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
