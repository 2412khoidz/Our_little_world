/**
 * NUVORA `public/ui.js` clickSlot / quickMove — read-only OLW adaptation.
 * Cursor + hotbar equip intent only; inventory rows stay on WorldBackend.
 */

export interface NuvoraPickCursor {
  readonly sku: string;
  readonly qty: number;
  readonly labelVi: string;
}

export type NuvoraSlotKind = 'inv' | 'hb';

export interface NuvoraSlotCell {
  readonly sku: string | null;
  readonly qty: number;
  readonly labelVi: string;
}

export interface NuvoraClickResult {
  readonly cursor: NuvoraPickCursor | null;
  /** OLW hotbar authority: select projected slot from inventoryHotbarAdapter. */
  readonly selectHotbarIndex?: number;
}

export interface NuvoraClickOptions {
  readonly rightClick?: boolean;
  readonly shiftKey?: boolean;
  readonly hotbarSlotForSku: (sku: string) => number | null;
}

/** Shift-click quick equip (donor `quickMove` stash-to-hotbar semantics). */
export function nuvoraQuickEquipFromCell(
  cell: NuvoraSlotCell | null,
  hotbarSlotForSku: (sku: string) => number | null,
): NuvoraClickResult {
  if (!cell?.sku) return { cursor: null };
  const idx = hotbarSlotForSku(cell.sku);
  if (idx === null) return { cursor: null };
  return { cursor: null, selectHotbarIndex: idx };
}

/**
 * Pointer pick on grid or hotbar strip — does not debit server inventory.
 * Left click on equipped SKU → hotbar select; otherwise ghost cursor for drag affordance.
 */
export function nuvoraClickSlotReadOnly(
  cursor: NuvoraPickCursor | null,
  target: { readonly kind: NuvoraSlotKind; readonly index: number; readonly cell: NuvoraSlotCell | null },
  opts: NuvoraClickOptions,
): NuvoraClickResult {
  if (opts.shiftKey && target.cell?.sku) {
    return nuvoraQuickEquipFromCell(target.cell, opts.hotbarSlotForSku);
  }

  if (target.kind === 'hb' && target.cell?.sku) {
    return { cursor, selectHotbarIndex: target.index };
  }

  const s = target.cell;
  const c = cursor;

  if (!c) {
    if (!s?.sku) return { cursor: null };
    if (opts.rightClick && s.qty > 1) {
      return {
        cursor: { sku: s.sku, qty: Math.ceil(s.qty / 2), labelVi: s.labelVi },
      };
    }
    const idx = opts.hotbarSlotForSku(s.sku);
    if (idx !== null) return { cursor: null, selectHotbarIndex: idx };
    return { cursor: { sku: s.sku, qty: s.qty, labelVi: s.labelVi } };
  }

  if (!s?.sku) return { cursor: c };
  if (s.sku === c.sku) {
    const idx = opts.hotbarSlotForSku(s.sku);
    return { cursor: null, selectHotbarIndex: idx ?? undefined };
  }
  return { cursor: c };
}