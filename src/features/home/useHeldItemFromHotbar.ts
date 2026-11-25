import { useEffect, useMemo, useState } from 'react';
import { gameEventBus } from '../../game/eventBus';
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

  // Drop stale user intent when the selected stack is depleted (prevents auto-reselect on replenish).
  useEffect(() => {
    if (heldAnchor.itemSku && heldItem.itemKind === 'none') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prune stale anchor when stack depletes
      setHeldAnchor(EMPTY_HELD_ITEM);
    }
  }, [heldAnchor.itemSku, heldItem.itemKind]);

  useEffect(() => {
    return gameEventBus.on('evt:held-water-adjust', ({ level, iconId }) => {
      setHeldAnchor((cur) =>
        cur.itemKind === 'water_pitcher' ? { ...cur, waterFillLevel: level, iconId } : cur,
      );
    });
  }, []);

  useEffect(() => {
    return gameEventBus.on('cmd:select-hotbar-slot', ({ slotIndex }) => {
      setHeldAnchor((cur) => selectHotbarSlot(slots, cur, slotIndex));
    });
  }, [slots]);

  const selectSlot = (index: number) => {
    setHeldAnchor((cur) => selectHotbarSlot(slots, cur, index));
  };

  const clearHeld = () => {
    setHeldAnchor(EMPTY_HELD_ITEM);
  };

  return { heldItem, selectSlot, clearHeld };
}