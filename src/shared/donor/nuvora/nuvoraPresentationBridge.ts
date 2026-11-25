/**
 * Maps OLW server inventory rows → NUVORA-style grid cells (read-only presentation).
 * Donor: NUVORA `public/items.js` slot array shape; authority stays on WorldBackend.inventory.
 */
export interface NuvoraGridCell {
  readonly sku: string | null;
  readonly qty: number;
  readonly labelVi: string;
}

const DEFAULT_CAPACITY = 36;

export function inventoryRowsToNuvoraGrid(
  items: ReadonlyArray<{ readonly itemSku: string; readonly qty: number }>,
  nameForSku: (sku: string) => string,
  capacity: number = DEFAULT_CAPACITY,
): NuvoraGridCell[] {
  const cells: NuvoraGridCell[] = Array.from({ length: capacity }, () => ({
    sku: null,
    qty: 0,
    labelVi: '',
  }));
  items.forEach((row, index) => {
    if (index >= capacity || row.qty <= 0) return;
    cells[index] = {
      sku: row.itemSku,
      qty: row.qty,
      labelVi: nameForSku(row.itemSku),
    };
  });
  return cells;
}

/** Hotbar selection index mirrors NUVORA `inv.sel` (0-based). */
export function nuvoraHotbarIndexFromHeld(slotIndex: number | null): number {
  if (slotIndex === null || slotIndex < 0) return 0;
  return slotIndex;
}

/** Map SKU → first hotbar slot from inventoryHotbarAdapter projection. */
export function hotbarSlotIndexForSku(
  slots: ReadonlyArray<{ readonly slotIndex: number; readonly itemSku: string | null; readonly qty: number }>,
  sku: string,
): number | null {
  const found = slots.find((s) => s.itemSku === sku && s.qty > 0);
  return found ? found.slotIndex : null;
}