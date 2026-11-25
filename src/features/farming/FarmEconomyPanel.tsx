import { requireItem } from '../../shared/economy/catalogConfig';
import { getCropDefinition } from '../../shared/farming/crops';
import { FARM_SHOP_SEED_SKUS, FARM_SELLABLE_CROP_SKUS } from '../../shared/farming/farmShipping';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';

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

  return (
    <div className="olw-modal-panel" role="dialog" aria-labelledby="farm-economy-title">
      <div className="olw-modal-head">
        <h2 id="farm-economy-title">{title}</h2>
        <button type="button" className="olw-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
      </div>
      <p className="olw-modal-sub">Ví chung: {walletCoins} xu</p>
      <div className="olw-modal-body stack gap-sm">
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
        {mode === 'shipping' &&
          FARM_SELLABLE_CROP_SKUS.flatMap((sku) => {
            const label = getCropDefinition(sku)?.nameVi ?? sku;
            return (['normal', 'silver', 'gold'] as const).map((quality) => {
              const qty = cropQty(inventory, sku, quality);
              if (qty < 1) return null;
              return (
                <button
                  key={`${sku}-${quality}`}
                  type="button"
                  className="olw-btn"
                  disabled={busy}
                  onClick={() => onShip(sku, 1, quality)}
                >
                  Gửi 1 {label}
                  {QUALITY_LABEL[quality]} (còn {qty})
                </button>
              );
            });
          })}
        {mode === 'shipping' && (
          <p className="olw-modal-hint">Giá áp dụng bão hòa nhóm theo ngày — server tính, không gửi giá từ client.</p>
        )}
      </div>
    </div>
  );
}