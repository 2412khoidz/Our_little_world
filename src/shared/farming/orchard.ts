/**
 * Perennial Fruit Tree & Orchard System (Checkpoint C).
 *
 * Transplanted from:
 * - `KrasimirKralev/harvest-hollow` @ 9b23e1a (shared/content/trees.js & shared/rules/actions/trees.js)
 * - `Shiz0id/webfarmville` @ c420bc2 (shared/src/content/producers.ts)
 *
 * Supports 12 perennial tree species, 4 lifecycle stages (sapling -> young -> mature -> fruiting),
 * recurring timestamped production cycles, weather (`windy`/`rainbow`) +1 harvest bonus,
 * zero tree death from offline absence, and reversible uprooting.
 */
import type { WeatherId } from '../donor/webfarmville-c420bc2/weatherRules.ts';
import type { Rng } from '../rng.ts';
import { CALENDAR_SEASONS, resolveWorldCalendar, type CalendarSeason } from '../world/worldCalendar.ts';
import type { QualityTier } from './types.ts';

export const ORCHARD_SLOT_COUNT = 12;

export type OrchardTreeStage = 'sapling' | 'young' | 'mature' | 'fruiting';

export interface OrchardTreeDef {
  readonly treeId: string;
  readonly saplingSku: string;
  readonly produceSku: string;
  readonly nameVi: string;
  readonly seasons: readonly CalendarSeason[];
  /** Milliseconds from planting sapling to first maturity/fruiting. */
  readonly matureMs: number;
  /** Milliseconds between recurring fruit harvests once mature. */
  readonly cycleMs: number;
  readonly yieldQty: number;
  readonly xp: number;
  readonly fruitColorHex: string;
  readonly canopyColorHex: string;
}

const ALL_SEASONS: readonly CalendarSeason[] = CALENDAR_SEASONS;

export const ORCHARD_TREE_DEFS: readonly OrchardTreeDef[] = [
  { treeId: 'peach', saplingSku: 'sapling_peach', produceSku: 'peach', nameVi: 'Cây đào', seasons: ['summer'], matureMs: 3 * 3600_000, cycleMs: 2 * 3600_000, yieldQty: 3, xp: 18, fruitColorHex: '#f89c78', canopyColorHex: '#5fa845' },
  { treeId: 'apple', saplingSku: 'sapling_apple', produceSku: 'apple', nameVi: 'Cây táo đỏ', seasons: ['fall'], matureMs: 2 * 3600_000, cycleMs: 3600_000, yieldQty: 3, xp: 15, fruitColorHex: '#e23b3b', canopyColorHex: '#4e9a3a' },
  { treeId: 'cherry', saplingSku: 'sapling_cherry', produceSku: 'cherry', nameVi: 'Cây anh đào', seasons: ['spring'], matureMs: 2 * 3600_000, cycleMs: 3600_000, yieldQty: 3, xp: 16, fruitColorHex: '#b5122e', canopyColorHex: '#5da544' },
  { treeId: 'orange', saplingSku: 'sapling_orange', produceSku: 'orange', nameVi: 'Cây cam vàng', seasons: ['summer'], matureMs: 2 * 4200_000, cycleMs: 4200_000, yieldQty: 3, xp: 18, fruitColorHex: '#f28c1e', canopyColorHex: '#3f8f3a' },
  { treeId: 'lemon', saplingSku: 'sapling_lemon', produceSku: 'lemon', nameVi: 'Cây chanh vàng', seasons: ['summer', 'fall'], matureMs: 2 * 4200_000, cycleMs: 4200_000, yieldQty: 3, xp: 17, fruitColorHex: '#ffe14d', canopyColorHex: '#4c9e3f' },
  { treeId: 'plum', saplingSku: 'sapling_plum', produceSku: 'plum', nameVi: 'Cây mận tím', seasons: ['spring', 'fall'], matureMs: 2 * 3900_000, cycleMs: 3900_000, yieldQty: 3, xp: 16, fruitColorHex: '#8040a0', canopyColorHex: '#4c8e42' },
  { treeId: 'pear', saplingSku: 'sapling_pear', produceSku: 'pear', nameVi: 'Cây lê mật', seasons: ['fall'], matureMs: 2 * 4500_000, cycleMs: 4500_000, yieldQty: 3, xp: 19, fruitColorHex: '#c8d64e', canopyColorHex: '#519644' },
  { treeId: 'pomegranate', saplingSku: 'sapling_pomegranate', produceSku: 'pomegranate', nameVi: 'Cây lựu đỏ', seasons: ['fall'], matureMs: 2 * 5400_000, cycleMs: 5400_000, yieldQty: 3, xp: 22, fruitColorHex: '#c0213a', canopyColorHex: '#3f7f36' },
  { treeId: 'fig', saplingSku: 'sapling_fig', produceSku: 'fig', nameVi: 'Cây sung ngọt', seasons: ['fall'], matureMs: 2 * 5400_000, cycleMs: 5400_000, yieldQty: 3, xp: 22, fruitColorHex: '#7b4372', canopyColorHex: '#4b8742' },
  { treeId: 'walnut', saplingSku: 'sapling_walnut', produceSku: 'walnut', nameVi: 'Cây óc chó', seasons: ['fall'], matureMs: 2 * 4800_000, cycleMs: 4800_000, yieldQty: 3, xp: 20, fruitColorHex: '#a67449', canopyColorHex: '#52803a' },
  { treeId: 'olive', saplingSku: 'sapling_olive', produceSku: 'olive', nameVi: 'Cây ô liu xanh', seasons: ['summer', 'fall'], matureMs: 2 * 4800_000, cycleMs: 4800_000, yieldQty: 3, xp: 20, fruitColorHex: '#869e3d', canopyColorHex: '#627c44' },
  { treeId: 'cocoa', saplingSku: 'sapling_cocoa', produceSku: 'cocoa_bean', nameVi: 'Cây ca cao', seasons: ALL_SEASONS, matureMs: 2 * 6000_000, cycleMs: 6000_000, yieldQty: 3, xp: 25, fruitColorHex: '#6e3c24', canopyColorHex: '#3b7d39' },
];

