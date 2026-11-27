import type { ItemQualityTier } from '../../interaction/hotbarContract';
import {
  cloneInventoryLayout,
  HOTBAR_CAPACITY,
  sameStackRef,
  type InventoryBagCell,
  type InventoryLayoutState,
  type InventoryStackRef,
} from '../../inventory/inventoryLayoutStore';
import type { InventoryOwnerScope } from '../../inventory/inventoryTypes';

/**
 * NUVORA `public/ui.js` clickSlot / quickMove — OLW adaptation.
 * Supports both legacy read-only presentation helpers and full interactive bag + hotbar layout transitions.
 */

export interface NuvoraPickCursor {
  readonly sku: string;
  readonly qty: number;
  readonly labelVi: string;
}

export type NuvoraSlotKind = 'inv' | 'hb';

export interface NuvoraSlotCell {
  readonly sku: string | null;
  readonly qty: number;
  readonly labelVi: string;
}

export interface NuvoraClickResult {
  readonly cursor: NuvoraPickCursor | null;
  /** OLW hotbar authority: select projected slot from inventoryHotbarAdapter. */
  readonly selectHotbarIndex?: number;
}

export interface NuvoraClickOptions {
  readonly rightClick?: boolean;
  readonly shiftKey?: boolean;
  readonly hotbarSlotForSku: (sku: string) => number | null;
}

/** Shift-click quick equip (donor `quickMove` stash-to-hotbar semantics). */
export function nuvoraQuickEquipFromCell(
  cell: NuvoraSlotCell | null,
  hotbarSlotForSku: (sku: string) => number | null,
): NuvoraClickResult {
  if (!cell?.sku) return { cursor: null };
  const idx = hotbarSlotForSku(cell.sku);
  if (idx === null) return { cursor: null };
  return { cursor: null, selectHotbarIndex: idx };
}

/** Legacy read-only helper kept for backwards test compatibility. */
export function nuvoraClickSlotReadOnly(
  cursor: NuvoraPickCursor | null,
  target: { readonly kind: NuvoraSlotKind; readonly index: number; readonly cell: NuvoraSlotCell | null },
  opts: NuvoraClickOptions,
): NuvoraClickResult {
  if (opts.shiftKey && target.cell?.sku) {
    return nuvoraQuickEquipFromCell(target.cell, opts.hotbarSlotForSku);
  }

  if (target.kind === 'hb' && target.cell?.sku) {
    return { cursor, selectHotbarIndex: target.index };
  }

  const s = target.cell;
  const c = cursor;

  if (!c) {
    if (!s?.sku) return { cursor: null };
    if (opts.rightClick && s.qty > 1) {
      return {
        cursor: { sku: s.sku, qty: Math.ceil(s.qty / 2), labelVi: s.labelVi },
      };
    }
    const idx = opts.hotbarSlotForSku(s.sku);
    if (idx !== null) return { cursor: null, selectHotbarIndex: idx };
    return { cursor: { sku: s.sku, qty: s.qty, labelVi: s.labelVi } };
  }

  if (!s?.sku) return { cursor: c };
  if (s.sku === c.sku) {
    const idx = opts.hotbarSlotForSku(s.sku);
    return { cursor: null, selectHotbarIndex: idx ?? undefined };
  }
  return { cursor: c };
}

export type BagScopeTab = 'shared' | 'personal';

export interface InventoryPickedCursor {
  readonly itemSku: string;
  readonly quality: ItemQualityTier;
  readonly ownerScope: InventoryOwnerScope;
  readonly qty: number;
  readonly labelVi: string;
  readonly sourceKind: 'bag' | 'hotbar';
  readonly sourceScope: BagScopeTab;
  readonly sourceIndex: number;
}

export interface InventoryInteractionTransition {
  readonly layout: InventoryLayoutState;
  readonly cursor: InventoryPickedCursor | null;
  readonly selectHotbarIndex?: number;
  readonly inspectRef?: { readonly kind: 'bag' | 'hotbar'; readonly scope: BagScopeTab; readonly index: number };
}

function getBagArray(layout: InventoryLayoutState, scope: BagScopeTab): Array<InventoryBagCell | null> {
  return scope === 'shared' ? layout.sharedCells : layout.personalCells;
}

