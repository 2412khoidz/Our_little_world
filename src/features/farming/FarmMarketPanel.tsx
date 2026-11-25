import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';

export interface FarmMarketPanelProps {
  walletCoins: number;
  inventory: InventorySnapshot | null;
  busy: boolean;
  onSell: (sku: string, qty: number, quality: 'normal' | 'silver' | 'gold') => Promise<void>;
  onBuySeed: (seedSku: string, qty: number) => Promise<void>;
  onClose: () => void;
}

const QUALITY_LABEL: Record<'normal' | 'silver' | 'gold', string> = {
  normal: '',
  silver: ' (bạc)',
  gold: ' (vàng)',
};

function wheatQtyForQuality(
  inventory: InventorySnapshot | null,
  quality: 'normal' | 'silver' | 'gold',
): number {
  return (
    inventory?.items
      .filter(
        (r) => r.ownerScope === 'shared' && r.itemSku === 'wheat' && (r.quality ?? 'normal') === quality,
      )
      .reduce((n, r) => n + r.qty, 0) ?? 0
  );
}

export function FarmMarketPanel({ walletCoins, inventory, busy, onSell, onBuySeed, onClose }: FarmMarketPanelProps) {
  const tiers = (['normal', 'silver', 'gold'] as const).map((quality) => ({
    quality,
    qty: wheatQtyForQuality(inventory, quality),
  }));

  return (
    <div className="olw-modal-panel" role="dialog" aria-labelledby="farm-market-title">
      <div className="olw-modal-head">
        <h2 id="farm-market-title">Gian hạt Bác Hai</h2>
        <button type="button" className="olw-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
      </div>
      <p className="olw-modal-sub">Ví chung: {walletCoins} xu</p>
      <div className="olw-modal-body stack gap-sm">
        {tiers.map(({ quality, qty }) => (
          <button
            key={quality}
            type="button"
            className="olw-btn"
            disabled={busy || qty < 1}
            onClick={() => onSell('wheat', 1, quality)}
          >
            Bán 1 lúa mì{QUALITY_LABEL[quality]}
          </button>
        ))}
        <button type="button" className="olw-btn" disabled={busy} onClick={() => onBuySeed('seed_wheat', 1)}>
          Mua 1 hạt lúa mì (4 xu)
        </button>
      </div>
    </div>
  );
}