import { useEffect, useMemo, useState } from 'react';
import { gameAudio } from '../../game/audio/gameAudioManager';
import { gameEventBus } from '../../game/eventBus';
import { EMPTY_HELD_ITEM, selectHotbarSlot } from '../../shared/interaction/interactionResolver';
import { reconcileHeldItemWithHotbar } from '../../shared/interaction/heldItemIdentity';
import type { HeldItemState, HotbarSlot } from '../../shared/interaction/interactionTypes';

const DEFAULT_WATER_FILL_BY_SKU: Record<string, number> = {
  water_pitcher: 100,
  tool_watering_can: 100,
};

/**
 * Holds player intent (anchor); displayed/synced held item is always reconciled by SKU+quality.
 */
export function useHeldItemFromHotbar(slots: readonly HotbarSlot[]) {
  const [heldAnchor, setHeldAnchor] = useState<HeldItemState>(EMPTY_HELD_ITEM);
  const [waterFillBySku, setWaterFillBySku] = useState<Record<string, number>>(
    DEFAULT_WATER_FILL_BY_SKU,
  );

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
    return gameEventBus.on('evt:held-water-adjust', ({ level, iconId, itemSku }) => {
      const clamped = Math.max(0, Math.min(100, Math.round(level)));
      setWaterFillBySku((prev) => {
        const targetSku =
          itemSku ??
          (heldAnchor.itemSku === 'tool_watering_can' ? 'tool_watering_can' : 'water_pitcher');
        return { ...prev, [targetSku]: clamped };
      });
      setHeldAnchor((cur) => {
        const matchesPitcher = cur.itemKind === 'water_pitcher';
        const matchesCan = cur.itemSku === 'tool_watering_can';
        if (!matchesPitcher && !matchesCan) return cur;
        if (itemSku && cur.itemSku && cur.itemSku !== itemSku) return cur;
        return {
          ...cur,
          waterFillLevel: clamped,
          iconId: matchesPitcher ? (iconId ?? (clamped > 0 ? 'water_pitcher_full' : 'water_pitcher_empty')) : cur.iconId,
        };
      });
    });
  }, [heldAnchor.itemSku]);

  useEffect(() => {
    return gameEventBus.on('cmd:select-hotbar-slot', ({ slotIndex }) => {
      setHeldAnchor((cur) => selectHotbarSlot(slots, cur, slotIndex));
    });
  }, [slots]);

  const selectSlot = (index: number) => {
    void gameAudio.unlock();
    gameAudio.playSfx('tool_swap', { volumeScale: 0.65 });
    setHeldAnchor((cur) => selectHotbarSlot(slots, cur, index));
  };

  const clearHeld = () => {
    setHeldAnchor(EMPTY_HELD_ITEM);
  };

  return { heldItem, waterFillBySku, selectSlot, clearHeld };
}