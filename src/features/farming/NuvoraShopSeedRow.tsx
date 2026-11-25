import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';

export interface NuvoraShopSeedRowProps {
  seedSku: string;
  nameVi: string;
  price: number;
  inSeason: boolean;
  disabled: boolean;
  onBuy: () => void;
}

/** Cabacos `ShopRow` layout — NUVORA wooden tray styling (see `nuvoraInventorySkin.css`). */
export function NuvoraShopSeedRow({
  seedSku,
  nameVi,
  price,
  inSeason,
  disabled,
  onBuy,
}: NuvoraShopSeedRowProps) {
  return (
    <div className="nuvora-shop-row" data-testid={`nuvora-shop-row-${seedSku}`}>
      <span className="nuvora-shop-row__icon-bg" aria-hidden>
        <CatalogSkuIcon sku={seedSku} size={24} />
      </span>
      <span className="nuvora-shop-row__name">
        {nameVi}
        {!inSeason ? <small className="nuvora-shop-row__off-season"> · ngoài mùa</small> : null}
      </span>
      <span className="nuvora-shop-row__price" data-testid={`nuvora-shop-price-${seedSku}`}>
        <span className="nuvora-shop-row__coin" aria-hidden>
          ●
        </span>
        {price}
      </span>
      <button
        type="button"
        className="nuvora-shop-row__buy btn btn--sm btn--primary"
        disabled={disabled}
        data-in-season={inSeason ? '1' : '0'}
        title={inSeason ? undefined : 'Ngoài mùa gợi ý (vẫn mua được)'}
        onClick={onBuy}
      >
        Mua
      </button>
    </div>
  );
}