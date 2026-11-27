import {
  canStackPhysical, checkPhysicalIndex, editBasicPhysicalInventory, physicalError,
  physicalHotbarIndices, physicalSlots, physicalStackLimit,
  type PhysicalCommand, type PhysicalDrop, type PhysicalInventoryEdit, type PhysicalPosition, type PhysicalStack,
} from './physicalInventory';

export const MAX_PHYSICAL_DROPS = 64;
const PICKUP_RADIUS = 40;

export function positionIsUsable(position: { mapId: string; x?: number; y?: number } | null): position is PhysicalPosition {
  return position !== null && Number.isFinite(position.x) && Number.isFinite(position.y);
}

export function canReachDrop(drop: PhysicalDrop, position: PhysicalPosition): boolean {
  return drop.mapId === position.mapId && Math.hypot(drop.x - position.x, drop.y - position.y) <= PICKUP_RADIUS;
}

function isProtected(stack: PhysicalStack): boolean {
  return Boolean(stack.favorite || stack.metadata?.reserved === true);
}

function organize(edit: PhysicalInventoryEdit, kind: 'backpack' | 'home' | 'overflow') {
  const container = edit.edit(kind);
  const active = new Set(kind === 'backpack' ? physicalHotbarIndices(edit.player().activeRow) : []);
  const fixed = (index: number, stack?: PhysicalStack) =>
    Boolean(active.has(index) || container.locked[index] || (stack && isProtected(stack)));
  const items = physicalSlots(container)
    .filter(({ index, stack }) => !fixed(index, stack))
    .sort(({ stack: a }, { stack: b }) =>
      (edit.catalog.get(a.itemSku)?.category ?? '').localeCompare(edit.catalog.get(b.itemSku)?.category ?? '', 'vi')
      || a.itemSku.localeCompare(b.itemSku) || a.quality.localeCompare(b.quality) || a.id.localeCompare(b.id));
  for (const { index } of items) delete container.slots[index];
  let openIndex = 0;
  const packed: { index: number; stack: PhysicalStack }[] = [];
  for (const { stack } of items) {
    const limit = physicalStackLimit(stack, edit.catalog);
    let remaining = stack.qty;
    if (!stack.legacyParcel) {
      for (const target of packed) {
        if (remaining <= 0) break;
        if (!canStackPhysical(stack, target.stack, edit.catalog)) continue;
        const moved = Math.min(remaining, Math.max(0, limit - target.stack.qty));
        if (moved > 0) {
          target.stack = { ...target.stack, qty: target.stack.qty + moved };
          container.slots[target.index] = target.stack;
          remaining -= moved;
        }
      }
    }
    if (remaining === 0) continue;
    while (fixed(openIndex, container.slots[openIndex]) || container.slots[openIndex]) openIndex++;
    checkPhysicalIndex(container, openIndex);
    const next = { ...stack, qty: remaining };
    container.slots[openIndex] = next;
    packed.push({ index: openIndex, stack: next });
    openIndex++;
  }
}

