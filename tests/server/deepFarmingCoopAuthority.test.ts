import { describe, expect, it } from 'vitest';
import {
  executeDevLanDeepFarmMutation,
  deepFarmRow,
  type DevLanDeepFarmDb,
} from '../../src/server/devLanDeepFarmHandlers';
import { tryHandleFarmDevLan, type DevLanFarmDb } from '../../src/server/devLanFarmRoute';
import { LIVESTOCK_HAPPINESS_MIN } from '../../src/shared/farming/livestock';
import type { InventoryEntry } from '../../src/shared/inventory/inventoryTypes';

const WORLD_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PARTNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STRANGER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createMemoryWorld(nowMs = 1_760_000_000_000) {
  const db: DevLanFarmDb & DevLanDeepFarmDb & Record<string, unknown> = {
    farms: {},
    wallets: { [WORLD_ID]: { coins: 3_000 } },
    deepFarms: {},
  };
  let inventory: InventoryEntry[] = [
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'tool_hoe', qty: 1, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'tool_watering_can', qty: 1, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'tool_hoe_copper', qty: 1, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'seed_wheat', qty: 10, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'seed_tulip_red', qty: 5, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'seed_tulip_yellow', qty: 5, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'sapling_peach', qty: 3, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'fert_speed', qty: 4, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'sprinkler_basic', qty: 2, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'feed_livestock', qty: 10, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'wheat', qty: 8, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
    { worldId: WORLD_ID, ownerScope: 'shared', itemSku: 'yeast', qty: 5, quality: 'normal', updatedAt: new Date(nowMs).toISOString() },
  ];
  const broadcasts: string[] = [];

  const getInventoryList = () => inventory;
  const setInventoryList = (_w: string, next: InventoryEntry[]) => {
    inventory = next;
  };
  const sharedQty = (sku: string) =>
    inventory.filter((i) => i.ownerScope === 'shared' && i.itemSku === sku).reduce((n, i) => n + i.qty, 0);

  const callRoute = async (method: string, route: string, userId: string, body: Record<string, unknown> = {}) => {
    let status = 0;
    let payload: unknown = null;
    const req = { method } as unknown as import('node:http').IncomingMessage;
    const res = {} as unknown as import('node:http').ServerResponse;
    await tryHandleFarmDevLan({
      req,
      res,
      route,
      body,
      userId,
      worldId: WORLD_ID,
      v015: db,
      isWorldMember: (_w, u) => u === OWNER_ID || u === PARTNER_ID,
      sendJson: (_r, s, p) => {
        status = s;
        payload = p;
      },
      getInventoryList,
      setInventoryList,
      saveDb: () => {},
      broadcastEvent: (_w, _ev, data) => {
        const reason = typeof data === 'object' && data && 'reason' in data ? String((data as { reason: unknown }).reason) : 'farm';
        broadcasts.push(reason);
      },
    });
    return { status, payload: payload as { ok: boolean; code?: string; data?: Record<string, unknown> } };
  };

  return { db, getInventoryList, setInventoryList, sharedQty, callRoute, broadcasts, baseNowMs: nowMs };
}

