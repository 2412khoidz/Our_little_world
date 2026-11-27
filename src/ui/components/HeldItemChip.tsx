import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import { kilnItemIconUrlForSku } from '../../shared/art/kilnItemIcons';
import { CatalogPropsIcon } from './CatalogPropsIcon';
import { ItemArtSvg } from '../designSystem/GameIcons';

interface HeldItemChipProps {
  heldItem: HeldItemState;
  onClear: () => void;
}

export function HeldItemChip({ heldItem, onClear }: HeldItemChipProps) {
  if (heldItem.itemKind === 'none' || heldItem.itemKind === 'tool' || !heldItem.itemSku) return null;
  const kilnUrl = kilnItemIconUrlForSku(heldItem.itemSku);

  return (
    <div className="olw-held-item-chip" data-testid="held-item-chip" role="status">
      <span className="olw-held-item-chip__label">Đang cầm</span>
      {kilnUrl ? (
        <img
          src={kilnUrl}
          alt=""
          width={22}
          height={22}
          draggable={false}
          style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
        />
      ) : heldItem.propsIconId ? (
        <CatalogPropsIcon iconId={heldItem.propsIconId} size={22} />
      ) : (
        <ItemArtSvg iconId={heldItem.iconId} size={22} />
      )}
      <span className="olw-held-item-chip__name">{heldItem.labelVi || heldItem.itemSku}</span>
      <button type="button" className="olw-held-item-chip__clear" aria-label="Bỏ cầm" onClick={onClear}>
        ×
      </button>
    </div>
  );
}