export function editPhysicalInventory(
  edit: PhysicalInventoryEdit,
  command: PhysicalCommand,
  position: PhysicalPosition | null,
): void {
  switch (command.kind) {
    case 'favorite': {
      if (command.at.container !== 'backpack') physicalError('FORBIDDEN', 'Chỉ đánh dấu món trong ba lô của bạn.');
      const { container, stack } = edit.source(command.at, command.stackId, 1, true);
      container.slots[command.at.index] = { ...stack, favorite: !stack.favorite };
      return;
    }
    case 'lock_slot': {
      if (command.at.container !== 'backpack') physicalError('FORBIDDEN', 'Chỉ khóa ô trong ba lô của bạn.');
      const bag = edit.edit('backpack');
      checkPhysicalIndex(bag, command.at.index);
      if (bag.locked[command.at.index]) delete bag.locked[command.at.index];
      else bag.locked[command.at.index] = true;
      return;
    }
    case 'organize':
      organize(edit, command.container);
      return;
    case 'deposit': {
      const bag = edit.edit('backpack');
      const home = edit.edit('home');
      const eligible = physicalSlots(home).filter(({ index }) => !home.locked[index]).map(({ stack }) => stack);
      for (const { index, stack } of physicalSlots(bag)) {
        if (bag.locked[index] || isProtected(stack) || edit.catalog.get(stack.itemSku)?.individual) continue;
        if (command.matchingOnly && !eligible.some((target) => canStackPhysical(stack, target, edit.catalog))) continue;
        const deposited = edit.insert(home, stack);
        if (deposited > 0) edit.take(bag, index, stack, deposited);
      }
      return;
    }
    case 'discard':
    case 'drop': {
      if (command.from.container !== 'backpack') physicalError('FORBIDDEN', 'Hãy chuyển món vào ba lô trước.');
      const { container, stack } = edit.source(command.from, command.stackId, command.qty);
      if (isProtected(stack) || edit.catalog.get(stack.itemSku)?.essential) physicalError('PROTECTED', 'Món này đang được bảo vệ.');
      if (command.kind === 'drop') {
        if (!position) physicalError('UNAVAILABLE', 'Hãy di chuyển một chút để cập nhật vị trí.');
        if (Object.keys(edit.readDrops()).length >= MAX_PHYSICAL_DROPS) {
          physicalError('FULL', 'Đã có nhiều đồ rơi. Hãy nhặt bớt trước khi thả.');
        }
        const id = edit.newId();
        edit.setDrop(id, { ...position, id, droppedBy: edit.userId, stack: edit.span(stack, command.qty, command.qty === stack.qty) });
      } else if (!command.confirm) {
        physicalError('INVALID', 'Cần xác nhận trước khi bỏ món.');
      }
      edit.take(container, command.from.index, stack, command.qty);
      return;
    }
    case 'pickup': {
      const drop = edit.readDrops()[command.dropId];
      if (!drop || !position || !canReachDrop(drop, position)) physicalError('NOT_FOUND', 'Món này đã được nhặt hoặc ở quá xa.');
      const bag = edit.edit('backpack');
      const inserted = edit.insert(bag, drop.stack);
      if (inserted === 0) physicalError('FULL', 'Ba lô đã đầy. Món đồ vẫn ở mặt đất.');
      edit.setDrop(drop.id, inserted === drop.stack.qty ? null : {
        ...drop, stack: { ...drop.stack, qty: drop.stack.qty - inserted },
      });
      return;
    }
    default:
      editBasicPhysicalInventory(edit, command);
  }
}

/** A domain action can use nearby authorized storage for inputs. Workflows must commit the resulting edit atomically. */
export function reservePhysicalIngredients(
  edit: PhysicalInventoryEdit,
  requirements: readonly { sku: string; qty: number }[],
  allowHomeStorage: boolean,
): { container: 'backpack' | 'home'; originalIndex: number; stack: PhysicalStack }[] {
  const reservations: { container: 'backpack' | 'home'; originalIndex: number; stack: PhysicalStack }[] = [];
  const sources = allowHomeStorage && edit.atHome ? ['backpack', 'home'] as const : ['backpack'] as const;
  for (const requirement of requirements) {
    let remaining = requirement.qty;
    if (!Number.isSafeInteger(remaining) || remaining < 1) physicalError('INVALID', 'Số nguyên liệu không hợp lệ.');
    for (const kind of sources) {
      const container = edit.edit(kind);
      for (const { index, stack } of physicalSlots(container)) {
        if (!remaining) break;
        if (container.locked[index] || isProtected(stack) || stack.itemSku !== requirement.sku
          || edit.catalog.get(stack.itemSku)?.individual) continue;
        const qty = Math.min(remaining, stack.qty);
        reservations.push({ container: kind, originalIndex: index, stack: edit.span(stack, qty, qty === stack.qty) });
        edit.take(container, index, stack, qty);
        remaining -= qty;
      }
    }
    if (remaining) physicalError('NOT_FOUND', 'Thiếu nguyên liệu trong ba lô hoặc kho đang mở.');
  }
  return reservations;
}
