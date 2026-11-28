import type { OrchardState } from '../shared/farming/orchard';
import { DEFAULT_ORCHARD_SLOT_TILES } from '../shared/farming/farmEntityTiles';
import { getMapDefinition, getMapTilePixelSize, MAP_IDS } from '../shared/maps';
import { buildMovementCollisionGrid } from '../shared/placement';
import type { FurniturePlacement, MapId } from '../shared/types';
import { z } from 'zod';
import { physicalHasKibble } from './devLanPhysicalGameplay';
export { isPhysicalGameplayRoute, preparePhysicalGameplay } from './devLanPhysicalGameplay';
import { canReachHomeStorage } from '../shared/interaction/mainGameWorldAnchors';
import type { FarmShippingMeta } from '../shared/farming/farmShipping';
import { editPhysicalEconomy, physicalSaleChannel } from '../shared/inventory/physicalInventoryEconomy';
import {
  getPhysicalCatalog, migratePhysicalInventory, PhysicalInventoryEdit, PhysicalInventoryError,
  physicalSlots, playerBackpack, readPhysicalContainer, STORAGE_PAGE_SIZE,
  type LegacyPhysicalEntry, type PhysicalCatalog, type PhysicalInventory, type PhysicalPosition,
} from '../shared/inventory/physicalInventory';
import { canReachDrop, editPhysicalInventory, positionIsUsable } from '../shared/inventory/physicalInventoryLifecycle';
import type {
  PhysicalStorageQuery, PhysicalInventoryView, PhysicalSlotView,
} from '../shared/inventory/physicalInventoryApi';
import type { InventoryCatalogItem, InventoryEntry, InventorySnapshot } from '../shared/inventory/inventoryTypes';

const kind = z.enum(['backpack', 'home', 'overflow']);
const shelf = z.enum(['home', 'overflow']);
const quality = z.enum(['normal', 'silver', 'gold']);
const index = z.number().int().min(0).max(2_147_483_646);
const amount = z.number().int().positive().max(2_147_483_647);
const identifier = z.string().min(1).max(128);
const slot = z.strictObject({ container: kind, index });
const stackSource = { from: slot, qty: amount, stackId: identifier };
const querySchema = z.strictObject({
  storage: shelf.nullable(),
  page: index,
  search: z.string().trim().max(80),
  category: z.string().max(40).optional(),
});
const ownerScope = z.union([z.literal('shared'), z.templateLiteral(['user:', z.string()])]);
const inputSchema = z.strictObject({
  worldId: identifier,
  version: index,
  idempotencyKey: identifier,
  query: querySchema,
  command: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('move'), ...stackSource, to: slot }),
    z.strictObject({ kind: z.literal('transfer'), ...stackSource, to: kind }),
    z.strictObject({ kind: z.literal('rotate'), direction: z.union([z.literal(-1), z.literal(1)]) }),
    z.strictObject({ kind: z.literal('import_shortcuts'), shortcuts: z.array(z.strictObject({
      index, itemSku: identifier, ownerScope, quality,
    })).max(9) }),
    z.strictObject({ kind: z.literal('favorite'), at: slot, stackId: identifier }),
    z.strictObject({ kind: z.literal('lock_slot'), at: slot }),
    z.strictObject({ kind: z.literal('organize'), container: kind }),
    z.strictObject({ kind: z.literal('deposit'), matchingOnly: z.boolean() }),
    z.strictObject({ kind: z.literal('drop'), ...stackSource }),
    z.strictObject({ kind: z.literal('pickup'), dropId: identifier }),
    z.strictObject({ kind: z.literal('upgrade_backpack') }),
    z.strictObject({ kind: z.literal('sell'), ...stackSource, channel: z.enum(['market', 'shipping']) }),
    z.strictObject({ kind: z.literal('discard'), ...stackSource, confirm: z.literal(true) }),
  ]),
});

export interface PhysicalDevLanDatabase {
  v015: {
    inventory: Record<string, LegacyPhysicalEntry[]>;
    kibbleClaims?: Record<string, { date: string }>;
    wallets: Record<string, { coins: number }>;
    shippingBin?: Record<string, FarmShippingMeta>;
    physicalInventory?: Record<string, PhysicalInventory>;
    physicalReceipts?: Record<string, Record<string, { actor: string; fingerprint: string }>>;
    petLiving?: Record<string, { offers?: readonly { inventoryReserved?: boolean }[] }>;
  };
}

