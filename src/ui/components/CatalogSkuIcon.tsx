import { kilnItemIconUrlForSku } from '../../shared/art/kilnItemIcons';
import { propsIconIdForCatalogSku } from '../../shared/art/catalogSkuPropsIcon';
import { getProceduralIconSpec } from '../../shared/art/donorProceduralIconSpec';
import { getFarmingItemSprite, spriteBackgroundStyle } from '../../shared/art/farmingSpriteAtlas';
import { PET_FOOD_CATALOG } from '../../shared/petLiving/petFoodCatalog';
import '../../shared/catalog/deepFarmingContent';
import { renderProceduralItemIconDataUrl } from '../art/proceduralItemIconRenderer';
import { CatalogPropsIcon } from './CatalogPropsIcon';
import { ItemArtSvg } from '../designSystem/GameIcons';

/** Resolve catalog / packed farming atlas / Kiln / props / pet-food / procedural art for a SKU. */
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
  const packed = getFarmingItemSprite(base);
  if (packed) {
    return (
      <span
        role="img"
        aria-label={base}
        data-atlas-sprite={base}
        data-atlas={packed.atlas}
        style={{
          display: 'inline-block',
          flexShrink: 0,
          verticalAlign: 'middle',
          ...spriteBackgroundStyle(packed, size),
        }}
      />
    );
  }
  const kilnUrl = kilnItemIconUrlForSku(base);
  if (kilnUrl) {
    return (
      <img
        src={kilnUrl}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ imageRendering: 'pixelated', objectFit: 'contain', display: 'block' }}
      />
    );
  }
  const propsIconId = propsIconIdForCatalogSku(base);
  if (propsIconId) return <CatalogPropsIcon iconId={propsIconId} size={size} />;
  const petFood = PET_FOOD_CATALOG.find((f) => f.sku === base);
  if (petFood) return <ItemArtSvg iconId={petFood.iconId} size={size} />;
  const proceduralSpec = getProceduralIconSpec(base);
  if (proceduralSpec) {
    const dataUrl = renderProceduralItemIconDataUrl(base, proceduralSpec);
    if (dataUrl) {
      return (
        <img
          src={dataUrl}
          alt={base}
          width={size}
          height={size}
          draggable={false}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      );
    }
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        aria-label={base}
        data-procedural-shape={proceduralSpec.shape}
      >
        <rect x="2" y="2" width="12" height="12" rx="3" fill={proceduralSpec.primary} stroke="#23301f" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3" fill={proceduralSpec.secondary ?? proceduralSpec.primary} />
      </svg>
    );
  }
  return <ItemArtSvg iconId="food_kibble" size={size} />;
}