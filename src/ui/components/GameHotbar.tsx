import type { HeldItemState, HotbarSlot } from '../../shared/interaction/interactionTypes';
import { CatalogPropsIcon } from './CatalogPropsIcon';
import { ItemArtSvg } from '../designSystem/GameIcons';

interface GameHotbarProps {
  slots: readonly HotbarSlot[];
  heldItem: HeldItemState;
  onSelectSlot: (slotIndex: number) => void;
  /** Larger slots when pet-care overlay needs iPhone-friendly taps. */
  touchFriendly?: boolean;
}

export function GameHotbar({ slots, heldItem, onSelectSlot, touchFriendly = false }: GameHotbarProps) {
  return (
    <div
      className={`olw-hotbar-tray ${touchFriendly ? 'olw-hotbar-tray--touch' : ''}`}
      role="toolbar"
      aria-label="Thanh vật phẩm nhanh"
      data-testid="game-hotbar"
    >
      {Array.from({ length: 8 }, (_, idx) => {
        const slot = slots.find((s) => s.slotIndex === idx);
        const isSelected = heldItem.slotIndex === idx && heldItem.itemKind !== 'none';
        const hasItem = Boolean(slot && slot.itemSku && slot.qty > 0);
        return (
          <button
            key={idx}
            type="button"
            className={`olw-hotbar-slot ${isSelected ? 'olw-hotbar-slot--selected' : ''}`}
            data-testid={`hotbar-slot-${idx + 1}`}
            title={hasItem ? `${slot!.labelVi} (Phím ${idx + 1})` : `Ô trống ${idx + 1}`}
            onClick={() => onSelectSlot(idx)}
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
            {hasItem && slot!.propsIconId ? (
              <CatalogPropsIcon iconId={slot!.propsIconId} size={24} />
            ) : hasItem && slot!.iconId ? (
              <ItemArtSvg iconId={slot!.iconId} size={24} />
            ) : null}
            {hasItem && slot!.itemKind !== 'water_pitcher' && (
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
            {hasItem && slot!.itemKind === 'water_pitcher' && (
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
                    width: `${slot!.waterFillLevel ?? 0}%`,
                    background: '#4baee6',
                  }}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
