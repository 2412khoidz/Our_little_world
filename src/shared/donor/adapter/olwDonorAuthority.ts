/**
 * Single adapter: donor rules → OLW shared inventory (no second ledger).
 * Wallet/coins stay on existing Dev LAN farm wallet; workshop only moves item SKUs.
 */
import type { InventoryEntry, InventoryOwnerScope } from '../../inventory/inventoryTypes';
import {
  collectFinishedCrafts,
  enqueueCraft,
  type InventoryLike,
  type WorkshopBuildingState,
} from '../webfarmville-c420bc2/meadowbrookWorkshopQueue';
import { OLW_MEADOWBROOK_MILL } from '../webfarmville-c420bc2/olwMeadowbrookMill';
import {
  MEADOWBROOK_FISH_TO_OLW_SKU,
  resolveMeadowbrookCatch,
  previewMeadowbrookCatch,
} from '../webfarmville-c420bc2/meadowbrookNatureCatch';
import { createRng, hashSeed } from '../../rng';

export interface DonorWorkshopWorldState {
  mill: WorkshopBuildingState;
  rngSeed: number;
}

export function emptyDonorWorkshopState(seed = 42_019): DonorWorkshopWorldState {
  return { mill: { level: 1, queue: [] }, rngSeed: seed };
}

function inventoryToMap(items: readonly InventoryEntry[]): InventoryLike {
  const map: InventoryLike = {};
  for (const row of items) {
    if (row.ownerScope !== 'shared') continue;
    if ((row.quality ?? 'normal') !== 'normal') continue;
    map[row.itemSku] = (map[row.itemSku] ?? 0) + row.qty;
  }
  return map;
}

function applyMapToSharedInventory(
  worldId: string,
  items: InventoryEntry[],
  map: InventoryLike,
  nowMs: number,
): InventoryEntry[] {
  const next = items.filter((r) => r.ownerScope !== 'shared' || (r.quality ?? 'normal') !== 'normal');
  for (const [sku, rawQty] of Object.entries(map)) {
    const qty = rawQty ?? 0;
    if (qty <= 0) continue;
    const idx = next.findIndex(
      (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === 'normal',
    );
    const row: InventoryEntry = {
      worldId,
      ownerScope: 'shared',
      itemSku: sku,
      qty,
      quality: 'normal',
      updatedAt: new Date(nowMs).toISOString(),
    };
    if (idx >= 0) next[idx] = row;
    else next.push(row);
  }
  return next;
}

export function donorQueueMillRecipe(
  world: DonorWorkshopWorldState,
  items: InventoryEntry[],
  worldId: string,
  recipeId: string,
  nowMs: number,
): { world: DonorWorkshopWorldState; items: InventoryEntry[] } {
  const map = inventoryToMap(items);
  const queued = enqueueCraft(world.mill, OLW_MEADOWBROOK_MILL, recipeId, map, nowMs);
  return {
    world: { ...world, mill: queued.building },
    items: applyMapToSharedInventory(worldId, items, queued.inventory, nowMs),
  };
}

export function donorCollectMillQueue(
  world: DonorWorkshopWorldState,
  items: InventoryEntry[],
  worldId: string,
  nowMs: number,
): { world: DonorWorkshopWorldState; items: InventoryEntry[] } {
  const map = inventoryToMap(items);
  const rng = createRng(world.rngSeed ^ nowMs);
  const collected = collectFinishedCrafts(world.mill, OLW_MEADOWBROOK_MILL, nowMs, map, () => rng.next());
  return {
    world: { ...world, mill: collected.building, rngSeed: hashSeed(String(collected.events.length ^ nowMs)) },
    items: applyMapToSharedInventory(worldId, items, collected.inventory, nowMs),
  };
}

export function donorFishingPreview(
  seed: number,
  nowMs: number,
  hour: number,
): { critterId: string; name: string } {
  const rng = createRng(seed);
  const def = previewMeadowbrookCatch({
    kind: 'fish',
    hour,
    nowMs,
    rng01: () => rng.next(),
  });
  return { critterId: def.id, name: def.name };
}

export function donorFishingResolve(
  seed: number,
  nowMs: number,
  hour: number,
  chillReelProgressPermille: number,
): { escaped: boolean; itemSku: string | null; labelVi: string } {
  const score = Math.round((chillReelProgressPermille / 1000) * 100);
  const rng = createRng(seed ^ score);
  const result = resolveMeadowbrookCatch({
    kind: 'fish',
    score,
    hour,
    nowMs,
    rng01: () => rng.next(),
  });
  if (result.escaped) {
    return { escaped: true, itemSku: null, labelVi: result.critterName };
  }
  const itemSku = MEADOWBROOK_FISH_TO_OLW_SKU[result.critterId] ?? 'carp_pond';
  return { escaped: false, itemSku, labelVi: result.critterName };
}

export function creditSharedSku(
  worldId: string,
  items: InventoryEntry[],
  sku: string,
  qty: number,
  nowMs: number,
  ownerScope: InventoryOwnerScope = 'shared',
): InventoryEntry[] {
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === ownerScope && r.itemSku === sku && (r.quality ?? 'normal') === 'normal',
  );
  if (idx >= 0) next[idx] = { ...next[idx]!, qty: next[idx]!.qty + qty };
  else {
    next.push({
      worldId,
      ownerScope,
      itemSku: sku,
      qty,
      quality: 'normal',
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
  return next;
}