import { useMemo, useState } from 'react';
import { X, Heart, Sparkles, Utensils } from 'lucide-react';
import { getItem } from '../../shared/economy/catalogConfig';
import type { InventoryEntry } from '../../shared/inventory/inventoryTypes';
import {
  LIVESTOCK_MAX_SLOTS,
  LIVESTOCK_SPECIES_LIST,
  isAcceptableFeedForSpecies,
  type LivestockSpeciesId,
  type ProjectedLivestockAnimal,
} from '../../shared/farming/livestock';
import {
  getLivestockPortraitSprite,
  spriteBackgroundStyle,
} from '../../shared/art/farmingSpriteAtlas';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import './deepFarmingModals.css';

function LivestockPortraitIcon({
  speciesId,
  fallbackSku,
  size = 36,
}: {
  speciesId: string;
  fallbackSku: string;
  size?: number;
}) {
  const portrait = getLivestockPortraitSprite(speciesId);
  if (!portrait) {
    return <CatalogSkuIcon sku={fallbackSku} size={size} />;
  }
  const style = spriteBackgroundStyle(portrait, size);
  return (
    <span
      role="img"
      aria-label={speciesId}
      data-livestock-portrait={speciesId}
      data-donor={portrait.donor}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        backgroundColor: 'rgba(255, 248, 232, 0.72)',
        borderRadius: 8,
        border: '1px solid rgba(145, 108, 66, 0.25)',
        position: 'relative',
      }}
    >
      <span
        style={{
          ...style,
          display: 'block',
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </span>
  );
}

export interface LivestockPanelModalProps {
  open: boolean;
  onClose: () => void;
  walletCoins: number;
  inventory: readonly InventoryEntry[];
  animals: readonly ProjectedLivestockAnimal[];
  busy: boolean;
  statusMessage?: string | null;
  onAdopt: (speciesId: LivestockSpeciesId) => void;
  onFeed: (animalId: string, feedSku: string) => void;
  onPet: (animalId: string) => void;
  onCollect: (animalId: string) => void;
}

const FEED_OPTIONS = [
  'feed_chicken',
  'feed_livestock',
  'feed_rabbit',
  'feed_deluxe',
  'wild_clover',
] as const;

