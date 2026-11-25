import { describe, expect, it } from 'vitest';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';
import {
  listFarmPantryRecipes,
  processFarmPantryRecipe,
} from '../../src/shared/farming/farmPantryProcessing';

const WORLD = 'world-test';

function row(sku: string, qty: number): InventoryEntry {
  return {
    worldId: WORLD,
    ownerScope: 'shared',
    itemSku: sku,
    qty,
    quality: 'normal',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('farmPantryProcessing', () => {
  it('lists three V0.2.1 recipes', () => {
    const recipes = listFarmPantryRecipes();
    expect(recipes.map((r) => r.outputSku)).toEqual(['flour', 'strawberry_jam', 'carrot_soup']);
  });

  it('makes flour from wheat', () => {
    const res = processFarmPantryRecipe(WORLD, [row('wheat', 3)], 'flour', Date.now());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.items.find((r) => r.itemSku === 'wheat')?.qty).toBe(1);
    expect(res.items.find((r) => r.itemSku === 'flour')?.qty).toBe(1);
  });

  it('rejects jam without sugar', () => {
    const res = processFarmPantryRecipe(
      WORLD,
      [row('strawberry', 2)],
      'strawberry_jam',
      Date.now(),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('INSUFFICIENT_ITEMS');
  });

  it('makes strawberry jam', () => {
    const res = processFarmPantryRecipe(
      WORLD,
      [row('strawberry', 2), row('sugar_pack', 1)],
      'strawberry_jam',
      Date.now(),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.items.some((r) => r.itemSku === 'strawberry_jam')).toBe(true);
    expect(res.items.some((r) => r.itemSku === 'strawberry')).toBe(false);
  });
});