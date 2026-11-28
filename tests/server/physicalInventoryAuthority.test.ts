// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { dropLanding, handleDevLanPhysicalInventory, type PhysicalDevLanDatabase } from '../../src/server/devLanPhysicalInventoryRoute';
import { HOME_STORAGE_ANCHOR } from '../../src/shared/interaction/mainGameWorldAnchors';
import { computeSellPrice } from '../../src/shared/economy/catalogConfig';
import { INITIAL_PHYSICAL_QUERY, preferPhysicalSnapshot, type PhysicalInventoryRequest, type PhysicalInventoryView } from '../../src/shared/inventory/physicalInventoryApi';
import type { InventoryCatalogItem } from '../../src/shared/inventory/inventoryTypes';

const worldId = 'house';
const catalog: InventoryCatalogItem[] = [
  { sku: 'apple', nameVi: 'Tao', descriptionVi: '', stackLimit: 99, purpose: 'fruit', tradeable: true },
  { sku: 'wheat', nameVi: 'Lua', descriptionVi: '', stackLimit: 99, purpose: 'crop', tradeable: true },
];

function fixture(persisted?: string) {
  const db: PhysicalDevLanDatabase = persisted ? JSON.parse(persisted) : { v015: {
    inventory: { [worldId]: [
      { worldId, ownerScope: 'user:may', itemSku: 'apple', quality: 'gold', qty: 5 },
      { worldId, ownerScope: 'user:may', itemSku: 'wheat', quality: 'normal', qty: 5 },
    ] },
    wallets: { [worldId]: { coins: 200 } },
  } };
  const location: { value: { mapId: string; x?: number; y?: number; facing?: string } } = { value: { mapId: 'home' } };
  let durable = '';
  function call(request?: PhysicalInventoryRequest, actor = 'may', storage = false) {
    let status = 0;
    let payload: { ok: boolean; data?: PhysicalInventoryView; code?: string } = { ok: false };
    handleDevLanPhysicalInventory({
      req: { method: request ? 'POST' : 'GET' }, route: '/inventory/physical',
      reqUrl: new URL('http://127.0.0.1/?worldId=' + worldId + (storage ? '&storage=home' : '')), body: request, userId: actor,
      db, worldId, catalog, isWorldMember: (_world, user) => ['may', 'nang'].includes(user),
      res: null, sendJson: (_res, code, body) => { status = code; payload = body as typeof payload; },
      broadcastInventory: () => {},
      saveDb: () => { durable = JSON.stringify(db); },
      position: location.value,
    });
    return { status, payload, view: payload.data };
  }
  const mutate = (version: number, idempotencyKey: string, command: PhysicalInventoryRequest['command'], actor?: string) =>
    call({ worldId, version, idempotencyKey, command, query: INITIAL_PHYSICAL_QUERY }, actor);
  return { db, get durable() { return durable; }, location, call, mutate };
}

