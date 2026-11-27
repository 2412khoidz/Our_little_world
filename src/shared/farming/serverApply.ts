import { computeSellPrice, requireItem } from '../economy/catalogConfig';
import { QUALITY_MULTIPLIER_BP } from '../economy/types';
import { canonicalFishItemDefinition } from '../donor/fishing/canonicalFishRegistry';
import { levelForGreensSkillXp } from '../donor/greens-3f32fd8/skillsData';
import { weatherForWorldDay } from '../donor/webfarmville-c420bc2/weatherRules';
import { resolveWorldCalendar } from '../world/worldCalendar';
import { createRng } from '../rng';
import type { InventoryEntry } from '../inventory/inventoryTypes';
import {
  createFarm,
  getCropDefinition,
  harvest,
  plant,
  till,
  water,
} from './crops';
import {
  applyFertilizerToPlot,
  computeEffectiveCropCycle,
  expandToolPlotFootprint,
  getDeepCropDefinition,
  placeSprinklerOnPlot,
  removeSprinklerFromPlot,
  rollDeepCropQuality,
  rollDeepHarvestQty,
} from './deepCropSimulation';
import type { CropSku, Farm, QualityTier } from './types';
import type { FarmApplyParams, FarmApplyResult, FarmSnapshot } from './farmSnapshotTypes';
import { growthClockMs, projectFarmPlots } from './farmGrowthClock';

const TOOL_HOE = 'tool_hoe';
const TOOL_WATERING_CAN = 'tool_watering_can';

export const FARM_STARTER_TOOLS = [TOOL_HOE, TOOL_WATERING_CAN, 'water_pitcher', 'rod_basic'] as const;
export const FARM_STARTER_SEED_QTY = 5;
export const FARM_STARTER_BAIT_QTY = 10;
export const FARM_STARTER_COINS = 50;

function cropSkuFromSeedSku(seedSku: string): CropSku | null {
  if (!seedSku.startsWith('seed_')) return null;
  const crop = seedSku.slice('seed_'.length);
  return getCropDefinition(crop) ? (crop as CropSku) : null;
}

function sharedQty(items: readonly InventoryEntry[], sku: string, quality: QualityTier = 'normal'): number {
  return items
    .filter((i) => i.ownerScope === 'shared' && i.itemSku === sku && (i.quality ?? 'normal') === quality)
    .reduce((n, i) => n + i.qty, 0);
}

export { projectFarmPlots } from './farmGrowthClock';

export function buildFarmSnapshot(
  worldId: string,
  version: number,
  farm: Farm,
  walletCoins: number,
  nowMs: number,
  timeScale = 1,
): FarmSnapshot {
  const epochMs = farm.weatherEpochMs ?? 0;
  const calendar = resolveWorldCalendar(nowMs, epochMs);
  const weather = weatherForWorldDay(worldId, calendar.totalDay, calendar.season);
  const env = farm.weatherEpochMs !== undefined ? { worldId, worldEpochMs: epochMs, timeScale } : undefined;
  return {
    worldId,
    version,
    serverNowMs: nowMs,
    farm,
    plots: projectFarmPlots(farm, nowMs, timeScale, env),
    walletCoins,
    calendar,
    weather,
    farmingLevel: levelForGreensSkillXp(farm.farmingXp ?? 0),
    ...(timeScale > 1 ? { growthTimeScale: timeScale } : {}),
  };
}

export type FarmServerMutation =
  | { ok: true; farm: Farm; inventory: InventoryEntry[]; walletCoins: number; harvested?: FarmApplyResult['harvested'] }
  | { ok: false; code: string; messageVi: string };

function debitSharedItem(items: InventoryEntry[], sku: string, qty = 1): InventoryEntry[] | null {
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === 'normal',
  );
  if (idx < 0 || next[idx]!.qty < qty) return null;
  next[idx] = { ...next[idx]!, qty: next[idx]!.qty - qty };
  if (next[idx]!.qty === 0) next.splice(idx, 1);
  return next;
}

