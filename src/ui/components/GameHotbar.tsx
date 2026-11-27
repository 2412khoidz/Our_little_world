import { useRef, useState } from 'react';
import { Backpack, ChevronDown, ChevronUp } from 'lucide-react';
import type { HeldItemState, HotbarSlot } from '../../shared/interaction/interactionTypes';
import { kilnItemIconUrlForSku } from '../../shared/art/kilnItemIcons';
import { CatalogPropsIcon } from './CatalogPropsIcon';
import { CatalogSkuIcon } from './CatalogSkuIcon';
import { ItemArtSvg } from '../designSystem/GameIcons';

export const HOTBAR_SLOT_COUNT = 8;

interface GameHotbarProps {
  slots: readonly HotbarSlot[];
  heldItem: HeldItemState;
  onSelectSlot: (slotIndex: number) => void;
  onOpenInventory?: () => void;
  inventoryItemCount?: number;
  /** Larger slots when pet-care overlay needs iPhone-friendly taps. */
  touchFriendly?: boolean;
  /** NUVORA wooden hotbar skin (donor presentation). */
  skin?: 'cozy' | 'nuvora';
  /** Compact adaptive bar collapsing unused quick slots while keeping active item & inventory reachable. */
  compact?: boolean;
  onToggleCompact?: () => void;
  idleDimmed?: boolean;
  onUserActivity?: () => void;
  /** Mobile HUD mode: portrait shows 4+4 paged slots; landscape shows 8 in one row when space allows. */
  mobileMode?: 'portrait' | 'landscape' | null;
  slotsPerPage?: 4 | 8;
  hideKeycaps?: boolean;
}

function HotbarSlotGraphic({ slot }: { slot: HotbarSlot | undefined }) {
  if (!slot || !slot.itemSku || slot.qty <= 0) return null;
  const kilnUrl = kilnItemIconUrlForSku(slot.itemSku);
  if (kilnUrl) {
    return (
      <img
        src={kilnUrl}
        alt=""
        width={26}
        height={26}
        draggable={false}
        style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      />
    );
  }
  if (slot.propsIconId) return <CatalogPropsIcon iconId={slot.propsIconId} size={24} />;
  if (slot.iconId) return <ItemArtSvg iconId={slot.iconId} size={24} />;
  return <CatalogSkuIcon sku={slot.itemSku} size={24} />;
}

