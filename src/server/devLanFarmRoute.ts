import { vietnamDayIndex } from '../shared/economy/shippingBin';
import {
  applyFarmShippingBinSale,
  type FarmShippingMeta,
} from '../shared/farming/farmShipping';
import {
  applyFarmAction,
  buildFarmSnapshot,
  buySeed,
  emptyFarm,
  FARM_STARTER_COINS,
  sellCropLine,
} from '../shared/farming/serverApply';
import type { FarmApplyParams } from '../shared/farming/farmSnapshotTypes';
import { isFarmPlotIndexOnContractSoil, isValidFarmPlotIndex } from '../shared/farming/farmPlotIndex';
import type { InventorySnapshot } from '../shared/inventory/inventoryTypes';
import { handleDeepFarmDevLanRoute, type DeepFarmIdempotency, type DevLanDeepFarmDb } from './devLanDeepFarmHandlers';

export interface DevLanFarmDb extends DevLanDeepFarmDb {
  farms: Record<string, { seed: number; version: number; farm: ReturnType<typeof emptyFarm> }>;
  wallets: Record<string, { coins: number }>;
  shippingBin?: Record<string, FarmShippingMeta>;
  farmShipKeys?: Record<string, string[]>;
}

export function ensureFarmDb(v015: DevLanFarmDb): DevLanFarmDb {
  v015.farms ??= {};
  v015.wallets ??= {};
  return v015;
}

function shippingMeta(v015: DevLanFarmDb, worldId: string, nowMs: number): FarmShippingMeta {
  v015.shippingBin ??= {};
  const row = v015.shippingBin[worldId] ?? { soldByGroup: {}, dayIndex: vietnamDayIndex(nowMs) };
  v015.shippingBin[worldId] = row;
  return row;
}

function farmRow(v015: DevLanFarmDb, worldId: string) {
  ensureFarmDb(v015);
  if (!v015.farms[worldId]) {
    const seed = Math.floor(Math.random() * 0xffff_ffff);
    v015.farms[worldId] = { seed, version: 1, farm: emptyFarm(seed) };
    v015.wallets[worldId] ??= { coins: FARM_STARTER_COINS };
  }
  return v015.farms[worldId]!;
}

