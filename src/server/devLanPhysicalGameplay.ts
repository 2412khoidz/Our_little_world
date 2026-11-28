import {
  getPhysicalCatalog, physicalError, PhysicalInventoryEdit, playerBackpack, physicalHotbarIndices,
  physicalSlots, readPhysicalContainer,
  type PhysicalInventory, type PhysicalSlotAddress, type PhysicalStack,
} from '../shared/inventory/physicalInventory';
import { creditPhysicalReward, isProtectedPhysicalStack } from '../shared/inventory/physicalInventoryLifecycle';
import type { InventoryCatalogItem, InventoryEntry, InventoryOwnerScope } from '../shared/inventory/inventoryTypes';

type Source = { address: PhysicalSlotAddress; stack: PhysicalStack; scope: InventoryOwnerScope };
type SlotRef = { index: number; stackId: string };
export interface PhysicalGameplayContext {
  readonly worldId: string;
  readonly userId: string;
  readonly route: string;
  readonly body: Record<string, unknown>;
  readonly state: PhysicalInventory;
  readonly catalog: readonly InventoryCatalogItem[];
  readonly receiverIsMember: (id: string) => boolean;
}

const EDITED_FARM_SKU: Readonly<Record<string, string>> = {
  plant: 'seedSku', till: 'toolSku', water: 'toolSku', fertilize: 'fertilizerSku', place_sprinkler: 'sprinklerSku',
};

const keyOf = (row: Pick<InventoryEntry, 'ownerScope' | 'itemSku' | 'quality'>) =>
  JSON.stringify([row.ownerScope, row.itemSku, row.quality ?? 'normal']);

export function isPhysicalGameplayRoute(route: string, method: string | undefined): boolean {
  if (route === '/inventory/claim-free-kibble') return method === 'POST';
  if (route === '/pet' || route === '/pet/care' || route === '/mailbox') return method === 'GET';
  return /^\/(farm|donor|pet|mailbox)(\/|$)/.test(route);
}

export function physicalHasKibble(state: PhysicalInventory): boolean {
  return Object.values(state.containers).some((bin) => physicalSlots(bin).some(({ stack }) => stack.itemSku === 'pet_kibble_basic'))
    || Object.values(state.drops ?? {}).some(({ stack }) => stack.itemSku === 'pet_kibble_basic');
}

function requestedSlot(value: unknown): SlotRef | null {
  if (!value || typeof value !== 'object' || !('index' in value) || !('stackId' in value)
    || typeof value.index !== 'number' || !Number.isSafeInteger(value.index)
    || typeof value.stackId !== 'string' || !value.stackId) return null;
  return { index: value.index, stackId: value.stackId };
}

/**
 * The legacy domain reducers receive a transaction-local quantity projection.
 * Only the physical edit is persisted. A failed domain response or reconciliation
 * discards both the edit and the staged domain state.
 */
