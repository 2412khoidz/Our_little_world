// Authority stores one aggregate per world, owner, SKU and quality.
export const MAX_INVENTORY_QUANTITY = 2_147_483_647;

export function adjustInventoryQuantity(entries, worldId, ownerScope, itemSku, delta, updatedAt, quality = 'normal') {
  if (!Number.isSafeInteger(delta) || !['normal', 'silver', 'gold'].includes(quality)) {
    return { ok: false, code: 'VALIDATION_ERROR' };
  }
  const index = entries.findIndex((entry) => entry.worldId === worldId && entry.ownerScope === ownerScope
    && entry.itemSku === itemSku && (entry.quality ?? 'normal') === quality);
  const qty = (entries[index]?.qty ?? 0) + delta;
  if (qty < 0) return { ok: false, code: 'INSUFFICIENT_ITEMS' };
  if (!Number.isSafeInteger(qty) || qty > MAX_INVENTORY_QUANTITY) return { ok: false, code: 'STACK_FULL' };
  if (qty === 0) {
    if (index >= 0) entries.splice(index, 1);
  } else {
    const row = { worldId, ownerScope, itemSku, quality, qty, updatedAt };
    if (index >= 0) entries[index] = row;
    else entries.push(row);
  }
  return { ok: true, qty };
}

export function normalizeInventoryRows(rows, worldId) {
  const merged = new Map();
  for (const row of rows) {
    if (!row || row.worldId !== worldId || typeof row.itemSku !== 'string' || !row.itemSku
      || (row.ownerScope !== 'shared' && !/^user:.+$/.test(row.ownerScope))
      || !Number.isSafeInteger(row.qty) || row.qty < 0) {
      throw new Error('Dữ liệu túi đồ không hợp lệ.');
    }
    const quality = row.quality ?? 'normal';
    if (!['normal', 'silver', 'gold'].includes(quality)) throw new Error('Phẩm cấp túi đồ không hợp lệ.');
    if (row.qty === 0) continue;
    const key = JSON.stringify([row.ownerScope, row.itemSku, quality]);
    const prior = merged.get(key);
    const qty = (prior?.qty ?? 0) + row.qty;
    if (qty > MAX_INVENTORY_QUANTITY) throw new Error('Số lượng trong túi đồ vượt giới hạn lưu trữ.');
    const updatedAt = prior && prior.updatedAt > row.updatedAt ? prior.updatedAt : row.updatedAt;
    merged.set(key, { ...row, quality, qty, updatedAt });
  }
  return [...merged.values()];
}

export class InventoryQuantityError extends Error {
  constructor(code) {
    super('Không thể thêm số lượng này vào túi đồ.');
    this.code = code;
  }
}

export function creditInventoryQuantity(entries, worldId, ownerScope, itemSku, qty, updatedAt, quality = 'normal') {
  if (qty === 0) return entries;
  const next = entries.slice();
  const result = adjustInventoryQuantity(next, worldId, ownerScope, itemSku, qty, updatedAt, quality);
  if (!result.ok) throw new InventoryQuantityError(result.code);
  if (qty < 0) throw new InventoryQuantityError('VALIDATION_ERROR');
  return next;
}
