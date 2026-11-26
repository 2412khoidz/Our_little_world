import { useCallback, useEffect, useRef, useState } from 'react';
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
  HOTBAR_CAPACITY,
  sameStackRef,
  type InventoryLayoutState,
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
  onChangeLayout: (next: InventoryLayoutState) => void;
  hotbarSlots: readonly HotbarSlot[];
  heldHotbarIndex: number | null;
  labelForSku: (sku: string) => string;
  inspectedRef?: InspectedSlotRef | null;
  onInspect?: (ref: InspectedSlotRef | null) => void;
  plateLabel?: string;
  showHotbarStrip?: boolean;
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
  onChangeLayout,
  hotbarSlots,
  heldHotbarIndex,
  labelForSku,
  inspectedRef = null,
  onInspect,
  plateLabel = 'TÚI CHUNG',
  showHotbarStrip = true,
}: NuvoraInteractiveTrayProps) {
  const [cursor, setCursor] = useState<InventoryPickedCursor | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [dropHover, setDropHover] = useState<{ kind: 'bag' | 'hotbar'; index: number } | null>(null);
  const [tip, setTip] = useState<{ html: string; x: number; y: number } | null>(null);

  const dragStartRef = useRef<{
    kind: 'bag' | 'hotbar';
    index: number;
    startX: number;
    startY: number;
    rightClick: boolean;
    shiftKey: boolean;
    cell: TrayDisplayCell;
  } | null>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const skipClickUntilRef = useRef(0);

  const latestCursorRef = useRef<InventoryPickedCursor | null>(null);
  const latestLayoutRef = useRef(layout);
  const onChangeLayoutRef = useRef(onChangeLayout);
  const scopeRef = useRef(scope);
  const labelForSkuRef = useRef(labelForSku);
  const heldHotbarIndexRef = useRef(heldHotbarIndex);
  const onInspectRef = useRef(onInspect);

  useEffect(() => {
    latestCursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    latestLayoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    onChangeLayoutRef.current = onChangeLayout;
  }, [onChangeLayout]);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  useEffect(() => {
    labelForSkuRef.current = labelForSku;
  }, [labelForSku]);

  useEffect(() => {
    heldHotbarIndexRef.current = heldHotbarIndex;
  }, [heldHotbarIndex]);

  useEffect(() => {
    onInspectRef.current = onInspect;
  }, [onInspect]);

  const bagCells: TrayDisplayCell[] = (
    scope === 'shared' ? layout.sharedCells : layout.personalCells
  ).map((cell) => {
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

  const commitTransition = useCallback(
    (res: ReturnType<typeof applyInventorySlotInteraction>) => {
      onChangeLayoutRef.current(res.layout);
      latestCursorRef.current = res.cursor;
      setCursor(res.cursor);
      if (res.cursor) {
        setTip(null);
      }
      if (res.selectHotbarIndex !== undefined) {
        gameEventBus.emit('cmd:select-hotbar-slot', { slotIndex: res.selectHotbarIndex });
      }
      if (res.inspectRef) {
        onInspectRef.current?.(res.inspectRef);
      }
    },
    [],
  );

  const handleSlotAction = useCallback(
    (kind: 'bag' | 'hotbar', index: number, rightClick: boolean, shiftKey: boolean) => {
      const res = applyInventorySlotInteraction(
        latestLayoutRef.current,
        latestCursorRef.current,
        { kind, scope: scopeRef.current, index },
        {
          rightClick,
          shiftKey,
          labelForSku: labelForSkuRef.current,
          heldHotbarIndex: heldHotbarIndexRef.current,
        },
      );
      commitTransition(res);
    },
    [commitTransition],
  );

  // Cancel held cursor cleanly on Escape (in capture phase before modal-close fires)
  useEffect(() => {
    if (!cursor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && latestCursorRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const restored = cancelInventoryCursor(latestLayoutRef.current, latestCursorRef.current);
        latestCursorRef.current = null;
        onChangeLayoutRef.current(restored.layout);
        setCursor(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [cursor]);

  // Restore any held cursor safely on tab change or unmount
  useEffect(() => {
    return () => {
      const held = latestCursorRef.current;
      if (held) {
        const restored = cancelInventoryCursor(latestLayoutRef.current, held);
        latestCursorRef.current = null;
        onChangeLayoutRef.current(restored.layout);
      }
    };
  }, [scope]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (latestCursorRef.current || dragStartRef.current) {
        setPointerPos({ x: e.clientX, y: e.clientY });
      }
      const pending = dragStartRef.current;
      if (!pending || pending.rightClick || pending.shiftKey || latestCursorRef.current) return;

      if (!activeDragRef.current) {
        const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
        if (dist >= 6 && pending.cell.sku) {
          const started: ActiveDragState = {
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
      }

      if (activeDragRef.current) {
        const hit =
          typeof document !== 'undefined'
            ? document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot-kind][data-slot-index]')
            : null;
        if (hit) {
          const hk = hit.getAttribute('data-slot-kind');
          const hi = Number(hit.getAttribute('data-slot-index'));
          if ((hk === 'bag' || hk === 'hotbar') && Number.isInteger(hi)) {
            setDropHover({ kind: hk, index: hi });
            return;
          }
        }
        setDropHover(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const pending = dragStartRef.current;
      const dragging = activeDragRef.current;
      dragStartRef.current = null;
      activeDragRef.current = null;
      setActiveDrag(null);
      setDropHover(null);

      if (!pending) return;

      const hit =
        typeof document !== 'undefined'
          ? document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot-kind][data-slot-index]')
          : null;
      const hitKindAttr = hit?.getAttribute('data-slot-kind');
      const hitIdxNum = Number(hit?.getAttribute('data-slot-index'));
      const hitValid =
        (hitKindAttr === 'bag' || hitKindAttr === 'hotbar') && Number.isInteger(hitIdxNum);

      if (dragging) {
        skipClickUntilRef.current = performance.now() + 90;
        if (hitValid) {
          const res = applyDirectSlotDrop(
            latestLayoutRef.current,
            { kind: dragging.sourceKind, scope: scopeRef.current, index: dragging.sourceIndex },
            { kind: hitKindAttr, scope: scopeRef.current, index: hitIdxNum },
            {
              labelForSku: labelForSkuRef.current,
              heldHotbarIndex: heldHotbarIndexRef.current,
            },
          );
          commitTransition(res);
        }
        return;
      }

      const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      if (dist < 6) {
        skipClickUntilRef.current = performance.now() + 90;
        const targetKind = hitValid ? hitKindAttr : pending.kind;
        const targetIdx = hitValid ? hitIdxNum : pending.index;
        handleSlotAction(targetKind, targetIdx, pending.rightClick, pending.shiftKey);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [commitTransition, handleSlotAction]);

  const floatingVisual = activeDrag
    ? { sku: activeDrag.sku, qty: activeDrag.qty, quality: activeDrag.quality }
    : cursor
      ? { sku: cursor.itemSku, qty: cursor.qty, quality: cursor.quality }
      : null;

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
          ownerScope: scope === 'shared' ? 'shared' : b!.ownerScope,
        }),
      );
    const tipText = cell.sku
      ? `${cell.labelVi}${qBadge ? ` (${qBadge})` : ''}${cell.qty > 1 ? ` ×${cell.qty}` : ''}${
          isHot ? ' — Chuột phải gỡ ô nhanh' : ' — Kéo/click xếp ô · Shift: gán nhanh'
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
        } ${isDropTarget ? 'nuvora-sl--drop-target' : ''}`}
        data-slot-kind={kind}
        data-slot-index={idx}
        data-testid={
          cell.sku
            ? isHot
              ? `nuvora-hb-${cell.sku}`
              : `nuvora-cell-${cell.sku}`
            : `nuvora-cell-empty-${legacyKind}-${idx}`
        }
        aria-label={cell.labelVi || (isHot ? `Ô nhanh ${idx + 1} trống` : 'Ô trống')}
        data-tip={tipText || undefined}
        style={isDragOrigin ? { opacity: 0.35 } : undefined}
        onPointerDown={(e) => {
          e.preventDefault();
          setPointerPos({ x: e.clientX, y: e.clientY });
          dragStartRef.current = {
            kind,
            index: idx,
            startX: e.clientX,
            startY: e.clientY,
            rightClick: e.button === 2,
            shiftKey: e.shiftKey,
            cell,
          };
        }}
        onClick={(e) => {
          if (performance.now() <= skipClickUntilRef.current) return;
          handleSlotAction(kind, idx, false, e.shiftKey);
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
    <div className="nuvora-tray" data-testid="nuvora-inventory-grid">
      <div className="nuvora-g9">
        {bagCells.map((cell, idx) => renderSlot(cell, idx, 'bag'))}
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
          aria-hidden
          style={{ left: pointerPos.x, top: pointerPos.y }}
        >
          <span className="nuvora-sl__icon">
            <CatalogSkuIcon sku={floatingVisual.sku} size={28} />
          </span>
          {floatingVisual.qty > 1 ? <b className="nuvora-sl__qty">{floatingVisual.qty}</b> : null}
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