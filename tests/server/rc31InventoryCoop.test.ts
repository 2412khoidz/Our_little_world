import { describe, expect, it } from 'vitest';
import { getPhysicalCatalog, type PhysicalInventory, type PhysicalStack } from '../../src/shared/inventory/physicalInventory';
// @ts-expect-error Dev LAN exports its catalog from a JavaScript module.
import { V015_CATALOG } from '../../scripts/devLanV015Handlers.mjs';
import { handlePhysicalTrade } from '../../src/server/devLanPhysicalTrade';
import type { PhysicalDevLanDatabase } from '../../src/server/devLanPhysicalInventoryRoute';
import type { TradeCommand, TradeSession } from '../../src/shared/inventory/physicalTrade';
import { claimStarterTools, pendingStarterTools } from '../../src/server/devLanStarterTools';
import { preparePhysicalGameplay } from '../../src/server/devLanPhysicalGameplay';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';
const catalog = getPhysicalCatalog(V015_CATALOG);

const stack = (id: string, itemSku: string, qty = 1, metadata?: PhysicalStack['metadata']): PhysicalStack =>
  ({ id, itemSku, quality: 'normal', qty, ...(metadata && { metadata }) });

function state(left: Record<number, PhysicalStack> = {}, right: Record<number, PhysicalStack> = {}): PhysicalInventory {
  return { schemaVersion: 1, version: 1, nextId: 100, players: {}, containers: {
    'backpack:a': { capacity: 18, slots: left, locked: {} },
    'backpack:b': { capacity: 18, slots: right, locked: {} },
  } };
}

function full() {
  return Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i, stack('full-' + i, 'apple', 1, { batch: i })]));
}

function trade(initial: PhysicalInventory) {
  const db: PhysicalDevLanDatabase = { v015: { inventory: {}, wallets: {}, physicalInventory: { world: initial } } };
  const tradeSessions = new Map<string, TradeSession>();
  const tradeInvites = new Map<string, number>();
  const tradeConnections = new Map<string, string>();
  let saves = 0;
  let bConnection = 'b1';
  function call(userId: string, command?: TradeCommand, x = 24) {
    let status = 0;
    let session: TradeSession | null = null;
    handlePhysicalTrade({
      worldId: 'world', userId, db, req: { method: command ? 'POST' : 'GET' },
      body: { worldId: 'world', command }, res: null, reqUrl: new URL('http://localhost'),
      route: '/inventory/physical-trade', catalog: V015_CATALOG,
      position: { mapId: 'home', x: 20, y: 20, connectionId: userId === 'a' ? 'a1' : bConnection },
      partnerId: userId === 'a' ? 'b' : 'a',
      partnerPosition: { mapId: 'home', x, y: 20, connectionId: userId === 'a' ? bConnection : 'a1' },
      isWorldMember: (world, actor) => world === 'world' && ['a', 'b'].includes(actor),
      sendJson: (_res, code, response) => { status = code; session = (response as { data?: { session: TradeSession } }).data?.session ?? null; },
      saveDb: () => { saves++; }, broadcastInventory: () => {},
      tradeSessions, tradeInvites, tradeConnections,
    });
    return { status, session: session as TradeSession | null };
  }
  const open = () => {
    const tradeId = call('a', { kind: 'invite' }).session!.id;
    expect(call('b', { kind: 'accept', tradeId }).session?.phase).toBe('offering');
    return tradeId;
  };
  return { db, call, open, reconnect: () => { bConnection = 'b2'; }, commits: () => saves,
    current: () => db.v015.physicalInventory!.world! };
}

