import { describe, expect, it } from 'vitest';
import {
  farmShopKindForInteractableTarget,
  farmShopSeedSkus,
  farmShopSkusForKind,
  farmShopToolSkus,
} from '../../src/shared/shop/farmShopCatalog';
import { propsIconIdForCatalogSku } from '../../src/shared/art/catalogSkuPropsIcon';
import { isRecoveryFarmToolShopTarget } from '../../src/shared/world/shopRecoveryCoordination';

describe('farmShopCatalog (Worker K)', () => {
  it('routes Cabacos tool counter to tool shop kind', () => {
    expect(farmShopKindForInteractableTarget('cabacos_interior_tool_shop_counter')).toBe('tool');
    expect(farmShopKindForInteractableTarget('farm_seed_shop')).toBe('seed');
    expect(isRecoveryFarmToolShopTarget('cabacos_interior_tool_shop_counter')).toBe(true);
  });

  it('lists every seed SKU with store buy + props icon (no fake SKUs)', () => {
    const seeds = farmShopSeedSkus('V0.2.0');
    expect(seeds.length).toBeGreaterThanOrEqual(7);
    expect(seeds).toContain('seed_rose_pink');
    expect(seeds).toContain('seed_sunflower');
    for (const sku of seeds) {
      expect(propsIconIdForCatalogSku(sku), sku).toBeTruthy();
    }
  });

  it('tool shop only exposes catalog bait/pantry with prices', () => {
    const toolSkus = farmShopToolSkus('V0.2.2');
    expect(toolSkus).toContain('bait_shrimp');
    expect(toolSkus).not.toContain('bait_free_worm');
    expect(farmShopSkusForKind('tool')).toEqual(toolSkus);
  });
});