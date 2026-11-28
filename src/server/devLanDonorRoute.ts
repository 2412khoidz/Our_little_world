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
  type DonorFishingPreviewResult,
  type DonorFishingResolveResult,
  type DonorWorkshopWorldState,
} from '../shared/donor/adapter/olwDonorAuthority';
import { emptyHollowCoopState } from '../shared/donor/harvest-hollow-9b23e1a/hollowCoopCycle';
import type { DonorFishSessionView } from '../shared/donor/donorFishSessionTypes';
import { parseDonorFishingSpot, type DonorFishingSpotId } from '../shared/donor/donorFishingSpots';
import type { TidefallFishingPhase } from '../shared/donor/tidefall-phaser/tidefallFishingFsm';
import type { TidefallFishRarity } from '../shared/donor/tidefall-phaser/tidefallFishCatalog';
import type { InventorySnapshot } from '../shared/inventory/inventoryTypes';

export interface DonorFishSessionRecord {
  seed: number;
  startedAtMs: number;
  spotId: DonorFishingSpotId;
  critterId?: string;
  itemSku?: string;
  previewName: string;
  labelVi?: string;
  rarity?: TidefallFishRarity;
  spriteUrl?: string;
  resolved?: boolean;
  resolvedResult?: DonorFishingResolveResult | null;
  phase: TidefallFishingPhase;
  progressPermille: number;
  pointerNorm: number;
  targetCenter?: number;
  targetWidth?: number;
  pointerDir?: number;
  pointerSpeed?: number;
  anglerUserId: string;
  updatedAtMs: number;
}

export interface DevLanDonorDb {
  donorWorkshop?: Record<string, DonorWorkshopWorldState>;
  donorFishSession?: Record<string, DonorFishSessionRecord>;
}

function donorFishSessionView(row: DonorFishSessionRecord): DonorFishSessionView {
  return {
    spotId: row.spotId,
    previewName: row.previewName,
    phase: row.phase,
    progressPermille: row.progressPermille,
    pointerNorm: row.pointerNorm,
    targetCenter: row.targetCenter,
    targetWidth: row.targetWidth,
    pointerDir: row.pointerDir,
    pointerSpeed: row.pointerSpeed,
    labelVi: row.resolvedResult?.labelVi ?? row.labelVi,
    rarity: row.resolvedResult?.rarity ?? row.rarity,
    spriteUrl: row.resolvedResult?.spriteUrl ?? row.spriteUrl,
    escaped: row.resolvedResult?.escaped,
    anglerUserId: row.anglerUserId,
    updatedAtMs: row.updatedAtMs,
  };
}

