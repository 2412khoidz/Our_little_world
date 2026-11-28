import type { TradeSession } from './physicalTrade';
import type { InventoryCatalogItem, InventoryOwnerScope, ItemQualityTier } from './inventoryTypes';

export const BACKPACK_ROW_SIZE = 9;
export const BACKPACK_TIERS = [18, 27, 36, 45, 54] as const;
export const BACKPACK_UPGRADE_COSTS = [100, 250, 500, 850] as const;
export const STORAGE_PAGE_SIZE = 36;
export const MAX_PHYSICAL_STACK = 99;
const MAX_INDEX = 2_147_483_646;

type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export type PhysicalItemMetadata = Readonly<Record<string, Json>> & {
  readonly instanceId?: string;
  readonly durability?: number;
};

export interface PhysicalStack {
  readonly id: string;
  readonly itemSku: string;
  readonly quality: ItemQualityTier;
  readonly qty: number;
  readonly metadata?: PhysicalItemMetadata;
  readonly favorite?: boolean;
  readonly legacyParcel?: boolean;
}

export interface PhysicalContainer {
  readonly capacity: number | null;
  readonly slots: Partial<Record<number, PhysicalStack>>;
  readonly locked: Partial<Record<number, true>>;
}

export interface PhysicalBackpack {
  readonly tier: number;
  readonly activeRow: number;
  readonly importedShortcuts?: boolean;
}

export interface PhysicalPosition {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
}

export interface PhysicalDrop extends PhysicalPosition {
  readonly id: string;
  readonly droppedBy: string;
  readonly pickupAfterMs?: number;
  readonly dropperExited?: boolean;
  readonly stack: PhysicalStack;
}

export interface PhysicalInventory {
  readonly schemaVersion: 1;
  readonly version: number;
  readonly nextId: number;
  readonly containers: Record<string, PhysicalContainer>;
  readonly players: Partial<Record<string, PhysicalBackpack>>;
  readonly tradeReceipts?: Readonly<Record<string, TradeSession>>;
  readonly starterClaims?: Readonly<Record<string, readonly string[]>>;
  readonly drops?: Record<string, PhysicalDrop>;
}

export type ContainerKind = 'backpack' | 'home' | 'overflow';
export interface PhysicalSlotAddress {
  readonly container: ContainerKind;
  readonly index: number;
}

export interface PhysicalDefinition {
  readonly name: string;
  readonly category: string;
  readonly stackLimit: number;
  readonly individual?: boolean;
  readonly essential?: boolean;
}
export type PhysicalCatalog = ReadonlyMap<string, PhysicalDefinition>;

const ESSENTIAL = new Set(['tool_hoe', 'tool_watering_can', 'water_pitcher', 'rod_basic']);
const catalogCache = new WeakMap<readonly InventoryCatalogItem[], PhysicalCatalog>();
export function getPhysicalCatalog(ref: readonly InventoryCatalogItem[]): PhysicalCatalog {
  const cached = catalogCache.get(ref);
  if (cached) return cached;
  const catalog = new Map(ref.map((row) => [row.sku, {
    name: row.nameVi,
    category: row.category ?? row.purpose,
    stackLimit: Math.min(MAX_PHYSICAL_STACK, Math.max(1, row.stackLimit)),
    individual: ESSENTIAL.has(row.sku) || row.purpose === 'tool' || /^(rod_|tool_|accessory_)/.test(row.sku),
    essential: ESSENTIAL.has(row.sku),
  }]));
  catalogCache.set(ref, catalog);
  return catalog;
}

export interface LegacyPhysicalEntry {
  readonly worldId: string;
  readonly ownerScope: InventoryOwnerScope;
  readonly itemSku: string;
  readonly quality?: ItemQualityTier;
  readonly qty: number;
  readonly metadata?: PhysicalItemMetadata;
}

export interface PhysicalShortcut {
  readonly index: number;
  readonly itemSku: string;
  readonly quality: ItemQualityTier;
  readonly ownerScope: InventoryOwnerScope;
}

