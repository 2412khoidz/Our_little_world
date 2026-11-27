import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { InventoryModal } from '../../src/features/inventory/InventoryModal';
import { reconcileInventoryLayout } from '../../src/shared/inventory/inventoryLayoutStore';
import type { InventorySnapshot } from '../../src/shared/inventory/inventoryTypes';

const snapshot: InventorySnapshot = {
  worldId: 'inventory-test',
  serverNowMs: 1,
  serverDateUtc: '2026-11-27',
  canClaimFreeKibble: false,
  catalog: [],
  items: [{ worldId: 'inventory-test', ownerScope: 'shared', itemSku: 'apple', qty: 4, updatedAt: '' }],
};

it('keeps a held stack transient, reconciles depletion, and commits only a completed layout', () => {
  const commit = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState(snapshot);
    const [layout, setLayout] = useState(reconcileInventoryLayout(null, snapshot, 'owner'));
    return <>
      <button onClick={() => setCurrent({ ...snapshot, items: [{ ...snapshot.items[0]!, qty: 2 }] })}>Reduce</button>
      <InventoryModal snapshot={current} layout={reconcileInventoryLayout(layout, current, 'owner')}
        onChangeLayout={(next) => { commit(next); setLayout(next); }} localUserId="owner"
        hotbarSlots={[]} heldHotbarIndex={null} loading={false} onClaimFreeKibble={vi.fn()}
        onRefresh={vi.fn()} onClose={vi.fn()} />
    </>;
  }
  render(<Harness />);
  fireEvent.click(screen.getByTestId('nuvora-cell-apple'));
  expect(screen.queryByTestId('nuvora-cell-apple')).toBeNull();
  expect(screen.getByTestId('nuvora-inventory-cursor').dataset.itemQty).toBe('4');
  expect(commit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Reduce'));
  expect(screen.getByTestId('nuvora-inventory-cursor').dataset.itemQty).toBe('2');
  fireEvent.click(screen.getByTestId('nuvora-cell-empty-inv-10'));
  expect(screen.queryByTestId('nuvora-inventory-cursor')).toBeNull();
  expect(commit.mock.lastCall?.[0].sharedCells[10].qty).toBe(2);
});
