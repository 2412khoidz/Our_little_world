import type { InventoryOwnerScope } from '../inventory/inventoryTypes';
import { EMPTY_HELD_ITEM, selectHotbarSlot } from './interactionResolver';
import type { HeldItemState, HotbarSlot } from './interactionTypes';

export type ItemQualityTier = 'normal' | 'silver' | 'gold';

/** Authoritative stack identity (Mission 02). V0.1.5 adapter uses shared + normal only. */
export interface HotbarStackKey {
  ownerScope: InventoryOwnerScope;
  itemSku: string;
  quality: ItemQualityTier;
}

export function hotbarStackKeyFromHeld(
  held: HeldItemState,
  ownerScope: InventoryOwnerScope = 'shared',
): HotbarStackKey | null {
  if (!held.itemSku) return null;
  return {
    ownerScope: held.ownerScope ?? ownerScope,
    itemSku: held.itemSku,
    quality: held.quality ?? 'normal',
  };
}

export function hotbarStackKeyFromSlot(slot: HotbarSlot): HotbarStackKey | null {
  if (!slot.itemSku || slot.qty <= 0) return null;
  return {
    ownerScope: slot.ownerScope ?? 'shared',
    itemSku: slot.itemSku,
    quality: slot.quality ?? 'normal',
  };
}

function stackKeysEqual(a: HotbarStackKey, b: HotbarStackKey): boolean {
  return a.ownerScope === b.ownerScope && a.itemSku === b.itemSku && a.quality === b.quality;
}

/**
 * Reconcile held presentation with latest hotbar projection (SKU + quality identity).
 * - Clears when stack depleted.
 * - Follows slot compaction when the same stack moved to another slot index.
 * - Refreshes qty/label from the slot; never keeps a stale SKU at the old index.
 */
export function reconcileHeldItemWithHotbar(
  held: HeldItemState,
  slots: readonly HotbarSlot[],
  ownerScope: InventoryOwnerScope = 'shared',
): HeldItemState {
  const key = hotbarStackKeyFromHeld(held, ownerScope);
  if (!key) return EMPTY_HELD_ITEM;

  const match = slots.find((s) => {
    const slotKey = hotbarStackKeyFromSlot(s);
    return slotKey && stackKeysEqual(key, slotKey);
  });

  if (!match || match.qty <= 0) {
    return EMPTY_HELD_ITEM;
  }

  if (held.slotIndex === match.slotIndex && held.itemSku === match.itemSku && held.quality === (match.quality ?? 'normal')) {
    return held;
  }

  const fromSlot = selectHotbarSlot(slots, EMPTY_HELD_ITEM, match.slotIndex);
  return {
    ...fromSlot,
    quality: match.quality ?? 'normal',
  };
}