/** Binds `stack` to a hotbar slot `0..7` (deduplicating any existing binding for the exact same stack). */
export function assignStackToHotbar(
  layout: InventoryLayoutState,
  stack: InventoryStackRef,
  preferredSlotIndex?: number,
): { readonly layout: InventoryLayoutState; readonly slotIndex: number } {
  const next = cloneInventoryLayout(layout);
  const existingIdx = next.hotbarBindings.findIndex((b) => sameStackRef(b, stack));
  let targetIdx =
    preferredSlotIndex !== undefined && preferredSlotIndex >= 0 && preferredSlotIndex < HOTBAR_CAPACITY
      ? preferredSlotIndex
      : existingIdx >= 0
        ? existingIdx
        : next.hotbarBindings.findIndex((b) => b === null);
  if (targetIdx < 0) {
    targetIdx = HOTBAR_CAPACITY - 1;
  }

  for (let i = 0; i < next.hotbarBindings.length; i += 1) {
    if (i !== targetIdx && sameStackRef(next.hotbarBindings[i], stack)) {
      next.hotbarBindings[i] = null;
    }
  }
  next.hotbarBindings[targetIdx] = { ...stack };
  return { layout: { ...next, hotbarCustomized: true }, slotIndex: targetIdx };
}

/** Removes a hotbar binding without altering underlying bag inventory quantities. */
export function clearHotbarBinding(layout: InventoryLayoutState, slotIndex: number): InventoryLayoutState {
  if (slotIndex < 0 || slotIndex >= HOTBAR_CAPACITY) return layout;
  const next = cloneInventoryLayout(layout);
  next.hotbarBindings[slotIndex] = null;
  return { ...next, hotbarCustomized: true };
}

/** Returns any held bag cursor safely back to its origin (or first empty slot), conserving exact quantity. */
export function cancelInventoryCursor(
  layout: InventoryLayoutState,
  cursor: InventoryPickedCursor | null,
): InventoryInteractionTransition {
  if (!cursor) {
    return { layout, cursor: null };
  }
  if (cursor.sourceKind === 'hotbar') {
    return { layout, cursor: null };
  }
  const next = cloneInventoryLayout(layout);
  const bag = getBagArray(next, cursor.sourceScope);
  const origin = bag[cursor.sourceIndex];
  const ref: InventoryStackRef = {
    itemSku: cursor.itemSku,
    quality: cursor.quality,
    ownerScope: cursor.ownerScope,
  };
  if (origin === null) {
    bag[cursor.sourceIndex] = { ...ref, qty: cursor.qty };
  } else if (origin && sameStackRef(origin, ref)) {
    bag[cursor.sourceIndex] = { ...origin, qty: origin.qty + cursor.qty };
  } else {
    const mergeIdx = bag.findIndex((c) => c && sameStackRef(c, ref));
    if (mergeIdx >= 0) {
      const m = bag[mergeIdx]!;
      bag[mergeIdx] = { ...m, qty: m.qty + cursor.qty };
    } else {
      const emptyIdx = bag.findIndex((c) => c === null);
      if (emptyIdx >= 0) {
        bag[emptyIdx] = { ...ref, qty: cursor.qty };
      }
    }
  }
  return { layout: next, cursor: null };
}

/** Splits a stack inside a bag tab into two slots (used by touch "Tách đôi" button). */
export function splitBagSlotInPlace(
  layout: InventoryLayoutState,
  scope: BagScopeTab,
  slotIndex: number,
): InventoryLayoutState {
  const next = cloneInventoryLayout(layout);
  const bag = getBagArray(next, scope);
  const cell = bag[slotIndex];
  if (!cell || cell.qty < 2) return layout;
  const emptyIdx = bag.findIndex((c, idx) => idx !== slotIndex && c === null);
  if (emptyIdx < 0) return layout;
  const keepQty = Math.floor(cell.qty / 2);
  const splitQty = cell.qty - keepQty;
  bag[slotIndex] = { ...cell, qty: keepQty };
  bag[emptyIdx] = {
    itemSku: cell.itemSku,
    quality: cell.quality,
    ownerScope: cell.ownerScope,
    qty: splitQty,
  };
  return next;
}

/**
 * Full Nuvora-style slot interaction reducer supporting pickup, place, swap,
 * compatible merge (same SKU+quality+scope only), split, hotbar assign/swap/unbind, and Escape cancel.
 */
