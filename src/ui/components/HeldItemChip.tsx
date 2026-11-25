import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import { ItemArtSvg } from '../designSystem/GameIcons';

interface HeldItemChipProps {
  heldItem: HeldItemState;
  onClear: () => void;
}

export function HeldItemChip({ heldItem, onClear }: HeldItemChipProps) {
  if (heldItem.itemKind === 'none' || !heldItem.itemSku) return null;

  return (
    <div className="olw-held-item-chip" data-testid="held-item-chip" role="status">
      <span className="olw-held-item-chip__label">Đang cầm</span>
      <ItemArtSvg iconId={heldItem.iconId} size={22} />
      <span className="olw-held-item-chip__name">{heldItem.labelVi || heldItem.itemSku}</span>
      <button type="button" className="olw-held-item-chip__clear" aria-label="Bỏ cầm" onClick={onClear}>
        ×
      </button>
    </div>
  );
}