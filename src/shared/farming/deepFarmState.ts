/**
 * Authoritative Deep Farming World State (Checkpoint F).
 *
 * Unifies:
 * - Flower genetics & crossbreeding garden (`flowerGenetics.ts`)
 * - 12 Perennial orchard tree slots (`orchard.ts`)
 * - 7 Livestock species & collaborative care (`livestock.ts`)
 * - 8 Production workshops & timestamped craft queues (`workshops.ts`)
 * - Deterministic 3-slot NPC Order Board (`orderBoard.ts`)
 *
 * Pure TypeScript — runs identically on server (Dev LAN / Supabase mirror) and client preview.
 * Single shared wallet (`walletCoins`) & single shared inventory (`InventoryEntry[]`, `ownerScope === 'shared'`).
 */
import { weatherForWorldDay, type WeatherDef } from '../donor/webfarmville-c420bc2/weatherRules.ts';
import { getItem } from '../economy/catalogConfig.ts';
import type { CoinLedgerEntry, InventoryState } from '../economy/ledgerMath.ts';
import {
  completeOrder,
  generateOrderBoard,
  orderWindowIndex,
  type OrderBoardState,
} from '../economy/orderBoard.ts';
import type { InventoryEntry } from '../inventory/inventoryTypes.ts';
import { createRng } from '../rng.ts';
import { resolveWorldCalendar, type WorldCalendarState } from '../world/worldCalendar.ts';
import {
  FLOWER_SPECIES_CATALOG,
  FLOWER_SPEC_BY_SKU,
  createFlowerGarden,
  deterministicFlowerRng,
  harvestFlowerFromBed,
  plantFlowerInBed,
  runFlowerCrossbreedingRound,
  waterFlowerInBed,
  type FlowerGardenState,
} from './flowerGenetics.ts';
import {
  adoptLivestock,
  collectLivestockProduct,
  createLivestockState,
  feedLivestockAnimal,
  petLivestockAnimal,
  projectLivestock,
  type LivestockSpeciesId,
  type LivestockState,
  type ProjectedLivestockAnimal,
} from './livestock.ts';
import {
  createOrchard,
  harvestOrchardTree,
  plantOrchardSapling,
  projectOrchard,
  uprootOrchardTree,
  type OrchardState,
  type OrchardTreeView,
} from './orchard.ts';
import type { QualityTier } from './types.ts';
import {
  cancelWorkshopJob,
  collectWorkshopReadyJobs,
  createWorkshopsState,
  queueWorkshopJob,
  upgradeWorkshopStation,
  type WorkshopId,
  type WorkshopsWorldState,
} from './workshops.ts';

export interface DeepFarmState {
  readonly version: number;
  readonly seed: number;
  readonly weatherEpochMs: number;
  readonly flowerGarden: FlowerGardenState;
  readonly orchard: OrchardState;
  readonly livestock: LivestockState;
  readonly workshops: WorkshopsWorldState;
  readonly orderBoard: OrderBoardState;
  readonly processedKeys: readonly string[];
}

export interface DeepFarmSnapshot {
  readonly worldId: string;
  readonly version: number;
  readonly serverNowMs: number;
  readonly walletCoins: number;
  readonly calendar: WorldCalendarState;
  readonly weather: WeatherDef;
  readonly flowerGarden: FlowerGardenState;
  readonly orchard: OrchardState;
  readonly orchardViews: readonly OrchardTreeView[];
  readonly livestock: LivestockState;
  readonly projectedLivestock: readonly ProjectedLivestockAnimal[];
  readonly workshops: WorkshopsWorldState;
  readonly orderBoard: OrderBoardState;
}

