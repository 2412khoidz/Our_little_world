import type { ItemQualityTier } from '../interaction/hotbarContract';
import { MAIN_GAME_HOTBAR_SLOT_PRIORITY } from '../interaction/hotbarContract';
import type { InventoryOwnerScope, InventorySnapshot } from './inventoryTypes';

export const SHARED_BAG_CAPACITY = 36;
export const PERSONAL_BAG_CAPACITY = 18;
export const HOTBAR_CAPACITY = 8;

export interface InventoryStackRef {
  readonly itemSku: string;
  readonly quality: ItemQualityTier;
  readonly ownerScope: InventoryOwnerScope;
}

export interface InventoryBagCell extends InventoryStackRef {
  readonly qty: number;
}

export interface InventoryLayoutState {
  readonly sharedCells: Array<InventoryBagCell | null>;
  readonly personalCells: Array<InventoryBagCell | null>;
  readonly hotbarBindings: Array<InventoryStackRef | null>;
  readonly hotbarCustomized: boolean;
}

export function normalizeQuality(raw: string | undefined): ItemQualityTier {
  if (raw === 'silver' || raw === 'gold') return raw;
  return 'normal';
}

export function stackKeyId(ref: InventoryStackRef): string {
  return `${ref.ownerScope}|${ref.itemSku}|${ref.quality}`;
}

export function sameStackRef(
  a: InventoryStackRef | null | undefined,
  b: InventoryStackRef | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.ownerScope === b.ownerScope &&
    a.itemSku === b.itemSku &&
    a.quality === b.quality
  );
}

export function emptyInventoryLayout(): InventoryLayoutState {
  return {
    sharedCells: Array.from({ length: SHARED_BAG_CAPACITY }, () => null),
    personalCells: Array.from({ length: PERSONAL_BAG_CAPACITY }, () => null),
    hotbarBindings: Array.from({ length: HOTBAR_CAPACITY }, () => null),
    hotbarCustomized: false,
  };
}

export function cloneInventoryLayout(layout: InventoryLayoutState): InventoryLayoutState {
  return {
    sharedCells: layout.sharedCells.map((c) => (c ? { ...c } : null)),
    personalCells: layout.personalCells.map((c) => (c ? { ...c } : null)),
    hotbarBindings: layout.hotbarBindings.map((b) => (b ? { ...b } : null)),
    hotbarCustomized: layout.hotbarCustomized,
  };
}

function reconcileBagCells(
  prevCells: ReadonlyArray<InventoryBagCell | null>,
  capacity: number,
  authoritativeStacks: ReadonlyMap<string, { ref: InventoryStackRef; qty: number }>,
): Array<InventoryBagCell | null> {
  const cells: Array<InventoryBagCell | null> = Array.from({ length: capacity }, (_, i) => {
    const existing = prevCells[i];
    if (!existing || existing.qty <= 0) return null;
    const key = stackKeyId(existing);
    if (!authoritativeStacks.has(key)) return null;
    return { ...existing };
  });

  // Track present totals per stack after pruning missing stacks
  for (const [key, { ref, qty: authQty }] of authoritativeStacks.entries()) {
    const indices: number[] = [];
    let currentSum = 0;
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      if (cell && stackKeyId(cell) === key) {
        indices.push(i);
        currentSum += cell.qty;
      }
    }

    if (currentSum > authQty) {
      let excess = currentSum - authQty;
      for (let k = indices.length - 1; k >= 0 && excess > 0; k -= 1) {
        const idx = indices[k]!;
        const cell = cells[idx]!;
        if (cell.qty <= excess) {
          excess -= cell.qty;
          cells[idx] = null;
        } else {
          cells[idx] = { ...cell, qty: cell.qty - excess };
          excess = 0;
        }
      }
    } else if (currentSum < authQty) {
      const delta = authQty - currentSum;
      if (indices.length > 0) {
        const firstIdx = indices[0]!;
        const firstCell = cells[firstIdx]!;
        cells[firstIdx] = { ...firstCell, qty: firstCell.qty + delta };
      } else {
        const emptyIdx = cells.findIndex((c) => c === null);
        if (emptyIdx >= 0) {
          cells[emptyIdx] = { ...ref, qty: authQty };
        }
      }
    }
  }

  return cells;
}

/**
 * Projects server `InventorySnapshot` onto persisted slot positions & hotbar bindings.
 * Guarantee: Server snapshot remains single quantity authority — sums across bag slots
 * always equal authoritative quantities without minting or dropping items.
 */
