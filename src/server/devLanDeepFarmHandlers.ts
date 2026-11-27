/**
 * Dev LAN Deep Farm HTTP Route & Authority Handler (Checkpoint F).
 * Handles `/farm/deep` (GET) and `/farm/deep/apply` (POST), sharing the
 * exact same `v015.wallets` coins and `v015.inventory` items as `/farm/*`.
 */
import {
  applyDeepFarmMutation,
  createEmptyDeepFarmState,
  ensureFreshOrderBoard,
  projectDeepFarmSnapshot,
  type DeepFarmActionParams,
  type DeepFarmState,
} from '../shared/farming/deepFarmState';
import { FARM_STARTER_COINS } from '../shared/farming/serverApply';
import type { InventoryEntry } from '../shared/inventory/inventoryTypes';

export interface DevLanDeepFarmDb {
  deepFarms?: Record<string, DeepFarmState>;
  wallets: Record<string, { coins: number }>;
}

export function ensureDeepFarmDb(v015: DevLanDeepFarmDb): DevLanDeepFarmDb {
  v015.deepFarms ??= {};
  v015.wallets ??= {};
  return v015;
}

export function deepFarmRow(
  v015: DevLanDeepFarmDb,
  worldId: string,
  seed: number,
  nowMs: number,
): DeepFarmState {
  ensureDeepFarmDb(v015);
  v015.wallets[worldId] ??= { coins: FARM_STARTER_COINS };
  let row = v015.deepFarms![worldId];
  if (!row) {
    row = createEmptyDeepFarmState(seed, nowMs);
    v015.deepFarms![worldId] = row;
  } else {
    const freshBoard = ensureFreshOrderBoard(row, nowMs);
    if (freshBoard !== row.orderBoard) {
      row = { ...row, orderBoard: freshBoard };
      v015.deepFarms![worldId] = row;
    }
  }
  return row;
}

export function executeDevLanDeepFarmMutation(input: {
  v015: DevLanDeepFarmDb;
  worldId: string;
  actorId: string;
  seed: number;
  nowMs: number;
  getInventoryList: (worldId: string) => InventoryEntry[];
  setInventoryList: (worldId: string, items: InventoryEntry[]) => void;
  params: DeepFarmActionParams;
}) {
  const row = deepFarmRow(input.v015, input.worldId, input.seed, input.nowMs);
  const items = input.getInventoryList(input.worldId);
  const walletCoins = input.v015.wallets[input.worldId]?.coins ?? 0;

  const applied = applyDeepFarmMutation({
    worldId: input.worldId,
    actorId: input.actorId,
    state: row,
    inventoryItems: items,
    walletCoins,
    nowMs: input.nowMs,
    params: input.params,
  });

  if (!applied.ok) {
    return {
      ok: false as const,
      code: applied.code,
      messageVi: applied.messageVi,
      snapshot: projectDeepFarmSnapshot(input.worldId, row, walletCoins, input.nowMs),
    };
  }

  input.v015.deepFarms![input.worldId] = applied.state;
  input.v015.wallets[input.worldId] = { coins: applied.walletCoins };
  input.setInventoryList(input.worldId, applied.inventory);

  return {
    ok: true as const,
    snapshot: projectDeepFarmSnapshot(input.worldId, applied.state, applied.walletCoins, input.nowMs),
    messageVi: applied.messageVi,
    idempotentReplay: applied.idempotentReplay,
    harvestedItems: applied.harvestedItems,
    rewardCoins: applied.rewardCoins,
  };
}

export async function handleDeepFarmDevLanRoute(ctx: {
  req: { method?: string };
  res: unknown;
  route: string;
  body: Record<string, unknown>;
  userId: string | null;
  worldId: string;
  seed: number;
  v015: DevLanDeepFarmDb;
  isWorldMember: (worldId: string, userId: string) => boolean;
  sendJson: (res: unknown, status: number, payload: unknown) => void;
  getInventoryList: (worldId: string) => InventoryEntry[];
  setInventoryList: (worldId: string, items: InventoryEntry[]) => void;
  saveDb: () => void;
  broadcastEvent?: (worldId: string, event: string, data: unknown, excludeSessionId?: string | null) => void;
  bumpWorldStateVersion?: (
    worldId: string,
    domain: string,
  ) => { stateVersion: number; domainVersions: Record<string, number> };
  nowMs: number;
}): Promise<boolean> {
  const { req, res, route, body, userId, worldId, v015, isWorldMember, sendJson } = ctx;
  if (route !== '/farm/deep' && route !== '/farm/deep/apply') {
    return false;
  }
  if (!userId) {
    sendJson(res, 401, { ok: false, code: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' });
    return true;
  }
  if (!worldId || !isWorldMember(worldId, userId)) {
    sendJson(res, 403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc thế giới này.' });
    return true;
  }

  if (req.method === 'GET' && route === '/farm/deep') {
    const row = deepFarmRow(v015, worldId, ctx.seed, ctx.nowMs);
    const coins = v015.wallets[worldId]?.coins ?? 0;
    sendJson(res, 200, {
      ok: true,
      data: projectDeepFarmSnapshot(worldId, row, coins, ctx.nowMs),
    });
    return true;
  }

  if (req.method === 'POST' && route === '/farm/deep/apply') {
    const rawParams = body as unknown as DeepFarmActionParams;
    if (!rawParams || typeof rawParams.kind !== 'string') {
      sendJson(res, 400, { ok: false, code: 'VALIDATION_ERROR', message: 'Thiếu thao tác nông trại.' });
      return true;
    }

    const result = executeDevLanDeepFarmMutation({
      v015,
      worldId,
      actorId: userId,
      seed: ctx.seed,
      nowMs: ctx.nowMs,
      getInventoryList: ctx.getInventoryList,
      setInventoryList: ctx.setInventoryList,
      params: { ...rawParams, worldId },
    });

    if (!result.ok) {
      sendJson(res, 409, {
        ok: false,
        code: result.code,
        message: result.messageVi,
        ...(result.code === 'VERSION_CONFLICT' ? { data: { snapshot: result.snapshot } } : {}),
      });
      return true;
    }

    if (!result.idempotentReplay) {
      ctx.saveDb();
      ctx.bumpWorldStateVersion?.(worldId, 'inventory');
      const meta = ctx.bumpWorldStateVersion?.(worldId, 'farm');
      ctx.broadcastEvent?.(
        worldId,
        'world_mutated',
        meta ? { reason: 'farm', stateVersion: meta.stateVersion, domainVersions: meta.domainVersions } : { reason: 'farm' },
      );
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        snapshot: result.snapshot,
        messageVi: result.messageVi,
        ...(result.idempotentReplay ? { idempotentReplay: true } : {}),
        ...(result.harvestedItems ? { harvestedItems: result.harvestedItems } : {}),
        ...(result.rewardCoins !== undefined ? { rewardCoins: result.rewardCoins } : {}),
      },
    });
    return true;
  }

  return false;
}
