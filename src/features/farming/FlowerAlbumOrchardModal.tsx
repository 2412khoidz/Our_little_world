import { useMemo, useState } from 'react';
import { X, Flower2, Trees, Sparkles, Droplets } from 'lucide-react';
import type { InventoryEntry } from '../../shared/inventory/inventoryTypes';
import type { OrchardTreeView } from '../../shared/farming/orchard';
import { ORCHARD_TREE_BY_SAPLING } from '../../shared/farming/orchard';
import {
  FLOWER_GENETICS_RECIPES,
  FLOWER_SPECIES_CATALOG,
  FLOWER_SPEC_BY_SKU,
  bloomPeriodAt,
  type FlowerGardenState,
} from '../../shared/farming/flowerGenetics';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import './deepFarmingModals.css';

export interface FlowerAlbumOrchardModalProps {
  open: boolean;
  onClose: () => void;
  nowMs: number;
  inventory: readonly InventoryEntry[];
  flowerGarden: FlowerGardenState;
  orchardViews: readonly OrchardTreeView[];
  busy: boolean;
  statusMessage?: string | null;
  onPlantFlower: (slotIndex: number, flowerSku: string) => void;
  onWaterFlower: (slotIndex: number) => void;
  onHarvestFlower: (slotIndex: number) => void;
  onRunCrossbreed: () => void;
  onPlantSapling: (slotIndex: number, saplingSku: string) => void;
  onHarvestTree: (slotIndex: number) => void;
  onUprootTree: (slotIndex: number) => void;
}

const STAGE_LABEL_VI: Record<string, string> = {
  sapling: 'Cây con',
  young: 'Cây tơ',
  mature: 'Trưởng thành',
  fruiting: 'Đang sai quả',
};