export type PhysicalCommand =
  | { readonly kind: 'move'; readonly from: PhysicalSlotAddress; readonly to: PhysicalSlotAddress; readonly qty: number; readonly stackId: string }
  | { readonly kind: 'transfer'; readonly from: PhysicalSlotAddress; readonly to: ContainerKind; readonly qty: number; readonly stackId: string }
  | { readonly kind: 'rotate'; readonly direction: -1 | 1 }
  | { readonly kind: 'import_shortcuts'; readonly shortcuts: readonly PhysicalShortcut[] }
  | { readonly kind: 'favorite'; readonly at: PhysicalSlotAddress; readonly stackId: string }
  | { readonly kind: 'lock_slot'; readonly at: PhysicalSlotAddress }
  | { readonly kind: 'organize'; readonly container: ContainerKind }
  | { readonly kind: 'deposit'; readonly matchingOnly: boolean }
  | { readonly kind: 'drop'; readonly from: PhysicalSlotAddress; readonly qty: number; readonly stackId: string }
  | { readonly kind: 'pickup'; readonly dropId: string; readonly automatic?: boolean }
  | { readonly kind: 'arm_pickup'; readonly dropId: string }
  | { readonly kind: 'claim_starter' }
  | { readonly kind: 'upgrade_backpack' }
  | { readonly kind: 'sell'; readonly from: PhysicalSlotAddress; readonly qty: number; readonly stackId: string; readonly channel: 'market' | 'shipping' }
  | { readonly kind: 'discard'; readonly from: PhysicalSlotAddress; readonly qty: number; readonly stackId: string; readonly confirm: true };

export type PhysicalErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'VERSION_CONFLICT' | 'FULL' | 'PROTECTED'
  | 'INVALID' | 'INSUFFICIENT_FUNDS' | 'UNAVAILABLE';

export class PhysicalInventoryError extends Error {
  readonly code: PhysicalErrorCode;
  constructor(code: PhysicalErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function physicalError(code: PhysicalErrorCode, message: string): never {
  throw new PhysicalInventoryError(code, message);
}

export function containerId(kind: ContainerKind, userId: string): string {
  return kind === 'home' ? 'home' : kind + ':' + userId;
}

function emptyContainer(capacity: number | null): PhysicalContainer {
  return { capacity, slots: {}, locked: {} };
}

export function playerBackpack(inventory: PhysicalInventory, userId: string): PhysicalBackpack {
  return Object.hasOwn(inventory.players, userId) ? inventory.players[userId]! : { tier: 0, activeRow: 0 };
}

export function readPhysicalContainer(state: PhysicalInventory, kind: ContainerKind, userId: string): PhysicalContainer {
  return state.containers[containerId(kind, userId)]
    ?? emptyContainer(kind === 'backpack' ? BACKPACK_TIERS[playerBackpack(state, userId).tier]! : null);
}

function canonicalMetadata(value: Json | undefined): string {
  if (value === undefined) return '{}';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalMetadata).join(',') + ']';
  return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a === b ? 0 : 1)
    .map(([key, member]) => JSON.stringify(key) + ':' + canonicalMetadata(member)).join(',') + '}';
}

export function physicalStackKey(stack: Pick<PhysicalStack, 'itemSku' | 'quality' | 'metadata'>): string {
  return JSON.stringify([stack.itemSku, stack.quality, canonicalMetadata(stack.metadata)]);
}

export function canStackPhysical(a: PhysicalStack, b: PhysicalStack, catalog: PhysicalCatalog): boolean {
  return !a.legacyParcel && !b.legacyParcel && !a.metadata?.instanceId && !b.metadata?.instanceId && !catalog.get(a.itemSku)?.individual
    && physicalStackKey(a) === physicalStackKey(b) && Boolean(a.favorite) === Boolean(b.favorite);
}

export function physicalStackLimit(stack: Pick<PhysicalStack, 'itemSku' | 'metadata'>, catalog: PhysicalCatalog): number {
  const def = catalog.get(stack.itemSku);
  if (stack.metadata?.instanceId || def?.individual) return 1;
  return Math.min(MAX_PHYSICAL_STACK, def?.stackLimit ?? MAX_PHYSICAL_STACK);
}

export function physicalSlots(container: PhysicalContainer): { index: number; stack: PhysicalStack }[] {
  return Object.entries(container.slots).map(([index, stack]) => ({ index: Number(index), stack: stack! }));
}

export function checkPhysicalIndex(container: PhysicalContainer, index: number): void {
  if (!Number.isSafeInteger(index) || index < 0 || index > MAX_INDEX
    || (container.capacity !== null && index >= container.capacity)) {
    physicalError('INVALID', 'Ô túi đồ không hợp lệ.');
  }
}

