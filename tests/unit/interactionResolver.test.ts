import { describe, expect, it } from 'vitest';
import {
  EMPTY_HELD_ITEM,
  isEditableInputTarget,
  resolveContextualActions,
  selectHotbarSlot,
} from '../../src/shared/interaction/interactionResolver';
import type { HotbarSlot, InteractableTarget } from '../../src/shared/interaction/interactionTypes';

describe('Unified Contextual Interaction Resolver (M3)', () => {
  const sampleSlots: HotbarSlot[] = [
    {
      slotIndex: 0,
      itemSku: 'pet_kibble_basic',
      itemKind: 'food',
      iconId: 'food_kibble',
      labelVi: 'Hạt mèo',
      qty: 3,
      quality: 'normal',
    },
    {
      slotIndex: 1,
      itemSku: 'water_pitcher',
      itemKind: 'water_pitcher',
      iconId: 'water_pitcher_full',
      labelVi: 'Bình nước',
      qty: 1,
      waterFillLevel: 100,
    },
  ];

  it('selecting a hotbar slot never mutates quantities and toggles cleanly to empty hands', () => {
    const heldFood = selectHotbarSlot(sampleSlots, EMPTY_HELD_ITEM, 0);
    expect(heldFood.itemKind).toBe('food');
    expect(heldFood.itemSku).toBe('pet_kibble_basic');
    expect(sampleSlots[0]!.qty).toBe(3);

    const dropped = selectHotbarSlot(sampleSlots, heldFood, 0);
    expect(dropped.itemKind).toBe('none');
  });

  it('prioritizes object in facing direction and adapts primary [J] action by held item', () => {
    const nearby: InteractableTarget[] = [
      { id: 'cat', kind: 'pet', labelVi: 'Quýt', x: 112, y: 100, maxRadiusPx: 36 },
      { id: 'bowl', kind: 'food_bowl', labelVi: 'Bát ăn', x: 96, y: 100, maxRadiusPx: 36, empty: true },
    ];

    const heldFood = selectHotbarSlot(sampleSlots, EMPTY_HELD_ITEM, 0);
    // Facing right at (100, 100) puts 'cat' at x=112 ahead of 'bowl' at x=96
    const resCat = resolveContextualActions({
      playerX: 100,
      playerY: 100,
      facing: 'right',
      heldItem: heldFood,
      interactables: nearby,
    });
    expect(resCat.primary?.code).toBe('offer_food_pet');
    expect(resCat.targetId).toBe('cat');

    // Empty hands near cat selects physical petting rather than opening a stat dashboard
    const resPet = resolveContextualActions({
      playerX: 100,
      playerY: 100,
      facing: 'right',
      heldItem: EMPTY_HELD_ITEM,
      interactables: nearby,
    });
    expect(resPet.primary?.code).toBe('enter_pet_care');
  });

  it('suppresses gameplay hotkeys when user types inside editable elements', () => {
    expect(isEditableInputTarget({ tagName: 'TEXTAREA', isContentEditable: false } as unknown as EventTarget)).toBe(true);
    expect(isEditableInputTarget({ tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget)).toBe(true);
    expect(isEditableInputTarget({ tagName: 'CANVAS', isContentEditable: false } as unknown as EventTarget)).toBe(false);
  });
});
