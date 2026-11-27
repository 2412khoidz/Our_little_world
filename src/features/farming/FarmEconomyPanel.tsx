import { useMemo, useState } from 'react';
import { PackageCheck, Plus, Trash2 } from 'lucide-react';
import { computeSellPriceBp, getItem, requireItem } from '../../shared/economy/catalogConfig';
import { resolveCanonicalFishBySku } from '../../shared/donor/fishing/canonicalFishRegistry';
import { getCropDefinition } from '../../shared/farming/crops';
import {
  FARM_SELLABLE_ALL_SKUS,
  farmShopItemsByCategory,
  listShippableCatalogSkus,
  type FarmShopCategoryId,
} from '../../shared/farming/farmShipping';
import {
  farmShopMetaForKind,
  farmShopSkusForKind,
  type FarmShopKind,
} from '../../shared/shop/farmShopCatalog';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import { formatFarmChainSummaryVi } from '../../shared/farming/farmDonorChainPresentation';
import type { FarmWorldClockFarmContext } from '../../shared/farming/farmWorldClockBridge';
import { farmSeedRecommendedThisSeason } from '../../shared/farming/farmWorldClockBridge';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import { NuvoraShopSeedRow } from './NuvoraShopSeedRow';
import { NuvoraShopGrid } from './NuvoraShopGrid';
import '../inventory/nuvora/nuvoraInventorySkin.css';

export interface FarmEconomyPanelProps {
  walletCoins: number;
  inventory: InventorySnapshot | null;
  busy: boolean;
  farmClockContext?: FarmWorldClockFarmContext | null;
  mode: 'shop' | 'shipping';
  shopKind?: FarmShopKind;
  onBuyStoreItem: (itemSku: string, qty: number) => Promise<void>;
  onShip: (sku: string, qty: number, quality: 'normal' | 'silver' | 'gold') => Promise<void>;
  onClose: () => void;
}

interface SellableProduceRow {
  key: string;
  sku: string;
  quality: 'normal' | 'silver' | 'gold';
  nameVi: string;
  stockQty: number;
  unitPrice: number;
}

const QUALITY_BADGE: Record<'normal' | 'silver' | 'gold', string> = {
  normal: '',
  silver: 'Bạc',
  gold: 'Vàng',
};

const DEEP_SHOP_TABS: ReadonlyArray<{ id: 'default' | FarmShopCategoryId; labelVi: string }> = [
  { id: 'default', labelVi: 'Quầy chính' },
  { id: 'seeds', labelVi: '40+ Hạt & Hoa' },
  { id: 'saplings', labelVi: 'Cây ăn quả' },
  { id: 'farm_care', labelVi: 'Phân & Vòi' },
  { id: 'pantry_feed', labelVi: 'Thức ăn & Bếp' },
  { id: 'tools', labelVi: 'Nông cụ' },
];

