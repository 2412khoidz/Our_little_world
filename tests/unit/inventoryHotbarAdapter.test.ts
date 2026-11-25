import { describe, expect, it } from 'vitest';
import { buildHotbarSlotsFromInventory } from '../../src/shared/interaction/inventoryHotbarAdapter';
import type { InventorySnapshot } from '../../src/shared/inventory/inventoryTypes';

const snapshotBase: InventorySnapshot = {
  worldId: 'w',
  serverNowMs: 1,
  serverDateUtc: '2026-11-25',
  canClaimFreeKibble: false,
  catalog: [
    {
      sku: 'pet_kibble_basic',
      nameVi: 'Hạt mèo',
      descriptionVi: '',
      purpose: 'pet_food',
      stackLimit: 10,
      tradeable: false,
    },
  ],
  items: [{ worldId: 'w', ownerScope: 'shared', itemSku: 'pet_kibble_basic', qty: 3, updatedAt: '' }],
};

describe('inventoryHotbarAdapter', () => {
  it('projects shared inventory without mutating qty', () => {
    const slots = buildHotbarSlotsFromInventory(snapshotBase);
    expect(slots[0]?.itemSku).toBe('pet_kibble_basic');
    expect(slots[0]?.qty).toBe(3);
    expect(slots[0]?.itemKind).toBe('food');
    expect(snapshotBase.items[0]?.qty).toBe(3);
  });

  it('returns empty slots when snapshot missing', () => {
    const slots = buildHotbarSlotsFromInventory(null);
    expect(slots.every((s) => s.qty === 0)).toBe(true);
  });
});