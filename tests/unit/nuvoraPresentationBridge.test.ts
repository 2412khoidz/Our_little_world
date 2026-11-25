import { describe, expect, it } from 'vitest';
import { inventoryRowsToNuvoraGrid, nuvoraHotbarIndexFromHeld } from '../../src/shared/donor/nuvora/nuvoraPresentationBridge';

describe('nuvoraPresentationBridge', () => {
  it('fills grid cells from inventory rows without mutating qty', () => {
    const grid = inventoryRowsToNuvoraGrid(
      [
        { itemSku: 'tool_hoe', qty: 1 },
        { itemSku: 'seed_wheat', qty: 5 },
      ],
      (sku) => (sku === 'tool_hoe' ? 'Cuốc' : 'Hạt lúa'),
      9,
    );
    expect(grid[0]).toEqual({ sku: 'tool_hoe', qty: 1, labelVi: 'Cuốc' });
    expect(grid[1]).toEqual({ sku: 'seed_wheat', qty: 5, labelVi: 'Hạt lúa' });
    expect(grid).toHaveLength(9);
    expect(grid.at(-1)?.sku ?? null).toBeNull();
  });

  it('maps held slot index for hotbar highlight', () => {
    expect(nuvoraHotbarIndexFromHeld(null)).toBe(0);
    expect(nuvoraHotbarIndexFromHeld(3)).toBe(3);
  });
});