export const ORCHARD_TREE_BY_SAPLING: ReadonlyMap<string, OrchardTreeDef> = new Map(
  ORCHARD_TREE_DEFS.map((t) => [t.saplingSku, t]),
);

export const ORCHARD_TREE_BY_ID: ReadonlyMap<string, OrchardTreeDef> = new Map(
  ORCHARD_TREE_DEFS.map((t) => [t.treeId, t]),
);

export interface PlantedOrchardTree {
  readonly slotIndex: number;
  readonly treeId: string;
  readonly plantedAtMs: number;
  readonly matureAtMs: number;
  readonly nextReadyAtMs: number;
  readonly harvestsCount: number;
  readonly plantedBy: string;
}

export interface OrchardState {
  readonly slots: ReadonlyArray<PlantedOrchardTree | null>;
}

export function createOrchard(): OrchardState {
  return {
    slots: Array.from({ length: ORCHARD_SLOT_COUNT }, () => null),
  };
}

export interface OrchardTreeView {
  readonly slotIndex: number;
  readonly tree: OrchardTreeDef | null;
  readonly stage: OrchardTreeStage | null;
  readonly ready: boolean;
  readonly mature: boolean;
  readonly progressPermille: number;
  readonly readyAtMs: number | null;
  readonly harvestsCount: number;
  readonly heirloom: boolean;
}

export function treeStageAt(tree: PlantedOrchardTree, nowMs: number): OrchardTreeStage {
  if (nowMs >= tree.matureAtMs && nowMs >= tree.nextReadyAtMs) {
    return 'fruiting';
  }
  if (nowMs >= tree.matureAtMs) {
    return 'mature';
  }
  const totalMature = Math.max(1, tree.matureAtMs - tree.plantedAtMs);
  const ratio = Math.max(0, Math.min(1, (nowMs - tree.plantedAtMs) / totalMature));
  if (ratio < 0.35) return 'sapling';
  if (ratio < 0.72) return 'young';
  return 'mature';
}

export function projectOrchard(orchard: OrchardState, nowMs: number): OrchardTreeView[] {
  return orchard.slots.map((slot, slotIndex) => {
    if (!slot) {
      return {
        slotIndex,
        tree: null,
        stage: null,
        ready: false,
        mature: false,
        progressPermille: 0,
        readyAtMs: null,
        harvestsCount: 0,
        heirloom: false,
      };
    }
    const def = ORCHARD_TREE_BY_ID.get(slot.treeId) ?? null;
    if (!def) {
      return {
        slotIndex,
        tree: null,
        stage: null,
        ready: false,
        mature: false,
        progressPermille: 0,
        readyAtMs: null,
        harvestsCount: 0,
        heirloom: false,
      };
    }
    const mature = nowMs >= slot.matureAtMs;
    const ready = mature && nowMs >= slot.nextReadyAtMs;
    const stage = treeStageAt(slot, nowMs);
    const startMs = mature ? Math.max(slot.matureAtMs, slot.nextReadyAtMs - def.cycleMs) : slot.plantedAtMs;
    const endMs = mature ? slot.nextReadyAtMs : slot.matureAtMs;
    const span = Math.max(1, endMs - startMs);
    const progressPermille = ready
      ? 1000
      : Math.max(0, Math.min(999, Math.floor(((nowMs - startMs) * 1000) / span)));

    return {
      slotIndex,
      tree: def,
      stage,
      ready,
      mature,
      progressPermille,
      readyAtMs: slot.nextReadyAtMs,
      harvestsCount: slot.harvestsCount,
      heirloom: slot.harvestsCount >= 20,
    };
  });
}

