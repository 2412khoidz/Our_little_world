import {
  creditSharedSku,
  donorCollectBakeryQueue,
  donorCollectMillQueue,
  donorCoopCollect,
  donorCoopFeed,
  donorFishingPreview,
  donorFishingResolve,
  donorQueueBakeryRecipe,
  donorQueueMillRecipe,
  emptyDonorWorkshopState,
  type DonorWorkshopWorldState,
} from '../shared/donor/adapter/olwDonorAuthority';
import { emptyHollowCoopState } from '../shared/donor/harvest-hollow-9b23e1a/hollowCoopCycle';
import { parseDonorFishingSpot } from '../shared/donor/donorFishingSpots';
import type { InventorySnapshot } from '../shared/inventory/inventoryTypes';

export interface DevLanDonorDb {
  donorWorkshop?: Record<string, DonorWorkshopWorldState>;
  donorFishSession?: Record<string, { seed: number; startedAtMs: number; spotId: ReturnType<typeof parseDonorFishingSpot> }>;
}

function donorRow(db: DevLanDonorDb, worldId: string): DonorWorkshopWorldState {
  db.donorWorkshop ??= {};
  const existing = db.donorWorkshop[worldId];
  if (!existing) {
    db.donorWorkshop[worldId] = emptyDonorWorkshopState();
    return db.donorWorkshop[worldId]!;
  }
  if (!existing.bakery) existing.bakery = { level: 1, queue: [] };
  if (!existing.coop) existing.coop = emptyHollowCoopState();
  return existing;
}

export async function tryHandleDonorDevLan(ctx: {
  req: import('node:http').IncomingMessage;
  res: import('node:http').ServerResponse;
  route: string;
  body: Record<string, unknown>;
  worldId: string;
  v015: DevLanDonorDb & Record<string, unknown>;
  sendJson: (res: import('node:http').ServerResponse, status: number, payload: unknown) => void;
  getInventoryList: (worldId: string) => InventorySnapshot['items'];
  setInventoryList: (worldId: string, items: InventorySnapshot['items']) => void;
  saveDb: () => void;
  isWorldMember: (worldId: string, userId: string) => boolean;
  userId: string;
}): Promise<boolean> {
  const { req, res, route, body, worldId, v015, sendJson, getInventoryList, setInventoryList, saveDb, isWorldMember, userId } =
    ctx;
  if (!route.startsWith('/donor/')) return false;
  if (!worldId || !isWorldMember(worldId, userId)) {
    sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
    return true;
  }
  const nowMs = Date.now();

  if (req.method === 'GET' && route === '/donor/workshop') {
    const row = donorRow(v015, worldId);
    sendJson(res, 200, {
      ok: true,
      data: {
        mill: { level: row.mill.level, queue: row.mill.queue, recipes: ['olw_flour', 'olw_strawberry_jam'] },
        bakery: { level: row.bakery.level, queue: row.bakery.queue, recipes: ['olw_bread', 'olw_chicken_feed'] },
        coop: row.coop,
        nowMs,
      },
    });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/workshop/queue') {
    const recipeId = String(body.recipeId ?? 'olw_flour');
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorQueueMillRecipe(row, items, worldId, recipeId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      saveDb();
      sendJson(res, 200, { ok: true, data: { queue: out.world.mill.queue } });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'QUEUE_FAILED', message: e instanceof Error ? e.message : 'Lỗi xếp hàng' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/workshop/collect') {
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    const out = donorCollectMillQueue(row, items, worldId, nowMs);
    v015.donorWorkshop![worldId] = out.world;
    setInventoryList(worldId, out.items);
    saveDb();
    sendJson(res, 200, { ok: true, data: { queue: out.world.mill.queue } });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/bakery/queue') {
    const recipeId = String(body.recipeId ?? 'olw_bread');
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorQueueBakeryRecipe(row, items, worldId, recipeId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      saveDb();
      sendJson(res, 200, { ok: true, data: { queue: out.world.bakery.queue } });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'QUEUE_FAILED', message: e instanceof Error ? e.message : 'Lỗi xếp hàng' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/bakery/collect') {
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    const out = donorCollectBakeryQueue(row, items, worldId, nowMs);
    v015.donorWorkshop![worldId] = out.world;
    setInventoryList(worldId, out.items);
    saveDb();
    sendJson(res, 200, { ok: true, data: { queue: out.world.bakery.queue } });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/coop/feed') {
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorCoopFeed(row, items, worldId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      saveDb();
      sendJson(res, 200, { ok: true, data: { coop: out.world.coop } });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'COOP_FEED', message: e instanceof Error ? e.message : 'Không cho gà ăn được' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/coop/collect') {
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorCoopCollect(row, items, worldId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      saveDb();
      sendJson(res, 200, { ok: true, data: { eggs: out.eggs, coop: out.world.coop } });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'COOP_COLLECT', message: e instanceof Error ? e.message : 'Chưa có trứng' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/fishing/start') {
    v015.donorFishSession ??= {};
    const spotId = parseDonorFishingSpot(body.spotId);
    const seed = Math.floor(Math.random() * 0xffff_ffff);
    v015.donorFishSession[worldId] = { seed, startedAtMs: nowMs, spotId };
    const hour = new Date(nowMs).getHours();
    const preview = donorFishingPreview(seed, nowMs, hour, spotId);
    saveDb();
    sendJson(res, 200, { ok: true, data: { seed, spotId: preview.spotId, preview: { name: preview.name, critterId: preview.critterId } } });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/fishing/resolve') {
    v015.donorFishSession ??= {};
    const session = v015.donorFishSession[worldId];
    if (!session) {
      sendJson(res, 400, { ok: false, code: 'NO_SESSION', message: 'Chưa câu — hãy quăng cần trước.' });
      return true;
    }
    const progress = Number(body.reelProgressPermille ?? 0);
    const hour = new Date(nowMs).getHours();
    const resolved = donorFishingResolve(session.seed, nowMs, hour, progress, session.spotId);
    delete v015.donorFishSession[worldId];
    let items = getInventoryList(worldId);
    if (!resolved.escaped && resolved.itemSku) {
      items = creditSharedSku(worldId, items, resolved.itemSku, 1, nowMs);
      setInventoryList(worldId, items);
    }
    saveDb();
    sendJson(res, 200, { ok: true, data: resolved });
    return true;
  }

  sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy API donor.' });
  return true;
}