interface Context {
  req: { method?: string };
  res: unknown;
  reqUrl: URL;
  route: string;
  body: unknown;
  db: PhysicalDevLanDatabase;
  userId: string;
  worldId: string;
  catalog: readonly InventoryCatalogItem[];
  isWorldMember: (worldId: string, userId: string) => boolean;
  sendJson: (res: unknown, status: number, body: unknown) => void;
  saveDb: () => void;
  broadcastInventory: (worldId: string) => void;
  position: { mapId: string; x?: number; y?: number; facing?: string } | null;
  placements?: readonly FurniturePlacement[];
  orchard?: OrchardState;
}

/** Use the same collision and elevation rules as world movement. */
export function dropLanding(position: PhysicalPosition & { facing?: string }, placements: readonly FurniturePlacement[], orchard?: OrchardState): PhysicalPosition | null {
  if (!MAP_IDS.includes(position.mapId as MapId)) return null;
  const mapId = position.mapId as MapId;
  const map = getMapDefinition(mapId);
  const size = getMapTilePixelSize(mapId);
  const blocked = buildMovementCollisionGrid(mapId, placements);
  if (mapId === 'farm') {
    orchard?.slots.forEach((tree, slot) => {
      const tile = DEFAULT_ORCHARD_SLOT_TILES[slot];
      if (tree && tile) blocked.add(tile.join(','));
    });
  }
  const dx = position.facing?.includes('left') ? -1 : position.facing?.includes('right') ? 1 : 0;
  const dy = position.facing?.includes('up') ? -1 : position.facing?.includes('down') ? 1 : dx ? 0 : 1;
  const fromX = Math.floor(position.x / size);
  const fromY = Math.floor((position.y - 2) / size);
  const clear = (x: number, y: number) => x >= 0 && y >= 0 && x < map.widthTiles && y < map.heightTiles
    && !blocked.has(`${x},${y}`) && (map.canStepElevation?.(fromX, fromY, x, y) ?? true);
  if (!clear(fromX, fromY)) return null;
  const candidates = [[dx, dy], [-dy, dx], [dy, -dx], [0, 0]];
  for (const [ox = 0, oy = 0] of candidates) {
    if (!clear(fromX + ox, fromY + oy) ||
        (ox && oy && (!clear(fromX + ox, fromY) || !clear(fromX, fromY + oy)))) continue;
    return { mapId, x: (fromX + ox + 0.5) * size, y: (fromY + oy + 0.5) * size };
  }
  return null;
}

function fullSlot(container: ReturnType<typeof readPhysicalContainer>, slotIndex: number): PhysicalSlotView {
  return { index: slotIndex, stack: container.slots[slotIndex] ?? null, locked: Boolean(container.locked[slotIndex]) };
}

function createView(ctx: Context, state: PhysicalInventory, query: PhysicalStorageQuery, catalog: PhysicalCatalog): PhysicalInventoryView {
  const bag = readPhysicalContainer(state, 'backpack', ctx.userId);
  const atHome = ctx.position?.mapId === 'home';
  const backpack = Array.from({ length: bag.capacity! }, (_, i) => fullSlot(bag, i));
  let storage: PhysicalInventoryView['storage'] = null;
  let categories: string[] = [];
  if (query.storage && canReachHomeStorage(ctx.position)) {
    const shelf = readPhysicalContainer(state, query.storage, ctx.userId);
    const items = physicalSlots(shelf);
    categories = [...new Set(items.map(({ stack }) => catalog.get(stack.itemSku)?.category ?? 'other'))].sort();
    const term = query.search.toLocaleLowerCase('vi');
    const filtered = term || query.category;
    const matches = filtered ? items.filter(({ stack }) => {
      const def = catalog.get(stack.itemSku);
      return (!query.category || (def?.category ?? 'other') === query.category)
        && (!term || (def?.name ?? stack.itemSku).toLocaleLowerCase('vi').includes(term) || stack.itemSku.includes(term));
    }) : null;
    const size = matches?.length ?? Math.max(1, (items.at(-1)?.index ?? 0) + 2);
    const pages = Math.max(1, Math.ceil(size / STORAGE_PAGE_SIZE));
    const page = Math.min(query.page, pages - 1);
    const start = page * STORAGE_PAGE_SIZE;
    const slots = matches
      ? matches.slice(start, start + STORAGE_PAGE_SIZE).map(({ index }) => fullSlot(shelf, index))
      : Array.from({ length: STORAGE_PAGE_SIZE }, (_, i) => fullSlot(shelf, start + i));
    storage = { kind: query.storage, page, pages, slots };
  }
  const position = positionIsUsable(ctx.position) ? ctx.position : null;
  const dropMapId = ctx.position?.mapId ?? null;
  const mapDrops = Object.values(state.drops ?? {}).filter((drop) => drop.mapId === dropMapId);
  const nearbyDrops = position ? mapDrops.filter((drop) => canReachDrop(drop, position)) : [];
  const visible = [...backpack, ...(storage?.slots ?? [])].flatMap(({ stack }) => stack ? [stack.itemSku] : []);
  visible.push(...nearbyDrops.map(({ stack }) => stack.itemSku));
  const definitions = Object.fromEntries([...new Set(visible)].flatMap((sku) => {
    const item = catalog.get(sku);
    return item ? [[sku, item]] : [];
  }));
  return {
    worldId: ctx.worldId, version: state.version, atHome,
    player: playerBackpack(state, ctx.userId), coins: ctx.db.v015.wallets[ctx.worldId]?.coins ?? 0,
    backpack, storage, definitions, categories, dropMapId, mapDrops, nearbyDrops, canDrop: position !== null, saleChannel: physicalSaleChannel(ctx.position),
  };
}

