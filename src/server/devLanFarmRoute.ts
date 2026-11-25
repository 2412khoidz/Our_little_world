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
  FARM_STARTER_BAIT_QTY,
  FARM_STARTER_SEED_QTY,
  FARM_STARTER_TOOLS,
  sellCropLine,
} from '../shared/farming/serverApply';
import type { FarmApplyParams } from '../shared/farming/farmSnapshotTypes';
import { isFarmPlotIndexOnContractSoil, isValidFarmPlotIndex } from '../shared/farming/farmPlotIndex';
import type { InventoryOwnerScope, InventorySnapshot } from '../shared/inventory/inventoryTypes';

export interface DevLanFarmDb {
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

export function seedStarterFarmPack(
  v015: DevLanFarmDb,
  worldId: string,
  inventoryAdjust: (scope: string, sku: string, delta: number, quality?: string) => void,
): void {
  ensureFarmDb(v015);
  v015.shippingBin ??= {};
  if (v015.farms[worldId]) return;
  const seed = Math.floor(Math.random() * 0xffff_ffff);
  v015.farms[worldId] = { seed, version: 1, farm: emptyFarm(seed) };
  v015.wallets[worldId] = { coins: FARM_STARTER_COINS };
  for (const sku of FARM_STARTER_TOOLS) inventoryAdjust('shared', sku, 1, 'normal');
  inventoryAdjust('shared', 'seed_wheat', FARM_STARTER_SEED_QTY, 'normal');
  inventoryAdjust('shared', 'seed_carrot', 2, 'normal');
  inventoryAdjust('shared', 'bait_free_worm', FARM_STARTER_BAIT_QTY, 'normal');
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
    v015.wallets[worldId] ??= { coins: 0 };
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
}): Promise<boolean> {
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
  } = ctx;

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

  if (req.method === 'GET' && route === '/farm') {
    if (!v015.farms?.[worldId]) {
      seedStarterFarmPack(v015, worldId, (scope, sku, delta) => {
        const list = getInventoryList(worldId);
        const ownerScope: InventoryOwnerScope = scope === 'shared' ? 'shared' : `user:${scope}`;
        const idx = list.findIndex(
          (r) => r.ownerScope === ownerScope && r.itemSku === sku && (r.quality ?? 'normal') === 'normal',
        );
        if (idx >= 0) list[idx] = { ...list[idx]!, qty: list[idx]!.qty + delta };
        else {
          list.push({
            worldId,
            ownerScope,
            itemSku: sku,
            qty: delta,
            quality: 'normal',
            updatedAt: new Date(nowMs).toISOString(),
          });
        }
        setInventoryList(worldId, list);
      });
    }
    const row = farmRow(v015, worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    sendJson(res, 200, {
      ok: true,
      data: buildFarmSnapshot(worldId, row.version, row.farm, coins, nowMs, timeScale),
    });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/apply') {
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
    const plotIndex = Number(body.plotIndex);
    if (!isValidFarmPlotIndex(plotIndex) || !isFarmPlotIndexOnContractSoil(plotIndex)) {
      sendJson(res, 409, {
        ok: false,
        code: 'INVALID_PLOT',
        message: 'Ô đất không hợp lệ — chỉ ruộng 0–183 (ruộng chính + phụ).',
      });
      return true;
    }
    const action = String(body.action ?? '') as FarmApplyParams['action'];
    const seedSku = body.seedSku ? String(body.seedSku) : null;
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
      params: { worldId, plotIndex, action, seedSku, idempotencyKey: String(body.idempotencyKey ?? '') },
    });
    if (!applied.ok) {
      sendJson(res, 409, { ok: false, code: applied.code, message: applied.messageVi });
      return true;
    }
    row.farm = applied.farm;
    row.version += 1;
    setInventoryList(worldId, applied.inventory);
    v015.wallets[worldId] = { coins: applied.walletCoins };
    saveDb();
    sendJson(res, 200, {
      ok: true,
      data: {
        snapshot: buildFarmSnapshot(worldId, row.version, row.farm, applied.walletCoins, nowMs, timeScale),
        harvested: applied.harvested,
      },
    });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/sell') {
    const sku = String(body.sku ?? '');
    const qty = Number(body.qty ?? 0);
    const quality = (body.quality ?? 'normal') as 'normal' | 'silver' | 'gold';
    const items = getInventoryList(worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    const sold = sellCropLine(coins, items, sku, qty, quality);
    if (!sold.ok) {
      sendJson(res, 409, { ok: false, code: sold.code, message: sold.messageVi });
      return true;
    }
    setInventoryList(worldId, sold.items);
    v015.wallets[worldId] = { coins: sold.walletCoins };
    saveDb();
    sendJson(res, 200, { ok: true, data: { walletCoins: sold.walletCoins } });
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
    saveDb();
    sendJson(res, 200, { ok: true, data: { walletCoins: shipped.walletCoins, totalCoins: shipped.totalCoins } });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/buy-seed') {
    const seedSku = String(body.seedSku ?? '');
    const qty = Number(body.qty ?? 0);
    const items = getInventoryList(worldId);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    const bought = buySeed(worldId, coins, items, seedSku, qty, nowMs);
    if (!bought.ok) {
      sendJson(res, 409, { ok: false, code: bought.code, message: bought.messageVi });
      return true;
    }
    setInventoryList(worldId, bought.items);
    v015.wallets[worldId] = { coins: bought.walletCoins };
    saveDb();
    sendJson(res, 200, { ok: true, data: { walletCoins: bought.walletCoins } });
    return true;
  }

  return false;
}