export function LivestockPanelModal({
  open,
  onClose,
  walletCoins,
  inventory,
  animals,
  busy,
  statusMessage,
  onAdopt,
  onFeed,
  onPet,
  onCollect,
}: LivestockPanelModalProps) {
  const [tab, setTab] = useState<'barn' | 'adopt'>('barn');

  const sharedQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of inventory) {
      if (row.ownerScope !== 'shared') continue;
      m.set(row.itemSku, (m.get(row.itemSku) ?? 0) + row.qty);
    }
    return m;
  }, [inventory]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Chuồng vật nuôi chung"
      data-testid="livestock-panel-modal"
      onClick={onClose}
    >
      <div className="olw-deep-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="olw-deep-header">
          <div className="olw-deep-tabs">
            <button
              type="button"
              onClick={() => setTab('barn')}
              className={`olw-deep-tab ${tab === 'barn' ? 'olw-deep-tab--active-amber' : ''}`}
            >
              Chuồng trại chung ({animals.length}/{LIVESTOCK_MAX_SLOTS})
            </button>
            <button
              type="button"
              onClick={() => setTab('adopt')}
              className={`olw-deep-tab ${tab === 'adopt' ? 'olw-deep-tab--active-green' : ''}`}
            >
              Đón thêm vật nuôi (7 loài)
            </button>
          </div>
          <div className="olw-deep-header__actions">
            <span className="olw-deep-pill olw-deep-pill--coins">{walletCoins} xu</span>
            <button type="button" onClick={onClose} aria-label="Đóng" className="olw-deep-close">
              <X size={18} />
            </button>
          </div>
        </div>

        {statusMessage ? <div className="olw-deep-status">{statusMessage}</div> : null}

        <div className="olw-deep-body">
          {tab === 'barn' ? (
            <>
              <div className="olw-deep-toolbar">
                <span className="olw-deep-subtitle">
                  Hai người cùng chăm một đàn vật nuôi. Bé không bao giờ bị mất hay chết khi vắng mặt.
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FEED_OPTIONS.map((sku) => (
                    <span key={sku} className="olw-deep-badge olw-deep-badge--feed">
                      <CatalogSkuIcon sku={sku} size={14} /> ×{sharedQty.get(sku) ?? 0}
                    </span>
                  ))}
                </div>
              </div>

              {animals.length === 0 ? (
                <div className="olw-deep-empty">
                  Chuồng trại đang trống — chuyển sang thẻ “Đón thêm vật nuôi” để nuôi gà, vịt, bò, dê,
                  cừu, thỏ hoặc ong mật nhé. Vật nuôi sau khi đón sẽ xuất hiện ngay trên đồng cỏ phía
                  bắc ruộng trồng.
                </div>
              ) : (
                <div className="olw-deep-grid-2">
                  {animals.map((item) => {
                    const availableFeeds = FEED_OPTIONS.filter(
                      (f) =>
                        isAcceptableFeedForSpecies(item.def.speciesId, f) &&
                        (sharedQty.get(f) ?? 0) > 0,
                    );
                    const chosenFeed =
                      availableFeeds.find((f) => f === item.def.feedSku) ?? availableFeeds[0];
                    const pct = Math.floor(item.progressPermille / 10);

                    return (
                      <div key={item.animal.animalId} className="olw-deep-card">
                        <div className="olw-deep-row-between" style={{ alignItems: 'flex-start' }}>
                          <div className="olw-deep-row">
                            <LivestockPortraitIcon
                              speciesId={item.def.speciesId}
                              fallbackSku={item.def.productSku}
                              size={36}
                            />
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                                {item.animal.nickname}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#6d5238', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{item.def.nameVi} · {item.def.habitatNameVi}</span>
                                <CatalogSkuIcon sku={item.def.productSku} size={14} />
                              </div>
                            </div>
                          </div>
                          <span className="olw-deep-badge olw-deep-badge--pink">
                            <Heart size={12} fill="#e0527a" color="#e0527a" />
                            {item.happiness}/100
                          </span>
                        </div>

                        <div>
                          <div
                            className="olw-deep-row-between"
                            style={{ fontSize: 11.5, color: '#6e5437', marginBottom: 4 }}
                          >
                            <span>
                              {item.status === 'hungry'
                                ? 'Đang chờ cho ăn'
                                : item.status === 'ready'
                                  ? 'Đã có sản phẩm sẵn sàng!'
                                  : `Đang tạo ${pct}%`}
                            </span>
                            {item.pettedTodayByPair ? (
                              <span style={{ fontWeight: 700, color: '#b35c7e' }}>
                                Cả hai đã chăm 💕
                              </span>
                            ) : null}
                          </div>
                          <div className="olw-deep-progress">
                            <div
                              className="olw-deep-progress__fill olw-deep-progress__fill--amber"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {item.status === 'hungry' && item.def.feedSku !== null ? (
                            <button
                              type="button"
                              disabled={busy || !chosenFeed}
                              onClick={() => chosenFeed && onFeed(item.animal.animalId, chosenFeed)}
                              className="olw-deep-btn olw-deep-btn--amber olw-deep-btn--grow"
                            >
                              <Utensils size={14} />
                              {chosenFeed ? 'Cho ăn' : 'Thiếu thức ăn'}
                            </button>
                          ) : null}
                          {item.status === 'ready' ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onCollect(item.animal.animalId)}
                              className="olw-deep-btn olw-deep-btn--green olw-deep-btn--grow"
                            >
                              <Sparkles size={14} />
                              Thu sản phẩm
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onPet(item.animal.animalId)}
                            className="olw-deep-btn olw-deep-btn--pink-outline"
                          >
                            <Heart size={14} />
                            Vuốt ve
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="olw-deep-grid-2">
              {LIVESTOCK_SPECIES_LIST.map((sp) => {
                const canAfford =
                  walletCoins >= sp.adoptCostCoins && animals.length < LIVESTOCK_MAX_SLOTS;
                const prizedName = getItem(sp.prizedSku)?.nameVi ?? sp.prizedSku;
                return (
                  <div key={sp.speciesId} className="olw-deep-card">
                    <div className="olw-deep-row" style={{ alignItems: 'flex-start' }}>
                      <LivestockPortraitIcon
                        speciesId={sp.speciesId}
                        fallbackSku={sp.productSku}
                        size={36}
                      />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{sp.nameVi}</div>
                        <div style={{ fontSize: 12, color: '#6e5437' }}>
                          Nơi ở: {sp.habitatNameVi}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#5c442c', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CatalogSkuIcon sku={sp.productSku} size={14} />
                          <span>Chu kỳ: {Math.round(sp.cycleMs / 60_000)} phút · Quý: {prizedName}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || !canAfford}
                      onClick={() => onAdopt(sp.speciesId)}
                      className="olw-deep-btn olw-deep-btn--green olw-deep-btn--full"
                    >
                      Đón về trại · {sp.adoptCostCoins} xu
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