function creditSharedItem(
  worldId: string,
  nowMs: number,
  items: InventoryEntry[],
  sku: string,
  qty: number,
  quality: QualityTier,
): InventoryEntry[] {
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
  );
  if (idx >= 0) {
    next[idx] = { ...next[idx]!, qty: next[idx]!.qty + qty };
  } else {
    next.push({
      worldId,
      ownerScope: 'shared',
      itemSku: sku,
      qty,
      quality,
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
  return next;
}

function resolveToolFootprint(
  centerPlotIndex: number,
  items: readonly InventoryEntry[],
  toolSku?: string | null,
): number[] {
  if (!toolSku) return [centerPlotIndex];
  if (sharedQty(items, toolSku) < 1) return [centerPlotIndex];
  const expanded = expandToolPlotFootprint(centerPlotIndex, toolSku);
  return expanded.length > 0 ? expanded : [centerPlotIndex];
}

export interface ApplyFarmActionInput {
  worldId: string;
  farm: Farm;
  farmVersion: number;
  walletCoins: number;
  inventoryItems: readonly InventoryEntry[];
  nowMs: number;
  params: FarmApplyParams;
  /** Dev / QA: multiply elapsed growth time (1 = default). */
  timeScale?: number;
}

export function applyFarmAction(input: ApplyFarmActionInput): FarmServerMutation {
  const { params, nowMs } = input;
  const timeScale = input.timeScale ?? 1;
  let farm = input.farm;
  let items: InventoryEntry[] = input.inventoryItems.map((r) => ({ ...r }));
  const plotIndex = params.plotIndex;
  const useEnv = Boolean(params.useEnvironment || farm.weatherEpochMs !== undefined);

  if (params.action === 'till') {
    const hasHoe =
      sharedQty(items, TOOL_HOE) >= 1 ||
      (params.toolSku ? sharedQty(items, params.toolSku) >= 1 : false);
    if (!hasHoe) {
      return { ok: false, code: 'TOOL_REQUIRED', messageVi: 'Cần cầm cuốc (ô kho).' };
    }
    const targets = resolveToolFootprint(plotIndex, items, params.toolSku);
    let anyOk = false;
    let firstError: { code: string; messageVi: string } | null = null;
    for (const targetIdx of targets) {
      const result = till(farm, { plotIndex: targetIdx });
      if (result.ok) {
        farm = result.farm;
        anyOk = true;
      } else if (!firstError) {
        firstError = { code: result.code, messageVi: result.messageVi };
      }
    }
    if (!anyOk && firstError) return { ok: false, ...firstError };
  } else if (params.action === 'plant') {
    const seedSku = params.seedSku?.trim() ?? '';
    if (!seedSku) {
      return { ok: false, code: 'VALIDATION_ERROR', messageVi: 'Chưa chọn hạt giống.' };
    }
    const cropSku = cropSkuFromSeedSku(seedSku);
    if (!cropSku) {
      return { ok: false, code: 'UNKNOWN_SEED', messageVi: 'Hạt giống không hợp lệ.' };
    }
    const targets = resolveToolFootprint(plotIndex, items, params.toolSku);
    let anyOk = false;
    let firstError: { code: string; messageVi: string } | null = null;
    for (const targetIdx of targets) {
      if (sharedQty(items, seedSku) < 1) {
        if (!firstError) firstError = { code: 'INSUFFICIENT_ITEMS', messageVi: 'Hết hạt giống này trong kho chung.' };
        break;
      }
      const result = plant(farm, { plotIndex: targetIdx, cropSku, nowMs });
      if (!result.ok) {
        if (!firstError) firstError = { code: result.code, messageVi: result.messageVi };
        continue;
      }
      const debited = debitSharedItem(items, seedSku);
      if (!debited) break;
      items = debited;
      farm = result.farm;
      anyOk = true;
    }
    if (!anyOk && firstError) return { ok: false, ...firstError };
  } else if (params.action === 'water') {
    const hasCan =
      sharedQty(items, TOOL_WATERING_CAN) >= 1 ||
      sharedQty(items, 'water_pitcher') >= 1 ||
      (params.toolSku ? sharedQty(items, params.toolSku) >= 1 : false);
    if (!hasCan) {
      return { ok: false, code: 'TOOL_REQUIRED', messageVi: 'Cần bình tưới hoặc bình nước.' };
    }
    const targets = resolveToolFootprint(plotIndex, items, params.toolSku);
    let anyOk = false;
    let firstError: { code: string; messageVi: string } | null = null;
    for (const targetIdx of targets) {
      const result = water(farm, { plotIndex: targetIdx, nowMs });
      if (result.ok) {
        farm = result.farm;
        anyOk = true;
      } else if (!firstError) {
        firstError = { code: result.code, messageVi: result.messageVi };
      }
    }
    if (!anyOk && firstError) return { ok: false, ...firstError };
  } else if (params.action === 'fertilize') {
    const fertilizerSku = params.fertilizerSku;
    if (!fertilizerSku) {
      return { ok: false, code: 'UNKNOWN_FERTILIZER', messageVi: 'Chưa chọn phân bón.' };
    }
    if (sharedQty(items, fertilizerSku) < 1) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Hết phân bón này trong kho chung.' };
    }
    const applied = applyFertilizerToPlot(farm, plotIndex, fertilizerSku);
    if (!applied.ok) return { ok: false, code: applied.code, messageVi: applied.messageVi };
    const debited = debitSharedItem(items, fertilizerSku);
    if (!debited) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Hết phân bón này trong kho chung.' };
    }
    items = debited;
    farm = applied.farm;
  } else if (params.action === 'place_sprinkler') {
    const sprinklerSku = params.sprinklerSku;
    if (!sprinklerSku) {
      return { ok: false, code: 'UNKNOWN_SPRINKLER', messageVi: 'Chưa chọn vòi phun.' };
    }
    if (sharedQty(items, sprinklerSku) < 1) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Không có vòi phun trong kho chung.' };
    }
    const placed = placeSprinklerOnPlot(farm, plotIndex, sprinklerSku);
    if (!placed.ok) return { ok: false, code: placed.code, messageVi: placed.messageVi };
    const debited = debitSharedItem(items, sprinklerSku);
    if (!debited) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Không có vòi phun trong kho chung.' };
    }
    items = debited;
    farm = placed.farm;
  } else if (params.action === 'remove_sprinkler') {
    const removed = removeSprinklerFromPlot(farm, plotIndex);
    if (!removed.ok) return { ok: false, code: removed.code, messageVi: removed.messageVi };
    farm = removed.farm;
    items = creditSharedItem(input.worldId, nowMs, items, removed.removedSku, 1, 'normal');
  } else if (params.action === 'harvest') {
    const targets = resolveToolFootprint(plotIndex, items, params.toolSku);
    const allHarvested: { sku: string; qty: number; quality: QualityTier }[] = [];
    let firstError: { code: string; messageVi: string } | null = null;
    let gainedXp = 0;

    for (const targetIdx of targets) {
      const plot = farm.plots[targetIdx];
      const crop = plot?.soil === 'planted' ? plot.crop : undefined;
      if (!crop) {
        if (!firstError) firstError = { code: 'NO_CROP', messageVi: 'Ô đất đang trống.' };
        continue;
      }
      const deepDef = getDeepCropDefinition(crop.cropSku);
      const stream = createRng(farm.seed + targetIdx * 997 + nowMs);
      const rng = () => stream.next();

      if (useEnv && deepDef) {
        const reconciled = computeEffectiveCropCycle(farm, targetIdx, crop, nowMs, {
          worldId: input.worldId,
          worldEpochMs: farm.weatherEpochMs ?? 0,
          timeScale,
        });
        const ready = nowMs - crop.plantedAtMs >= reconciled.effectiveCycleMs;
        if (!ready) {
          if (!firstError) firstError = { code: 'NOT_READY', messageVi: 'Cây chưa chín.' };
          continue;
        }
        const syntheticReadyMs = crop.plantedAtMs + 365 * 86_400_000;
        const result = harvest(farm, { plotIndex: targetIdx, nowMs: syntheticReadyMs, rng: () => 0.5 });
        if (!result.ok) {
          if (!firstError) firstError = { code: result.code, messageVi: result.messageVi };
          continue;
        }
        farm = {
          ...result.farm,
          plots: result.farm.plots.map((p, idx) =>
            idx === targetIdx && p.soil === 'planted' && p.crop
              ? { ...p, crop: { ...p.crop, plantedAtMs: nowMs } }
              : p,
          ),
        };
        const qty = rollDeepHarvestQty({
          rng,
          cropSku: crop.cropSku,
          greenhouse: reconciled.greenhouse,
          weather: reconciled.weather,
        });
        const quality = rollDeepCropQuality({
          rng,
          cropSku: crop.cropSku,
          farmingXp: farm.farmingXp ?? 0,
          watered: reconciled.moistureActive,
          fertilizer: crop.fertilizer ?? plot?.fertilizer ?? null,
          weather: reconciled.weather,
        });
        gainedXp += deepDef.xp;
        items = creditSharedItem(input.worldId, nowMs, items, crop.cropSku, qty, quality);
        allHarvested.push({ sku: crop.cropSku, qty, quality });
      } else {
        const growthNow = growthClockMs(crop.plantedAtMs, nowMs, timeScale);
        const result = harvest(farm, { plotIndex: targetIdx, nowMs: growthNow, rng });
        if (!result.ok) {
          if (!firstError) firstError = { code: result.code, messageVi: result.messageVi };
          continue;
        }
        farm = result.farm;
        for (const row of result.harvested.items) {
          items = creditSharedItem(input.worldId, nowMs, items, row.sku, row.qty, row.quality);
          allHarvested.push({ sku: row.sku, qty: row.qty, quality: row.quality });
        }
        gainedXp += deepDef?.xp ?? 5;
      }
    }

    if (allHarvested.length === 0) {
      return firstError
        ? { ok: false, ...firstError }
        : { ok: false, code: 'NO_CROP', messageVi: 'Ô đất đang trống.' };
    }
    if (gainedXp > 0) {
      farm = { ...farm, farmingXp: (farm.farmingXp ?? 0) + gainedXp };
    }
    return {
      ok: true,
      farm,
      inventory: items,
      walletCoins: input.walletCoins,
      harvested: allHarvested,
    };
  } else {
    return { ok: false, code: 'VALIDATION_ERROR', messageVi: 'Thao tác trồng trọt không hợp lệ.' };
  }

  return {
    ok: true,
    farm,
    inventory: items,
    walletCoins: input.walletCoins,
  };
}