export type DeepFarmActionParams =
  | {
      readonly kind: 'plant_flower';
      readonly worldId: string;
      readonly slotIndex: number;
      readonly flowerSku: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'water_flower';
      readonly worldId: string;
      readonly slotIndex: number;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'harvest_flower';
      readonly worldId: string;
      readonly slotIndex: number;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'crossbreed_flowers';
      readonly worldId: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'plant_tree';
      readonly worldId: string;
      readonly slotIndex: number;
      readonly saplingSku: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'harvest_tree';
      readonly worldId: string;
      readonly slotIndex: number;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'uproot_tree';
      readonly worldId: string;
      readonly slotIndex: number;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'adopt_livestock';
      readonly worldId: string;
      readonly speciesId: LivestockSpeciesId;
      readonly nickname?: string | null;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'feed_livestock';
      readonly worldId: string;
      readonly animalId: string;
      readonly feedSku: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'pet_livestock';
      readonly worldId: string;
      readonly animalId: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'collect_livestock';
      readonly worldId: string;
      readonly animalId: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'queue_workshop';
      readonly worldId: string;
      readonly workshopId: WorkshopId;
      readonly recipeId: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'cancel_workshop';
      readonly worldId: string;
      readonly workshopId: WorkshopId;
      readonly jobId: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'collect_workshop';
      readonly worldId: string;
      readonly workshopId: WorkshopId;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'upgrade_workshop';
      readonly worldId: string;
      readonly workshopId: WorkshopId;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    }
  | {
      readonly kind: 'complete_order';
      readonly worldId: string;
      readonly orderId: string;
      readonly expectedVersion?: number;
      readonly idempotencyKey: string;
    };

export type DeepFarmMutationResult =
  | {
      readonly ok: true;
      readonly state: DeepFarmState;
      readonly inventory: InventoryEntry[];
      readonly walletCoins: number;
      readonly messageVi: string;
      readonly idempotentReplay?: boolean;
      readonly harvestedItems?: readonly { sku: string; qty: number; quality: QualityTier }[];
      readonly rewardCoins?: number;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly messageVi: string;
    };

export function createEmptyDeepFarmState(seed: number, nowMs: number): DeepFarmState {
  return {
    version: 1,
    seed,
    weatherEpochMs: 0,
    flowerGarden: createFlowerGarden(),
    orchard: createOrchard(),
    livestock: createLivestockState(),
    workshops: createWorkshopsState(),
    orderBoard: generateOrderBoard({
      seed,
      windowIndex: orderWindowIndex(nowMs),
      milestone: 'V0.3.0',
      nowMs,
    }),
    processedKeys: [],
  };
}

export function ensureFreshOrderBoard(state: DeepFarmState, nowMs: number): OrderBoardState {
  const currentWindow = orderWindowIndex(nowMs);
  if (state.orderBoard.windowIndex === currentWindow) {
    return state.orderBoard;
  }
  return generateOrderBoard({
    seed: state.seed,
    windowIndex: currentWindow,
    milestone: 'V0.3.0',
    nowMs,
  });
}

export function projectDeepFarmSnapshot(
  worldId: string,
  state: DeepFarmState,
  walletCoins: number,
  nowMs: number,
): DeepFarmSnapshot {
  const calendar = resolveWorldCalendar(nowMs, state.weatherEpochMs);
  const weather = weatherForWorldDay(worldId, calendar.totalDay, calendar.season);
  const orderBoard = ensureFreshOrderBoard(state, nowMs);
  return {
    worldId,
    version: state.version,
    serverNowMs: nowMs,
    walletCoins,
    calendar,
    weather,
    flowerGarden: state.flowerGarden,
    orchard: state.orchard,
    orchardViews: projectOrchard(state.orchard, nowMs),
    livestock: state.livestock,
    projectedLivestock: projectLivestock(state.livestock, nowMs, state.weatherEpochMs),
    workshops: state.workshops,
    orderBoard,
  };
}

function sharedTotalQty(items: readonly InventoryEntry[], sku: string): number {
  let sum = 0;
  for (const row of items) {
    if (row.ownerScope === 'shared' && row.itemSku === sku) {
      sum += row.qty;
    }
  }
  return sum;
}

