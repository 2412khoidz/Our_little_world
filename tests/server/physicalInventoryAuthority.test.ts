// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleDevLanPhysicalInventory, type PhysicalDevLanDatabase } from '../../src/server/devLanPhysicalInventoryRoute';
import { computeSellPrice } from '../../src/shared/economy/catalogConfig';
import { INITIAL_PHYSICAL_QUERY, preferPhysicalSnapshot, type PhysicalInventoryRequest, type PhysicalInventoryView } from '../../src/shared/inventory/physicalInventoryApi';
import type { InventoryCatalogItem } from '../../src/shared/inventory/inventoryTypes';

const worldId = 'house';
const catalog: InventoryCatalogItem[] = [
  { sku: 'apple', nameVi: 'Tao', descriptionVi: '', stackLimit: 99, purpose: 'fruit', tradeable: true },
  { sku: 'wheat', nameVi: 'Lua', descriptionVi: '', stackLimit: 99, purpose: 'crop', tradeable: true },
];

function fixture() {
  const db: PhysicalDevLanDatabase = { v015: {
    inventory: { [worldId]: [
      { worldId, ownerScope: 'user:may', itemSku: 'apple', quality: 'gold', qty: 5 },
      { worldId, ownerScope: 'user:may', itemSku: 'wheat', quality: 'normal', qty: 5 },
    ] },
    wallets: { [worldId]: { coins: 200 } },
  } };
  const location: { value: { mapId: string; x?: number; y?: number } } = { value: { mapId: 'home' } };
  let durable = '';
  function call(request?: PhysicalInventoryRequest, actor = 'may') {
    let status = 0;
    let payload: { ok: boolean; data?: PhysicalInventoryView; code?: string } = { ok: false };
    handleDevLanPhysicalInventory({
      req: { method: request ? 'POST' : 'GET' }, route: '/inventory/physical',
      reqUrl: new URL('http://127.0.0.1/?worldId=' + worldId), body: request, userId: actor,
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