export function loadPhysicalGameplayState(db: PhysicalDevLanDatabase, worldId: string, entries: readonly InventoryCatalogItem[]) {
  const state = db.v015.physicalInventory?.[worldId];
  if (state) return state;
  if (db.v015.petLiving?.[worldId]?.offers?.some((offer) => offer.inventoryReserved)) {
    throw new PhysicalInventoryError('UNAVAILABLE', 'Hãy giải quyết lời mời ăn của mèo trên bản sao save trước khi chuyển túi đồ.');
  }
  return migratePhysicalInventory(undefined, worldId, db.v015.inventory[worldId] ?? [], getPhysicalCatalog(entries));
}

export { PhysicalInventoryError };

function toLegacySnapshot(ctx: Context, state: PhysicalInventory): InventorySnapshot {
  const now = Date.now();
  const date = new Date(now).toISOString();
  const totals = new Map<string, InventoryEntry>();
  for (const { stack } of physicalSlots(readPhysicalContainer(state, 'backpack', ctx.userId))) {
    const key = stack.itemSku + ':' + stack.quality;
    totals.set(key, {
      worldId: ctx.worldId, ownerScope: 'shared',
      itemSku: stack.itemSku, qty: stack.qty + (totals.get(key)?.qty ?? 0), quality: stack.quality, updatedAt: date,
    });
  }
  const items = [...totals.values()];
  const skus = new Set(items.map((item) => item.itemSku));
  return {
    worldId: ctx.worldId, serverNowMs: now, serverDateUtc: date.slice(0, 10), physicalVersion: state.version,
    canClaimFreeKibble: !physicalHasKibble(state) && ctx.db.v015.kibbleClaims?.[ctx.worldId]?.date !== date.slice(0, 10), catalog: ctx.catalog.filter((row) => skus.has(row.sku)), items,
  };
}

function needsLegacyEconomy(route: string, method: string | undefined): boolean {
  if (route.startsWith('/inventory/') || route.startsWith('/dev-console/') || route.startsWith('/donor/')) return true;
  if (route === '/pet/living' || route.startsWith('/pet/living/')) return true;
  return method !== 'GET' && ['farm', 'pet', 'mailbox'].includes(route.split('/')[1] ?? '');
}

