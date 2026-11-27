import { Backpack, ChevronDown, ChevronUp } from 'lucide-react';
import type { HeldItemState, HotbarSlot } from '../../shared/interaction/interactionTypes';
import { kilnItemIconUrlForSku } from '../../shared/art/kilnItemIcons';
import { CatalogPropsIcon } from './CatalogPropsIcon';
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
  return null;
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
}: GameHotbarProps) {
  const activeSlot =
    heldItem.slotIndex !== null
      ? slots.find((s) => s.slotIndex === heldItem.slotIndex && s.itemSku && s.qty > 0)
      : slots.find((s) => Boolean(s.itemSku && s.qty > 0));

  const trayClasses = [
    'olw-hotbar-tray',
    skin === 'nuvora' ? 'olw-hotbar-tray--nuvora' : '',
    touchFriendly ? 'olw-hotbar-tray--touch' : '',
    compact ? 'olw-hotbar-tray--compact' : '',
    idleDimmed && !compact ? 'olw-hotbar-tray--idle-dim' : '',
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
              ? `Đang cầm: ${heldItem.labelVi} — bấm để mở thanh vật phẩm (H)`
              : 'Tay không — bấm để mở thanh vật phẩm (H)'
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
        Array.from({ length: HOTBAR_SLOT_COUNT }, (_, idx) => {
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
              title={hasItem ? `${slot!.labelVi} (Phím ${idx + 1})` : `Ô trống ${idx + 1}`}
              onClick={() => {
                onUserActivity?.();
                onSelectSlot(idx);
              }}
              aria-pressed={isSelected}
              style={{ touchAction: 'manipulation' }}
            >
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
              <HotbarSlotGraphic slot={slot} />
              {hasItem && !isWaterCarrier && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    right: 3,
                    fontSize: 10,
                    fontWeight: 800,
                    background: 'rgba(255, 248, 239, 0.9)',
                    borderRadius: 4,
                    padding: '0 3px',
                  }}
                >
                  {slot!.qty}
                </span>
              )}
              {isWaterCarrier && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: 5,
                    right: 5,
                    height: 3,
                    borderRadius: 2,
                    background: 'rgba(40,60,80,0.25)',
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
      {onOpenInventory ? (
        <button
          type="button"
          className="olw-hotbar-slot olw-hotbar-slot--inventory"
          data-testid="hotbar-open-inventory-btn"
          title="Mở túi đồ dạng lưới (Phím I)"
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
      {onToggleCompact ? (
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
