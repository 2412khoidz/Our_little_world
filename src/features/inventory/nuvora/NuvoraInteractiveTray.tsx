import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NuvoraGridCell } from '../../../shared/donor/nuvora/nuvoraPresentationBridge';
import { hotbarSlotIndexForSku, nuvoraHotbarIndexFromHeld } from '../../../shared/donor/nuvora/nuvoraPresentationBridge';
import {
  type NuvoraPickCursor,
  nuvoraClickSlotReadOnly,
} from '../../../shared/donor/nuvora/nuvoraSlotInteraction';
import type { HotbarSlot } from '../../../shared/interaction/interactionTypes';
import { gameEventBus } from '../../../game/eventBus';
import { CatalogSkuIcon } from '../../../ui/components/CatalogSkuIcon';

interface NuvoraInteractiveTrayProps {
  cells: readonly NuvoraGridCell[];
  hotbarSlots: readonly HotbarSlot[];
  heldHotbarIndex: number | null;
  plateLabel?: string;
  showHotbarStrip?: boolean;
  onSlotActivate?: (cell: NuvoraGridCell) => void;
}

function hotbarCells(slots: readonly HotbarSlot[]): NuvoraGridCell[] {
  return Array.from({ length: 8 }, (_, i) => {
    const slot = slots.find((s) => s.slotIndex === i);
    if (!slot?.itemSku || slot.qty < 1) {
      return { sku: null, qty: 0, labelVi: '' };
    }
    return { sku: slot.itemSku, qty: slot.qty, labelVi: slot.labelVi };
  });
}

export function NuvoraInteractiveTray({
  cells,
  hotbarSlots,
  heldHotbarIndex,
  plateLabel = 'TÚI CHUNG',
  showHotbarStrip = true,
  onSlotActivate,
}: NuvoraInteractiveTrayProps) {
  const [cursor, setCursor] = useState<NuvoraPickCursor | null>(null);
  const [tip, setTip] = useState<{ html: string; x: number; y: number } | null>(null);

  const hotbarSlotForSku = useCallback(
    (sku: string) => hotbarSlotIndexForSku(hotbarSlots, sku),
    [hotbarSlots],
  );

  const hbCells = useMemo(() => hotbarCells(hotbarSlots), [hotbarSlots]);
  const selectedHb = nuvoraHotbarIndexFromHeld(heldHotbarIndex);

  const applyClick = useCallback(
    (
      kind: 'inv' | 'hb',
      index: number,
      cell: NuvoraGridCell | null,
      rightClick: boolean,
      shiftKey: boolean,
    ) => {
      const res = nuvoraClickSlotReadOnly(
        cursor,
        { kind, index, cell },
        { rightClick, shiftKey, hotbarSlotForSku },
      );
      setCursor(res.cursor);
      if (res.selectHotbarIndex !== undefined) {
        gameEventBus.emit('cmd:select-hotbar-slot', { slotIndex: res.selectHotbarIndex });
      }
      if (kind === 'inv' && cell?.sku && onSlotActivate && (res.selectHotbarIndex !== undefined || shiftKey)) {
        onSlotActivate(cell);
      }
    },
    [cursor, hotbarSlotForSku, onSlotActivate],
  );

  useEffect(() => {
    if (!cursor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCursor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor]);

  const renderSlot = (cell: NuvoraGridCell, idx: number, kind: 'inv' | 'hb') => {
    const isHot = kind === 'hb';
    const selected = isHot && idx === selectedHb;
    const tipText = cell.sku
      ? `${cell.labelVi}${cell.qty > 1 ? ` ×${cell.qty}` : ''}${isHot ? '<br>Chọn để cầm trên tay' : '<br>Shift: chọn ô nhanh'}`
      : '';
    return (
      <button
        key={`${kind}-${idx}`}
        type="button"
        className={`nuvora-sl ${isHot ? 'nuvora-sl--hot' : ''} ${selected ? 'nuvora-sl--selected' : ''}`}
        data-testid={
          cell.sku
            ? kind === 'hb'
              ? `nuvora-hb-${cell.sku}`
              : `nuvora-cell-${cell.sku}`
            : `nuvora-cell-empty-${kind}-${idx}`
        }
        aria-label={cell.labelVi || 'Ô trống'}
        data-tip={tipText || undefined}
        onPointerDown={(e) => {
          e.preventDefault();
          applyClick(kind, idx, cell, e.button === 2, e.shiftKey);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerEnter={(e) => {
          if (!tipText || cursor) return;
          setTip({ html: tipText.replace('<br>', ' — '), x: e.clientX, y: e.clientY });
        }}
        onPointerLeave={() => setTip(null)}
        onPointerMove={(e) => {
          if (tip) setTip({ ...tip, x: e.clientX, y: e.clientY });
        }}
      >
        {cell.sku ? (
          <>
            <span className="nuvora-sl__icon">
              <CatalogSkuIcon sku={cell.sku} size={28} />
            </span>
            {cell.qty > 1 ? <b className="nuvora-sl__qty">{cell.qty}</b> : null}
          </>
        ) : null}
      </button>
    );
  };

  return (
    <div className="nuvora-tray" data-testid="nuvora-inventory-grid">
      <div className="nuvora-g9">
        {cells.map((cell, idx) => renderSlot(cell, idx, 'inv'))}
      </div>
      {showHotbarStrip && (
        <div className="nuvora-g9 nuvora-g9--hot" data-testid="nuvora-hotbar-strip">
          {hbCells.map((cell, idx) => renderSlot(cell, idx, 'hb'))}
        </div>
      )}
      <div className="nuvora-plate">{plateLabel}</div>
      {cursor && (
        <div
          className="nuvora-cur"
          data-testid="nuvora-inventory-cursor"
          aria-hidden
          style={{ left: '50%', top: '40%' }}
        >
          <span className="nuvora-sl__icon">
            <CatalogSkuIcon sku={cursor.sku} size={28} />
          </span>
          {cursor.qty > 1 ? <b className="nuvora-sl__qty">{cursor.qty}</b> : null}
        </div>
      )}
      {tip && !cursor && (
        <div
          className="nuvora-tip"
          role="tooltip"
          style={{ left: Math.min(tip.x + 14, window.innerWidth - 270), top: tip.y - 8 }}
        >
          {tip.html}
        </div>
      )}
    </div>
  );
}