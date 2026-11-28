import type { DeepFarmActionParams, DeepFarmSnapshot } from '../farming/deepFarmState';
import { getItem } from '../economy/catalogConfig';
import { isAcceptableFeedForSpecies, type LivestockSpeciesDef } from '../farming/livestock';
import { WORKSHOP_DEF_BY_ID, type WorkshopId } from '../farming/workshops';
import type { InventoryEntry } from '../inventory/inventoryTypes';
import type { ContextualAction, InteractableTarget } from './interactionTypes';

export type DeepFarmTarget =
  | { kind: 'tree'; slotIndex: number }
  | { kind: 'animal'; animalId: string }
  | { kind: 'workshop'; workshopId: WorkshopId };

type LocalFarmAction<T> = T extends { kind: string }
  ? Omit<T, 'worldId' | 'expectedVersion' | 'idempotencyKey'>
  : never;

export type DeepFarmIntent = LocalFarmAction<Extract<DeepFarmActionParams, {
  kind: 'harvest_tree' | 'pet_livestock' | 'feed_livestock' | 'collect_livestock' | 'collect_workshop';
}>>;

export function sharedFeedStock(items: readonly InventoryEntry[]): Set<string> {
  return new Set(items.filter((row) => row.ownerScope === 'shared' && row.qty > 0).map((row) => row.itemSku));
}

export function preferredLivestockFeed(def: LivestockSpeciesDef, stock: ReadonlySet<string>): string | undefined {
  if (!def.feedSku) return undefined;
  return [def.feedSku, 'feed_deluxe', 'wild_clover'].find((sku) => stock.has(sku) &&
    isAcceptableFeedForSpecies(def.speciesId, sku));
}

export function resolveDeepFarmActions(
  target: InteractableTarget,
  snapshot: DeepFarmSnapshot | null | undefined,
  stock: ReadonlySet<string>,
  actorId: string,
  nowMs: number,
): ContextualAction[] {
  const farm = target.deepFarmTarget;
  if (!snapshot || !farm) return [];
  const action = (labelVi: string, deepFarmIntent: DeepFarmIntent, reasonVi?: string): ContextualAction => ({
    code: 'apply_deep_farm', targetId: target.id, labelVi, available: !reasonVi,
    keyHint: 'J', deepFarmIntent, reasonVi,
  });

  if (farm.kind === 'tree') {
    const planted = snapshot.orchard.slots[farm.slotIndex];
    if (!planted ||
      nowMs < planted.matureAtMs || nowMs < planted.nextReadyAtMs) return [];
    return [action('Hái quả', { kind: 'harvest_tree', slotIndex: farm.slotIndex })];
  }

  if (farm.kind === 'workshop') {
    const { workshopId } = farm;
    const open: ContextualAction = {
      code: 'open_donor_workshop', targetId: target.id, keyHint: 'J', available: true,
      labelVi: WORKSHOP_DEF_BY_ID[workshopId].nameVi, workshopId,
    };
    if (snapshot.workshops.stations[workshopId]?.queue.some((job) => job.endMs <= nowMs)) {
      return [action('Nhận thành phẩm', { kind: 'collect_workshop', workshopId }), open];
    }
    return [open];
  }

  const item = snapshot.projectedLivestock.find(({ animal }) => animal.animalId === farm.animalId);
  if (!item) return [];
  const { animal, def } = item;
  const animalId = animal.animalId;
  const readyAtMs = animal.fedAtMs === null ? null : animal.readyAtMs;
  const productReady = readyAtMs !== null && readyAtMs <= nowMs;
  const petted = animal.petCalendarDay === snapshot.calendar.totalDay && animal.petByActors.includes(actorId);
  const feedSku = preferredLivestockFeed(def, stock);
  const feedReason = !def.feedSku
    ? 'Ong tự kiếm mật.'
    : productReady
      ? 'Thu sản phẩm trước khi cho ăn tiếp.'
      : animal.fedAtMs !== null
        ? 'Đã cho ăn, đang tạo sản phẩm.'
        : !feedSku
          ? `Túi chung cần ${getItem(def.feedSku)?.nameVi.toLowerCase() ?? 'thức ăn phù hợp'}.`
          : undefined;
  const harvestReason = productReady
    ? undefined
    : readyAtMs === null && def.feedSku
      ? 'Cần cho ăn trước.'
      : 'Sản phẩm chưa sẵn sàng.';

  return [
    action('Vuốt ve', { kind: 'pet_livestock', animalId }, petted ? 'Bạn đã vuốt ve hôm nay.' : undefined),
    action('Cho ăn', { kind: 'feed_livestock', animalId, feedSku: feedSku ?? def.feedSku ?? '' }, feedReason),
    action('Thu hoạch', { kind: 'collect_livestock', animalId }, harvestReason),
  ];
}
