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

  it('projects catalog propsIconId for farm tools and seeds', () => {
    const snapshot: InventorySnapshot = {
      worldId: 'world-test',
      serverNowMs: 0,
      serverDateUtc: '2026-11-25',
      items: [
        {
          worldId: 'world-test',
          ownerScope: 'shared',
          itemSku: 'tool_hoe',
          qty: 1,
          quality: 'normal',
          updatedAt: '2026-11-25T00:00:00.000Z',
        },
        {
          worldId: 'world-test',
          ownerScope: 'shared',
          itemSku: 'seed_wheat',
          qty: 5,
          quality: 'normal',
          updatedAt: '2026-11-25T00:00:00.000Z',
        },
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
          sku: 'tool_hoe',
          nameVi: 'Cuốc',
          descriptionVi: '',
          purpose: 'ingredient',
          stackLimit: 1,
          tradeable: false,
        },
        {
          sku: 'seed_wheat',
          nameVi: 'Hạt',
          descriptionVi: '',
          purpose: 'seed',
          stackLimit: 99,
          tradeable: false,
        },
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
    const hoe = slots.find((s) => s.itemSku === 'tool_hoe');
    const seed = slots.find((s) => s.itemSku === 'seed_wheat');
    const kibble = slots.find((s) => s.itemSku === PET_KIBBLE_BASIC_SKU);

    expect(hoe?.propsIconId).toBe('prop.planter_box');
    expect(hoe?.iconId).toBeNull();
    expect(seed?.propsIconId).toBe('prop.corn');
    expect(kibble?.iconId).toBe('food_kibble');
    expect(kibble?.propsIconId).toBeNull();
  });
});