describe('RC3.1 trade transactions', () => {
  it('exchanges a partial stack and unique gear, clears stale confirmations and replays once across restart', () => {
    const t = trade(state({ 0: stack('apple', 'apple', 6, { variety: 'Đỏ' }) },
      { 0: stack('rod', 'rod_basic', 1, { instanceId: 'unique', durability: 9 }), 1: stack('green', 'apple', 2, { variety: 'Xanh' }) }));
    const tradeId = t.open();
    const offer = (user: string, revision: number, stackId: string, qty: number) =>
      t.call(user, { kind: 'offer', revision, tradeId, lines: [{ index: 0, stackId, qty }] });
    expect(offer('a', 0, 'apple', 2).session?.revision).toBe(1);
    expect(t.call('a', { kind: 'confirm', tradeId, revision: 1 }).session?.confirmed).toEqual(['a']);
    expect(offer('b', 1, 'rod', 1).session?.confirmed).toEqual([]);
    expect(t.call('a', { kind: 'confirm', tradeId, revision: 1 }).status).toBe(409);
    const confirm = { kind: 'confirm', tradeId, revision: 2 } as const;
    t.call('a', confirm);
    expect(t.call('b', confirm).session?.phase).toBe('settled');
    expect(t.current().containers['backpack:a']!.slots[0]?.qty).toBe(4);
    expect(t.current().containers['backpack:a']!.slots[1]?.metadata).toEqual({ instanceId: 'unique', durability: 9 });
    expect(t.current().containers['backpack:b']!.slots[0]?.metadata?.variety).toBe('Đỏ');
    expect(t.current().containers['backpack:b']!.slots[1]?.qty).toBe(2);
    expect(t.call('b', confirm).session?.phase).toBe('settled');
    expect(t.commits()).toBe(1);
    const restarted = trade(JSON.parse(JSON.stringify(t.current())));
    expect(restarted.call('a', confirm).session?.phase).toBe('settled');
    expect(restarted.commits()).toBe(0);
  });

  it('rejects a full gift recipient atomically and lets a compatible full stack accept the gift', () => {
    for (const compatible of [false, true]) {
      const right = full();
      if (compatible) right[0] = stack('fit', 'cherry', 2);
      const t = trade(state({ 0: stack('fruit', 'cherry', 2) }, right));
      const baseline = t.current();
      const tradeId = t.open();
      t.call('a', { kind: 'offer', tradeId, revision: 0, lines: [{ index: 0, stackId: 'fruit', qty: 2 }] });
      const confirm = { kind: 'confirm', tradeId, revision: 1 } as const;
      t.call('a', confirm);
      expect(t.call('b', confirm).status).toBe(compatible ? 200 : 409);
      if (compatible) expect(t.current().containers['backpack:b']!.slots[0]?.qty).toBe(4);
      else expect(t.current()).toBe(baseline);
    }
  });

  it('frees both outgoing slots before settling a swap between two full backpacks', () => {
    const left = { ...full(), 0: stack('left-rod', 'rod_basic', 1, { instanceId: 'rod', durability: 7 }) };
    const right = { ...full(), 0: stack('right-hoe', 'tool_hoe', 1, { instanceId: 'hoe' }) };
    const t = trade(state(left, right));
    const tradeId = t.open();
    t.call('a', { kind: 'offer', tradeId, revision: 0, lines: [{ index: 0, stackId: 'left-rod', qty: 1 }] });
    t.call('b', { kind: 'offer', tradeId, revision: 1, lines: [{ index: 0, stackId: 'right-hoe', qty: 1 }] });
    const confirm = { kind: 'confirm', tradeId, revision: 2 } as const;
    t.call('a', confirm);
    expect(t.call('b', confirm).session?.phase).toBe('settled');
    expect(t.current().containers['backpack:a']!.slots[0]?.metadata).toEqual({ instanceId: 'hoe' });
    expect(t.current().containers['backpack:b']!.slots[0]?.metadata).toEqual({ instanceId: 'rod', durability: 7 });
    expect(t.commits()).toBe(1);
  });

  it('cancels on disconnect or walking away and rejects a changed stack and a cancelled trade', () => {
    for (const scenario of ['away', 'disconnect', 'stack', 'cancel']) {
      const t = trade(state({ 0: stack('apple', 'apple', 4) }));
      const tradeId = t.open();
      t.call('a', { kind: 'offer', tradeId, revision: 0, lines: [{ index: 0, stackId: 'apple', qty: 1 }] });
      const confirm = { kind: 'confirm', tradeId, revision: 1 } as const;
      t.call('a', confirm);
      if (scenario === 'disconnect') t.reconnect();
      if (scenario === 'stack') t.current().containers['backpack:a']!.slots[0] = stack('apple', 'apple', 3);
      if (scenario === 'cancel') t.call('a', { kind: 'cancel', tradeId });
      expect(t.call('b', confirm, scenario === 'away' ? 1000 : 24).status).toBe(409);
      expect(t.commits()).toBe(0);
    }
  });
});

