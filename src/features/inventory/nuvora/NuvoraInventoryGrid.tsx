import { propsIconIdForCatalogSku } from '../../../shared/art/catalogSkuPropsIcon';
import { PET_FOOD_CATALOG } from '../../../shared/petLiving/petFoodCatalog';
import type { NuvoraGridCell } from '../../../shared/donor/nuvora/nuvoraPresentationBridge';
import { CatalogPropsIcon } from '../../../ui/components/CatalogPropsIcon';
import { ItemArtSvg } from '../../../ui/designSystem/GameIcons';

interface NuvoraInventoryGridProps {
  cells: readonly NuvoraGridCell[];
  plateLabel?: string;
}

function cellIcon(sku: string) {
  const propsIconId = propsIconIdForCatalogSku(sku);
  if (propsIconId) return <CatalogPropsIcon iconId={propsIconId} size={28} />;
  const petFood = PET_FOOD_CATALOG.find((f) => f.sku === sku);
  if (petFood) return <ItemArtSvg iconId={petFood.iconId} size={28} />;
  return null;
}

export function NuvoraInventoryGrid({ cells, plateLabel = 'TÚI CHUNG' }: NuvoraInventoryGridProps) {
  return (
    <div className="nuvora-tray" data-testid="nuvora-inventory-grid">
      <div className="nuvora-g9">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className="nuvora-sl"
            data-testid={cell.sku ? `nuvora-cell-${cell.sku}` : `nuvora-cell-empty-${idx}`}
            title={cell.labelVi || undefined}
            aria-hidden={!cell.sku}
          >
            {cell.sku ? (
              <>
                <span className="nuvora-sl__icon">{cellIcon(cell.sku)}</span>
                {cell.qty > 1 ? <b className="nuvora-sl__qty">{cell.qty}</b> : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className="nuvora-plate" style={{ marginTop: 10 }}>
        {plateLabel}
      </div>
    </div>
  );
}