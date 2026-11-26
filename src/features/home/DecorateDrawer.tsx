import { useMemo, useState } from 'react';
import { Move, RotateCw, Search, Sparkles, Trash2, X } from 'lucide-react';
import { getCatalogCategory, getCatalogForMap, getCatalogItem } from '../../shared/catalog';
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
import type { FurnitureCatalogItem, FurnitureCategory, FurniturePlacement, MapId } from '../../shared/types';
import { CatalogPropsIcon } from '../../ui/components/CatalogPropsIcon';

interface DecorateDrawerProps {
  currentMapId: MapId;
  placements: FurniturePlacement[];
  activeSku: string | null;
  selectedPlacementId: string | null;
  previewRotated: boolean;
  busy: boolean;
  devSandboxUnlocked?: boolean;
  onToggleDevSandbox?: () => void;
  onSelectDecorateMap: (mapId: DecorateMapId) => void;
  onSelectSku: (sku: string | null) => void;
  onRemovePlacement: (placementId: string) => void;
  onClearSelection: () => void;
  onRotatePreview: () => void;
  onRotatePlacement: (placementId: string) => void;
  onExit: () => void;
}

const CATEGORY_TABS: readonly { id: 'all' | FurnitureCategory; labelVi: string }[] = [
  { id: 'all', labelVi: 'Tất cả' },
  { id: 'flowers', labelVi: 'Hoa & Cây' },
  { id: 'garden', labelVi: 'Sân vườn' },
  { id: 'furniture', labelVi: 'Nội thất' },
  { id: 'rugs', labelVi: 'Thảm' },
  { id: 'lighting', labelVi: 'Đèn' },
];

function DecorateItemPreview({ item }: { item: FurnitureCatalogItem }) {
  if (item.sku === 'flowerpot_sakura') {
    return (
      <span
        className="decorate-card-preview"
        data-testid="decorate-preview-flowerpot_sakura"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" width={26} height={26} style={{ imageRendering: 'pixelated' }}>
          <rect x="4" y="9" width="8" height="6" rx="1" fill="#b86b43" />
          <rect x="3" y="8" width="10" height="2" fill="#d3875b" />
          <circle cx="8" cy="5" r="4" fill="#f7a8c4" />
          <circle cx="6" cy="4.5" r="2.2" fill="#ffd2e4" />
          <circle cx="10.2" cy="5.5" r="2" fill="#f48fb1" />
          <circle cx="8" cy="5.2" r="1" fill="#ffe57f" />
        </svg>
      </span>
    );
  }
  if (item.sku === 'bench_garden') {
    return (
      <span className="decorate-card-preview" aria-hidden>
        <img
          src="/maps/donor/hollowmere/sprites/wooden_bench.png"
          alt=""
          width={32}
          height={18}
          draggable={false}
          style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
        />
      </span>
    );
  }
  if (item.propsFrameId) {
    return (
      <span className="decorate-card-preview" aria-hidden>
        <CatalogPropsIcon iconId={item.propsFrameId} size={26} />
      </span>
    );
  }
  if (item.previewImageUrl) {
    return (
      <span className="decorate-card-preview" aria-hidden>
        <img
          src={item.previewImageUrl}
          alt=""
          width={26}
          height={26}
          draggable={false}
          style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
        />
      </span>
    );
  }
  const paletteBySku: Record<string, string> = {
    bed_cozy: '#f4a9be',
    wardrobe_oak: '#b57b4a',
    bookshelf_warm: '#9b643b',
    lamp_floor: '#f6cf6b',
    sofa_cream: '#e6dacb',
    table_wood: '#c48d5a',
    desk_study: '#8c694a',
    plant_monstera: '#5ca96c',
    rug_peach: '#f2a488',
    lantern_garden: '#9098a3',
  };
  return (
    <span className="decorate-card-preview" aria-hidden>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: paletteBySku[item.sku] ?? '#d8b48a',
          border: '1.5px solid rgba(90, 56, 30, 0.35)',
          display: 'inline-block',
        }}
      />
    </span>
  );
}

export function DecorateDrawer({
  currentMapId,
  placements,
  activeSku,
  selectedPlacementId,
  previewRotated,
  busy,
  devSandboxUnlocked = false,
  onToggleDevSandbox,
  onSelectDecorateMap,
  onSelectSku,
  onRemovePlacement,
  onClearSelection,
  onRotatePreview,
  onRotatePlacement,
  onExit,
}: DecorateDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | FurnitureCategory>('all');

  const decorateMap = isDecorateMapId(currentMapId) ? currentMapId : 'home';
  const sandboxOn = Boolean(import.meta.env.DEV && devSandboxUnlocked);

  const mapCatalog = useMemo(
    () => getCatalogForMap(decorateMap, { includeDevSandbox: sandboxOn }),
    [decorateMap, sandboxOn],
  );

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mapCatalog.filter((item) => {
      if (activeCategory !== 'all' && getCatalogCategory(item) !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return item.nameVi.toLowerCase().includes(q) || item.descriptionVi.toLowerCase().includes(q);
    });
  }, [mapCatalog, activeCategory, searchQuery]);

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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {import.meta.env.DEV && onToggleDevSandbox ? (
            <button
              type="button"
              className={`art-demo-pill ${sandboxOn ? 'art-demo-pill--active' : ''}`}
              data-testid="btn-toggle-dev-decor-sandbox"
              title="Chỉ hiển thị ở DEV để thử toàn bộ đồ trang trí & vườn hoa"
              onClick={onToggleDevSandbox}
            >
              <Sparkles size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              {sandboxOn ? 'DEV Sandbox: BẬT' : 'DEV Sandbox'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid="btn-exit-decorate"
            onClick={onExit}
          >
            <X size={15} /> Xong
          </button>
        </div>
      </div>

      <div className="decorate-toolbar">
        <div className="art-demo-pill-group" role="tablist" aria-label="Chọn phòng trang trí">
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

        <label className="decorate-search-box" aria-label="Tìm đồ trang trí">
          <Search size={13} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm hoa, bàn, đèn..."
            data-testid="decorate-search-input"
          />
        </label>
      </div>

      <div className="art-demo-pill-group" role="tablist" aria-label="Lọc loại đồ trang trí">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`decorate-category-${cat.id}`}
            className={activeCategory === cat.id ? 'art-demo-pill art-demo-pill--active' : 'art-demo-pill'}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.labelVi}
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
        {filteredCatalog.map((item) => {
          const remaining = getRemainingStockForSku(placements, item.sku);
          const isSelected = activeSku === item.sku;
          return (
            <button
              key={item.sku}
              type="button"
              disabled={busy || (!sandboxOn && remaining <= 0 && !isSelected)}
              data-testid={`decorate-sku-${item.sku}`}
              className={`decorate-item-card ${isSelected ? 'decorate-item-card--active' : ''}`}
              onClick={() => onSelectSku(isSelected ? null : item.sku)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DecorateItemPreview item={item} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.nameVi}</span>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                {sandboxOn ? '∞ (DEV Sandbox)' : `Còn ${remaining}/${item.starterQuantity}`} • {item.widthTiles}×{item.heightTiles}
                {item.layerSlot === 'floor' ? ' (Lớp sàn)' : ''}
              </span>
            </button>
          );
        })}
        {filteredCatalog.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', padding: '10px 6px' }}>
            Không tìm thấy món trang trí phù hợp.
          </div>
        ) : null}
      </div>
    </section>
  );
}