describe('Physical wallet and save authority', () => {
  it('includes shelves only on explicit nearby reads and gates authoritative writes by position', () => {
    const host = fixture();
    const start = host.call().view!;
    const stack = start.backpack.find(({ stack }) => stack?.itemSku === 'wheat')!;
    const deposit = { kind: 'transfer', from: { container: 'backpack', index: stack.index },
      to: 'home', qty: 1, stackId: stack.stack!.id } as const;

    expect(host.call(undefined, 'may', true).view?.storage).toBeNull();
    host.location.value = { mapId: 'home', x: 150, y: 150 };
    expect(host.call(undefined, 'may', true).view?.storage).toBeNull();
    expect(host.mutate(start.version, 'too-far', deposit).payload.code).toBe('FORBIDDEN');
    expect(host.call().view?.version).toBe(start.version);

    host.location.value = { mapId: 'home', x: HOME_STORAGE_ANCHOR.x, y: HOME_STORAGE_ANCHOR.y };
    expect(host.call().view?.storage).toBeNull();
    expect(host.call(undefined, 'may', true).view?.storage?.kind).toBe('home');
    expect(host.mutate(start.version, 'nearby', deposit).status).toBe(200);
    expect(host.call(undefined, 'may', true).view?.storage?.slots[0]?.stack).toMatchObject({ itemSku: 'wheat', qty: 1 });

    host.location.value = { ...host.location.value, mapId: 'garden' };
    expect(host.call(undefined, 'may', true).view?.storage).toBeNull();
    expect(host.mutate(start.version, 'nearby', deposit).view?.storage).toBeNull();
  });

  it('charges an upgrade once, preserves existing slots and rejects a stale command', () => {
    const host = fixture();
    const old = host.call().view!;
    const command = { kind: 'upgrade_backpack' } as const;
    const upgraded = host.mutate(old.version, 'upgrade', command).view!;
    expect(upgraded.backpack).toHaveLength(27);
    expect(upgraded.backpack.slice(0, 18)).toEqual(old.backpack);
    expect(upgraded.coins).toBe(100);
    expect(host.mutate(old.version, 'upgrade', command).view).toEqual(upgraded);
    expect(host.mutate(old.version, 'upgrade', command, 'nang').payload.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(host.mutate(old.version, 'stale', command).payload.code).toBe('VERSION_CONFLICT');
    expect(host.mutate(upgraded.version, 'expensive', command).payload.code).toBe('INSUFFICIENT_FUNDS');
    expect(preferPhysicalSnapshot(upgraded, old)).toBe(upgraded);
    expect(JSON.parse(host.durable).v015.wallets[worldId]).toEqual({ coins: 100 });
    expect(host.db.v015.inventory[worldId]).toBeUndefined();
  });

  it('debits an exact partial gold stack using the existing sale price', () => {
    const host = fixture();
    const start = host.call().view!;
    const apple = start.backpack.find(({ stack }) => stack?.itemSku === 'apple')!;
    const from = { container: 'backpack', index: apple.index } as const;
    const sale = { kind: 'sell', channel: 'market', from, qty: 2, stackId: apple.stack!.id } as const;
    expect(host.mutate(start.version, 'at-home', sale).status).toBe(403);
    host.location.value = { mapId: 'shop_crop_market' };
    const after = host.mutate(start.version, 'apple-sale', sale).view!;
    expect(after.coins).toBe(200 + computeSellPrice('apple', 'gold') * 2);
    expect(after.backpack[apple.index]?.stack).toMatchObject({ id: apple.stack!.id, qty: 3, quality: 'gold' });
    expect(host.mutate(start.version, 'apple-sale', sale).view?.coins).toBe(after.coins);
    const starred = host.mutate(after.version, 'star', { kind: 'favorite', at: from, stackId: apple.stack!.id }).view!;
    expect(host.mutate(starred.version, 'sell-favorite', sale).payload.code).toBe('PROTECTED');
  });

  it('persists a forward drop and its receipt across save reloads', ({ onTestFinished }) => {
    const clock = vi.spyOn(Date, 'now');
    onTestFinished(() => { clock.mockRestore(); });
    const host = fixture();
    host.location.value = { mapId: 'home', x: 136, y: 152, facing: 'right' };
    expect(dropLanding({ mapId: 'home', x: -16, y: 152 }, [])).toBeNull();
    const old = host.call().view!;
    const apple = old.backpack.find(({ stack }) => stack?.itemSku === 'apple')!;
    const command = { kind: 'drop', from: { container: 'backpack', index: apple.index },
      qty: 3, stackId: apple.stack!.id } as const;
    const dropped = host.mutate(old.version, 'drop-gold', command).view!;
    const [entity] = dropped.mapDrops;
    expect(entity).toMatchObject({ mapId: 'home', x: 152, y: 152, stack: { itemSku: 'apple', qty: 3, quality: 'gold' } });
    expect(dropped.backpack[apple.index]?.stack?.qty).toBe(2);
    expect(host.mutate(dropped.version, 'early-pickup', { kind: 'pickup', dropId: entity!.id }).status).toBe(409);

    const restarted = fixture(host.durable);
    restarted.location.value = { mapId: 'garden', x: 136, y: 152 };
    expect(restarted.call().view?.mapDrops).toEqual([]);
    restarted.location.value = { mapId: 'home', x: 136, y: 152 };
    expect(restarted.mutate(old.version, 'drop-gold', command).view?.mapDrops).toEqual([entity]);
    clock.mockReturnValue((entity!.pickupAfterMs ?? 0) + 1);
    const automatic = { kind: 'pickup', dropId: entity!.id, automatic: true } as const;
    expect(restarted.mutate(dropped.version, 'still-inside', automatic).status).toBe(409);
    restarted.location.value = { mapId: 'home', x: 64, y: 152 };
    expect(restarted.mutate(dropped.version, 'away', automatic).status).toBe(409);
    const armed = restarted.mutate(dropped.version, 'record-exit', { kind: 'arm_pickup', dropId: entity!.id }).view!;
    const returned = fixture(restarted.durable);
    returned.location.value = { mapId: 'home', x: 136, y: 152 };
    expect(returned.mutate(armed.version, 'reentry', automatic).view?.pickup).toEqual({ collected: 3, remaining: 0 });
    expect(returned.mutate(armed.version, 'reentry', automatic).view?.pickup).toEqual({ collected: 3, remaining: 0 });
    restarted.location.value = { mapId: 'home', x: 136, y: 152 };
    const picked = restarted.mutate(armed.version, 'pickup-gold', { kind: 'pickup', dropId: entity!.id }, 'nang').view!;
    expect(picked.mapDrops).toEqual([]);
    expect(picked.backpack[0]?.stack).toMatchObject({ qty: 3, quality: 'gold' });
    expect(restarted.mutate(dropped.version, 'pickup-again', { kind: 'pickup', dropId: entity!.id }, 'may').status).toBe(409);
  });

  it('ships a real stack near the farm bin and persists the original saturation counter', () => {
    const host = fixture();
    const old = host.call().view!;
    const item = old.backpack.find(({ stack }) => stack?.itemSku === 'wheat')!;
    const command = { kind: 'sell', channel: 'shipping', from: { container: 'backpack', index: item.index },
      qty: 1, stackId: item.stack!.id } as const;
    host.location.value = { mapId: 'farm', x: 720, y: 720 };
    expect(host.mutate(old.version, 'distant', command).status).toBe(403);
    host.location.value = { mapId: 'farm', x: 216, y: 88 };
    const current = host.mutate(old.version, 'ship', command).view!;
    expect(current.coins).toBeGreaterThan(old.coins);
    expect(current.backpack[item.index]?.stack?.qty).toBe(4);
    expect(host.db.v015.shippingBin?.[worldId]?.soldByGroup).toMatchObject({ grain: 1 });
    expect(host.mutate(old.version, 'ship', command).view?.coins).toBe(current.coins);
  });
});