export function sellCropLine(
  walletCoins: number,
  items: InventoryEntry[],
  sku: string,
  qty: number,
  quality: QualityTier = 'normal',
): { ok: true; walletCoins: number; items: InventoryEntry[] } | { ok: false; code: string; messageVi: string } {
  if (qty < 1) return { ok: false, code: 'INVALID_QTY', messageVi: 'Số lượng không hợp lệ.' };
  let unit: number;
  try {
    unit = computeSellPrice(sku, quality, 0);
    if (unit <= 0) return { ok: false, code: 'NOT_SELLABLE', messageVi: 'Món này không bán được.' };
  } catch {
    const fishDef = canonicalFishItemDefinition(sku);
    if (!fishDef || fishDef.sellPrice <= 0) {
      return { ok: false, code: 'UNKNOWN_SKU', messageVi: 'Không tìm thấy món trong catalog.' };
    }
    const qBp = fishDef.qualityTiers.includes(quality)
      ? QUALITY_MULTIPLIER_BP[quality]
      : QUALITY_MULTIPLIER_BP.normal;
    unit = Math.floor((fishDef.sellPrice * qBp) / 10_000);
    if (unit <= 0) return { ok: false, code: 'NOT_SELLABLE', messageVi: 'Món này không bán được.' };
  }
  const idx = items.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
  );
  if (idx < 0 || items[idx]!.qty < qty) {
    return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Không đủ nông sản trong kho.' };
  }
  const coins = unit * qty;
  const next = items.map((r) => ({ ...r }));
  next[idx] = { ...next[idx]!, qty: next[idx]!.qty - qty };
  if (next[idx]!.qty === 0) next.splice(idx, 1);
  return { ok: true, walletCoins: walletCoins + coins, items: next };
}

