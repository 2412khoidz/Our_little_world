import { describe, expect, it } from 'vitest';
import {
  INVENTORY_HOTBAR_ADAPTER_IMPLEMENTATION,
  MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST,
  buildHotbarSlotsFromInventory,
} from '../../src/shared/interaction/inventoryHotbarAdapter';
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

  it('keeps scope and quality distinct and excludes other personal inventory', () => {
    const row = snapshotBase.items[0]!;
    const slots = buildHotbarSlotsFromInventory({
      ...snapshotBase,
      items: [
        { ...row, ownerScope: 'shared', quality: 'normal', qty: 2 },
        { ...row, ownerScope: 'shared', quality: 'gold', qty: 1 },
        { ...row, ownerScope: 'user:owner', quality: 'normal', qty: 4 },
        { ...row, ownerScope: 'user:other', quality: 'normal', qty: 5 },
      ],
    }, 'owner').filter((slot) => slot.qty > 0);
    expect(slots.map(({ ownerScope, quality, qty }) => ({ ownerScope, quality, qty }))).toEqual([
      { ownerScope: 'shared', quality: 'gold', qty: 1 },
      { ownerScope: 'shared', quality: 'normal', qty: 2 },
      { ownerScope: 'user:owner', quality: 'normal', qty: 4 },
    ]);
  });

  it('returns empty slots when snapshot missing', () => {
    const slots = buildHotbarSlotsFromInventory(null);
    expect(slots.every((s) => s.qty === 0)).toBe(true);
  });

  it('documents v015 adapter and initial allowlist length', () => {
    expect(INVENTORY_HOTBAR_ADAPTER_IMPLEMENTATION).toBe('quality-scoped-food-projection');
    expect(MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST).toHaveLength(11);
  });
});