function cropQty(
  inventory: InventorySnapshot | null,
  sku: string,
  quality: 'normal' | 'silver' | 'gold',
): number {
  return (
    inventory?.items
      .filter(
        (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
      )
      .reduce((n, r) => n + r.qty, 0) ?? 0
  );
}

function safeUnitSellPrice(sku: string, quality: 'normal' | 'silver' | 'gold'): number {
  try {
    return Math.max(1, Math.floor(computeSellPriceBp(sku, quality) / 10000));
  } catch {
    const fish = resolveCanonicalFishBySku(sku);
    if (fish) {
      const qMul = quality === 'gold' ? 1.55 : quality === 'silver' ? 1.25 : 1;
      return Math.max(1, Math.floor(fish.sellPrice * qMul));
    }
    return 10;
  }
}

function sellableNameVi(sku: string): string {
  return (
    getCropDefinition(sku)?.nameVi ??
    resolveCanonicalFishBySku(sku)?.labelVi ??
    getItem(sku)?.nameVi ??
    sku
  );
}

export function FarmEconomyPanel({
  walletCoins,
  inventory,
  busy,
  farmClockContext,
  mode,
  shopKind = 'seed',
  onBuyStoreItem,
  onShip,
  onClose,
}: FarmEconomyPanelProps) {
  const shopMeta = farmShopMetaForKind(shopKind);
  const title = mode === 'shop' ? shopMeta.titleVi : 'Thùng giao hàng';

  const [shopCategory, setShopCategory] = useState<'default' | FarmShopCategoryId>('default');
  const [stagedCrate, setStagedCrate] = useState<Record<string, number>>({});

  const shippableSkus = useMemo(() => {
    const merged = new Set<string>([...FARM_SELLABLE_ALL_SKUS, ...listShippableCatalogSkus()]);
    return [...merged];
  }, []);

  const sellableRows = useMemo((): readonly SellableProduceRow[] => {
    const out: SellableProduceRow[] = [];
    for (const sku of shippableSkus) {
      for (const quality of ['normal', 'silver', 'gold'] as const) {
        const stockQty = cropQty(inventory, sku, quality);
        if (stockQty <= 0) continue;
        out.push({
          key: `${sku}:${quality}`,
          sku,
          quality,
          nameVi: sellableNameVi(sku),
          stockQty,
          unitPrice: safeUnitSellPrice(sku, quality),
        });
      }
    }
    return out;
  }, [inventory, shippableSkus]);

  const stagedEntries = useMemo(() => {
    return sellableRows
      .map((row) => {
        const qty = Math.min(row.stockQty, stagedCrate[row.key] ?? 0);
        return qty > 0 ? { ...row, stagedQty: qty, subtotal: qty * row.unitPrice } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [sellableRows, stagedCrate]);

  const totalEstimatedCoins = stagedEntries.reduce((sum, e) => sum + e.subtotal, 0);
  const totalStagedQty = stagedEntries.reduce((sum, e) => sum + e.stagedQty, 0);

  const stageOne = (key: string, maxQty: number) => {
    setStagedCrate((prev) => ({
      ...prev,
      [key]: Math.min(maxQty, (prev[key] ?? 0) + 1),
    }));
  };

  const unstageOne = (key: string) => {
    setStagedCrate((prev) => {
      const cur = prev[key] ?? 0;
      if (cur <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: cur - 1 };
    });
  };

  const commitShipAll = async () => {
    for (const entry of stagedEntries) {
      await onShip(entry.sku, entry.stagedQty, entry.quality);
    }
    setStagedCrate({});
  };

  const deskClass = mode === 'shipping' ? 'nuvora-ship-desk' : 'nuvora-desk';

  return (
    <div
      className={deskClass}
      role="dialog"
      aria-labelledby="farm-economy-title"
      data-testid={
        mode === 'shipping'
          ? 'nuvora-shipping-desk'
          : shopKind === 'tool'
            ? 'farm-tool-shop-panel'
            : 'farm-economy-panel'
      }
      data-shop-kind={mode === 'shop' ? shopKind : undefined}
    >
      <div className="nuvora-desk__title-row">
        <h2
          id="farm-economy-title"
          className="nuvora-desk__title"
          style={mode === 'shipping' ? { margin: 0 } : undefined}
        >
          {title}
        </h2>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onClose}
          aria-label="Đóng"
        >
          {mode === 'shipping' ? 'Đóng' : '×'}
        </button>
      </div>

      {farmClockContext ? (
        <p
          data-testid="farm-world-clock-context"
          style={{ fontSize: 12, margin: '0 0 6px', color: '#5c351e', fontWeight: 600 }}
        >
          Ngày {farmClockContext.calendarDay} · {farmClockContext.seasonLabelVi} ·{' '}
          {farmClockContext.weatherLabelVi}
        </p>
      ) : null}

      <p
        data-testid="farm-economy-wallet"
        style={{
          fontSize: 13,
          margin: '0 0 8px',
          color: '#462818',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <img
          src="/assets/ui/hybrid/items/coin.png"
          alt=""
          width={16}
          height={16}
          style={{ imageRendering: 'pixelated' }}
        />
        <span>
          Ví chung: <strong data-testid="farm-wallet-coins">{walletCoins}</strong> xu
        </span>
        {mode === 'shop' ? (
          <small style={{ display: 'block', width: '100%', fontSize: 11, opacity: 0.85 }}>
            Chuỗi: {formatFarmChainSummaryVi()}
          </small>
        ) : null}
      </p>

      {mode === 'shop' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {DEEP_SHOP_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setShopCategory(tab.id)}
              className={`btn btn--sm ${shopCategory === tab.id ? 'btn--primary' : 'btn--secondary'}`}
            >
              {tab.labelVi}
            </button>
          ))}
        </div>
      )}

      <div className={mode === 'shop' ? 'nuvora-shop-list' : 'cozy-shipping-zones'}>
        {mode === 'shop' && shopCategory !== 'default' &&
          farmShopItemsByCategory(shopCategory).map((def) => {
            const price = def.storeBuy ?? 0;
            if (price <= 0) return null;
            const inSeason =
              shopCategory !== 'seeds' ||
              !farmClockContext ||
              farmSeedRecommendedThisSeason(def.sku, farmClockContext.season);
            return (
              <NuvoraShopSeedRow
                key={def.sku}
                seedSku={def.sku}
                nameVi={def.nameVi}
                price={price}
                inSeason={inSeason}
                disabled={busy || walletCoins < price}
                onBuy={() => void onBuyStoreItem(def.sku, 1)}
              />
            );
          })}

        {mode === 'shop' && shopCategory === 'default' && shopMeta.layout === 'row' &&
          farmShopSkusForKind(shopKind).map((itemSku) => {
            let def;
            try {
              def = requireItem(itemSku);
            } catch {
              return null;
            }
            const price = def.storeBuy ?? 0;
            if (price <= 0) return null;
            const nameVi = def.nameVi;
            const inSeason =
              shopKind !== 'seed' ||
              !farmClockContext ||
              farmSeedRecommendedThisSeason(itemSku, farmClockContext.season);
            return (
              <NuvoraShopSeedRow
                key={itemSku}
                seedSku={itemSku}
                nameVi={nameVi}
                price={price}
                inSeason={inSeason}
                disabled={busy || walletCoins < price}
                onBuy={() => void onBuyStoreItem(itemSku, 1)}
              />
            );
          })}

        {mode === 'shop' && shopCategory === 'default' && shopMeta.layout === 'grid' && (
          <NuvoraShopGrid
            busy={busy}
            cells={farmShopSkusForKind(shopKind)
              .map((itemSku) => {
                try {
                  const def = requireItem(itemSku);
                  const price = def.storeBuy ?? 0;
                  if (price <= 0) return null;
                  return {
                    sku: itemSku,
                    nameVi: def.nameVi,
                    price,
                    disabled: busy || walletCoins < price,
                  };
                } catch {
                  return null;
                }
              })
              .filter((c): c is NonNullable<typeof c> => c !== null)}
            onBuy={(sku) => void onBuyStoreItem(sku, 1)}
          />
        )}

        {mode === 'shipping' && (
          <>
            <section className="cozy-shipping-card" aria-label="Nông sản có thể gửi">
              <div className="cozy-shipping-card__head">
                <strong>Nông sản trong túi</strong>
                <span>Chạm để bỏ vào thùng</span>
              </div>

              {sellableRows.length === 0 ? (
                <div className="cozy-shipping-empty-illust">
                  <CatalogSkuIcon sku="wheat" size={30} />
                  <div>
                    <strong>Chưa có nông sản để giao</strong>
                    <small>Thu hoạch lúa mì, cà rốt, cà chua hoặc dâu tây ngoài ruộng rồi mang tới đây nhé!</small>
                  </div>
                </div>
              ) : (
                <div className="cozy-shipping-grid">
                  {sellableRows.map((row) => {
                    const staged = stagedCrate[row.key] ?? 0;
                    const remain = Math.max(0, row.stockQty - staged);
                    return (
                      <button
                        key={row.key}
                        type="button"
                        className="cozy-shipping-item"
                        disabled={busy || remain <= 0}
                        data-testid={`nuvora-ship-${row.key}`}
                        onClick={() => stageOne(row.key, row.stockQty)}
                      >
                        <div className="cozy-shipping-item__icon">
                          <CatalogSkuIcon sku={row.sku} size={28} />
                          <b className="cozy-shipping-item__qty">×{remain}</b>
                        </div>
                        <div className="cozy-shipping-item__meta">
                          <strong>
                            {row.nameVi}
                            {QUALITY_BADGE[row.quality] ? ` (${QUALITY_BADGE[row.quality]})` : ''}
                          </strong>
                          <span>
                            <img
                              src="/assets/ui/hybrid/items/coin.png"
                              alt=""
                              width={12}
                              height={12}
                              style={{ imageRendering: 'pixelated' }}
                            />
                            {row.unitPrice} xu/phần
                          </span>
                        </div>
                        <span className="cozy-shipping-add-pill">
                          <Plus size={13} /> Bỏ vào thùng
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="cozy-shipping-card cozy-shipping-card--bin" aria-label="Trong thùng chờ gửi">
              <div className="cozy-shipping-card__head">
                <strong>Trong thùng chờ gửi ({totalStagedQty})</strong>
                <span className="cozy-shipping-est">
                  <img
                    src="/assets/ui/hybrid/items/coin.png"
                    alt=""
                    width={13}
                    height={13}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  Ước tính: {totalEstimatedCoins} xu
                </span>
              </div>

              {stagedEntries.length === 0 ? (
                <div className="cozy-shipping-empty-bin">
                  Thùng gỗ đang trống — chọn nông sản bên trên để xếp vào thùng nhé!
                </div>
              ) : (
                <div className="cozy-shipping-staged-list">
                  {stagedEntries.map((entry) => (
                    <div key={entry.key} className="cozy-shipping-staged-row">
                      <CatalogSkuIcon sku={entry.sku} size={24} />
                      <div className="cozy-shipping-staged-row__text">
                        <strong>
                          {entry.nameVi} ×{entry.stagedQty}
                        </strong>
                        <small>+{entry.subtotal} xu</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={busy}
                        onClick={() => unstageOne(entry.key)}
                      >
                        <Trash2 size={13} /> Lấy ra
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="cozy-shipping-footer">
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: '100%' }}
                  disabled={busy || totalStagedQty === 0}
                  data-testid="cozy-ship-submit-btn"
                  onClick={() => void commitShipAll()}
                >
                  <PackageCheck size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                  Gửi qua đêm ({totalStagedQty > 0 ? `+${totalEstimatedCoins} xu` : 'chọn nông sản'})
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
