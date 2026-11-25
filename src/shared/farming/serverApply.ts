import { computeSellPrice, requireItem } from '../economy/catalogConfig';
import { createRng } from '../rng';
import type { InventoryEntry } from '../inventory/inventoryTypes';
import {
  createFarm,
  getCropDefinition,
  growthProgress03,
  harvest,
  isReady,
  plant,
  till,
  water,
} from './crops';
import type { Farm } from './types';
import type { CropSku, QualityTier } from './types';
import type { FarmApplyParams, FarmApplyResult, FarmPlotView, FarmSnapshot } from './farmSnapshotTypes';

const TOOL_HOE = 'tool_hoe';
const TOOL_WATERING_CAN = 'tool_watering_can';

export const FARM_STARTER_TOOLS = [TOOL_HOE, TOOL_WATERING_CAN, 'water_pitcher'] as const;
export const FARM_STARTER_SEED_QTY = 5;
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

export function projectFarmPlots(farm: Farm, nowMs: number): FarmPlotView[] {
  return farm.plots.map((p) => {
    const crop = p.soil === 'planted' ? p.crop : undefined;
    const growthPermille = crop ? growthProgress03(crop, nowMs) : 0;
    return {
      plotId: p.plotId,
      soil: p.soil,
      cropSku: crop?.cropSku ?? null,
      plantedAtMs: crop?.plantedAtMs ?? null,
      waterCount: crop?.waterCount ?? 0,
      growthPermille,
      ready: crop ? isReady(crop, nowMs) : false,
    };
  });
}

export function buildFarmSnapshot(
  worldId: string,
  version: number,
  farm: Farm,
  walletCoins: number,
  nowMs: number,
): FarmSnapshot {
  return {
    worldId,
    version,
    serverNowMs: nowMs,
    farm,
    plots: projectFarmPlots(farm, nowMs),
    walletCoins,
  };
}

export type FarmServerMutation =
  | { ok: true; farm: Farm; inventory: InventoryEntry[]; walletCoins: number; harvested?: FarmApplyResult['harvested'] }
  | { ok: false; code: string; messageVi: string };

function debitSeed(items: InventoryEntry[], seedSku: string): InventoryEntry[] | null {
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === seedSku && (r.quality ?? 'normal') === 'normal',
  );
  if (idx < 0 || next[idx]!.qty < 1) return null;
  next[idx] = { ...next[idx]!, qty: next[idx]!.qty - 1 };
  if (next[idx]!.qty === 0) next.splice(idx, 1);
  return next;
}

function creditCrop(
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

function growthClockMs(plantedAtMs: number, nowMs: number, timeScale: number): number {
  if (timeScale <= 1) return nowMs;
  return plantedAtMs + Math.floor((nowMs - plantedAtMs) * timeScale);
}

export function applyFarmAction(input: ApplyFarmActionInput): FarmServerMutation {
  const { params, nowMs } = input;
  const timeScale = input.timeScale ?? 1;
  let farm = input.farm;
  let items: InventoryEntry[] = input.inventoryItems.map((r) => ({ ...r }));
  const plotIndex = params.plotIndex;

  if (params.action === 'till') {
    if (sharedQty(items, TOOL_HOE) < 1) {
      return { ok: false, code: 'TOOL_REQUIRED', messageVi: 'Cần cầm cuốc (ô kho).' };
    }
    const result = till(farm, { plotIndex });
    if (!result.ok) return { ok: false, code: result.code, messageVi: result.messageVi };
    farm = result.farm;
  } else if (params.action === 'plant') {
    const seedSku = params.seedSku?.trim();
    if (!seedSku) {
      return { ok: false, code: 'VALIDATION_ERROR', messageVi: 'Chưa chọn hạt giống.' };
    }
    const cropSku = cropSkuFromSeedSku(seedSku);
    if (!cropSku) {
      return { ok: false, code: 'UNKNOWN_SEED', messageVi: 'Hạt giống không hợp lệ.' };
    }
    if (sharedQty(items, seedSku) < 1) {
      return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Hết hạt giống này trong kho chung.' };
    }
    const result = plant(farm, { plotIndex, cropSku, nowMs });
    if (!result.ok) return { ok: false, code: result.code, messageVi: result.messageVi };
    const debited = debitSeed(items, seedSku);
    if (!debited) return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Hết hạt giống này trong kho chung.' };
    items = debited;
    farm = result.farm;
  } else if (params.action === 'water') {
    if (sharedQty(items, TOOL_WATERING_CAN) < 1 && sharedQty(items, 'water_pitcher') < 1) {
      return { ok: false, code: 'TOOL_REQUIRED', messageVi: 'Cần bình tưới hoặc bình nước.' };
    }
    const result = water(farm, { plotIndex, nowMs });
    if (!result.ok) return { ok: false, code: result.code, messageVi: result.messageVi };
    farm = result.farm;
  } else if (params.action === 'harvest') {
    const plot = farm.plots[plotIndex];
    const crop = plot?.soil === 'planted' ? plot.crop : undefined;
    const growthNow = crop ? growthClockMs(crop.plantedAtMs, nowMs, timeScale) : nowMs;
    const stream = createRng(farm.seed + plotIndex * 997 + nowMs);
    const rng = () => stream.next();
    const result = harvest(farm, { plotIndex, nowMs: growthNow, rng });
    if (!result.ok) return { ok: false, code: result.code, messageVi: result.messageVi };
    farm = result.farm;
    for (const row of result.harvested.items) {
      items = creditCrop(input.worldId, nowMs, items, row.sku, row.qty, row.quality);
    }
    return {
      ok: true,
      farm,
      inventory: items,
      walletCoins: input.walletCoins,
      harvested: result.harvested.items.map((h) => ({ sku: h.sku, qty: h.qty, quality: h.quality })),
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
    return { ok: false, code: 'UNKNOWN_SKU', messageVi: 'Không tìm thấy món trong catalog.' };
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

export function buySeed(
  worldId: string,
  walletCoins: number,
  items: InventoryEntry[],
  seedSku: string,
  qty: number,
  nowMs: number,
): { ok: true; walletCoins: number; items: InventoryEntry[] } | { ok: false; code: string; messageVi: string } {
  if (qty < 1) return { ok: false, code: 'INVALID_QTY', messageVi: 'Số lượng không hợp lệ.' };
  let def;
  try {
    def = requireItem(seedSku);
  } catch {
    return { ok: false, code: 'UNKNOWN_SKU', messageVi: 'Không tìm thấy hạt trong cửa hàng.' };
  }
  const unit = def.storeBuy ?? 0;
  if (unit <= 0) return { ok: false, code: 'NOT_FOR_SALE', messageVi: 'Hạt này chưa mở bán.' };
  const total = unit * qty;
  if (walletCoins < total) return { ok: false, code: 'INSUFFICIENT_FUNDS', messageVi: 'Không đủ xu.' };
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === seedSku && (r.quality ?? 'normal') === 'normal',
  );
  if (idx >= 0) next[idx] = { ...next[idx]!, qty: next[idx]!.qty + qty };
  else {
    next.push({
      worldId,
      ownerScope: 'shared',
      itemSku: seedSku,
      qty,
      quality: 'normal',
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
  return { ok: true, walletCoins: walletCoins - total, items: next };
}

export function emptyFarm(seed: number): Farm {
  return createFarm(seed);
}