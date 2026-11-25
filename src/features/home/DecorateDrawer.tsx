import { Move, RotateCw, Trash2, X } from 'lucide-react';
import { getCatalogForMap, getCatalogItem } from '../../shared/catalog';
import {
  DECORATE_MAP_IDS,
  decorateMapLabelVi,
  isDecorateMapId,
  type DecorateMapId,
} from '../../shared/decorate/decorateInteriorPolicy';
import {
  canRotateFootprint,
  footprintForCatalog,
} from '../../shared/decorate/decoratePlacementLoop';
import { getRemainingStockForSku } from '../../shared/placement';
import type { FurniturePlacement, MapId } from '../../shared/types';

interface DecorateDrawerProps {
  currentMapId: MapId;
  placements: FurniturePlacement[];
  activeSku: string | null;
  selectedPlacementId: string | null;
  previewRotated: boolean;
  busy: boolean;
  onSelectDecorateMap: (mapId: DecorateMapId) => void;
  onSelectSku: (sku: string | null) => void;
  onRemovePlacement: (placementId: string) => void;
  onClearSelection: () => void;
  onRotatePreview: () => void;
  onRotatePlacement: (placementId: string) => void;
  onExit: () => void;
}

export function DecorateDrawer({
  currentMapId,
  placements,
  activeSku,
  selectedPlacementId,
  previewRotated,
  busy,
  onSelectDecorateMap,
  onSelectSku,
  onRemovePlacement,
  onClearSelection,
  onRotatePreview,
  onRotatePlacement,
  onExit,
}: DecorateDrawerProps) {
  const decorateMap = isDecorateMapId(currentMapId) ? currentMapId : 'home';
  const mapCatalog = getCatalogForMap(decorateMap);
  const selectedPlacement = selectedPlacementId
    ? placements.find((p) => p.id === selectedPlacementId)
    : undefined;
  const selectedItem = selectedPlacement ? getCatalogItem(selectedPlacement.sku) : undefined;
  const activeItem = activeSku ? getCatalogItem(activeSku) : undefined;
  const activeFootprint =
    activeItem != null ? footprintForCatalog(activeItem, previewRotated) : null;

  return (
    <section className="decorate-drawer" aria-label="Bảng trang trí nội thất" data-testid="decorate-drawer">
      <div className="decorate-header">
        <div>
          <strong style={{ fontSize: 14 }}>Chế độ trang trí — {decorateMapLabelVi(decorateMap)}</strong>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            {!isDecorateMapId(currentMapId)
              ? 'Chỉ trang trí được trong nhà hoặc khu vườn — đang chuyển bạn tới khu phù hợp.'
              : activeSku
                ? `Chạm ô xanh để đặt "${getCatalogItem(activeSku)?.nameVi ?? ''}"${
                    activeFootprint ? ` (${activeFootprint.widthTiles}×${activeFootprint.heightTiles})` : ''
                  }`
                : selectedItem
                  ? `Đang chọn "${selectedItem.nameVi}" — chạm ô trống để di chuyển hoặc bấm Cất`
                  : 'Chọn món đồ để đặt; xoay khi món không vuông.'}
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

      <div className="art-demo-pill-group" style={{ marginBottom: 8 }} role="tablist" aria-label="Chọn phòng trang trí">
        {DECORATE_MAP_IDS.map((mapId) => (
          <button
            key={mapId}
            type="button"
            data-testid={`decorate-map-${mapId}`}
            className={decorateMap === mapId ? 'art-demo-pill art-demo-pill--active' : 'art-demo-pill'}
            onClick={() => onSelectDecorateMap(mapId)}
          >
            {decorateMapLabelVi(mapId)}
          </button>
        ))}
      </div>

      {activeSku && activeItem && canRotateFootprint(activeItem) && (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          data-testid="btn-rotate-preview"
          disabled={busy}
          onClick={onRotatePreview}
        >
          <RotateCw size={14} /> Xoay trước khi đặt
        </button>
      )}

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
            {selectedItem.nameVi} ({selectedPlacement.widthTiles}×{selectedPlacement.heightTiles})
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {canRotateFootprint(selectedPlacement) && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busy}
                data-testid="btn-rotate-placement"
                onClick={() => onRotatePlacement(selectedPlacement.id)}
              >
                <RotateCw size={14} /> Xoay
              </button>
            )}
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
                Còn {remaining}/{item.starterQuantity} • {item.widthTiles}×{item.heightTiles}
                {item.layerSlot === 'floor' ? ' (Lớp sàn)' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}