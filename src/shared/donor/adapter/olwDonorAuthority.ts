/**
 * Single adapter: donor rules → OLW shared inventory (no second ledger).
 */
import { adjustInventoryQuantity, creditInventoryQuantity, InventoryQuantityError } from '../../inventory/inventoryLedger.mjs';
import type { InventoryEntry, InventoryOwnerScope } from '../../inventory/inventoryTypes';
import {
  collectFinishedCrafts,
  enqueueCraft,
  type InventoryLike,
  type WorkshopBuildingState,
} from '../webfarmville-c420bc2/meadowbrookWorkshopQueue';
import { OLW_MEADOWBROOK_MILL } from '../webfarmville-c420bc2/olwMeadowbrookMill';
import { OLW_HOLLOW_BAKERY } from '../harvest-hollow-9b23e1a/olwHollowBakery';
import {
  MEADOWBROOK_FISH_TO_OLW_SKU,
  previewMeadowbrookCatch,
  resolveMeadowbrookCatch,
} from '../webfarmville-c420bc2/meadowbrookNatureCatch';
import { pickCanvasStreamFish } from '../canvas-games-fishing/streamFishSpecies';
import { resolveCanonicalFishByCritterId } from '../fishing/canonicalFishRegistry';
import type { TidefallFishRarity } from '../tidefall-phaser/tidefallFishCatalog';
import type { DonorFishingSpotId } from '../donorFishingSpots';
import { parseDonorFishingSpot } from '../donorFishingSpots';
import {
  collectHollowCoop,
  emptyHollowCoopState,
  feedHollowCoop,
  type HollowCoopState,
} from '../harvest-hollow-9b23e1a/hollowCoopCycle';
import { createRng, hashSeed } from '../../rng';

export interface DonorWorkshopWorldState {
  mill: WorkshopBuildingState;
  bakery: WorkshopBuildingState;
  coop: HollowCoopState;
  rngSeed: number;
}

export function emptyDonorWorkshopState(seed = 42_019): DonorWorkshopWorldState {
  return {
    mill: { level: 1, queue: [] },
    bakery: { level: 1, queue: [] },
    coop: emptyHollowCoopState(),
    rngSeed: seed,
  };
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
  const next = items.slice();
  const previous = inventoryToMap(items);
  const nowIso = new Date(nowMs).toISOString();
  for (const sku of new Set([...Object.keys(previous), ...Object.keys(map)])) {
    const delta = (map[sku] ?? 0) - (previous[sku] ?? 0);
    if (delta === 0) continue;
    const result = adjustInventoryQuantity(next, worldId, 'shared', sku, delta, nowIso);
    if (!result.ok) throw new InventoryQuantityError(result.code);
  }
  return next;
}