export function applyInventorySlotInteraction(
  layout: InventoryLayoutState,
  cursor: InventoryPickedCursor | null,
  target: {
    readonly kind: 'bag' | 'hotbar';
    readonly scope: BagScopeTab;
    readonly index: number;
  },
  opts: {
    readonly rightClick?: boolean;
    readonly shiftKey?: boolean;
    readonly labelForSku: (sku: string) => string;
    readonly heldHotbarIndex?: number | null;
  },
): InventoryInteractionTransition {
  if (target.kind === 'hotbar') {
    if (target.index < 0 || target.index >= HOTBAR_CAPACITY) {
      return { layout, cursor };
    }
    if (!cursor) {
      if (opts.rightClick) {
        return {
          layout: clearHotbarBinding(layout, target.index),
          cursor: null,
          inspectRef: { kind: 'hotbar', scope: target.scope, index: target.index },
        };
      }
      const bound = layout.hotbarBindings[target.index];
      if (!bound) {
        return {
          layout,
          cursor: null,
          selectHotbarIndex: target.index,
          inspectRef: { kind: 'hotbar', scope: target.scope, index: target.index },
        };
      }
      return {
        layout,
        cursor: null,
        selectHotbarIndex: target.index,
        inspectRef: { kind: 'hotbar', scope: target.scope, index: target.index },
      };
    }

    if (cursor.sourceKind === 'hotbar') {
      const next = cloneInventoryLayout(layout);
      const from = next.hotbarBindings[cursor.sourceIndex] ?? null;
      const to = next.hotbarBindings[target.index] ?? null;
      next.hotbarBindings[target.index] = from;
      next.hotbarBindings[cursor.sourceIndex] = to;
      return {
        layout: { ...next, hotbarCustomized: true },
        cursor: null,
        selectHotbarIndex: target.index,
        inspectRef: { kind: 'hotbar', scope: target.scope, index: target.index },
      };
    }

    // Dropping a bag item onto a hotbar slot binds it cleanly AND returns held qty back to bag.
    const restored = cancelInventoryCursor(layout, cursor);
    const assigned = assignStackToHotbar(
      restored.layout,
      {
        itemSku: cursor.itemSku,
        quality: cursor.quality,
        ownerScope: cursor.ownerScope,
      },
      target.index,
    );
    return {
      layout: assigned.layout,
      cursor: null,
      selectHotbarIndex: assigned.slotIndex,
      inspectRef: { kind: 'hotbar', scope: target.scope, index: assigned.slotIndex },
    };
  }

  // Target is a bag slot (`shared` or `personal`)
  const bagRead = getBagArray(layout, target.scope);
  if (target.index < 0 || target.index >= bagRead.length) {
    return { layout, cursor };
  }
  const cell = bagRead[target.index] ?? null;

  if (!cursor) {
    if (!cell || cell.qty <= 0) {
      return {
        layout,
        cursor: null,
        inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
      };
    }
    if (opts.shiftKey) {
      const preferred =
        opts.heldHotbarIndex !== null && opts.heldHotbarIndex !== undefined
          ? opts.heldHotbarIndex
          : undefined;
      const assigned = assignStackToHotbar(
        layout,
        {
          itemSku: cell.itemSku,
          quality: cell.quality,
          ownerScope: cell.ownerScope,
        },
        preferred,
      );
      return {
        layout: assigned.layout,
        cursor: null,
        selectHotbarIndex: assigned.slotIndex,
        inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
      };
    }
    const next = cloneInventoryLayout(layout);
    const bag = getBagArray(next, target.scope);
    if (opts.rightClick && cell.qty > 1) {
      const pickQty = Math.ceil(cell.qty / 2);
      const remainQty = cell.qty - pickQty;
      bag[target.index] = remainQty > 0 ? { ...cell, qty: remainQty } : null;
      return {
        layout: next,
        cursor: {
          itemSku: cell.itemSku,
          quality: cell.quality,
          ownerScope: cell.ownerScope,
          qty: pickQty,
          labelVi: opts.labelForSku(cell.itemSku),
          sourceKind: 'bag',
          sourceScope: target.scope,
          sourceIndex: target.index,
        },
        inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
      };
    }
    bag[target.index] = null;
    return {
      layout: next,
      cursor: {
        itemSku: cell.itemSku,
        quality: cell.quality,
        ownerScope: cell.ownerScope,
        qty: cell.qty,
        labelVi: opts.labelForSku(cell.itemSku),
        sourceKind: 'bag',
        sourceScope: target.scope,
        sourceIndex: target.index,
      },
      inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
    };
  }

  // Cross-tab drop not permitted client-side (server `/inventory/transfer-quality` owns scope transfers)
  if (cursor.sourceKind === 'bag' && cursor.sourceScope !== target.scope) {
    const restored = cancelInventoryCursor(layout, cursor);
    return {
      layout: restored.layout,
      cursor: null,
      inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
    };
  }

  if (cursor.sourceKind === 'hotbar') {
    if (cell) {
      const assigned = assignStackToHotbar(
        layout,
        { itemSku: cell.itemSku, quality: cell.quality, ownerScope: cell.ownerScope },
        cursor.sourceIndex,
      );
      return {
        layout: assigned.layout,
        cursor: null,
        selectHotbarIndex: assigned.slotIndex,
        inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
      };
    }
    return { layout, cursor: null };
  }

  const next = cloneInventoryLayout(layout);
  const bag = getBagArray(next, target.scope);
  const cursorRef: InventoryStackRef = {
    itemSku: cursor.itemSku,
    quality: cursor.quality,
    ownerScope: cursor.ownerScope,
  };

  // Empty target slot: place all (left) or place 1 (right)
  if (!cell) {
    if (opts.rightClick && cursor.qty > 1) {
      bag[target.index] = { ...cursorRef, qty: 1 };
      return {
        layout: next,
        cursor: { ...cursor, qty: cursor.qty - 1 },
        inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
      };
    }
    bag[target.index] = { ...cursorRef, qty: cursor.qty };
    return {
      layout: next,
      cursor: null,
      inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
    };
  }

  // Compatible stack merge: identical SKU + quality + ownerScope ONLY
  if (sameStackRef(cell, cursorRef)) {
    if (opts.rightClick && cursor.qty > 1) {
      bag[target.index] = { ...cell, qty: cell.qty + 1 };
      return {
        layout: next,
        cursor: { ...cursor, qty: cursor.qty - 1 },
        inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
      };
    }
    bag[target.index] = { ...cell, qty: cell.qty + cursor.qty };
    return {
      layout: next,
      cursor: null,
      inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
    };
  }

  // Incompatible stack (different SKU, quality, or ownerScope): swap!
  bag[target.index] = { ...cursorRef, qty: cursor.qty };
  return {
    layout: next,
    cursor: {
      itemSku: cell.itemSku,
      quality: cell.quality,
      ownerScope: cell.ownerScope,
      qty: cell.qty,
      labelVi: opts.labelForSku(cell.itemSku),
      sourceKind: 'bag',
      sourceScope: target.scope,
      sourceIndex: target.index,
    },
    inspectRef: { kind: 'bag', scope: target.scope, index: target.index },
  };
}

