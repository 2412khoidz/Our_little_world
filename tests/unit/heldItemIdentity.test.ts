import { describe, expect, it } from 'vitest';
import { reconcileHeldItemWithHotbar } from '../../src/shared/interaction/heldItemIdentity';
import { EMPTY_HELD_ITEM, selectHotbarSlot } from '../../src/shared/interaction/interactionResolver';
import type { HotbarSlot } from '../../src/shared/interaction/interactionTypes';

function slot(idx: number, sku: string | null, qty: number): HotbarSlot {
  return {
    slotIndex: idx,
    ownerScope: 'shared',
    itemSku: sku,
    itemKind: sku ? 'food' : 'none',
    iconId: sku ? 'food_kibble' : null,
    labelVi: 'Test',
    qty,
    quality: 'normal',
  };
}

describe('reconcileHeldItemWithHotbar', () => {
  it('retains the personal scope and quality when a stack moves', () => {
    const personal = { ...slot(0, 'pet_kibble_basic', 2), ownerScope: 'user:owner' as const, quality: 'gold' as const };
    const held = selectHotbarSlot([personal], EMPTY_HELD_ITEM, 0);
    const result = reconcileHeldItemWithHotbar(held, [{ ...personal, slotIndex: 1 }]);
    expect(result).toMatchObject({ ownerScope: 'user:owner', quality: 'gold', slotIndex: 1 });
  });

  it('clears held when SKU depleted after refresh', () => {
    const held = selectHotbarSlot([slot(0, 'pet_kibble_basic', 2)], EMPTY_HELD_ITEM, 0);
    const after = reconcileHeldItemWithHotbar(held, [slot(0, null, 0)]);
    expect(after.itemKind).toBe('none');
  });

  it('follows slot compaction when same SKU moves index', () => {
    const held = selectHotbarSlot(
      [slot(0, 'pet_kibble_basic', 3), slot(1, 'fish_salmon_bite', 1)],
      EMPTY_HELD_ITEM,
      0,
    );
    const compacted: HotbarSlot[] = [
      slot(0, 'fish_salmon_bite', 1),
      slot(1, 'pet_kibble_basic', 3),
    ];
    const next = reconcileHeldItemWithHotbar(held, compacted);
    expect(next.itemSku).toBe('pet_kibble_basic');
    expect(next.slotIndex).toBe(1);
  });

  it('does not resurrect selection when the same stack returns later without user input', () => {
    const held = selectHotbarSlot([slot(0, 'pet_kibble_basic', 1)], EMPTY_HELD_ITEM, 0);
    let anchor = held;
    let visible = reconcileHeldItemWithHotbar(anchor, [slot(0, null, 0)]);
    expect(visible.itemKind).toBe('none');
    if (anchor.itemSku && visible.itemKind === 'none') {
      anchor = EMPTY_HELD_ITEM;
    }
    visible = reconcileHeldItemWithHotbar(anchor, [slot(0, 'pet_kibble_basic', 2)]);
    expect(visible.itemKind).toBe('none');
  });

  it('does not show stale SKU when slot index reused for another item', () => {
    const held = selectHotbarSlot([slot(0, 'pet_kibble_basic', 2)], EMPTY_HELD_ITEM, 0);
    const swapped: HotbarSlot[] = [slot(0, 'fish_salmon_bite', 1)];
    const next = reconcileHeldItemWithHotbar(held, swapped);
    expect(next.itemKind).toBe('none');
  });
});