import {
  creditSharedSku,
  donorCollectMillQueue,
  donorFishingPreview,
  donorFishingResolve,
  donorQueueMillRecipe,
  emptyDonorWorkshopState,
  type DonorWorkshopWorldState,
} from '../shared/donor/adapter/olwDonorAuthority';
import type { InventorySnapshot } from '../shared/inventory/inventoryTypes';

export interface DevLanDonorDb {
  donorWorkshop?: Record<string, DonorWorkshopWorldState>;
  donorFishSession?: Record<string, { seed: number; startedAtMs: number }>;
}

function donorRow(db: DevLanDonorDb, worldId: string): DonorWorkshopWorldState {
  db.donorWorkshop ??= {};
  db.donorWorkshop[worldId] ??= emptyDonorWorkshopState();
  return db.donorWorkshop[worldId]!;
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
        level: row.mill.level,
        queue: row.mill.queue,
        recipes: ['olw_flour', 'olw_strawberry_jam'],
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

  if (req.method === 'POST' && route === '/donor/fishing/start') {
    v015.donorFishSession ??= {};
    const seed = Math.floor(Math.random() * 0xffff_ffff);
    v015.donorFishSession[worldId] = { seed, startedAtMs: nowMs };
    const hour = new Date(nowMs).getHours();
    const preview = donorFishingPreview(seed, nowMs, hour);
    saveDb();
    sendJson(res, 200, { ok: true, data: { seed, preview } });
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
    const resolved = donorFishingResolve(session.seed, nowMs, hour, progress);
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