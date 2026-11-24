import { Move, Trash2, X } from 'lucide-react';
import { getCatalogForMap, getCatalogItem } from '../../shared/catalog';
import { getRemainingStockForSku } from '../../shared/placement';
import type { FurniturePlacement, MapId } from '../../shared/types';

interface DecorateDrawerProps {
  currentMapId: MapId;
  placements: FurniturePlacement[];
  activeSku: string | null;
  selectedPlacementId: string | null;
  busy: boolean;
  onSelectSku: (sku: string | null) => void;
  onRemovePlacement: (placementId: string) => void;
  onClearSelection: () => void;
  onExit: () => void;
}

export function DecorateDrawer({
  currentMapId,
  placements,
  activeSku,
  selectedPlacementId,
  busy,
  onSelectSku,
  onRemovePlacement,
  onClearSelection,
  onExit,
}: DecorateDrawerProps) {
  const mapCatalog = getCatalogForMap(currentMapId);
  const selectedPlacement = selectedPlacementId
    ? placements.find((p) => p.id === selectedPlacementId)
    : undefined;
  const selectedItem = selectedPlacement ? getCatalogItem(selectedPlacement.sku) : undefined;

  return (
    <section className="decorate-drawer" aria-label="Bảng trang trí nội thất" data-testid="decorate-drawer">
      <div className="decorate-header">
        <div>
          <strong style={{ fontSize: 14 }}>Chế độ trang trí</strong>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            {activeSku
              ? `Chạm vào ô xanh trên sàn để đặt "${getCatalogItem(activeSku)?.nameVi ?? ''}"`
              : selectedItem
                ? `Đang chọn "${selectedItem.nameVi}" — chạm ô trống để di chuyển hoặc bấm Cất`
                : 'Chọn món đồ bên dưới để đặt, hoặc chạm vào đồ trên sàn để di chuyển/cất'}
          </div>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          data-testid="btn-exit-decorate"
          onClick={onExit}
        >
          <X size={15} /> Xong
        </button>
      </div>

      {selectedPlacement && selectedItem && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 12,
            background: 'var(--surface-warm)',
            border: '1px solid var(--border-honey)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            <Move size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
            {selectedItem.nameVi} ({selectedPlacement.widthTiles}x{selectedPlacement.heightTiles})
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={busy}
              data-testid="btn-stow-selected"
              onClick={() => onRemovePlacement(selectedPlacement.id)}
            >
              <Trash2 size={14} /> Cất đi
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={onClearSelection}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className="decorate-list">
        {mapCatalog.map((item) => {
          const remaining = getRemainingStockForSku(placements, item.sku);
          const isSelected = activeSku === item.sku;
          return (
            <button
              key={item.sku}
              type="button"
              disabled={busy || (remaining <= 0 && !isSelected)}
              data-testid={`decorate-sku-${item.sku}`}
              className={`decorate-item-card ${isSelected ? 'decorate-item-card--active' : ''}`}
              onClick={() => onSelectSku(isSelected ? null : item.sku)}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{item.nameVi}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                Còn {remaining}/{item.starterQuantity} • {item.widthTiles}x{item.heightTiles}
                {item.layerSlot === 'floor' ? ' (Lớp sàn)' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