function parseTidefallPhase(raw: unknown): TidefallFishingPhase {
  const p = String(raw ?? 'idle');
  const allowed: TidefallFishingPhase[] = ['idle', 'casting', 'waiting', 'bite', 'minigame', 'landed', 'escaped'];
  return allowed.includes(p as TidefallFishingPhase) ? (p as TidefallFishingPhase) : 'idle';
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
  broadcastEvent?: (worldId: string, event: string, data: unknown, excludeSessionId?: string | null) => void;
  bumpWorldStateVersion?: (
    worldId: string,
    domain: string,
  ) => { stateVersion: number; domainVersions: Record<string, number> };
  checkV015Idempotency?: (
    v015: unknown,
    worldId: string,
    userId: string,
    action: string,
    key: string,
    reqHash: string,
  ) => { conflict: boolean; response?: unknown } | null;
  saveV015Idempotency?: (
    v015: unknown,
    worldId: string,
    userId: string,
    action: string,
    key: string,
    reqHash: string,
    response: unknown,
  ) => void;
  isWorldMember: (worldId: string, userId: string) => boolean;
  userId: string;
}): Promise<boolean> {
  const {
    req,
    res,
    route,
    body,
    worldId,
    v015,
    sendJson,
    getInventoryList,
    setInventoryList,
    saveDb,
    broadcastEvent,
    bumpWorldStateVersion,
    checkV015Idempotency,
    saveV015Idempotency,
    isWorldMember,
    userId,
  } = ctx;

  function emitDonorInventoryMutated() {
    const meta = bumpWorldStateVersion?.(worldId, 'inventory');
    broadcastEvent?.(
      worldId,
      'world_mutated',
      meta ? { reason: 'inventory', stateVersion: meta.stateVersion, domainVersions: meta.domainVersions } : { reason: 'inventory' },
    );
  }

  function checkDonorIdem(action: string, reqHash: string): boolean {
    const key = String(body.idempotencyKey ?? '').trim();
    if (!key || !checkV015Idempotency) return false;
    const prior = checkV015Idempotency(v015, worldId, userId, action, key, reqHash);
    if (!prior) return false;
    if (prior.conflict) {
      sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác thao tác.' });
      return true;
    }
    sendJson(res, 200, { ok: true, data: prior.response });
    return true;
  }

  function saveDonorIdem(action: string, reqHash: string, response: unknown): void {
    const key = String(body.idempotencyKey ?? '').trim();
    if (key && saveV015Idempotency) {
      saveV015Idempotency(v015, worldId, userId, action, key, reqHash, response);
    }
  }
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
    if (checkDonorIdem('donor_mill_queue', recipeId)) return true;
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorQueueMillRecipe(row, items, worldId, recipeId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      const data = { queue: out.world.mill.queue };
      saveDonorIdem('donor_mill_queue', recipeId, data);
      emitDonorInventoryMutated();
      saveDb();
      sendJson(res, 200, { ok: true, data });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'QUEUE_FAILED', message: e instanceof Error ? e.message : 'Lỗi xếp hàng' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/workshop/collect') {
    if (checkDonorIdem('donor_mill_collect', 'collect')) return true;
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    const out = donorCollectMillQueue(row, items, worldId, nowMs);
    v015.donorWorkshop![worldId] = out.world;
    setInventoryList(worldId, out.items);
    const data = { queue: out.world.mill.queue };
    saveDonorIdem('donor_mill_collect', 'collect', data);
    emitDonorInventoryMutated();
    saveDb();
    sendJson(res, 200, { ok: true, data });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/bakery/queue') {
    const recipeId = String(body.recipeId ?? 'olw_bread');
    if (checkDonorIdem('donor_bakery_queue', recipeId)) return true;
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorQueueBakeryRecipe(row, items, worldId, recipeId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      const data = { queue: out.world.bakery.queue };
      saveDonorIdem('donor_bakery_queue', recipeId, data);
      emitDonorInventoryMutated();
      saveDb();
      sendJson(res, 200, { ok: true, data });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'QUEUE_FAILED', message: e instanceof Error ? e.message : 'Lỗi xếp hàng' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/bakery/collect') {
    if (checkDonorIdem('donor_bakery_collect', 'collect')) return true;
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    const out = donorCollectBakeryQueue(row, items, worldId, nowMs);
    v015.donorWorkshop![worldId] = out.world;
    setInventoryList(worldId, out.items);
    const data = { queue: out.world.bakery.queue };
    saveDonorIdem('donor_bakery_collect', 'collect', data);
    emitDonorInventoryMutated();
    saveDb();
    sendJson(res, 200, { ok: true, data });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/coop/feed') {
    if (checkDonorIdem('donor_coop_feed', 'feed')) return true;
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorCoopFeed(row, items, worldId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      const data = { coop: out.world.coop };
      saveDonorIdem('donor_coop_feed', 'feed', data);
      emitDonorInventoryMutated();
      saveDb();
      sendJson(res, 200, { ok: true, data });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'COOP_FEED', message: e instanceof Error ? e.message : 'Không cho gà ăn được' });
    }
    return true;
  }

  if (req.method === 'POST' && route === '/donor/coop/collect') {
    if (checkDonorIdem('donor_coop_collect', 'collect')) return true;
    const row = donorRow(v015, worldId);
    const items = getInventoryList(worldId);
    try {
      const out = donorCoopCollect(row, items, worldId, nowMs);
      v015.donorWorkshop![worldId] = out.world;
      setInventoryList(worldId, out.items);
      const data = { eggs: out.eggs, coop: out.world.coop };
      saveDonorIdem('donor_coop_collect', 'collect', data);
      emitDonorInventoryMutated();
      saveDb();
      sendJson(res, 200, { ok: true, data });
    } catch (e) {
      sendJson(res, 400, { ok: false, code: 'COOP_COLLECT', message: e instanceof Error ? e.message : 'Chưa có trứng' });
    }
    return true;
  }

  if (req.method === 'GET' && route === '/donor/fishing/session') {
    v015.donorFishSession ??= {};
    const row = v015.donorFishSession[worldId];
    sendJson(res, 200, { ok: true, data: row ? donorFishSessionView(row) : null });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/fishing/sync') {
    v015.donorFishSession ??= {};
    const row = v015.donorFishSession[worldId];
    if (!row) {
      sendJson(res, 400, { ok: false, code: 'NO_SESSION', message: 'Chưa có phiên câu — hãy quăng cần trước.' });
      return true;
    }
    if (row.anglerUserId !== userId || (body.roundSeed !== undefined && body.roundSeed !== row.seed)) {
      sendJson(res, 409, { ok: false, code: 'FISHING_ROUND_CHANGED', message: 'Lượt câu đã thay đổi. Hãy quăng cần lại.' });
      return true;
    }
    if (row.resolved) {
      sendJson(res, 200, { ok: true, data: donorFishSessionView(row) });
      return true;
    }
    const phase = parseTidefallPhase(body.phase);
    row.phase = phase;
    row.progressPermille = Math.max(0, Math.min(1000, Math.round(Number(body.progressPermille ?? row.progressPermille))));
    row.pointerNorm = Math.max(0, Math.min(1, Number(body.pointerNorm ?? row.pointerNorm)));
    if (typeof body.targetCenter === 'number' && Number.isFinite(body.targetCenter)) {
      row.targetCenter = Math.max(0.05, Math.min(0.95, body.targetCenter));
    }
    if (typeof body.targetWidth === 'number' && Number.isFinite(body.targetWidth)) {
      row.targetWidth = Math.max(0.08, Math.min(0.6, body.targetWidth));
    }
    if (body.pointerDir === 1 || body.pointerDir === -1) {
      row.pointerDir = body.pointerDir;
    }
    if (typeof body.pointerSpeed === 'number' && Number.isFinite(body.pointerSpeed)) {
      row.pointerSpeed = Math.max(0.2, Math.min(4, body.pointerSpeed));
    }
    row.updatedAtMs = nowMs;
    const view = donorFishSessionView(row);
    broadcastEvent?.(worldId, 'donor_fishing_sync', view);
    sendJson(res, 200, { ok: true, data: view });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/fishing/start') {
    v015.donorFishSession ??= {};
    const spotId = parseDonorFishingSpot(body.spotId);
    const seed = Math.floor(Math.random() * 0xffff_ffff);
    const hour = new Date(nowMs).getHours();
    const preview = donorFishingPreview(seed, nowMs, hour, spotId);
    v015.donorFishSession[worldId] = {
      seed,
      startedAtMs: nowMs,
      spotId: preview.spotId,
      critterId: preview.critterId,
      itemSku: preview.itemSku,
      previewName: preview.name,
      labelVi: preview.labelVi,
      rarity: preview.rarity,
      spriteUrl: preview.spriteUrl,
      resolved: false,
      resolvedResult: null,
      phase: 'casting',
      progressPermille: 0,
      pointerNorm: 0.12,
      anglerUserId: userId,
      updatedAtMs: nowMs,
    };
    saveDb();
    broadcastEvent?.(worldId, 'donor_fishing_sync', donorFishSessionView(v015.donorFishSession[worldId]!));
    sendJson(res, 200, {
      ok: true,
      data: {
        seed,
        spotId: preview.spotId,
        preview: {
          name: preview.name,
          critterId: preview.critterId,
          itemSku: preview.itemSku,
          labelVi: preview.labelVi,
          rarity: preview.rarity,
          spriteUrl: preview.spriteUrl,
        },
      },
    });
    return true;
  }

  if (req.method === 'POST' && route === '/donor/fishing/resolve') {
    v015.donorFishSession ??= {};
    const session = v015.donorFishSession[worldId];
    if (!session) {
      sendJson(res, 400, { ok: false, code: 'NO_SESSION', message: 'Chưa câu — hãy quăng cần trước.' });
      return true;
    }
    if (session.anglerUserId !== userId || (body.roundSeed !== undefined && body.roundSeed !== session.seed)) {
      sendJson(res, 409, { ok: false, code: 'FISHING_ROUND_CHANGED', message: 'Lượt câu đã thay đổi. Hãy quăng cần lại.' });
      return true;
    }
    // Idempotency guard: replay exact authoritative result without duplicate inventory grant.
    if (session.resolved && session.resolvedResult) {
      sendJson(res, 200, { ok: true, data: { ...session.resolvedResult, alreadyResolved: true } });
      return true;
    }
    const progress = Number(body.reelProgressPermille ?? 0);
    const hour = new Date(nowMs).getHours();
    const lockedEncounter: Partial<DonorFishingPreviewResult> | undefined =
      session.critterId && session.itemSku
        ? {
            critterId: session.critterId,
            name: session.previewName,
            itemSku: session.itemSku,
            labelVi: session.labelVi,
            rarity: session.rarity,
            spriteUrl: session.spriteUrl,
          }
        : undefined;
    const resolved = donorFishingResolve(session.seed, nowMs, hour, progress, session.spotId, lockedEncounter);
    const items = !resolved.escaped && resolved.itemSku
      ? creditSharedSku(worldId, getInventoryList(worldId), resolved.itemSku, resolved.qtyGranted, nowMs)
      : null;
    session.phase = resolved.escaped ? 'escaped' : 'landed';
    session.progressPermille = progress;
    session.updatedAtMs = nowMs;
    session.resolved = true;
    session.resolvedResult = resolved;
    if (items) {
      setInventoryList(worldId, items);
      emitDonorInventoryMutated();
    }
    saveDb();
    broadcastEvent?.(worldId, 'donor_fishing_sync', donorFishSessionView(session));
    sendJson(res, 200, { ok: true, data: resolved });
    return true;
  }

  sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Không tìm thấy API donor.' });
  return true;
}