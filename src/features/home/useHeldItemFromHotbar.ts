import { useMemo, useState } from 'react';
import { EMPTY_HELD_ITEM, selectHotbarSlot } from '../../shared/interaction/interactionResolver';
import { reconcileHeldItemWithHotbar } from '../../shared/interaction/heldItemIdentity';
import type { HeldItemState, HotbarSlot } from '../../shared/interaction/interactionTypes';

/**
 * Holds player intent (anchor); displayed/synced held item is always reconciled by SKU+quality.
 */
export function useHeldItemFromHotbar(slots: readonly HotbarSlot[]) {
  const [heldAnchor, setHeldAnchor] = useState<HeldItemState>(EMPTY_HELD_ITEM);

  const heldItem = useMemo(
    () => reconcileHeldItemWithHotbar(heldAnchor, slots),
    [heldAnchor, slots],
  );

  const selectSlot = (index: number) => {
    setHeldAnchor((cur) => selectHotbarSlot(slots, cur, index));
  };

  const clearHeld = () => {
    setHeldAnchor(EMPTY_HELD_ITEM);
  };

  return { heldItem, selectSlot, clearHeld };
}