function debitSku(map: InventoryLike, sku: string, qty: number): boolean {
  if ((map[sku] ?? 0) < qty) return false;
  map[sku] = (map[sku] ?? 0) - qty;
  if (map[sku] === 0) delete map[sku];
  return true;
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

export function donorQueueBakeryRecipe(
  world: DonorWorkshopWorldState,
  items: InventoryEntry[],
  worldId: string,
  recipeId: string,
  nowMs: number,
): { world: DonorWorkshopWorldState; items: InventoryEntry[] } {
  const map = inventoryToMap(items);
  const queued = enqueueCraft(world.bakery, OLW_HOLLOW_BAKERY, recipeId, map, nowMs);
  return {
    world: { ...world, bakery: queued.building },
    items: applyMapToSharedInventory(worldId, items, queued.inventory, nowMs),
  };
}

export function donorCollectBakeryQueue(
  world: DonorWorkshopWorldState,
  items: InventoryEntry[],
  worldId: string,
  nowMs: number,
): { world: DonorWorkshopWorldState; items: InventoryEntry[] } {
  const map = inventoryToMap(items);
  const collected = collectFinishedCrafts(world.bakery, OLW_HOLLOW_BAKERY, nowMs, map, () => 0);
  return {
    world: { ...world, bakery: collected.building },
    items: applyMapToSharedInventory(worldId, items, collected.inventory, nowMs),
  };
}

export function donorCoopFeed(
  world: DonorWorkshopWorldState,
  items: InventoryEntry[],
  worldId: string,
  nowMs: number,
): { world: DonorWorkshopWorldState; items: InventoryEntry[] } {
  const map = inventoryToMap(items);
  const feedQty = map.chicken_feed ?? 0;
  const out = feedHollowCoop(world.coop, feedQty, nowMs);
  if (out.error) throw new Error(out.error);
  if (!debitSku(map, 'chicken_feed', out.feedUsed)) throw new Error('NEED_FEED');
  return {
    world: { ...world, coop: out.coop },
    items: applyMapToSharedInventory(worldId, items, map, nowMs),
  };
}

export function donorCoopCollect(
  world: DonorWorkshopWorldState,
  items: InventoryEntry[],
  worldId: string,
  nowMs: number,
): { world: DonorWorkshopWorldState; items: InventoryEntry[]; eggs: number } {
  const collected = collectHollowCoop(world.coop, nowMs);
  if (collected.error) throw new Error(collected.error);
  let nextItems = items;
  if (collected.eggs > 0) {
    nextItems = creditSharedSku(worldId, items, 'donor_egg', collected.eggs, nowMs);
  }
  return { world: { ...world, coop: collected.coop }, items: nextItems, eggs: collected.eggs };
}

export interface DonorFishingPreviewResult {
  readonly critterId: string;
  readonly name: string;
  readonly itemSku: string;
  readonly labelVi: string;
  readonly rarity: TidefallFishRarity;
  readonly spriteUrl: string;
  readonly spotId: DonorFishingSpotId;
}

export interface DonorFishingResolveResult {
  readonly escaped: boolean;
  readonly itemSku: string | null;
  readonly critterId: string;
  readonly labelVi: string;
  readonly rarity: TidefallFishRarity;
  readonly spriteUrl: string;
  readonly qtyGranted: 0 | 1;
  readonly spotId: DonorFishingSpotId;
}

export function donorFishingPreview(
  seed: number,
  nowMs: number,
  hour: number,
  spotRaw: unknown,
): DonorFishingPreviewResult {
  const spotId = parseDonorFishingSpot(spotRaw);
  const rng = createRng(seed);
  if (spotId === 'east_stream') {
    const fish = pickCanvasStreamFish(() => rng.next(), 0.55);
    const canonical = resolveCanonicalFishByCritterId(fish.id);
    return {
      critterId: fish.id,
      name: fish.name,
      itemSku: fish.olwSku || canonical.sku,
      labelVi: canonical.labelVi,
      rarity: canonical.rarity,
      spriteUrl: canonical.spriteUrl,
      spotId,
    };
  }
  const def = previewMeadowbrookCatch({
    kind: 'fish',
    hour,
    nowMs,
    rng01: () => rng.next(),
  });
  const canonical = resolveCanonicalFishByCritterId(def.id);
  const itemSku = MEADOWBROOK_FISH_TO_OLW_SKU[def.id] ?? canonical.sku;
  return {
    critterId: def.id,
    name: def.name,
    itemSku,
    labelVi: canonical.labelVi,
    rarity: canonical.rarity,
    spriteUrl: canonical.spriteUrl,
    spotId,
  };
}

export function donorFishingResolve(
  seed: number,
  nowMs: number,
  hour: number,
  progressPermille: number,
  spotRaw: unknown,
  lockedEncounter?: Partial<DonorFishingPreviewResult>,
): DonorFishingResolveResult {
  const rolled = donorFishingPreview(seed, nowMs, hour, spotRaw);
  const spotId = rolled.spotId;
  const enc: DonorFishingPreviewResult =
    lockedEncounter?.critterId && lockedEncounter.itemSku
      ? {
          critterId: lockedEncounter.critterId,
          name: lockedEncounter.name ?? rolled.name,
          itemSku: lockedEncounter.itemSku,
          labelVi: lockedEncounter.labelVi ?? rolled.labelVi,
          rarity: lockedEncounter.rarity ?? rolled.rarity,
          spriteUrl: lockedEncounter.spriteUrl ?? rolled.spriteUrl,
          spotId,
        }
      : rolled;

  // Authoritative reel completion gate: winning reel (>= 700 permille) always lands the exact hooked fish.
  const score = Math.round((Number(progressPermille) / 1000) * 100);
  const escaped = !Number.isFinite(progressPermille) || progressPermille < 700 || score < 55;
  if (escaped) {
    // Call resolveMeadowbrookCatch purely for contract awareness? No — preview & resolve must stay 1:1.
    void resolveMeadowbrookCatch;
    return {
      escaped: true,
      itemSku: null,
      critterId: enc.critterId,
      labelVi: enc.labelVi,
      rarity: enc.rarity,
      spriteUrl: enc.spriteUrl,
      qtyGranted: 0,
      spotId,
    };
  }
  return {
    escaped: false,
    itemSku: enc.itemSku,
    critterId: enc.critterId,
    labelVi: enc.labelVi,
    rarity: enc.rarity,
    spriteUrl: enc.spriteUrl,
    qtyGranted: 1,
    spotId,
  };
}

export function creditSharedSku(
  worldId: string,
  items: InventoryEntry[],
  sku: string,
  qty: number,
  nowMs: number,
  ownerScope: InventoryOwnerScope = 'shared',
): InventoryEntry[] {
  return creditInventoryQuantity(items, worldId, ownerScope, sku, qty, new Date(nowMs).toISOString());
}
