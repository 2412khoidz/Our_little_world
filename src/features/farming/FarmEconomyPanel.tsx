import { useMemo } from 'react';
import { requireItem } from '../../shared/economy/catalogConfig';
import { getCropDefinition } from '../../shared/farming/crops';
import { FARM_SELLABLE_CROP_SKUS } from '../../shared/farming/farmShipping';
import {
  farmShopMetaForKind,
  farmShopSkusForKind,
  type FarmShopKind,
} from '../../shared/shop/farmShopCatalog';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import { inventoryRowsToNuvoraGrid } from '../../shared/donor/nuvora/nuvoraPresentationBridge';
import type { NuvoraGridCell } from '../../shared/donor/nuvora/nuvoraPresentationBridge';
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

const QUALITY_LABEL: Record<'normal' | 'silver' | 'gold', string> = {
  normal: '',
  silver: ' (bạc)',
  gold: ' (vàng)',
};

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

  const shippingCells = useMemo((): readonly NuvoraGridCell[] => {
    const rows: { itemSku: string; qty: number; quality: 'normal' | 'silver' | 'gold' }[] = [];
    for (const sku of FARM_SELLABLE_CROP_SKUS) {
      for (const quality of ['normal', 'silver', 'gold'] as const) {
        const qty = cropQty(inventory, sku, quality);
        if (qty > 0) {
          rows.push({ itemSku: `${sku}:${quality}`, qty, quality });
        }
      }
    }
    return inventoryRowsToNuvoraGrid(
      rows.map((r) => ({ itemSku: r.itemSku, qty: r.qty })),
      (key) => {
        const [sku, quality] = key.split(':') as [string, 'normal' | 'silver' | 'gold'];
        const label = getCropDefinition(sku)?.nameVi ?? sku;
        return `${label}${QUALITY_LABEL[quality] ?? ''}`;
      },
      27,
    );
  }, [inventory]);

  const parseShipKey = (key: string) => {
    const [sku, quality] = key.split(':') as [string, 'normal' | 'silver' | 'gold'];
    return { sku, quality: quality ?? 'normal' };
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
      <div className={mode === 'shop' ? 'nuvora-desk__title-row' : 'nuvora-desk__title-row'}>
        <h2 id="farm-economy-title" className={mode === 'shop' ? 'nuvora-desk__title' : undefined} style={mode === 'shipping' ? { margin: 0 } : undefined}>
          {title}
        </h2>
        <button
          type="button"
          className={mode === 'shop' ? 'btn btn--secondary btn--sm' : 'btn btn--secondary btn--sm'}
          onClick={onClose}
          aria-label="Đóng"
        >
          {mode === 'shipping' ? 'Đóng' : '×'}
        </button>
      </div>
      {farmClockContext ? (
        <p
          className={mode === 'shop' ? 'nuvora-desk__title' : undefined}
          data-testid="farm-world-clock-context"
          style={{ fontSize: 12, margin: '0 0 6px', color: '#5c351e', fontWeight: 600 }}
        >
          Ngày {farmClockContext.calendarDay} · {farmClockContext.seasonLabelVi} ·{' '}
          {farmClockContext.weatherLabelVi}
        </p>
      ) : null}
      <p
        data-testid="farm-economy-wallet"
        style={{ fontSize: 13, margin: '0 0 8px', color: '#462818', fontWeight: 600 }}
      >
        Ví chung: <strong data-testid="farm-wallet-coins">{walletCoins}</strong> xu
        {mode === 'shop' ? (
          <small style={{ display: 'block', marginTop: 4, fontSize: 11, opacity: 0.85 }}>
            Chuỗi: {formatFarmChainSummaryVi()}
          </small>
        ) : null}
      </p>
      <div className={mode === 'shop' ? 'nuvora-shop-list' : ''}>
        {mode === 'shop' && shopMeta.layout === 'row' &&
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
        {mode === 'shop' && shopMeta.layout === 'grid' && (
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
            <p style={{ fontSize: 12, color: '#4e2e1a', margin: 0 }}>
              Chạm ô nông sản để gửi 1 phần qua đêm — giá do server tính theo ngày.
            </p>
            {shippingCells.every((c) => !c.sku) ? (
              <div className="cozy-alert" style={{ fontSize: 13, background: '#f0e4c8', color: '#4a3320' }}>
                Chưa có nông sản trong túi chung để gửi.
              </div>
            ) : (
              <div className="nuvora-tray">
                <div className="nuvora-g9">
                  {shippingCells.map((cell, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="nuvora-sl"
                      disabled={busy || !cell.sku}
                      data-testid={cell.sku ? `nuvora-ship-${cell.sku}` : `nuvora-ship-empty-${idx}`}
                      title={cell.labelVi}
                      onClick={() => {
                        if (!cell.sku) return;
                        const { sku, quality } = parseShipKey(cell.sku);
                        void onShip(sku, 1, quality);
                      }}
                    >
                      {cell.sku ? (
                        <>
                          <span className="nuvora-sl__icon">
                            <CatalogSkuIcon sku={cell.sku} size={28} />
                          </span>
                          {cell.qty > 1 ? <b className="nuvora-sl__qty">{cell.qty}</b> : null}
                        </>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="nuvora-plate">THÙNG GOM</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}