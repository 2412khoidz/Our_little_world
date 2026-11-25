import { describe, expect, it } from 'vitest';
import { propsIconIdForCatalogSku } from '../../src/shared/art/catalogSkuPropsIcon';
import { buildHotbarSlotsFromInventory } from '../../src/shared/interaction/inventoryHotbarAdapter';
import type { InventorySnapshot } from '../../src/shared/inventory/inventoryTypes';
import { PET_KIBBLE_BASIC_SKU } from '../../src/shared/inventory/inventoryRules';

describe('inventoryHotbarAdapter props icons', () => {
  it('maps economy SKUs to props-manifest ids (adapter surfaces when allowlisted)', () => {
    expect(propsIconIdForCatalogSku('tool_hoe')).toBe('prop.planter_box');
    expect(propsIconIdForCatalogSku('seed_wheat')).toBe('prop.corn');
  });

  it('keeps pet food on SVG iconId in hotbar projection', () => {
    const snapshot: InventorySnapshot = {
      worldId: 'world-test',
      serverNowMs: 0,
      serverDateUtc: '2026-11-25',
      items: [
        {
          worldId: 'world-test',
          ownerScope: 'shared',
          itemSku: PET_KIBBLE_BASIC_SKU,
          qty: 3,
          quality: 'normal',
          updatedAt: '2026-11-25T00:00:00.000Z',
        },
      ],
      catalog: [
        {
          sku: PET_KIBBLE_BASIC_SKU,
          nameVi: 'Hạt mèo',
          descriptionVi: '',
          purpose: 'pet_food',
          stackLimit: 99,
          tradeable: false,
        },
      ],
      canClaimFreeKibble: false,
    };

    const slots = buildHotbarSlotsFromInventory(snapshot, 'user-a');
    const kibble = slots.find((s) => s.itemSku === PET_KIBBLE_BASIC_SKU);

    expect(kibble?.iconId).toBe('food_kibble');
    expect(kibble?.propsIconId).toBeNull();
  });
});