const QUALITY_ORDER: readonly QualityTier[] = ['normal', 'silver', 'gold'];

function debitSharedAnyQuality(
  items: InventoryEntry[],
  sku: string,
  qty: number,
): InventoryEntry[] | null {
  if (qty <= 0) return items.map((r) => ({ ...r }));
  if (sharedTotalQty(items, sku) < qty) return null;

  const next = items.map((r) => ({ ...r }));
  let remaining = qty;

  for (const tier of QUALITY_ORDER) {
    if (remaining <= 0) break;
    const idx = next.findIndex(
      (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === tier,
    );
    if (idx < 0) continue;
    const take = Math.min(remaining, next[idx]!.qty);
    next[idx] = { ...next[idx]!, qty: next[idx]!.qty - take };
    if (next[idx]!.qty === 0) {
      next.splice(idx, 1);
    }
    remaining -= take;
  }

  return remaining === 0 ? next : null;
}

function creditSharedItem(
  worldId: string,
  nowMs: number,
  items: InventoryEntry[],
  sku: string,
  qty: number,
  quality: QualityTier,
): InventoryEntry[] {
  if (qty <= 0) return items;
  const next = items.map((r) => ({ ...r }));
  const idx = next.findIndex(
    (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
  );
  if (idx >= 0) {
    next[idx] = { ...next[idx]!, qty: next[idx]!.qty + qty, updatedAt: new Date(nowMs).toISOString() };
  } else {
    next.push({
      worldId,
      ownerScope: 'shared',
      itemSku: sku,
      qty,
      quality,
      updatedAt: new Date(nowMs).toISOString(),
    });
  }
  return next;
}

function itemLabelVi(sku: string): string {
  return getItem(sku)?.nameVi ?? sku;
}

export function applyDeepFarmMutation(input: {
  readonly worldId: string;
  readonly actorId: string;
  readonly state: DeepFarmState;
  readonly inventoryItems: readonly InventoryEntry[];
  readonly walletCoins: number;
  readonly nowMs: number;
  readonly params: DeepFarmActionParams;
}): DeepFarmMutationResult {
  const { worldId, actorId, state, nowMs, params } = input;
  const cleanKey = params.idempotencyKey.trim();

  if (cleanKey.length > 0 && state.processedKeys.includes(cleanKey)) {
    return {
      ok: true,
      idempotentReplay: true,
      state,
      inventory: input.inventoryItems.map((r) => ({ ...r })),
      walletCoins: input.walletCoins,
      messageVi: 'Thao tác đã được ghi nhận trước đó.',
    };
  }

  if (params.expectedVersion !== undefined && params.expectedVersion !== state.version) {
    return {
      ok: false,
      code: 'VERSION_CONFLICT',
      messageVi: 'Trang trại vừa được người thương cập nhật — đang đồng bộ lại…',
    };
  }

  let items = input.inventoryItems.map((r) => ({ ...r }));
  let walletCoins = input.walletCoins;
  const orderBoard = ensureFreshOrderBoard(state, nowMs);
  const baseState: DeepFarmState = { ...state, orderBoard };
  const calendar = resolveWorldCalendar(nowMs, state.weatherEpochMs);
  const weather = weatherForWorldDay(worldId, calendar.totalDay, calendar.season);

  const commit = (
    patch: Partial<DeepFarmState>,
    messageVi: string,
    extra?: {
      harvestedItems?: readonly { sku: string; qty: number; quality: QualityTier }[];
      rewardCoins?: number;
    },
  ): DeepFarmMutationResult => {
    const nextKeys =
      cleanKey.length > 0 ? [...state.processedKeys, cleanKey].slice(-64) : state.processedKeys;
    return {
      ok: true,
      state: {
        ...baseState,
        ...patch,
        version: state.version + 1,
        processedKeys: nextKeys,
      },
      inventory: items,
      walletCoins,
      messageVi,
      ...(extra?.harvestedItems ? { harvestedItems: extra.harvestedItems } : {}),
      ...(extra?.rewardCoins !== undefined ? { rewardCoins: extra.rewardCoins } : {}),
    };
  };

  switch (params.kind) {
    case 'plant_flower': {
      const spec =
        FLOWER_SPEC_BY_SKU.get(params.flowerSku) ??
        FLOWER_SPECIES_CATALOG.find((s) => s.seedSku === params.flowerSku);
      if (!spec || !spec.seedSku) {
        return {
          ok: false,
          code: 'UNKNOWN_SEED',
          messageVi: 'Cần chọn hạt giống hoa cơ bản để gieo xuống bồn.',
        };
      }
      if (sharedTotalQty(items, spec.seedSku) < 1) {
        return {
          ok: false,
          code: 'INSUFFICIENT_ITEMS',
          messageVi: `Không còn ${itemLabelVi(spec.seedSku)} trong kho chung.`,
        };
      }
      const res = plantFlowerInBed(state.flowerGarden, params.slotIndex, spec.sku, nowMs, actorId);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      const debited = debitSharedAnyQuality(items, spec.seedSku, 1);
      if (!debited) {
        return { ok: false, code: 'INSUFFICIENT_ITEMS', messageVi: 'Không đủ hạt giống hoa.' };
      }
      items = debited;
      return commit(
        { flowerGarden: res.garden },
        `Đã trồng ${spec.nameVi}${res.newlyDiscovered ? ' (mở khóa Sổ Hoa mới!)' : ''}.`,
      );
    }

    case 'water_flower': {
      const res = waterFlowerInBed(state.flowerGarden, params.slotIndex, nowMs);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      return commit({ flowerGarden: res.garden }, 'Đã tưới bồn hoa — tăng gấp đôi tỉ lệ nảy mầm.');
    }

    case 'harvest_flower': {
      const rng = deterministicFlowerRng(state.seed + state.version * 31, nowMs);
      const res = harvestFlowerFromBed(state.flowerGarden, params.slotIndex, rng);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      items = creditSharedItem(worldId, nowMs, items, res.sku, 1, res.quality);
      return commit(
        { flowerGarden: res.garden },
        `Đã hái ${itemLabelVi(res.sku)}${res.quality !== 'normal' ? ` (${res.quality})` : ''}.`,
        { harvestedItems: [{ sku: res.sku, qty: 1, quality: res.quality }] },
      );
    }

    case 'crossbreed_flowers': {
      const stream = createRng(state.seed + state.version * 97 + Math.floor(nowMs / 1_000));
      const res = runFlowerCrossbreedingRound(
        state.flowerGarden,
        nowMs,
        () => stream.next(),
        weather.id,
      );
      if (res.garden === state.flowerGarden && res.sprouts.length === 0) {
        return commit(
          { flowerGarden: res.garden },
          'Chưa qua nhịp 6 giờ kế tiếp hoặc chưa có cặp hoa cùng họ liền kề.',
        );
      }
      const names = res.sprouts.map((s) => itemLabelVi(s.flowerSku)).join(', ');
      return commit(
        { flowerGarden: res.garden },
        res.sprouts.length > 0
          ? `Vườn hoa vừa nảy mầm ${res.sprouts.length} nhánh mới: ${names}!`
          : 'Đã đồng bộ nhịp thụ phấn vườn hoa.',
      );
    }

    case 'plant_tree': {
      const res = plantOrchardSapling(state.orchard, params.slotIndex, params.saplingSku, nowMs, actorId);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      const debited = debitSharedAnyQuality(items, params.saplingSku, 1);
      if (!debited) {
        return {
          ok: false,
          code: 'INSUFFICIENT_ITEMS',
          messageVi: `Cần ${itemLabelVi(params.saplingSku)} trong kho chung.`,
        };
      }
      items = debited;
      return commit({ orchard: res.orchard }, `Đã trồng ${res.tree.nameVi} vào vườn cây ăn quả.`);
    }

    case 'harvest_tree': {
      const stream = createRng(state.seed + state.version * 131 + params.slotIndex * 17 + nowMs);
      const hasBasketTool = sharedTotalQty(items, 'tool_basket_orchard') >= 1;
      const res = harvestOrchardTree(state.orchard, params.slotIndex, nowMs, () => stream.next(), {
        weatherId: weather.id,
        hasBasketTool,
        worldEpochMs: state.weatherEpochMs,
      });
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      items = creditSharedItem(worldId, nowMs, items, res.sku, res.qty, res.quality);
      return commit(
        { orchard: res.orchard },
        `Thu hoạch ${res.qty} ${itemLabelVi(res.sku)}${res.windBonus ? ' (thưởng gió mát +1!)' : ''}.`,
        { harvestedItems: [{ sku: res.sku, qty: res.qty, quality: res.quality }] },
      );
    }

    case 'uproot_tree': {
      const res = uprootOrchardTree(state.orchard, params.slotIndex);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      items = creditSharedItem(worldId, nowMs, items, res.saplingSku, 1, 'normal');
      return commit(
        { orchard: res.orchard },
        `Đã bứng gọn ${itemLabelVi(res.saplingSku)} trả lại vào kho.`,
      );
    }

    case 'adopt_livestock': {
      const res = adoptLivestock(
        state.livestock,
        params.speciesId,
        params.nickname ?? null,
        nowMs,
        actorId,
      );
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      if (walletCoins < res.costCoins) {
        return {
          ok: false,
          code: 'INSUFFICIENT_FUNDS',
          messageVi: `Cần ${res.costCoins} xu để đón ${res.animal.nickname}.`,
        };
      }
      walletCoins -= res.costCoins;
      return commit(
        { livestock: res.state },
        `Đã đón ${res.animal.nickname} về chuồng chung (-${res.costCoins} xu).`,
      );
    }

    case 'feed_livestock': {
      const res = feedLivestockAnimal(state.livestock, params.animalId, params.feedSku, nowMs);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      const debited = debitSharedAnyQuality(items, res.consumedFeedSku, 1);
      if (!debited) {
        return {
          ok: false,
          code: 'INSUFFICIENT_ITEMS',
          messageVi: `Hết ${itemLabelVi(res.consumedFeedSku)} trong kho chung.`,
        };
      }
      items = debited;
      return commit({ livestock: res.state }, `Đã cho ăn ${itemLabelVi(res.consumedFeedSku)}.`);
    }

    case 'pet_livestock': {
      const res = petLivestockAnimal(state.livestock, params.animalId, nowMs, actorId, state.weatherEpochMs);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      return commit(
        { livestock: res.state },
        res.pairCareBonus
          ? 'Cả hai đã cùng chăm sóc hôm nay — tăng tỉ lệ sản phẩm quý!'
          : 'Đã vuốt ve bé — bé vui hơn và mau ra sản phẩm hơn.',
      );
    }

    case 'collect_livestock': {
      const stream = createRng(state.seed + state.version * 73 + nowMs);
      const res = collectLivestockProduct(state.livestock, params.animalId, nowMs, () => stream.next());
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      items = creditSharedItem(worldId, nowMs, items, res.sku, res.qty, res.quality);
      return commit(
        { livestock: res.state },
        `Thu được ${res.qty} ${itemLabelVi(res.sku)}${res.prized ? ' (Quý hiếm!)' : ''}.`,
        { harvestedItems: [{ sku: res.sku, qty: res.qty, quality: res.quality }] },
      );
    }

    case 'queue_workshop': {
      const res = queueWorkshopJob(
        state.workshops,
        params.workshopId,
        params.recipeId,
        nowMs,
        actorId,
      );
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      let workingItems = items;
      for (const req of res.consumedInputs) {
        const debited = debitSharedAnyQuality(workingItems, req.sku, req.qty);
        if (!debited) {
          return {
            ok: false,
            code: 'INSUFFICIENT_ITEMS',
            messageVi: `Thiếu nguyên liệu: ${itemLabelVi(req.sku)} (cần ${req.qty}).`,
          };
        }
        workingItems = debited;
      }
      items = workingItems;
      return commit(
        { workshops: res.state },
        `Đã đưa ${itemLabelVi(res.job.outputSku)} vào hàng đợi chế biến.`,
      );
    }

    case 'cancel_workshop': {
      const res = cancelWorkshopJob(state.workshops, params.workshopId, params.jobId, nowMs);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      for (const refund of res.refundInputs) {
        items = creditSharedItem(worldId, nowMs, items, refund.sku, refund.qty, 'normal');
      }
      return commit(
        { workshops: res.state },
        'Đã hủy đơn chế biến và hoàn lại 100% nguyên liệu vào kho.',
      );
    }

    case 'collect_workshop': {
      const stream = createRng(state.seed + state.version * 59 + nowMs);
      const res = collectWorkshopReadyJobs(
        state.workshops,
        params.workshopId,
        nowMs,
        () => stream.next(),
      );
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      const outItems: { sku: string; qty: number; quality: QualityTier }[] = [];
      for (const got of res.collected) {
        items = creditSharedItem(worldId, nowMs, items, got.sku, got.qty, got.quality);
        outItems.push({ sku: got.sku, qty: got.qty, quality: got.quality });
      }
      const label = outItems.map((o) => `${o.qty} ${itemLabelVi(o.sku)}`).join(', ');
      return commit({ workshops: res.state }, `Đã nhận thành phẩm: ${label}.`, {
        harvestedItems: outItems,
      });
    }

    case 'upgrade_workshop': {
      const res = upgradeWorkshopStation(state.workshops, params.workshopId, walletCoins);
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };
      walletCoins -= res.costCoins;
      return commit(
        { workshops: res.state },
        `Đã nâng cấp xưởng lên cấp ${res.newLevel} (-${res.costCoins} xu).`,
      );
    }

    case 'complete_order': {
      const qtyMap: Record<string, number> = {};
      for (const row of items) {
        if (row.ownerScope !== 'shared' || row.qty <= 0) continue;
        qtyMap[row.itemSku] = (qtyMap[row.itemSku] ?? 0) + row.qty;
      }
      const invState: InventoryState = qtyMap;
      const syntheticKey = cleanKey || `ord-${nowMs}`;
      const history: CoinLedgerEntry[] = [];
      const orderDef = orderBoard.orders.find((o) => o?.orderId === params.orderId);
      const res = completeOrder(
        orderBoard,
        {
          orderId: params.orderId,
          inventory: invState,
          nowMs,
          idempotencyKey: syntheticKey,
          actorId,
        },
        history,
      );
      if (!res.ok) return { ok: false, code: res.code, messageVi: res.messageVi };

      let workingItems = items;
      for (const req of orderDef?.requirements ?? []) {
        const debited = debitSharedAnyQuality(workingItems, req.sku, req.qty);
        if (!debited) {
          return {
            ok: false,
            code: 'MISSING_ITEMS',
            messageVi: `Không đủ ${itemLabelVi(req.sku)} trong kho chung.`,
          };
        }
        workingItems = debited;
      }
      items = workingItems;
      walletCoins += res.rewardCoins;

      // Grant bonus gift card/flower when deterministically rolled
      let bonusText = '';
      if (res.decorBonus) {
        const bonusSku = getItem('bouquet_rose') ? 'bouquet_rose' : 'lavender';
        if (getItem(bonusSku)) {
          items = creditSharedItem(worldId, nowMs, items, bonusSku, 1, 'normal');
          bonusText = ` + quà tặng ${itemLabelVi(bonusSku)}!`;
        }
      }
      return commit(
        { orderBoard: res.board },
        `Hoàn thành đơn làng! +${res.rewardCoins} xu${bonusText}`,
        { rewardCoins: res.rewardCoins },
      );
    }
  }
}
