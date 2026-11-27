import type { ItemQualityTier } from '../interaction/hotbarContract';
import { MAIN_GAME_HOTBAR_SLOT_PRIORITY } from '../interaction/hotbarContract';
import { MAX_INVENTORY_QUANTITY } from './inventoryLedger.mjs';
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

export function bagPageSize(scope: 'shared' | 'personal'): number {
  return scope === 'shared' ? SHARED_BAG_CAPACITY : PERSONAL_BAG_CAPACITY;
}

/** Very large holdings use bulk cells to keep the number of slots bounded per stack key. */
export function inventoryCellLimit(catalogLimit: number | undefined, total: number, pageSize: number): number {
  const preferred = catalogLimit && Number.isSafeInteger(catalogLimit) && catalogLimit > 0
    ? catalogLimit : MAX_INVENTORY_QUANTITY;
  return Math.max(preferred, Math.ceil(total / pageSize));
}

export function findOpenBagCell(
  cells: Array<InventoryBagCell | null>,
  pageSize: number,
  preferredStart = 0,
): number {
  const onPage = cells.findIndex((cell, index) =>
    index >= preferredStart && index < preferredStart + pageSize && cell === null,
  );
  if (onPage >= 0) return onPage;
  const otherPage = cells.indexOf(null);
  if (otherPage >= 0) return otherPage;
  const index = cells.length;
  for (let i = 0; i < pageSize; i += 1) cells.push(null);
  return index;
}

function reconcileBagCells(
  prevCells: ReadonlyArray<InventoryBagCell | null>,
  pageSize: number,
  authoritativeStacks: ReadonlyMap<string, InventoryBagCell>,
  stackLimits: ReadonlyMap<string, number>,
  reserved: InventoryBagCell | null,
): Array<InventoryBagCell | null> {
  const remaining = new Map<string, number>();
  const cellLimits = new Map<string, number>();
  for (const [key, cell] of authoritativeStacks) {
    remaining.set(key, cell.qty);
    cellLimits.set(key, inventoryCellLimit(stackLimits.get(cell.itemSku), cell.qty, pageSize));
  }
  if (reserved) {
    const key = stackKeyId(reserved);
    if (remaining.has(key)) remaining.set(key, remaining.get(key)! - reserved.qty);
  }

  const length = Math.max(pageSize, Math.ceil(prevCells.length / pageSize) * pageSize);
  const cells: Array<InventoryBagCell | null> = Array.from({ length }, (_, index) => {
    const cell = prevCells[index];
    if (!cell || !Number.isSafeInteger(cell.qty) || cell.qty <= 0) return null;
    const key = stackKeyId(cell);
    const balance = remaining.get(key) ?? 0;
    if (balance <= 0) return null;
    const qty = Math.min(cell.qty, balance, cellLimits.get(key)!);
    remaining.set(key, balance - qty);
    return { ...authoritativeStacks.get(key)!, qty };
  });

  for (const [index, cell] of cells.entries()) {
    if (!cell) continue;
    const key = stackKeyId(cell);
    const balance = remaining.get(key) ?? 0;
    const limit = cellLimits.get(key)!;
    const extra = Math.min(balance, limit - cell.qty);
    if (extra <= 0) continue;
    cells[index] = { ...cell, qty: cell.qty + extra };
    remaining.set(key, balance - extra);
  }

  let openIndex = 0;
  for (const [key, balance] of remaining) {
    if (balance <= 0) continue;
    const stack = authoritativeStacks.get(key)!;
    const limit = cellLimits.get(key)!;
    for (let qtyLeft = balance; qtyLeft > 0;) {
      while (openIndex < cells.length && cells[openIndex] !== null) openIndex += 1;
      if (openIndex === cells.length) {
        for (let i = 0; i < pageSize; i += 1) cells.push(null);
      }
      const qty = Math.min(qtyLeft, limit);
      cells[openIndex] = { ...stack, qty };
      qtyLeft -= qty;
    }
  }
  return cells;
}

export function reconcileInventoryLayout(
  prev: InventoryLayoutState | null,
  snapshot: InventorySnapshot | null,
  localUserId: string,
): InventoryLayoutState {
  return reconcileInventoryInteraction<InventoryBagCell>(prev, null, snapshot, localUserId).layout;
}

export function reconcileInventoryInteraction<Cursor extends InventoryBagCell>(
  prev: InventoryLayoutState | null,
  cursor: Cursor | null,
  snapshot: InventorySnapshot | null,
  localUserId: string,
): { layout: InventoryLayoutState; cursor: Cursor | null } {
  const base = prev ?? emptyInventoryLayout();
  if (!snapshot) return { layout: base, cursor: null };

  const personalScope: InventoryOwnerScope = `user:${localUserId}`;
  const sharedTotals = new Map<string, InventoryBagCell>();
  const personalTotals = new Map<string, InventoryBagCell>();
  const allTotals = new Map<string, InventoryBagCell>();

  for (const row of snapshot.items) {
    if (row.worldId !== snapshot.worldId || !Number.isSafeInteger(row.qty) || row.qty <= 0) continue;
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
    targetMap.set(key, { ...ref, qty: nextQty });
    allTotals.set(key, { ...ref, qty: nextQty });
  }

  const stackLimits = new Map(snapshot.catalog.map((item) => [item.sku, item.stackLimit]));
  const heldQty = cursor ? Math.min(
    cursor.qty,
    allTotals.get(stackKeyId(cursor))?.qty ?? 0,
  ) : 0;
  const held = cursor && heldQty > 0 ? { ...cursor, qty: heldQty } : null;
  const sharedCells = reconcileBagCells(base.sharedCells, SHARED_BAG_CAPACITY, sharedTotals, stackLimits, held);
  const personalCells = reconcileBagCells(base.personalCells, PERSONAL_BAG_CAPACITY, personalTotals, stackLimits, held);

  const hotbarBindings: Array<InventoryStackRef | null> = Array.from(
    { length: HOTBAR_CAPACITY },
    (_, i) => {
      const bound = base.hotbarBindings[i];
      if (!bound) return null;
      const entry = allTotals.get(stackKeyId(bound));
      return entry && entry.qty > 0 ? bound : null;
    },
  );

  if (!base.hotbarCustomized) {
    const priorityIdx = new Map<string, number>(
      MAIN_GAME_HOTBAR_SLOT_PRIORITY.map((sku, idx) => [sku, idx]),
    );
    const ordered = [...allTotals.values()]
      .filter((entry) => priorityIdx.has(entry.itemSku))
      .sort((a, b) => {
        const pa = priorityIdx.get(a.itemSku) ?? 999;
        const pb = priorityIdx.get(b.itemSku) ?? 999;
        if (pa !== pb) return pa - pb;
        return (
          a.ownerScope.localeCompare(b.ownerScope) ||
          a.quality.localeCompare(b.quality)
        );
      });
    const usedKeys = new Set<string>(
      hotbarBindings.filter((b): b is InventoryStackRef => b !== null).map(stackKeyId),
    );
    for (const entry of ordered) {
      const k = stackKeyId(entry);
      if (usedKeys.has(k)) continue;
      const freeSlot = hotbarBindings.findIndex((b) => b === null);
      if (freeSlot < 0) break;
      hotbarBindings[freeSlot] = { itemSku: entry.itemSku, quality: entry.quality, ownerScope: entry.ownerScope };
      usedKeys.add(k);
    }
  }

  return {
    layout: { sharedCells, personalCells, hotbarBindings, hotbarCustomized: base.hotbarCustomized },
    cursor: held,
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
      sharedCells: parsed.sharedCells,
      personalCells: parsed.personalCells,
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