export async function tryHandleFarmDevLan(ctx: {
  req: import('node:http').IncomingMessage;
  res: import('node:http').ServerResponse;
  route: string;
  body: Record<string, unknown>;
  userId: string;
  worldId: string;
  v015: DevLanFarmDb & Record<string, unknown>;
  isWorldMember: (worldId: string, userId: string) => boolean;
  sendJson: (res: import('node:http').ServerResponse, status: number, payload: unknown) => void;
  getInventoryList: (worldId: string) => InventorySnapshot['items'];
  setInventoryList: (worldId: string, items: InventorySnapshot['items']) => void;
  saveDb: () => void;
  broadcastEvent?: (worldId: string, event: string, data: unknown, excludeSessionId?: string | null) => void;
  bumpWorldStateVersion?: (
    worldId: string,
    domain: string,
  ) => { stateVersion: number; domainVersions: Record<string, number> };
} & DeepFarmIdempotency): Promise<boolean> {
  const {
    req,
    res,
    route,
    body,
    userId,
    worldId,
    v015,
    isWorldMember,
    sendJson,
    getInventoryList,
    setInventoryList,
    saveDb,
    broadcastEvent,
    bumpWorldStateVersion,
    checkV015Idempotency,
    saveV015Idempotency,
  } = ctx;

  function emitFarmMutated() {
    bumpWorldStateVersion?.(worldId, 'inventory');
    const meta = bumpWorldStateVersion?.(worldId, 'farm');
    broadcastEvent?.(
      worldId,
      'world_mutated',
      meta ? { reason: 'farm', stateVersion: meta.stateVersion, domainVersions: meta.domainVersions } : { reason: 'farm' },
    );
  }

  if (!worldId || !isWorldMember(worldId, userId)) {
    if (route.startsWith('/farm')) {
      sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
      return true;
    }
    return false;
  }

  ensureFarmDb(v015);
  const nowMs = Date.now();
  const fastGrow = process.env.OLW_FARM_DEV_FAST_GROW !== '0';
  const timeScale = fastGrow ? 120 : 1;

  if (route === '/farm/deep' || route === '/farm/deep/apply') {
    const row = farmRow(v015, worldId);
    return handleDeepFarmDevLanRoute({
      req,
      res,
      route,
      body,
      userId,
      worldId,
      seed: row.seed,
      v015,
      isWorldMember,
      sendJson: sendJson as (res: unknown, status: number, payload: unknown) => void,
      getInventoryList,
      setInventoryList,
      saveDb,
      broadcastEvent,
      bumpWorldStateVersion,
      checkV015Idempotency,
      saveV015Idempotency,
      nowMs,
    });
  }

  if (req.method === 'GET' && route === '/farm') {
    const newFarm = !v015.farms[worldId];
    const row = farmRow(v015, worldId);
    if (newFarm) saveDb();
    const coins = v015.wallets[worldId]?.coins ?? 0;
    sendJson(res, 200, {
      ok: true,
      data: buildFarmSnapshot(worldId, row.version, row.farm, coins, nowMs, timeScale),
    });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/apply') {
    const plotIndex = Number(body.plotIndex);
    const action = String(body.action ?? '') as FarmApplyParams['action'];
    const seedSku = body.seedSku ? String(body.seedSku) : null;
    const fertilizerSku = (body.fertilizerSku ? String(body.fertilizerSku) : null) as FarmApplyParams['fertilizerSku'];
    const sprinklerSku = (body.sprinklerSku ? String(body.sprinklerSku) : null) as FarmApplyParams['sprinklerSku'];
    const toolSku = body.toolSku ? String(body.toolSku) : null;
    const useEnvironment = typeof body.useEnvironment === 'boolean' ? body.useEnvironment : true;
    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    const reqHash = JSON.stringify([plotIndex, action, seedSku, fertilizerSku, sprinklerSku, toolSku, useEnvironment,
      ...(body.physicalSource ? [body.physicalSource] : []),
    ]);
    if (idempotencyKey && checkV015Idempotency) {
      const prior = checkV015Idempotency(v015, worldId, userId, 'farm_apply', idempotencyKey, reqHash);
      if (prior) {
        if (prior.conflict) {
          sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác thao tác.' });
          return true;
        }
        sendJson(res, 200, { ok: true, data: prior.response });
        return true;
      }
    }

    const row = farmRow(v015, worldId);
    const expectedVersion = body.farmVersion !== undefined ? Number(body.farmVersion) : row.version;
    if (expectedVersion !== row.version) {
      sendJson(res, 409, {
        ok: false,
        code: 'VERSION_CONFLICT',
        message: 'Nông trại vừa đổi (đồng bộ lại).',
        data: buildFarmSnapshot(worldId, row.version, row.farm, v015.wallets[worldId]?.coins ?? 0, nowMs, timeScale),
      });
      return true;
    }
    if (!isValidFarmPlotIndex(plotIndex) || !isFarmPlotIndexOnContractSoil(plotIndex)) {
      sendJson(res, 409, {
        ok: false,
        code: 'INVALID_PLOT',
        message: 'Ô đất không hợp lệ — chỉ ruộng 0–183 (ruộng chính + phụ).',
      });
      return true;
    }
    const items = getInventoryList(worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    const applied = applyFarmAction({
      worldId,
      farm: row.farm,
      farmVersion: row.version,
      walletCoins: coins,
      inventoryItems: items,
      nowMs,
      timeScale,
      params: {
        worldId,
        plotIndex,
        action,
        seedSku,
        fertilizerSku,
        sprinklerSku,
        toolSku,
        useEnvironment,
        idempotencyKey,
      },
    });
    if (!applied.ok) {
      sendJson(res, 409, { ok: false, code: applied.code, message: applied.messageVi });
      return true;
    }
    row.farm = applied.farm;
    row.version += 1;
    setInventoryList(worldId, applied.inventory);
    v015.wallets[worldId] = { coins: applied.walletCoins };
    const responsePayload = {
      snapshot: buildFarmSnapshot(worldId, row.version, row.farm, applied.walletCoins, nowMs, timeScale),
      harvested: applied.harvested,
    };
    if (idempotencyKey && saveV015Idempotency) {
      saveV015Idempotency(v015, worldId, userId, 'farm_apply', idempotencyKey, reqHash, responsePayload);
    }
    emitFarmMutated();
    saveDb();
    sendJson(res, 200, {
      ok: true,
      data: responsePayload,
    });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/sell') {
    const sku = String(body.sku ?? '');
    const qty = Number(body.qty ?? 0);
    const quality = (body.quality ?? 'normal') as 'normal' | 'silver' | 'gold';
    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    const reqHash = JSON.stringify([sku, qty, quality]);
    if (idempotencyKey && checkV015Idempotency) {
      const prior = checkV015Idempotency(v015, worldId, userId, 'farm_sell', idempotencyKey, reqHash);
      if (prior) {
        if (prior.conflict) {
          sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác thao tác.' });
          return true;
        }
        sendJson(res, 200, { ok: true, data: prior.response });
        return true;
      }
    }
    const items = getInventoryList(worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    const sold = sellCropLine(coins, items, sku, qty, quality);
    if (!sold.ok) {
      sendJson(res, 409, { ok: false, code: sold.code, message: sold.messageVi });
      return true;
    }
    setInventoryList(worldId, sold.items);
    v015.wallets[worldId] = { coins: sold.walletCoins };
    const responsePayload = { walletCoins: sold.walletCoins };
    if (idempotencyKey && saveV015Idempotency) {
      saveV015Idempotency(v015, worldId, userId, 'farm_sell', idempotencyKey, reqHash, responsePayload);
    }
    emitFarmMutated();
    saveDb();
    sendJson(res, 200, { ok: true, data: responsePayload });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/ship') {
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const items = getInventoryList(worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    const idempotencyKey = String(body.idempotencyKey ?? '');
    v015.farmShipKeys ??= {};
    const priorKeys = v015.farmShipKeys[worldId] ?? [];
    if (idempotencyKey && priorKeys.includes(idempotencyKey)) {
      sendJson(res, 409, { ok: false, code: 'DUPLICATE_IDEMPOTENCY_KEY', message: 'Giao dịch đã xử lý.' });
      return true;
    }
    const meta = shippingMeta(v015, worldId, nowMs);
    const shipped = applyFarmShippingBinSale(coins, items, meta, {
      lines: lines.map((line: { sku?: string; qty?: number; quality?: string }) => ({
        sku: String(line.sku ?? ''),
        qty: Number(line.qty ?? 0),
        quality: (line.quality ?? 'normal') as 'normal' | 'silver' | 'gold',
      })),
      nowMs,
      idempotencyKey,
      actorId: userId,
    });
    if (!shipped.ok) {
      sendJson(res, 409, { ok: false, code: shipped.code, message: shipped.messageVi });
      return true;
    }
    setInventoryList(worldId, shipped.items);
    v015.wallets[worldId] = { coins: shipped.walletCoins };
    v015.shippingBin![worldId] = shipped.meta;
    if (idempotencyKey) {
      v015.farmShipKeys[worldId] = [...priorKeys, idempotencyKey];
    }
    emitFarmMutated();
    saveDb();
    sendJson(res, 200, { ok: true, data: { walletCoins: shipped.walletCoins, totalCoins: shipped.totalCoins } });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/buy-seed') {
    const itemSku = String(body.itemSku ?? body.seedSku ?? '');
    const qty = Number(body.qty ?? 0);
    const idempotencyKey = String(body.idempotencyKey ?? '').trim();
    const reqHash = JSON.stringify([itemSku, qty]);
    if (idempotencyKey && checkV015Idempotency) {
      const prior = checkV015Idempotency(v015, worldId, userId, 'farm_buy_seed', idempotencyKey, reqHash);
      if (prior) {
        if (prior.conflict) {
          sendJson(res, 409, { ok: false, code: 'IDEMPOTENCY_CONFLICT', message: 'Khóa yêu cầu bị trùng khác thao tác.' });
          return true;
        }
        sendJson(res, 200, { ok: true, data: prior.response });
        return true;
      }
    }
    const items = getInventoryList(worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    const bought = buySeed(worldId, coins, items, itemSku, qty, nowMs);
    if (!bought.ok) {
      sendJson(res, 409, { ok: false, code: bought.code, message: bought.messageVi });
      return true;
    }
    setInventoryList(worldId, bought.items);
    v015.wallets[worldId] = { coins: bought.walletCoins };
    const responsePayload = { walletCoins: bought.walletCoins };
    if (idempotencyKey && saveV015Idempotency) {
      saveV015Idempotency(v015, worldId, userId, 'farm_buy_seed', idempotencyKey, reqHash, responsePayload);
    }
    emitFarmMutated();
    saveDb();
    sendJson(res, 200, { ok: true, data: responsePayload });
    return true;
  }

  return false;
}