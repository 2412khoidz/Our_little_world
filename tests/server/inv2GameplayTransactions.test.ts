// @vitest-environment node
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';
import { tryHandleFarmDevLan } from '../../src/server/devLanFarmRoute';
import { tryHandleDonorDevLan } from '../../src/server/devLanDonorRoute';
import * as physical from '../../src/server/devLanPhysicalInventoryRoute';
import { ALL_WORKSHOP_RECIPES, WORKSHOP_DEFS } from '../../src/shared/farming/workshops';
import { createEmptyDeepFarmState } from '../../src/shared/farming/deepFarmState';
import { LIVESTOCK_SPECIES_LIST } from '../../src/shared/farming/livestock';
import type { PhysicalInventory, PhysicalStack } from '../../src/shared/inventory/physicalInventory';
import type { PhysicalInventoryView } from '../../src/shared/inventory/physicalInventoryApi';

const may = '11111111-1111-4111-8111-111111111111';
const nang = '22222222-2222-4222-8222-222222222222';
const disposable: (() => Promise<void>)[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const cleanup of disposable.splice(0).reverse()) await cleanup();
});

async function host(filename: string, physicalMode: boolean) {
  const handler = createDevLanHandler({
    stateFilePath: filename,
    getTryHandleFarmDevLan: () => tryHandleFarmDevLan,
    getTryHandleDonorDevLan: () => tryHandleDonorDevLan,
    getTryHandlePhysicalInventory: () => physicalMode ? physical : null,
  });
  const server = createServer((req, res) => { void handler(req, res, () => res.writeHead(404).end()); });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing relay address');
  const root = 'http://127.0.0.1:' + address.port + '/api/dev-lan';
  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    handler.closeAll();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }
  disposable.push(stop);
  async function call(route: string, body?: object, actor = may) {
    const response = await fetch(root + route, {
      headers: { 'x-dev-user-id': actor, 'content-type': 'application/json' },
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  }
  return { call, stop };
}

function stack(index: number, sku: string, qty = 1, extras: Partial<PhysicalStack> = {}): PhysicalStack {
  return { id: 'fixture-' + index, itemSku: sku, quality: 'normal', qty, ...extras };
}

async function fixture(items: Record<number, PhysicalStack>, other: Record<number, PhysicalStack> = {},
  deepFarm?: ReturnType<typeof createEmptyDeepFarmState>) {
  const dir = await mkdtemp(join(tmpdir(), 'olw-inv2d-'));
  const filename = join(dir, '.dev-lan-state-inv2-transaction-test.json');
  disposable.push(() => rm(dir, { recursive: true, force: true }));
  const legacy = await host(filename, false);
  const seed = await legacy.call('/seed-couple', {});
  const worldId = seed.body.data.world.id as string;
  await legacy.stop();
  const save = JSON.parse(await readFile(filename, 'utf8'));
  const initial: PhysicalInventory = {
    schemaVersion: 1, version: 1, nextId: 1_000, players: {},
    containers: {
      ['backpack:' + may]: { capacity: 18, slots: items, locked: {} },
      ['backpack:' + nang]: { capacity: 18, slots: other, locked: {} },
    },
  };
  delete save.v015.inventory[worldId];
  save.v015.physicalInventory = { [worldId]: initial };
  save.v015.wallets[worldId].coins = 10_000;
  if (deepFarm) (save.v015.deepFarms ??= {})[worldId] = deepFarm;
  await writeFile(filename, JSON.stringify(save));
  let relay = await host(filename, true);
  let serial = 0;
  let nowMs = Date.now();
  vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
  const call = (route: string, params?: Record<string, unknown>, actor = may) => relay.call(
    route + '?worldId=' + worldId,
    params && { worldId, idempotencyKey: 'test-inv2d-' + (++serial), ...params },
    actor,
  );
  const read = async (actor = may) => (await call('/inventory/physical', undefined, actor)).body.data as PhysicalInventoryView;
  const durable = async () => JSON.parse(await readFile(filename, 'utf8'));
  return {
    call, read, durable, worldId,
    advance: (milliseconds: number) => { nowMs += milliseconds; },
    restart: async () => { await relay.stop(); relay = await host(filename, true); },
  };
}

type Harness = Awaited<ReturnType<typeof fixture>>;
async function apply(server: Harness, route: string, params: Record<string, unknown>, actor?: string) {
  const result = await server.call(route, params, actor);
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return result.body.data;
}

function qty(view: PhysicalInventoryView, sku: string) {
  return view.backpack.reduce((sum, { stack }) => sum + (stack?.itemSku === sku ? stack.qty : 0), 0);
}

describe('INV.2d physical gameplay authority over the Dev LAN API', () => {
  it('plants from the active slot, preserves the next slot and replays the exact commit after relaunch', async () => {
    const server = await fixture({
      0: stack(0, 'tool_hoe', 1, { metadata: { instanceId: 'hoe-id', durability: 24 } }),
      1: stack(1, 'seed_wheat'), 2: stack(2, 'seed_wheat', 4),
      3: stack(3, 'tool_watering_can', 1, { metadata: { instanceId: 'can-id' } }),
    });
    const farm = (action: string, params: Record<string, unknown> = {}) => ({ plotIndex: 0, action, ...params });
    await apply(server, '/farm/apply', farm('till', { toolSku: 'tool_hoe', physicalSource: { index: 0, stackId: 'fixture-0' } }));
    const planting = farm('plant', { seedSku: 'seed_wheat', physicalSource: { index: 1, stackId: 'fixture-1' }, idempotencyKey: 'plant-once' });
    const rejected = await server.call('/farm/apply', { ...planting, physicalSource: { index: 2, stackId: 'wrong' } });
    expect(rejected.status).toBe(409);
    expect(qty(await server.read(), 'seed_wheat')).toBe(5);
    await apply(server, '/farm/apply', planting);
    const planted = await server.read();
    expect(planted.backpack[1]?.stack).toBeNull();
    expect(planted.backpack[2]?.stack).toMatchObject({ id: 'fixture-2', qty: 4 });
    await server.restart();
    await apply(server, '/farm/apply', planting);
    expect((await server.read()).version).toBe(planted.version);
    await apply(server, '/farm/apply', farm('water', { toolSku: 'tool_watering_can', physicalSource: { index: 3, stackId: 'fixture-3' } }));
    server.advance(31 * 24 * 60 * 60_000);
    await apply(server, '/farm/apply', farm('harvest'));
    const after = await server.read();
    expect(qty(after, 'wheat')).toBeGreaterThan(0);
    expect(after.backpack[0]?.stack?.metadata).toEqual({ instanceId: 'hoe-id', durability: 24 });
    expect(after.backpack[2]?.stack?.id).toBe('fixture-2');
    expect((await server.durable()).v015.inventory[server.worldId]).toBeUndefined();
  });

  it('debits exactly one bait and durability and credits a catch once across retries and the other player', async () => {
    const server = await fixture({
      0: stack(0, 'rod_basic', 1, { metadata: { instanceId: 'rod-id', durability: 8, maker: 'QA' } }),
      1: stack(1, 'bait_free_worm', 3),
    });
    const castId = 'test-cast-0001';
    const cast = { castId, spotId: 'meadow_pond', physicalSource: { index: 0, stackId: 'fixture-0' } };
    const started = await apply(server, '/donor/fishing/start', cast);
    expect(await apply(server, '/donor/fishing/start', cast)).toEqual(started);
    const postCast = await server.read();
    expect(postCast.backpack[0]?.stack?.metadata).toEqual({ instanceId: 'rod-id', durability: 7, maker: 'QA' });
    expect(qty(postCast, 'bait_free_worm')).toBe(2);
    expect((await server.call('/donor/fishing/resolve', { castId, reelProgressPermille: 1000 }, nang)).status).toBe(409);
    const [catchA, catchB] = await Promise.all([
      apply(server, '/donor/fishing/resolve', { castId, reelProgressPermille: 1000 }),
      apply(server, '/donor/fishing/resolve', { castId, reelProgressPermille: 1000 }),
    ]);
    expect([catchA.alreadyResolved ?? false, catchB.alreadyResolved ?? false].sort()).toEqual([false, true]);
    expect(catchA.itemSku).toBeTruthy();
    expect(qty(await server.read(), catchA.itemSku)).toBe(catchA.qtyGranted);
    await server.restart();
    expect((await apply(server, '/donor/fishing/resolve', { castId, reelProgressPermille: 1000 })).alreadyResolved).toBe(true);
    expect(qty(await server.read(), catchA.itemSku)).toBe(catchA.qtyGranted);
  });

  it('queues and collects from all eight processing workshops with quality-safe additions', async () => {
    const recipes = WORKSHOP_DEFS.map(({ id }) => ALL_WORKSHOP_RECIPES.find(({ workshopId }) => id === workshopId)!);
    const amounts = new Map<string, number>();
    for (const recipe of recipes) {
      for (const { sku, qty } of recipe.inputs) amounts.set(sku, (amounts.get(sku) ?? 0) + qty);
    }
    expect(amounts.size).toBeLessThanOrEqual(18);
    const items = Object.fromEntries([...amounts.entries()].map(([sku, count], index) => [index, stack(index, sku, count)]));
    const server = await fixture(items);
    for (const recipe of recipes) {
      await apply(server, '/farm/deep/apply', { kind: 'queue_workshop', workshopId: recipe.workshopId, recipeId: recipe.recipeId });
    }
    expect((await server.call('/farm/deep/apply', { kind: 'queue_workshop', workshopId: recipes[0]!.workshopId, recipeId: recipes[0]!.recipeId })).status).toBe(409);
    server.advance(24 * 60 * 60_000);
    for (const recipe of recipes) {
      const collected = await apply(server, '/farm/deep/apply', { kind: 'collect_workshop', workshopId: recipe.workshopId });
      expect(collected.harvestedItems.length).toBeGreaterThan(0);
    }
    const view = await server.read();
    for (const recipe of recipes) expect(qty(view, recipe.outputSku)).toBeGreaterThan(0);
  });

  it('feeds livestock and collects a product without duplicating it on a simultaneous retry', async () => {
    const species = LIVESTOCK_SPECIES_LIST.find(({ speciesId }) => speciesId === 'chicken')!;
    const server = await fixture({ 0: stack(0, species.feedSku!, 4) });
    const adopted = await apply(server, '/farm/deep/apply', { kind: 'adopt_livestock', speciesId: species.speciesId, nickname: 'QA' });
    const animal = adopted.snapshot.livestock.animals[0];
    await apply(server, '/farm/deep/apply', { kind: 'feed_livestock', animalId: animal.animalId, feedSku: species.feedSku });
    expect(qty(await server.read(), species.feedSku!)).toBe(3);
    server.advance(10 * 60 * 60_000);
    const collect = { kind: 'collect_livestock', animalId: animal.animalId, idempotencyKey: 'one-product' };
    const [first, second] = await Promise.all([
      apply(server, '/farm/deep/apply', collect), apply(server, '/farm/deep/apply', collect),
    ]);
    const product = first.harvestedItems[0];
    expect([first.idempotentReplay ?? false, second.idempotentReplay ?? false].sort()).toEqual([false, true]);
    expect(qty(await server.read(), product.sku)).toBe(product.qty);
  });

  it('applies fertilizers, sprinklers, tending flowers and harvesting fruits through physical slots', async () => {
    const server = await fixture({
      0: stack(0, 'tool_hoe', 1, { metadata: { instanceId: 'hoe' } }),
      1: stack(1, 'fert_compost', 2), 2: stack(2, 'sprinkler_basic'), 3: stack(3, 'seed_rose_pink', 2),
      4: stack(4, 'sapling_cocoa'),
    });
    const farm = (action: string, index: number, extra: object) => apply(server, '/farm/apply', {
      plotIndex: 0, action, physicalSource: { index, stackId: 'fixture-' + index }, ...extra,
    });
    await farm('till', 0, { toolSku: 'tool_hoe' });
    await farm('fertilize', 1, { fertilizerSku: 'fert_compost' });
    await farm('place_sprinkler', 2, { sprinklerSku: 'sprinkler_basic' });
    await apply(server, '/farm/apply', { plotIndex: 0, action: 'remove_sprinkler' });
    await apply(server, '/farm/deep/apply', { kind: 'plant_tree', slotIndex: 0, saplingSku: 'sapling_cocoa' });
    await apply(server, '/farm/deep/apply', { kind: 'plant_flower', slotIndex: 0, flowerSku: 'seed_rose_pink' });
    await apply(server, '/farm/deep/apply', { kind: 'plant_flower', slotIndex: 1, flowerSku: 'seed_rose_pink' });
    server.advance(48 * 60 * 60_000);
    await apply(server, '/farm/deep/apply', { kind: 'crossbreed_flowers' });
    const flower = await apply(server, '/farm/deep/apply', { kind: 'harvest_flower', slotIndex: 0 });
    const fruit = await apply(server, '/farm/deep/apply', { kind: 'harvest_tree', slotIndex: 0 });
    const bag = await server.read();
    expect(bag.backpack[1]?.stack?.qty).toBe(1);
    expect(qty(bag, 'seed_rose_pink')).toBe(0);
    expect(qty(bag, 'sapling_cocoa')).toBe(0);
    expect(qty(bag, 'sprinkler_basic')).toBe(1);
    expect(qty(bag, flower.harvestedItems[0].sku)).toBe(flower.harvestedItems[0].qty);
    expect(qty(bag, fruit.harvestedItems[0].sku)).toBe(fruit.harvestedItems[0].qty);
  });

  it('refunds a cancelled workshop input to its contributor with metadata even if the partner cancels', async () => {
    const metadata = { provenance: { batch: 'Mây' } };
    const server = await fixture({ 0: stack(0, 'wheat', 2, { quality: 'silver', metadata }) });
    const queued = await apply(server, '/farm/deep/apply', { kind: 'queue_workshop', workshopId: 'mill', recipeId: 'flour' });
    expect((await server.read()).backpack[0]?.stack).toBeNull();
    const jobId = queued.snapshot.workshops.stations.mill.queue[0].jobId;
    await apply(server, '/farm/deep/apply', { kind: 'cancel_workshop', workshopId: 'mill', jobId }, nang);
    expect((await server.read()).backpack[0]?.stack).toMatchObject({ itemSku: 'wheat', qty: 2, id: 'fixture-0', quality: 'silver', metadata });
    expect(qty(await server.read(nang), 'wheat')).toBe(0);
  });

  it('buys seed, sells the correct quality and does not consume another slot for cat food', async () => {
    const server = await fixture({
      0: stack(0, 'wheat', 2, { quality: 'gold' }),
      1: stack(1, 'wheat', 2),
      2: stack(2, 'pet_kibble_basic', 2),
      3: stack(3, 'pet_kibble_basic', 1),
    });
    await apply(server, '/farm/buy-seed', { seedSku: 'seed_carrot', qty: 2 });
    expect(qty(await server.read(), 'seed_carrot')).toBe(2);
    await apply(server, '/farm/sell', { sku: 'wheat', qty: 1, quality: 'gold' });
    let view = await server.read();
    expect(view.backpack[0]?.stack).toMatchObject({ qty: 1, quality: 'gold' });
    expect(view.backpack[1]?.stack).toMatchObject({ qty: 2, quality: 'normal' });
    const pet = await apply(server, '/pet/adopt-or-rename', { name: 'QA' });
    const bowl = (await server.call('/pet/care')).body.data;
    const fill = {
      petId: pet.id, action: 'fill_food', expectedBowlVersion: bowl.version, ownerScope: 'shared',
      itemSku: 'pet_kibble_basic', quality: 'normal', physicalSource: { index: 3, stackId: 'fixture-3' },
      idempotencyKey: 'fill-cat-once',
    };
    await apply(server, '/pet/care/apply', fill);
    await apply(server, '/pet/care/apply', fill);
    view = await server.read();
    expect(view.backpack[2]?.stack?.qty).toBe(2);
    expect(view.backpack[3]?.stack).toBeNull();
  });

  it('deducts order lines and grants the co-op wallet reward once', async () => {
    const deepFarm = createEmptyDeepFarmState(192, Date.now());
    const order = deepFarm.orderBoard.orders.find((line) => line && line.requirements.length > 0)!;
    const items = Object.fromEntries(order.requirements.map(({ sku, qty: count }, index) =>
      [index, stack(index, sku, count)]));
    const server = await fixture(items, {}, deepFarm);
    const request = { kind: 'complete_order', orderId: order.orderId, idempotencyKey: 'order-replay-key' };
    const result = await apply(server, '/farm/deep/apply', request);
    expect(result.rewardCoins).toBeGreaterThan(0);
    expect((await apply(server, '/farm/deep/apply', request)).idempotentReplay).toBe(true);
    const after = await server.read();
    expect(after.coins).toBe(10_000 + result.rewardCoins);
    for (const { sku } of order.requirements) expect(qty(after, sku)).toBe(0);
  });

  it('moves gift metadata to the other player’s overflow and keeps merged amounts separate by quality', async () => {
    const full = Object.fromEntries(Array.from({ length: 18 }, (_, index) => [index, stack(index + 40, 'bait_free_worm', 10)]));
    const trait = { provenance: { source: 'orchard', batch: ['A', 1] } };
    const server = await fixture({
      0: stack(0, 'apple', 2, { quality: 'gold', metadata: trait }),
      1: stack(1, 'apple', 2, { quality: 'silver' }),
    }, full);
    const sent = await apply(server, '/mailbox/send', {
      recipientId: nang, body: 'Tặng bạn một quả.', giftItemSku: 'apple', giftQty: 1, giftQuality: 'gold',
      sourceScope: 'personal', idempotencyKey: 'one-apple',
    });
    expect((await server.read()).backpack[0]?.stack?.qty).toBe(1);
    expect((await server.read()).backpack[1]?.stack?.qty).toBe(2);
    const letterId = sent.mailbox.items.find((letter: { kind: string }) => letter.kind === 'gift').id;
    const claim = { letterId, idempotencyKey: 'open-apple' };
    await apply(server, '/mailbox/open', claim, nang);
    await apply(server, '/mailbox/open', claim, nang);
    const overflow = (await server.durable()).v015.physicalInventory[server.worldId].containers['overflow:' + nang];
    expect(Object.values(overflow.slots)).toEqual([expect.objectContaining({ itemSku: 'apple', quality: 'gold', metadata: trait, qty: 1 })]);
  });
});

it('rolls back fully blocked harvests, orchard, livestock, workshops and purchases, then persists an unavoidable catch once', async () => {
  const items = Object.fromEntries(Array.from({ length: 18 }, (_, i) =>
    [i, stack(i, 'apple', 1, { metadata: { batch: i } })]));
  Object.assign(items, {
    0: stack(0, 'tool_hoe', 1, { metadata: { instanceId: 'hoe' } }),
    1: stack(1, 'seed_wheat', 4),
    2: stack(2, 'tool_watering_can', 1, { metadata: { instanceId: 'can' } }),
    3: stack(3, 'sapling_cocoa', 3),
    4: stack(4, 'feed_chicken', 5),
    5: stack(5, 'wheat', 10, { metadata: { batch: 'mill' } }),
    6: stack(6, 'rod_basic', 1, { metadata: { instanceId: 'rod' } }),
    7: stack(7, 'bait_free_worm', 3),
  });
  const server = await fixture(items);
  await apply(server, '/farm/apply', { action: 'till', plotIndex: 0, toolSku: 'tool_hoe',
    physicalSource: { index: 0, stackId: 'fixture-0' } });
  await apply(server, '/farm/apply', { action: 'plant', plotIndex: 0, seedSku: 'seed_wheat',
    physicalSource: { index: 1, stackId: 'fixture-1' } });
  await apply(server, '/farm/apply', { action: 'water', plotIndex: 0, toolSku: 'tool_watering_can',
    physicalSource: { index: 2, stackId: 'fixture-2' } });
  await apply(server, '/farm/deep/apply', { kind: 'plant_tree', slotIndex: 0, saplingSku: 'sapling_cocoa' });
  const adopted = await apply(server, '/farm/deep/apply', { kind: 'adopt_livestock', speciesId: 'chicken', nickname: 'QA' });
  const animalId = adopted.snapshot.livestock.animals[0].animalId;
  await apply(server, '/farm/deep/apply', { kind: 'feed_livestock', animalId, feedSku: 'feed_chicken' });
  await apply(server, '/farm/deep/apply', { kind: 'queue_workshop', workshopId: 'mill', recipeId: 'flour' });
  server.advance(31 * 24 * 60 * 60_000);
  const before = await server.durable();
  for (const [route, params] of [
    ['/farm/apply', { action: 'harvest', plotIndex: 0 }],
    ['/farm/deep/apply', { kind: 'harvest_tree', slotIndex: 0 }],
    ['/farm/deep/apply', { kind: 'collect_livestock', animalId }],
    ['/farm/deep/apply', { kind: 'collect_workshop', workshopId: 'mill' }],
    ['/farm/buy-seed', { itemSku: 'seed_carrot', qty: 1 }],
  ] as const) {
    for (const res of await Promise.all([server.call(route, params), server.call(route, params)])) {
      expect(res.body).toMatchObject({ code: 'FULL', message: 'Ba lô đầy.' });
    }
    expect(await server.durable()).toEqual(before);
  }
  const castId = 'rc31-full-fishing';
  await apply(server, '/donor/fishing/start', { castId, spotId: 'meadow_pond',
    physicalSource: { index: 6, stackId: 'fixture-6' } });
  const reward = await apply(server, '/donor/fishing/resolve', { castId, reelProgressPermille: 1000 });
  expect(reward.overflowUnits).toBe(reward.qtyGranted);
  expect(reward.overflowUnits).toBeGreaterThan(0);
  const after = await server.durable();
  await server.restart();
  expect(await apply(server, '/donor/fishing/resolve', { castId, reelProgressPermille: 1000 }))
    .toMatchObject({ alreadyResolved: true, overflowUnits: reward.qtyGranted });
  expect(await server.durable()).toEqual(after);
  const views = await Promise.all([server.read(), server.read(nang)]);
  expect(views.map((view) => view.overflowUnits)).toEqual([reward.qtyGranted, 0]);
});