export function preparePhysicalGameplay(ctx: PhysicalGameplayContext) {
  const { worldId, userId, route, body, state } = ctx;
  const catalog = getPhysicalCatalog(ctx.catalog);
  const personalScope: InventoryOwnerScope = 'user:' + userId as InventoryOwnerScope;
  const directScope = (route === '/mailbox/send' && body.sourceScope === 'personal')
    || route === '/mailbox/open' || route.startsWith('/pet/living')
    || ((route === '/pet/care/apply' || route === '/pet/consume-hand-food') && body.ownerScope !== 'shared');
  const scope: InventoryOwnerScope = directScope ? personalScope : 'shared';
  const bag = readPhysicalContainer(state, 'backpack', userId);
  const selected = requestedSlot(body.physicalSource);
  const active = physicalHotbarIndices(playerBackpack(state, userId).activeRow);
  const isActive = (index: number) => active.includes(index);
  const heldSkuKey = route === '/farm/apply' ? EDITED_FARM_SKU[String(body.action)] : undefined;
  const exactPetFood = Boolean(selected && (route === '/pet/care/apply' && body.action === 'fill_food'
    || route === '/pet/consume-hand-food'));
  const heldSku = heldSkuKey ? body[heldSkuKey] : exactPetFood ? body.itemSku : undefined;
  const requestedSku = typeof heldSku === 'string' ? heldSku : undefined;
  const isToolAction = body.action === 'till' || body.action === 'water' || route === '/donor/fishing/start';
  const heldStack = selected && isActive(selected.index) ? bag.slots[selected.index] : undefined;
  const held: Source | undefined = selected && heldStack?.id === selected.stackId
    && (isToolAction ? heldStack.metadata?.reserved !== true : !bag.locked[selected.index] && !isProtectedPhysicalStack(heldStack))
    ? { address: { container: 'backpack', index: selected.index }, stack: heldStack, scope } : undefined;
  const sources: Source[] = physicalSlots(bag)
    .filter(({ index, stack }) => held?.address.index === index
      || (!bag.locked[index] && !isProtectedPhysicalStack(stack)))
    .map(({ index, stack }) => ({ address: { container: 'backpack', index }, stack, scope }));
  const enforceHeld = Boolean(heldSkuKey || exactPetFood);
  const now = new Date().toISOString();
  const available = new Map<string, InventoryEntry>();
  const eligible = sources.filter(({ stack, address }) => !enforceHeld || stack.itemSku !== requestedSku
    || Boolean(held && address.index === held.address.index));
  for (const { stack, scope: ownerScope } of eligible) {
    const row: InventoryEntry = { worldId, ownerScope, itemSku: stack.itemSku, quality: stack.quality, qty: stack.qty, updatedAt: now };
    const key = keyOf(row);
    row.qty += available.get(key)?.qty ?? 0;
    available.set(key, row);
  }

  let next = state;
  let consumed: PhysicalStack[] = [];

  function apply(rows: readonly InventoryEntry[], extras: {
    readonly received?: readonly { stack: PhysicalStack; actor: string }[];
    readonly consumedBait?: boolean;
    readonly sharedRecipient?: string;
  } = {}) {
    if (route === '/inventory/claim-free-kibble' && physicalHasKibble(state)) {
      physicalError('INVALID', 'Trong nhà vẫn còn hạt mèo.');
    }
    if (enforceHeld && (!held || !requestedSku || held.stack.itemSku !== requestedSku)) {
      physicalError('VERSION_CONFLICT', 'Hãy chọn đúng vật phẩm ở hàng nhanh đang dùng rồi thử lại.');
    }

    const result = new Map<string, InventoryEntry>();
    for (const row of rows) {
      const key = keyOf(row);
      if (row.worldId !== worldId || !Number.isSafeInteger(row.qty) || row.qty < 0
        || !['normal', 'silver', 'gold'].includes(row.quality ?? 'normal')) {
        physicalError('INVALID', 'Máy chủ nhận dữ liệu giao dịch vật phẩm không hợp lệ.');
      }
      result.set(key, { ...row, qty: row.qty + (result.get(key)?.qty ?? 0) });
    }

    const own = new PhysicalInventoryEdit(next, userId, catalog, true);
    let ownChanged = false;
    const consumedNow: PhysicalStack[] = [];
    const debit = (candidates: readonly Source[], qty: number) => {
      let remaining = qty;
      for (const source of candidates) {
        if (!remaining) break;
        const used = Math.min(remaining, source.stack.qty);
        const { container, stack } = own.source(source.address, source.stack.id, used);
        const capture = route === '/mailbox/send' || route.startsWith('/pet/living')
          || (route === '/farm/deep/apply' && body.kind === 'queue_workshop');
        if (capture) consumedNow.push(own.span(stack, used, used === stack.qty));
        own.take(container, source.address.index, stack, used);
        remaining -= used;
        ownChanged = true;
      }
      if (remaining) physicalError('INSUFFICIENT_FUNDS', 'Không đủ vật phẩm phù hợp trong ba lô.');
    };
    for (const [key, row] of available) {
      const decrease = row.qty - (result.get(key)?.qty ?? 0);
      if (decrease > 0) debit(eligible.filter(({ stack, scope: ownScope }) => key === keyOf({ ...stack, ownerScope: ownScope })), decrease);
    }
    if (extras.consumedBait) {
      const bait = sources.find(({ stack }) => catalog.get(stack.itemSku)?.category === 'bait' || stack.itemSku.startsWith('bait_'));
      if (!bait) physicalError('NOT_FOUND', 'Hãy mang mồi câu trong ba lô.');
      debit([bait], 1);
      const rod = held?.stack;
      if (rod && typeof rod.metadata?.durability === 'number') {
        const { container, stack } = own.source(held.address, rod.id, 1, true);
        container.slots[held.address.index] = { ...stack, metadata: { ...stack.metadata, durability: rod.metadata.durability - 1 } };
      }
    }

    function put(edit: PhysicalInventoryEdit, stack: PhysicalStack) {
      const overflow = creditPhysicalReward(edit, stack);
      if (overflow && edit.insert(edit.edit('overflow'), overflow) !== overflow.qty) {
        physicalError('FULL', 'Không còn chỗ giữ vật phẩm. Hãy dọn ba lô rồi thử lại.');
      }
    }

    const gains = new Map<string, { actor: string; row: InventoryEntry; qty: number }>();
    for (const [key, row] of result) {
      const qty = row.qty - (available.get(key)?.qty ?? 0);
      if (qty <= 0) continue;
      const actor = row.ownerScope === 'shared' ? extras.sharedRecipient ?? userId : row.ownerScope.slice(5);
      if ((row.ownerScope !== 'shared' && !row.ownerScope.startsWith('user:')) || !ctx.receiverIsMember(actor)) {
        physicalError('FORBIDDEN', 'Người nhận vật phẩm không thuộc ngôi nhà.');
      }
      gains.set(key, { actor, row, qty });
    }

    const actors = new Set([userId, ...[...gains.values()].map(({ actor }) => actor)]);
    const escrow = [...(extras.received ?? [])];
    for (const actor of actors) {
      const edit = actor === userId ? own : new PhysicalInventoryEdit(next, actor, catalog, true);
      let changed: boolean = actor === userId && ownChanged;
      for (const { actor: recipient, row, qty } of gains.values()) {
        if (recipient !== actor) continue;
        let remaining = qty;
        for (let index = 0; index < escrow.length; index += 1) {
          const { stack, actor: beneficiary } = escrow[index]!;
          if (beneficiary !== actor || !remaining || stack.itemSku !== row.itemSku || stack.quality !== (row.quality ?? 'normal')) continue;
          if (stack.qty > remaining) physicalError('INVALID', 'Số lượng hoàn trả không khớp phần đã giữ.');
          put(edit, stack);
          remaining -= stack.qty;
          escrow.splice(index, 1);
          index -= 1;
        }
        if (remaining && catalog.get(row.itemSku)?.individual) {
          for (let unit = 0; unit < remaining; unit += 1) {
            const id = edit.newId();
            put(edit, { id, itemSku: row.itemSku, quality: row.quality ?? 'normal', qty: 1, metadata: { instanceId: 'game-' + id } });
          }
        } else if (remaining) {
          put(edit, { id: edit.newId(), itemSku: row.itemSku, quality: row.quality ?? 'normal', qty: remaining });
        }
        changed = true;
      }
      if (changed) next = edit.finish();
    }
    if (escrow.length) physicalError('INVALID', 'Vật phẩm đang giữ chưa được hoàn trả đủ.');
    consumed = consumedNow;
  }

  return {
    rows: [...available.values()].map((row) => ({ ...row })),
    get consumed() { return consumed; },
    get state() { return next; },
    apply,
    validateRod() {
      const rod = held?.stack;
      if (!rod || !/^rod_/.test(rod.itemSku) || !rod.metadata?.instanceId || (rod.metadata.durability ?? 1) <= 0) {
        physicalError('NOT_FOUND', 'Hãy cầm cần câu còn dùng được từ thanh nhanh.');
      }
      return rod.metadata.instanceId;
    },
  };
}
