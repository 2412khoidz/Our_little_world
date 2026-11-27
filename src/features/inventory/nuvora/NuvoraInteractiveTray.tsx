import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  applyDirectSlotDrop,
  applyInventorySlotInteraction,
  cancelInventoryCursor,
  type BagScopeTab,
  type InventoryPickedCursor,
} from '../../../shared/donor/nuvora/nuvoraSlotInteraction';
import { nuvoraHotbarIndexFromHeld } from '../../../shared/donor/nuvora/nuvoraPresentationBridge';
import type { HotbarSlot } from '../../../shared/interaction/interactionTypes';
import type { ItemQualityTier } from '../../../shared/interaction/hotbarContract';
import {
  bagPageSize,
  HOTBAR_CAPACITY,
  sameStackRef,
  type InventoryLayoutState,
  type InventoryStackRef,
} from '../../../shared/inventory/inventoryLayoutStore';
import { gameEventBus } from '../../../game/eventBus';
import { CatalogSkuIcon } from '../../../ui/components/CatalogSkuIcon';

export type InspectedSlotRef = {
  readonly kind: 'bag' | 'hotbar';
  readonly scope: BagScopeTab;
  readonly index: number;
};

interface NuvoraInteractiveTrayProps {
  scope: BagScopeTab;
  layout: InventoryLayoutState;
  page: number;
  cursor: InventoryPickedCursor | null;
  stackLimitForStack: (stack: InventoryStackRef) => number;
  catalogStackLimit: (sku: string) => number;
  onChangeLayout: (next: InventoryLayoutState, cursor: InventoryPickedCursor | null) =>
    { layout: InventoryLayoutState; cursor: InventoryPickedCursor | null };
  hotbarSlots: readonly HotbarSlot[];
  heldHotbarIndex: number | null;
  labelForSku: (sku: string) => string;
  inspectedRef?: InspectedSlotRef | null;
  onInspect?: (ref: InspectedSlotRef | null) => void;
  plateLabel?: string;
  showHotbarStrip?: boolean;
  /** Touch-friendly mode: single tap inspects/selects instead of picking up a floating cursor; drag remains optional. */
  touchMode?: boolean;
  /** Optional bag slot queued for tap-to-swap move without dragging. */
  pendingMoveBagIndex?: number | null;
  onCompleteTouchMove?: (destKind: 'bag' | 'hotbar', destIndex: number) => void;
}

interface TrayDisplayCell {
  readonly sku: string | null;
  readonly qty: number;
  readonly quality: ItemQualityTier;
  readonly labelVi: string;
  readonly waterFillLevel?: number;
}

interface ActiveDragState {
  readonly sourceKind: 'bag' | 'hotbar';
  readonly sourceIndex: number;
  readonly sku: string;
  readonly qty: number;
  readonly quality: ItemQualityTier;
  readonly labelVi: string;
}

function qualityBadgeText(quality: ItemQualityTier): string | null {
  if (quality === 'gold') return 'Vàng';
  if (quality === 'silver') return 'Bạc';
  return null;
}