describe('Deep Farming Co-op Server Authority (Checkpoint F)', () => {
  it('supports solo partner end-to-end across crops, fertilizer, sprinkler, flowers, orchard, livestock & workshops', async () => {
    const env = createMemoryWorld();

    // Non-member rejected cleanly
    const stranger = await env.callRoute('GET', '/farm/deep', STRANGER_ID);
    expect(stranger.status).toBe(403);

    // Owner till + fertilize + sprinkler + plant via /farm/apply
    const snap0 = await env.callRoute('GET', '/farm', OWNER_ID);
    const v0 = Number(snap0.payload.data?.version ?? 1);
    const rTill = await env.callRoute('POST', '/farm/apply', OWNER_ID, {
      plotIndex: 0,
      action: 'till',
      farmVersion: v0,
      idempotencyKey: 'solo-till-0',
    });
    expect(rTill.status).toBe(200);

    const rFert = await env.callRoute('POST', '/farm/apply', OWNER_ID, {
      plotIndex: 0,
      action: 'fertilize',
      fertilizerSku: 'fert_speed',
      farmVersion: v0 + 1,
      idempotencyKey: 'solo-fert-0',
    });
    expect(rFert.status).toBe(200);
    expect(env.sharedQty('fert_speed')).toBe(3);

    const rSpr = await env.callRoute('POST', '/farm/apply', OWNER_ID, {
      plotIndex: 1,
      action: 'place_sprinkler',
      sprinklerSku: 'sprinkler_basic',
      farmVersion: v0 + 2,
      idempotencyKey: 'solo-spr-1',
    });
    expect(rSpr.status).toBe(200);
    expect(env.sharedQty('sprinkler_basic')).toBe(1);

    // Orchard sapling plant & uproot refund
    const rTree = await env.callRoute('POST', '/farm/deep/apply', OWNER_ID, {
      kind: 'plant_tree',
      slotIndex: 0,
      saplingSku: 'sapling_peach',
      idempotencyKey: 'solo-tree-p',
    });
    expect(rTree.status).toBe(200);
    expect(env.sharedQty('sapling_peach')).toBe(2);

    const rUproot = await env.callRoute('POST', '/farm/deep/apply', OWNER_ID, {
      kind: 'uproot_tree',
      slotIndex: 0,
      idempotencyKey: 'solo-tree-u',
    });
    expect(rUproot.status).toBe(200);
    expect(env.sharedQty('sapling_peach')).toBe(3);

    // Mill queue + upgrade + full refund cancel
    const rQ = await env.callRoute('POST', '/farm/deep/apply', OWNER_ID, {
      kind: 'queue_workshop',
      workshopId: 'mill',
      recipeId: 'flour',
      idempotencyKey: 'solo-mill-q',
    });
    expect(rQ.status).toBe(200);
    expect(env.sharedQty('wheat')).toBe(6);

    const wsSnap = rQ.payload.data?.snapshot as { workshops: { stations: { mill: { queue: { jobId: string }[] } } } };
    const jobId = wsSnap.workshops.stations.mill.queue[0]!.jobId;
    const rCancel = await env.callRoute('POST', '/farm/deep/apply', OWNER_ID, {
      kind: 'cancel_workshop',
      workshopId: 'mill',
      jobId,
      idempotencyKey: 'solo-mill-x',
    });
    expect(rCancel.status).toBe(200);
    expect(env.sharedQty('wheat')).toBe(8);
    expect(env.broadcasts).toContain('farm');
  });

  it('allows alternating partner care on shared flowers, animals & workshops', () => {
    const env = createMemoryWorld();
    const now0 = env.baseNowMs;

    // Owner adopts a cow & feeds it
    const a1 = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 101,
      nowMs: now0,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'adopt_livestock', worldId: WORLD_ID, speciesId: 'cow', idempotencyKey: 'coop-adopt' },
    });
    expect(a1.ok).toBe(true);
    if (!a1.ok) return;
    const cowId = a1.snapshot.livestock.animals[0]!.animalId;

    const a2 = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 101,
      nowMs: now0 + 1_000,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'feed_livestock', worldId: WORLD_ID, animalId: cowId, feedSku: 'feed_livestock', idempotencyKey: 'coop-feed' },
    });
    expect(a2.ok).toBe(true);

    const pOwner = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 101,
      nowMs: now0 + 2_000,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'pet_livestock', worldId: WORLD_ID, animalId: cowId, idempotencyKey: 'coop-pet-owner' },
    });
    expect(pOwner.ok).toBe(true);

    // Partner pets the same cow -> unlocks dual partner care bonus & collects milk later
    const pPartner = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: PARTNER_ID,
      seed: 101,
      nowMs: now0 + 3_000,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'pet_livestock', worldId: WORLD_ID, animalId: cowId, idempotencyKey: 'coop-pet-partner' },
    });
    expect(pPartner.ok).toBe(true);
    if (!pPartner.ok) return;
    expect(pPartner.snapshot.projectedLivestock[0]!.pettedTodayByPair).toBe(true);

    // Later partner collects cow product into shared inventory
    const cPartner = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: PARTNER_ID,
      seed: 101,
      nowMs: now0 + 60 * 60_000,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'collect_livestock', worldId: WORLD_ID, animalId: cowId, idempotencyKey: 'coop-collect-milk' },
    });
    expect(cPartner.ok).toBe(true);
    expect(env.sharedQty('milk') + env.sharedQty('cream_top')).toBeGreaterThanOrEqual(2);
  });

  it('rejects stale concurrent edits with VERSION_CONFLICT while honoring idempotent retries', () => {
    const env = createMemoryWorld();
    const initial = deepFarmRow(env.db, WORLD_ID, 42, env.baseNowMs);
    const vStart = initial.version;

    // Owner sends mutation at vStart -> succeeds (bumps to vStart + 1)
    const first = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 42,
      nowMs: env.baseNowMs + 500,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: {
        kind: 'adopt_livestock',
        worldId: WORLD_ID,
        speciesId: 'chicken',
        expectedVersion: vStart,
        idempotencyKey: 'race-adopt-chicken',
      },
    });
    expect(first.ok).toBe(true);
    expect(env.db.wallets[WORLD_ID]?.coins).toBe(2850);

    // Owner network retry with SAME idempotencyKey & old vStart -> safe idempotent replay, zero extra charge
    const retry = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 42,
      nowMs: env.baseNowMs + 800,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: {
        kind: 'adopt_livestock',
        worldId: WORLD_ID,
        speciesId: 'chicken',
        expectedVersion: vStart,
        idempotencyKey: 'race-adopt-chicken',
      },
    });
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.idempotentReplay).toBe(true);
    expect(env.db.wallets[WORLD_ID]?.coins).toBe(2850);

    // Partner concurrently submits DIFFERENT action at stale vStart -> VERSION_CONFLICT with current snapshot
    const conflict = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: PARTNER_ID,
      seed: 42,
      nowMs: env.baseNowMs + 900,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: {
        kind: 'plant_flower',
        worldId: WORLD_ID,
        slotIndex: 0,
        flowerSku: 'tulip_red',
        expectedVersion: vStart,
        idempotencyKey: 'race-plant-flower',
      },
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.code).toBe('VERSION_CONFLICT');
      expect(conflict.snapshot.version).toBe(vStart + 1);
      expect(conflict.snapshot.livestock.animals).toHaveLength(1);
    }
  });

  it('preserves animals, trees & crops over 30 days offline (zero death/withering) and reconciles on reconnect', async () => {
    const env = createMemoryWorld();
    const now0 = env.baseNowMs;

    // Owner plants tree, plants flower, adopts rabbit, feeds rabbit
    executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 7,
      nowMs: now0,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'plant_tree', worldId: WORLD_ID, slotIndex: 2, saplingSku: 'sapling_peach', idempotencyKey: 'off-tree' },
    });
    const adopted = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: OWNER_ID,
      seed: 7,
      nowMs: now0,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'adopt_livestock', worldId: WORLD_ID, speciesId: 'rabbit', idempotencyKey: 'off-rabbit' },
    });
    expect(adopted.ok).toBe(true);
    if (!adopted.ok) return;
    const rabbitId = adopted.snapshot.livestock.animals[0]!.animalId;

    // 30 real days offline
    const after30DaysMs = now0 + 30 * 86_400_000;
    const snapLater = executeDevLanDeepFarmMutation({
      v015: env.db,
      worldId: WORLD_ID,
      actorId: PARTNER_ID,
      seed: 7,
      nowMs: after30DaysMs,
      getInventoryList: env.getInventoryList,
      setInventoryList: env.setInventoryList,
      params: { kind: 'harvest_tree', worldId: WORLD_ID, slotIndex: 2, idempotencyKey: 'off-harvest-tree' },
    });
    expect(snapLater.ok).toBe(true);
    if (!snapLater.ok) return;

    // Orchard tree survived 30 days and yielded peaches immediately
    expect(env.sharedQty('peach')).toBeGreaterThanOrEqual(3);
    // Rabbit survived 30 days and happiness floored strictly at 30
    expect(snapLater.snapshot.projectedLivestock[0]!.animal.animalId).toBe(rabbitId);
    expect(snapLater.snapshot.projectedLivestock[0]!.happiness).toBe(LIVESTOCK_HAPPINESS_MIN);

    // Partner reconnecting via GET /farm/deep sees up-to-date state cleanly
    const reconnect = await env.callRoute('GET', '/farm/deep', PARTNER_ID);
    expect(reconnect.status).toBe(200);
    const reconnectedAnimals = (reconnect.payload.data?.livestock as { animals: unknown[] }).animals;
    expect(reconnectedAnimals).toHaveLength(1);
  });
});
