import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';

export interface NuvoraShopGridCell {
  sku: string;
  nameVi: string;
  price: number;
  disabled: boolean;
}

export interface NuvoraShopGridProps {
  cells: readonly NuvoraShopGridCell[];
  busy: boolean;
  onBuy: (sku: string) => void;
}

/**
 * Cabacos `SeedShopPanel` slot grid — NUVORA wooden tray (3×N).
 * @see docs/UPSTREAM_REUSE.md Worker F/K — ShopRow + grid layout reference @ 79e423d
 */
export function NuvoraShopGrid({ cells, busy, onBuy }: NuvoraShopGridProps) {
  return (
    <div className="nuvora-shop-g9" data-testid="nuvora-shop-grid">
      {cells.map((cell) => (
        <button
          key={cell.sku}
          type="button"
          className="nuvora-shop-cell"
          disabled={busy || cell.disabled}
          data-testid={`nuvora-shop-cell-${cell.sku}`}
          title={`${cell.nameVi} — ${cell.price} xu`}
          onClick={() => onBuy(cell.sku)}
        >
          <span className="nuvora-shop-cell__icon">
            <CatalogSkuIcon sku={cell.sku} size={32} />
          </span>
          <span className="nuvora-shop-cell__name">{cell.nameVi}</span>
          <span className="nuvora-shop-cell__price" data-testid={`nuvora-shop-price-${cell.sku}`}>
            <span className="nuvora-shop-row__coin" aria-hidden>
              ●
            </span>
            {cell.price}
          </span>
        </button>
      ))}
    </div>
  );
}