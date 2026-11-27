import { describe, expect, it } from 'vitest';
import {
  applyDirectSlotDrop,
  applyInventorySlotInteraction,
  assignStackToHotbar,
  cancelInventoryCursor,
  clearHotbarBinding,
  type InventoryPickedCursor,
  splitBagSlotInPlace,
} from '../../src/shared/donor/nuvora/nuvoraSlotInteraction';
import { buildHotbarSlotsFromInventory } from '../../src/shared/interaction/inventoryHotbarAdapter';
import {
  emptyInventoryLayout,
  reconcileInventoryLayout,
  reconcileInventoryInteraction,
  stackKeyId,
  sameStackRef,
} from '../../src/shared/inventory/inventoryLayoutStore';
import { createRng } from '../../src/shared/rng';
import type { InventorySnapshot } from '../../src/shared/inventory/inventoryTypes';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function makeSnapshot(): InventorySnapshot {
  return {
    worldId: 'w-test',
    serverNowMs: 0,
    serverDateUtc: '2026-01-01',
    canClaimFreeKibble: false,
    catalog: [
      { sku: 'tool_hoe', nameVi: 'Cuốc đất', descriptionVi: '', purpose: 'keepsake', stackLimit: 1, tradeable: false },
      { sku: 'tool_watering_can', nameVi: 'Bình tưới', descriptionVi: '', purpose: 'keepsake', stackLimit: 1, tradeable: false },
      { sku: 'wheat', nameVi: 'Lúa mì', descriptionVi: '', purpose: 'crop', stackLimit: 99, tradeable: true },
      { sku: 'koi_pastel', nameVi: 'Cá koi pastel', descriptionVi: '', purpose: 'fish', stackLimit: 99, tradeable: true },
    ],
    items: [
      { worldId: 'w-test', itemSku: 'tool_hoe', qty: 1, ownerScope: 'shared', quality: 'normal', updatedAt: '' },
      { worldId: 'w-test', itemSku: 'tool_watering_can', qty: 1, ownerScope: 'shared', quality: 'normal', updatedAt: '' },
      { worldId: 'w-test', itemSku: 'wheat', qty: 6, ownerScope: 'shared', quality: 'normal', updatedAt: '' },
      { worldId: 'w-test', itemSku: 'wheat', qty: 2, ownerScope: 'shared', quality: 'gold', updatedAt: '' },
      { worldId: 'w-test', itemSku: 'koi_pastel', qty: 3, ownerScope: 'shared', quality: 'silver', updatedAt: '' },
    ],
  };
}

function sumSharedSku(layout: ReturnType<typeof emptyInventoryLayout>, sku: string, quality: string): number {
  return layout.sharedCells
    .filter((c) => c && c.itemSku === sku && c.quality === quality)
    .reduce((acc, c) => acc + c!.qty, 0);
}