export function handleDevLanPhysicalInventory(ctx: Context): boolean {
  const { v015 } = ctx.db;
  const worldId = ctx.worldId;
  const send = (status: number, body: unknown) => ctx.sendJson(ctx.res, status, body);
  const fail = (status: number, code: string, message: string) => send(status, { ok: false, code, message });
  if (!worldId || !ctx.isWorldMember(worldId, ctx.userId)) {
    fail(403, 'FORBIDDEN', 'Bạn không thuộc ngôi nhà này.');
    return true;
  }
  if (ctx.route !== '/inventory/physical' && ctx.route !== '/inventory') {
    if (!needsLegacyEconomy(ctx.route, ctx.req.method)) return false;
    fail(409, 'UNAVAILABLE', 'Tính năng này chưa nối với túi đồ INV.2.');
    return true;
  }
  const catalog = getPhysicalCatalog(ctx.catalog);
  try {
    v015.physicalInventory ??= {};
    let state = v015.physicalInventory[worldId];
    if (!state) {
      if (ctx.req.method !== 'GET') {
        fail(409, 'VERSION_CONFLICT', 'Hãy mở túi đồ trước khi thực hiện.');
        return true;
      }
      const legacy = v015.inventory[worldId];
      state = loadPhysicalGameplayState(ctx.db, worldId, ctx.catalog);
      v015.physicalInventory[worldId] = state;
      delete v015.inventory[worldId];
      try { ctx.saveDb(); } catch (error) {
        delete v015.physicalInventory[worldId];
        if (legacy) v015.inventory[worldId] = legacy;
        throw error;
      }
    }
    if (ctx.req.method === 'GET') {
      if (ctx.route === '/inventory') {
        send(200, { ok: true, data: toLegacySnapshot(ctx, state) });
        return true;
      }
      const search = ctx.reqUrl.searchParams;
      const query = querySchema.parse({
        storage: search.get('storage'), page: Number(search.get('page') ?? 0),
        search: search.get('search') ?? '', category: search.get('category') || undefined,
      });
      send(200, { ok: true, data: createView(ctx, state, query, catalog) });
      return true;
    }
    if (ctx.req.method !== 'POST' || ctx.route !== '/inventory/physical') {
      fail(404, 'NOT_FOUND', 'Không tìm thấy thao tác túi đồ.');
      return true;
    }
    const input = inputSchema.parse(ctx.body);
    if (input.worldId !== worldId) {
      fail(403, 'FORBIDDEN', 'Không thể thao tác túi đồ của một nhà khác.');
      return true;
    }
    v015.physicalReceipts ??= {};
    const receipts = (v015.physicalReceipts[worldId] ??= {});
    const receiptKey = 'request:' + input.idempotencyKey;
    const fingerprint = JSON.stringify(input.command);
    const prior = receipts[receiptKey];
    if (prior) {
      if (prior.actor !== ctx.userId || prior.fingerprint !== fingerprint) {
        fail(409, 'IDEMPOTENCY_CONFLICT', 'Mã thao tác đã được dùng cho một yêu cầu khác.');
      } else {
        send(200, { ok: true, data: createView(ctx, state, input.query, catalog) });
      }
      return true;
    }
    if (input.version !== state.version) {
      fail(409, 'VERSION_CONFLICT', 'Túi đồ vừa thay đổi. Hãy thử lại.');
      return true;
    }
    const edit = new PhysicalInventoryEdit(state, ctx.userId, catalog, canReachHomeStorage(ctx.position));
    const wallet = v015.wallets[worldId];
    const shipping = v015.shippingBin?.[worldId];
    let economy: ReturnType<typeof editPhysicalEconomy> | undefined;
    if (input.command.kind === 'upgrade_backpack' || input.command.kind === 'sell') {
      economy = editPhysicalEconomy(edit, input.command, {
        worldId, coins: wallet?.coins ?? 0, shipping, position: ctx.position,
        idempotencyKey: input.idempotencyKey, nowMs: Date.now(),
      });
    } else {
      const position = positionIsUsable(ctx.position) ? ctx.position : null;
      const landing = input.command.kind === 'drop' && position
        ? dropLanding({ ...position, facing: ctx.position?.facing }, ctx.placements ?? [], ctx.orchard)
        : position;
      editPhysicalInventory(edit, input.command, position, landing);
    }
    const next = edit.finish();
    if (economy) v015.wallets[worldId] = { coins: economy.coins };
    if (economy?.shipping) (v015.shippingBin ??= {})[worldId] = economy.shipping;
    v015.physicalInventory[worldId] = next;
    receipts[receiptKey] = { actor: ctx.userId, fingerprint };
    try { ctx.saveDb(); } catch (error) {
      v015.physicalInventory[worldId] = state;
      delete receipts[receiptKey];
      if (economy) {
        if (wallet) v015.wallets[worldId] = wallet;
        else delete v015.wallets[worldId];
      }
      if (economy?.shipping && v015.shippingBin) {
        if (shipping) v015.shippingBin[worldId] = shipping;
        else delete v015.shippingBin[worldId];
      }
      throw error;
    }
    ctx.broadcastInventory(worldId);
    send(200, { ok: true, data: createView(ctx, next, input.query, catalog) });
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) fail(400, 'VALIDATION_ERROR', 'Thao tác túi đồ không hợp lệ.');
    else if (error instanceof PhysicalInventoryError) fail(error.code === 'FORBIDDEN' ? 403 : 409, error.code, error.message);
    else throw error;
    return true;
  }
}