export function NuvoraInteractiveTray({
  scope,
  layout,
  page,
  cursor,
  stackLimitForStack,
  catalogStackLimit,
  onChangeLayout,
  hotbarSlots,
  heldHotbarIndex,
  labelForSku,
  inspectedRef = null,
  onInspect,
  plateLabel = 'TÚI CHUNG',
  showHotbarStrip = true,
  touchMode = false,
  pendingMoveBagIndex = null,
  onCompleteTouchMove,
}: NuvoraInteractiveTrayProps) {
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [dropHover, setDropHover] = useState<{ kind: 'bag' | 'hotbar'; index: number } | null>(null);
  const [tip, setTip] = useState<{ html: string; x: number; y: number } | null>(null);

  const trayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    page: number;
    kind: 'bag' | 'hotbar';
    index: number;
    startX: number;
    startY: number;
    rightClick: boolean;
    shiftKey: boolean;
    cell: TrayDisplayCell;
    stack: InventoryStackRef | null;
  } | null>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const latest = useRef({
    cursor, layout, scope, page, stackLimitForStack, onChangeLayout, labelForSku, heldHotbarIndex,
    onInspect, touchMode, pendingMoveBagIndex, onCompleteTouchMove,
  });

  useLayoutEffect(() => {
    latest.current = {
      cursor, layout, scope, page, stackLimitForStack, onChangeLayout, labelForSku, heldHotbarIndex,
      onInspect, touchMode, pendingMoveBagIndex, onCompleteTouchMove,
    };
  });

  const pageSize = bagPageSize(scope);
  const firstOnPage = page * pageSize;
  const bagCells: TrayDisplayCell[] = (
    scope === 'shared' ? layout.sharedCells : layout.personalCells
  ).slice(firstOnPage, firstOnPage + pageSize).map((cell) => {
    if (!cell || cell.qty <= 0) {
      return { sku: null, qty: 0, quality: 'normal', labelVi: '' };
    }
    return {
      sku: cell.itemSku,
      qty: cell.qty,
      quality: cell.quality,
      labelVi: labelForSku(cell.itemSku),
    };
  });

  const hbCells: TrayDisplayCell[] = Array.from({ length: HOTBAR_CAPACITY }, (_, i) => {
    const slot = hotbarSlots.find((s) => s.slotIndex === i);
    if (!slot?.itemSku || slot.qty < 1) {
      return { sku: null, qty: 0, quality: 'normal', labelVi: '' };
    }
    return {
      sku: slot.itemSku,
      qty: slot.qty,
      quality: slot.quality ?? 'normal',
      labelVi: slot.labelVi,
      waterFillLevel: slot.waterFillLevel,
    };
  });

  const selectedHb = nuvoraHotbarIndexFromHeld(heldHotbarIndex);

  const commitTransition = useCallback((res: ReturnType<typeof applyInventorySlotInteraction>) => {
    const current = latest.current;
    if (res.layout !== current.layout || res.cursor !== current.cursor) {
      const next = current.onChangeLayout(res.layout, res.cursor);
      latest.current = { ...current, ...next };
    }
    if (res.cursor) setTip(null);
    if (res.selectHotbarIndex !== undefined) {
      gameEventBus.emit('cmd:select-hotbar-slot', { slotIndex: res.selectHotbarIndex });
    }
    if (res.inspectRef) current.onInspect?.(res.inspectRef);
  }, []);

  const handleSlotAction = useCallback(
    (kind: 'bag' | 'hotbar', index: number, rightClick: boolean, shiftKey: boolean) => {
      const current = latest.current;
      if (!rightClick && !shiftKey && !current.cursor) {
        if (current.pendingMoveBagIndex !== null) {
          current.onCompleteTouchMove?.(kind, index);
          return;
        }
        if (current.touchMode && kind === 'bag') {
          current.onInspect?.({ kind: 'bag', scope: current.scope, index });
          return;
        }
      }
      commitTransition(applyInventorySlotInteraction(
        current.layout, current.cursor, { kind, scope: current.scope, index },
        { ...current, rightClick, shiftKey },
      ));
    },
    [commitTransition],
  );

  useEffect(() => {
    function clearPointer() {
      dragStartRef.current = null;
      activeDragRef.current = null;
      setActiveDrag(null);
      setDropHover(null);
    }

    function hitSlot(e: PointerEvent) {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot-kind][data-slot-index]');
      if (!hit || !trayRef.current?.contains(hit)) return null;
      const kind = hit.getAttribute('data-slot-kind');
      const index = Number(hit.getAttribute('data-slot-index'));
      return (kind === 'bag' || kind === 'hotbar') && Number.isInteger(index) ? { kind, index } as const : null;
    }

    function onPointerMove(e: PointerEvent) {
      if (!e.isPrimary) return;
      const pending = dragStartRef.current;
      const current = latest.current;
      if (current.cursor || pending?.pointerId === e.pointerId) setPointerPos({ x: e.clientX, y: e.clientY });
      if (pending?.pointerId !== e.pointerId || pending.rightClick || pending.shiftKey || current.cursor) return;

      if (!activeDragRef.current && pending.cell.sku
        && Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) >= (e.pointerType === 'touch' ? 12 : 6)) {
        const started = {
          sourceKind: pending.kind,
          sourceIndex: pending.index,
          sku: pending.cell.sku,
          qty: pending.cell.qty,
          quality: pending.cell.quality,
          labelVi: pending.cell.labelVi,
        };
        activeDragRef.current = started;
        setActiveDrag(started);
        setTip(null);
      }
      if (activeDragRef.current) setDropHover(hitSlot(e));
    }

    function onPointerUp(e: PointerEvent) {
      const pending = dragStartRef.current;
      if (pending?.pointerId !== e.pointerId) return;
      const dragging = activeDragRef.current;
      clearPointer();
      const current = latest.current;
      const hit = hitSlot(e);
      if (!hit || current.page !== pending.page) return;
      const bag = current.scope === 'shared' ? current.layout.sharedCells : current.layout.personalCells;
      const source = pending.kind === 'bag' ? bag[pending.index] : current.layout.hotbarBindings[pending.index];
      if (pending.stack ? !sameStackRef(source, pending.stack) : source != null) return;
      if (pending.kind === 'bag' && (bag[pending.index]?.qty ?? 0) !== pending.cell.qty) return;

      if (dragging) {
        commitTransition(applyDirectSlotDrop(
          current.layout,
          { kind: dragging.sourceKind, scope: current.scope, index: dragging.sourceIndex },
          { ...hit, scope: current.scope },
          current,
        ));
      } else if (hit.kind === pending.kind && hit.index === pending.index
        && Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) < (e.pointerType === 'touch' ? 12 : 6)) {
        handleSlotAction(hit.kind, hit.index, pending.rightClick, pending.shiftKey);
      }
    }

    function onPointerCancel(e: PointerEvent) {
      if (dragStartRef.current?.pointerId === e.pointerId) clearPointer();
    }

    function onKey(e: KeyboardEvent) {
      const current = latest.current;
      if (e.key !== 'Escape' || (!dragStartRef.current && !current.cursor)) return;
      e.preventDefault();
      e.stopPropagation();
      clearPointer();
      if (current.cursor) commitTransition(cancelInventoryCursor(current.layout, current.cursor));
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', clearPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', clearPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [commitTransition, handleSlotAction]);

  const dragCell = activeDrag?.sourceKind === 'bag'
    ? bagCells[activeDrag.sourceIndex - firstOnPage]
    : activeDrag ? hbCells[activeDrag.sourceIndex] : null;
  const preview = activeDrag && dragCell?.sku === activeDrag.sku
    && dragCell.quality === activeDrag.quality && dragCell.qty === activeDrag.qty ? activeDrag : null;
  const floatingVisual = cursor
    ? { sku: cursor.itemSku, qty: cursor.qty }
    : preview ? { sku: preview.sku, qty: null } : null;

  const boundKeys = layout.hotbarBindings.filter(Boolean);

  const renderSlot = (cell: TrayDisplayCell, idx: number, kind: 'bag' | 'hotbar') => {
    const isHot = kind === 'hotbar';
    const legacyKind = isHot ? 'hb' : 'inv';
    const selected = isHot && idx === selectedHb && Boolean(cell.sku);
    const inspected =
      inspectedRef !== null &&
      inspectedRef.kind === kind &&
      inspectedRef.index === idx &&
      (isHot || inspectedRef.scope === scope);
    const isMoveSource = !isHot && pendingMoveBagIndex !== null && pendingMoveBagIndex === idx;
    const isDropTarget = dropHover !== null && dropHover.kind === kind && dropHover.index === idx;
    const isDragOrigin =
      activeDrag !== null && activeDrag.sourceKind === kind && activeDrag.sourceIndex === idx;
    const qBadge = qualityBadgeText(cell.quality);
    const isBoundInHotbar =
      !isHot &&
      Boolean(cell.sku) &&
      boundKeys.some((b) =>
        sameStackRef(b, {
          itemSku: cell.sku!,
          quality: cell.quality,
          ownerScope: (scope === 'shared' ? layout.sharedCells : layout.personalCells)[idx]!.ownerScope,
        }),
      );
    const bulk = !isHot && cell.sku && cell.qty > catalogStackLimit(cell.sku);
    const tipText = cell.sku
      ? `${cell.labelVi}${qBadge ? ` (${qBadge})` : ''}${cell.qty > 1 ? ` ×${cell.qty}` : ''}${
          bulk ? ' — Ô chứa số lượng lớn' : isHot ? ' — Chuột phải gỡ ô nhanh' : ' — Kéo/click xếp ô · Shift: gán nhanh'
        }`
      : '';
    const isWaterCarrier =
      cell.sku === 'water_pitcher' || cell.sku === 'tool_watering_can';

    return (
      <button
        key={`${kind}-${idx}`}
        type="button"
        className={`nuvora-sl ${isHot ? 'nuvora-sl--hot' : ''} ${selected ? 'nuvora-sl--selected' : ''} ${
          inspected ? 'nuvora-sl--inspected' : ''
        } ${isDropTarget ? 'nuvora-sl--drop-target' : ''} ${isMoveSource ? 'nuvora-sl--move-source' : ''}`}
        data-slot-kind={kind}
        data-slot-index={idx}
        data-item-qty={cell.qty}
        data-item-quality={cell.sku ? cell.quality : undefined}
        data-testid={
          cell.sku
            ? isHot
              ? `nuvora-hb-${cell.sku}`
              : `nuvora-cell-${cell.sku}`
            : `nuvora-cell-empty-${legacyKind}-${idx}`
        }
        aria-label={bulk ? `${cell.labelVi}, ô chứa ${cell.qty} món` : cell.labelVi || (isHot ? `Ô nhanh ${idx + 1} trống` : 'Ô trống')}
        data-tip={tipText || undefined}
        style={isDragOrigin ? { opacity: 0.35 } : undefined}
        onPointerDown={(e) => {
          if (!e.isPrimary || dragStartRef.current || (e.button !== 0 && e.button !== 2)) return;
          const current = latest.current;
          const bag = current.scope === 'shared' ? current.layout.sharedCells : current.layout.personalCells;
          setPointerPos({ x: e.clientX, y: e.clientY });
          dragStartRef.current = {
            pointerId: e.pointerId,
            page: current.page,
            kind,
            index: idx,
            startX: e.clientX,
            startY: e.clientY,
            rightClick: e.button === 2,
            shiftKey: e.shiftKey,
            cell,
            stack: (isHot ? current.layout.hotbarBindings[idx] : bag[idx]) ?? null,
          };
        }}
        onClick={(e) => {
          // Pointer actions are committed by pointerup. Keyboard activation has no pointer.
          if (e.detail === 0) handleSlotAction(kind, idx, false, e.shiftKey);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerEnter={(e) => {
          if (!tipText || cursor || activeDrag) return;
          setTip({ html: tipText, x: e.clientX, y: e.clientY });
        }}
        onPointerLeave={() => setTip(null)}
        onPointerMove={(e) => {
          if (tip && !cursor && !activeDrag) {
            setTip({ ...tip, x: e.clientX, y: e.clientY });
          }
        }}
      >
        {isHot && <span className="nuvora-sl__key">{idx + 1}</span>}
        {cell.sku ? (
          <>
            <span className="nuvora-sl__icon">
              <CatalogSkuIcon sku={cell.sku} size={28} />
            </span>
            {qBadge ? (
              <span
                className={`nuvora-sl__quality ${
                  cell.quality === 'gold' ? 'nuvora-sl__quality--gold' : 'nuvora-sl__quality--silver'
                }`}
              >
                {qBadge === 'Vàng' ? '★' : '◆'}
              </span>
            ) : null}
            {!isWaterCarrier && cell.qty > 1 ? (
              <b className="nuvora-sl__qty">{cell.qty}</b>
            ) : null}
            {isWaterCarrier && cell.waterFillLevel !== undefined ? (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 5,
                  right: 5,
                  height: 3,
                  borderRadius: 2,
                  background: 'rgba(40,60,80,0.3)',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${cell.waterFillLevel}%`,
                    background: '#4baee6',
                  }}
                />
              </span>
            ) : null}
            {isBoundInHotbar ? (
              <span
                title="Đang gắn trên thanh nhanh"
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#52b86a',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </>
        ) : null}
      </button>
    );
  };

  return (
    <div ref={trayRef} className="nuvora-tray" data-testid="nuvora-inventory-grid">
      <div className="nuvora-g9">
        {bagCells.map((cell, idx) => renderSlot(cell, firstOnPage + idx, 'bag'))}
      </div>
      {showHotbarStrip && (
        <div className="nuvora-g9 nuvora-g9--hot" data-testid="nuvora-hotbar-strip">
          {hbCells.map((cell, idx) => renderSlot(cell, idx, 'hotbar'))}
        </div>
      )}
      <div className="nuvora-plate">{plateLabel}</div>
      {floatingVisual && (
        <div
          className="nuvora-cur"
          data-testid="nuvora-inventory-cursor"
          data-item-qty={floatingVisual.qty}
          aria-hidden
          style={{ left: pointerPos.x, top: pointerPos.y }}
        >
          <span className="nuvora-sl__icon">
            <CatalogSkuIcon sku={floatingVisual.sku} size={28} />
          </span>
          {floatingVisual.qty !== null && floatingVisual.qty > 1 ? <b className="nuvora-sl__qty">{floatingVisual.qty}</b> : null}
        </div>
      )}
      {tip && !floatingVisual && (
        <div
          className="nuvora-tip"
          role="tooltip"
          style={{
            left: Math.min(tip.x + 14, typeof window !== 'undefined' ? window.innerWidth - 270 : tip.x + 14),
            top: tip.y - 8,
          }}
        >
          {tip.html}
        </div>
      )}
    </div>
  );
}