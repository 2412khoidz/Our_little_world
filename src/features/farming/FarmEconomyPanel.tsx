import { requireItem } from '../../shared/economy/catalogConfig';
import { getCropDefinition } from '../../shared/farming/crops';
import { FARM_ECONOMY_PROGRESSION_V1 } from '../../shared/farming/farmEconomyProgression';
import { listFarmPantryRecipes } from '../../shared/farming/farmPantryProcessing';
import {
  FARM_SELLABLE_CROP_SKUS,
  FARM_SELLABLE_PANTRY_SKUS,
  FARM_SHOP_PANTRY_SKUS,
  FARM_SHOP_SEED_SKUS,
} from '../../shared/farming/farmShipping';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';

export interface FarmEconomyPanelProps {
  walletCoins: number;
  inventory: InventorySnapshot | null;
  busy: boolean;
  mode: 'shop' | 'shipping' | 'pantry';
  onBuySeed: (seedSku: string, qty: number) => Promise<void>;
  onShip: (sku: string, qty: number, quality: 'normal' | 'silver' | 'gold') => Promise<void>;
  onProcess: (outputSku: string) => Promise<void>;
  onClose: () => void;
}

const QUALITY_LABEL: Record<'normal' | 'silver' | 'gold', string> = {
  normal: '',
  silver: ' (bạc)',
  gold: ' (vàng)',
};

function sharedQty(
  inventory: InventorySnapshot | null,
  sku: string,
  quality: 'normal' | 'silver' | 'gold' = 'normal',
): number {
  return (
    inventory?.items
      .filter(
        (r) => r.ownerScope === 'shared' && r.itemSku === sku && (r.quality ?? 'normal') === quality,
      )
      .reduce((n, r) => n + r.qty, 0) ?? 0
  );
}

function itemLabel(sku: string): string {
  try {
    return requireItem(sku).nameVi;
  } catch {
    return getCropDefinition(sku)?.nameVi ?? sku;
  }
}

export function FarmEconomyPanel({
  walletCoins,
  inventory,
  busy,
  mode,
  onBuySeed,
  onShip,
  onProcess,
  onClose,
}: FarmEconomyPanelProps) {
  const title =
    mode === 'shop' ? 'Gian hạt Bác Hai' : mode === 'pantry' ? 'Chế biến chuồng' : 'Thùng giao hàng';

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
        {mode === 'shop' && (
          <>
            {FARM_SHOP_SEED_SKUS.map((seedSku) => {
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
            {FARM_SHOP_PANTRY_SKUS.map((sku) => {
              const def = requireItem(sku);
              const price = def.storeBuy ?? 0;
              if (price <= 0) return null;
              return (
                <button
                  key={sku}
                  type="button"
                  className="olw-btn secondary"
                  disabled={busy || walletCoins < price}
                  onClick={() => onBuySeed(sku, 1)}
                >
                  Mua 1 {def.nameVi} ({price} xu)
                </button>
              );
            })}
            {walletCoins < FARM_ECONOMY_PROGRESSION_V1.midTierSeedWalletHint && (
              <p className="olw-modal-hint">
                Gợi ý: tích ~{FARM_ECONOMY_PROGRESSION_V1.midTierSeedWalletHint} xu để mở rộng hạt hướng
                dương / bắp cải.
              </p>
            )}
          </>
        )}
        {mode === 'pantry' &&
          listFarmPantryRecipes().map((recipe) => {
            const canCraft = recipe.inputs.every((line) => sharedQty(inventory, line.sku) >= line.qty);
            const inputText = recipe.inputs
              .map((line) => `${line.qty}×${itemLabel(line.sku)}`)
              .join(' + ');
            return (
              <button
                key={recipe.outputSku}
                type="button"
                className="olw-btn"
                disabled={busy || !canCraft}
                onClick={() => onProcess(recipe.outputSku)}
              >
                Làm 1 {recipe.nameVi} ({inputText})
              </button>
            );
          })}
        {mode === 'shipping' && (
          <>
            <p className="olw-modal-hint">{FARM_ECONOMY_PROGRESSION_V1.shippingHintVi}</p>
            {FARM_SELLABLE_CROP_SKUS.flatMap((sku) => {
              const label = getCropDefinition(sku)?.nameVi ?? sku;
              return (['normal', 'silver', 'gold'] as const).map((quality) => {
                const qty = sharedQty(inventory, sku, quality);
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
            {FARM_SELLABLE_PANTRY_SKUS.map((sku) => {
              const qty = sharedQty(inventory, sku);
              if (qty < 1) return null;
              return (
                <button
                  key={sku}
                  type="button"
                  className="olw-btn secondary"
                  disabled={busy}
                  onClick={() => onShip(sku, 1, 'normal')}
                >
                  Gửi 1 {itemLabel(sku)} (còn {qty})
                </button>
              );
            })}
            <p className="olw-modal-hint">Giá áp dụng bão hòa nhóm theo ngày — server tính, không gửi giá từ client.</p>
          </>
        )}
      </div>
    </div>
  );
}