describe('Nuvora Interactive Inventory Layout (A1)', () => {
  const labels = (sku: string) => sku;

  it('picks up, places into empty slot, swaps incompatible stacks, and cancels without qty loss', () => {
    const snap = makeSnapshot();
    let layout = reconcileInventoryLayout(emptyInventoryLayout(), snap, USER_ID);

    // Pick wheat(normal) from index 2 and place into empty index 12
    const pick1 = applyInventorySlotInteraction(layout, null, { kind: 'bag', scope: 'shared', index: 2 }, { labelForSku: labels });
    expect(pick1.cursor?.itemSku).toBe('wheat');
    expect(pick1.cursor?.qty).toBe(6);

    const dropEmpty = applyInventorySlotInteraction(pick1.layout, pick1.cursor, { kind: 'bag', scope: 'shared', index: 12 }, { labelForSku: labels });
    expect(dropEmpty.cursor).toBeNull();
    layout = dropEmpty.layout;
    expect(layout.sharedCells[2]).toBeNull();
    expect(layout.sharedCells[12]?.itemSku).toBe('wheat');
    expect(layout.sharedCells[12]?.qty).toBe(6);

    // Pick gold wheat (index 3) and click normal wheat (index 12) -> swaps, does NOT merge across quality
    const pickGold = applyInventorySlotInteraction(layout, null, { kind: 'bag', scope: 'shared', index: 3 }, { labelForSku: labels });
    const swapRes = applyInventorySlotInteraction(pickGold.layout, pickGold.cursor, { kind: 'bag', scope: 'shared', index: 12 }, { labelForSku: labels });
    expect(swapRes.layout.sharedCells[12]?.quality).toBe('gold');
    expect(swapRes.layout.sharedCells[12]?.qty).toBe(2);
    expect(swapRes.cursor?.itemSku).toBe('wheat');
    expect(swapRes.cursor?.quality).toBe('normal');

    // Escape cancel restores held stack cleanly without duplicating or dropping qty
    const cancelled = cancelInventoryCursor(swapRes.layout, swapRes.cursor);
    expect(cancelled.cursor).toBeNull();
    expect(sumSharedSku(cancelled.layout, 'wheat', 'normal')).toBe(6);
    expect(sumSharedSku(cancelled.layout, 'wheat', 'gold')).toBe(2);
  });

  it('right-click splits stack and merges ONLY identical SKU+quality+scope stacks', () => {
    const snap = makeSnapshot();
    const layout = reconcileInventoryLayout(emptyInventoryLayout(), snap, USER_ID);

    const split = splitBagSlotInPlace(layout, 'shared', 2);
    expect(split.sharedCells[2]?.qty).toBe(3);
    const secondIdx = split.sharedCells.findIndex((c, idx) => idx !== 2 && c?.itemSku === 'wheat' && c.quality === 'normal');
    expect(secondIdx).toBeGreaterThanOrEqual(0);
    expect(split.sharedCells[secondIdx]?.qty).toBe(3);

    // Drag one split half back onto the other half -> merges back to 6
    const merged = applyDirectSlotDrop(
      split,
      { kind: 'bag', scope: 'shared', index: secondIdx },
      { kind: 'bag', scope: 'shared', index: 2 },
      { labelForSku: labels },
    );
    expect(merged.cursor).toBeNull();
    expect(merged.layout.sharedCells[secondIdx]).toBeNull();
    expect(merged.layout.sharedCells[2]?.qty).toBe(6);
  });

  it('binds/swaps/unbinds hotbar slots and reconciles with server snapshot as single quantity authority', () => {
    const snap = makeSnapshot();
    let layout = reconcileInventoryLayout(emptyInventoryLayout(), snap, USER_ID);

    const assignRes = assignStackToHotbar(
      layout,
      { itemSku: 'koi_pastel', quality: 'silver', ownerScope: 'shared' },
      5,
    );
    layout = assignRes.layout;

    const hotbar = buildHotbarSlotsFromInventory(snap, USER_ID, layout.hotbarBindings, {
      tool_watering_can: 45,
    });
    expect(hotbar[5]?.itemSku).toBe('koi_pastel');
    expect(hotbar[5]?.quality).toBe('silver');
    expect(hotbar[5]?.qty).toBe(3);
    expect(hotbar[1]?.itemSku).toBe('tool_watering_can');
    expect(hotbar[1]?.waterFillLevel).toBe(45);

    // Server updates koi_pastel qty from 3 -> 4; persisted slot placement + hotbar binding stay intact with new qty
    const updatedSnap: InventorySnapshot = {
      ...snap,
      items: snap.items.map((row) =>
        row.itemSku === 'koi_pastel' ? { ...row, qty: 4 } : row,
      ),
    };
    const reconciled = reconcileInventoryLayout(layout, updatedSnap, USER_ID);
    expect(sumSharedSku(reconciled, 'koi_pastel', 'silver')).toBe(4);
    expect(
      sameStackRef(reconciled.hotbarBindings[5], {
        itemSku: 'koi_pastel',
        quality: 'silver',
        ownerScope: 'shared',
      }),
    ).toBe(true);

    // Unbind hotbar slot 5 without touching bag qty
    const unbound = clearHotbarBinding(reconciled, 5);
    expect(unbound.hotbarBindings[5]).toBeNull();
    expect(sumSharedSku(unbound, 'koi_pastel', 'silver')).toBe(4);
  });
});