export function FlowerAlbumOrchardModal({
  open,
  onClose,
  nowMs,
  inventory,
  flowerGarden,
  orchardViews,
  busy,
  statusMessage,
  onPlantFlower,
  onWaterFlower,
  onHarvestFlower,
  onRunCrossbreed,
  onPlantSapling,
  onHarvestTree,
  onUprootTree,
}: FlowerAlbumOrchardModalProps) {
  const [tab, setTab] = useState<'flowers' | 'orchard'>('flowers');
  const [selectedSeedSku, setSelectedSeedSku] = useState<string>('seed_tulip_red');
  const [selectedSaplingSku, setSelectedSaplingSku] = useState<string>('sapling_peach');

  const sharedQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of inventory) {
      if (row.ownerScope !== 'shared') continue;
      m.set(row.itemSku, (m.get(row.itemSku) ?? 0) + row.qty);
    }
    return m;
  }, [inventory]);

  const plantableFlowerSeeds = useMemo(
    () =>
      FLOWER_SPECIES_CATALOG.filter((f) => f.seedSku !== null).map((f) => ({
        flowerSku: f.sku,
        seedSku: f.seedSku!,
        nameVi: f.nameVi,
        qty: sharedQty.get(f.seedSku!) ?? 0,
      })),
    [sharedQty],
  );

  const saplingOptions = useMemo(
    () =>
      [...ORCHARD_TREE_BY_SAPLING.values()].map((tree) => ({
        saplingSku: tree.saplingSku,
        nameVi: tree.nameVi,
        qty: sharedQty.get(tree.saplingSku) ?? 0,
      })),
    [sharedQty],
  );

  if (!open) return null;

  const discoveredSet = new Set(flowerGarden.discovered);
  const currentPeriod = bloomPeriodAt(nowMs);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Hoa lai & Vườn cây ăn quả"
      data-testid="flower-orchard-modal"
      onClick={onClose}
    >
      <div className="olw-deep-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="olw-deep-header">
          <div className="olw-deep-tabs">
            <button
              type="button"
              onClick={() => setTab('flowers')}
              className={`olw-deep-tab ${tab === 'flowers' ? 'olw-deep-tab--active-rose' : ''}`}
            >
              <Flower2 size={16} />
              Hoa &amp; Lai tạo ({discoveredSet.size}/{FLOWER_SPECIES_CATALOG.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('orchard')}
              className={`olw-deep-tab ${tab === 'orchard' ? 'olw-deep-tab--active-green' : ''}`}
            >
              <Trees size={16} />
              Vườn cây ăn quả (12 ô)
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="olw-deep-close"
          >
            <X size={18} />
          </button>
        </div>

        {statusMessage ? <div className="olw-deep-status">{statusMessage}</div> : null}

        <div className="olw-deep-body">
          {tab === 'flowers' ? (
            <>
              <div className="olw-deep-toolbar">
                <div className="olw-deep-toolbar__left">
                  <label className="olw-deep-label" htmlFor="olw-flower-seed-select">
                    Chọn hạt hoa:
                  </label>
                  <select
                    id="olw-flower-seed-select"
                    value={selectedSeedSku}
                    onChange={(e) => setSelectedSeedSku(e.target.value)}
                    className="olw-deep-select"
                  >
                    {plantableFlowerSeeds.map((opt) => (
                      <option key={opt.seedSku} value={opt.seedSku}>
                        {opt.nameVi} (còn {opt.qty})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onRunCrossbreed}
                  className="olw-deep-btn olw-deep-btn--rose"
                >
                  <Sparkles size={14} />
                  Kiểm tra thụ phấn lai giống
                </button>
              </div>

              <div>
                <h3 className="olw-deep-section-title">
                  Luống hoa 8×5 (bấm ô trống để trồng, ô có hoa để tưới hoặc hái)
                </h3>
                <div className="olw-deep-flower-grid">
                  {flowerGarden.beds.map((bed, idx) => {
                    const spec = bed ? FLOWER_SPEC_BY_SKU.get(bed.flowerSku) : null;
                    const watered = bed?.wateredPeriod === currentPeriod;
                    const selectedFlower = plantableFlowerSeeds.find(
                      (f) => f.seedSku === selectedSeedSku,
                    );
                    const cellClass = bed
                      ? watered
                        ? 'olw-deep-flower-cell olw-deep-flower-cell--watered'
                        : 'olw-deep-flower-cell'
                      : 'olw-deep-flower-cell olw-deep-flower-cell--empty';

                    return (
                      <div key={idx} className={cellClass}>
                        {bed ? (
                          <>
                            <div title={spec?.nameVi ?? bed.flowerSku}>
                              <CatalogSkuIcon sku={bed.flowerSku} size={22} />
                            </div>
                            <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                              {!watered ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => onWaterFlower(idx)}
                                  title="Tưới hoa tăng cơ hội lai"
                                  className="olw-deep-btn olw-deep-btn--xs olw-deep-btn--blue"
                                >
                                  <Droplets size={11} />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => onHarvestFlower(idx)}
                                className="olw-deep-btn olw-deep-btn--xs olw-deep-btn--green"
                              >
                                Hái
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy || !selectedFlower || selectedFlower.qty < 1}
                            onClick={() => selectedFlower && onPlantFlower(idx, selectedFlower.flowerSku)}
                            className="olw-deep-btn olw-deep-btn--plant"
                          >
                            +Trồng
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="olw-deep-grid-2">
                <div className="olw-deep-card">
                  <h4 className="olw-deep-section-title" style={{ marginBottom: 4 }}>
                    Album Sưu Tầm Hoa ({discoveredSet.size}/{FLOWER_SPECIES_CATALOG.length})
                  </h4>
                  <div className="olw-deep-album-grid">
                    {FLOWER_SPECIES_CATALOG.map((f) => {
                      const unlocked = discoveredSet.has(f.sku);
                      return (
                        <div
                          key={f.sku}
                          className={`olw-deep-album-item ${unlocked ? '' : 'olw-deep-album-item--locked'}`}
                        >
                          <CatalogSkuIcon sku={f.sku} size={22} />
                          <span>{unlocked ? f.nameVi : 'Chưa mở'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="olw-deep-card">
                  <h4 className="olw-deep-section-title" style={{ marginBottom: 4 }}>
                    Bí kíp lai giống hiếm
                  </h4>
                  <ul className="olw-deep-recipe-list">
                    {FLOWER_GENETICS_RECIPES.map((r) => (
                      <li key={r.id} className="olw-deep-recipe-item">
                        <strong>{FLOWER_SPEC_BY_SKU.get(r.child)?.nameVi}:</strong>{' '}
                        <span>{r.hintVi}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="olw-deep-toolbar">
                <div className="olw-deep-toolbar__left">
                  <label className="olw-deep-label" htmlFor="olw-orchard-sapling-select">
                    Cây giống:
                  </label>
                  <select
                    id="olw-orchard-sapling-select"
                    value={selectedSaplingSku}
                    onChange={(e) => setSelectedSaplingSku(e.target.value)}
                    className="olw-deep-select"
                  >
                    {saplingOptions.map((opt) => (
                      <option key={opt.saplingSku} value={opt.saplingSku}>
                        {opt.nameVi} (còn {opt.qty})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="olw-deep-subtitle">
                  Cây ăn quả sống lâu năm, không bao giờ chết khi vắng mặt.
                </span>
              </div>

              <div className="olw-deep-grid-4">
                {orchardViews.map((slot) => {
                  const chosenSaplingQty = sharedQty.get(selectedSaplingSku) ?? 0;
                  const pct = Math.min(100, Math.floor(slot.progressPermille / 10));
                  return (
                    <div key={slot.slotIndex} className="olw-deep-card">
                      {slot.tree ? (
                        <>
                          <div className="olw-deep-row">
                            <CatalogSkuIcon sku={slot.tree.produceSku} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {slot.tree.nameVi}
                              </div>
                              <div style={{ fontSize: 11, color: '#6d5238' }}>
                                {STAGE_LABEL_VI[slot.stage ?? 'sapling']} · {pct}%
                              </div>
                            </div>
                          </div>
                          <div className="olw-deep-progress">
                            <div className="olw-deep-progress__fill" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="olw-deep-row">
                            <button
                              type="button"
                              disabled={busy || !slot.ready}
                              onClick={() => onHarvestTree(slot.slotIndex)}
                              className="olw-deep-btn olw-deep-btn--green olw-deep-btn--grow"
                            >
                              {slot.ready ? 'Hái quả' : 'Đang lớn'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onUprootTree(slot.slotIndex)}
                              title="Bứng cây về kho"
                              className="olw-deep-btn olw-deep-btn--outline"
                            >
                              Đào
                            </button>
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '10px 4px',
                            textAlign: 'center',
                          }}
                        >
                          <span style={{ fontSize: 12, color: '#8a6d4b' }}>
                            Ô cây #{slot.slotIndex + 1} trống
                          </span>
                          <button
                            type="button"
                            disabled={busy || chosenSaplingQty < 1}
                            onClick={() => onPlantSapling(slot.slotIndex, selectedSaplingSku)}
                            className="olw-deep-btn olw-deep-btn--brown"
                          >
                            Trồng cây giống
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
