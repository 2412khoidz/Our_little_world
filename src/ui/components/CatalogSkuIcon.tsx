import { propsIconIdForCatalogSku } from '../../shared/art/catalogSkuPropsIcon';
import { PET_FOOD_CATALOG } from '../../shared/petLiving/petFoodCatalog';
import { CatalogPropsIcon } from './CatalogPropsIcon';
import { ItemArtSvg } from '../designSystem/GameIcons';

/** Resolve catalog / pet-food art for a SKU (strips `:quality` suffix from ship keys). */
function skuBaseKey(sku: string): string {
  const colon = sku.indexOf(':');
  return colon >= 0 ? sku.slice(0, colon) : sku;
}

export interface CatalogSkuIconProps {
  sku: string;
  size?: number;
}

export function CatalogSkuIcon({ sku, size = 28 }: CatalogSkuIconProps) {
  const base = skuBaseKey(sku);
  const propsIconId = propsIconIdForCatalogSku(base);
  if (propsIconId) return <CatalogPropsIcon iconId={propsIconId} size={size} />;
  const petFood = PET_FOOD_CATALOG.find((f) => f.sku === base);
  if (petFood) return <ItemArtSvg iconId={petFood.iconId} size={size} />;
  return null;
}