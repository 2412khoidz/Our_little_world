import { describe, expect, it } from 'vitest';
import { hotbarSlotIndexForSku } from '../../src/shared/donor/nuvora/nuvoraPresentationBridge';
import { nuvoraClickSlotReadOnly, nuvoraQuickEquipFromCell } from '../../src/shared/donor/nuvora/nuvoraSlotInteraction';

const hb = () => (sku: string) => hotbarSlotIndexForSku(slots, sku);
const slots = [
  { slotIndex: 0, itemSku: 'tool_hoe', qty: 1 },
  { slotIndex: 2, itemSku: 'seed_wheat', qty: 4 },
];

describe('nuvoraSlotInteraction', () => {
  it('shift-click equips matching hotbar slot', () => {
    const res = nuvoraQuickEquipFromCell({ sku: 'seed_wheat', qty: 4, labelVi: 'Hạt' }, hb());
    expect(res.selectHotbarIndex).toBe(2);
    expect(res.cursor).toBeNull();
  });

  it('left click on hotbar-eligible SKU selects slot without ghost cursor', () => {
    const res = nuvoraClickSlotReadOnly(
      null,
      { kind: 'inv', index: 3, cell: { sku: 'tool_hoe', qty: 1, labelVi: 'Cuốc' } },
      { hotbarSlotForSku: hb() },
    );
    expect(res.selectHotbarIndex).toBe(0);
    expect(res.cursor).toBeNull();
  });

  it('non-hotbar SKU sets presentation cursor only', () => {
    const res = nuvoraClickSlotReadOnly(
      null,
      { kind: 'inv', index: 0, cell: { sku: 'crop_wheat', qty: 2, labelVi: 'Lúa' } },
      { hotbarSlotForSku: () => null },
    );
    expect(res.cursor?.sku).toBe('crop_wheat');
    expect(res.selectHotbarIndex).toBeUndefined();
  });
});

describe('hotbarSlotIndexForSku', () => {
  it('finds first matching adapter slot', () => {
    expect(hotbarSlotIndexForSku(slots, 'seed_wheat')).toBe(2);
    expect(hotbarSlotIndexForSku(slots, 'missing')).toBeNull();
  });
});