function checkAmount(qty: number, available: number): void {
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > available) physicalError('INVALID', 'Số lượng không hợp lệ.');
}

export class PhysicalInventoryEdit {
  private readonly draft: PhysicalInventory;
  private readonly touched = new Set<string>();
  private serial: number;
  private changedDrops: Record<string, PhysicalDrop> | undefined;
  readonly userId: string;
  readonly catalog: PhysicalCatalog;
  readonly atHome: boolean;

  constructor(state: PhysicalInventory, userId: string, catalog: PhysicalCatalog, atHome: boolean) {
    this.userId = userId;
    this.catalog = catalog;
    this.atHome = atHome;
    this.draft = { ...state, containers: { ...state.containers }, players: { ...state.players } };
    this.serial = state.nextId;
  }

  read(kind: ContainerKind): PhysicalContainer {
    return readPhysicalContainer(this.draft, kind, this.userId);
  }

  edit(kind: ContainerKind): PhysicalContainer {
    if (kind !== 'backpack' && !this.atHome) physicalError('FORBIDDEN', 'Hãy đến gần tủ kho trong nhà.');
    const id = containerId(kind, this.userId);
    if (!this.touched.has(id)) {
      const existing = this.read(kind);
      this.draft.containers[id] = { ...existing, slots: { ...existing.slots }, locked: { ...existing.locked } };
      this.touched.add(id);
    }
    return this.draft.containers[id]!;
  }

  player(): PhysicalBackpack { return playerBackpack(this.draft, this.userId); }

  setPlayer(next: PhysicalBackpack): void { this.draft.players[this.userId] = next; }

  setCapacity(capacity: number): void {
    const backpack = this.edit('backpack');
    this.draft.containers[containerId('backpack', this.userId)] = { ...backpack, capacity };
  }

  readDrops(): Readonly<Record<string, PhysicalDrop>> { return this.changedDrops ?? this.draft.drops ?? {}; }

  setDrop(id: string, drop: PhysicalDrop | null) {
    this.changedDrops ??= { ...this.draft.drops };
    if (drop) this.changedDrops[id] = drop;
    else delete this.changedDrops[id];
  }

  newId(): string { return 'stack-' + this.serial++; }

  span(stack: PhysicalStack, qty: number, keepId: boolean): PhysicalStack {
    const { legacyParcel, ...rest } = stack;
    return { ...rest, ...(legacyParcel && qty > physicalStackLimit(stack, this.catalog) ? { legacyParcel } : {}), id: keepId ? stack.id : this.newId(), qty };
  }

  source(address: PhysicalSlotAddress, stackId: string, qty: number, allowLocked = false) {
    const container = this.edit(address.container);
    checkPhysicalIndex(container, address.index);
    const stack = container.slots[address.index];
    if (!stack || stack.id !== stackId) physicalError('VERSION_CONFLICT', 'Món đồ ở ô này vừa thay đổi.');
    if (!allowLocked && container.locked[address.index]) physicalError('PROTECTED', 'Ô này đang được khóa.');
    checkAmount(qty, stack.qty);
    return { container, stack };
  }

  take(container: PhysicalContainer, index: number, stack: PhysicalStack, qty: number): void {
    if (qty === stack.qty) delete container.slots[index];
    else container.slots[index] = { ...stack, qty: stack.qty - qty };
  }

  /** Insert into compatible existing stacks, then free slots. Returns the inserted quantity. */
  insert(container: PhysicalContainer, stack: PhysicalStack): number {
    let remaining = stack.qty;
    const limit = physicalStackLimit(stack, this.catalog);
    for (const { index, stack: target } of physicalSlots(container)) {
      if (remaining === 0) break;
      if (container.locked[index] || !canStackPhysical(stack, target, this.catalog)) continue;
      const qty = Math.min(remaining, Math.max(0, limit - target.qty));
      if (qty) container.slots[index] = { ...target, qty: target.qty + qty };
      remaining -= qty;
    }
    for (let index = 0; remaining > 0 && index < (container.capacity ?? MAX_INDEX); index++) {
      if (container.slots[index] || container.locked[index]) continue;
      const qty = Math.min(limit, remaining);
      container.slots[index] = this.span(stack, qty, remaining === stack.qty && qty === stack.qty);
      remaining -= qty;
    }
    return stack.qty - remaining;
  }