export function reconcileInventoryLayout(
  prev: InventoryLayoutState | null,
  snapshot: InventorySnapshot | null,
  localUserId: string,
): InventoryLayoutState {
  const base = prev ? cloneInventoryLayout(prev) : emptyInventoryLayout();
  if (!snapshot) {
    return base;
  }

  const personalScope: InventoryOwnerScope = `user:${localUserId}`;
  const sharedTotals = new Map<string, { ref: InventoryStackRef; qty: number }>();
  const personalTotals = new Map<string, { ref: InventoryStackRef; qty: number }>();
  const allTotals = new Map<string, { ref: InventoryStackRef; qty: number }>();

  for (const row of snapshot.items) {
    if (row.qty <= 0) continue;
    if (row.ownerScope !== 'shared' && row.ownerScope !== personalScope) continue;
    const quality = normalizeQuality(row.quality);
    const ref: InventoryStackRef = {
      itemSku: row.itemSku,
      quality,
      ownerScope: row.ownerScope,
    };
    const key = stackKeyId(ref);
    const targetMap = row.ownerScope === 'shared' ? sharedTotals : personalTotals;
    const existing = targetMap.get(key);
    const nextQty = (existing?.qty ?? 0) + row.qty;
    targetMap.set(key, { ref, qty: nextQty });
    allTotals.set(key, { ref, qty: nextQty });
  }

  const sharedCells = reconcileBagCells(base.sharedCells, SHARED_BAG_CAPACITY, sharedTotals);
  const personalCells = reconcileBagCells(base.personalCells, PERSONAL_BAG_CAPACITY, personalTotals);

  const hotbarBindings: Array<InventoryStackRef | null> = Array.from(
    { length: HOTBAR_CAPACITY },
    (_, i) => {
      const bound = base.hotbarBindings[i];
      if (!bound) return null;
      const entry = allTotals.get(stackKeyId(bound));
      return entry && entry.qty > 0 ? { ...entry.ref } : null;
    },
  );

  if (!base.hotbarCustomized) {
    const priorityIdx = new Map<string, number>(
      MAIN_GAME_HOTBAR_SLOT_PRIORITY.map((sku, idx) => [sku, idx]),
    );
    const ordered = [...allTotals.values()]
      .filter((entry) => priorityIdx.has(entry.ref.itemSku))
      .sort((a, b) => {
        const pa = priorityIdx.get(a.ref.itemSku) ?? 999;
        const pb = priorityIdx.get(b.ref.itemSku) ?? 999;
        if (pa !== pb) return pa - pb;
        return (
          a.ref.ownerScope.localeCompare(b.ref.ownerScope) ||
          a.ref.quality.localeCompare(b.ref.quality)
        );
      });
    const usedKeys = new Set<string>(
      hotbarBindings.filter((b): b is InventoryStackRef => b !== null).map(stackKeyId),
    );
    for (const entry of ordered) {
      const k = stackKeyId(entry.ref);
      if (usedKeys.has(k)) continue;
      const freeSlot = hotbarBindings.findIndex((b) => b === null);
      if (freeSlot < 0) break;
      hotbarBindings[freeSlot] = { ...entry.ref };
      usedKeys.add(k);
    }
  }

  return {
    sharedCells,
    personalCells,
    hotbarBindings,
    hotbarCustomized: base.hotbarCustomized,
  };
}

function layoutStorageKey(worldId: string, userId: string): string {
  return `olw_inv_layout_v2:${worldId}:${userId}`;
}

export function loadInventoryLayout(worldId: string, userId: string): InventoryLayoutState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(layoutStorageKey(worldId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InventoryLayoutState>;
    if (!Array.isArray(parsed.sharedCells) || !Array.isArray(parsed.personalCells) || !Array.isArray(parsed.hotbarBindings)) {
      return null;
    }
    return {
      sharedCells: parsed.sharedCells.slice(0, SHARED_BAG_CAPACITY),
      personalCells: parsed.personalCells.slice(0, PERSONAL_BAG_CAPACITY),
      hotbarBindings: parsed.hotbarBindings.slice(0, HOTBAR_CAPACITY),
      hotbarCustomized: Boolean(parsed.hotbarCustomized),
    };
  } catch {
    return null;
  }
}

export function saveInventoryLayout(
  worldId: string,
  userId: string,
  layout: InventoryLayoutState,
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(layoutStorageKey(worldId, userId), JSON.stringify(layout));
  } catch {
    /* ignore storage quota */
  }
}