export function plantOrchardSapling(
  orchard: OrchardState,
  slotIndex: number,
  saplingSku: string,
  nowMs: number,
  actorId: string,
):
  | { ok: true; orchard: OrchardState; tree: OrchardTreeDef }
  | { ok: false; code: string; messageVi: string } {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= ORCHARD_SLOT_COUNT) {
    return { ok: false, code: 'INVALID_SLOT', messageVi: 'Ô trồng cây ăn quả không hợp lệ (0–11).' };
  }
  const def = ORCHARD_TREE_BY_SAPLING.get(saplingSku);
  if (!def) {
    return { ok: false, code: 'UNKNOWN_SAPLING', messageVi: 'Cây giống không hợp lệ.' };
  }
  if (orchard.slots[slotIndex] !== null) {
    return { ok: false, code: 'SLOT_OCCUPIED', messageVi: 'Vị trí này đã trồng cây ăn quả rồi.' };
  }
  const matureAtMs = nowMs + def.matureMs;
  const slots = orchard.slots.slice();
  slots[slotIndex] = {
    slotIndex,
    treeId: def.treeId,
    plantedAtMs: nowMs,
    matureAtMs,
    nextReadyAtMs: matureAtMs,
    harvestsCount: 0,
    plantedBy: actorId,
  };
  return { ok: true, orchard: { slots }, tree: def };
}

export function harvestOrchardTree(
  orchard: OrchardState,
  slotIndex: number,
  nowMs: number,
  rng: Rng,
  opts?: {
    readonly weatherId?: WeatherId;
    readonly hasBasketTool?: boolean;
    readonly worldEpochMs?: number;
  },
):
  | {
      ok: true;
      orchard: OrchardState;
      sku: string;
      qty: number;
      quality: QualityTier;
      xp: number;
      windBonus: boolean;
    }
  | { ok: false; code: string; messageVi: string } {
  const slot = orchard.slots[slotIndex];
  if (!slot) return { ok: false, code: 'NO_TREE', messageVi: 'Ô này chưa trồng cây.' };
  const def = ORCHARD_TREE_BY_ID.get(slot.treeId);
  if (!def) return { ok: false, code: 'UNKNOWN_TREE', messageVi: 'Loài cây không xác định.' };

  if (nowMs < slot.matureAtMs || nowMs < slot.nextReadyAtMs) {
    return { ok: false, code: 'NOT_READY', messageVi: `${def.nameVi} chưa ra trái chín.` };
  }

  const cal = resolveWorldCalendar(nowMs, opts?.worldEpochMs ?? 0);
  const inSeason = def.seasons.includes(cal.season);
  const weatherBonus = opts?.weatherId === 'windy' || opts?.weatherId === 'rainbow' ? 1 : 0;
  const basketBonus = opts?.hasBasketTool ? 1 : 0;
  const seasonBonus = inSeason ? 1 : 0;
  const qty = def.yieldQty + weatherBonus + basketBonus + (slot.harvestsCount >= 20 ? 1 : 0);

  const roll = rng();
  const heirloomBoost = slot.harvestsCount >= 20 ? 0.15 : 0;
  const quality: QualityTier =
    roll < 0.12 + heirloomBoost + (seasonBonus ? 0.08 : 0)
      ? 'gold'
      : roll < 0.45 + heirloomBoost
        ? 'silver'
        : 'normal';

  const slots = orchard.slots.slice();
  slots[slotIndex] = {
    ...slot,
    nextReadyAtMs: nowMs + def.cycleMs,
    harvestsCount: slot.harvestsCount + 1,
  };

  return {
    ok: true,
    orchard: { slots },
    sku: def.produceSku,
    qty,
    quality,
    xp: def.xp,
    windBonus: weatherBonus > 0,
  };
}

export function uprootOrchardTree(
  orchard: OrchardState,
  slotIndex: number,
):
  | { ok: true; orchard: OrchardState; saplingSku: string }
  | { ok: false; code: string; messageVi: string } {
  const slot = orchard.slots[slotIndex];
  if (!slot) return { ok: false, code: 'NO_TREE', messageVi: 'Ô này không có cây.' };
  const def = ORCHARD_TREE_BY_ID.get(slot.treeId);
  if (!def) return { ok: false, code: 'UNKNOWN_TREE', messageVi: 'Loài cây không xác định.' };
  const slots = orchard.slots.slice();
  slots[slotIndex] = null;
  return { ok: true, orchard: { slots }, saplingSku: def.saplingSku };
}