it('conserves every scope and tier across randomized placement and changing snapshots', () => {
  const rng = createRng(83045);
  const amount = (upper: number) => Math.floor(rng.next() * upper);
  const personal = `user:${USER_ID}` as const;
  let snapshot = makeSnapshot();
  snapshot = {
    ...snapshot,
    items: [...snapshot.items, ...Array.from({ length: 63 }, (_, index) => ({
      worldId: snapshot.worldId,
      ownerScope: index < 40 ? 'shared' as const : personal,
      itemSku: `extra_${index}`,
      quality: 'silver' as const,
      qty: 1 + amount(7),
      updatedAt: '',
    }))],
  };
  let layout = reconcileInventoryLayout(null, snapshot, USER_ID);
  expect(layout.sharedCells.length).toBeGreaterThan(36);
  expect(layout.personalCells.length).toBeGreaterThan(18);
  let cursor: InventoryPickedCursor | null = null;
  const opts = { labelForSku: (sku: string) => sku };
  for (let index = 0; index < 800; index += 1) {
    const scope = amount(2) === 0 ? 'shared' : 'personal';
    const all = scope === 'shared' ? layout.sharedCells : layout.personalCells;
    const source = { kind: 'bag', scope, index: amount(all.length) } as const;
    const dest = { kind: 'bag', scope, index: amount(all.length) } as const;
    if (index % 11 === 0) {
      const chosen = amount(snapshot.items.length);
      snapshot = { ...snapshot, items: snapshot.items.map((row, i) =>
        i === chosen ? { ...row, qty: amount(13) } : row,
      ) };
    } else if (index % 7 === 0) {
      ({ layout, cursor } = cancelInventoryCursor(layout, cursor));
    } else if (!cursor && index % 5 === 0) {
      ({ layout, cursor } = applyDirectSlotDrop(layout, source, dest, opts));
    } else {
      const target = index % 3 === 0 ? { ...dest, kind: 'hotbar' as const, index: amount(8) } : dest;
      ({ layout, cursor } = applyInventorySlotInteraction(layout, cursor, target, { ...opts, rightClick: amount(2) === 0 }));
    }
    ({ layout, cursor } = reconcileInventoryInteraction(layout, cursor, snapshot, USER_ID));
    const totals = new Map<string, number>();
    for (const cell of [...layout.sharedCells, ...layout.personalCells, cursor]) {
      if (!cell) continue;
      const key = stackKeyId(cell);
      totals.set(key, (totals.get(key) ?? 0) + cell.qty);
    }
    const expected = new Map(snapshot.items.filter((row) => row.qty > 0).map((row) =>
      [stackKeyId({ ...row, quality: row.quality ?? 'normal' }), row.qty],
    ));
    expect(totals).toEqual(expected);
  }
});

it('keeps a filled page splittable and represents large holdings without allocating millions of cells', () => {
  const snapshot = makeSnapshot();
  const full = { ...snapshot, items: Array.from({ length: 36 }, (_, i) => ({
    ...snapshot.items[2]!, itemSku: `owned_${i}`, qty: 4,
  })) };
  const layout = reconcileInventoryLayout(null, full, USER_ID);
  const split = splitBagSlotInPlace(layout, 'shared', 0);
  expect(split.sharedCells[0]?.qty).toBe(2);
  expect(split.sharedCells[36]?.qty).toBe(2);
  const huge = reconcileInventoryLayout(null, { ...snapshot, items: [
    { ...snapshot.items[2]!, qty: 2_147_483_647 },
  ] }, USER_ID);
  expect(huge.sharedCells).toHaveLength(36);
  expect(sumSharedSku(huge, 'wheat', 'normal')).toBe(2_147_483_647);
});
