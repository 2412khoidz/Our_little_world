import { describe, expect, it } from 'vitest';
import {
  canStackPhysical, debitPhysicalBackpackSlot, editBasicPhysicalInventory, migratePhysicalInventory,
  PhysicalInventoryEdit, physicalHotbarIndices, physicalSlots, playerBackpack, readPhysicalContainer,
  type LegacyPhysicalEntry, type PhysicalCommand, type PhysicalInventory, type PhysicalStack,
} from '../../src/shared/inventory/physicalInventory';

const catalog = new Map([
  ['seed_wheat', { name: 'Hạt lúa', stackLimit: 10, category: 'seed' }],
  ['rod_basic', { name: 'Cần', stackLimit: 1, category: 'tool', individual: true, essential: true }],
  ['apple', { name: 'Táo', stackLimit: 4, category: 'fruit' }],
]);
const pack = (index: number) => ({ container: 'backpack', index } as const);
const home = (index: number) => ({ container: 'home', index } as const);
const wheat = (qty: number, ownerScope: LegacyPhysicalEntry['ownerScope'] = 'shared'): LegacyPhysicalEntry =>
  ({ worldId: 'world', itemSku: 'seed_wheat', qty, ownerScope });
const create = (...rows: LegacyPhysicalEntry[]) => migratePhysicalInventory(undefined, 'world', rows, catalog);
const read = (state: PhysicalInventory, kind: 'home' | 'backpack' | 'overflow' = 'backpack', actor = 'may') =>
  readPhysicalContainer(state, kind, actor);
const apply = (state: PhysicalInventory, command: PhysicalCommand, actor = 'may', atHome = true) => {
  const edit = new PhysicalInventoryEdit(state, actor, catalog, atHome);
  editBasicPhysicalInventory(edit, command);
  return edit.finish();
};
const qty = (state: PhysicalInventory) => Object.values(state.containers)
  .flatMap(physicalSlots).reduce((n, { stack }) => n + stack.qty, 0);

describe('Physical inventory foundation', () => {
  it('moves five units into the active row, consumes only that slot, and clears it without refill', () => {
    let state = create(wheat(10, 'user:may'), wheat(10, 'user:may'));
    const stackId = read(state).slots[0]!.id;
    state = apply(state, { kind: 'move', from: pack(0), to: pack(9), stackId, qty: 5 });
    state = apply(state, { kind: 'rotate', direction: 1 }, 'may', false);
    const selected = physicalHotbarIndices(playerBackpack(state, 'may').activeRow)[0]!;
    const stack = read(state).slots[selected]!;
    expect(stack.qty).toBe(5);
    const edit = new PhysicalInventoryEdit(state, 'may', catalog, false);
    debitPhysicalBackpackSlot(edit, selected, stack.id, 5, (entry) => entry.itemSku === 'seed_wheat');
    state = edit.finish();
    expect(qty(state)).toBe(15);
    expect(read(state).slots[selected]).toBeUndefined();
    expect(read(state).slots[0]?.qty).toBe(5);
  });

  it('migrates deterministically, preserves metadata and sends private overflow to its owner', () => {
    const rows: LegacyPhysicalEntry[] = [
      wheat(193, 'user:may'), wheat(10),
      { worldId: 'world', ownerScope: 'user:nang', itemSku: 'rod_basic', quality: 'gold', qty: 1,
        metadata: { instanceId: 'rod-1', durability: 23 } },
    ];
    const state = create(...rows);
    expect(state).toEqual(create(...rows));
    expect(migratePhysicalInventory(state, 'world', [], catalog)).toBe(state);
    expect(qty(state)).toBe(204);
    expect(physicalSlots(read(state))).toHaveLength(18);
    expect(physicalSlots(read(state, 'overflow', 'may')).map(({ stack }) => stack.qty)).toEqual([10, 3]);
    expect(physicalSlots(read(state, 'overflow', 'nang'))).toHaveLength(0);
    expect(read(state, 'backpack', 'nang').slots[0]).toMatchObject({ quality: 'gold', metadata: { instanceId: 'rod-1', durability: 23 } });
  });

  it('imports a legacy shortcut once using a real transfer and enforces home access', () => {
    const original = create(wheat(10));
    const command = { kind: 'import_shortcuts', shortcuts: [{ index: 3, itemSku: 'seed_wheat', quality: 'normal', ownerScope: 'shared' }] } as const;
    expect(() => apply(original, command, 'may', false)).toThrow('về nhà');
    const state = apply(original, command);
    expect(read(state).slots[3]?.qty).toBe(1);
    expect(read(state, 'home').slots[0]?.qty).toBe(9);
    expect(() => apply(state, command)).toThrow('đã được chuyển');
    expect(qty(state)).toBe(qty(original));
  });

  it('merges compatible metadata only, keeps incompatible stacks separate and allows full-stack swaps', () => {
    const base: PhysicalStack = { id: 'a', itemSku: 'apple', quality: 'normal', qty: 2, metadata: { cultivar: 'honey', genes: { b: 1, a: 2 } } };
    expect(canStackPhysical(base, { ...base, id: 'b', metadata: { genes: { a: 2, b: 1 }, cultivar: 'honey' } }, catalog)).toBe(true);
    expect(canStackPhysical(base, { ...base, quality: 'gold' }, catalog)).toBe(false);
    expect(canStackPhysical(base, { ...base, metadata: { cultivar: 'crisp' } }, catalog)).toBe(false);
    const original = create(wheat(3), { worldId: 'world', ownerScope: 'user:may', itemSku: 'apple', qty: 4 });
    const apple = read(original).slots[0]!;
    const next = apply(original, { kind: 'move', from: pack(0), to: home(0), qty: 4, stackId: apple.id });
    expect(read(next).slots[0]?.itemSku).toBe('seed_wheat');
    expect(read(next, 'home').slots[0]?.id).toBe(apple.id);
    expect(qty(next)).toBe(qty(original));
  });

  it('never loses overflow on a full backpack and conserves quantities in randomized transfers', () => {
    let state = create(wheat(179, 'user:may'), wheat(25));
    const initial = qty(state);
    const source = read(state, 'home').slots[0]!;
    state = apply(state, { kind: 'transfer', from: home(0), to: 'backpack', qty: 10, stackId: source.id });
    expect(read(state, 'home').slots[0]?.qty).toBe(9);
    expect(qty(state)).toBe(initial);
    expect(() => apply(state, { kind: 'transfer', from: home(0), to: 'backpack', qty: 1, stackId: source.id })).toThrow('đầy');
    let seed = 32645;
    for (let i = 0; i < 160; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const from = seed % 2 === 0 ? 'home' : 'backpack';
      const slots = physicalSlots(read(state, from));
      const chosen = slots[seed % slots.length];
      if (!chosen) continue;
      try {
        state = apply(state, { kind: 'transfer', from: { container: from, index: chosen.index },
          to: from === 'home' ? 'backpack' : 'home', qty: 1 + seed % chosen.stack.qty, stackId: chosen.stack.id });
      } catch (error) {
        expect(error).toHaveProperty('code', 'FULL');
      }
      expect(qty(state)).toBe(initial);
      const ids = Object.values(state.containers).flatMap(physicalSlots).map(({ stack }) => stack.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