it('records independent starter claims once, preserves upgraded tools and leaves full claims pending', () => {
  const initial = state({ 0: stack('upgraded', 'tool_hoe_gold', 1, { instanceId: 'keeper' }) }, full());
  const a = claimStarterTools(initial, 'a', catalog);
  expect(a.containers['backpack:a']!.slots[0]?.metadata?.instanceId).toBe('keeper');
  expect(a.starterClaims?.a).toContain('rod_basic');
  expect(a.starterClaims?.a).not.toContain('tool_hoe');
  expect(claimStarterTools(a, 'a', catalog)).toBe(a);
  expect(() => claimStarterTools(a, 'b', catalog)).toThrow('Ba lô đầy');
  expect(a.starterClaims?.b).toBeUndefined();
  expect(pendingStarterTools(a, 'b', catalog)).toContain('tool_hoe');
  const b = claimStarterTools({ ...a, containers: { ...a.containers, 'backpack:b': { capacity: 18, slots: {}, locked: {} } } }, 'b', catalog);
  expect(b.starterClaims?.b).toContain('tool_hoe');
  expect(claimStarterTools(JSON.parse(JSON.stringify(b)), 'b', catalog)).toEqual(b);
});

describe('RC3.1 reward capacity', () => {
  function reconcile(route: string, body: Record<string, string>, slots: Record<number, PhysicalStack>) {
    const initial = state(slots);
    const ctx = preparePhysicalGameplay({ worldId: 'world', userId: 'a', route, body, state: initial,
      catalog: V015_CATALOG, receiverIsMember: (id) => id === 'a' });
    const apply = (rewards: [string, number][]) => ctx.apply([...ctx.rows, ...rewards.map(([itemSku, qty]): InventoryEntry =>
      ({ itemSku, qty, ownerScope: 'shared', worldId: 'world', quality: 'normal', updatedAt: '' }))]);
    return { ctx, initial, apply };
  }

  it.each([
    ['/farm/apply', { action: 'harvest' }], ['/farm/buy-seed', {}],
    ['/farm/deep/apply', { kind: 'harvest_tree' }], ['/farm/deep/apply', { kind: 'collect_livestock' }],
    ['/farm/deep/apply', { kind: 'collect_workshop' }], ['/farm/deep/apply', { kind: 'harvest_flower' }],
    ['/donor/workshop/collect', {}], ['/donor/coop/collect', {}], ['/donor/bakery/collect', {}],
  ] as const)('requires complete backpack capacity for %s %j', (route, body) => {
    const blocked = reconcile(route, body, full());
    expect(() => blocked.apply([['cherry', 3]])).toThrow('Ba lô đầy');
    expect(blocked.ctx.state).toBe(blocked.initial);
    const compatible = reconcile(route, body, { ...full(), 0: stack('partial', 'cherry', 2) });
    compatible.apply([['cherry', 3]]);
    expect(compatible.ctx.state.containers['backpack:a']!.slots[0]?.qty).toBe(5);
    for (const slots of [{}, { 1: stack('seed', 'seed_wheat') }]) {
      const room = reconcile(route, body, slots as Record<number, PhysicalStack>);
      room.apply([['cherry', 3]]);
      expect(room.ctx.overflowUnits).toBe(0);
    }
  });

  it('keeps all-or-nothing multiple outputs and puts a committed catch in existing overflow', () => {
    const multiple = reconcile('/farm/apply', { action: 'harvest' }, { ...full(), 0: stack('room', 'cherry', 2) });
    expect(() => multiple.apply([['cherry', 1], ['wheat', 2]])).toThrow('Ba lô đầy');
    expect(multiple.ctx.state).toBe(multiple.initial);
    const fishing = reconcile('/donor/fishing/resolve', {}, full());
    fishing.apply([['fish_minnow', 2]]);
    expect(fishing.ctx.overflowUnits).toBe(2);
    expect(fishing.ctx.state.containers['overflow:a']!.slots[0]?.qty).toBe(2);
  });
});
