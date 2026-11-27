import { describe, expect, it } from 'vitest';
import { EMPTY_HELD_ITEM, resolveContextualActions } from '../../src/shared/interaction/interactionResolver';
import { buildMainGameInteractables } from '../../src/shared/interaction/mainGameInteractables';
import type { HeldItemState } from '../../src/shared/interaction/interactionTypes';
import type { FurniturePlacement } from '../../src/shared/types';

describe('Mobile interactables & touch-friendly primary action resolution', () => {
  const samplePlacements: FurniturePlacement[] = [
    {
      id: 'bed-1',
      worldId: 'w1',
      mapId: 'home',
      sku: 'bed_cozy',
      layerSlot: 'object',
      tileX: 1,
      tileY: 3,
      widthTiles: 2,
      heightTiles: 2,
      updatedBy: 'u1',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'sofa-1',
      worldId: 'w1',
      mapId: 'home',
      sku: 'sofa_cream',
      layerSlot: 'object',
      tileX: 5,
      tileY: 5,
      widthTiles: 2,
      heightTiles: 1,
      updatedBy: 'u1',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('centers 2x2 bed and 2x1 sofa interactables on their true tile footprint with comfortable reach', () => {
    const targets = buildMainGameInteractables({
      mapId: 'home',
      placements: samplePlacements,
      petWorldPosition: null,
      petVisible: false,
      mailboxUnread: 0,
    });
    const bed = targets.find((t) => t.kind === 'bed');
    const sofa = targets.find((t) => t.kind === 'sofa');

    expect(bed).toBeDefined();
    expect(bed?.x).toBe(32); // (1 + 2/2) * 16
    expect(bed?.y).toBe(64); // (3 + 2/2) * 16
    expect(bed?.maxRadiusPx).toBe(52);

    expect(sofa).toBeDefined();
    expect(sofa?.x).toBe(96); // (5 + 2/2) * 16
    expect(sofa?.y).toBe(88); // (5 + 1/2) * 16
    expect(sofa?.maxRadiusPx).toBe(48);

    // Standing just south-right of the sofa still resolves sit_sofa as primary action.
    const sofaRes = resolveContextualActions({
      playerX: 118,
      playerY: 112,
      facing: 'up',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
    });
    expect(sofaRes.primary?.code).toBe('sit_sofa');
    expect(sofaRes.primary?.available).toBe(true);

    // Standing beside the bed resolves lie_bed as primary action.
    const bedRes = resolveContextualActions({
      playerX: 56,
      playerY: 72,
      facing: 'left',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
    });
    expect(bedRes.primary?.code).toBe('lie_bed');
    expect(bedRes.primary?.available).toBe(true);
  });

  it('offers 3D Pet Care (enter_pet_care) near cat even when holding a farm/fishing tool', () => {
    const heldHoe: HeldItemState = {
      slotIndex: 0,
      itemSku: 'tool_hoe',
      itemKind: 'tool',
      iconId: null,
      propsIconId: 'tool_hoe',
      labelVi: 'Cuốc đất',
      waterFillLevel: 0,
      quality: 'normal',
      temporaryActionState: 'none',
    };
    const heldFood: HeldItemState = {
      slotIndex: 1,
      itemSku: 'pet_kibble_basic',
      itemKind: 'food',
      iconId: 'food_kibble',
      labelVi: 'Hạt mèo',
      waterFillLevel: 0,
      quality: 'normal',
      temporaryActionState: 'none',
    };
    const heldToy: HeldItemState = {
      slotIndex: 2,
      itemSku: 'toy_yarn',
      itemKind: 'toy',
      iconId: 'yarn_ball',
      labelVi: 'Cuộn len',
      waterFillLevel: 0,
      quality: 'normal',
      temporaryActionState: 'none',
    };

    const targets = buildMainGameInteractables({
      mapId: 'garden',
      placements: [],
      petWorldPosition: { x: 140, y: 110 },
      petVisible: true,
      mailboxUnread: 0,
    });

    const withHoe = resolveContextualActions({
      playerX: 130,
      playerY: 110,
      facing: 'right',
      heldItem: heldHoe,
      interactables: targets,
    });
    expect(withHoe.primary?.code).toBe('enter_pet_care');
    expect(withHoe.primary?.labelVi).toContain('3D');
    expect(withHoe.secondary?.code).toBe('put_away_held');

    const withFood = resolveContextualActions({
      playerX: 130,
      playerY: 110,
      facing: 'right',
      heldItem: heldFood,
      interactables: targets,
    });
    expect(withFood.primary?.code).toBe('offer_food_pet');

    const withToy = resolveContextualActions({
      playerX: 130,
      playerY: 110,
      facing: 'right',
      heldItem: heldToy,
      interactables: targets,
    });
    expect(withToy.primary?.code).toBe('roll_toy');

    // Standing beside a farm plot while holding farming tools or seeds prioritizes the plot over the cat.
    const withFarmPlotAndCat = resolveContextualActions({
      playerX: 88,
      playerY: 110,
      facing: 'right',
      heldItem: heldHoe,
      interactables: [
        {
          id: 'pet:cat',
          kind: 'pet',
          labelVi: 'Quýt',
          x: 90,
          y: 112,
          maxRadiusPx: 76,
        },
        {
          id: 'plot:12',
          kind: 'crop_plot',
          labelVi: 'Ô ruộng 12',
          x: 104,
          y: 112,
          maxRadiusPx: 32,
        },
      ],
    });
    expect(withFarmPlotAndCat.primary?.targetId).toBe('plot:12');
    expect(withFarmPlotAndCat.primary?.code).toBe('till_plot');
  });
});