export function GameHotbar({
  slots,
  heldItem,
  onSelectSlot,
  onOpenInventory,
  inventoryItemCount = 0,
  touchFriendly = false,
  skin = 'nuvora',
  compact = false,
  onToggleCompact,
  idleDimmed = false,
  onUserActivity,
  mobileMode = null,
  slotsPerPage = 8,
  hideKeycaps = false,
}: GameHotbarProps) {
  const [pageState, setPageState] = useState<{ page: 0 | 1; forSlot: number | null }>({
    page: 0,
    forSlot: null,
  });
  const swipeStartXRef = useRef<number | null>(null);
  const isPaged = slotsPerPage === 4 && !compact;

  const page: 0 | 1 =
    !isPaged
      ? 0
      : heldItem.slotIndex !== null && pageState.forSlot !== heldItem.slotIndex
        ? heldItem.slotIndex >= 4
          ? 1
          : 0
        : pageState.page;

  const activeSlot =
    heldItem.slotIndex !== null
      ? slots.find((s) => s.slotIndex === heldItem.slotIndex && s.itemSku && s.qty > 0)
      : slots.find((s) => Boolean(s.itemSku && s.qty > 0));

  const visibleIndices = isPaged
    ? Array.from({ length: 4 }, (_, i) => page * 4 + i)
    : Array.from({ length: HOTBAR_SLOT_COUNT }, (_, i) => i);

  const trayClasses = [
    'olw-hotbar-tray',
    skin === 'nuvora' ? 'olw-hotbar-tray--nuvora' : '',
    touchFriendly ? 'olw-hotbar-tray--touch' : '',
    compact ? 'olw-hotbar-tray--compact' : '',
    idleDimmed && !compact && !mobileMode ? 'olw-hotbar-tray--idle-dim' : '',
    mobileMode ? 'olw-hotbar-tray--mobile' : '',
    mobileMode === 'portrait' ? 'olw-hotbar-tray--mobile-portrait' : '',
    mobileMode === 'landscape' ? 'olw-hotbar-tray--mobile-landscape' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={trayClasses}
      role="toolbar"
      aria-label="Thanh vật phẩm nhanh"
      data-testid="game-hotbar"
      data-compact={compact ? '1' : '0'}
      data-hotbar-page={isPaged ? String(page) : 'all'}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (isPaged) swipeStartXRef.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (!isPaged || swipeStartXRef.current === null) return;
        const dx = e.clientX - swipeStartXRef.current;
        swipeStartXRef.current = null;
        if (Math.abs(dx) >= 34) {
          onUserActivity?.();
          setPageState({ page: dx < 0 ? 1 : 0, forSlot: heldItem.slotIndex });
        }
      }}
      onPointerCancel={() => {
        swipeStartXRef.current = null;
      }}
      onPointerEnter={onUserActivity}
      onFocusCapture={onUserActivity}
    >
      {compact ? (
        <button
          type="button"
          className={`olw-hotbar-slot olw-hotbar-slot--compact-active ${heldItem.itemKind !== 'none' ? 'olw-hotbar-slot--selected' : ''}`}
          data-testid="hotbar-compact-active-slot"
          title={
            heldItem.itemKind !== 'none'
              ? `Đang cầm: ${heldItem.labelVi} — bấm để mở thanh vật phẩm`
              : 'Tay không — bấm để mở thanh vật phẩm'
          }
          onClick={() => {
            onUserActivity?.();
            onToggleCompact?.();
          }}
        >
          <HotbarSlotGraphic slot={activeSlot} />
          <span className="olw-hotbar-compact-label">
            {heldItem.itemKind !== 'none' ? heldItem.labelVi : 'Tay không'}
          </span>
        </button>
      ) : (
        visibleIndices.map((idx) => {
          const slot = slots.find((s) => s.slotIndex === idx);
          const isSelected = heldItem.slotIndex === idx && heldItem.itemKind !== 'none';
          const hasItem = Boolean(slot && slot.itemSku && slot.qty > 0);
          const isWaterCarrier = Boolean(
            hasItem && (slot!.itemKind === 'water_pitcher' || slot!.itemSku === 'tool_watering_can'),
          );
          return (
            <button
              key={idx}
              type="button"
              className={`olw-hotbar-slot ${isSelected ? 'olw-hotbar-slot--selected' : ''}`}
              data-testid={`hotbar-slot-${idx + 1}`}
              title={
                hasItem
                  ? hideKeycaps
                    ? slot!.labelVi
                    : `${slot!.labelVi} (Phím ${idx + 1})`
                  : `Ô trống ${idx + 1}`
              }
              onClick={() => {
                onUserActivity?.();
                onSelectSlot(idx);
              }}
              aria-pressed={isSelected}
              aria-label={hasItem ? slot!.labelVi : `Ô trống ${idx + 1}`}
              style={{ touchAction: 'manipulation' }}
            >
              {!hideKeycaps && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: 4,
                    fontSize: 9.5,
                    fontWeight: 800,
                    opacity: 0.7,
                  }}
                >
                  {idx + 1}
                </span>
              )}
              <HotbarSlotGraphic slot={slot} />
              {hasItem && !isWaterCarrier && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    right: 3,
                    fontSize: 10,
                    fontWeight: 800,
                    background: 'rgba(255, 248, 239, 0.92)',
                    borderRadius: 4,
                    padding: '0 3px',
                  }}
                >
                  {slot!.qty}
                </span>
              )}
              {isWaterCarrier && (
                <span
                  data-testid={`hotbar-water-gauge-${idx + 1}`}
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 5,
                    right: 5,
                    height: 3.5,
                    borderRadius: 2,
                    background: 'rgba(40,60,80,0.28)',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${slot!.waterFillLevel ?? 100}%`,
                      background: '#4baee6',
                    }}
                  />
                </span>
              )}
            </button>
          );
        })
      )}
      {isPaged && (
        <button
          type="button"
          className="olw-hotbar-page-btn"
          data-testid="hotbar-page-toggle"
          aria-label={page === 0 ? 'Xem ô 5 đến 8' : 'Xem ô 1 đến 4'}
          title={page === 0 ? 'Chuyển sang ô 5–8' : 'Quay lại ô 1–4'}
          onClick={() => {
            onUserActivity?.();
            setPageState({ page: page === 0 ? 1 : 0, forSlot: heldItem.slotIndex });
          }}
        >
          <span>{page === 0 ? '1–4' : '5–8'}</span>
          <span className="olw-hotbar-page-dots" aria-hidden>
            <span className={page === 0 ? 'is-on' : ''} />
            <span className={page === 1 ? 'is-on' : ''} />
          </span>
        </button>
      )}
      {onOpenInventory ? (
        <button
          type="button"
          className="olw-hotbar-slot olw-hotbar-slot--inventory"
          data-testid="hotbar-open-inventory-btn"
          title={hideKeycaps ? 'Mở túi đồ' : 'Mở túi đồ dạng lưới (Phím I)'}
          aria-label="Mở túi đồ"
          onClick={() => {
            onUserActivity?.();
            onOpenInventory();
          }}
          style={{
            touchAction: 'manipulation',
            background: 'linear-gradient(180deg, #e7c082 0%, #c68e49 100%)',
            borderColor: '#6f421f',
            color: '#3a210f',
            marginLeft: 2,
          }}
        >
          {!hideKeycaps && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: 4,
                fontSize: 9,
                fontWeight: 800,
                opacity: 0.78,
              }}
            >
              I
            </span>
          )}
          <Backpack size={20} strokeWidth={2.3} />
          {inventoryItemCount > 0 ? (
            <span
              style={{
                position: 'absolute',
                bottom: 1,
                right: 3,
                fontSize: 9.5,
                fontWeight: 800,
                background: 'rgba(255, 248, 239, 0.94)',
                color: '#4b2d15',
                borderRadius: 4,
                padding: '0 3px',
              }}
            >
              {inventoryItemCount}
            </span>
          ) : null}
        </button>
      ) : null}
      {onToggleCompact && !mobileMode ? (
        <button
          type="button"
          className="olw-hotbar-slot olw-hotbar-toggle-btn"
          data-testid="btn-hotbar-toggle-compact"
          aria-label={compact ? 'Mở rộng thanh vật phẩm' : 'Thu gọn thanh vật phẩm'}
          title={compact ? 'Mở rộng thanh vật phẩm (Phím H)' : 'Thu gọn thanh vật phẩm (Phím H)'}
          onClick={() => {
            onUserActivity?.();
            onToggleCompact();
          }}
          style={{ touchAction: 'manipulation' }}
        >
          {compact ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      ) : null}
    </div>
  );
}