  finish(): PhysicalInventory {
    return { ...this.draft, ...(this.changedDrops ? { drops: this.changedDrops } : {}), nextId: this.serial, version: this.draft.version + 1 };
  }
}

function putLegacyParcel(container: PhysicalContainer, stack: PhysicalStack): void {
  let index = 0;
  while (container.slots[index] || container.locked[index]) index++;
  container.slots[index] = { ...stack, legacyParcel: true };
}

export function migratePhysicalInventory(
  previous: PhysicalInventory | undefined,
  worldId: string,
  rows: readonly LegacyPhysicalEntry[],
  catalog: PhysicalCatalog,
): PhysicalInventory {
  if (previous) return normalizePhysicalStacks(previous, catalog);
  if (rows.some((row) => row.worldId !== worldId)) physicalError('INVALID', 'Save có vật phẩm thuộc một nhà khác.');
  const initial: PhysicalInventory = { schemaVersion: 1, version: 0, nextId: 1, containers: {}, players: {} };
  // Stable ordering keeps the same slot assignments across repeat imports of the same legacy save.
  const ordered = rows.filter((row) => row.qty !== 0)
    .map((row, index) => ({ row, index, key: JSON.stringify([row.ownerScope, row.itemSku, row.quality ?? 'normal', canonicalMetadata(row.metadata)]) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key === b.key ? a.index - b.index : 1));
  let state = initial;
  // Rows for the same scope are contiguous after sorting. Copy a container once per owner.
  let edit: PhysicalInventoryEdit | undefined;
  let ownerScope: InventoryOwnerScope | undefined;
  const instances = new Set<string>();
  for (const { row } of ordered) {
    const instance = row.metadata?.instanceId;
    if (!instance) continue;
    if (row.qty !== 1 || instances.has(instance)) {
      physicalError('INVALID', 'Save có định danh trang bị trùng hoặc không hợp lệ.');
    }
    instances.add(instance);
  }
  for (const { row } of ordered) {
    checkAmount(row.qty, 2_147_483_647);
    const isShared = row.ownerScope === 'shared';
    if (!isShared && !/^user:[\w-]+$/.test(row.ownerScope)) physicalError('INVALID', 'Chủ sở hữu trong save không hợp lệ.');
    if (row.quality !== undefined && !['normal', 'silver', 'gold'].includes(row.quality)) {
      physicalError('INVALID', 'Phẩm cấp trong save không hợp lệ.');
    }
    if (!edit || ownerScope !== row.ownerScope) {
      if (edit) state = edit.finish();
      edit = new PhysicalInventoryEdit(state, isShared ? '' : row.ownerScope.slice(5), catalog, true);
      ownerScope = row.ownerScope;
    }
    const target = edit.edit(isShared ? 'home' : 'backpack');
    const id = edit.newId();
    const stack: PhysicalStack = { id, itemSku: row.itemSku, quality: row.quality ?? 'normal', qty: row.qty, metadata: row.metadata };
    if (catalog.get(row.itemSku)?.individual && !row.metadata?.instanceId) {
      if (row.qty > 4096) physicalError('INVALID', 'Save có quá nhiều bản sao của một trang bị. Hãy giữ bản sao để kiểm tra.');
      for (let index = 0; index < row.qty; index++) {
        let unitId = edit.newId();
        while (instances.has('legacy-' + unitId)) unitId = edit.newId();
        const instanceId = 'legacy-' + unitId;
        instances.add(instanceId);
        const individual = { ...stack, id: unitId, qty: 1, metadata: { ...stack.metadata, instanceId } };
        if (edit.insert(target, individual) === 0) edit.insert(edit.edit('overflow'), individual);
      }
    } else {
      const parcelThreshold = physicalStackLimit(stack, catalog) * STORAGE_PAGE_SIZE;
      if (isShared && stack.qty > parcelThreshold) {
        putLegacyParcel(target, stack);
        continue;
      }
      const inserted = edit.insert(target, stack);
      if (inserted < stack.qty) {
        const overflow = edit.edit('overflow');
        const remainder = edit.span(stack, stack.qty - inserted, inserted === 0);
        if (remainder.qty > parcelThreshold) putLegacyParcel(overflow, remainder);
        else edit.insert(overflow, remainder);
      }
    }
  }
  return { ...(edit?.finish() ?? state), version: 1 };
}

/** Repack previously saved physical stacks without moving unaffected slots. */
export function normalizePhysicalStacks(previous: PhysicalInventory, catalog: PhysicalCatalog): PhysicalInventory {
  let state = previous;
  for (const [id, original] of Object.entries(previous.containers)) {
    const kind = (id === 'home' ? 'home' : id.slice(0, id.indexOf(':'))) as ContainerKind;
    const owner = id === 'home' ? '' : id.slice(id.indexOf(':') + 1);
    const oversized = physicalSlots(original).filter(({ stack }) => stack.qty > physicalStackLimit(stack, catalog)
      && !(kind !== 'backpack' && stack.legacyParcel && stack.qty > physicalStackLimit(stack, catalog) * STORAGE_PAGE_SIZE));
    if (!oversized.length) continue;
    const edit = new PhysicalInventoryEdit(state, owner, catalog, true);
    const container = edit.edit(kind);
    // Keep the existing ID at its original address and prevent a remainder
    // from merging into another oversized stack that is still being split.
    for (const { index, stack } of oversized) {
      if (stack.metadata?.instanceId || catalog.get(stack.itemSku)?.individual)
        physicalError('INVALID', 'Save có nhiều món cùng một định danh trang bị.');
      container.slots[index] = edit.span(stack, physicalStackLimit(stack, catalog), true);
    }
    for (const { stack } of oversized) {
      const extra = stack.qty - physicalStackLimit(stack, catalog);
      const { legacyParcel: _parcel, ...remainder } = edit.span(stack, extra, false);
      if (kind !== 'backpack' && extra > physicalStackLimit(stack, catalog) * STORAGE_PAGE_SIZE) {
        putLegacyParcel(container, remainder);
        continue;
      }
      const accepted = edit.insert(container, remainder);
      if (accepted < extra) {
        const overflow = edit.edit('overflow');
        const rest = { ...remainder, qty: extra - accepted };
        if (rest.qty > physicalStackLimit(stack, catalog) * STORAGE_PAGE_SIZE) putLegacyParcel(overflow, rest);
        else edit.insert(overflow, rest);
      }
    }
    state = edit.finish();
  }
  const oversizedDrops = Object.values(state.drops ?? {}).filter(({ stack }) => !stack.legacyParcel
    && stack.qty > physicalStackLimit(stack, catalog));
  if (oversizedDrops.length) {
    const edit = new PhysicalInventoryEdit(state, '', catalog, false);
    for (const drop of oversizedDrops) edit.setDrop(drop.id, { ...drop, stack: { ...drop.stack, legacyParcel: true } });
    state = edit.finish();
  }
  return state;
}

function importShortcuts(edit: PhysicalInventoryEdit, shortcuts: readonly PhysicalShortcut[]) {
  const player = edit.player();
  if (player.importedShortcuts) physicalError('INVALID', 'Các ô nhanh cũ đã được chuyển.');
  if (shortcuts.length > BACKPACK_ROW_SIZE) physicalError('INVALID', 'Có quá nhiều ô nhanh cũ.');
  const pack = edit.edit('backpack');
  const home = edit.edit('home');
  const assigned = new Set<number>();
  for (const shortcut of shortcuts) {
    const { index, itemSku, quality, ownerScope } = shortcut;
    if (!Number.isInteger(index) || index < 0 || index >= BACKPACK_ROW_SIZE || assigned.has(index)
      || (ownerScope !== 'shared' && ownerScope !== 'user:' + edit.userId) || pack.locked[index]) continue;
    const source = ownerScope === 'shared' ? home : pack;
    const found = physicalSlots(source).find(({ index: origin, stack }) => !source.locked[origin]
      && (source === home || !assigned.has(origin))
      && stack.itemSku === itemSku && stack.quality === quality);
    if (!found) continue;
    const displaced = pack.slots[index];
    if (source === pack) {
      if (found.index !== index) {
        pack.slots[index] = found.stack;
        if (displaced) pack.slots[found.index] = displaced;
        else delete pack.slots[found.index];
      }
    } else {
      if (displaced) {
        const open = Array.from({ length: pack.capacity! }, (_, slot) => slot)
          .find((slot) => slot !== index && !pack.slots[slot] && !pack.locked[slot] && !assigned.has(slot));
        if (open === undefined) continue;
        pack.slots[open] = displaced;
      }
      // Legacy links to a shared stack recorded intent to equip one item.
      pack.slots[index] = edit.span(found.stack, 1, found.stack.qty === 1);
      edit.take(source, found.index, found.stack, 1);
    }
    assigned.add(index);
  }
  edit.setPlayer({ ...player, importedShortcuts: true });
}

type BasicPhysicalCommand = Extract<PhysicalCommand, { kind: 'rotate' | 'move' | 'transfer' | 'import_shortcuts' }>;

export function editBasicPhysicalInventory(edit: PhysicalInventoryEdit, command: BasicPhysicalCommand): void {
  if (command.kind === 'rotate') {
    const player = edit.player();
    if (command.direction !== -1 && command.direction !== 1) physicalError('INVALID', 'Hướng đổi hàng không hợp lệ.');
    const rows = BACKPACK_TIERS[player.tier]! / BACKPACK_ROW_SIZE;
    edit.setPlayer({ ...player, activeRow: (player.activeRow + command.direction + rows) % rows });
    return;
  }
  if (command.kind === 'import_shortcuts') {
    importShortcuts(edit, command.shortcuts);
    return;
  }
  const { container: source, stack } = edit.source(command.from, command.stackId, command.qty);
  const targetKind = command.kind === 'move' ? command.to.container : command.to;
  if (stack.metadata?.starterOwner && targetKind !== 'backpack') physicalError('PROTECTED', 'Dụng cụ cơ bản gắn với ba lô của bạn.');
  if (command.kind === 'transfer') {
    if (command.from.container === command.to) physicalError('INVALID', 'Hãy chọn một kho khác.');
    const dest = edit.edit(command.to);
    const qty = stack.legacyParcel ? Math.min(command.qty, physicalStackLimit(stack, edit.catalog)) : command.qty;
    const inserted = edit.insert(dest, edit.span(stack, qty, qty === stack.qty));
    if (inserted === 0) physicalError('FULL', 'Ba lô đầy.');
    edit.take(source, command.from.index, stack, inserted);
    return;
  }
  if (command.from.container === command.to.container && command.from.index === command.to.index) return;
  const dest = edit.edit(command.to.container);
  checkPhysicalIndex(dest, command.to.index);
  if (dest.locked[command.to.index]) physicalError('PROTECTED', 'Ô đích đang được khóa.');
  const target = dest.slots[command.to.index];
  if (target?.metadata?.starterOwner && command.from.container !== 'backpack')
    physicalError('PROTECTED', 'Dụng cụ cơ bản gắn với ba lô của bạn.');
  if (target && !canStackPhysical(stack, target, edit.catalog)) {
    if (command.qty !== stack.qty || stack.legacyParcel || target.legacyParcel) {
      physicalError('INVALID', 'Cần chọn cả chồng thường để đổi chỗ.');
    }
    source.slots[command.from.index] = target;
    dest.slots[command.to.index] = stack;
    return;
  }
  const room = physicalStackLimit(stack, edit.catalog) - (target?.qty ?? 0);
  if (room <= 0) physicalError('FULL', 'Ô này đã đầy.');
  const qty = Math.min(room, command.qty);
  dest.slots[command.to.index] = target
    ? { ...target, qty: target.qty + qty }
    : edit.span(stack, qty, qty === stack.qty);
  edit.take(source, command.from.index, stack, qty);
}

export function debitPhysicalBackpackSlot(
  edit: PhysicalInventoryEdit,
  slot: number,
  stackId: string,
  qty: number,
  eligible: (stack: PhysicalStack) => boolean,
): PhysicalStack {
  const { container, stack } = edit.source({ container: 'backpack', index: slot }, stackId, qty, true);
  if (!eligible(stack)) physicalError('INVALID', 'Món đang chọn không phù hợp với thao tác.');
  edit.take(container, slot, stack, qty);
  return edit.span(stack, qty, qty === stack.qty);
}

export function physicalHotbarIndices(activeRow: number): number[] {
  return Array.from({ length: BACKPACK_ROW_SIZE }, (_, index) => activeRow * BACKPACK_ROW_SIZE + index);
}
