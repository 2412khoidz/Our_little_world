import { useMemo } from 'react';
import { requireItem } from '../../shared/economy/catalogConfig';
import { getCropDefinition } from '../../shared/farming/crops';
import { FARM_SHOP_SEED_SKUS, FARM_SELLABLE_CROP_SKUS } from '../../shared/farming/farmShipping';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import { inventoryRowsToNuvoraGrid } from '../../shared/donor/nuvora/nuvoraPresentationBridge';
import type { NuvoraGridCell } from '../../shared/donor/nuvora/nuvoraPresentationBridge';
import '../inventory/nuvora/nuvoraInventorySkin.css';

export interface FarmEconomyPanelProps {
  walletCoins: number;
  inventory: InventorySnapshot | null;
  busy: boolean;
  mode: 'shop' | 'shipping';
  onBuySeed: (seedSku: string, qty: number) => Promise<void>;
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
  mode,
  onBuySeed,
  onShip,
  onClose,
}: FarmEconomyPanelProps) {
  const title = mode === 'shop' ? 'Gian hạt Bác Hai' : 'Thùng giao hàng';

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

  return (
    <div
      className={mode === 'shipping' ? 'nuvora-ship-desk' : 'olw-modal-panel'}
      role="dialog"
      aria-labelledby="farm-economy-title"
      data-testid={mode === 'shipping' ? 'nuvora-shipping-desk' : 'farm-economy-panel'}
    >
      <div className={mode === 'shipping' ? '' : 'olw-modal-head'}>
        <h2 id="farm-economy-title">{title}</h2>
        <button type="button" className={mode === 'shipping' ? 'btn btn--secondary btn--sm' : 'olw-modal-close'} onClick={onClose} aria-label="Đóng">
          {mode === 'shipping' ? 'Đóng' : '×'}
        </button>
      </div>
      <p className={mode === 'shipping' ? '' : 'olw-modal-sub'} style={{ fontSize: 13, margin: '0 0 8px' }}>
        Ví chung: {walletCoins} xu
      </p>
      <div className={mode === 'shop' ? 'olw-modal-body stack gap-sm' : ''}>
        {mode === 'shop' &&
          FARM_SHOP_SEED_SKUS.map((seedSku) => {
            let price = 0;
            let nameVi: string = seedSku;
            try {
              const def = requireItem(seedSku);
              price = def.storeBuy ?? 0;
              nameVi = def.nameVi;
            } catch {
              /* skip */
            }
            if (price <= 0) return null;
            return (
              <button
                key={seedSku}
                type="button"
                className="olw-btn"
                disabled={busy || walletCoins < price}
                onClick={() => onBuySeed(String(seedSku), 1)}
              >
                Mua 1 {nameVi} ({price} xu)
              </button>
            );
          })}
        {mode === 'shipping' && (
          <>
            <p style={{ fontSize: 12, color: '#f5e6c8', margin: 0 }}>
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
                          <span className="nuvora-sl__icon" style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.1 }}>
                            {cell.labelVi.slice(0, 6)}
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