/** Completes drag-and-drop from one slot directly onto another slot cleanly without leaving a held cursor. */
export function applyDirectSlotDrop(
  layout: InventoryLayoutState,
  source: { readonly kind: 'bag' | 'hotbar'; readonly scope: BagScopeTab; readonly index: number },
  dest: { readonly kind: 'bag' | 'hotbar'; readonly scope: BagScopeTab; readonly index: number },
  opts: { readonly labelForSku: (sku: string) => string; readonly heldHotbarIndex?: number | null },
): InventoryInteractionTransition {
  if (source.kind === dest.kind && source.scope === dest.scope && source.index === dest.index) {
    return { layout, cursor: null };
  }
  if (source.kind === 'hotbar' && dest.kind === 'hotbar') {
    const next = cloneInventoryLayout(layout);
    const a = next.hotbarBindings[source.index] ?? null;
    const b = next.hotbarBindings[dest.index] ?? null;
    next.hotbarBindings[dest.index] = a;
    next.hotbarBindings[source.index] = b;
    return { layout: { ...next, hotbarCustomized: true }, cursor: null, selectHotbarIndex: dest.index };
  }
  if (source.kind === 'bag') {
    const picked = applyInventorySlotInteraction(layout, null, source, opts);
    if (!picked.cursor) return picked;
    const placed = applyInventorySlotInteraction(picked.layout, picked.cursor, dest, opts);
    if (!placed.cursor) return placed;
    // Swap displaced item directly back into vacated source bag slot
    const finalLayout = cloneInventoryLayout(placed.layout);
    const bag = getBagArray(finalLayout, source.scope);
    if (bag[source.index] === null) {
      bag[source.index] = {
        itemSku: placed.cursor.itemSku,
        quality: placed.cursor.quality,
        ownerScope: placed.cursor.ownerScope,
        qty: placed.cursor.qty,
      };
      return {
        layout: finalLayout,
        cursor: null,
        selectHotbarIndex: placed.selectHotbarIndex,
        inspectRef: placed.inspectRef,
      };
    }
    return cancelInventoryCursor(placed.layout, placed.cursor);
  }
  return { layout, cursor: null };
}