export function buyStoreItem(
  worldId: string,
  walletCoins: number,
  items: InventoryEntry[],
  itemSku: string,
  qty: number,
  nowMs: number,
): { ok: true; walletCoins: number; items: InventoryEntry[] } | { ok: false; code: string; messageVi: string } {
  if (qty < 1) return { ok: false, code: 'INVALID_QTY', messageVi: 'Số lượng không hợp lệ.' };
  let def;
  try {
    def = requireItem(itemSku);
  } catch {
    return { ok: false, code: 'UNKNOWN_SKU', messageVi: 'Không tìm thấy vật phẩm trong cửa hàng.' };
  }
  const unit = def.storeBuy ?? 0;
  if (unit <= 0) return { ok: false, code: 'NOT_FOR_SALE', messageVi: 'Vật phẩm này chưa mở bán.' };
  const total = unit * qty;
  if (walletCoins < total) return { ok: false, code: 'INSUFFICIENT_FUNDS', messageVi: 'Không đủ xu.' };
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === itemSku && (r.quality ?? 'normal') === 'normal',
  );
  if (idx >= 0) next[idx] = { ...next[idx]!, qty: next[idx]!.qty + qty };
  else {
    next.push({
      worldId,
      ownerScope: 'shared',
      itemSku,
      qty,
      quality: 'normal',
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
  return { ok: true, walletCoins: walletCoins - total, items: next };
}

/** @deprecated use `buyStoreItem` */
export const buySeed = buyStoreItem;

export function emptyFarm(seed: number): Farm {
  return createFarm(seed);
}
